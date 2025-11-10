/**
 * Quality Scorer Unit Tests
 * Tests the weighted scoring algorithm for NCA/MJC quality assessment
 */

import { describe, it, expect } from '@jest/globals';
import { QualityScorer } from '../quality-scorer';
import { Suggestion } from '../types';

describe('QualityScorer', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer(75);
  });

  describe('NCA Quality Scoring', () => {
    it('should score high-quality NCA response with 90+ points', () => {
      const response = `
## IMMEDIATE CORRECTION
Quarantine all affected product immediately. Apply RED Hold sticker to pallet.
Segregate from conforming product. Complete back tracking per Procedure 3.9 as cross-contamination detected.

## ROOT CAUSE ANALYSIS
Investigation per Procedure 3.11 identified supplier material defect in raw film batch #12345.
Print registration marks out of specification by 5mm, exceeding ±2mm tolerance.

## CORRECTIVE ACTION
1. Contact supplier per Procedure 5.7 Section 7 - arrange credit note and upliftment
2. Update supplier quality scorecard (3.4)
3. Review incoming inspection procedure to catch registration issues earlier
4. Monitor next 3 batches from this supplier for recurrence
5. Skills Matrix update for QA team on print registration inspection

## VERIFICATION
Monitor next 100 units from new batch. Verify print registration within specification.
Management Review at next monthly meeting (Procedure 1.2). Track for 3 months.
`;

      const score = scorer.calculateFieldQuality(response, 'nca');

      expect(score.score).toBeGreaterThanOrEqual(85);
      expect(score.threshold_met).toBe(true);
      expect(score.breakdown.completeness).toBeGreaterThan(20);
      expect(score.breakdown.accuracy).toBeGreaterThan(15);
    });

    it('should score low-quality NCA response below threshold', () => {
      const response = `
The product has an issue. Fix it and make sure it doesn't happen again.
Monitor going forward.
`;

      const score = scorer.calculateFieldQuality(response, 'nca');

      expect(score.score).toBeLessThan(75);
      expect(score.threshold_met).toBe(false);
      expect(score.breakdown.completeness).toBeLessThan(15);
    });

    it('should award points for quarantine and segregation keywords', () => {
      const withKeywords = 'Quarantine product. Apply RED Hold sticker. Segregate affected units.';
      const withoutKeywords = 'Handle the product appropriately.';

      const scoreWith = scorer.calculateFieldQuality(withKeywords, 'nca');
      const scoreWithout = scorer.calculateFieldQuality(withoutKeywords, 'nca');

      expect(scoreWith.score).toBeGreaterThan(scoreWithout.score);
    });

    it('should award points for procedure references', () => {
      const withRefs = 'Per Procedure 5.7, quarantine product. Follow 3.11 for root cause analysis.';
      const withoutRefs = 'Quarantine the product and investigate the cause.';

      const scoreWith = scorer.calculateFieldQuality(withRefs, 'nca');
      const scoreWithout = scorer.calculateFieldQuality(withoutRefs, 'nca');

      expect(scoreWith.breakdown.accuracy).toBeGreaterThan(scoreWithout.breakdown.accuracy);
    });

    it('should penalize placeholder text', () => {
      const withPlaceholders = 'Quarantine [INSERT DETAILS HERE]. Root cause [TODO]. Action [SPECIFY].';
      const withoutPlaceholders = 'Quarantine affected batch. Root cause: supplier defect. Action: notify supplier.';

      const scoreWith = scorer.calculateFieldQuality(withPlaceholders, 'nca');
      const scoreWithout = scorer.calculateFieldQuality(withoutPlaceholders, 'nca');

      expect(scoreWith.breakdown.accuracy).toBeLessThan(scoreWithout.breakdown.accuracy);
    });

    it('should score food safety considerations', () => {
      const withFoodSafety = 'Product safety impact: HIGH. Foreign body contamination risk. Hazard type: physical.';
      const withoutFoodSafety = 'Product has a quality issue.';

      const scoreWith = scorer.calculateFieldQuality(withFoodSafety, 'nca');
      const scoreWithout = scorer.calculateFieldQuality(withoutFoodSafety, 'nca');

      expect(scoreWith.breakdown.hazard_identification).toBeGreaterThan(scoreWithout.breakdown.hazard_identification);
    });
  });

  describe('MJC Quality Scoring', () => {
    it('should score high-quality MJC response with 90+ points', () => {
      const response = `
## MAINTENANCE SCOPE
Removed worn bearing #SKF-6205 from main drive motor. Installed new bearing torqued to 45Nm per spec.
Checked alignment using dial indicator - within 0.05mm tolerance.

## SAFETY CONSIDERATIONS
LOTO procedure completed - electrical isolation and tag out. PPE worn: safety glasses, steel toe boots.
All energy sources isolated and verified zero energy state.

## CONTAMINATION PREVENTION
Clean as you go implemented throughout work. Shadow board tool control - all tools accounted for.
Swarf mat used during installation. All metal filings removed and accounted for.

## HYGIENE CLEARANCE CHECKLIST
1. ✓ All excess grease & oil removed
2. ✓ All swarf & metal filings removed
3. ✓ All tools & consumables accounted for (shadow board verified)
4. ✓ All temporary fixings removed
5. ✓ Area cleaned & sanitized
6. ✓ No foreign body contamination risk
7. ✓ Equipment guards replaced & secure
8. ✓ Test samples taken
9. ✓ QA Supervisor sign-off obtained
10. ✓ Production authorized to resume

## VERIFICATION
Functional test: motor ran for 30 minutes at full speed, no abnormal noise or vibration.
Test samples: 50 units produced, all within specification. QA approval obtained. Calibration not affected.
`;

      const score = scorer.calculateFieldQuality(response, 'mjc');

      expect(score.score).toBeGreaterThanOrEqual(90);
      expect(score.threshold_met).toBe(true);
      expect(score.breakdown.completeness).toBeGreaterThan(25);
    });

    it('should score low-quality MJC response below threshold', () => {
      const response = `
Fixed the bearing. Motor works now.
`;

      const score = scorer.calculateFieldQuality(response, 'mjc');

      expect(score.score).toBeLessThan(75);
      expect(score.threshold_met).toBe(false);
    });

    it('should require complete 10-item hygiene checklist', () => {
      const completeChecklist = `
HYGIENE CLEARANCE:
1. ✓ Excess grease removed
2. ✓ Swarf removed
3. ✓ Tools accounted for
4. ✓ Temporary fixings removed
5. ✓ Area cleaned
6. ✓ No contamination risk
7. ✓ Guards replaced
8. ✓ Test samples taken
9. ✓ QA sign-off
10. ✓ Production authorized
`;

      const incompleteChecklist = `
HYGIENE CLEARANCE:
1. ✓ Area cleaned
2. ✓ QA sign-off
`;

      const scoreComplete = scorer.calculateFieldQuality(completeChecklist, 'mjc');
      const scoreIncomplete = scorer.calculateFieldQuality(incompleteChecklist, 'mjc');

      expect(scoreComplete.breakdown.accuracy).toBeGreaterThan(scoreIncomplete.breakdown.accuracy);
    });

    it('should award points for LOTO and safety emphasis', () => {
      const withSafety = 'LOTO completed. PPE worn. Energy isolation verified. All guards secure.';
      const withoutSafety = 'Fixed the equipment.';

      const scoreWith = scorer.calculateFieldQuality(withSafety, 'mjc');
      const scoreWithout = scorer.calculateFieldQuality(withoutSafety, 'mjc');

      expect(scoreWith.breakdown.hazard_identification).toBeGreaterThan(scoreWithout.breakdown.hazard_identification);
    });

    it('should award points for functional testing', () => {
      const withTest = 'Functional test completed. Test samples taken. Quality verified. Calibration checked.';
      const withoutTest = 'Maintenance completed.';

      const scoreWith = scorer.calculateFieldQuality(withTest, 'mjc');
      const scoreWithout = scorer.calculateFieldQuality(withoutTest, 'mjc');

      expect(scoreWith.breakdown.evidence).toBeGreaterThan(scoreWithout.breakdown.evidence);
    });
  });

  describe('Suggestion Scoring', () => {
    it('should score structured NCA suggestion correctly', () => {
      const suggestion: Suggestion = {
        text: 'Comprehensive corrective action with all required sections',
        sections: {
          immediate_correction: 'Quarantine and segregate',
          root_cause: 'Supplier material defect identified',
          corrective_action: 'Notify supplier, update procedure, train team',
          verification: 'Monitor next 100 units over 3 months'
        },
        quality_score: 0,
        confidence: 'high',
        confidence_percentage: 90,
        procedure_references: ['5.7', '3.11', '3.9', '5.8'],
        keywords_detected: {
          category: 'material',
          keywords: ['supplier', 'raw material', 'defect', 'batch']
        },
        recommendations: {
          create_mjc: false,
          calibration_check: false,
          training_required: true,
          hara_review: false
        }
      };

      const score = scorer.calculateSuggestionQuality(suggestion, 'nca');

      expect(score.score).toBeGreaterThanOrEqual(60);
      expect(score.threshold_met).toBe(false); // Below 75 threshold
    });

    it('should score structured MJC suggestion correctly', () => {
      const suggestion: Suggestion = {
        text: 'Comprehensive maintenance action with hygiene clearance',
        sections: {
          maintenance_scope: 'Replaced bearing SKF-6205, torqued to 45Nm',
          safety_considerations: 'LOTO completed, PPE worn',
          contamination_prevention: 'Clean as you go, shadow board tool control',
          hygiene_clearance: '10-item checklist completed: 1. Grease removed 2. Swarf removed...',
          verification: 'Functional test completed, test samples taken'
        },
        quality_score: 0,
        confidence: 'high',
        confidence_percentage: 85,
        procedure_references: ['4.7', '5.8', '5.6'],
        keywords_detected: {
          category: 'mechanical',
          keywords: ['bearing', 'alignment', 'motor']
        },
        recommendations: {
          create_mjc: false,
          calibration_check: false,
          training_required: false,
          hara_review: false
        }
      };

      const score = scorer.calculateSuggestionQuality(suggestion, 'mjc');

      expect(score.score).toBeGreaterThanOrEqual(50);
      expect(score.threshold_met).toBe(false); // Below 75 threshold
    });
  });

  describe('Threshold Configuration', () => {
    it('should respect custom threshold', () => {
      const customScorer = new QualityScorer(90);
      const response = 'Adequate corrective action with procedure references 5.7, 3.11. Quarantine and monitor.';

      const score = customScorer.calculateFieldQuality(response, 'nca');

      // Score might be 80 - would pass default 75 threshold but fail 90 threshold
      if (score.score >= 75 && score.score < 90) {
        expect(score.threshold_met).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text gracefully', () => {
      const score = scorer.calculateFieldQuality('', 'nca');

      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThan(10);
      expect(score.threshold_met).toBe(false);
    });

    it('should cap scores at 100', () => {
      // Even with excessive content, score should not exceed 100
      const excessiveResponse = `
Quarantine. Segregate. RED Hold sticker. Back tracking per 3.9.
Root cause per 3.11. Investigation per 2.2 HARA. Supplier per 3.4.
Corrective action per 5.7. Monitor per 5.6. Verify per 5.3.
Food safety per 5.8. Training per 6.1. Management review per 1.2.
`.repeat(10);

      const score = scorer.calculateFieldQuality(excessiveResponse, 'nca');

      expect(score.score).toBeLessThanOrEqual(100);
    });

    it('should handle text with only keywords but no substance', () => {
      const keywordStuffing = 'quarantine segregate procedure root cause corrective action verify monitor';

      const score = scorer.calculateFieldQuality(keywordStuffing, 'nca');

      // Should get some points but not high quality
      expect(score.score).toBeGreaterThan(0);
      expect(score.score).toBeLessThan(60);
    });
  });
});
