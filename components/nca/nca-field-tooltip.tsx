'use client';

import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * NCA Field Tooltip Component
 * Provides contextual help for NCA form fields based on BRCGS Training 3.11
 */

interface NCAFieldTooltipProps {
  fieldName: string;
  content?: string;
  brcgsReference?: string;
  procedureReference?: string;
}

const FIELD_TOOLTIPS: Record<string, { content: string; brcgsReference?: string; procedureReference?: string }> = {
  'nc_type': {
    content: 'Select the type of non-conformance: Raw Material (supplier issues), Finished Goods (completed products), WIP (work-in-progress), Incident (safety/quality events), or Other.',
    procedureReference: 'Procedure 5.7'
  },
  'nc_product_description': {
    content: 'Describe the non-conforming product in detail. Include material type, specifications, and any identifying information.',
    procedureReference: 'Procedure 5.7 Section 3'
  },
  'nc_description': {
    content: 'Provide a detailed description of the non-conformance (minimum 100 characters). Explain what is wrong, how it was discovered, and the potential impact.',
    brcgsReference: 'BRCGS 3.11.1',
    procedureReference: 'Procedure 5.7 Section 4'
  },
  'cross_contamination': {
    content: 'If YES, back tracking must be done immediately to identify all affected product and prevent non-conforming product from reaching customers.',
    brcgsReference: 'BRCGS 3.9 Traceability',
    procedureReference: 'Procedure 5.7 Section 7'
  },
  'back_tracking_person': {
    content: 'Person responsible for conducting back tracking to identify all affected product. Factory Team Leader must verify completion.',
    procedureReference: 'Procedure 5.7 Section 7'
  },
  'hold_label_completed': {
    content: 'RED "Hold" sticker must be applied to non-conforming product with traceability details referencing this NCA number.',
    procedureReference: 'Procedure 5.7 Section 7'
  },
  'segregation_area': {
    content: 'Location where non-conforming product is segregated. Product should be moved to designated non-conforming warehouse area, or clearly labeled if segregation is impractical.',
    procedureReference: 'Procedure 5.7 Section 7'
  },
  'disposition_action': {
    content: 'Decision on how to handle non-conforming product: Reject (return to supplier), Credit (financial adjustment), Uplift (remove from inventory), Rework (correct defect), Concession (accept with deviation), or Discard (dispose).',
    brcgsReference: 'BRCGS 3.11.2',
    procedureReference: 'Procedure 5.7 Section 8'
  },
  'root_cause_analysis': {
    content: 'Use systematic approach (5 Whys or Ishikawa diagram) to identify the root cause. Consider: Man, Machine, Method, Environment, Material, Measuring equipment.',
    procedureReference: 'Procedure 5.7 Section 9'
  },
  'corrective_action': {
    content: 'Action taken to eliminate the cause and prevent recurrence. Should reference relevant procedures and include verification steps.',
    brcgsReference: 'BRCGS 3.13',
    procedureReference: 'Procedure 5.7 Section 10'
  },
  'close_out_date': {
    content: 'NCAs must be closed out within 20 working days from date opened. Can only be closed when corrective actions are complete and disposition is determined.',
    procedureReference: 'Procedure 5.7 Section 11'
  }
};

export function NCAFieldTooltip({ fieldName, content, brcgsReference, procedureReference }: NCAFieldTooltipProps) {
  const tooltipInfo = FIELD_TOOLTIPS[fieldName] || { 
    content: content || `Help for ${fieldName}`, 
    brcgsReference, 
    procedureReference 
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="text-sm">{tooltipInfo.content}</p>
            {(tooltipInfo.brcgsReference || tooltipInfo.procedureReference) && (
              <div className="text-xs text-gray-400 pt-1 border-t border-gray-200">
                {tooltipInfo.brcgsReference && <div>BRCGS: {tooltipInfo.brcgsReference}</div>}
                {tooltipInfo.procedureReference && <div>{tooltipInfo.procedureReference}</div>}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

