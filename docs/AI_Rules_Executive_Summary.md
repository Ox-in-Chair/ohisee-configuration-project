# AI Corrective Action Rules - Executive Summary

**Document Version:** 1.0
**Created:** 2025-11-10
**For:** Development Team Implementation
**See Full Rules:** AI_Corrective_Action_Rules.md

---

## PURPOSE

Define how AI assists users in writing BRCGS-compliant corrective actions for NCAs (Non-Conformance Advice) and MJCs (Maintenance Job Cards) by analyzing issue descriptions and suggesting procedure-aligned responses.

---

## KEY PRINCIPLES

1. **AI SUGGESTS, USER DECIDES**: AI provides intelligent suggestions. Users can accept, edit, or reject.
2. **PROCEDURE-ALIGNED**: All suggestions reference specific BRCGS Section 5 procedures.
3. **QUALITY-SCORED**: Every suggestion scored 0-100 based on completeness and compliance.
4. **CONTEXT-AWARE**: AI analyzes issue type, machine status, urgency, and history.

---

## NCA CORRECTIVE ACTION STRUCTURE

### What AI Generates:

1. **Immediate Correction** (what to do NOW)
   - Quarantine affected product
   - Apply RED Hold stickers
   - Back tracking if cross-contamination
   - Segregation to NCA holding area

2. **Root Cause Category** (why it happened)
   - Analyzes description for keywords
   - Categorizes: Equipment, Process, Material, Operator, Contamination, Calibration
   - Suggests most likely cause with confidence level

3. **Corrective Action** (prevent recurrence)
   - Procedure-specific actions (5.1, 5.3, 5.6, 5.7, 5.8)
   - Integration with calibration, training, maintenance
   - HARA review triggers if systemic issue

4. **Verification Method** (how to confirm effectiveness)
   - Measurable criteria
   - Timeline defined
   - Responsibility assigned

### NCA Types Handled:

| Type | AI Focus | Key Procedures |
|------|----------|----------------|
| **Raw Material** | Supplier NCA, incoming inspection enhancement | 5.7, 5.3, 3.4, 5.1 |
| **Finished Goods** | Process control, equipment calibration, operator training | 5.7, 5.3, 5.6, 6.1 |
| **WIP** | Line clearance emphasis, production stop, back tracking | 5.7, 5.3, 3.9 |
| **Incident** | Foreign body control, contamination response, immediate quarantine | 5.8, 5.7, 5.8.1, 5.8.2, 5.8.3.1 |
| **Other** | Training, storage, process, equipment, documentation | 6.1, 5.3, 5.1, 2.0 |

### Special Handling:

**IF machine_status = 'down':**
- AI emphasizes downtime impact
- Operations Manager notification
- MJC creation suggestion
- Production schedule assessment

**IF cross_contamination = true:**
- Mandatory back tracking verification
- Team Leader signature requirement
- Traceability emphasis (3.9)

**IF disposition_rework = true:**
- AI enhances rework instructions with quality checks
- Acceptance criteria specified
- Skills Matrix competency requirements

---

## MJC MAINTENANCE ACTION STRUCTURE

### What AI Generates:

1. **Maintenance Scope** (what needs to be done)
   - Specific tasks based on maintenance type (Electrical/Mechanical/Pneumatical)
   - Parts required
   - Safety procedures (LOTO, PPE, energy isolation)

2. **Safety Considerations**
   - Lock Out Tag Out (LOTO) procedures
   - Adjacent line protection
   - PPE requirements

3. **Contamination Prevention** (5.8)
   - Clean as You Go Policy
   - Tool accountability (shadow board)
   - Swarf/debris management
   - Temporary modification recording

4. **Post-Maintenance Verification**
   - Functional test requirements
   - Quality verification (test samples)
   - Calibration check if applicable (5.6)

5. **Hygiene Clearance (10-Item Checklist)**
   - AI ensures all 10 items from 4.7F2 addressed
   - QA/Supervisor signature requirement
   - Production resume criteria

### Maintenance Categories:

| Category | AI Focus | Key Emphasis |
|----------|----------|--------------|
| **Reactive** | Immediate response, root cause diagnosis, parts identification | Downtime reduction, safety, contamination control |
| **Planned** | Equipment-specific checklist reference (4.7F5-F12), PM effectiveness | Scheduling optimization, preventive action |

### Special Handling:

**IF temporary_repair = true:**
- 14-day close out warning
- Follow-up MJC scheduling
- Production Log Sheet recording
- Day 10/13/14 reminders

**IF machine_status = 'down' AND urgency = 'critical':**
- <1 hour response time emphasis
- Maintenance Manager notification
- Parts expediting authorized
- Overtime pre-approved

**IF maintenance affects measuring equipment:**
- Calibration Procedure 5.6 integration
- Window of exposure assessment
- Product traceability if out-of-calibration
- Equipment failure risk assessment (5.6F2)

---

## AI QUALITY SCORING (0-100 SCALE)

### NCA Corrective Action Score:

| Criteria | Weight | What AI Checks |
|----------|--------|----------------|
| Immediate Correction Completeness | 20% | Quarantine, hold sticker, back tracking, segregation |
| Root Cause Specificity | 20% | Accurate categorization from keywords |
| Preventive Action Clarity | 25% | Specific, measurable, prevents recurrence |
| Procedure Integration | 20% | Correct BRCGS references (2+ procedures) |
| Verification Measurability | 15% | Timeline, success criteria, responsibility |

**Total: 0-100 points**

### MJC Maintenance Action Score:

| Criteria | Weight | What AI Checks |
|----------|--------|----------------|
| Maintenance Scope Specificity | 20% | Detailed tasks, parts, not generic |
| Safety Emphasis | 20% | LOTO, PPE, energy isolation |
| Contamination Prevention | 20% | Clean as You Go, tool tracking, swarf management |
| Hygiene Clearance Completeness | 25% | All 10 items, QA signature, production resume |
| Post-Maintenance Verification | 15% | Functional test, quality check, calibration |

**Total: 0-100 points**

### Score Interpretation:

- **90-100**: Excellent - Accept as-is
- **75-89**: Good - Minor edits recommended
- **60-74**: Acceptable - User review required
- **Below 60**: Inadequate - Manual input required

---

## KEYWORD ANALYSIS

### NCA Description Keywords:

| Category | Keywords Detected | AI Action |
|----------|-------------------|-----------|
| **Equipment** | machine, motor, bearing, seal, wear, breakdown | Suggest MJC, calibration check, PM review |
| **Process** | specification, tolerance, out of spec, drift | Review Job Card, Production Log, training |
| **Material** | raw material, film, supplier, batch, defect | Supplier NCA, incoming inspection |
| **Operator** | operator error, training, forgot, missed | Skills Matrix review, retraining |
| **Contamination** | foreign body, glass, metal, blade, cross-contamination | Incident procedures, registers, back tracking |
| **Calibration** | measurement, scale, gauge, accuracy | Calibration 5.6, window of exposure |

### MJC Description Keywords:

| Category | Keywords Detected | AI Action |
|----------|-------------------|-----------|
| **Urgent** | broken, failed, stopped, emergency, critical | Safety emphasis, downtime impact |
| **Safety-Critical** | guard, interlock, e-stop, safety, hazard | Extra safety, management notification |
| **Contamination Risk** | leak, oil, grease, metal, debris, missing | Enhanced hygiene clearance, foreign body control |
| **Calibration Equipment** | scale, gauge, measuring, testing, counting | Calibration integration, window of exposure |
| **Electrical** | electrical, motor, power, circuit, PLC | Electrical safety, qualified technician |
| **Mechanical** | bearing, chain, belt, alignment, lubrication | Torque specs, alignment procedures |
| **Pneumatic** | air, pneumatic, cylinder, valve, pressure | Pressure verification, leak detection |

---

## EXAMPLE: AI SUGGESTION WORKFLOW

### Step 1: User Creates NCA
```
NC Type: Finished Goods
Description: "Seal width measuring 8mm on pouches from Cartons 101-150.
             Specification is 10mm ±1mm. Detected at 14:30 by operator."
Machine Status: Down
Cross Contamination: No
```

### Step 2: AI Analyzes Description
- **Keywords detected**: "seal width", "measuring", "specification", "cartons", "operator"
- **Category**: Equipment (seal bar) + Calibration (measurement)
- **Confidence**: High (85%)
- **Urgency**: Machine down = high priority

### Step 3: AI Generates Suggestion
```
QUALITY SCORE: 92/100 (Excellent)
CONFIDENCE: High (85%)

IMMEDIATE CORRECTION:
- Quarantine Cartons 101-150 (seal width 8mm, specification 10mm ±1mm)
- Apply RED Hold sticker with NCA-[auto-number]
- Production STOPPED at 14:30
- Review 1st off sample (shift start): Verify if conforming
- Check retained samples at 2-hour intervals for process drift
- Back tracking: Identify affected period from Production Log Sheet
- Disposition: Recommend REWORK (re-seal)

ROOT CAUSE: Equipment calibration drift
- Seal bar temperature decreased during production run
- Possible cooling system malfunction
- Operator did not detect drift during in-process checks

CORRECTIVE ACTION:
1. Equipment:
   - Create Maintenance Job Card MJC-[auto-number] for seal bar repair
   - Verify seal bar calibration per Procedure 5.6
   - Post-Hygiene Clearance required before production resume

2. Process Control:
   - Retrain operator on in-process check frequency (Procedure 5.3)
   - Increase seal width check frequency: Every 30 minutes for next 10 runs
   - Verify Skills Matrix competency for in-process checks (6.1)

3. Preventive:
   - Review Preventive Maintenance Plan for seal bar cooling system
   - Consider increasing PM frequency (currently annual → quarterly)
   - Add seal bar temperature to Production Log Sheet monitoring

VERIFICATION:
- MJC closed with hygiene clearance
- Seal gauge calibration verified (5.6)
- Operator retraining completed
- Monitor next 10 runs: Seal width within tolerance 100%
- 30-day follow-up: No repeat seal width NCAs
- Management Review: Assess PM interval change

Procedure References: 5.7, 5.3, 5.6, 6.1, 4.7
```

### Step 4: User Options
- ✅ **Accept**: Save to `corrective_action` field as-is
- ✏️ **Edit**: Modify suggestion before saving
- ❌ **Reject**: Write manually
- ⭐ **Rate**: Provide feedback for AI learning

---

## PROCEDURE REFERENCE MAPPING

| Issue Type | Required Procedures |
|------------|---------------------|
| Raw material NC | 5.7, 5.3, 3.4, 5.1 |
| Finished goods NC | 5.7, 5.3, 5.6, 6.1 |
| WIP NC | 5.7, 5.3, 3.9 |
| Foreign body incident | 5.8, 5.7, 5.8.1, 5.8.2 |
| Equipment failure | 4.7, 5.6, 5.3, 5.7 |
| Calibration issue | 5.6, 5.6F2, 5.7, 3.9 |
| Water disruption | 5.8.3.1, 5.3, 4.3 |
| Training issue | 6.1, 5.3, 3.11 |
| Design issue | 5.1, 2.0, 5.2, 3.7 |

---

## DATABASE INTEGRATION

### NCA Table Fields Used by AI:
```sql
-- INPUT (AI analyzes):
nc_description           -- Primary analysis (minimum 100 characters)
nc_type                  -- raw-material, finished-goods, wip, incident, other
nc_type_other            -- Free text if nc_type = 'other'
machine_status           -- down, operational (affects urgency)
machine_down_since       -- Calculate downtime duration
cross_contamination      -- Mandatory back tracking if true
disposition_rework       -- Enhance rework instructions
disposition_concession   -- Emphasize authorization

-- OUTPUT (AI populates):
corrective_action        -- AI-generated suggestion saved here
```

### MJC Table Fields Used by AI:
```sql
-- INPUT (AI analyzes):
description_required     -- Primary analysis (minimum 50 characters)
maintenance_category     -- reactive, planned
maintenance_type_*       -- electrical, mechanical, pneumatical
machine_status           -- down, operational (affects urgency)
urgency                  -- critical, high, medium, low
temporary_repair         -- 14-day follow-up if true

-- OUTPUT (AI populates):
maintenance_performed    -- AI-generated suggestion saved here
```

---

## VALIDATION BEFORE PRESENTING TO USER

✅ **AI checks before showing suggestion:**
1. Minimum character count (150+ for corrective action)
2. At least 2 procedure references included
3. Immediate correction section present (NCAs)
4. Hygiene clearance section present (MJCs)
5. Verification method includes timeline/measurable criteria
6. Quality score calculated (0-100)
7. Confidence level determined (High/Medium/Low)

---

## USER FEEDBACK CAPTURE

```sql
-- Track AI suggestion effectiveness:
CREATE TABLE ai_suggestion_feedback (
  id UUID PRIMARY KEY,
  nca_id UUID REFERENCES ncas(id),
  mjc_id UUID REFERENCES mjcs(id),
  suggestion_type TEXT,         -- 'corrective_action' or 'maintenance_performed'
  ai_suggestion TEXT,            -- What AI suggested
  user_edited_version TEXT,      -- What user changed it to
  suggestion_accepted BOOLEAN,   -- Did user accept as-is?
  user_rating INTEGER,           -- 1-5 stars
  user_feedback TEXT,            -- Optional comments
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Feedback Used For:
- AI model training (what works, what doesn't)
- Quarterly performance review
- Procedure update identification
- Quality score calibration

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Core AI Functionality
- [ ] NCA description keyword analysis
- [ ] Root cause categorization
- [ ] Corrective action template generation
- [ ] Procedure reference mapping
- [ ] Quality score calculation

### Phase 2: MJC Functionality
- [ ] MJC description keyword analysis
- [ ] Maintenance scope generation
- [ ] Hygiene clearance checklist (10 items)
- [ ] Safety emphasis based on urgency
- [ ] Calibration integration (5.6)

### Phase 3: Advanced Features
- [ ] Machine status integration (down/operational)
- [ ] Cross-contamination handling
- [ ] Temporary repair tracking (14-day follow-up)
- [ ] Window of exposure calculation (calibration failures)
- [ ] Historical data learning

### Phase 4: User Experience
- [ ] Accept/Edit/Reject workflow
- [ ] User rating system (1-5 stars)
- [ ] Feedback capture for AI training
- [ ] Confidence level display
- [ ] Quality score visualization

### Phase 5: Continuous Improvement
- [ ] Quarterly suggestion acceptance rate review
- [ ] Annual procedure update integration
- [ ] User feedback pattern analysis
- [ ] AI model retraining based on effective historical corrective actions

---

## SUCCESS METRICS

### Operational:
- **Suggestion Acceptance Rate**: Target >75%
- **Quality Score Average**: Target >80/100
- **Time Savings**: Target 50% reduction in corrective action writing time
- **User Satisfaction**: Target 4+ stars average rating

### Compliance:
- **Procedure Reference Accuracy**: Target 100%
- **Corrective Action Completeness**: Target 90%+ meet minimum requirements
- **Audit Findings**: Target zero AI-related non-conformances

### Continuous Improvement:
- **Recurrence Rate Reduction**: Monitor if NCAs with AI suggestions have lower repeat rates
- **Effective Corrective Action Rate**: Track closure within 20 working days
- **NCA Trend Analysis**: Identify patterns and systemic issues more quickly

---

## CONTACT & SUPPORT

**Document Owner**: Operations Manager
**Technical Implementation**: Development Team
**BRCGS Compliance**: Systems Coordinator, Commercial Manager
**Questions/Feedback**: [Contact details]

---

**FULL RULES DOCUMENT**: C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\docs\AI_Corrective_Action_Rules.md

**END OF EXECUTIVE SUMMARY**
