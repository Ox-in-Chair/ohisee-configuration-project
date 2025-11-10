/**
 * NCA Detail View Page - Server Component
 * Displays all 11 sections of a Non-Conformance Advice in read-only mode
 * ARCHITECTURE: TypeScript Server Component, no client-side state
 * DATA: Fetched from Supabase using Server Client
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/database/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Package, AlertCircle, CheckCircle } from 'lucide-react';

interface NCADetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NCADetailPage({ params }: NCADetailPageProps) {
  const { id } = await params;

  // Fetch NCA record from database
  const supabase = createServerClient();
  const { data: nca, error } = await supabase
    .from('ncas')
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
      )
    `
    )
    .eq('id', id)
    .single() as { data: any; error: any };

  // Handle 404 if record not found
  if (error || !nca) {
    notFound();
  }

  // Format date for display (remove ISO timestamp format)
  const formattedDate = new Date(nca.created_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Status badge color mapping
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-800',
    submitted: 'bg-blue-500 text-white',
    'under-review': 'bg-yellow-500 text-white',
    closed: 'bg-green-600 text-white',
  };

  return (
    <div className="container mx-auto py-8 px-4" data-testid="nca-detail-page">
      {/* Header Section */}
      <div className="mb-6" data-testid="nca-detail-header">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/nca">
              <Button variant="outline" size="sm" data-testid="btn-back-to-register">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Register
              </Button>
            </Link>
          </div>
          <Badge className={statusColors[nca.status]} data-testid="nca-status-badge">
            {nca.status.charAt(0).toUpperCase() + nca.status.slice(1).replace('-', ' ')}
          </Badge>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {nca.nca_number}
        </h1>
        <p className="text-sm text-gray-500">
          Read Only - This is a view-only page. Editing is not permitted.
        </p>
      </div>

      {/* Section 1: NCA Identification */}
      <Card className="mb-6" data-testid="nca-detail-section-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Section 1: NCA Identification
          </CardTitle>
          <CardDescription>Auto-generated identification information</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Date</label>
            <p className="text-gray-900" data-testid="nca-detail-date">
              {formattedDate}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Time</label>
            <p className="text-gray-900">{nca.time}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">NCA Number</label>
            <p className="text-gray-900 font-mono">{nca.nca_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Raised By</label>
            <p className="text-gray-900">{nca.raised_by?.full_name || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Work Order Information */}
      <Card className="mb-6" data-testid="nca-detail-work-order">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Linked Work Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nca.work_orders ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">WO Number</label>
                <p className="text-gray-900 font-mono">{nca.work_orders.wo_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Product</label>
                <p className="text-gray-900">{nca.work_orders.product_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Badge variant="outline">{nca.work_orders.status}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 italic">No linked work order</p>
          )}
        </CardContent>
      </Card>

      {/* Section 2: NC Classification */}
      <Card className="mb-6" data-testid="nca-detail-section-2">
        <CardHeader>
          <CardTitle>Section 2: NC Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">NC Type</label>
            <p className="text-gray-900 capitalize">
              {nca.nc_type.replace('-', ' ')}
            </p>
          </div>
          {nca.nc_type === 'other' && nca.nc_type_other && (
            <div>
              <label className="text-sm font-medium text-gray-700">Other NC Type</label>
              <p className="text-gray-900">{nca.nc_type_other}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Supplier & Product Information */}
      <Card className="mb-6" data-testid="nca-detail-section-3">
        <CardHeader>
          <CardTitle>Section 3: Supplier & Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nca.supplier_name && (
              <div>
                <label className="text-sm font-medium text-gray-700">Supplier Name</label>
                <p className="text-gray-900">{nca.supplier_name}</p>
              </div>
            )}
            {nca.supplier_wo_batch && (
              <div>
                <label className="text-sm font-medium text-gray-700">WO/Batch Number</label>
                <p className="text-gray-900 font-mono">{nca.supplier_wo_batch}</p>
              </div>
            )}
            {nca.supplier_reel_box && (
              <div>
                <label className="text-sm font-medium text-gray-700">Reel/Box Number</label>
                <p className="text-gray-900 font-mono">{nca.supplier_reel_box}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">Sample Available</label>
              <p className="text-gray-900 flex items-center gap-2">
                {nca.sample_available ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Yes
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    No
                  </>
                )}
              </p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Product Description</label>
            <p className="text-gray-900 mt-1">{nca.nc_product_description}</p>
          </div>
          {nca.quantity && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <p className="text-gray-900">
                  {nca.quantity} {nca.quantity_unit}
                </p>
              </div>
              {nca.carton_numbers && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Carton Numbers</label>
                  <p className="text-gray-900 font-mono">{nca.carton_numbers}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: NC Description */}
      <Card className="mb-6" data-testid="nca-detail-section-4">
        <CardHeader>
          <CardTitle>Section 4: NC Description</CardTitle>
          <CardDescription>Detailed description of the non-conformance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-900 whitespace-pre-wrap">{nca.nc_description}</p>
          <p className="text-sm text-gray-500 mt-2">{nca.nc_description.length} characters</p>
        </CardContent>
      </Card>

      {/* Section 5: Machine Status */}
      <Card className="mb-6" data-testid="nca-detail-section-5">
        <CardHeader>
          <CardTitle>Section 5: Machine Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Machine Status</label>
            <Badge
              variant={nca.machine_status === 'down' ? 'destructive' : 'default'}
              className="ml-2"
            >
              {nca.machine_status.toUpperCase()}
            </Badge>
          </div>
          {nca.machine_status === 'down' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nca.machine_down_since && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Machine Down Since</label>
                  <p className="text-gray-900">
                    {new Date(nca.machine_down_since).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
              {nca.estimated_downtime && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Downtime</label>
                  <p className="text-gray-900">{nca.estimated_downtime} minutes</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Out of Spec Concession */}
      <Card className="mb-6" data-testid="nca-detail-section-6">
        <CardHeader>
          <CardTitle>Section 6: Out of Spec Concession</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nca.concession_team_leader ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Team Leader</label>
                <p className="text-gray-900">{nca.concession_team_leader}</p>
              </div>
              {nca.concession_notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{nca.concession_notes}</p>
                </div>
              )}
              {nca.concession_signature && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Signature</label>
                  <Badge variant="outline">Signed</Badge>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 italic">No concession required</p>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Immediate Correction */}
      <Card className="mb-6" data-testid="nca-detail-section-7">
        <CardHeader>
          <CardTitle>Section 7: Immediate Correction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Cross Contamination</label>
            <Badge variant={nca.cross_contamination ? 'destructive' : 'default'} className="ml-2">
              {nca.cross_contamination ? 'YES' : 'NO'}
            </Badge>
          </div>
          {nca.cross_contamination && (
            <>
              {nca.back_tracking_person && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Back Tracking Person</label>
                  <p className="text-gray-900">{nca.back_tracking_person}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Back Tracking Completed</label>
                <p className="text-gray-900 flex items-center gap-2">
                  {nca.back_tracking_completed ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Completed
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      Pending
                    </>
                  )}
                </p>
              </div>
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Hold Label Completed</label>
              <p className="text-gray-900 flex items-center gap-2">
                {nca.hold_label_completed ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Yes
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    No
                  </>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">NCA Logged</label>
              <p className="text-gray-900 flex items-center gap-2">
                {nca.nca_logged ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Yes
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                    No
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 8: Disposition */}
      <Card className="mb-6" data-testid="nca-detail-section-8">
        <CardHeader>
          <CardTitle>Section 8: Disposition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Disposition Actions</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {nca.disposition_reject && <Badge>Reject</Badge>}
              {nca.disposition_credit && <Badge>Credit</Badge>}
              {nca.disposition_uplift && <Badge>Uplift</Badge>}
              {nca.disposition_rework && <Badge>Rework</Badge>}
              {nca.disposition_concession && <Badge>Concession</Badge>}
              {nca.disposition_discard && <Badge>Discard</Badge>}
              {!nca.disposition_reject &&
                !nca.disposition_credit &&
                !nca.disposition_uplift &&
                !nca.disposition_rework &&
                !nca.disposition_concession &&
                !nca.disposition_discard && (
                  <span className="text-gray-500 italic">No disposition selected</span>
                )}
            </div>
          </div>
          {nca.disposition_rework && nca.rework_instruction && (
            <div>
              <label className="text-sm font-medium text-gray-700">Rework Instruction</label>
              <p className="text-gray-900 whitespace-pre-wrap mt-1">{nca.rework_instruction}</p>
            </div>
          )}
          {nca.disposition_authorized_by && (
            <div>
              <label className="text-sm font-medium text-gray-700">Authorized By</label>
              <p className="text-gray-900">{nca.disposition_authorized_by}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 9: Root Cause Analysis */}
      <Card className="mb-6" data-testid="nca-detail-section-9">
        <CardHeader>
          <CardTitle>Section 9: Root Cause Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {nca.root_cause_analysis ? (
            <p className="text-gray-900 whitespace-pre-wrap">{nca.root_cause_analysis}</p>
          ) : (
            <p className="text-gray-500 italic">No root cause analysis provided</p>
          )}
        </CardContent>
      </Card>

      {/* Section 10: Corrective Action */}
      <Card className="mb-6" data-testid="nca-detail-section-10">
        <CardHeader>
          <CardTitle>Section 10: Corrective Action</CardTitle>
        </CardHeader>
        <CardContent>
          {nca.corrective_action ? (
            <p className="text-gray-900 whitespace-pre-wrap">{nca.corrective_action}</p>
          ) : (
            <p className="text-gray-500 italic">No corrective action provided</p>
          )}
        </CardContent>
      </Card>

      {/* Section 11: Close Out */}
      <Card className="mb-6" data-testid="nca-detail-section-11">
        <CardHeader>
          <CardTitle>Section 11: Close Out</CardTitle>
        </CardHeader>
        <CardContent>
          {nca.status === 'closed' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {nca.close_out_by && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Closed By</label>
                  <p className="text-gray-900">{nca.close_out_by}</p>
                </div>
              )}
              {nca.close_out_date && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Close Out Date</label>
                  <p className="text-gray-900">
                    {new Date(nca.close_out_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
              )}
              {nca.close_out_signature && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Signature</label>
                  <Badge variant="outline">Signed</Badge>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">NCA not yet closed</p>
          )}
        </CardContent>
      </Card>

      {/* Attachments Section */}
      <Card className="mb-6" data-testid="nca-detail-attachments">
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {nca.root_cause_attachments || nca.corrective_action_attachments ? (
            <div className="space-y-2">
              {nca.root_cause_attachments && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Root Cause Attachments</label>
                  <p className="text-sm text-gray-500">Attachment functionality coming soon</p>
                </div>
              )}
              {nca.corrective_action_attachments && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Corrective Action Attachments
                  </label>
                  <p className="text-sm text-gray-500">Attachment functionality coming soon</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">No attachments</p>
          )}
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
            <p className="text-gray-900">{new Date(nca.created_at).toLocaleString('en-GB')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Last Updated</label>
            <p className="text-gray-900">{new Date(nca.updated_at).toLocaleString('en-GB')}</p>
          </div>
          {nca.submitted_at && (
            <div>
              <label className="text-sm font-medium text-gray-700">Submitted</label>
              <p className="text-gray-900">{new Date(nca.submitted_at).toLocaleString('en-GB')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
