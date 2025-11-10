/**
 * Upload Example Procedure (Quick Test)
 *
 * This script uploads the EXAMPLE_5.7.txt procedure to test the upload system.
 * Use this to verify everything works before uploading all your procedures.
 *
 * Usage:
 *   npm run upload-procedures
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials in environment variables\n');
  console.error('Required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✗ Missing' : '✓ Set');
  console.error('\nAdd SUPABASE_SERVICE_ROLE_KEY to .env.local file');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadExampleProcedure() {
  console.log('\n🚀 Uploading Example Procedure 5.7');
  console.log('===================================\n');

  try {
    // Load example procedure content
    const procedurePath = path.join(__dirname, '../procedures/EXAMPLE_5.7.txt');

    if (!fs.existsSync(procedurePath)) {
      console.error('❌ Example procedure file not found at:', procedurePath);
      console.error('   Make sure procedures/EXAMPLE_5.7.txt exists\n');
      process.exit(1);
    }

    const content = fs.readFileSync(procedurePath, 'utf-8');
    console.log(`✓ Loaded procedure file (${content.length} characters)`);

    // Check for existing procedure
    console.log('✓ Checking for existing version...');
    const { data: existing } = await supabase
      .from('knowledge_base_documents')
      .select('id, revision, document_number, status')
      .eq('document_number', '5.7')
      .eq('status', 'current')
      .single();

    if (existing) {
      console.log(`  Found existing revision ${existing.revision} (ID: ${existing.id})`);
      console.log('  Superseding old version...');

      await supabase
        .from('knowledge_base_documents')
        .update({ status: 'superseded' })
        .eq('id', existing.id);

      console.log('  ✓ Old version superseded');
    } else {
      console.log('  No existing version found (first upload)');
    }

    // Insert new procedure
    console.log('✓ Uploading new version...');
    const { data: newDoc, error: insertError } = await supabase
      .from('knowledge_base_documents')
      .insert({
        document_number: '5.7',
        document_name: 'Control of Non-Conforming Product',
        document_type: 'procedure',
        revision: 1,
        effective_date: '2025-01-10',
        summary: 'Identification, quarantine, investigation, and disposition of non-conforming product',
        content: content,
        key_requirements: [
          'Immediate quarantine of non-conforming product',
          'Root cause investigation within 24 hours',
          'CAPA (Corrective and Preventative Actions)',
          'Management approval for disposition',
          'Traceability to affected batches'
        ],
        integration_points: [
          'Section 5.7 Non-Conformance',
          'Section 3.9 Traceability',
          'Section 5.3 Process Control'
        ],
        form_sections: [
          'NC description',
          'Root cause analysis',
          'Corrective actions',
          'Preventative measures',
          'Disposition'
        ],
        status: 'current'
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('\n❌ Upload failed:', insertError.message);
      console.error('   Error code:', insertError.code);
      console.error('   Details:', insertError.details);
      process.exit(1);
    }

    console.log(`\n✅ SUCCESS! Procedure 5.7 uploaded (ID: ${newDoc.id})\n`);
    console.log('Next steps:');
    console.log('1. Test the AI assistant: http://localhost:3008/nca/new');
    console.log('2. Click "Get AI Help" in any field');
    console.log('3. AI should now reference Procedure 5.7 in suggestions\n');
    console.log('To upload more procedures:');
    console.log('- Add your procedure files to procedures/ folder');
    console.log('- Update scripts/upload-procedures.ts with metadata');
    console.log('- Run: npm run upload-procedures\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

// Run
uploadExampleProcedure();
