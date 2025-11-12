/**
 * Complaint Link Component
 * Displays linked complaint in NCA detail view
 * PRD Enhancement: Complaint Handling Integration
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { getComplaintByNCA } from '@/app/actions/complaint-actions';
import type { Complaint } from '@/app/actions/complaint-actions';

interface ComplaintLinkProps {
  ncaId: string;
}

export function ComplaintLink({ ncaId }: ComplaintLinkProps) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComplaint() {
      try {
        setLoading(true);
        const result = await getComplaintByNCA(ncaId);
        if (result.success && result.data) {
          setComplaint(result.data);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load complaint');
      } finally {
        setLoading(false);
      }
    }

    fetchComplaint();
  }, [ncaId]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.MESSAGE} size="md" />
            Linked Customer Complaint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading complaint...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !complaint) {
    return null; // Don't show if no complaint linked
  }

  const getSeverityBadgeVariant = (severity: string | null) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'closed':
        return 'default';
      case 'valid':
        return 'secondary';
      case 'invalid':
        return 'outline';
      case 'investigating':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="mb-6" data-testid="complaint-link">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name={ICONS.MESSAGE} size="md" />
          Linked Customer Complaint (Form 3.10F2)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Complaint Number</label>
            <p className="text-gray-900 font-mono">{complaint.complaint_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Customer</label>
            <p className="text-gray-900">{complaint.customer_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Complaint Date</label>
            <p className="text-gray-900">
              {new Date(complaint.complaint_date).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <Badge variant={getSeverityBadgeVariant(complaint.severity)} className="ml-2">
              {complaint.severity?.toUpperCase() || 'N/A'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <Badge variant={getStatusBadgeVariant(complaint.investigation_status)} className="ml-2">
              {complaint.investigation_status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
          {complaint.cycle_time_days !== null && (
            <div>
              <label className="text-sm font-medium text-gray-700">Cycle Time</label>
              <p className="text-gray-900">
                {complaint.cycle_time_days} working days
                {complaint.cycle_time_days > 20 && (
                  <span className="text-red-600 ml-2">(Exceeds 20-day limit)</span>
                )}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Complaint Description</label>
          <p className="text-gray-900 whitespace-pre-wrap mt-1">{complaint.complaint_description}</p>
        </div>
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/complaints/${complaint.id}`}>
              <Icon name={ICONS.EXTERNAL_LINK} size="sm" className="mr-2" />
              View Full Complaint
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

