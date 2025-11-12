/**
 * MJC Link Component
 * Displays linked MJCs and allows creating/linking MJCs from NCAs
 * PRD Enhancement: Maintenance Job Card integration
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Wrench, ExternalLink, Plus } from 'lucide-react';
import { getLinkedMJCs, createMJCFromNCA, linkMJCToNCA } from '@/app/actions/mjc-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MJCLinkProps {
  ncaId: string;
  rootCauseAnalysis?: string | null;
  machineStatus?: 'down' | 'operational';
}

/**
 * Detect if root cause indicates equipment issue
 */
function isEquipmentRelated(rootCause: string | null | undefined): boolean {
  if (!rootCause) return false;
  const equipmentKeywords = [
    'machine',
    'equipment',
    'tool',
    'mechanical',
    'pneumatic',
    'electrical',
    'sensor',
    'calibration',
    'breakdown',
    'failure',
    'malfunction',
  ];
  const lowerCause = rootCause.toLowerCase();
  return equipmentKeywords.some((keyword) => lowerCause.includes(keyword));
}

export function MJCLink({ ncaId, rootCauseAnalysis, machineStatus }: MJCLinkProps) {
  const [mjcs, setMjcs] = useState<Array<{ id: string; job_card_number: string; status: string; description_required: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingMjcId, setLinkingMjcId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const equipmentRelated = isEquipmentRelated(rootCauseAnalysis);
  const machineDown = machineStatus === 'down';

  useEffect(() => {
    async function fetchMJCs() {
      try {
        setLoading(true);
        const result = await getLinkedMJCs(ncaId);
        if (result.success && result.data) {
          setMjcs(result.data);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load linked MJCs');
      } finally {
        setLoading(false);
      }
    }

    fetchMJCs();
  }, [ncaId]);

  const handleCreateMJC = async () => {
    try {
      setIsCreating(true);
      const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth
      const result = await createMJCFromNCA(ncaId, {}, userId);
      
      if (result.success) {
        setShowCreateDialog(false);
        // Refresh MJC list
        const refreshResult = await getLinkedMJCs(ncaId);
        if (refreshResult.success && refreshResult.data) {
          setMjcs(refreshResult.data);
        }
      } else {
        setError(result.error || 'Failed to create MJC');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create MJC');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLinkMJC = async () => {
    if (!linkingMjcId.trim()) {
      setError('Please enter an MJC ID');
      return;
    }

    try {
      setIsCreating(true);
      const result = await linkMJCToNCA(ncaId, linkingMjcId.trim());
      
      if (result.success) {
        setShowLinkDialog(false);
        setLinkingMjcId('');
        // Refresh MJC list
        const refreshResult = await getLinkedMJCs(ncaId);
        if (refreshResult.success && refreshResult.data) {
          setMjcs(refreshResult.data);
        }
      } else {
        setError(result.error || 'Failed to link MJC');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link MJC');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Linked Maintenance Job Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading linked MJCs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6" data-testid="mjc-link">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Linked Maintenance Job Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {/* Show prompt if equipment-related but no MJC linked */}
        {equipmentRelated && mjcs.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Equipment Issue Detected:</strong> The root cause analysis indicates an
              equipment-related issue. Consider creating a Maintenance Job Card.
            </p>
            <div className="flex gap-2">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create MJC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Maintenance Job Card from NCA</DialogTitle>
                    <DialogDescription>
                      This will create a new Maintenance Job Card linked to this NCA. The MJC
                      will be pre-populated with information from this NCA.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-600">
                      Click &quot;Create&quot; to generate a new MJC, or cancel to link an existing
                      one.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateMJC} disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create MJC'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Link Existing MJC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Existing Maintenance Job Card</DialogTitle>
                    <DialogDescription>
                      Enter the MJC ID or job card number to link to this NCA.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="mjc-id">MJC ID</Label>
                      <Input
                        id="mjc-id"
                        value={linkingMjcId}
                        onChange={(e) => setLinkingMjcId(e.target.value)}
                        placeholder="Enter MJC UUID or job card number"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleLinkMJC} disabled={isCreating}>
                        {isCreating ? 'Linking...' : 'Link MJC'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Display linked MJCs */}
        {mjcs.length > 0 && (
          <div className="space-y-3">
            {mjcs.map((mjc) => (
              <div
                key={mjc.id}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold">{mjc.job_card_number}</span>
                    <Badge variant="outline">{mjc.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {mjc.description_required}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/mjc/${mjc.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {mjcs.length === 0 && !equipmentRelated && (
          <p className="text-sm text-gray-500 italic">No maintenance job cards linked</p>
        )}
      </CardContent>
    </Card>
  );
}

