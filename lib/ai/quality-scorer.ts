/**
 * Quality Scorer Implementation
 * Weighted scoring algorithm for NCA/MJC quality assessment
 *
 * Based on AI_Rules_Developer_Quick_Reference.md specifications:
 * - NCA Score: Completeness (30%), Accuracy (25%), Clarity (20%), Hazard ID (15%), Evidence (10%)
 * - MJC Score: Similar weighted breakdown
 */

import { QualityScore, QualityBreakdown, Suggestion } from './types';

export class QualityScorer {
  private readonly threshold: number;

  constructor(threshold: number = 75) {
    this.threshold = threshold;
  }

  /**
   * Calculate quality score for field-level analysis
   */
  calculateFieldQuality(aiResponse: string, recordType: 'nca' | 'mjc'): QualityScore {
    const breakdown = recordType === 'nca'
      ? this.calculateNCABreakdown(aiResponse)
      : this.calculateMJCBreakdown(aiResponse);

    const score = this.sumBreakdown(breakdown);

    return {
      score,
      breakdown,
      threshold_met: score >= this.threshold
    };
  }

  /**
   * Calculate quality score for complete suggestion
   */
  calculateSuggestionQuality(suggestion: Omit<Suggestion, 'quality_score'>, recordType: 'nca' | 'mjc'): QualityScore {
    const breakdown = recordType === 'nca'
      ? this.calculateNCASuggestionBreakdown(suggestion)
      : this.calculateMJCSuggestionBreakdown(suggestion);

    const score = this.sumBreakdown(breakdown);

    return {
      score,
      breakdown,
      threshold_met: score >= this.threshold
    };
  }

  // ============================================================================
  // NCA Scoring (0-100 scale)
  // ============================================================================

  private calculateNCABreakdown(text: string): QualityBreakdown {
    return {
      completeness: this.scoreNCACompleteness(text), // 0-30
      accuracy: this.scoreNCAAccuracy(text), // 0-25
      clarity: this.scoreNCAClarity(text), // 0-20
      hazard_identification: this.scoreNCAHazardID(text), // 0-15
      evidence: this.scoreNCAEvidence(text) // 0-10
    };
  }

  private scoreNCACompleteness(text: string): number {
    let score = 0;

    // Immediate correction indicators (10 points)
    if (this.containsKeyword(text, ['quarantine', 'quarantined'])) score += 3;
    if (this.containsKeyword(text, ['red hold', 'hold sticker', 'hold label'])) score += 3;
    if (this.containsKeyword(text, ['back tracking', 'backtracking', 'traceability'])) score += 2;
    if (this.containsKeyword(text, ['segregate', 'segregation', 'isolated'])) score += 2;

    // Root cause documentation (10 points)
    if (this.containsKeyword(text, ['root cause', 'investigation'])) score += 5;
    if (text.length > 200) score += 3; // Detailed explanation
    if (this.containsProcedureReferences(text)) score += 2;

    // Preventive action clarity (10 points)
    if (this.containsKeyword(text, ['procedure', 'training', 'review', 'monitor'])) score += 5;
    if (this.countActionItems(text) >= 2) score += 5;

    return Math.min(score, 30);
  }

  private scoreNCAAccuracy(text: string): number {
    let score = 0;

    // BRCGS procedure references (10 points)
    const procedureCount = this.countProcedureReferences(text);
    score += Math.min(procedureCount * 5, 10);

    // Specific terminology usage (10 points)
    if (this.containsKeyword(text, ['non-conformance', 'disposition', 'corrective action'])) score += 5;
    if (this.containsKeyword(text, ['5.7', '3.11', '3.9', '5.8'])) score += 5;

    // No generic placeholders (5 points)
    if (!this.containsPlaceholders(text)) score += 5;

    return Math.min(score, 25);
  }

  private scoreNCAClarity(text: string): number {
    let score = 0;

    // Clear structure with sections (10 points)
    const sectionCount = (text.match(/^##/gm) || []).length;
    score += Math.min(sectionCount * 2, 10);

    // Actionable language (5 points)
    if (this.containsActionVerbs(text)) score += 5;

    // Concise (not overly verbose) (5 points)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 150 && wordCount <= 500) score += 5;

    return Math.min(score, 20);
  }

  private scoreNCAHazardID(text: string): number {
    let score = 0;

    // Food safety consideration (10 points)
    if (this.containsKeyword(text, ['food safety', 'product safety', 'contamination', 'hazard'])) score += 10;

    // Specific hazard type mentioned (5 points)
    if (this.containsKeyword(text, ['foreign body', 'allergen', 'microbiological', 'chemical', 'physical'])) score += 5;

    return Math.min(score, 15);
  }

  private scoreNCAEvidence(text: string): number {
    let score = 0;

    // Verification method specified (5 points)
    if (this.containsKeyword(text, ['verify', 'verification', 'monitor', 'check'])) score += 5;

    // Timeline/measurability (5 points)
    if (this.containsKeyword(text, ['days', 'weeks', 'months', 'next', 'within'])) score += 5;

    return Math.min(score, 10);
  }

  // ============================================================================
  // MJC Scoring (0-100 scale)
  // ============================================================================

  private calculateMJCBreakdown(text: string): QualityBreakdown {
    return {
      completeness: this.scoreMJCCompleteness(text), // 0-30
      accuracy: this.scoreMJCAccuracy(text), // 0-25
      clarity: this.scoreMJCClarity(text), // 0-20
      hazard_identification: this.scoreMJCSafety(text), // 0-15
      evidence: this.scoreMJCVerification(text) // 0-10
    };
  }

  private scoreMJCCompleteness(text: string): number {
    let score = 0;

    // Maintenance scope specificity (10 points)
    if (this.containsKeyword(text, ['part', 'component', 'removed', 'installed', 'replaced'])) score += 5;
    if (this.containsKeyword(text, ['torque', 'specification', 'alignment', 'calibration'])) score += 5;

    // Safety considerations (10 points)
    if (this.containsKeyword(text, ['loto', 'lock out', 'tag out', 'ppe', 'isolation'])) score += 10;

    // Contamination prevention (10 points)
    if (this.containsKeyword(text, ['clean as you go', 'shadow board', 'tool control', 'swarf'])) score += 10;

    return Math.min(score, 30);
  }

  private scoreMJCAccuracy(text: string): number {
    let score = 0;

    // Hygiene clearance checklist (15 points)
    const checklistItems = this.countHygieneChecklistItems(text);
    score += Math.min(checklistItems * 1.5, 15);

    // Procedure references (10 points)
    const procedureCount = this.countProcedureReferences(text);
    score += Math.min(procedureCount * 5, 10);

    return Math.min(score, 25);
  }

  private scoreMJCClarity(text: string): number {
    let score = 0;

    // Clear step-by-step format (10 points)
    const numberedSteps = (text.match(/^\d+\./gm) || []).length;
    score += Math.min(numberedSteps * 2, 10);

    // Technical terminology appropriate for role (5 points)
    if (this.containsKeyword(text, ['bearing', 'motor', 'seal', 'gasket', 'valve'])) score += 5;

    // Concise documentation (5 points)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 100 && wordCount <= 400) score += 5;

    return Math.min(score, 20);
  }

  private scoreMJCSafety(text: string): number {
    let score = 0;

    // Safety emphasis (10 points)
    if (this.containsKeyword(text, ['safety', 'hazard', 'risk', 'danger'])) score += 5;
    if (this.containsKeyword(text, ['guard', 'interlock', 'e-stop', 'emergency'])) score += 5;

    // Food safety consideration (5 points)
    if (this.containsKeyword(text, ['contamination', 'hygiene', 'food contact'])) score += 5;

    return Math.min(score, 15);
  }

  private scoreMJCVerification(text: string): number {
    let score = 0;

    // Post-maintenance verification (5 points)
    if (this.containsKeyword(text, ['functional test', 'test run', 'verification'])) score += 5;

    // Quality check (5 points)
    if (this.containsKeyword(text, ['test samples', 'quality check', 'qa approval'])) score += 5;

    return Math.min(score, 10);
  }

  // ============================================================================
  // Suggestion Scoring (analyzing structured Suggestion object)
  // ============================================================================

  private calculateNCASuggestionBreakdown(suggestion: Omit<Suggestion, 'quality_score'>): QualityBreakdown {
    let completeness = 0;
    let accuracy = 0;
    let clarity = 0;
    let hazard = 0;
    let evidence = 0;

    // Completeness: Check required sections
    if (suggestion.sections.immediate_correction) completeness += 10;
    if (suggestion.sections.root_cause) completeness += 10;
    if (suggestion.sections.corrective_action) completeness += 10;

    // Accuracy: Procedure references and keywords
    accuracy += Math.min(suggestion.procedure_references.length * 5, 15);
    if (suggestion.keywords_detected.keywords.length >= 3) accuracy += 10;

    // Clarity: Text quality
    if (suggestion.text.length >= 150 && suggestion.text.length <= 1000) clarity += 10;
    if (suggestion.sections.verification) clarity += 10;

    // Hazard ID
    hazard += this.scoreNCAHazardID(suggestion.text);

    // Evidence
    evidence += this.scoreNCAEvidence(suggestion.text);

    return {
      completeness: Math.min(completeness, 30),
      accuracy: Math.min(accuracy, 25),
      clarity: Math.min(clarity, 20),
      hazard_identification: Math.min(hazard, 15),
      evidence: Math.min(evidence, 10)
    };
  }

  private calculateMJCSuggestionBreakdown(suggestion: Omit<Suggestion, 'quality_score'>): QualityBreakdown {
    let completeness = 0;
    let accuracy = 0;
    let clarity = 0;
    let safety = 0;
    let verification = 0;

    // Completeness: Check required sections
    if (suggestion.sections.maintenance_scope) completeness += 8;
    if (suggestion.sections.safety_considerations) completeness += 8;
    if (suggestion.sections.contamination_prevention) completeness += 7;
    if (suggestion.sections.hygiene_clearance) completeness += 7;

    // Accuracy: Hygiene checklist and procedures
    if (suggestion.sections.hygiene_clearance) {
      const checklistCount = this.countHygieneChecklistItems(suggestion.sections.hygiene_clearance);
      accuracy += Math.min(checklistCount * 2.5, 15);
    }
    accuracy += Math.min(suggestion.procedure_references.length * 5, 10);

    // Clarity
    if (suggestion.text.length >= 100 && suggestion.text.length <= 800) clarity += 10;
    if (suggestion.sections.verification) clarity += 10;

    // Safety
    safety += this.scoreMJCSafety(suggestion.text);

    // Verification
    verification += this.scoreMJCVerification(suggestion.text);

    return {
      completeness: Math.min(completeness, 30),
      accuracy: Math.min(accuracy, 25),
      clarity: Math.min(clarity, 20),
      hazard_identification: Math.min(safety, 15),
      evidence: Math.min(verification, 10)
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private sumBreakdown(breakdown: QualityBreakdown): number {
    return (
      breakdown.completeness +
      breakdown.accuracy +
      breakdown.clarity +
      breakdown.hazard_identification +
      breakdown.evidence
    );
  }

  private containsKeyword(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  private containsProcedureReferences(text: string): boolean {
    return /\b\d+\.\d+(?:\.\d+)?\b/.test(text);
  }

  private countProcedureReferences(text: string): number {
    const matches = text.match(/\b\d+\.\d+(?:\.\d+)?\b/g);
    return matches ? new Set(matches).size : 0;
  }

  private containsPlaceholders(text: string): boolean {
    const placeholders = ['[TODO]', '[INSERT]', '[ADD]', '[SPECIFY]', 'XXX', 'TBD', '[...]'];
    return placeholders.some(ph => text.includes(ph));
  }

  private containsActionVerbs(text: string): boolean {
    const actionVerbs = [
      'quarantine', 'segregate', 'isolate', 'verify', 'review', 'monitor',
      'investigate', 'document', 'implement', 'complete', 'ensure'
    ];
    return this.containsKeyword(text, actionVerbs);
  }

  private countActionItems(text: string): number {
    // Count numbered lists, bullet points, or action verbs
    const numberedItems = (text.match(/^\d+\./gm) || []).length;
    const bulletItems = (text.match(/^[-*]/gm) || []).length;
    return numberedItems + bulletItems;
  }

  private countHygieneChecklistItems(text: string): number {
    // Look for checklist patterns: ☐, [ ], ✓, numbered items
    const checkboxes = (text.match(/[☐✓✔]/g) || []).length;
    const brackets = (text.match(/\[\s*[xX✓✔]?\s*\]/g) || []).length;
    const numberedInSection = (text.match(/^\d+\./gm) || []).length;

    // Return max (most likely represents actual checklist)
    return Math.max(checkboxes, brackets, numberedInSection);
  }
}
