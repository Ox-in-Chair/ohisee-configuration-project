#!/usr/bin/env ts-node

/**
 * Apply Migrations Directly via Supabase Client
 * Uses service role key to execute SQL directly
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
  console.error('❌ Missing environment variables');
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
    // Split SQL into individual statements (handle multi-statement SQL)
    const statements = sql
      .split(/;(?=\s*$)/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    for (const statement of statements) {
      if (statement.trim()) {
        // Execute each statement using RPC or direct query
        // For DDL statements, we need to use the Postgres REST API
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // If RPC doesn't exist, try using the REST API directly
          // For CREATE TABLE, CREATE INDEX, etc., we need to use the Management API
          // But we can try using the service role key with fetch
          console.log(`   ⚠️  RPC method failed, trying direct execution...`);
          
          // Use fetch with service role key
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY || '',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ''}`,
            },
            body: JSON.stringify({ sql_query: statement }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        }
      }
    }

    console.log(`   ✅ Migration applied successfully`);
    return { success: true };
  } catch (error: any) {
    // If exec_sql RPC doesn't exist, we'll need to use a different approach
    if (error.message?.includes('function exec_sql') || error.message?.includes('does not exist')) {
      console.log(`   ⚠️  exec_sql RPC not available, using alternative method...`);
      
      // Try using Supabase's SQL execution via the REST API
      // We'll need to create a helper function or use the Management API
      console.log(`   💡 Please apply this migration manually or create exec_sql RPC function`);
      return { success: false, error: 'exec_sql RPC not available' };
    }
    
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 OHiSee Direct Migration Runner');
  console.log('=====================================\n');
  console.log(`📡 Project: ${SUPABASE_URL}\n`);

  // Only apply the new migrations
  const newMigrations = [
    '20251111_create_notifications_table.sql',
    '20251111_add_register_indexes.sql',
  ];

  console.log(`📦 Applying ${newMigrations.length} new migrations:\n`);
  newMigrations.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  const __dirname = dirname(fileURLToPath(import.meta.url));
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
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('=====================================\n');

  if (failCount > 0) {
    console.log('⚠️  Some migrations failed.');
    console.log('💡 Using Supabase Management API instead...');
  }
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

