/**
 * Waste Manifest Link Component
 * Displays linked waste manifest in NCA detail view
 * PRD Enhancement: Waste Manifest (4.10F1) integration
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, ExternalLink } from 'lucide-react';
import { getWasteManifestByNCA } from '@/app/actions/waste-actions';
import type { WasteManifest } from '@/app/actions/waste-actions';

interface WasteManifestLinkProps {
  ncaId: string;
}

export function WasteManifestLink({ ncaId }: WasteManifestLinkProps) {
  const [manifest, setManifest] = useState<WasteManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchManifest() {
      try {
        setLoading(true);
        const result = await getWasteManifestByNCA(ncaId);
        if (result.success && result.data) {
          setManifest(result.data);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waste manifest');
      } finally {
        setLoading(false);
      }
    }

    fetchManifest();
  }, [ncaId]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Waste Manifest (Form 4.10F1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading waste manifest...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !manifest) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Waste Manifest (Form 4.10F1)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">
            No waste manifest linked to this NCA
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6" data-testid="waste-manifest-link">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Waste Manifest (Form 4.10F1)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Manifest Number</label>
            <p className="text-gray-900 font-mono">{manifest.manifest_number}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Waste Type</label>
            <Badge variant="outline" className="ml-2">
              {manifest.waste_type.replace('-', ' ')}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Waste Description</label>
            <p className="text-gray-900">{manifest.waste_description}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Quantity</label>
            <p className="text-gray-900">
              {manifest.physical_quantity} {manifest.quantity_unit || 'kg'}
            </p>
          </div>
          {manifest.risk_level && (
            <div>
              <label className="text-sm font-medium text-gray-700">Risk Level</label>
              <Badge
                variant={
                  manifest.risk_level === 'high'
                    ? 'destructive'
                    : manifest.risk_level === 'medium'
                    ? 'default'
                    : 'outline'
                }
                className="ml-2"
              >
                {manifest.risk_level.toUpperCase()}
              </Badge>
            </div>
          )}
          {manifest.service_provider && (
            <div>
              <label className="text-sm font-medium text-gray-700">Service Provider</label>
              <p className="text-gray-900">{manifest.service_provider}</p>
            </div>
          )}
          {manifest.disposal_date && (
            <div>
              <label className="text-sm font-medium text-gray-700">Disposal Date</label>
              <p className="text-gray-900">
                {new Date(manifest.disposal_date).toLocaleDateString('en-GB')}
              </p>
            </div>
          )}
        </div>
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/waste/${manifest.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Manifest
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

