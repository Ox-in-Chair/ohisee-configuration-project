/**
 * Kangopak Procedure Upload Script
 *
 * This script helps upload BRCGS procedures to the knowledge base
 * for RAG (Retrieval-Augmented Generation) AI assistance.
 *
 * Usage:
 *   npx tsx scripts/upload-procedures.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Procedure metadata structure
 */
interface ProcedureMetadata {
  document_number: string;
  document_name: string;
  document_type: 'procedure' | 'form' | 'work_instruction' | 'specification';
  revision: number;
  effective_date: string;
  summary: string;
  key_requirements: string[];
  integration_points: string[];
  form_sections: string[];
}

/**
 * Upload a single procedure to the knowledge base
 */
async function uploadProcedure(
  metadata: ProcedureMetadata,
  content: string
): Promise<{ success: boolean; error?: string; documentId?: string }> {
  try {
    console.log(`\n📤 Uploading: ${metadata.document_number} - ${metadata.document_name}`);

    // 1. Check for existing current version
    const { data: existing } = await supabase
      .from('knowledge_base_documents')
      .select('id, revision, document_number')
      .eq('document_number', metadata.document_number)
      .eq('status', 'current')
      .single();

    // 2. If exists and same/lower revision, skip
    if (existing && existing.revision >= metadata.revision) {
      console.log(`   ⏭️  Skipped (revision ${existing.revision} already exists)`);
      return { success: true, documentId: existing.id };
    }

    // 3. Supersede old version if exists
    if (existing) {
      await supabase
        .from('knowledge_base_documents')
        .update({ status: 'superseded' })
        .eq('id', existing.id);
      console.log(`   📝 Superseded old revision ${existing.revision}`);
    }

    // 4. Insert new document
    const { data: newDoc, error: insertError } = await supabase
      .from('knowledge_base_documents')
      .insert({
        document_number: metadata.document_number,
        document_name: metadata.document_name,
        document_type: metadata.document_type,
        revision: metadata.revision,
        effective_date: metadata.effective_date,
        summary: metadata.summary,
        content: content,
        key_requirements: metadata.key_requirements,
        integration_points: metadata.integration_points,
        form_sections: metadata.form_sections,
        status: 'current'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`   ❌ Insert failed:`, insertError.message);
      return { success: false, error: insertError.message };
    }

    console.log(`   ✅ Uploaded successfully (ID: ${newDoc.id})`);
    return { success: true, documentId: newDoc.id };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Upload failed:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Load procedure file from disk
 */
function loadProcedureFile(filePath: string): string {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Main upload process
 */
async function main() {
  console.log('🚀 Kangopak Procedure Upload Script');
  console.log('=====================================\n');

  // Example procedure (to test the system)
  const exampleProcedure = {
    metadata: {
      document_number: '5.7',
      document_name: 'Control of Non-Conforming Product',
      document_type: 'procedure' as const,
      revision: 1,
      effective_date: '2025-01-10',
      summary: 'Identification, quarantine, investigation, and disposition of non-conforming product',
      key_requirements: [
        'Immediate quarantine of non-conforming product',
        'Root cause investigation within 24 hours',
        'CAPA (Corrective and Preventative Actions)',
        'Management approval for disposition',
        'Traceability to affected batches'
      ],
      integration_points: ['Section 5.7 Non-Conformance', 'Section 3.9 Traceability'],
      form_sections: ['NC description', 'Root cause analysis', 'Corrective actions', 'Preventative measures']
    },
    filePath: './procedures/EXAMPLE_5.7.txt'
  };

  // ===================================================================
  // YOUR KANGOPAK PROCEDURES GO HERE
  // ===================================================================
  // Replace the example above with your actual procedure files.
  // Add multiple procedures by copying the pattern below:
  //
  // const yourProcedures: Array<{ metadata: ProcedureMetadata; filePath: string }> = [
  //   {
  //     metadata: {
  //       document_number: '3.9',
  //       document_name: 'Traceability Procedure',
  //       document_type: 'procedure',
  //       revision: 1,
  //       effective_date: '2025-01-10',
  //       summary: 'Complete traceability from raw material to finished product',
  //       key_requirements: ['Lot tracking', 'Back-tracking', 'Forward tracking'],
  //       integration_points: ['Section 3.9 Traceability'],
  //       form_sections: ['Batch codes', 'Lot numbers']
  //     },
  //     filePath: './procedures/3.9_Traceability.txt'
  //   },
  //   // Add more procedures here...
  // ];
  //
  // Then update the procedures array below to: const procedures = yourProcedures;
  // ===================================================================

  const procedures = [exampleProcedure];

  let successCount = 0;
  let failureCount = 0;

  for (const proc of procedures) {
    try {
      // Load procedure content from file
      const content = loadProcedureFile(proc.filePath);

      // Upload to knowledge base
      const result = await uploadProcedure(proc.metadata, content);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      console.error(`\n❌ Failed to process ${proc.metadata.document_number}:`,
        error instanceof Error ? error.message : String(error));
      failureCount++;
    }
  }

  console.log('\n=====================================');
  console.log('📊 Upload Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📄 Total: ${procedures.length}`);
  console.log('=====================================\n');

  if (successCount > 0) {
    console.log('✨ Procedures uploaded successfully!');
    console.log('   The AI assistant can now provide BRCGS-compliant suggestions.\n');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

// Run the script
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
