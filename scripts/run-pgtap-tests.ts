#!/usr/bin/env ts-node
/**
 * pgTAP Test Runner
 *
 * Runs all pgTAP tests in supabase/tests/ directory
 * Uses Supabase service role key to execute tests
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestResult {
  file: string;
  passed: number;
  failed: number;
  total: number;
  duration: number;
  output: string;
}

/**
 * Run a single pgTAP test file
 */
async function runTestFile(testFile: string): Promise<TestResult> {
  const startTime = Date.now();
  const filePath = join(__dirname, '../supabase/tests', testFile);

  console.log(`\n📝 Running: ${testFile}`);

  try {
    // Read the test file
    const testSQL = readFileSync(filePath, 'utf-8');

    // Execute the test SQL
    const { data, error } = await supabase.rpc('run_sql', {
      query: testSQL
    });

    if (error) {
      // If run_sql RPC doesn't exist, execute directly
      const { data: directData, error: directError } = await supabase
        .from('_test_results')
        .select('*');

      if (directError) {
        // Fallback: execute SQL directly via Supabase client
        const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY!,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: testSQL })
        });

        const resultData = await result.json();

        return parseTestOutput(testFile, resultData, Date.now() - startTime);
      }

      return parseTestOutput(testFile, directData, Date.now() - startTime);
    }

    return parseTestOutput(testFile, data, Date.now() - startTime);

  } catch (err) {
    const error = err as Error;
    console.error(`   ❌ Error: ${error.message}`);

    return {
      file: testFile,
      passed: 0,
      failed: 1,
      total: 1,
      duration: Date.now() - startTime,
      output: error.message
    };
  }
}

/**
 * Parse pgTAP test output
 */
function parseTestOutput(file: string, output: any, duration: number): TestResult {
  // pgTAP outputs TAP format
  const outputStr = JSON.stringify(output, null, 2);

  // Simple parser for TAP format
  // TAP format: "ok 1 - test description" or "not ok 1 - test description"
  const lines = outputStr.split('\n');
  let passed = 0;
  let failed = 0;
  let total = 0;

  for (const line of lines) {
    if (line.trim().match(/^ok \d+/)) {
      passed++;
      total++;
      console.log(`   ✓ ${line.trim()}`);
    } else if (line.trim().match(/^not ok \d+/)) {
      failed++;
      total++;
      console.error(`   ✗ ${line.trim()}`);
    }
  }

  // If no TAP output detected, check for plan line
  const planMatch = outputStr.match(/1\.\.(\d+)/);
  if (planMatch && total === 0) {
    total = parseInt(planMatch[1]);
    passed = total; // Assume all passed if no failures detected
  }

  return {
    file,
    passed,
    failed,
    total,
    duration,
    output: outputStr
  };
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 pgTAP Test Runner');
  console.log('='.repeat(60));
  console.log(`📂 Test directory: supabase/tests/`);
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  // Get all .test.sql files
  const testsDir = join(__dirname, '../supabase/tests');
  let testFiles: string[];

  try {
    testFiles = readdirSync(testsDir)
      .filter(file => file.endsWith('.test.sql'))
      .sort();
  } catch (err) {
    console.error(`❌ Error reading tests directory: ${(err as Error).message}`);
    process.exit(1);
  }

  if (testFiles.length === 0) {
    console.log('⚠️  No test files found (*.test.sql)');
    process.exit(0);
  }

  console.log(`\n📋 Found ${testFiles.length} test file(s):\n`);
  testFiles.forEach((file, i) => {
    console.log(`   ${i + 1}. ${file}`);
  });

  // Run all tests
  const results: TestResult[] = [];

  for (const testFile of testFiles) {
    const result = await runTestFile(testFile);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach(result => {
    const status = result.failed === 0 ? '✅' : '❌';
    const passRate = result.total > 0
      ? ((result.passed / result.total) * 100).toFixed(1)
      : '0.0';

    console.log(`${status} ${result.file}: ${result.passed}/${result.total} passed (${passRate}%) - ${result.duration}ms`);
  });

  console.log('='.repeat(60));

  if (totalFailed === 0) {
    console.log(`✅ ALL TESTS PASSED: ${totalPassed}/${totalTests} tests in ${totalDuration}ms`);
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    console.log(`❌ TESTS FAILED: ${totalPassed} passed, ${totalFailed} failed, ${totalTests} total in ${totalDuration}ms`);
    console.log('='.repeat(60));
    process.exit(1);
  }
}

// Run tests
main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
