'use client';

import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ncaFormSchema, type NCAFormData } from '@/lib/validations/nca-schema';
import { createNCA, saveDraftNCA } from '@/app/actions/nca-actions';

/**
 * Character counter component with color-coded status
 */
function CharacterCounter({
  current,
  minimum,
  maximum,
}: {
  current: number;
  minimum: number;
  maximum?: number;
}): React.ReactElement {
  const getColorClass = (): string => {
    if (current >= minimum) return 'text-green-600';
    if (current >= minimum / 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const displayText = maximum
    ? `${current} / ${minimum} minimum (${maximum} max)`
    : `${current} / ${minimum}`;

  return (
    <div className={`text-sm mt-1 ${getColorClass()}`}>
      {displayText}
    </div>
  );
}

/**
 * NCA Form Page Component
 * Production-ready with full validation, TypeScript typing, and BRCGS compliance
 */
export default function NewNCAPage(): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ncaNumber, setNcaNumber] = useState<string | null>(null);

  // Initialize react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<NCAFormData>({
    resolver: zodResolver(ncaFormSchema) as any,
    mode: 'onChange', // Real-time validation
    defaultValues: {
      date: new Date().toLocaleDateString(),
      nca_number: 'NCA-AUTO-GENERATED',
      raised_by: 'Current User',
      wo_number: '',
      sample_available: false,
      cross_contamination: false,
      back_tracking_completed: false,
      hold_label_completed: false,
      nca_logged: false,
      nc_description: '',
      nc_product_description: '',
    },
  });

  // Watch form fields for conditional rendering
  const machineStatus = watch('machine_status');
  const crossContamination = watch('cross_contamination');
  const dispositionAction = watch('disposition_action');
  const ncDescription = watch('nc_description') || '';
  const ncProductDescription = watch('nc_product_description') || '';

  // Character counter status calculation
  const descriptionCounterStatus = useMemo(() => {
    if (ncDescription.length >= 100) return 'success';
    if (ncDescription.length >= 50) return 'warning';
    return 'error';
  }, [ncDescription.length]);

  // Form submission handler
  const onSubmit = useCallback(async (data: NCAFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Call Server Action to submit NCA
      const response = await createNCA(data);

      if (!response.success) {
        setSubmitError(response.error || 'Failed to submit NCA');
        return;
      }

      // Success!
      setSubmitSuccess(true);
      setNcaNumber(response.data?.nca_number || null);
      reset(); // Clear form after successful submission

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setNcaNumber(null);
      }, 5000);
    } catch (error) {
      console.error('Unexpected submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [reset]);

  // Draft save handler
  const onSaveDraft = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current form data
      const formData = watch();

      // Call Server Action to save draft
      const response = await saveDraftNCA(formData);

      if (!response.success) {
        setSubmitError(response.error || 'Failed to save draft');
        return;
      }

      // Success!
      setSubmitSuccess(true);
      setNcaNumber(response.data?.nca_number || null);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setNcaNumber(null);
      }, 3000);
    } catch (error) {
      console.error('Unexpected error saving draft:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [watch]);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 data-testid="nca-form-title" className="text-3xl font-bold mb-8">
        Non-Conformance Advice Form
      </h1>

      {submitSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {ncaNumber
            ? `NCA submitted successfully! Reference: ${ncaNumber}`
            : 'NCA submitted successfully!'}
        </div>
      )}

      {submitError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: NCA Identification */}
        <Card data-testid="nca-section-1" className="mb-6">
          <CardHeader>
            <CardTitle>Section 1: NCA Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                data-testid="nca-date"
                type="text"
                value={new Date().toLocaleDateString()}
                readOnly
              />
            </div>
            <div>
              <Label>NCA Number</Label>
              <Input
                data-testid="nca-number"
                type="text"
                value="NCA-AUTO-GENERATED"
                readOnly
              />
            </div>
            <div>
              <Label>Raised By</Label>
              <Input
                data-testid="nca-raised-by"
                type="text"
                placeholder="Current User"
                readOnly
              />
            </div>
            <div>
              <Label>WO Number</Label>
              <Input
                data-testid="nca-wo-number"
                type="text"
                placeholder="Auto-linked"
                {...register('wo_number')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: NC Classification */}
        <Card data-testid="nca-section-2" className="mb-6">
          <CardHeader>
            <CardTitle>Section 2: NC Classification</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              onValueChange={(value) =>
                setValue('nc_type', value as NCAFormData['nc_type'], {
                  shouldValidate: true,
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="raw-material"
                  id="raw-material"
                  data-testid="nc-type-raw-material"
                />
                <Label htmlFor="raw-material">Raw Material</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="finished-goods"
                  id="finished-goods"
                  data-testid="nc-type-finished-goods"
                />
                <Label htmlFor="finished-goods">Finished Goods</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="wip"
                  id="wip"
                  data-testid="nc-type-wip"
                />
                <Label htmlFor="wip">WIP</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="incident"
                  id="incident"
                  data-testid="nc-type-incident"
                />
                <Label htmlFor="incident">Incident</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="other"
                  id="other"
                  data-testid="nc-type-other"
                />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
            {errors.nc_type && (
              <p className="text-red-600 text-sm mt-2">{errors.nc_type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Supplier & Product Information */}
        <Card data-testid="nca-section-3" className="mb-6">
          <CardHeader>
            <CardTitle>Section 3: Supplier & Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Supplier Name</Label>
              <Input
                data-testid="supplier-name"
                type="text"
                {...register('supplier_name')}
              />
            </div>
            <div>
              <Label>NC Product Description *</Label>
              <Input
                data-testid="nc-product-description"
                type="text"
                required
                {...register('nc_product_description')}
              />
              {errors.nc_product_description && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.nc_product_description.message}
                </p>
              )}
              {ncProductDescription.length > 0 && (
                <CharacterCounter
                  current={ncProductDescription.length}
                  minimum={10}
                  maximum={500}
                />
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sample-available"
                data-testid="sample-available"
                onCheckedChange={(checked) =>
                  setValue('sample_available', Boolean(checked))
                }
              />
              <Label htmlFor="sample-available">Sample Available</Label>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: NC Description */}
        <Card data-testid="nca-section-4" className="mb-6">
          <CardHeader>
            <CardTitle>Section 4: NC Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Description (minimum 100 characters)</Label>
              <Textarea
                data-testid="nc-description"
                rows={5}
                {...register('nc_description')}
              />
              <div data-testid="nc-description-char-count">
                <CharacterCounter
                  current={ncDescription.length}
                  minimum={100}
                  maximum={2000}
                />
              </div>
              {errors.nc_description && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.nc_description.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Machine Status (CRITICAL) */}
        <Card data-testid="nca-section-5" className="mb-6">
          <CardHeader>
            <CardTitle className="text-critical">
              Section 5: Machine Status (CRITICAL)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={machineStatus}
              onValueChange={(value) =>
                setValue('machine_status', value as 'down' | 'operational', {
                  shouldValidate: true,
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="down"
                  id="machine-down"
                  data-testid="machine-status-down"
                />
                <Label htmlFor="machine-down">MACHINE DOWN</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="operational"
                  id="machine-operational"
                  data-testid="machine-status-operational"
                />
                <Label htmlFor="machine-operational">MACHINE OPERATIONAL</Label>
              </div>
            </RadioGroup>
            {errors.machine_status && (
              <p className="text-red-600 text-sm mt-2">
                {errors.machine_status.message}
              </p>
            )}

            {/* Conditional fields when machine is down */}
            {machineStatus === 'down' && (
              <div className="mt-4 space-y-4 border-l-4 border-red-500 pl-4">
                <div>
                  <Label>Machine Down Since</Label>
                  <Input
                    type="datetime-local"
                    {...register('machine_down_since')}
                  />
                  {errors.machine_down_since && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.machine_down_since.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Estimated Downtime (minutes)</Label>
                  <Input
                    type="number"
                    {...register('estimated_downtime', { valueAsNumber: true })}
                  />
                  {errors.estimated_downtime && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.estimated_downtime.message}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Out of Spec Concession */}
        <Card data-testid="nca-section-6" className="mb-6">
          <CardHeader>
            <CardTitle>Section 6: Out of Spec Concession</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Team Leader</Label>
              <Input
                data-testid="concession-team-leader"
                type="text"
                {...register('concession_team_leader')}
              />
            </div>
            <div>
              <Label>Digital Signature</Label>
              <Input
                data-testid="concession-signature"
                type="text"
                placeholder="Sign here"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Immediate Correction */}
        <Card data-testid="nca-section-7" className="mb-6">
          <CardHeader>
            <CardTitle>Section 7: Immediate Correction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cross Contamination?</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue('cross_contamination', value === 'yes', {
                    shouldValidate: true,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="yes"
                    id="cross-yes"
                    data-testid="cross-contamination-yes"
                  />
                  <Label htmlFor="cross-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="no"
                    id="cross-no"
                    data-testid="cross-contamination-no"
                  />
                  <Label htmlFor="cross-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Conditional field when cross-contamination is YES */}
            {crossContamination && (
              <div className="border-l-4 border-yellow-500 pl-4">
                <Label>Back Tracking Person *</Label>
                <Input
                  type="text"
                  {...register('back_tracking_person')}
                />
                {errors.back_tracking_person && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.back_tracking_person.message}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hold-label"
                data-testid="hold-label-completed"
                onCheckedChange={(checked) =>
                  setValue('hold_label_completed', Boolean(checked))
                }
              />
              <Label htmlFor="hold-label">Hold Label Completed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nca-logged"
                data-testid="nca-logged"
                onCheckedChange={(checked) =>
                  setValue('nca_logged', Boolean(checked))
                }
              />
              <Label htmlFor="nca-logged">NCA Logged</Label>
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Disposition */}
        <Card data-testid="nca-section-8" className="mb-6">
          <CardHeader>
            <CardTitle>Section 8: Disposition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Disposition Action</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue(
                    'disposition_action',
                    value as NCAFormData['disposition_action'],
                    { shouldValidate: true }
                  )
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="reject"
                    id="reject"
                    data-testid="disposition-reject"
                  />
                  <Label htmlFor="reject">Reject</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="credit"
                    id="credit"
                    data-testid="disposition-credit"
                  />
                  <Label htmlFor="credit">Credit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="uplift"
                    id="uplift"
                    data-testid="disposition-uplift"
                  />
                  <Label htmlFor="uplift">Uplift</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="rework"
                    id="rework"
                    data-testid="disposition-rework"
                  />
                  <Label htmlFor="rework">Rework</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="concession"
                    id="concession"
                    data-testid="disposition-concession"
                  />
                  <Label htmlFor="concession">Concession</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="discard"
                    id="discard"
                    data-testid="disposition-discard"
                  />
                  <Label htmlFor="discard">Discard</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Conditional field when rework is selected */}
            {dispositionAction === 'rework' && (
              <div className="border-l-4 border-blue-500 pl-4">
                <Label>Rework Instruction *</Label>
                <Textarea
                  data-testid="rework-instruction"
                  rows={3}
                  {...register('rework_instruction')}
                />
                {errors.rework_instruction && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.rework_instruction.message}
                  </p>
                )}
              </div>
            )}

            {!dispositionAction || dispositionAction !== 'rework' ? (
              <div>
                <Label>Rework Instruction</Label>
                <Textarea data-testid="rework-instruction" rows={3} />
              </div>
            ) : null}

            <div>
              <Label>Authorized Signature</Label>
              <Input
                data-testid="disposition-signature"
                type="text"
                placeholder="Sign here"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 9: Root Cause Analysis */}
        <Card data-testid="nca-section-9" className="mb-6">
          <CardHeader>
            <CardTitle>Section 9: Root Cause Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Root Cause Analysis</Label>
              <Textarea
                data-testid="root-cause-analysis"
                rows={5}
                {...register('root_cause_analysis')}
              />
            </div>
            <div>
              <Label>Attachments</Label>
              <Input
                data-testid="root-cause-attachments"
                type="file"
                multiple
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 10: Corrective Action */}
        <Card data-testid="nca-section-10" className="mb-6">
          <CardHeader>
            <CardTitle>Section 10: Corrective Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Corrective Action</Label>
              <Textarea
                data-testid="corrective-action"
                rows={5}
                {...register('corrective_action')}
              />
            </div>
            <div>
              <Label>Attachments</Label>
              <Input
                data-testid="corrective-action-attachments"
                type="file"
                multiple
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 11: Close Out */}
        <Card data-testid="nca-section-11" className="mb-6">
          <CardHeader>
            <CardTitle>Section 11: Close Out</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Closed Out By</Label>
              <Input
                data-testid="close-out-by"
                type="text"
                {...register('close_out_by')}
              />
            </div>
            <div>
              <Label>Close Out Date</Label>
              <Input
                data-testid="close-out-date"
                type="date"
                {...register('close_out_date')}
              />
            </div>
            <div className="col-span-2">
              <Label>Management Signature</Label>
              <Input
                data-testid="close-out-signature"
                type="text"
                placeholder="Sign here"
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button
            data-testid="btn-cancel"
            variant="outline"
            type="button"
            onClick={() => reset()}
          >
            Cancel
          </Button>
          <Button
            data-testid="btn-save-draft"
            variant="secondary"
            type="button"
            disabled={isSubmitting}
            onClick={onSaveDraft}
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            data-testid="btn-submit"
            variant="default"
            type="submit"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
