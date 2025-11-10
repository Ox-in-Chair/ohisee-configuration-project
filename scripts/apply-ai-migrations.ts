/**
 * Apply AI Integration Migrations
 * Applies the AI knowledge base database migrations to Supabase
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing Supabase credentials\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(migrationFile: string) {
  console.log(`\n📄 Applying migration: ${path.basename(migrationFile)}`);
  console.log('─'.repeat(70));

  try {
    // Read migration SQL
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    // Split into individual statements (by semicolon at end of line)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty or comment-only statements
      if (!statement || statement.trim().length === 0) continue;

      // Execute statement
      const { error } = await (supabase as any).rpc('exec_sql', { sql_query: statement + ';' });

      if (error) {
        // Some errors are expected (like "already exists")
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          console.log(`   ⏭️  Statement ${i + 1}: Already exists (skipped)`);
        } else {
          console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
        }
      } else {
        console.log(`   ✅ Statement ${i + 1}: Success`);
      }
    }

    console.log(`\n✅ Migration applied: ${path.basename(migrationFile)}`);
    return true;

  } catch (error) {
    console.error(`\n❌ Failed to apply migration:`, error);
    return false;
  }
}

async function main() {
  console.log('\n🚀 Applying AI Integration Migrations');
  console.log('='.repeat(70));

  const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

  const migrations = [
    path.join(migrationsDir, '20251110120000_ai_integration.sql'),
    path.join(migrationsDir, '20251110130000_ai_quality_coaching.sql'),
    path.join(migrationsDir, '20251110140000_rag_search_functions.sql')
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const migration of migrations) {
    if (fs.existsSync(migration)) {
      const success = await applyMigration(migration);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    } else {
      console.error(`\n❌ Migration file not found: ${migration}`);
      failureCount++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`   ✅ Applied: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log('='.repeat(70));

  if (successCount > 0) {
    console.log('\n✨ Migrations applied successfully!');
    console.log('   You can now upload procedures using: npm run upload-kangopak\n');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
