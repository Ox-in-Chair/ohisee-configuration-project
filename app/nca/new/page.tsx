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

// Quality Validation imports
import { EnhancedTextarea } from '@/components/enhanced-textarea';
import { SmartInput } from '@/components/smart-input';
import { WritingAssistantModal } from '@/components/writing-assistant-modal';
import { QualityGateModal } from '@/components/quality-gate-modal';
import { useQualityValidation } from '@/hooks/useQualityValidation';
import type { Suggestion } from '@/lib/ai/types';

// Visualization imports
import { FiveWhyBuilder } from '@/components/visualizations/five-why-builder';
import { TimelineBuilder } from '@/components/visualizations/timeline-builder';
import { FishboneDiagram } from '@/components/visualizations/fishbone-diagram';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Training and Tooltips imports
import { NCATrainingModule } from '@/components/nca/nca-training-module';
import { NCAFieldTooltip } from '@/components/nca/nca-field-tooltip';
import { BookOpen } from 'lucide-react';

// Form Header import
import { FormHeader } from '@/components/nca/form-header';

// Signature Capture import
import { SignatureCapture } from '@/components/fields/signature-capture';

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
 * NCA Form Page Component - Quality Validation Integrated
 * Production-ready with quality validation and writing assistance
 */
export default function NewNCAPage(): React.ReactElement {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ncaNumber, setNcaNumber] = useState<string | null>(null);
  const [ncaId, setNcaId] = useState<string | null>(null);
  const [isConfidential, setIsConfidential] = useState(false);

  // Quality Validation State
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showQualityGate, setShowQualityGate] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | null>(null);
  const [currentFieldForSuggestion, setCurrentFieldForSuggestion] = useState<string | null>(null);

  // Visualization Modals State
  const [showFiveWhy, setShowFiveWhy] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFishbone, setShowFishbone] = useState(false);

  // Training Module State
  const [showTrainingModule, setShowTrainingModule] = useState(false);

  // Work Order Auto-Link State
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);
  const [workOrderLoading, setWorkOrderLoading] = useState<boolean>(true);
  const [workOrderError, setWorkOrderError] = useState<string | null>(null);

  // Signature State
  const [concessionSignature, setConcessionSignature] = useState<string | null>(null);
  const [dispositionSignature, setDispositionSignature] = useState<string | null>(null);
  const [closeOutSignature, setCloseOutSignature] = useState<string | null>(null);

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
      // Procedure reference defaults (locked on creation)
      procedure_reference: '5.7',
      procedure_revision: 'Rev 9',
      procedure_revision_date: new Date().toLocaleDateString('en-GB'),
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
        // For now, skip work order fetch if no valid user ID
        // UUID validation: check if it's a valid UUID format
        const userId = 'current-user-id'; // Placeholder - replace with real auth user ID
        
        // Validate UUID format before querying (basic check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          // Skip work order fetch if user ID is not a valid UUID
          // This is expected in development when auth is not set up
          setWorkOrderError(null);
          return;
        }

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

  // Auto-set nc_origin when nc_type changes to raw-material
  const ncType = watch('nc_type');
  useEffect(() => {
    if (ncType === 'raw-material') {
      setValue('nc_origin', 'supplier-based', { shouldValidate: true });
    }
  }, [ncType, setValue]);

  // Initialize Quality Validation Hook
  const qualityValidation = useQualityValidation({
    formType: 'nca',
    userId: 'current-user-id', // TODO: Get from auth
    debounceMs: 3000, // Validate field 3 seconds after user stops typing
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

      // Trigger validation for critical fields
      if (['nc_description', 'root_cause_analysis', 'corrective_action'].includes(fieldName)) {
        const formData = watch();
        qualityValidation.validateField({
          ...formData,
          [fieldName]: value,
        } as any);
      }
    },
    [setValue, watch, qualityValidation]
  );

  // Handle writing assistance request
  const handleGetHelp = useCallback(
    async (fieldName: string) => {
      setCurrentFieldForSuggestion(fieldName);
      setShowSuggestionModal(true);
      setCurrentSuggestion(null); // Clear previous suggestion

      const formData = watch();
      await qualityValidation.getWritingHelp(formData as any);

      // Set suggestion even if null - modal will handle display
      setCurrentSuggestion(qualityValidation.suggestions || null);
    },
    [watch, qualityValidation]
  );

  // Handle accepting writing suggestion
  const handleAcceptSuggestion = useCallback(
    (suggestionText: string) => {
      if (currentFieldForSuggestion && currentSuggestion) {
        setValue(currentFieldForSuggestion as any, suggestionText);

        // Record suggestion acceptance
        qualityValidation.acceptSuggestion(
          currentSuggestion,
          currentFieldForSuggestion,
          suggestionText
        );
      }

      setShowSuggestionModal(false);
      setCurrentSuggestion(null);
      setCurrentFieldForSuggestion(null);
    },
    [currentFieldForSuggestion, currentSuggestion, setValue, qualityValidation]
  );

  // Handle rejecting writing suggestion
  const handleRejectSuggestion = useCallback(() => {
    setShowSuggestionModal(false);
    setCurrentSuggestion(null);
    setCurrentFieldForSuggestion(null);
  }, []);

  // Form submission handler with validation gate
  const onSubmit = useCallback(
    async (data: NCAFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        // Step 1: Run validation (submission gate)
        const validation = await qualityValidation.validateSubmission(data as any, isConfidential);

        if (!validation.success) {
          setSubmitError(validation.error || 'Validation failed');
          setIsSubmitting(false);
          return;
        }

        // Step 2: Check if validation passed
        if (
          validation.data &&
          !validation.data.ready_for_submission &&
          !isConfidential
        ) {
          // Validation failed - show validation modal
          setShowQualityGate(true);
          setIsSubmitting(false);
          return;
        }

        // Step 3: Validation passed or confidential - proceed with submission
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
    [qualityValidation, isConfidential]
  );

  // Handle quality gate "Go Back" button
  const handleQualityGateGoBack = useCallback(() => {
    setShowQualityGate(false);
  }, []);

  // Handle quality gate "Submit for Manager Approval"
  const handleQualityGateSubmitAnyway = useCallback(
    async (justification?: string) => {
      // TODO: Implement manager approval workflow
      // This should:
      // 1. Record the approval request with manager ID and justification
      // 2. Set submission status to "pending_manager_approval"
      // 3. Notify manager for approval
      // 4. Log for audit trail

      if (justification) {
        console.log('Manager approval requested with justification:', justification);
        // TODO: Call recordManagerApprovalAction from quality-validation-actions
      } else {
        console.log('Submission override requested (not recommended)');
      }

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
    },
    [watch]
  );

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
      {/* Form Header */}
      <FormHeader className="mb-6" />
      
      {/* Training Module Button */}
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowTrainingModule(true)}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          Training Module
        </Button>
      </div>
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
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                data-testid="nca-date"
                type="text"
                value={new Date().toLocaleDateString()}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>NCA Number</Label>
              <Input
                data-testid="nca-number"
                type="text"
                value="NCA-AUTO-GENERATED"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Raised By</Label>
              <Input
                data-testid="nca-raised-by"
                type="text"
                placeholder="Current User"
                readOnly
              />
            </div>
            <div className="space-y-2">
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
            <CardTitle className="flex items-center gap-2">
              Section 2: NC Classification
              <NCAFieldTooltip fieldName="nc_type" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
            </div>
            
            {/* NC Origin Classification (conditional based on nc_type) */}
            {watch('nc_type') && watch('nc_type') !== 'other' && (
              <div className="space-y-2">
                <Label>
                  NC Origin Classification
                  <NCAFieldTooltip fieldName="nc_origin" />
                </Label>
                <RadioGroup
                  value={watch('nc_origin') || ''}
                  onValueChange={(value) => {
                    setValue('nc_origin', value as 'supplier-based' | 'kangopak-based' | 'joint-investigation', {
                      shouldValidate: true,
                    });
                  }}
                >
                  {watch('nc_type') === 'raw-material' ? (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="supplier-based" id="supplier-based" disabled />
                      <Label htmlFor="supplier-based" className="text-gray-600">
                        Supplier-based (Required for Raw Material)
                      </Label>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="supplier-based"
                          id="supplier-based"
                          data-testid="nc-origin-supplier"
                        />
                        <Label htmlFor="supplier-based">Supplier-based</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="kangopak-based"
                          id="kangopak-based"
                          data-testid="nc-origin-kangopak"
                        />
                        <Label htmlFor="kangopak-based">Kangopak-based</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="joint-investigation"
                          id="joint-investigation"
                          data-testid="nc-origin-joint"
                        />
                        <Label htmlFor="joint-investigation">Joint Investigation</Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
                {errors.nc_origin && (
                  <p className="text-red-600 text-sm mt-2">{errors.nc_origin.message}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Supplier & Product Information */}
        <Card data-testid="nca-section-3" className="mb-6">
          <CardHeader>
            <CardTitle>Section 3: Supplier & Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <SmartInput
                label="Supplier Name"
                value={watch('supplier_name') || ''}
                onChange={(value) => setValue('supplier_name', value)}
                fieldName="supplier_name"
                showSuggestions={true}
                data-testid="supplier-name"
                error={errors.supplier_name?.message}
              />
            </div>
            <div className="space-y-2">
              <SmartInput
                label="NC Product Description"
                value={ncProductDescription}
                onChange={(value) => handleFieldChange('nc_product_description', value)}
                fieldName="nc_product_description"
                showSuggestions={true}
                required
                data-testid="nc-product-description"
                error={errors.nc_product_description?.message}
                placeholder="Enter product description or packaging material code"
                tooltip={<NCAFieldTooltip fieldName="nc_product_description" />}
              />
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
          <CardContent className="space-y-4">
            {/* Visualization Tools */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTimeline(true)}
                className="text-xs"
              >
                📅 Build Timeline
              </Button>
            </div>

            <EnhancedTextarea
              label="Description"
              value={ncDescription}
              onChange={(value) => handleFieldChange('nc_description', value)}
              onGetHelp={() => handleGetHelp('nc_description')}
              qualityScore={qualityValidation.qualityScore?.score}
              isCheckingQuality={qualityValidation.isChecking}
              isProcessing={qualityValidation.isSuggesting}
              showQualityBadge={true}
              minLength={100}
              maxLength={2000}
              rows={5}
              required={true}
              fieldName="nc_description"
              context={{ ncType: watch('nc_type') }}
              showChecklist={true}
              data-testid="nc-description"
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
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
            </div>

            {machineStatus === 'down' && (
              <div className="mt-4 space-y-4 border-l-4 border-red-500 pl-4">
                <div className="space-y-2">
                  <Label>Machine Down Since</Label>
                  <Input type="datetime-local" {...register('machine_down_since')} />
                  {errors.machine_down_since && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.machine_down_since.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
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
            <div className="space-y-2">
              <SmartInput
                label="Team Leader"
                value={watch('concession_team_leader') || ''}
                onChange={(value) => setValue('concession_team_leader', value)}
                data-testid="concession-team-leader"
                enableVoiceInput={true}
                enableTextToSpeech={true}
                enableRewrite={false}
              />
            </div>
            <div className="space-y-2">
              <SignatureCapture
                label="Digital Signature"
                value={concessionSignature}
                onChange={(sig) => {
                  setConcessionSignature(sig);
                  if (sig) {
                    setValue('concession_signature', {
                      type: 'manual' as const,
                      data: sig,
                      name: 'Team Leader', // TODO: Get from auth
                      timestamp: new Date().toISOString(),
                    });
                  } else {
                    setValue('concession_signature', null);
                  }
                }}
                required={false}
                data-testid="concession-signature"
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Cross Contamination?</Label>
                <NCAFieldTooltip fieldName="cross_contamination" />
              </div>
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
              <div className="border-l-4 border-yellow-500 pl-4 space-y-2">
                <SmartInput
                  label="Back Tracking Person *"
                  value={watch('back_tracking_person') || ''}
                  onChange={(value) => setValue('back_tracking_person', value)}
                  data-testid="back-tracking-person"
                  enableVoiceInput={true}
                  enableTextToSpeech={true}
                  enableRewrite={false}
                  error={errors.back_tracking_person?.message}
                  required
                />
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

            {/* Segregation Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Segregation Area (Procedure 5.7)</Label>
                <NCAFieldTooltip fieldName="segregation_area" />
              </div>
              <select
                {...register('segregation_area')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="segregation-area"
              >
                <option value="">Select segregation area...</option>
                <option value="raw-materials">NC Product Area (Raw Materials)</option>
                <option value="wip">NC Product Area (WIP)</option>
                <option value="finished-goods">NC Product Area (Finished Goods)</option>
                <option value="other">Other - Description required</option>
              </select>
              {watch('segregation_area') === 'other' && (
                <div className="mt-2">
                  <SmartInput
                    label="Specify Other Segregation Area"
                    value={watch('segregation_area_other') || ''}
                    onChange={(value) => setValue('segregation_area_other', value)}
                    placeholder="Enter segregation area description"
                    data-testid="segregation-area-other"
                    enableVoiceInput={true}
                    enableTextToSpeech={true}
                    enableRewrite={false}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 8: Disposition */}
        <Card data-testid="nca-section-8" className="mb-6">
          <CardHeader>
            <CardTitle>Section 8: Disposition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
              <div className="border-l-4 border-blue-500 pl-4 space-y-2">
                <EnhancedTextarea
                  label="Rework Instruction *"
                  value={watch('rework_instruction') || ''}
                  onChange={(value) => setValue('rework_instruction', value)}
                  rows={3}
                  data-testid="rework-instruction"
                  fieldName="rework_instruction"
                  enableVoiceInput={true}
                  enableTextToSpeech={true}
                  enableRewrite={false}
                  error={errors.rework_instruction?.message}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <SignatureCapture
                label="Authorized Signature"
                value={dispositionSignature}
                onChange={(sig) => {
                  setDispositionSignature(sig);
                  if (sig) {
                    setValue('disposition_signature', {
                      type: 'manual' as const,
                      data: sig,
                      name: 'Production Manager', // TODO: Get from auth
                      timestamp: new Date().toISOString(),
                    });
                  } else {
                    setValue('disposition_signature', null);
                  }
                }}
                required={false}
                data-testid="disposition-signature"
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
            {/* Visualization Tools */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFiveWhy(true)}
                className="text-xs"
              >
                🔍 5-Why Builder
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFishbone(true)}
                className="text-xs"
              >
                🐟 Fishbone Diagram
              </Button>
            </div>

            <EnhancedTextarea
              label="Root Cause Analysis"
              value={rootCauseAnalysis}
              onChange={(value) => handleFieldChange('root_cause_analysis', value)}
              onGetHelp={() => handleGetHelp('root_cause_analysis')}
              qualityScore={qualityValidation.qualityScore?.score}
              isCheckingQuality={qualityValidation.isChecking}
              isProcessing={qualityValidation.isSuggesting}
              showQualityBadge={true}
              minLength={50}
              maxLength={2000}
              rows={5}
              fieldName="root_cause_analysis"
              showChecklist={true}
              data-testid="root-cause-analysis"
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
            <EnhancedTextarea
              label="Corrective Action"
              value={correctiveAction}
              onChange={(value) => handleFieldChange('corrective_action', value)}
              onGetHelp={() => handleGetHelp('corrective_action')}
              qualityScore={qualityValidation.qualityScore?.score}
              isCheckingQuality={qualityValidation.isChecking}
              isProcessing={qualityValidation.isSuggesting}
              showQualityBadge={true}
              minLength={50}
              maxLength={2000}
              rows={5}
              fieldName="corrective_action"
              showChecklist={true}
              data-testid="corrective-action"
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
            <div className="space-y-2">
              <SmartInput
                label="Closed Out By"
                value={watch('close_out_by') || ''}
                onChange={(value) => setValue('close_out_by', value)}
                data-testid="close-out-by"
                enableVoiceInput={true}
                enableTextToSpeech={true}
                enableRewrite={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Close Out Date</Label>
              <Input
                data-testid="close-out-date"
                type="date"
                {...register('close_out_date')}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <SignatureCapture
                label="Management Signature"
                value={closeOutSignature}
                onChange={(sig) => {
                  setCloseOutSignature(sig);
                  if (sig) {
                    setValue('close_out_signature', {
                      type: 'manual' as const,
                      data: sig,
                      name: 'Management', // TODO: Get from auth
                      timestamp: new Date().toISOString(),
                    });
                  } else {
                    setValue('close_out_signature', null);
                  }
                }}
                required={false}
                data-testid="close-out-signature"
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

      {/* Writing Assistant Modal (for suggestions) */}
      <WritingAssistantModal
        isOpen={showSuggestionModal}
        onClose={() => setShowSuggestionModal(false)}
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestion}
        suggestion={currentSuggestion}
        isLoading={qualityValidation.isSuggesting}
      />

      {/* Quality Gate Modal (pre-submission validation) */}
      <QualityGateModal
        isOpen={showQualityGate}
        onClose={() => setShowQualityGate(false)}
        onGoBack={handleQualityGateGoBack}
        onSubmitAnyway={handleQualityGateSubmitAnyway}
        validationResult={qualityValidation.validationResult}
        requiresManagerApproval={
          (qualityValidation.validationResult?.quality_assessment.score ?? 0) < 75
        }
      />

      {/* 5-Why Builder Modal */}
      <Dialog open={showFiveWhy} onOpenChange={setShowFiveWhy}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>5-Why Root Cause Analysis Builder</DialogTitle>
            <DialogDescription>
              Build a structured root cause analysis using the 5-Why method. Minimum 3 levels required.
            </DialogDescription>
          </DialogHeader>
          <FiveWhyBuilder
            initialProblem={ncDescription || 'Non-conformance issue'}
            minDepth={3}
            maxDepth={5}
            onChange={(problem, whys) => {
              // Preview updates
            }}
            onComplete={(problem, whys, rootCause) => {
              setValue('root_cause_analysis', rootCause);
              setShowFiveWhy(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Timeline Builder Modal */}
      <Dialog open={showTimeline} onOpenChange={setShowTimeline}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timeline Builder</DialogTitle>
            <DialogDescription>
              Build a chronological timeline of events (when, where, what happened).
            </DialogDescription>
          </DialogHeader>
          <TimelineBuilder
            onChange={(events, formattedText) => {
              // Preview updates
            }}
            onComplete={(events, formattedText) => {
              setValue('nc_description', formattedText);
              setShowTimeline(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Training Module Modal */}
      <NCATrainingModule
        open={showTrainingModule}
        onOpenChange={setShowTrainingModule}
      />

      {/* Fishbone Diagram Modal */}
      <Dialog open={showFishbone} onOpenChange={setShowFishbone}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fishbone Diagram (6M Analysis)</DialogTitle>
            <DialogDescription>
              Analyze root causes across 6 categories: Man, Machine, Method, Material, Measurement, Environment.
            </DialogDescription>
          </DialogHeader>
          <FishboneDiagram
            initialProblem={ncDescription || 'Non-conformance issue'}
            onChange={(problem, categories, formattedText) => {
              // Preview updates
            }}
            onComplete={(problem, categories, formattedText) => {
              setValue('root_cause_analysis', formattedText);
              setShowFishbone(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
