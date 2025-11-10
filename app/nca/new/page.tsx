'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { FileUpload } from '@/components/file-upload';
import { uploadNCAFile, listNCAFiles, deleteNCAFile } from '@/app/actions/file-actions';

// AI Integration imports
import { AIEnhancedTextarea } from '@/components/ai-enhanced-textarea';
import { AIAssistantModal } from '@/components/ai-assistant-modal';
import { QualityGateModal } from '@/components/quality-gate-modal';
import { useAIQuality } from '@/hooks/useAIQuality';
import type { Suggestion } from '@/lib/ai/types';

// Work Order Service imports
import { createClient } from '@supabase/supabase-js';
import { createWorkOrderService } from '@/lib/services/work-order-service';
import type { WorkOrder } from '@/lib/types/work-order';

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
 * NCA Form Page Component - AI Integrated
 * Production-ready with AI quality checks and suggestions
 */
export default function NewNCAPage(): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ncaNumber, setNcaNumber] = useState<string | null>(null);
  const [ncaId, setNcaId] = useState<string | null>(null);
  const [isConfidential, setIsConfidential] = useState(false);

  // AI Integration State
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showQualityGate, setShowQualityGate] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [currentFieldForSuggestion, setCurrentFieldForSuggestion] = useState<string | null>(null);

  // Work Order Auto-Link State
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  const [workOrderLoading, setWorkOrderLoading] = useState<boolean>(true);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);

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
    mode: 'onChange',
    defaultValues: {
      date: new Date().toLocaleDateString(),
      nca_number: 'NCA-AUTO-GENERATED',
      raised_by: 'Current User',
      wo_number: '',
      wo_id: null,
      sample_available: false,
      cross_contamination: false,
      back_tracking_completed: false,
      hold_label_completed: false,
      nca_logged: false,
      nc_description: '',
      nc_product_description: '',
    },
  });

  // Fetch active work order on component mount
  useEffect(() => {
    const fetchActiveWorkOrder = async (): Promise<void> => {
      try {
        setWorkOrderLoading(true);
        setWorkOrderError(null);

        // Create Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Create work order service with dependency injection
        const workOrderService = createWorkOrderService(supabase);

        // TODO: Get real user ID from auth context
        const userId = 'current-user-id';

        // Fetch active work order
        const workOrder = await workOrderService.getActiveWorkOrder(userId);

        if (workOrder) {
          setActiveWorkOrder(workOrder);
          // Auto-populate work order fields
          setValue('wo_number', workOrder.wo_number);
          setValue('wo_id', workOrder.id);
        } else {
          setWorkOrderError('No active work order found');
        }
      } catch (error) {
        console.error('Failed to fetch active work order:', error);
        setWorkOrderError(
          error instanceof Error ? error.message : 'Failed to load work order'
        );
      } finally {
        setWorkOrderLoading(false);
      }
    };

    fetchActiveWorkOrder();
  }, [setValue]);

  // Initialize AI Quality Hook
  const aiQuality = useAIQuality({
    formType: 'nca',
    userId: 'current-user-id', // TODO: Get from auth
    debounceMs: 3000, // Check quality 3 seconds after user stops typing
  });

  // Watch form fields
  const machineStatus = watch('machine_status');
  const crossContamination = watch('cross_contamination');
  const dispositionAction = watch('disposition_action');
  const ncDescription = watch('nc_description') || '';
  const ncProductDescription = watch('nc_product_description') || '';
  const rootCauseAnalysis = watch('root_cause_analysis') || '';
  const correctiveAction = watch('corrective_action') || '';

  // Trigger inline quality checks when fields change
  const handleFieldChange = useCallback(
    (fieldName: string, value: string) => {
      setValue(fieldName as any, value);

      // Trigger AI quality check for critical fields
      if (['nc_description', 'root_cause_analysis', 'corrective_action'].includes(fieldName)) {
        const formData = watch();
        aiQuality.checkQualityInline({
          ...formData,
          [fieldName]: value,
        } as any);
      }
    },
    [setValue, watch, aiQuality]
  );

  // Handle AI suggestion request
  const handleAIHelp = useCallback(
    async (fieldName: string) => {
      setCurrentFieldForSuggestion(fieldName);
      setShowSuggestionModal(true);

      const formData = watch();
      await aiQuality.generateSuggestion(formData as any);

      if (aiQuality.suggestions) {
        setCurrentSuggestion(aiQuality.suggestions);
      }
    },
    [watch, aiQuality]
  );

  // Handle accepting AI suggestion
  const handleAcceptSuggestion = useCallback(
    (suggestionText: string) => {
      if (currentFieldForSuggestion && currentSuggestion) {
        setValue(currentFieldForSuggestion as any, suggestionText);

        // Record suggestion acceptance
        aiQuality.acceptSuggestion(
          currentSuggestion,
          currentFieldForSuggestion,
          suggestionText
        );
      }

      setShowSuggestionModal(false);
      setCurrentSuggestion(null);
      setCurrentFieldForSuggestion(null);
    },
    [currentFieldForSuggestion, currentSuggestion, setValue, aiQuality]
  );

  // Handle rejecting AI suggestion
  const handleRejectSuggestion = useCallback(() => {
    setShowSuggestionModal(false);
    setCurrentSuggestion(null);
    setCurrentFieldForSuggestion(null);
  }, []);

  // Form submission handler with AI quality gate
  const onSubmit = useCallback(
    async (data: NCAFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        // Step 1: Run AI validation (quality gate)
        const validation = await aiQuality.validateBeforeSubmit(data as any, isConfidential);

        if (!validation.success) {
          setSubmitError(validation.error || 'Validation failed');
          setIsSubmitting(false);
          return;
        }

        // Step 2: Check if quality gate passed
        if (
          validation.data &&
          !validation.data.ready_for_submission &&
          !isConfidential
        ) {
          // Quality score < 75 - show quality gate modal
          setShowQualityGate(true);
          setIsSubmitting(false);
          return;
        }

        // Step 3: Quality passed or confidential - proceed with submission
        const response = await createNCA(data);

        if (!response.success) {
          setSubmitError(response.error || 'Failed to submit NCA');
          return;
        }

        // Success!
        setSubmitSuccess(true);
        setNcaNumber(response.data?.nca_number || null);
        setNcaId(response.data?.id || null);

        // Reset success message after 5 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
          setNcaNumber(null);
        }, 5000);
      } catch (error) {
        console.error('Unexpected submission error:', error);
        setSubmitError(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [aiQuality, isConfidential]
  );

  // Handle quality gate "Go Back" button
  const handleQualityGateGoBack = useCallback(() => {
    setShowQualityGate(false);
  }, []);

  // Handle quality gate "Submit Anyway" (supervisor override)
  const handleQualityGateSubmitAnyway = useCallback(async () => {
    // TODO: Implement supervisor override logic
    // For now, just close modal and allow submission
    setShowQualityGate(false);

    const data = watch();
    const response = await createNCA(data);

    if (!response.success) {
      setSubmitError(response.error || 'Failed to submit NCA');
      return;
    }

    setSubmitSuccess(true);
    setNcaNumber(response.data?.nca_number || null);
    setNcaId(response.data?.id || null);
  }, [watch]);

  // Draft save handler
  const onSaveDraft = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = watch();
      const response = await saveDraftNCA(formData);

      if (!response.success) {
        setSubmitError(response.error || 'Failed to save draft');
        return;
      }

      setSubmitSuccess(true);
      setNcaNumber(response.data?.nca_number || null);

      setTimeout(() => {
        setSubmitSuccess(false);
        setNcaNumber(null);
      }, 3000);
    } catch (error) {
      console.error('Unexpected error saving draft:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
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
              <div className="relative">
                <Input
                  data-testid="nca-wo-number"
                  type="text"
                  placeholder="Auto-linked"
                  {...register('wo_number')}
                  readOnly
                  className={workOrderError ? 'border-yellow-500' : ''}
                />
                {workOrderLoading && (
                  <span className="absolute right-3 top-3 text-sm text-gray-500">
                    Loading...
                  </span>
                )}
              </div>
              {workOrderError && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
                  <strong>Warning:</strong> {workOrderError}. You can still submit this NCA, but it will not be linked to a work order.
                </div>
              )}
              {activeWorkOrder && (
                <div className="mt-2 text-sm text-green-600">
                  Linked to: {activeWorkOrder.product} (Machine: {activeWorkOrder.machine_id})
                </div>
              )}
            </div>
            {/* Confidential Report Checkbox */}
            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="confidential-report"
                data-testid="confidential-report"
                checked={isConfidential}
                onCheckedChange={(checked) => setIsConfidential(Boolean(checked))}
              />
              <Label htmlFor="confidential-report" className="text-sm">
                Confidential Report (BRCGS 1.1.3 - bypasses quality gate)
              </Label>
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
                <RadioGroupItem value="wip" id="wip" data-testid="nc-type-wip" />
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
                <RadioGroupItem value="other" id="other" data-testid="nc-type-other" />
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
            <AIEnhancedTextarea
              label="Description"
              value={ncDescription}
              onChange={(value) => handleFieldChange('nc_description', value)}
              onKangopakCore={() => handleAIHelp('nc_description')}
              qualityScore={aiQuality.qualityScore?.score}
              isCheckingQuality={aiQuality.isChecking}
              isSuggesting={aiQuality.isSuggesting}
              showQualityBadge={true}
              minLength={100}
              maxLength={2000}
              rows={5}
              required={true}
              placeholder="Example: Laminate delamination found on batch B-2045 during inspection at 14:30 in Finishing Area 2. Approximately 150 units affected. No product release yet."
              data-testid="nc-description-ai"
              error={errors.nc_description?.message}
            />
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

            {machineStatus === 'down' && (
              <div className="mt-4 space-y-4 border-l-4 border-red-500 pl-4">
                <div>
                  <Label>Machine Down Since</Label>
                  <Input type="datetime-local" {...register('machine_down_since')} />
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

            {crossContamination && (
              <div className="border-l-4 border-yellow-500 pl-4">
                <Label>Back Tracking Person *</Label>
                <Input type="text" {...register('back_tracking_person')} />
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
                onCheckedChange={(checked) => setValue('nca_logged', Boolean(checked))}
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
            <AIEnhancedTextarea
              label="Root Cause Analysis"
              value={rootCauseAnalysis}
              onChange={(value) => handleFieldChange('root_cause_analysis', value)}
              onKangopakCore={() => handleAIHelp('root_cause_analysis')}
              qualityScore={aiQuality.qualityScore?.score}
              isCheckingQuality={aiQuality.isChecking}
              isSuggesting={aiQuality.isSuggesting}
              showQualityBadge={true}
              minLength={50}
              maxLength={2000}
              rows={5}
              placeholder="Example: Why did delamination occur? → Adhesive temperature too low. Why? → Heater malfunction. Why? → Sensor drift. Why? → Calibration overdue by 3 weeks. Why? → Maintenance schedule not followed."
              data-testid="root-cause-analysis-ai"
            />
            <FileUpload
              entityId={ncaId}
              uploadType="nca"
              onUpload={uploadNCAFile}
              onDelete={deleteNCAFile}
              onList={listNCAFiles}
              label="Root Cause Analysis Attachments"
              allowedTypes={['PDF', 'Images', 'Word', 'Excel', 'Text', 'CSV']}
              maxSizeMB={10}
            />
          </CardContent>
        </Card>

        {/* Section 10: Corrective Action */}
        <Card data-testid="nca-section-10" className="mb-6">
          <CardHeader>
            <CardTitle>Section 10: Corrective Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AIEnhancedTextarea
              label="Corrective Action"
              value={correctiveAction}
              onChange={(value) => handleFieldChange('corrective_action', value)}
              onKangopakCore={() => handleAIHelp('corrective_action')}
              qualityScore={aiQuality.qualityScore?.score}
              isCheckingQuality={aiQuality.isChecking}
              isSuggesting={aiQuality.isSuggesting}
              showQualityBadge={true}
              minLength={50}
              maxLength={2000}
              rows={5}
              placeholder="Example: 1) Calibrate all adhesive temperature sensors immediately. 2) Implement weekly sensor checks per BRCGS 5.6. 3) Add automated alerts when calibration overdue. 4) Train team leaders on maintenance schedule tracking."
              data-testid="corrective-action-ai"
            />
            <FileUpload
              entityId={ncaId}
              uploadType="nca"
              onUpload={uploadNCAFile}
              onDelete={deleteNCAFile}
              onList={listNCAFiles}
              label="Corrective Action Attachments"
              allowedTypes={['PDF', 'Images', 'Word', 'Excel', 'Text', 'CSV']}
              maxSizeMB={10}
            />
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

      {/* AI Assistant Modal (for suggestions) */}
      <AIAssistantModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestion}
        suggestion={currentSuggestion}
        isLoading={aiQuality.isSuggesting}
      />

      {/* Quality Gate Modal (pre-submission validation) */}
      <QualityGateModal
        isOpen={showQualityGate}
        onClose={() => setShowQualityGate(false)}
        onGoBack={handleQualityGateGoBack}
        onSubmitAnyway={handleQualityGateSubmitAnyway}
        validationResult={aiQuality.validationResult}
        requiresSupervisorOverride={
          (aiQuality.validationResult?.quality_assessment.score ?? 0) < 75
        }
      />
    </div>
  );
}
