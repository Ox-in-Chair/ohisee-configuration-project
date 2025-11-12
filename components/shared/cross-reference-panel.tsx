/**
 * Cross-Reference Panel Component
 * Displays related records across procedures
 * PRD Enhancement: Enhanced Cross-Referencing
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import {
  getRelatedRecords,
  getProcedureReferences,
  type RecordType,
  type CrossReference,
} from '@/lib/services/cross-reference-service';

interface CrossReferencePanelProps {
  recordType: RecordType;
  recordId: string;
}

export function CrossReferencePanel({ recordType, recordId }: CrossReferencePanelProps) {
  const [relatedRecords, setRelatedRecords] = useState<CrossReference[]>([]);
  const [procedureRefs, setProcedureRefs] = useState<
    Array<{ procedure: string; formNumber: string; description: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferences() {
      try {
        setLoading(true);
        const [records, procedures] = await Promise.all([
          getRelatedRecords(recordType, recordId),
          getProcedureReferences(recordType),
        ]);
        setRelatedRecords(records);
        setProcedureRefs(procedures);
      } catch (error) {
        console.error('Error loading cross-references:', error);
      } finally {
        setLoading(false);
      }
    }

    loadReferences();
  }, [recordType, recordId]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.LINK} size="md" />
            Cross-References
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading cross-references...</p>
        </CardContent>
      </Card>
    );
  }

  if (relatedRecords.length === 0 && procedureRefs.length === 0) {
    return null; // Don't show if no references
  }

  const getRecordTypeBadge = (type: RecordType) => {
    const badges: Record<RecordType, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      nca: { label: 'NCA', variant: 'default' },
      mjc: { label: 'MJC', variant: 'secondary' },
      'waste-manifest': { label: 'Waste', variant: 'outline' },
      complaint: { label: 'Complaint', variant: 'default' },
      recall: { label: 'Recall', variant: 'default' },
      'work-order': { label: 'WO', variant: 'outline' },
    };
    return badges[type] || { label: type, variant: 'outline' };
  };

  return (
    <Card className="mb-6" data-testid="cross-reference-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name={ICONS.LINK} size="md" />
          Cross-References
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Related Records */}
        {relatedRecords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Records</h4>
            <div className="space-y-2">
              {relatedRecords.map((ref) => {
                const badge = getRecordTypeBadge(ref.recordType);
                return (
                  <div
                    key={ref.recordId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="font-mono text-sm">{ref.recordNumber}</span>
                        <Badge variant="outline" className="text-xs">
                          {ref.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{ref.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {ref.procedureReference} | {ref.formNumber}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={ref.link}>
                        <Icon name={ICONS.EXTERNAL_LINK} size="sm" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Procedure References */}
        {procedureRefs.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Procedure References</h4>
            <div className="space-y-2">
              {procedureRefs.map((ref, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Icon name={ICONS.FILE_TEXT} size="sm" className="text-gray-400" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      Procedure {ref.procedure} ({ref.formNumber})
                    </span>
                    <p className="text-xs text-gray-500">{ref.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

