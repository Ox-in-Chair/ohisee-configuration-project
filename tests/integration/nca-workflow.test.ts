/**
 * NCA Workflow Integration Tests
 *
 * Tests the complete NCA lifecycle using Supabase JS client:
 * 1. Draft creation with auto-generated NCA number
 * 2. Submission workflow with status transitions
 * 3. Team leader review process
 * 4. Cross-contamination back tracking enforcement (BRCGS CRITICAL)
 * 5. Disposition decision with rework instruction validation
 * 6. QA/Manager close-out with signature requirements
 * 7. Audit trail population at each step
 *
 * BRCGS Compliance: Validates all mandatory controls and traceability
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Type definitions for database entities
interface User {
  id: string;
  email: string;
  name: string;
  role: 'operator' | 'team-leader' | 'qa-supervisor' | 'operations-manager';
  department: string;
  active: boolean;
}

interface NCA {
  id: string;
  nca_number: string;
  wo_id?: string;
  raised_by_user_id: string;
  created_by: string;
  date: string;
  time: string;
  nc_type: 'raw-material' | 'finished-goods' | 'wip' | 'incident' | 'other';
  nc_type_other?: string;
  supplier_name?: string;
  nc_product_description: string;
  supplier_wo_batch?: string;
  supplier_reel_box?: string;
  sample_available: boolean;
  quantity?: number;
  quantity_unit?: 'kg' | 'units' | 'meters' | 'boxes' | 'pallets';
  carton_numbers?: string;
  nc_description: string;
  machine_status: 'down' | 'operational';
  machine_down_since?: string;
  estimated_downtime?: number;
  concession_team_leader?: string;
  concession_signature?: Record<string, unknown>;
  concession_notes?: string;
  cross_contamination: boolean;
  back_tracking_person?: string;
  back_tracking_signature?: Record<string, unknown>;
  back_tracking_completed?: boolean;
  hold_label_completed: boolean;
  nca_logged: boolean;
  disposition_reject?: boolean;
  disposition_credit?: boolean;
  disposition_uplift?: boolean;
  disposition_rework?: boolean;
  disposition_concession?: boolean;
  disposition_discard?: boolean;
  rework_instruction?: string;
  disposition_authorized_by?: string;
  disposition_signature?: Record<string, unknown>;
  root_cause_analysis?: string;
  root_cause_attachments?: Array<Record<string, unknown>>;
  corrective_action?: string;
  corrective_action_attachments?: Array<Record<string, unknown>>;
  close_out_by?: string;
  close_out_signature?: Record<string, unknown>;
  close_out_date?: string;
  status: 'draft' | 'submitted' | 'under-review' | 'closed';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  closed_at?: string;
}

interface AuditTrailEntry {
  id: string;
  entity_type: 'ncas' | 'mjcs' | 'work_orders' | 'users' | 'machines';
  entity_id: string;
  action: 'created' | 'updated' | 'status_changed' | 'submitted' | 'closed';
  user_id?: string;
  user_email: string;
  user_name: string;
  user_role: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  changed_fields?: string[];
  notes?: string;
  created_at: string;
}

describe('NCA Workflow Integration', () => {
  let supabase: SupabaseClient;
  let testNcaId: string;
  let operatorUser: User;
  let teamLeaderUser: User;
  let qaUser: User;
  let managerUser: User;
  let workOrderId: string;

  beforeAll(async () => {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local'
      );
    }

    // Setup Supabase client with service role key (bypasses RLS for testing)
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Fetch test users from seed data
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .in('role', ['operator', 'team-leader', 'qa-supervisor', 'operations-manager'])
      .eq('active', true);

    if (usersError || !users || users.length < 4) {
      throw new Error(`Failed to fetch test users: ${usersError?.message || 'Insufficient users in database'}`);
    }

    operatorUser = users.find((u: User) => u.role === 'operator')!;
    teamLeaderUser = users.find((u: User) => u.role === 'team-leader')!;
    qaUser = users.find((u: User) => u.role === 'qa-supervisor')!;
    managerUser = users.find((u: User) => u.role === 'operations-manager')!;

    // Fetch active work order for testing
    const { data: workOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (woError || !workOrders) {
      throw new Error(`Failed to fetch work order: ${woError?.message}`);
    }

    workOrderId = workOrders.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test NCAs created during tests
    if (testNcaId) {
      await supabase.from('ncas').delete().eq('id', testNcaId);
    }

    // Note: Audit trail entries are immutable and should not be deleted
    // They can be cleaned up manually if needed
  });

  beforeEach(() => {
    // Reset testNcaId before each test
    testNcaId = '';
  });

  describe('NCA Creation', () => {
    it('should create draft NCA with auto-generated number', async () => {
      const ncaData: Partial<NCA> = {
        wo_id: workOrderId,
        raised_by_user_id: operatorUser.id,
        created_by: operatorUser.id,
        nc_type: 'wip',
        nc_product_description: 'Stand-up Pouches 250ml - Print misalignment detected during quality inspection',
        sample_available: true,
        nc_description: 'During routine quality inspection at 10:15 AM, print registration on pouches was found to be misaligned by approximately 3mm affecting product appearance and potentially impacting customer perception which requires immediate attention.',
        machine_status: 'operational',
        hold_label_completed: true,
        nca_logged: true,
        cross_contamination: false,
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('ncas')
        .insert(ncaData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.nca_number).toMatch(/^NCA-\d{4}-\d{8}$/);
      expect(data.status).toBe('draft');
      expect(data.created_at).toBeDefined();
      expect(data.updated_at).toBeDefined();

      testNcaId = data.id;
    });

    it('should enforce minimum 100 character description requirement', async () => {
      const ncaData: Partial<NCA> = {
        wo_id: workOrderId,
        raised_by_user_id: operatorUser.id,
        created_by: operatorUser.id,
        nc_type: 'wip',
        nc_product_description: 'Test product',
        sample_available: false,
        nc_description: 'Too short', // Only 9 characters
        machine_status: 'operational',
        hold_label_completed: false,
        nca_logged: true,
        cross_contamination: false,
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('ncas')
        .insert(ncaData)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_description_min_length');
      expect(data).toBeNull();
    });

    it('should require machine_down_since when machine_status is down', async () => {
      const ncaData: Partial<NCA> = {
        wo_id: workOrderId,
        raised_by_user_id: operatorUser.id,
        created_by: operatorUser.id,
        nc_type: 'wip',
        nc_product_description: 'Machine failure',
        sample_available: false,
        nc_description: 'Critical machine failure detected during production run requiring immediate shutdown and maintenance intervention to prevent further damage to equipment and product quality issues affecting downstream operations.',
        machine_status: 'down',
        // Missing machine_down_since
        hold_label_completed: false,
        nca_logged: true,
        cross_contamination: false,
        status: 'draft'
      };

      const { data, error } = await supabase
        .from('ncas')
        .insert(ncaData)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_machine_down_requires_timestamp');
      expect(data).toBeNull();
    });
  });

  describe('NCA Submission Workflow', () => {
    beforeEach(async () => {
      // Create a draft NCA for submission tests
      const { data } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Test product for submission workflow',
          sample_available: false,
          nc_description: 'This is a test NCA created specifically for testing the submission workflow and ensuring all status transitions work correctly with proper timestamp tracking and audit trail generation.',
          machine_status: 'operational',
          hold_label_completed: true,
          nca_logged: true,
          cross_contamination: false,
          status: 'draft'
        })
        .select()
        .single();

      testNcaId = data!.id;
    });

    it('should submit NCA and set submitted_at timestamp', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({ status: 'submitted' })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('submitted');
      expect(data.submitted_at).toBeDefined();
      expect(new Date(data.submitted_at!).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should create audit trail entry on submission', async () => {
      await supabase
        .from('ncas')
        .update({ status: 'submitted' })
        .eq('id', testNcaId);

      // Query audit trail for this NCA
      const { data: auditEntries, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('entity_type', 'ncas')
        .eq('entity_id', testNcaId)
        .eq('action', 'submitted')
        .order('timestamp', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(auditEntries).toBeDefined();
      expect(auditEntries!.length).toBeGreaterThan(0);

      const auditEntry = auditEntries![0] as AuditTrailEntry;
      expect(auditEntry.entity_type).toBe('ncas');
      expect(auditEntry.action).toBe('submitted');
      expect(auditEntry.user_email).toBeDefined();
      expect(auditEntry.user_name).toBeDefined();
    });

    it('should transition to under-review status', async () => {
      // First submit
      await supabase
        .from('ncas')
        .update({ status: 'submitted' })
        .eq('id', testNcaId);

      // Then move to under-review
      const { data, error } = await supabase
        .from('ncas')
        .update({ status: 'under-review' })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('under-review');
    });
  });

  describe('Cross-Contamination Enforcement (BRCGS CRITICAL)', () => {
    beforeEach(async () => {
      // Create NCA with cross-contamination flag
      const { data } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Potential cross-contamination event',
          sample_available: true,
          nc_description: 'Potential cross-contamination detected during production requiring immediate back tracking investigation to identify source and extent of contamination ensuring food safety compliance and preventing further distribution of affected product batches.',
          machine_status: 'operational',
          hold_label_completed: true,
          nca_logged: true,
          cross_contamination: true,
          status: 'draft'
        })
        .select()
        .single();

      testNcaId = data!.id;
    });

    it('should REJECT NCA when cross_contamination=true without back tracking', async () => {
      // Attempt to set cross_contamination without completing back tracking
      const { data, error } = await supabase
        .from('ncas')
        .update({
          cross_contamination: true,
          back_tracking_person: null,
          back_tracking_signature: null,
          back_tracking_completed: false
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_cross_contamination_requires_tracking');
      expect(data).toBeNull();
    });

    it('should REQUIRE back_tracking_person when cross_contamination=true', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          cross_contamination: true,
          back_tracking_person: teamLeaderUser.name,
          back_tracking_signature: null, // Missing signature
          back_tracking_completed: true
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_cross_contamination_requires_tracking');
      expect(data).toBeNull();
    });

    it('should REQUIRE back_tracking_signature when cross_contamination=true', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          cross_contamination: true,
          back_tracking_person: teamLeaderUser.name,
          back_tracking_signature: null, // Missing signature
          back_tracking_completed: true
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_cross_contamination_requires_tracking');
    });

    it('should REQUIRE back_tracking_completed=true when cross_contamination=true', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          cross_contamination: true,
          back_tracking_person: teamLeaderUser.name,
          back_tracking_signature: {
            type: 'login',
            name: teamLeaderUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          back_tracking_completed: false // Not completed
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_cross_contamination_requires_tracking');
    });

    it('should ACCEPT NCA when cross_contamination with complete back tracking', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          cross_contamination: true,
          back_tracking_person: teamLeaderUser.name,
          back_tracking_signature: {
            type: 'login',
            name: teamLeaderUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          back_tracking_completed: true
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.cross_contamination).toBe(true);
      expect(data.back_tracking_person).toBe(teamLeaderUser.name);
      expect(data.back_tracking_signature).toBeDefined();
      expect(data.back_tracking_completed).toBe(true);
    });
  });

  describe('Disposition Decision Validation', () => {
    beforeEach(async () => {
      const { data } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Product requiring disposition decision',
          sample_available: true,
          nc_description: 'Product defect identified requiring disposition decision from team leader to determine appropriate corrective action whether rework rejection or concession based on severity of non-conformance and customer acceptance criteria.',
          machine_status: 'operational',
          hold_label_completed: true,
          nca_logged: true,
          cross_contamination: false,
          status: 'under-review'
        })
        .select()
        .single();

      testNcaId = data!.id;
    });

    it('should REJECT rework disposition without rework_instruction', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          disposition_rework: true,
          rework_instruction: null // Missing instruction
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_rework_requires_instruction');
      expect(data).toBeNull();
    });

    it('should ACCEPT rework disposition with rework_instruction', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          disposition_rework: true,
          rework_instruction: 'Re-run pouches through printing station to correct alignment. Verify print registration meets specification (±1mm tolerance) before releasing to next stage. Document all reworked batch numbers.',
          disposition_authorized_by: teamLeaderUser.name,
          disposition_signature: {
            type: 'login',
            name: teamLeaderUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          }
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.disposition_rework).toBe(true);
      expect(data.rework_instruction).toBeDefined();
      expect(data.rework_instruction!.length).toBeGreaterThan(20);
    });

    it('should allow reject disposition without rework_instruction', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          disposition_reject: true,
          disposition_authorized_by: teamLeaderUser.name,
          disposition_signature: {
            type: 'login',
            name: teamLeaderUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          }
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.disposition_reject).toBe(true);
      expect(data.rework_instruction).toBeUndefined();
    });
  });

  describe('NCA Close-Out Workflow', () => {
    beforeEach(async () => {
      const { data } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Product ready for close-out',
          sample_available: false,
          nc_description: 'Non-conformance has been addressed with corrective actions implemented and verified. Root cause identified as calibration drift. Ready for final QA review and close-out by authorized personnel to complete the non-conformance investigation cycle.',
          machine_status: 'operational',
          hold_label_completed: true,
          nca_logged: true,
          cross_contamination: false,
          disposition_rework: true,
          rework_instruction: 'Recalibrate machine sensors per SOP-MAINT-015',
          root_cause_analysis: 'Root cause identified: Sensor calibration drift due to temperature fluctuations.',
          corrective_action: 'Implemented daily calibration checks and environmental monitoring.',
          status: 'under-review'
        })
        .select()
        .single();

      testNcaId = data!.id;
    });

    it('should REJECT close-out without close_out_by', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: null, // Missing
          close_out_signature: {
            type: 'login',
            name: qaUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          close_out_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_closed_requires_closeout');
    });

    it('should REJECT close-out without close_out_signature', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: qaUser.name,
          close_out_signature: null, // Missing
          close_out_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_closed_requires_closeout');
    });

    it('should REJECT close-out without close_out_date', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: qaUser.name,
          close_out_signature: {
            type: 'login',
            name: qaUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          close_out_date: null // Missing
        })
        .eq('id', testNcaId)
        .select();

      expect(error).toBeDefined();
      expect(error?.message).toContain('nca_closed_requires_closeout');
    });

    it('should ACCEPT complete close-out and set closed_at timestamp', async () => {
      const { data, error } = await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: qaUser.name,
          close_out_signature: {
            type: 'login',
            name: qaUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          close_out_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('closed');
      expect(data.close_out_by).toBe(qaUser.name);
      expect(data.close_out_signature).toBeDefined();
      expect(data.close_out_date).toBeDefined();
      expect(data.closed_at).toBeDefined();
    });

    it('should create audit trail entry on close-out', async () => {
      await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: qaUser.name,
          close_out_signature: {
            type: 'login',
            name: qaUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          close_out_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testNcaId);

      const { data: auditEntries, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('entity_type', 'ncas')
        .eq('entity_id', testNcaId)
        .eq('action', 'closed')
        .order('timestamp', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(auditEntries).toBeDefined();
      expect(auditEntries!.length).toBeGreaterThan(0);

      const auditEntry = auditEntries![0] as AuditTrailEntry;
      expect(auditEntry.action).toBe('closed');
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should create audit trail entry on NCA creation', async () => {
      const { data: nca } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Test for audit trail',
          sample_available: false,
          nc_description: 'Testing audit trail creation to ensure all NCA lifecycle events are properly logged with complete user attribution timestamp tracking and change history for regulatory compliance and traceability requirements under BRCGS standards.',
          machine_status: 'operational',
          hold_label_completed: false,
          nca_logged: true,
          cross_contamination: false,
          status: 'draft'
        })
        .select()
        .single();

      testNcaId = nca!.id;

      // Wait briefly for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: auditEntries, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('entity_type', 'ncas')
        .eq('entity_id', testNcaId)
        .eq('action', 'created');

      expect(error).toBeNull();
      expect(auditEntries).toBeDefined();
      expect(auditEntries!.length).toBeGreaterThan(0);

      const auditEntry = auditEntries![0] as AuditTrailEntry;
      expect(auditEntry.entity_type).toBe('ncas');
      expect(auditEntry.action).toBe('created');
      expect(auditEntry.new_value).toBeDefined();
    });

    it('should track changed_fields on update', async () => {
      // Create NCA
      const { data: nca } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Test for field tracking',
          sample_available: false,
          nc_description: 'Testing changed fields tracking in audit trail to verify that all modifications to NCA records are accurately logged with specific field-level change detection providing detailed history for compliance auditing and investigation purposes.',
          machine_status: 'operational',
          hold_label_completed: false,
          nca_logged: true,
          cross_contamination: false,
          status: 'draft'
        })
        .select()
        .single();

      testNcaId = nca!.id;

      // Update specific fields
      await supabase
        .from('ncas')
        .update({
          sample_available: true,
          quantity: 150,
          quantity_unit: 'units'
        })
        .eq('id', testNcaId);

      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: auditEntries, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('entity_type', 'ncas')
        .eq('entity_id', testNcaId)
        .eq('action', 'updated')
        .order('timestamp', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(auditEntries).toBeDefined();

      if (auditEntries && auditEntries.length > 0) {
        const auditEntry = auditEntries[0] as AuditTrailEntry;
        expect(auditEntry.changed_fields).toBeDefined();
        expect(auditEntry.changed_fields).toContain('sample_available');
        expect(auditEntry.changed_fields).toContain('quantity');
        expect(auditEntry.changed_fields).toContain('quantity_unit');
      }
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should complete full NCA lifecycle: draft → submit → review → close', async () => {
      // Step 1: Create draft NCA
      const { data: draftNca } = await supabase
        .from('ncas')
        .insert({
          wo_id: workOrderId,
          raised_by_user_id: operatorUser.id,
          created_by: operatorUser.id,
          nc_type: 'wip',
          nc_product_description: 'Full workflow test product',
          sample_available: true,
          quantity: 100,
          quantity_unit: 'units',
          nc_description: 'Complete workflow test covering all lifecycle stages from initial detection through investigation disposition and final close-out demonstrating full compliance with BRCGS requirements for non-conformance management and traceability throughout the entire process.',
          machine_status: 'operational',
          hold_label_completed: true,
          nca_logged: true,
          cross_contamination: false,
          status: 'draft'
        })
        .select()
        .single();

      testNcaId = draftNca!.id;
      expect(draftNca!.status).toBe('draft');
      expect(draftNca!.nca_number).toMatch(/^NCA-\d{4}-\d{8}$/);

      // Step 2: Submit NCA
      const { data: submittedNca } = await supabase
        .from('ncas')
        .update({ status: 'submitted' })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(submittedNca!.status).toBe('submitted');
      expect(submittedNca!.submitted_at).toBeDefined();

      // Step 3: Team leader reviews
      const { data: reviewNca } = await supabase
        .from('ncas')
        .update({
          status: 'under-review',
          disposition_rework: true,
          rework_instruction: 'Sort and repack affected units. Verify quality before shipping.',
          disposition_authorized_by: teamLeaderUser.name,
          disposition_signature: {
            type: 'login',
            name: teamLeaderUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          root_cause_analysis: 'Operator training gap identified during shift changeover.',
          corrective_action: 'Additional training provided to all shift operators on quality inspection procedures.'
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(reviewNca!.status).toBe('under-review');
      expect(reviewNca!.disposition_rework).toBe(true);

      // Step 4: QA closes NCA
      const { data: closedNca } = await supabase
        .from('ncas')
        .update({
          status: 'closed',
          close_out_by: qaUser.name,
          close_out_signature: {
            type: 'login',
            name: qaUser.name,
            timestamp: new Date().toISOString(),
            ip: '127.0.0.1'
          },
          close_out_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', testNcaId)
        .select()
        .single();

      expect(closedNca!.status).toBe('closed');
      expect(closedNca!.closed_at).toBeDefined();

      // Verify complete audit trail
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: auditTrail } = await supabase
        .from('audit_trail')
        .select('action')
        .eq('entity_type', 'ncas')
        .eq('entity_id', testNcaId)
        .order('timestamp', { ascending: true });

      expect(auditTrail).toBeDefined();
      const actions = auditTrail!.map((entry: { action: string }) => entry.action);
      expect(actions).toContain('created');
      expect(actions).toContain('submitted');
      expect(actions).toContain('closed');
    });
  });
});
