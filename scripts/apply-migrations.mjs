#!/usr/bin/env node

/**
 * OHiSee NCA/MJC System - Database Migration Runner
 *
 * Applies all SQL migration files to Supabase database in order.
 * Uses Supabase Management API for direct SQL execution.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

// Extract project reference from URL
const projectRef = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN || !projectRef) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_ACCESS_TOKEN:', SUPABASE_ACCESS_TOKEN ? '✅' : '❌');
  console.error('   Project Ref:', projectRef ? `✅ (${projectRef})` : '❌');
  console.error('\n💡 Get your access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function executeSql(sql, fileName) {
  console.log(`\n📄 Executing migration: ${fileName}`);

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    console.log(`   ✅ Migration applied successfully`);
    return { success: true, result };
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 OHiSee Database Migration Runner');
  console.log('=====================================\n');
  console.log(`📡 Project: ${projectRef}`);
  console.log(`   URL: ${SUPABASE_URL}\n`);

  // Get all migration files
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensure chronological order

  console.log(`📦 Found ${files.length} migration files:\n`);
  files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  // Apply each migration
  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, 'utf8');

    const result = await executeSql(sql, file);

    results.push({ file, ...result });

    if (result.success) {
      successCount++;
    } else {
      failCount++;
      console.log('\n⚠️  Migration failed. Continuing with next migration...');
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total: ${files.length}`);
  console.log('=====================================\n');

  if (failCount > 0) {
    console.log('⚠️  Failed migrations:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.file}: ${r.error}`));
    console.log();
  }

  if (failCount === 0) {
    console.log('🎉 All migrations applied successfully!');
    console.log('\n✨ Next steps:');
    console.log('   1. Test forms: http://localhost:3008/nca/new');
    console.log('   2. Test forms: http://localhost:3008/mjc/new');
    console.log('   3. Run: npm run test');
    process.exit(0);
  } else {
    console.log('⚠️  Some migrations failed. Please review errors above.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
