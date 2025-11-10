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
import { CharacterCounter } from '@/components/ui/character-counter';
import { mjcFormSchema, type MJCFormData } from '@/lib/validations/mjc-schema';
import { createMJC, saveDraftMJC } from '@/app/actions/mjc-actions';
import { FileUpload } from '@/components/file-upload';
import { uploadMJCFile, listMJCFiles, deleteMJCFile } from '@/app/actions/file-actions';

/**
 * MJC Form Page Component
 * Production-ready with full validation, TypeScript typing, and BRCGS compliance
 */
export default function NewMJCPage(): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mjcNumber, setMjcNumber] = useState<string | null>(null);
  const [mjcId, setMjcId] = useState<string | null>(null);

  // Initialize react-hook-form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset,
  } = useForm<MJCFormData>({
    resolver: zodResolver(mjcFormSchema) as any,
    mode: 'onChange', // Real-time validation
    defaultValues: {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      job_card_number: 'MJC-2025-00000001',
      raised_by: 'Current User',
      department: 'Auto-populated',
      wo_number: '',
      wo_status: 'Active',
      machine_equipment_id: '',
      maintenance_description: '',
      hygiene_check_1: false,
      hygiene_check_2: false,
      hygiene_check_3: false,
      hygiene_check_4: false,
      hygiene_check_5: false,
      hygiene_check_6: false,
      hygiene_check_7: false,
      hygiene_check_8: false,
      hygiene_check_9: false,
      hygiene_check_10: false,
      production_cleared: false,
    },
  });

  // Watch form fields for conditional rendering
  const machineStatus = watch('machine_status');
  const temporaryRepair = watch('temporary_repair');
  const maintenanceType = watch('maintenance_type');
  const maintenanceDescription = watch('maintenance_description') || '';

  // Watch all 10 hygiene checklist items
  const hygieneCheck1 = watch('hygiene_check_1');
  const hygieneCheck2 = watch('hygiene_check_2');
  const hygieneCheck3 = watch('hygiene_check_3');
  const hygieneCheck4 = watch('hygiene_check_4');
  const hygieneCheck5 = watch('hygiene_check_5');
  const hygieneCheck6 = watch('hygiene_check_6');
  const hygieneCheck7 = watch('hygiene_check_7');
  const hygieneCheck8 = watch('hygiene_check_8');
  const hygieneCheck9 = watch('hygiene_check_9');
  const hygieneCheck10 = watch('hygiene_check_10');

  // Calculate hygiene checklist completion
  const hygieneItemsVerified = useMemo(() => {
    const items = [
      hygieneCheck1,
      hygieneCheck2,
      hygieneCheck3,
      hygieneCheck4,
      hygieneCheck5,
      hygieneCheck6,
      hygieneCheck7,
      hygieneCheck8,
      hygieneCheck9,
      hygieneCheck10,
    ];
    return items.filter(Boolean).length;
  }, [
    hygieneCheck1,
    hygieneCheck2,
    hygieneCheck3,
    hygieneCheck4,
    hygieneCheck5,
    hygieneCheck6,
    hygieneCheck7,
    hygieneCheck8,
    hygieneCheck9,
    hygieneCheck10,
  ]);

  const allHygieneItemsVerified = hygieneItemsVerified === 10;

  // Calculate 14-day due date from today
  const calculateDueDate = useCallback((): string => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toLocaleDateString();
  }, []);

  // Auto-calculate due date when temporary repair is YES
  useMemo(() => {
    if (temporaryRepair === 'yes') {
      setValue('due_date', calculateDueDate());
    } else {
      setValue('due_date', null);
    }
  }, [temporaryRepair, setValue, calculateDueDate]);

  // Form submission handler
  const onSubmit = useCallback(
    async (data: MJCFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        // Call Server Action to submit MJC
        const response = await createMJC(data);

        if (!response.success) {
          setSubmitError(response.error || 'Failed to submit MJC');
          return;
        }

        // Success!
        setSubmitSuccess(true);
        setMjcNumber(response.data?.job_card_number || null);
        setMjcId(response.data?.id || null);
        // Don't reset form - allow file uploads after submission

        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
          setMjcNumber(null);
        }, 5000);
      } catch (error) {
        console.error('Unexpected submission error:', error);
        setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset]
  );

  // Draft save handler
  const onSaveDraft = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current form data
      const formData = watch();

      // Call Server Action to save draft
      const response = await saveDraftMJC(formData);

      if (!response.success) {
        setSubmitError(response.error || 'Failed to save draft');
        return;
      }

      // Success!
      setSubmitSuccess(true);
      setMjcNumber(response.data?.job_card_number || null);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
        setMjcNumber(null);
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
      <h1 data-testid="mjc-form-title" className="text-3xl font-bold mb-8">
        Maintenance Job Card
      </h1>

      {submitSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {mjcNumber
            ? `MJC submitted successfully! Reference: ${mjcNumber}`
            : 'MJC submitted successfully!'}
        </div>
      )}

      {submitError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: Job Card Identification */}
        <Card data-testid="mjc-section-1" className="mb-6">
          <CardHeader>
            <CardTitle>Section 1: Job Card Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input data-testid="mjc-date" type="text" value={new Date().toLocaleDateString()} readOnly />
            </div>
            <div>
              <Label>Time</Label>
              <Input data-testid="mjc-time" type="text" value={new Date().toLocaleTimeString()} readOnly />
            </div>
            <div>
              <Label>Job Card No.</Label>
              <Input data-testid="mjc-number" type="text" value="MJC-2025-00000001" readOnly />
            </div>
            <div>
              <Label>Raised By</Label>
              <Input data-testid="mjc-raised-by" type="text" placeholder="Current User" readOnly />
            </div>
            <div>
              <Label>Department</Label>
              <Input data-testid="mjc-department" type="text" placeholder="Auto-populated" readOnly />
            </div>
            <div>
              <Label>Kangopak WO Number</Label>
              <Input data-testid="mjc-wo-number" type="text" placeholder="Auto-linked" {...register('wo_number')} />
            </div>
            <div>
              <Label>Work Order Status</Label>
              <Input data-testid="mjc-wo-status" type="text" placeholder="Active" readOnly />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Machine/Equipment Identification */}
        <Card data-testid="mjc-section-2" className="mb-6">
          <CardHeader>
            <CardTitle>Section 2: Machine/Equipment Identification *</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Machine/Equipment ID *</Label>
              <Input
                data-testid="machine-equipment-id"
                type="text"
                required
                {...register('machine_equipment_id')}
              />
              {errors.machine_equipment_id && (
                <p className="text-red-600 text-sm mt-1">{errors.machine_equipment_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Maintenance Type & Classification */}
        <Card data-testid="mjc-section-3" className="mb-6">
          <CardHeader>
            <CardTitle>Section 3: Maintenance Type & Classification *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Maintenance Category</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue('maintenance_category', value as 'reactive' | 'planned', {
                    shouldValidate: true,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reactive" id="reactive" data-testid="maintenance-category-reactive" />
                  <Label htmlFor="reactive">Reactive Maintenance</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="planned" id="planned" data-testid="maintenance-category-planned" />
                  <Label htmlFor="planned">Planned Maintenance</Label>
                </div>
              </RadioGroup>
              {errors.maintenance_category && (
                <p className="text-red-600 text-sm mt-2">{errors.maintenance_category.message}</p>
              )}
            </div>
            <div>
              <Label>Maintenance Type</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue(
                    'maintenance_type',
                    value as 'electrical' | 'mechanical' | 'pneumatical' | 'other',
                    { shouldValidate: true }
                  )
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="electrical" id="electrical" data-testid="maintenance-type-electrical" />
                  <Label htmlFor="electrical">Electrical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mechanical" id="mechanical" data-testid="maintenance-type-mechanical" />
                  <Label htmlFor="mechanical">Mechanical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="pneumatical"
                    id="pneumatical"
                    data-testid="maintenance-type-pneumatical"
                  />
                  <Label htmlFor="pneumatical">Pneumatical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other-type" data-testid="maintenance-type-other" />
                  <Label htmlFor="other-type">Other</Label>
                </div>
              </RadioGroup>
              {errors.maintenance_type && (
                <p className="text-red-600 text-sm mt-2">{errors.maintenance_type.message}</p>
              )}

              {/* Conditional field when maintenance type is "other" */}
              {maintenanceType === 'other' && (
                <div className="mt-4 border-l-4 border-blue-500 pl-4">
                  <Label>Please specify maintenance type *</Label>
                  <Input type="text" {...register('maintenance_type_other')} />
                  {errors.maintenance_type_other && (
                    <p className="text-red-600 text-sm mt-1">{errors.maintenance_type_other.message}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Machine Status & Urgency (CRITICAL) */}
        <Card data-testid="mjc-section-4" className="mb-6">
          <CardHeader>
            <CardTitle className="text-critical">Section 4: Machine Status & Urgency (CRITICAL) *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Machine Status</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue('machine_status', value as 'down' | 'operational', {
                    shouldValidate: true,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="down" id="machine-down" data-testid="machine-status-down" />
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
                <p className="text-red-600 text-sm mt-2">{errors.machine_status.message}</p>
              )}
            </div>
            <div>
              <Label>Urgency Level</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue('urgency_level', value as 'critical' | 'high' | 'medium' | 'low', {
                    shouldValidate: true,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="critical" id="critical" data-testid="urgency-critical" />
                  <Label htmlFor="critical">Critical (&lt;1hr)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" data-testid="urgency-high" />
                  <Label htmlFor="high">High (&lt;4hrs)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" data-testid="urgency-medium" />
                  <Label htmlFor="medium">Medium (&lt;24hrs)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" data-testid="urgency-low" />
                  <Label htmlFor="low">Low (&gt;24hrs)</Label>
                </div>
              </RadioGroup>
              {errors.urgency_level && (
                <p className="text-red-600 text-sm mt-2">{errors.urgency_level.message}</p>
              )}
            </div>
            <div>
              <Label>Machine Down Time (auto-calculated)</Label>
              <Input
                data-testid="machine-down-time"
                type="text"
                placeholder="00:00:00"
                readOnly
                {...register('machine_down_time')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Temporary Repair Status */}
        <Card data-testid="mjc-section-5" className="mb-6">
          <CardHeader>
            <CardTitle>Section 5: Temporary Repair Status *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Is this a temporary repair?</Label>
              <RadioGroup
                onValueChange={(value) =>
                  setValue('temporary_repair', value as 'yes' | 'no', {
                    shouldValidate: true,
                  })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="temp-yes" data-testid="temporary-repair-yes" />
                  <Label htmlFor="temp-yes">YES (14-day follow-up required)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="temp-no" data-testid="temporary-repair-no" />
                  <Label htmlFor="temp-no">NO (Standard closure)</Label>
                </div>
              </RadioGroup>
              {errors.temporary_repair && (
                <p className="text-red-600 text-sm mt-2">{errors.temporary_repair.message}</p>
              )}
            </div>
            <div>
              <Label>Follow-up Due Date (auto-calculated if temporary)</Label>
              <Input
                data-testid="temporary-repair-due-date"
                type="text"
                value={temporaryRepair === 'yes' ? calculateDueDate() : ''}
                readOnly
                placeholder="N/A - Standard closure"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Description of Maintenance Required */}
        <Card data-testid="mjc-section-6" className="mb-6">
          <CardHeader>
            <CardTitle>Section 6: Description of Maintenance Required *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Description (minimum 100 characters)</Label>
              <Textarea
                data-testid="maintenance-description"
                rows={5}
                {...register('maintenance_description')}
              />
              <CharacterCounter
                current={maintenanceDescription.length}
                minimum={100}
                maximum={2000}
                testId="maintenance-description-char-count"
              />
              {errors.maintenance_description && (
                <p className="text-red-600 text-sm mt-1">{errors.maintenance_description.message}</p>
              )}
            </div>
            <FileUpload
              entityId={mjcId}
              uploadType="mjc"
              onUpload={uploadMJCFile}
              onDelete={deleteMJCFile}
              onList={listMJCFiles}
              label="Maintenance Description Attachments"
              allowedTypes={['PDF', 'Images', 'Word', 'Text']}
              maxSizeMB={10}
            />
          </CardContent>
        </Card>

        {/* Section 7: Maintenance Performed */}
        <Card data-testid="mjc-section-7" className="mb-6">
          <CardHeader>
            <CardTitle>Section 7: Maintenance Performed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Maintenance Work Performed</Label>
              <Textarea data-testid="maintenance-performed" rows={5} {...register('maintenance_performed')} />
            </div>
            <div>
              <Label>Maintenance Technician Signature</Label>
              <Input
                data-testid="maintenance-technician-signature"
                type="text"
                placeholder="Sign here"
                {...register('maintenance_technician_signature')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Additional Comments */}
        <Card data-testid="mjc-section-8" className="mb-6">
          <CardHeader>
            <CardTitle>Section 8: Additional Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Additional Observations and Recommendations</Label>
              <Textarea data-testid="additional-comments" rows={4} {...register('additional_comments')} />
            </div>
          </CardContent>
        </Card>

        {/* Section 9: Post Hygiene Clearance Record (CRITICAL) */}
        <Card data-testid="mjc-section-9" className="mb-6">
          <CardHeader>
            <CardTitle className="text-critical">
              Section 9: Post Hygiene Clearance Record (CRITICAL FOR BRCGS)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              All 10 items must be verified ✅ before granting clearance. Production cannot resume with any ❌
              items.
            </p>

            {/* Hygiene checklist progress indicator */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="font-semibold text-blue-800">
                {hygieneItemsVerified}/10 items verified
                {allHygieneItemsVerified && ' ✅ All items verified!'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-1"
                data-testid="hygiene-check-1"
                onCheckedChange={(checked) => setValue('hygiene_check_1', Boolean(checked))}
              />
              <Label htmlFor="hygiene-1" className="font-normal">
                1. All Excess Grease & Oil Removed
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-2"
                data-testid="hygiene-check-2"
                onCheckedChange={(checked) => setValue('hygiene_check_2', Boolean(checked))}
              />
              <Label htmlFor="hygiene-2" className="font-normal">
                2. All Consumables Removed
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-3"
                data-testid="hygiene-check-3"
                onCheckedChange={(checked) => setValue('hygiene_check_3', Boolean(checked))}
              />
              <Label htmlFor="hygiene-3" className="font-normal">
                3. All Tools & Equipment Removed
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-4"
                data-testid="hygiene-check-4"
                onCheckedChange={(checked) => setValue('hygiene_check_4', Boolean(checked))}
              />
              <Label htmlFor="hygiene-4" className="font-normal">
                4. All Safety Mechanisms in Good Working Order
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-5"
                data-testid="hygiene-check-5"
                onCheckedChange={(checked) => setValue('hygiene_check_5', Boolean(checked))}
              />
              <Label htmlFor="hygiene-5" className="font-normal">
                5. All Product Safety Equipment Reinstated
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-6"
                data-testid="hygiene-check-6"
                onCheckedChange={(checked) => setValue('hygiene_check_6', Boolean(checked))}
              />
              <Label htmlFor="hygiene-6" className="font-normal">
                6. Area Inspected and Cleared of Debris
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-7"
                data-testid="hygiene-check-7"
                onCheckedChange={(checked) => setValue('hygiene_check_7', Boolean(checked))}
              />
              <Label htmlFor="hygiene-7" className="font-normal">
                7. Verification that No Contamination Risk Exists
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-8"
                data-testid="hygiene-check-8"
                onCheckedChange={(checked) => setValue('hygiene_check_8', Boolean(checked))}
              />
              <Label htmlFor="hygiene-8" className="font-normal">
                8. Inspection for Potential Sources of Foreign Bodies
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-9"
                data-testid="hygiene-check-9"
                onCheckedChange={(checked) => setValue('hygiene_check_9', Boolean(checked))}
              />
              <Label htmlFor="hygiene-9" className="font-normal">
                9. Inspection for Damage or Wear to Production Surfaces
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hygiene-10"
                data-testid="hygiene-check-10"
                onCheckedChange={(checked) => setValue('hygiene_check_10', Boolean(checked))}
              />
              <Label htmlFor="hygiene-10" className="font-normal">
                10. Area Prepared and Ready for Production Resumption
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Section 10: Post Hygiene Clearance Signature */}
        <Card data-testid="mjc-section-10" className="mb-6">
          <CardHeader>
            <CardTitle>Section 10: Post Hygiene Clearance Signature (REQUIRED BEFORE PRODUCTION RESUME)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warning message if not all items verified */}
            {!allHygieneItemsVerified && (
              <div className="bg-yellow-50 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4">
                <p className="font-semibold">⚠️ Warning</p>
                <p>All 10 hygiene items must be verified before granting clearance</p>
              </div>
            )}

            <div>
              <Label>QA/Supervisor Name</Label>
              <Input
                data-testid="clearance-qa-supervisor"
                type="text"
                {...register('clearance_qa_supervisor')}
              />
              {errors.clearance_qa_supervisor && (
                <p className="text-red-600 text-sm mt-1">{errors.clearance_qa_supervisor.message}</p>
              )}
            </div>
            <div>
              <Label>Digital Signature</Label>
              <Input
                data-testid="clearance-signature"
                type="text"
                placeholder="Sign here"
                {...register('clearance_signature')}
              />
              {errors.clearance_signature && (
                <p className="text-red-600 text-sm mt-1">{errors.clearance_signature.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded">
              <Checkbox
                id="production-cleared"
                data-testid="production-cleared"
                disabled={!allHygieneItemsVerified}
                onCheckedChange={(checked) => setValue('production_cleared', Boolean(checked))}
              />
              <Label
                htmlFor="production-cleared"
                className={`font-semibold ${
                  allHygieneItemsVerified ? 'text-green-700' : 'text-gray-400'
                }`}
              >
                ✅ PRODUCTION CLEARED TO RESUME
              </Label>
            </div>
            {errors.production_cleared && (
              <p className="text-red-600 text-sm mt-1">{errors.production_cleared.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Section 11: Job Card Status & Closure */}
        <Card data-testid="mjc-section-11" className="mb-6">
          <CardHeader>
            <CardTitle>Section 11: Job Card Status & Closure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Job Card Status</Label>
              <Input data-testid="job-card-status" type="text" value="Open" readOnly />
            </div>
            <div>
              <Label>Follow-up Job Card Required (if temporary repair)</Label>
              <Input
                data-testid="follow-up-job-card"
                type="text"
                placeholder="Auto-generated if temporary"
                {...register('follow_up_job_card')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Action Buttons */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button data-testid="btn-cancel" variant="outline" type="button" onClick={() => reset()}>
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
          <Button data-testid="btn-submit" variant="default" type="submit" disabled={isSubmitting || !isValid}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
