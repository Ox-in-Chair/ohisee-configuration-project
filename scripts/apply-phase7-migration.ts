/**
 * Apply Phase 7 Migration Script
 * Applies the Phase 7 advanced AI enhancements migration to Supabase
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials\n');
  console.error('Required environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('\n🚀 Applying Phase 7 Advanced AI Enhancements Migration');
  console.log('='.repeat(70));

  const migrationFile = path.resolve(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20251110170000_phase7_advanced_ai.sql'
  );

  if (!fs.existsSync(migrationFile)) {
    console.error(`\n❌ Migration file not found: ${migrationFile}\n`);
    process.exit(1);
  }

  console.log(`\n📄 Reading migration file...`);
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  // Split into statements (handling multi-line statements)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

  console.log(`   Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comment-only statements
    if (statement.startsWith('--') || statement.trim().length === 0) {
      continue;
    }

    try {
      // Execute via Supabase REST API (using rpc if available, otherwise direct SQL)
      const { error } = await (supabase.rpc as any)('exec_sql', { sql_query: statement + ';' }).catch(async () => {
        // Fallback: Try direct execution via PostgREST
        // Note: This requires a custom function or direct database access
        return { error: { message: 'Direct SQL execution not available via REST API' } };
      });

      if (error) {
        // Some errors are expected (like "already exists")
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          error.message.includes('relation already exists')
        ) {
          console.log(`   ⏭️  Statement ${i + 1}: Already exists (skipped)`);
          successCount++;
        } else if (error.message.includes('Direct SQL execution not available')) {
          console.log(`   ⚠️  Statement ${i + 1}: Requires direct database access`);
          console.log(`      Please apply this migration via Supabase Dashboard SQL Editor`);
          console.log(`      File: ${migrationFile}`);
          failCount++;
        } else {
          console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
          failCount++;
        }
      } else {
        console.log(`   ✅ Statement ${i + 1}: Success`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ Statement ${i + 1} error:`, error instanceof Error ? error.message : error);
      failCount++;
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${statements.length}`);
  console.log('='.repeat(70));

  if (failCount > 0) {
    console.log('\n⚠️  Some statements failed.');
    console.log('   This is normal if tables/functions already exist.');
    console.log('\n💡 To apply manually:');
    console.log(`   1. Go to Supabase Dashboard SQL Editor`);
    console.log(`   2. Copy contents of: ${migrationFile}`);
    console.log(`   3. Paste and run\n`);
  } else {
    console.log('\n✅ Migration applied successfully!\n');
  }

  // Verify tables created
  console.log('🔍 Verifying tables...');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['policy_versions', 'agent_audit_log', 'decision_traces']);

  if (!tablesError && tables) {
    const tableNames = tables.map((t: any) => t.table_name);
    console.log(`   Found tables: ${tableNames.join(', ')}`);
    
    if (tableNames.length === 3) {
      console.log('   ✅ All Phase 7 tables created\n');
    } else {
      console.log(`   ⚠️  Expected 3 tables, found ${tableNames.length}\n`);
    }
  } else {
    console.log('   ⚠️  Could not verify tables (this is OK if using manual migration)\n');
  }
}

// Run migration
applyMigration()
  .then(() => {
    console.log('✨ Migration process complete\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

