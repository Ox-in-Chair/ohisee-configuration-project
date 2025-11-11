#!/usr/bin/env ts-node

/**
 * Apply New Migrations Script
 * Applies only the new migrations (notifications table and indexes)
 * Uses Supabase service role key directly
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSql(sql: string, fileName: string): Promise<{ success: boolean; error?: string }> {
  console.log(`\n📄 Executing migration: ${fileName}`);

  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await (supabase as any).from('_migrations').select('*').limit(0);
          
          if (queryError && queryError.message.includes('relation "_migrations" does not exist')) {
            // Use raw SQL execution via PostgREST
            console.log(`   ⚠️  Using alternative execution method...`);
            // For now, we'll need to use the Supabase dashboard or CLI
            console.log(`   ⚠️  Please apply this migration manually via Supabase Dashboard SQL Editor`);
            return { success: false, error: 'Manual application required' };
          }
          
          throw error;
        }
      }
    }

    console.log(`   ✅ Migration applied successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 OHiSee New Migrations Runner');
  console.log('=====================================\n');
  console.log(`📡 Project: ${SUPABASE_URL}\n`);

  // Only apply the new migrations
  const newMigrations = [
    '20251111_create_notifications_table.sql',
    '20251111_add_register_indexes.sql',
  ];

  console.log(`📦 Applying ${newMigrations.length} new migrations:\n`);
  newMigrations.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  let successCount = 0;
  let failCount = 0;

  for (const file of newMigrations) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf8');

    const result = await executeSql(sql, file);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
      console.log('\n⚠️  Migration failed. Please apply manually via Supabase Dashboard.');
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${newMigrations.length}`);
  console.log('=====================================\n');

  if (failCount > 0) {
    console.log('⚠️  Some migrations failed.');
    console.log('💡 Please apply manually via Supabase Dashboard SQL Editor:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/fpmnfokvcdqhbsawvyjh/sql');
    console.log('   2. Copy and paste the SQL from each migration file');
    console.log('   3. Run each migration in order');
    console.log();
  } else {
    console.log('🎉 All migrations applied successfully!');
  }
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

