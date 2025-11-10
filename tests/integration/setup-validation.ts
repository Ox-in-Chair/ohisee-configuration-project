/**
 * Test Environment Setup Validation
 *
 * Run this script to verify your test environment is properly configured
 * before running the full integration test suite.
 *
 * Usage: npx ts-node tests/integration/setup-validation.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function validateTestEnvironment() {
  console.log('🔍 Validating test environment setup...\n');

  // Step 1: Check environment variables
  console.log('Step 1: Checking environment variables...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
    process.exit(1);
  }
  console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);

  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
    process.exit(1);
  }
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY: [HIDDEN]');

  // Step 2: Test Supabase connection
  console.log('\nStep 2: Testing Supabase connection...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Successfully connected to Supabase');
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    process.exit(1);
  }

  // Step 3: Verify seed data
  console.log('\nStep 3: Verifying seed data...');

  // Check users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('active', true);

  if (usersError || !users || users.length === 0) {
    console.error('❌ No users found. Run migrations: supabase db reset');
    process.exit(1);
  }

  const requiredRoles = ['operator', 'team-leader', 'qa-supervisor', 'operations-manager'];
  const availableRoles = users.map((u: { role: string }) => u.role);
  const missingRoles = requiredRoles.filter(role => !availableRoles.includes(role));

  if (missingRoles.length > 0) {
    console.error(`❌ Missing required user roles: ${missingRoles.join(', ')}`);
    console.error('Run migrations: supabase db reset');
    process.exit(1);
  }

  console.log(`✅ Found ${users.length} users with all required roles`);
  users.forEach((u: { email: string; role: string }) => {
    console.log(`   - ${u.role}: ${u.email}`);
  });

  // Check work orders
  const { data: workOrders, error: woError } = await supabase
    .from('work_orders')
    .select('wo_number, status')
    .eq('status', 'active');

  if (woError || !workOrders || workOrders.length === 0) {
    console.error('❌ No active work orders found. Run migrations: supabase db reset');
    process.exit(1);
  }

  console.log(`✅ Found ${workOrders.length} active work order(s)`);
  workOrders.forEach((wo: { wo_number: string; status: string }) => {
    console.log(`   - ${wo.wo_number} (${wo.status})`);
  });

  // Check machines
  const { data: machines, error: machinesError } = await supabase
    .from('machines')
    .select('machine_code, machine_name');

  if (machinesError || !machines || machines.length === 0) {
    console.error('❌ No machines found. Run migrations: supabase db reset');
    process.exit(1);
  }

  console.log(`✅ Found ${machines.length} machine(s)`);
  machines.forEach((m: { machine_code: string; machine_name: string }) => {
    console.log(`   - ${m.machine_code}: ${m.machine_name}`);
  });

  // Step 4: Test NCA number generation
  console.log('\nStep 4: Testing NCA number generation...');

  const testNca = {
    raised_by_user_id: users[0].id,
    created_by: users[0].id,
    nc_type: 'wip',
    nc_product_description: 'Test validation NCA',
    sample_available: false,
    nc_description: 'This is a test NCA created by the setup validation script to verify that auto-generated NCA numbers work correctly and follow the required format NCA-YYYY-######## for proper traceability and compliance.',
    machine_status: 'operational' as const,
    hold_label_completed: false,
    nca_logged: true,
    cross_contamination: false,
    status: 'draft' as const
  };

  const { data: createdNca, error: ncaError } = await supabase
    .from('ncas')
    .insert(testNca)
    .select('id, nca_number')
    .single();

  if (ncaError || !createdNca) {
    console.error('❌ Failed to create test NCA:', ncaError?.message);
    process.exit(1);
  }

  const ncaNumberPattern = /^NCA-\d{4}-\d{8}$/;
  if (!ncaNumberPattern.test(createdNca.nca_number)) {
    console.error(`❌ Invalid NCA number format: ${createdNca.nca_number}`);
    console.error('   Expected format: NCA-YYYY-########');
    process.exit(1);
  }

  console.log(`✅ NCA number generated correctly: ${createdNca.nca_number}`);

  // Cleanup test NCA
  await supabase.from('ncas').delete().eq('id', createdNca.id);
  console.log('✅ Test NCA cleaned up');

  // Step 5: Test audit trail
  console.log('\nStep 5: Testing audit trail...');

  const { data: auditEntries, error: auditError } = await supabase
    .from('audit_trail')
    .select('count')
    .limit(1);

  if (auditError) {
    console.error('❌ Failed to query audit trail:', auditError.message);
    process.exit(1);
  }

  console.log('✅ Audit trail table accessible');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test environment validation completed successfully!');
  console.log('='.repeat(60));
  console.log('\nYou can now run the integration tests:');
  console.log('  npm run test:integration');
  console.log('  npm run test:watch');
  console.log('  npm run test:coverage');
}

validateTestEnvironment()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  });
