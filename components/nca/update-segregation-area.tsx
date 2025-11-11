'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Edit2, Save, X } from 'lucide-react';
import { updateNCA } from '@/app/actions/nca-actions';
import type { NCAUpdate } from '@/types/database';

export interface UpdateSegregationAreaProps {
  ncaId: string;
  currentSegregationArea: string | null;
  currentSegregationAreaOther: string | null;
  currentRelocationNotes: string | null;
  dispositionComplete: boolean; // Whether disposition is complete
  onUpdate?: () => void; // Callback after successful update
}

/**
 * Component for updating segregation area after disposition
 * Allows Production Manager to update segregation area and add relocation notes
 * after disposition is complete (e.g., "Palletise for supplier")
 */
export function UpdateSegregationArea({
  ncaId,
  currentSegregationArea,
  currentSegregationAreaOther,
  currentRelocationNotes,
  dispositionComplete,
  onUpdate,
}: UpdateSegregationAreaProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [segregationArea, setSegregationArea] = useState<string>(
    currentSegregationArea || ''
  );
  const [segregationAreaOther, setSegregationAreaOther] = useState<string>(
    currentSegregationAreaOther || ''
  );
  const [relocationNotes, setRelocationNotes] = useState<string>(
    currentRelocationNotes || ''
  );

  const handleSave = async () => {
    if (!dispositionComplete) {
      setError('Disposition must be complete before updating segregation area');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updates: NCAUpdate = {
        segregation_area: segregationArea || null,
        segregation_area_other: segregationAreaOther || null,
        relocation_notes: relocationNotes || null,
      };

      const result = await updateNCA(ncaId, updates);

      if (!result.success) {
        setError(result.error || 'Failed to update segregation area');
        return;
      }

      setSuccess(true);
      setIsEditing(false);
      onUpdate?.();

      // Refresh the page to show updated data
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update segregation area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSegregationArea(currentSegregationArea || '');
    setSegregationAreaOther(currentSegregationAreaOther || '');
    setRelocationNotes(currentRelocationNotes || '');
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  };

  if (!dispositionComplete) {
    return null; // Don't show if disposition is not complete
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit2 className="h-5 w-5" />
          Update Segregation Area (After Disposition)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Segregation area updated successfully</AlertDescription>
          </Alert>
        )}

        {!isEditing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Current Segregation Area</Label>
              <p className="text-gray-900 mt-1">
                {currentSegregationArea === 'raw-materials' && 'NC Product Area (Raw Materials)'}
                {currentSegregationArea === 'wip' && 'NC Product Area (WIP)'}
                {currentSegregationArea === 'finished-goods' && 'NC Product Area (Finished Goods)'}
                {currentSegregationArea === 'other' && (currentSegregationAreaOther || 'Other - Description required')}
                {!currentSegregationArea && 'Not specified'}
              </p>
            </div>

            {currentRelocationNotes && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Relocation Notes</Label>
                <p className="text-gray-900 whitespace-pre-wrap mt-1">{currentRelocationNotes}</p>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Update Segregation Area
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Segregation Area</Label>
              <select
                value={segregationArea}
                onChange={(e) => setSegregationArea(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isSaving}
              >
                <option value="">Select segregation area...</option>
                <option value="raw-materials">NC Product Area (Raw Materials)</option>
                <option value="wip">NC Product Area (WIP)</option>
                <option value="finished-goods">NC Product Area (Finished Goods)</option>
                <option value="other">Other - Description required</option>
              </select>
            </div>

            {segregationArea === 'other' && (
              <div className="space-y-2">
                <Label>Specify Other Segregation Area</Label>
                <Input
                  type="text"
                  value={segregationAreaOther}
                  onChange={(e) => setSegregationAreaOther(e.target.value)}
                  placeholder="Enter segregation area description"
                  disabled={isSaving}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Relocation Notes</Label>
              <Textarea
                value={relocationNotes}
                onChange={(e) => setRelocationNotes(e.target.value)}
                placeholder="Document relocation reasons (e.g., 'Palletise for supplier', 'Move to holding area')"
                rows={3}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

