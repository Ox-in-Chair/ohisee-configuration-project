/**
 * End-of-Day Submission Page
 *
 * Allows operators to submit their daily shift summary with:
 * - Production data (work orders, metrics)
 * - NCAs created during shift
 * - MJCs created during shift
 * - Operator sign-off and signature
 *
 * BRCGS Compliance: Section 3.9 Traceability
 * - All entries must be complete before submission
 * - Entries locked after submission
 * - Management report generated automatically
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, FileText, Wrench, Clock, X } from 'lucide-react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/database/client';
import { submitEndOfDay } from '@/app/actions/end-of-day-actions';

interface ShiftSummary {
  workOrders: Array<{
    id: string;
    wo_number: string;
    machine_id: string;
    status: string;
  }>;
  ncas: Array<{
    id: string;
    nca_number: string;
    status: string;
    nc_type: string;
    created_at: string;
  }>;
  mjcs: Array<{
    id: string;
    job_card_number: string;
    status: string;
    urgency: string;
    created_at: string;
  }>;
  incompleteDrafts: {
    ncas: number;
    mjcs: number;
  };
}

export default function EndOfDayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [shiftNotes, setShiftNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch shift summary on mount
  useEffect(() => {
    const fetchShiftSummary = async () => {
      try {
        setLoading(true);
        const supabase = createBrowserClient();

        // TODO: Get real user ID and shift date from auth context
        const userId = '10000000-0000-0000-0000-000000000001'; // Placeholder
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch work orders for user
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, wo_number, machine_id, status')
          .eq('operator_id', userId)
          .in('status', ['active', 'completed']);

        // Fetch NCAs created today by user
        const { data: ncas } = await supabase
          .from('ncas')
          .select('id, nca_number, status, nc_type, created_at')
          .eq('raised_by_user_id', userId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: false });

        // Fetch MJCs created today by user
        const { data: mjcs } = await supabase
          .from('mjcs')
          .select('id, job_card_number, status, urgency, created_at')
          .eq('raised_by_user_id', userId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: false });

        // Count incomplete drafts
        const incompleteNCAs = (ncas || []).filter((n: any) => n.status === 'draft').length;
        const incompleteMJCs = (mjcs || []).filter((m: any) => m.status === 'draft').length;

        setSummary({
          workOrders: workOrders || [],
          ncas: ncas || [],
          mjcs: mjcs || [],
          incompleteDrafts: {
            ncas: incompleteNCAs,
            mjcs: incompleteMJCs,
          },
        });
      } catch (err) {
        console.error('Failed to fetch shift summary:', err);
        setError('Failed to load shift summary');
      } finally {
        setLoading(false);
      }
    };

    fetchShiftSummary();
  }, []);

  const handleSubmit = async () => {
    if (!summary) return;

    // Validate
    if (summary.incompleteDrafts.ncas > 0 || summary.incompleteDrafts.mjcs > 0) {
      setError('Cannot submit with incomplete drafts. Please complete or discard all drafts first.');
      return;
    }

    if (!confirmed) {
      setError('Please confirm that all information is accurate before submitting.');
      return;
    }

    if (!signature) {
      setError('Please provide your signature before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // TODO: Get real user ID from auth context
      const userId = '10000000-0000-0000-0000-000000000001';

      const result = await submitEndOfDay(
        {
          shiftNotes,
          signature: {
            type: 'digital',
            data: signature,
            name: 'Operator', // TODO: Get from auth
            timestamp: new Date().toISOString(),
          },
          userId,
        },
        {
          ncaIds: summary.ncas.map(n => n.id),
          mjcIds: summary.mjcs.map(m => m.id),
          workOrderIds: summary.workOrders.map(wo => wo.id),
        }
      );

      if (!result.success) {
        setError(result.error || 'Failed to submit. Please try again.');
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard/production');
    } catch (err) {
      console.error('Failed to submit end-of-day summary:', err);
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="text-lg text-gray-500">Loading shift summary...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Failed to load shift summary. Please try again.'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const hasIncompleteDrafts =
    summary.incompleteDrafts.ncas > 0 || summary.incompleteDrafts.mjcs > 0;
  const canSubmit = confirmed && signature && !hasIncompleteDrafts;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">End-of-Day Submission</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and submit your shift summary for {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        {/* Incomplete Drafts Warning */}
        {hasIncompleteDrafts && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Incomplete drafts detected:</p>
                <ul className="list-disc list-inside space-y-1">
                  {summary.incompleteDrafts.ncas > 0 && (
                    <li>
                      {summary.incompleteDrafts.ncas} NCA draft(s) - must complete or discard
                    </li>
                  )}
                  {summary.incompleteDrafts.mjcs > 0 && (
                    <li>
                      {summary.incompleteDrafts.mjcs} MJC draft(s) - must complete or discard
                    </li>
                  )}
                </ul>
                <p className="text-sm mt-2">
                  You cannot submit until all drafts are completed or discarded.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              Work Orders
            </CardTitle>
            <CardDescription>Active work orders for this shift</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.workOrders.length === 0 ? (
              <p className="text-gray-500">No active work orders</p>
            ) : (
              <div className="space-y-2">
                {summary.workOrders.map(wo => (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <span className="font-medium font-alt">{wo.wo_number}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        Machine: {wo.machine_id || 'Not specified'}
                      </span>
                    </div>
                    <Badge variant={wo.status === 'active' ? 'default' : 'secondary'}>
                      {wo.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NCAs Created Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-critical-600" />
              NCAs Created Today
            </CardTitle>
            <CardDescription>
              {summary.ncas.length} non-conformance advice{summary.ncas.length !== 1 ? 's' : ''}{' '}
              created during this shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.ncas.length === 0 ? (
              <p className="text-gray-500">No NCAs created today</p>
            ) : (
              <div className="space-y-2">
                {summary.ncas.map(nca => (
                  <div
                    key={nca.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      nca.status === 'draft' ? 'border-warning-600 bg-warning-600/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/nca/${nca.id}`}
                          className="font-medium font-alt text-primary-600 hover:underline"
                        >
                          {nca.nca_number}
                        </Link>
                        {nca.status === 'draft' && (
                          <Badge variant="destructive" className="text-xs">
                            DRAFT - Must Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {nca.nc_type} • {new Date(nca.created_at).toLocaleTimeString('en-GB')}
                      </p>
                    </div>
                    <Badge variant={nca.status === 'draft' ? 'destructive' : 'default'}>
                      {nca.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MJCs Created Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-warning-600" />
              MJCs Created Today
            </CardTitle>
            <CardDescription>
              {summary.mjcs.length} maintenance job card{summary.mjcs.length !== 1 ? 's' : ''}{' '}
              created during this shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.mjcs.length === 0 ? (
              <p className="text-gray-500">No MJCs created today</p>
            ) : (
              <div className="space-y-2">
                {summary.mjcs.map(mjc => (
                  <div
                    key={mjc.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      mjc.status === 'draft' ? 'border-warning-600 bg-warning-600/5' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/mjc/${mjc.id}`}
                          className="font-medium font-alt text-primary-600 hover:underline"
                        >
                          {mjc.job_card_number}
                        </Link>
                        {mjc.status === 'draft' && (
                          <Badge variant="destructive" className="text-xs">
                            DRAFT - Must Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {mjc.urgency} urgency • {new Date(mjc.created_at).toLocaleTimeString('en-GB')}
                      </p>
                    </div>
                    <Badge variant={mjc.status === 'draft' ? 'destructive' : 'default'}>
                      {mjc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Notes</CardTitle>
            <CardDescription>Optional notes about the shift</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={shiftNotes}
              onChange={e => setShiftNotes(e.target.value)}
              placeholder="Enter any notes about the shift, machine performance, concerns, etc."
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Confirmation and Signature */}
        <Card>
          <CardHeader>
            <CardTitle>Operator Sign-Off</CardTitle>
            <CardDescription>Confirm and sign to submit your shift summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Confirmation Checkbox */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="confirmation"
                checked={confirmed}
                onCheckedChange={checked => setConfirmed(checked === true)}
              />
              <Label
                htmlFor="confirmation"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I confirm that all production data, NCAs, and maintenance requests have been
                accurately documented for this shift.
              </Label>
            </div>

            {/* Signature Placeholder */}
            <div>
              <Label>Digital Signature</Label>
              <p className="text-sm text-gray-500 mb-2">
                TODO: Implement signature capture component
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Open signature pad modal
                  setSignature('signature-placeholder');
                }}
                disabled={!!signature}
              >
                {signature ? 'Signature Captured' : 'Capture Signature'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Link href="/dashboard/production">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            size="lg"
            className="min-h-[44px]"
          >
            {submitting ? 'Submitting...' : 'Submit End-of-Day Summary'}
          </Button>
        </div>
      </div>
    </div>
  );
}

