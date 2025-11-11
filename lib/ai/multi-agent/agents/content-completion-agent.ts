/**
 * Content Completion Agent
 * Analyzes submissions to identify missing information by comparing against
 * historical examples and policy requirements
 */

import type { NCA, MJC, User } from '../../types';
import type { AgentResult } from '../types';
import { validateDescriptionCompleteness, validateRootCauseDepth, validateCorrectiveActionSpecificity } from '@/lib/services/quality-enforcement-service';

export class ContentCompletionAgent {
  /**
   * Analyze form data for missing content
   */
  async analyze(
    formData: NCA | MJC,
    user: User,
    formType: 'nca' | 'mjc'
  ): Promise<AgentResult> {
    const requirements: AgentResult['requirements'] = [];
    const errors: AgentResult['errors'] = [];
    const warnings: AgentResult['warnings'] = [];
    let confidence = 0.8; // High confidence in rule-based checks

    if (formType === 'nca') {
      const ncaData = formData as NCA;

      // Check description completeness
      if (ncaData.nc_description && ncaData.nc_type) {
        const descValidation = validateDescriptionCompleteness(
          ncaData.nc_description,
          ncaData.nc_type
        );

        descValidation.issues.forEach(issue => {
          if (issue.severity === 'error') {
            errors.push({
              field: issue.field,
              message: issue.message,
              brcgs_requirement: issue.brcgsReference,
            });
          } else {
            requirements.push({
              field: issue.field,
              message: issue.message,
              reference: issue.brcgsReference,
              exampleFix: issue.exampleFix,
            });
          }
        });

        // Check for missing requirements
        descValidation.missingRequirements.forEach(missing => {
          requirements.push({
            field: 'nc_description',
            message: `Missing: ${missing}`,
            reference: 'BRCGS 5.7.2',
          });
        });
      }

      // Check root cause depth
      if (ncaData.root_cause_analysis) {
        const rootCauseValidation = validateRootCauseDepth(ncaData.root_cause_analysis);
        rootCauseValidation.issues.forEach(issue => {
          requirements.push({
            field: issue.field,
            message: issue.message,
            reference: issue.brcgsReference,
            exampleFix: issue.exampleFix,
          });
        });
      }

      // Check corrective action specificity
      if (ncaData.corrective_action) {
        const actionValidation = validateCorrectiveActionSpecificity(ncaData.corrective_action);
        actionValidation.issues.forEach(issue => {
          requirements.push({
            field: issue.field,
            message: issue.message,
            reference: issue.brcgsReference,
            exampleFix: issue.exampleFix,
          });
        });
      }
    }

    // Calculate confidence based on findings
    if (errors.length > 0) {
      confidence = 0.9; // High confidence when errors found
    } else if (requirements.length === 0) {
      confidence = 0.7; // Lower confidence when no issues found (might be false negative)
    }

    return {
      requirements,
      errors,
      warnings,
      confidence,
      reasoning: `Content Completion Agent analyzed ${formType} submission. Found ${errors.length} errors, ${requirements.length} missing requirements. Used rule-based validation against policy schemas.`,
    };
  }
}

