/**
 * MJC Detail View Page - Server Component
 * Displays all 11 sections of a Maintenance Job Card in read-only mode
 * Includes hygiene checklist (10 items) and temporary repair countdown
 * ARCHITECTURE: TypeScript Server Component, no client-side state
 * DATA: Fetched from Supabase using Server Client
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/database/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface MJCDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Hygiene checklist item labels (BRCGS standard 10 items)
const HYGIENE_CHECKLIST_ITEMS = [
  'All tools removed from work area',
  'Work area cleaned and sanitized',
  'No foreign objects left behind',
  'Machine guards replaced',
  'Safety interlocks functional',
  'All panels secured',
  'No oil or grease contamination',
  'Floor area clean',
  'Waste properly disposed',
  'Documentation complete',
];

export default async function MJCDetailPage({ params }: MJCDetailPageProps) {
  const { id } = await params;

  // Fetch MJC record from database
  const supabase = createServerClient();
  const { data: mjc, error } = await supabase
    .from('mjcs')
    .select(
      `
      *,
      work_orders:wo_id (
        wo_number,
        status,
        product_name
      ),
      raised_by:raised_by_user_id (
        full_name,
        email
      ),
      created_by_user:created_by (
        full_name,
        email
      ),
      assigned_to_user:assigned_to (
        full_name,
        email
      )
    `
    )
    .eq('id', id)
    .single() as { data: any; error: any };

  // Handle 404 if record not found
  if (error || !mjc) {
    notFound();
  }

  // Format date for display
  const formattedDate = new Date(mjc.created_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate days remaining for temporary repair
  const calculateDaysRemaining = (dueDate: string | null): number | null => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = mjc.temporary_repair ? calculateDaysRemaining(mjc.close_out_due_date) : null;

  // Status badge color mapping
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-800',
    open: 'bg-blue-500 text-white',
    assigned: 'bg-purple-500 text-white',
    'in-progress': 'bg-yellow-500 text-white',
    'awaiting-clearance': 'bg-orange-500 text-white',
    closed: 'bg-green-600 text-white',
  };

  // Urgency badge colors
  const urgencyColors: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-blue-500 text-white',
  };

  // Parse hygiene checklist if it exists
  const hygieneChecklist = mjc.hygiene_checklist
    ? Array.isArray(mjc.hygiene_checklist)
      ? mjc.hygiene_checklist
      : []
    : [];

  return (
    <div className="container mx-auto py-8 px-4" data-testid="mjc-detail-page">
      {/* Header Section */}
      <div className="mb-6" data-testid="mjc-detail-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/mjc">
              <Button variant="outline" size="sm" data-testid="btn-back-to-register">
                <Icon name={ICONS.ARROW_LEFT} size="sm" className="mr-2" />
                Back to Register
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={urgencyColors[mjc.urgency]} data-testid="mjc-urgency-badge">
              {mjc.urgency.toUpperCase()}
            </Badge>
            <Badge className={statusColors[mjc.status]} data-testid="mjc-status-badge">
              {mjc.status.charAt(0).toUpperCase() + mjc.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{mjc.job_card_number}</h1>
        <p className="text-sm text-gray-500">Read Only - This is a view-only page. Editing is not permitted.</p>
      </div>

      {/* Temporary Repair Alert (if applicable) */}
      {mjc.temporary_repair && daysRemaining !== null && (
        <Card
          className="mb-6 border-l-4 border-l-orange-500"
          data-testid="mjc-temp-repair-countdown"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <Icon name={ICONS.CLOCK} size="md" />
              Temporary Repair - Close Out Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <p className="text-gray-900" data-testid="mjc-temp-repair-due-date">
                  {new Date(mjc.close_out_due_date!).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Days Remaining</label>
                <p
                  className={`text-2xl font-bold ${
                    daysRemaining <= 3 ? 'text-red-600' : daysRemaining <= 7 ? 'text-orange-600' : 'text-blue-600'
                  }`}
                  data-testid="mjc-days-remaining"
                >
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
            {daysRemaining <= 3 && (
              <div
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2"
                data-testid="mjc-temp-repair-alert"
              >
                <Icon name={ICONS.ALERT} size="md" className="text-red-600" />
                <span className="text-sm text-red-800 font-medium">
                  URGENT: Permanent repair required within {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 1: Job Card Identification */}
      <Card className="mb-6" data-testid="mjc-detail-section-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.WRENCH} size="md" />
            Section 1: Job Card Identification
          </CardTitle>
          <CardDescription>Auto-generated identification information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Date</label>
            <p className="text-gray-900">{formattedDate}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Time</label>
            <p className="text-gray-900">{mjc.time}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Job Card Number</label>
            <p className="text-gray-900 font-mono">{mjc.job_card_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Department</label>
            <p className="text-gray-900 capitalize">{mjc.department}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Raised By</label>
            <p className="text-gray-900">{mjc.raised_by?.full_name || 'N/A'}</p>
          </div>
          {mjc.assigned_to_user && (
            <div>
              <label className="text-sm font-medium text-gray-700">Assigned To</label>
              <p className="text-gray-900">{mjc.assigned_to_user.full_name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Order Information */}
      <Card className="mb-6" data-testid="mjc-detail-work-order">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.PACKAGE} size="md" />
            Linked Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mjc.work_orders ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">WO Number</label>
                <p className="text-gray-900 font-mono">{mjc.work_orders.wo_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Product</label>
                <p className="text-gray-900">{mjc.work_orders.product_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Badge variant="outline">{mjc.work_orders.status}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No linked work order</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Machine/Equipment Identification */}
      <Card className="mb-6" data-testid="mjc-detail-section-2">
        <CardHeader>
          <CardTitle>Section 2: Machine/Equipment Identification</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium text-gray-700">Machine/Equipment</label>
            <p className="text-gray-900 font-medium">{mjc.machine_equipment}</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Maintenance Type & Classification */}
      <Card className="mb-6" data-testid="mjc-detail-section-3">
        <CardHeader>
          <CardTitle>Section 3: Maintenance Type & Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Maintenance Category</label>
            <Badge className="ml-2 capitalize">{mjc.maintenance_category}</Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Maintenance Type</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {mjc.maintenance_type_electrical && <Badge variant="outline">Electrical</Badge>}
              {mjc.maintenance_type_mechanical && <Badge variant="outline">Mechanical</Badge>}
              {mjc.maintenance_type_pneumatical && <Badge variant="outline">Pneumatical</Badge>}
              {mjc.maintenance_type_other && <Badge variant="outline">{mjc.maintenance_type_other}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Machine Status & Urgency */}
      <Card className="mb-6" data-testid="mjc-detail-section-4">
        <CardHeader>
          <CardTitle>Section 4: Machine Status & Urgency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Machine Status</label>
              <Badge
                variant={mjc.machine_status === 'down' ? 'destructive' : 'default'}
                className="ml-2"
              >
                {mjc.machine_status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Urgency Level</label>
              <Badge className={`ml-2 ${urgencyColors[mjc.urgency]}`}>
                {mjc.urgency.toUpperCase()}
              </Badge>
            </div>
          </div>
          {mjc.machine_status === 'down' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mjc.machine_down_since && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Machine Down Since</label>
                  <p className="text-gray-900">
                    {new Date(mjc.machine_down_since).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
              {mjc.estimated_downtime && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Downtime</label>
                  <p className="text-gray-900">{mjc.estimated_downtime} minutes</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Temporary Repair Status */}
      <Card className="mb-6" data-testid="mjc-detail-section-5">
        <CardHeader>
          <CardTitle>Section 5: Temporary Repair Status</CardTitle>
        </CardHeader>
        <CardContent>
          {mjc.temporary_repair ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">Temporary Repair Applied</Badge>
              </div>
              {mjc.close_out_due_date && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Permanent Fix Due Date</label>
                  <p className="text-gray-900">
                    {new Date(mjc.close_out_due_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div data-testid="mjc-no-temp-repair">
              <Badge variant="default">No Temporary Repair</Badge>
              <p className="text-sm text-gray-500 mt-2">Permanent repair completed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Description of Maintenance Required */}
      <Card className="mb-6" data-testid="mjc-detail-section-6">
        <CardHeader>
          <CardTitle>Section 6: Description of Maintenance Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-900 whitespace-pre-wrap">{mjc.description_required}</p>
          <p className="text-sm text-gray-500 mt-2">{mjc.description_required.length} characters</p>
        </CardContent>
      </Card>

      {/* Section 7: Maintenance Performed */}
      <Card className="mb-6" data-testid="mjc-detail-section-7">
        <CardHeader>
          <CardTitle>Section 7: Maintenance Performed</CardTitle>
        </CardHeader>
        <CardContent>
          {mjc.maintenance_performed ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Work Performed</label>
                <p className="text-gray-900 whitespace-pre-wrap mt-1">{mjc.maintenance_performed}</p>
              </div>
              {mjc.maintenance_technician && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Technician</label>
                  <p className="text-gray-900">{mjc.maintenance_technician}</p>
                </div>
              )}
              {mjc.work_started_at && mjc.work_completed_at && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Work Started</label>
                    <p className="text-gray-900">
                      {new Date(mjc.work_started_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Work Completed</label>
                    <p className="text-gray-900">
                      {new Date(mjc.work_completed_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Maintenance work not yet performed</p>
          )}
        </CardContent>
      </Card>

      {/* Section 8: Additional Comments */}
      <Card className="mb-6" data-testid="mjc-detail-section-8">
        <CardHeader>
          <CardTitle>Section 8: Additional Comments</CardTitle>
        </CardHeader>
        <CardContent>
          {mjc.additional_comments ? (
            <p className="text-gray-900 whitespace-pre-wrap">{mjc.additional_comments}</p>
          ) : (
            <p className="text-gray-500 italic">No additional comments</p>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Post Hygiene Clearance Record (BRCGS CRITICAL) */}
      <Card className="mb-6" data-testid="mjc-detail-section-9">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.ALERT} size="md" className="text-orange-600" />
            Section 9: Post Hygiene Clearance Record (BRCGS CRITICAL)
          </CardTitle>
          <CardDescription>All 10 items must be verified before production clearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" data-testid="mjc-hygiene-checklist">
            {hygieneChecklist.length > 0 ? (
              hygieneChecklist.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-md"
                  data-testid={`hygiene-item-${index + 1}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {item.verified ? (
                      <CheckCircle
                        className="h-5 w-5 text-green-600"
                        data-testid={`hygiene-verified-${index + 1}`}
                      />
                    ) : (
                      <AlertCircle
                        className="h-5 w-5 text-gray-400"
                        data-testid={`hygiene-unverified-${index + 1}`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{item.item}</p>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}
                  </div>
                  <Badge
                    variant={item.verified ? 'default' : 'outline'}
                    className={item.verified ? 'bg-green-600' : ''}
                  >
                    {item.verified ? 'Verified' : 'Pending'}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="space-y-3">
                {HYGIENE_CHECKLIST_ITEMS.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-md"
                    data-testid={`hygiene-item-${index + 1}`}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <AlertCircle
                        className="h-5 w-5 text-gray-400"
                        data-testid={`hygiene-unverified-${index + 1}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{item}</p>
                    </div>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 10: Post Hygiene Clearance Signature */}
      <Card className="mb-6" data-testid="mjc-detail-section-10">
        <CardHeader>
          <CardTitle>Section 10: Post Hygiene Clearance Signature</CardTitle>
          <CardDescription>QA Supervisor approval required</CardDescription>
        </CardHeader>
        <CardContent>
          {mjc.hygiene_clearance_by ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">QA Supervisor</label>
                  <p className="text-gray-900">{mjc.hygiene_clearance_by}</p>
                </div>
                {mjc.hygiene_clearance_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Clearance Date</label>
                    <p className="text-gray-900">
                      {new Date(mjc.hygiene_clearance_at).toLocaleString('en-GB')}
                    </p>
                  </div>
                )}
              </div>
              {mjc.hygiene_clearance_comments && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Comments</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{mjc.hygiene_clearance_comments}</p>
                </div>
              )}
              {mjc.hygiene_clearance_signature && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                  <Icon name={ICONS.SUCCESS_ALT} size="md" className="text-green-600" />
                  <span className="text-green-800 font-medium">Production Clearance Granted</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Awaiting hygiene clearance signature</p>
          )}
        </CardContent>
      </Card>

      {/* Section 11: Job Card Status & Closure */}
      <Card className="mb-6" data-testid="mjc-detail-section-11">
        <CardHeader>
          <CardTitle>Section 11: Job Card Status & Closure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Current Status</label>
              <Badge className={`ml-2 ${statusColors[mjc.status]}`}>
                {mjc.status.charAt(0).toUpperCase() + mjc.status.slice(1).replace('-', ' ')}
              </Badge>
            </div>
            {mjc.status === 'closed' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <Icon name={ICONS.SUCCESS_ALT} size="md" className="text-green-600" />
                <span className="text-green-800 font-medium">Job Card Closed</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="text-sm font-medium text-gray-700">Created</label>
            <p className="text-gray-900">{new Date(mjc.created_at).toLocaleString('en-GB')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Last Updated</label>
            <p className="text-gray-900">{new Date(mjc.updated_at).toLocaleString('en-GB')}</p>
          </div>
          {mjc.submitted_at && (
            <div>
              <label className="text-sm font-medium text-gray-700">Submitted</label>
              <p className="text-gray-900">{new Date(mjc.submitted_at).toLocaleString('en-GB')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
