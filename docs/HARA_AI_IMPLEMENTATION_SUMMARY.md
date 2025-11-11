# HARA AI Implementation Summary - Quick Reference

**For:** OHiSee NCA System Development Team

**Date:** 2025-11-10

---

## Key Decision Points for AI Corrective Action System

### 1. HAZARD CLASSIFICATION (AI Step 1)

**Input:** NCA description text + process step

**AI Action:** Classify into 11 BRCGS hazard types + assign severity

**Critical Classifications:**

| If NCA Contains... | Classify As | Severity | Food Safety | Action |
|-------------------|-------------|----------|-------------|--------|
| "seal failure", "weak seal", "leaking" | Functional Integrity | **Major** | YES | Require back tracking |
| "blade chip", "metal", "glass", "pest" | Physical Contamination | **Major-Extreme** | YES | Block submission until QA approval |
| "chemical leak", "descale", "odor", "taint" | Chemical Contamination | **Moderate-Extreme** | YES | Require validation evidence |
| "bacteria", "water leak", "cooler bar leak" | Microbiological | **Major-Extreme** | YES | Trigger HARA review |
| "allergen", "trademark fraud", "hidden label" | Legality/Malicious Intervention | **Extreme** | YES | Immediate escalation |
| "scuff", "crease", "cosmetic" (no seal damage) | Quality Defect | **Minor** | NO | Standard workflow |

---

### 2. SEVERITY ASSIGNMENT (AI Step 2)

**Use BRCGS Risk Matrix:** Likelihood × Severity = Risk Rating

**Simplified Decision Tree:**

```
Food Safety Hazard (Physical/Chemical/Microbiological)?
├─> YES → Minimum Severity = Major
│   └─> Seal Integrity Failure? → Severity = Major
│   └─> Foreign Body in Sealed Product? → Severity = Extreme
│   └─> Chemical Contact with Food Surface? → Severity = Extreme
│
└─> NO → Assess Functional Impact
    └─> Affects Product Safety (zipper failure, spout leak)? → Severity = Moderate-Major
    └─> Quality/Visual Only? → Severity = Minor
```

**Close-Out Targets by Severity:**
- Extreme: 5 working days
- Major: 10 working days
- Moderate: 15 working days
- Minor/Low: 20 working days

---

### 3. CCP CONTEXT CHECK (AI Step 3)

**High-Risk Process Steps (Enhanced Monitoring Required):**

| Process Step | Hazard | AI Action When NCA Raised |
|--------------|--------|---------------------------|
| Step 5: Material Receipt | Chemical contamination from co-loading | Auto-notify QA Supervisor |
| Step 28: Zipper Hot Seal | Seal integrity, cooler bar leak | Require back tracking + water test evidence |
| Step 29: Cross Seal | Seal integrity, cooler bar leak | Require back tracking + TDP verification |
| Step 33: Side Seal | Seal integrity, cooler bar leak | Require back tracking + first-off validation |
| Steps 16, 37, 56: Quality Checks | Foreign body detection | Forensic investigation + HARA review if source unknown |

**Back Tracking Verification Requirements:**
- Auto-generate task: "Verify all cartons from [last_good_first_off_time] to [nca_detection_time] segregated with RED Hold sticker"
- Block NCA close-out until Factory Team Leader signs back tracking verification
- Link affected carton numbers to NCA record

---

### 4. ROOT CAUSE DEPTH REQUIREMENTS (AI Step 4)

**5-Why Depth Matrix:**

| Severity | Minimum Whys | Quality Score Threshold | AI Feedback if Below Threshold |
|----------|--------------|------------------------|-------------------------------|
| Extreme | 5-Why | 90% | "Root cause too generic. Must identify systemic prevention. Current score: X%. Ask: Why did [last_answer] happen? What system failed?" |
| Major | 4-5 Why | 85% | "Need more depth. Why did [last_answer] occur? Was training adequate? Is procedure clear?" |
| Moderate | 3-4 Why | 75% | "Root cause needs one more Why. What allowed [last_answer] to happen?" |
| Minor | 2-3 Why | 65% | "Acceptable but could be deeper. Consider: Was process followed?" |

**Root Cause Quality Scoring (AI Evaluation):**

```javascript
function scoreRootCause(text, severity) {
    let score = 0;

    // Specificity (0-30 points)
    if (containsGenericTerms(text, ['operator error', 'machine issue', 'mistake'])) {
        score += 5; // Generic
    } else if (containsSpecificDetails(text, ['temperature', 'pressure', 'blade', 'measurement'])) {
        score += 20; // Somewhat specific
    } else if (containsVerySpecificDetails(text, ['5°C below', 'exceeded 500m usage', 'sensor drift'])) {
        score += 30; // Highly specific
    }

    // Depth of Analysis (0-30 points)
    const whyCount = countWhyStatements(text);
    const requiredWhys = { 'Extreme': 5, 'Major': 4, 'Moderate': 3, 'Minor': 2 }[severity];
    if (whyCount >= requiredWhys) {
        score += 30;
    } else {
        score += (whyCount / requiredWhys) * 30;
    }

    // Preventability (0-20 points)
    if (containsPreventiveMeasure(text)) {
        if (isSpecificPreventiveMeasure(text)) {
            score += 20; // "Add temperature alarm to PLC"
        } else {
            score += 10; // "Be more careful"
        }
    }

    // Systemic Thinking (0-20 points)
    if (mentionsProcedureUpdate(text) || mentionsTrainingProgram(text) || mentionsEquipmentUpgrade(text)) {
        score += 20; // System-level improvement
    } else if (mentionsProcessImprovement(text)) {
        score += 10; // Process improvement
    }

    return score;
}
```

---

### 5. CORRECTIVE ACTION GENERATION (AI Step 5)

**Tiered Corrective Action Template:**

**Immediate Actions (Complete before production restart):**
- Extreme: Line stop + quarantine + inspect equipment + validation test
- Major: Back track + segregate + verify settings + run first-off
- Moderate: Check specification + adjust + verify correction
- Minor: Visual inspection + quick correction

**Short-Term Actions (5-20 days):**
- Calibration verification (if measuring device involved)
- Operator re-training (if procedure not followed)
- Maintenance repair/replacement (if equipment failure)
- Procedure clarification update (if work instruction unclear)

**Long-Term Actions (20+ days):**
- HARA review (if control measure failure)
- Equipment upgrade (if chronic issue)
- Validation study (if control effectiveness questioned)
- Trend analysis (if recurring pattern)

**Example AI-Generated Suggestions by Hazard Type:**

| Hazard Type | Immediate | Short-Term | Long-Term |
|-------------|-----------|------------|-----------|
| **Seal Integrity Failure** | Check TDP settings, run water test on 5 consecutive pouches | Calibrate temperature sensor, replace Teflon if worn | Add seal strength tester, review maintenance frequency |
| **Blade Chip Foreign Body** | Replace blade, inspect all cartons since last blade change, photograph blade condition | Update Blade Register, re-train on blade inspection | Add blade life counter alarm, review blade change frequency in HARA |
| **Cooler Bar Chemical Leak** | Stop line, flush cooling system, environmental monitoring swab | Replace cooler bar seals, update maintenance procedure | Install leak detection sensors, conduct validation study |
| **Incorrect Specification (Dimensional)** | Measure first-off with template, adjust blade/settings | Inspect blade sharpness, review Production Log Sheet trends | Evaluate specification tolerance appropriateness |

---

### 6. ESCALATION RULES (AI Step 6)

**AI MUST Block Submission and Require QA Supervisor Approval When:**

```javascript
function requiresQASupervisorApproval(nca) {
    return (
        // Rule 1: Critical severity + food safety
        (nca.severity IN ['Extreme', 'Major'] && nca.food_safety_impact === true) ||

        // Rule 2: Specific foreign body types
        (nca.hazard_type === 'Physical Contamination' &&
         nca.description.match(/glass|metal|brittle plastic|pest/i)) ||

        // Rule 3: Chemical contamination from process
        (nca.hazard_type === 'Chemical Contamination' &&
         nca.source.match(/cooler bar|descale|lubricant/i)) ||

        // Rule 4: Allergen/trademark/legality
        (nca.hazard_type IN ['Legality', 'Malicious Intervention', 'Allergen']) ||

        // Rule 5: Seal integrity with cross-contamination
        (nca.hazard_type === 'Functional Integrity' &&
         nca.process_step IN [28, 29, 31, 32, 33] &&
         nca.back_tracking_shows_cross_contamination === true) ||

        // Rule 6: Procedure change corrective action
        (nca.corrective_action.match(/procedure update|procedure change/i)) ||

        // Rule 7: Trend (>3 same failure in 7 days)
        (nca.same_failure_count_last_7_days > 3)
    );
}
```

**Factory Team Leader Back Tracking Verification Required When:**
- Severity = Major or Extreme
- Process Step = WIP (any step 8-61)
- Hazard Type = Physical, Chemical, Microbiological, or Functional Integrity

**Validation Evidence Upload Required When:**
- Seal Integrity Failure → Water test photo
- Foreign Body → Photo of contaminated product + photo of source
- Chemical Contamination → Inspection report or swab results
- Equipment Malfunction → Maintenance log entry
- Calibration Issue → Calibration certificate

---

### 7. HARA REVIEW TRIGGERS (AI Step 8)

**Auto-Create HARA Review Task When:**

| Trigger Condition | Example | Priority | Assigned To |
|-------------------|---------|----------|-------------|
| Novel failure mode (not in HARA hazard list) | "Skylight fragment falls on line" | Immediate | HARA Team Leader |
| Control measure failure (HARA preventive measure ineffective) | "Blade broke despite Blade Register maintenance" | 5 days | HARA Team Leader |
| Increased likelihood (trend: >5 same NCAs in 90 days) | "Cooler bar leaks 6x in 90 days (was Rare, now Likely)" | 10 days | HARA Team Leader |
| Severity re-classification (impact worse than assessed) | "Delamination (was Minor) now causing seal failures (Major)" | 5 days | HARA Team Leader |
| Supplier change introduces new hazard | "New film supplier has strong odor (taint hazard)" | 10 days | HARA Team Leader |
| Customer complaint trend (>3 complaints in 30 days) | "8 complaints about zipper opening force in 60 days" | 10 days | HARA Team Leader |

**HARA Review Task Auto-Generation:**

```javascript
function createHARAReviewTask(nca, trigger_reason) {
    const task = {
        nca_id: nca.id,
        trigger_reason: trigger_reason,
        assigned_to: HARA_TEAM_LEADER_ID, // Operations Manager
        priority: nca.severity === 'Extreme' ? 'Immediate' :
                  nca.severity === 'Major' ? '5 days' : '10 days',
        hara_step_affected: nca.process_step,
        status: 'Pending',
        briefing: {
            affected_process_steps: [nca.process_step],
            hazard_types: [nca.hazard_type],
            current_control_measures: getControlMeasuresFromHARA(nca.process_step),
            proposed_enhancement: generateControlMeasureEnhancement(nca),
            recommended_risk_rerating: calculateNewRiskRating(nca)
        }
    };

    // Block NCA close-out until HARA review completed or waived
    nca.hara_review_pending = true;
    nca.can_close = false;

    return task;
}
```

---

### 8. CLOSE-OUT ENFORCEMENT (AI Step 9)

**AI MUST Block Close-Out When:**

```javascript
function canCloseNCA(nca) {
    const blockers = [];

    // Check 1: Root cause quality score
    const minScore = { 'Extreme': 90, 'Major': 85, 'Moderate': 75, 'Minor': 65, 'Low': 50 }[nca.severity];
    if (nca.root_cause_quality_score < minScore) {
        blockers.push(`Root cause quality score too low: ${nca.root_cause_quality_score}% (required: ${minScore}%)`);
    }

    // Check 2: Validation evidence
    if (nca.requires_validation_evidence && !nca.validation_evidence_uploaded) {
        blockers.push('Validation evidence required but not uploaded');
    }

    // Check 3: Back tracking verification
    if (nca.requires_back_tracking_verification && !nca.back_tracking_verified_at) {
        blockers.push('Factory Team Leader back tracking verification required');
    }

    // Check 4: QA Supervisor approval
    if (nca.requires_qa_supervisor_approval && !nca.qa_supervisor_approved_at) {
        blockers.push('QA Supervisor approval required');
    }

    // Check 5: HARA review pending
    if (nca.hara_review_pending && nca.hara_review_status !== 'Completed') {
        blockers.push('HARA review task pending completion');
    }

    // Check 6: Disposition determined
    if (!nca.disposition || nca.disposition === '') {
        blockers.push('Disposition not determined (Reject/Rework/Concession)');
    }

    return {
        can_close: blockers.length === 0,
        blockers: blockers
    };
}
```

**Overdue NCA Alert System:**

```javascript
function checkOverdueNCAs() {
    const closeOutDays = { 'Extreme': 5, 'Major': 10, 'Moderate': 15, 'Minor': 20, 'Low': 20 };

    const overdueNCAs = NCAs.filter(nca => {
        const targetDate = addWorkingDays(nca.created_at, closeOutDays[nca.severity]);
        return today() > targetDate && nca.status !== 'Closed';
    });

    // Weekly alert to Commercial Manager
    if (getDayOfWeek(today()) === 'Monday') {
        sendEmail({
            to: COMMERCIAL_MANAGER_EMAIL,
            subject: `NCA Register Review: ${overdueNCAs.length} Overdue NCAs`,
            body: generateOverdueNCAsReport(overdueNCAs)
        });
    }

    return overdueNCAs;
}
```

---

## Database Schema Quick Reference

**Essential NCA Table Columns:**

```sql
ALTER TABLE ncas ADD COLUMN hazard_type_id UUID REFERENCES hazard_types(id);
ALTER TABLE ncas ADD COLUMN severity_level TEXT CHECK (severity_level IN ('Extreme', 'Major', 'Moderate', 'Minor', 'Low'));
ALTER TABLE ncas ADD COLUMN likelihood_level TEXT CHECK (likelihood_level IN ('Almost Certain', 'Likely', 'Possible', 'Unlikely', 'Rare'));
ALTER TABLE ncas ADD COLUMN risk_rating TEXT CHECK (risk_rating IN ('E', 'H', 'M', 'L'));
ALTER TABLE ncas ADD COLUMN food_safety_impact BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN ccp_related BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN process_step INTEGER; -- Steps 1-61 from BRCGS HARA
ALTER TABLE ncas ADD COLUMN root_cause_quality_score INTEGER CHECK (root_cause_quality_score BETWEEN 0 AND 100);
ALTER TABLE ncas ADD COLUMN root_cause_depth INTEGER; -- Number of Whys (1-5)
ALTER TABLE ncas ADD COLUMN requires_validation_evidence BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN validation_evidence_uploaded BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN requires_back_tracking_verification BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN back_tracking_verified_by UUID REFERENCES users(id);
ALTER TABLE ncas ADD COLUMN back_tracking_verified_at TIMESTAMP;
ALTER TABLE ncas ADD COLUMN requires_qa_supervisor_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN qa_supervisor_approved_by UUID REFERENCES users(id);
ALTER TABLE ncas ADD COLUMN qa_supervisor_approved_at TIMESTAMP;
ALTER TABLE ncas ADD COLUMN hara_review_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE ncas ADD COLUMN hara_review_task_id UUID REFERENCES hara_review_tasks(id);
ALTER TABLE ncas ADD COLUMN close_out_target_date DATE; -- Computed from severity
ALTER TABLE ncas ADD COLUMN same_failure_count_last_7_days INTEGER DEFAULT 0;
ALTER TABLE ncas ADD COLUMN same_failure_count_last_90_days INTEGER DEFAULT 0;

-- Generated column for close-out eligibility
ALTER TABLE ncas ADD COLUMN can_close BOOLEAN GENERATED ALWAYS AS (
    root_cause_quality_score >= CASE severity_level
        WHEN 'Extreme' THEN 90
        WHEN 'Major' THEN 85
        WHEN 'Moderate' THEN 75
        WHEN 'Minor' THEN 65
        ELSE 50 END
    AND (NOT requires_validation_evidence OR validation_evidence_uploaded = TRUE)
    AND (NOT requires_back_tracking_verification OR back_tracking_verified_at IS NOT NULL)
    AND (NOT requires_qa_supervisor_approval OR qa_supervisor_approved_at IS NOT NULL)
    AND (NOT hara_review_triggered OR hara_review_status = 'Completed')
    AND disposition IS NOT NULL
) STORED;
```

**Hazard Types Reference Table (11 BRCGS Types):**

```sql
CREATE TABLE hazard_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brcgs_category TEXT NOT NULL,
    food_safety_impact BOOLEAN DEFAULT TRUE,
    default_severity TEXT CHECK (default_severity IN ('Extreme', 'Major', 'Moderate', 'Minor', 'Low')),
    description TEXT
);

-- Seed data (11 BRCGS hazard types)
INSERT INTO hazard_types (code, name, brcgs_category, food_safety_impact, default_severity) VALUES
('MICRO', 'Microbiological Contamination', 'Microbiological', TRUE, 'Extreme'),
('PHYS', 'Physical Contamination', 'Physical', TRUE, 'Major'),
('CHEM_TAINT', 'Chemical Contamination - Taint/Odor', 'Chemical', TRUE, 'Moderate'),
('CHEM_MIGRATION', 'Chemical Contamination - Migration', 'Chemical', TRUE, 'Extreme'),
('CHEM_ALLERGEN', 'Chemical Contamination - Allergen', 'Chemical', TRUE, 'Extreme'),
('RECYCLED', 'Recycled Material Issues', 'Recycled Materials', TRUE, 'Major'),
('LEGAL', 'Legality/Regulatory Non-Compliance', 'Legality', TRUE, 'Extreme'),
('CONSUMER_SAFETY', 'Consumer Safety Defects', 'Consumer Safety', TRUE, 'Major'),
('FUNC_INTEGRITY', 'Functional Integrity Failure', 'Functional Integrity', TRUE, 'Major'),
('MIGRATION_UNINTENDED', 'Unintended Migration', 'Migration', TRUE, 'Extreme'),
('MALICIOUS', 'Malicious Intervention/Tampering', 'Malicious Intervention', TRUE, 'Extreme'),
('FRAUD', 'Raw Material Fraud', 'Fraud', TRUE, 'Extreme');
```

---

## AI Model Integration Points

**API Endpoint Structure:**

```javascript
// POST /api/nca/classify
// Input: { description: string, process_step: number, product_type: string }
// Output: { hazard_type_id: uuid, severity: string, likelihood: string,
//           food_safety_impact: boolean, ccp_related: boolean, confidence: float }

// POST /api/nca/evaluate-root-cause
// Input: { root_cause_text: string, severity: string }
// Output: { quality_score: number, depth: number, feedback: string,
//           suggested_questions: string[] }

// POST /api/nca/suggest-corrective-actions
// Input: { nca_id: uuid, hazard_type: string, severity: string, process_step: number }
// Output: { immediate: string[], short_term: string[], long_term: string[],
//           hara_review_recommended: boolean, hara_review_reason: string }

// POST /api/nca/check-close-eligibility
// Input: { nca_id: uuid }
// Output: { can_close: boolean, blockers: string[],
//           next_actions: string[] }
```

---

## Testing Checklist

**Critical Test Cases:**

1. **Extreme Severity NCA** (e.g., "Glass chip in sealed pouch")
   - [ ] AI classifies as Physical Contamination, Extreme Severity
   - [ ] System blocks submission until QA Supervisor approval
   - [ ] Back tracking task auto-generated
   - [ ] Validation evidence upload required (photo)
   - [ ] HARA review task created with "Novel failure mode" reason
   - [ ] Close-out blocked until all verifications complete
   - [ ] Close-out target date = 5 working days

2. **Major Severity Seal Integrity NCA** (e.g., "Weak side seal, Step 33")
   - [ ] AI classifies as Functional Integrity, Major Severity
   - [ ] CCP-related flag set (Step 33 is high-risk control point)
   - [ ] Back tracking verification required
   - [ ] Water test evidence upload required
   - [ ] Root cause quality score threshold = 85%
   - [ ] If score <85%, AI provides feedback with suggested Why questions
   - [ ] Close-out target date = 10 working days

3. **Moderate Severity Dimensional Defect** (e.g., "Pouch height +3mm")
   - [ ] AI classifies as Functional Integrity, Moderate Severity
   - [ ] No QA approval required (Team Leader concession acceptable)
   - [ ] Root cause quality score threshold = 75%
   - [ ] Validation evidence = first-off measurement photo
   - [ ] Close-out target date = 15 working days

4. **Minor Severity Cosmetic Defect** (e.g., "Scuff marks on surface")
   - [ ] AI classifies as Quality Defect, Minor Severity
   - [ ] No escalation required
   - [ ] Root cause quality score threshold = 65%
   - [ ] No validation evidence required
   - [ ] Close-out target date = 20 working days

5. **HARA Review Trigger Test** (5 same NCAs in 90 days)
   - [ ] AI detects trend: same_failure_count_90_days > 5
   - [ ] HARA review task auto-created
   - [ ] Task assigned to HARA Team Leader (Operations Manager)
   - [ ] Trigger reason: "Control measure failure - trend increase"
   - [ ] NCA close-out blocked until HARA review completed
   - [ ] Email notification sent to HARA Team Leader

---

## Success Metrics Dashboard

**KPIs to Track:**

1. **Classification Accuracy:** AI hazard type prediction vs. QA Supervisor final determination (Target: ≥95%)
2. **Severity Prediction Accuracy:** AI severity level vs. final severity (Target: ≥90%)
3. **Root Cause Quality Score Correlation:** AI score vs. human expert score (Target: R² ≥0.85)
4. **Corrective Action Acceptance Rate:** User feedback "Was suggestion helpful?" (Target: ≥85%)
5. **HARA Review Trigger Precision:** % of triggered reviews resulting in HARA update (Target: ≥80%)
6. **Close-Out Compliance:** % NCAs closed within target days (Target: ≥95%)
7. **Validation Evidence Compliance:** % Critical NCAs with evidence uploaded (Target: 100%)
8. **Overdue NCA Reduction:** Trend over time (Target: -30% YoY)

---

## Quick Decision Flowchart for Developers

```
User Submits NCA
    ↓
AI Classifies Hazard Type + Severity
    ↓
Severity = Extreme/Major + Food Safety = YES?
    YES → Block Submission → Require QA Approval
    NO → Continue
    ↓
Process Step in [5, 28, 29, 33, 16, 37, 56]?
    YES → Set ccp_related = TRUE → Require Back Tracking
    NO → Continue
    ↓
Evaluate Root Cause Quality Score
    Score < Threshold? → Provide Feedback → Block Close-Out
    Score ≥ Threshold? → Continue
    ↓
Generate Corrective Action Suggestions (Tiered)
    ↓
Check HARA Review Triggers
    Novel Failure Mode OR Trend OR Control Failure?
        YES → Create HARA Review Task → Block Close-Out
        NO → Continue
    ↓
Determine Validation Evidence Requirements
    Critical NCA? → Require Evidence Upload
    ↓
Calculate Close-Out Target Date (5/10/15/20 days)
    ↓
User Completes NCA
    ↓
System Checks Close-Out Eligibility
    All Requirements Met? → Allow Close-Out
    Missing Requirements? → Block + Show Blockers
```

---

**END OF QUICK REFERENCE**

For full details, see: `HARA_AI_CORRECTIVE_ACTION_DECISION_FRAMEWORK.md`
