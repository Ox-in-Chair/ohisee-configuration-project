/**
 * Upload All Kangopak Procedures
 * Orchestrator script that launches 5 parallel agents to upload all procedures
 *
 * Architecture:
 * - Dependency injection throughout
 * - 5 parallel agents (one per BRCGS section group)
 * - No static calls
 * - Uses document_number (not revision) as identifier
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { ProcedureUploadService } from '../lib/procedures/procedure-upload-service';
import { MarkdownParser } from '../lib/procedures/markdown-parser';
import { NodeFileReader, ConsoleLogger, SupabaseClientAdapter } from '../lib/procedures/implementations';
import type { UploadResult, ParsedProcedure } from '../lib/procedures/types';

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const proceduresPath = path.resolve(__dirname, '../../kangopak-procedures');

// ============================================================================
// Validation
// ============================================================================

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials\n');
  console.error('Required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to .env.local\n');
  process.exit(1);
}

if (!fs.existsSync(proceduresPath)) {
  console.error('\n❌ Kangopak procedures folder not found\n');
  console.error(`Expected: ${proceduresPath}\n`);
  process.exit(1);
}

// ============================================================================
// Dependency Injection Setup
// ============================================================================

const logger = new ConsoleLogger();
const fileReader = new NodeFileReader();
const supabaseClient = new SupabaseClientAdapter(createClient(supabaseUrl, supabaseKey));
const uploadService = new ProcedureUploadService(supabaseClient, logger);
const markdownParser = new MarkdownParser(fileReader, logger);

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Discover all markdown files in kangopak-procedures folder
 */
function discoverProcedureFiles(): string[] {
  const files: string[] = [];

  function scanDirectory(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  scanDirectory(proceduresPath);
  return files;
}

/**
 * Group files by BRCGS section
 */
function groupFilesBySection(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  groups.set('section1', []); // Senior Management
  groups.set('section2', []); // HARA
  groups.set('section3', []); // Product Safety & Quality
  groups.set('section4', []); // Site Standards
  groups.set('section5-6', []); // Process Control + Personnel

  for (const file of files) {
    const fileName = path.basename(file);
    const sectionMatch = fileName.match(/^([0-9.]+)/);

    if (!sectionMatch) continue;

    const sectionNum = sectionMatch[1].split('.')[0];

    if (sectionNum === '1') {
      groups.get('section1')!.push(file);
    } else if (sectionNum === '2') {
      groups.get('section2')!.push(file);
    } else if (sectionNum === '3') {
      groups.get('section3')!.push(file);
    } else if (sectionNum === '4') {
      groups.get('section4')!.push(file);
    } else if (sectionNum === '5' || sectionNum === '6') {
      groups.get('section5-6')!.push(file);
    }
  }

  return groups;
}

// ============================================================================
// Agent Workers
// ============================================================================

/**
 * Agent worker: Parse and upload procedures for a section
 */
async function agentWorker(
  agentName: string,
  files: string[]
): Promise<{ agent: string; results: UploadResult[] }> {
  console.log(`\n🤖 Agent ${agentName} starting (${files.length} procedures)`);
  console.log('━'.repeat(70));

  const results: UploadResult[] = [];

  for (const file of files) {
    try {
      // Parse markdown file (using injected parser with DI)
      const parsed: ParsedProcedure = await markdownParser.parseFile(file);

      // Upload procedure (using injected upload service with DI)
      const result = await uploadService.uploadProcedure(
        parsed.metadata,
        parsed.content
      );

      results.push(result);

    } catch (error) {
      const fileName = path.basename(file);
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error(`Agent ${agentName} failed on ${fileName}`, errorMsg);

      results.push({
        success: false,
        documentNumber: fileName,
        error: errorMsg
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  console.log(`\n✅ Agent ${agentName} complete: ${successCount} succeeded, ${failureCount} failed`);

  return { agent: agentName, results };
}

// ============================================================================
// Main Orchestrator
// ============================================================================

async function main() {
  console.log('\n🚀 Kangopak Procedure Upload - 5 Agent Parallel Execution');
  console.log('='.repeat(70));
  console.log(`Procedures folder: ${proceduresPath}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  // Step 1: Discover all procedure files
  console.log('📁 Discovering procedure files...');
  const allFiles = discoverProcedureFiles();
  console.log(`   Found ${allFiles.length} markdown files\n`);

  if (allFiles.length === 0) {
    console.error('❌ No procedure files found');
    process.exit(1);
  }

  // Step 2: Group files by section
  console.log('🗂️  Grouping by BRCGS section...');
  const groups = groupFilesBySection(allFiles);

  for (const [section, files] of groups.entries()) {
    console.log(`   ${section}: ${files.length} procedures`);
  }

  // Step 3: Launch 5 agents in parallel
  console.log('\n🚀 Launching 5 parallel agents...\n');

  const agentPromises = [
    agentWorker('Section 1 (Senior Management)', groups.get('section1')!),
    agentWorker('Section 2 (HARA)', groups.get('section2')!),
    agentWorker('Section 3 (Product Safety)', groups.get('section3')!),
    agentWorker('Section 4 (Site Standards)', groups.get('section4')!),
    agentWorker('Section 5-6 (Process + Personnel)', groups.get('section5-6')!)
  ];

  // Wait for all agents to complete
  const agentResults = await Promise.all(agentPromises);

  // Step 4: Aggregate results
  console.log('\n' + '='.repeat(70));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(70));

  let totalSuccess = 0;
  let totalFailure = 0;
  let totalSuperseded = 0;

  for (const { agent, results } of agentResults) {
    const success = results.filter(r => r.success).length;
    const failure = results.filter(r => !r.success).length;
    const superseded = results.filter(r => r.supersededId).length;

    totalSuccess += success;
    totalFailure += failure;
    totalSuperseded += superseded;

    console.log(`\n${agent}:`);
    console.log(`  ✅ Succeeded: ${success}`);
    console.log(`  ❌ Failed: ${failure}`);
    console.log(`  🔄 Superseded: ${superseded}`);
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`📈 TOTALS:`);
  console.log(`   Total files processed: ${allFiles.length}`);
  console.log(`   ✅ Successfully uploaded: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailure}`);
  console.log(`   🔄 Superseded old versions: ${totalSuperseded}`);
  console.log('='.repeat(70));

  if (totalSuccess > 0) {
    console.log('\n✨ Procedures uploaded successfully!');
    console.log('   The AI assistant can now provide Kangopak-specific suggestions.\n');
    console.log('Next steps:');
    console.log('  1. Test AI: http://localhost:3008/nca/new');
    console.log('  2. Click "Get AI Help" in any field');
    console.log('  3. AI should reference Kangopak procedures\n');
  }

  // Exit with error code if any failures
  process.exit(totalFailure > 0 ? 1 : 0);
}

// ============================================================================
// Execute
// ============================================================================

main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
