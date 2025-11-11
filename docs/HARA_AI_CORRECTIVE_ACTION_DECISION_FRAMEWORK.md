# HARA-Integrated AI Corrective Action Framework for NCA System

**Document Purpose:** Define risk-appropriate AI corrective action suggestions based on BRCGS Section 2 HARA severity levels

**Prepared For:** Kangopak (Pty) Ltd - OHiSee NCA System AI Integration

**Date:** 2025-11-10

**Reference Documents:**
- BRCGS Section 2.2 Hazard and Risk Management Procedure (Rev 11)
- 2.0 BRC Hazard and Risk Assessment (Rev 28)
- 5.7 Control of Non-Conforming Product Procedure (Rev 9)
- 5.7F1 BRC Non Conformance Advice (Rev 7)

---

## 1. HAZARD CLASSIFICATION MATRIX: NCA to HARA Hazard Mapping

This mapping connects NCA categories to the 11 BRCGS hazard types and assigns severity levels based on BRCGS Section 2 Risk Assessment Matrix.

### 1.1 Hazard Type Classification

| NCA Category | BRCGS Hazard Type(s) | Severity Level | Food Safety Impact | Example |
|--------------|---------------------|----------------|-------------------|---------|
| **Raw Material - Foreign Body** | Physical Contamination | **Major to Extreme** | YES - Direct food contact risk | Glass, metal fragments, pest contamination in film |
| **Raw Material - Chemical** | Chemical Contamination (migration, taint, odor) | **Moderate to Extreme** | YES - Migration to food contact surface | Non-food grade inks, chemical residue on film |
| **Raw Material - Microbiological** | Microbiological Contamination | **Major to Extreme** | YES - Direct contamination of packaging | Bacterial contamination from cooler bar leaks |
| **Raw Material - Specification** | Legality, Functional Integrity | **Minor to Major** | CONDITIONAL - Depends on functional impact | Incorrect gauge, delamination affecting seal integrity |
| **Raw Material - Trademark Infringement** | Legality, Consumer Safety, Malicious Intervention | **Moderate to Extreme** | CONDITIONAL - Hidden allergens, misleading labels | Fraudulent artwork, hidden allergen information |
| **WIP - Seal Integrity Failure** | Functional Integrity, Consumer Safety | **Major to Extreme** | YES - Package leak = product contamination | Weak side seal, zipper crush failure, 3-point seal defect |
| **WIP - Dimensional Defect** | Functional Integrity | **Minor to Moderate** | NO - Unless affects seal integrity | Pouch width/height +/-1mm outside tolerance |
| **WIP - Foreign Body** | Physical Contamination | **Major to Extreme** | YES - Introduced during manufacturing | Blade chips, Teflon strands, gusset punch-outs in sealed pouch |
| **WIP - Chemical Contamination** | Chemical Contamination | **Major to Extreme** | YES - Process chemical contact | Descale solution leak from cooler bar onto product |
| **Finished Goods - Functional Defect** | Functional Integrity, Unintended Use | **Moderate to Major** | CONDITIONAL - Depends on end use | Zipper not locking, euro slot misaligned, weak tear nick |
| **Finished Goods - Visual/Quality** | Quality Defect | **Minor to Moderate** | NO - Unless masks safety issue | Scuff marks, creases, clarity issues (if not safety-related) |
| **Finished Goods - Misprint/Artwork** | Legality, Consumer Safety (allergen), Malicious Intervention | **Moderate to Extreme** | CONDITIONAL - Hidden allergens = Extreme | Ink splash covering allergen warning, trademark fraud |
| **Incident - Equipment Malfunction** | Physical, Chemical, Microbiological (depends on failure mode) | **Moderate to Extreme** | CONDITIONAL - CCP equipment = Extreme | Cooler bar leak, blade breakage, Teflon degradation |
| **Incident - Process Out of Spec** | Functional Integrity, Consumer Safety | **Moderate to Major** | CONDITIONAL - If affects CCPs | Temperature/dwell/pressure outside critical limits |
| **Incident - Contamination Event** | Physical, Chemical, Microbiological | **Major to Extreme** | YES - Cross-contamination risk | Pest sighting, chemical spill, water leak onto product |
| **Incident - Storage/Handling** | Physical (pest), Chemical (cross-contamination), Malicious Intervention | **Moderate to Major** | CONDITIONAL - Depends on exposure | Damaged pallet = wood chips, storage near chemicals |

### 1.2 Severity Definitions (from BRCGS HARA Study)

| Severity Level | Definition | Impact to Product Safety/Legality | NCA Close-Out Target |
|----------------|------------|-----------------------------------|---------------------|
| **Extreme (E)** | Life-threatening injury, regulatory action, product recall, allergen exposure | Direct threat to consumer safety, legal compliance failure | 5 working days |
| **Major (Ma)** | Serious injury potential, product withdrawal, functional failure causing safety risk | High risk to consumer safety or product integrity | 10 working days |
| **Moderate (Mo)** | Minor injury potential, customer complaint, functional impact without safety risk | Medium impact on quality, legality, or brand reputation | 15 working days |
| **Minor (Mi)** | No injury potential, cosmetic defect, minor functional impact | Low impact, internal quality standard breach | 20 working days |
| **Low (L)** | Negligible impact, no specification breach | Minimal or no actual impact | 20 working days |

---

## 2. CCP MONITORING CONTEXT: Enhanced AI Requirements

### 2.1 CCP-Related NCA Identification

**CCP Determination Questions (from BRCGS 2.0 HARA):**
- Q1: Do preventive measures exist for the identified hazard?
- Q2: Is this step specifically designed to eliminate or reduce the hazard to an acceptable level?
- Q3: Could contamination occur or increase to unacceptable levels?
- Q4: Will a subsequent step eliminate or reduce the hazard to an acceptable level?
- Q5: Is this a Critical Control Point (CCP)?

**Current CCPs Identified in Kangopak HARA Study:**
Based on review of 2.0 BRC HARA (Rev 28), **NO formal CCPs were identified** using the CCP Decision Tree (all Q1-Q5 columns show "-" indicating GMPs are sufficient for control).

**However**, the following process steps are **high-risk control points** requiring enhanced NCA management:

| Process Step | Hazard Controlled | Control Measure | AI Escalation Trigger |
|--------------|-------------------|-----------------|----------------------|
| **Material Receipt (Step 5)** | Chemical contamination from co-loading | Vehicle inspection, BRC/FDA supplier certification | Chemical contamination NCA → Immediate QA Supervisor notification |
| **Zipper Insertion & Hot Seal (Step 28)** | Weak seal strength, cooler bar leaks (microbiological, chemical) | Temperature/Dwell/Pressure (TDP) monitoring, first-off samples, interval checks | Seal integrity failure NCA → Require back tracking, batch quarantine |
| **Cross Seal - Gusset & Straight Seals (Step 29)** | Weak seal strength, cooler bar chemical leaks | TDP monitoring, maintenance condition monitoring | Seal integrity failure NCA → Require validation evidence before release |
| **Side Seal & Cooler Bars (Step 33)** | Weak seal strength, cooler bar contamination | TDP monitoring, environmental monitoring | Seal integrity failure NCA → Immediate line stop verification |
| **Product Checked for Defects (Steps 16, 37, 56)** | Foreign body (glass, brittle plastic, blades), seal integrity | Short Interval Control, visual inspection, bright lights | Foreign body NCA → Forensic investigation, HARA review recommendation |

### 2.2 CCP-Related NCA Mandatory Requirements

**When AI detects NCA relates to above high-risk control points:**

1. **Immediate Supervisor Notification:** YES - Auto-escalate to QA Supervisor within system
2. **Back Tracking Verification:** REQUIRED - AI must validate Factory Team Leader signature on NCA before allowing close-out
3. **Batch Quarantine Alert:** Auto-generate RED "Hold" sticker traceability report for all potentially affected cartons
4. **Corrective Action Validation:** Require validation evidence upload (e.g., re-test results, calibration verification)
5. **HARA Review Trigger:** Flag for HARA team review if novel failure mode or control measure effectiveness questioned

### 2.3 Enhanced AI Enforcement for Seal Integrity (Critical Functional Hazard)

**Scenario:** WIP NCA raised for "Weak Zipper Crush Seal" (Step 31)

**AI Response Protocol:**
1. **Hazard Classification:** Functional Integrity - Major Severity (package leak = product contamination risk)
2. **Immediate Correction Validation:**
   - Verify back tracking completed (YES/NO required, not optional)
   - Verify all affected cartons segregated with RED Hold sticker
   - Verify NCA number recorded on Production Log Sheet with carton numbers and time of occurrence
3. **Root Cause Analysis Requirement:** Minimum 3-Why depth (targeting 5-Why for seal integrity issues)
   - Example Questions AI Should Require:
     - **Why did seal fail?** "Temperature too low at 190°C"
     - **Why was temperature too low?** "Operator did not verify first-off sample temperature setting"
     - **Why was first-off not verified?** "Short Interval Control checklist not followed"
4. **Corrective Action Suggestions (Risk-Appropriate):**
   - **Immediate:** Re-check temperature setting, run new first-off sample with water test
   - **Short-term:** Re-train operator on Short Interval Control (SIC) adherence, attach training record to NCA
   - **Long-term:** Add temperature alarm to machine PLC to alert if setting drifts from job card specification
5. **Verification Requirement:** Before NCA close-out, require:
   - Upload water test results showing seal integrity restored
   - Factory Team Leader signature confirming back tracking completed
   - Maintenance log entry if TDP equipment issue identified

---

## 3. ROOT CAUSE DEPTH REQUIREMENTS BY HAZARD SEVERITY

### 3.1 5-Why Analysis Depth Matrix

| NCA Severity | Minimum Why Depth | Quality Score Threshold | Root Cause Specificity Requirement |
|--------------|-------------------|------------------------|-------------------------------------|
| **Extreme** | 5-Why (mandatory) | 90% | Must identify specific system/process failure and systemic prevention measure |
| **Major** | 4-5 Why | 85% | Must identify specific failure mode and preventive control enhancement |
| **Moderate** | 3-4 Why | 75% | Must identify direct cause and corrective action to prevent recurrence |
| **Minor** | 2-3 Why | 65% | Must identify contributing factor and immediate correction |
| **Low** | 1-2 Why (optional) | 50% | Basic description acceptable |

### 3.2 Root Cause Quality Scoring Criteria

**AI Evaluation Dimensions:**

1. **Specificity (0-30 points)**
   - Generic root cause (e.g., "operator error") = 0-10 points
   - Specific root cause (e.g., "blade not changed per maintenance schedule") = 20-30 points

2. **Depth of Analysis (0-30 points)**
   - Surface-level (1-Why) = 0-10 points
   - Adequate depth per severity matrix = 20-30 points

3. **Preventability Assessment (0-20 points)**
   - No prevention identified = 0-5 points
   - Clear preventive measure identified = 15-20 points

4. **Systemic Thinking (0-20 points)**
   - Isolated incident view = 0-10 points
   - System/process improvement perspective = 15-20 points

**Example Scoring:**

| Root Cause Description | Severity | Score | Feedback |
|------------------------|----------|-------|----------|
| "Operator mistake" | Major | 15% (REJECT) | Too generic. Ask: Why did operator make mistake? Was training adequate? Was work instruction clear? |
| "Temperature set incorrectly because first-off checklist not followed" | Major | 65% (BORDERLINE) | Better, but needs one more Why: Why was checklist not followed? |
| "Temperature set incorrectly because operator did not follow first-off checklist → Checklist not visibly posted at machine after line change → Housekeeping procedure does not include checklist positioning verification" | Major | 88% (ACCEPT) | Good depth, identifies systemic gap in housekeeping procedure |

---

## 4. CORRECTIVE ACTION ESCALATION RULES

### 4.1 AI Blocking Conditions (Require QA Approval Before Submission)

**AI must block operator-level NCA submission and require QA Supervisor approval when:**

1. **Severity = Extreme or Major** AND **Hazard Type = Food Safety (Microbiological, Physical, Chemical)**
2. **Foreign Body contamination** AND **Source = Glass, Brittle Plastic, Metal**
3. **Seal Integrity Failure** AND **Back Tracking identifies cross-contamination**
4. **Chemical Contamination** from cooler bar leaks, maintenance lubricants, or descale solution
5. **Trademark/Allergen-related** NCAs (legality, malicious intervention, hidden allergen risk)
6. **Incident** involving equipment malfunction affecting product safety
7. **Corrective Action involves procedure change** or training requirement
8. **Multiple NCAs (>3) raised for same failure mode within 7 days** (trend indicating systemic issue)

### 4.2 Verification Step Requirements Before Form Submission

**Critical Hazard Verification Checklist (AI-Enforced):**

| NCA Severity | Pre-Submission Requirements | Bypass Option |
|--------------|---------------------------|---------------|
| **Extreme** | ✓ QA Supervisor approval signature (digital)<br>✓ Factory Team Leader back tracking verification<br>✓ Validation evidence upload (test results, photos)<br>✓ HARA team notification flag set<br>✓ Batch quarantine report generated | NONE - All required |
| **Major** | ✓ Factory Team Leader back tracking verification<br>✓ Validation evidence upload (if seal integrity/foreign body)<br>✓ Root cause quality score ≥85%<br>✓ Corrective action specificity ≥75% | QA Supervisor can bypass validation evidence for non-safety quality defects |
| **Moderate** | ✓ Team Leader sign-off<br>✓ Root cause quality score ≥75%<br>✓ Corrective action specificity ≥65% | Team Leader can bypass scoring if justification provided |
| **Minor/Low** | ✓ Basic NCA completion<br>✓ Disposition determined | No verification requirements |

### 4.3 Escalation Workflow Example

**Scenario:** WIP NCA - Foreign Body (Blade Chip) in Sealed Pouch

**AI Decision Tree:**
1. **Classify Hazard:** Physical Contamination → Major Severity (food contact)
2. **Check CCP Context:** Step 36 (Final Cut) - High-risk control point for blade contamination
3. **Trigger Escalation:**
   - Block operator submission → Require Factory Team Leader approval
   - Auto-flag for QA Supervisor notification
   - Generate back tracking task with affected carton range
4. **Enforce Verification:**
   - Require back tracking completion (YES verification)
   - Require blade inspection photo upload
   - Require blade register entry showing blade condition before/after incident
5. **Root Cause Validation:**
   - Minimum 4-Why depth required
   - Quality score threshold: 85%
   - If score <85%, provide feedback: "Root cause needs more depth. Why did blade chip? Was blade changed per maintenance schedule? Is blade register up to date?"
6. **Corrective Action Validation:**
   - Require immediate: Blade replacement + inspection of all cartons from last blade change
   - Require short-term: Blade maintenance log review
   - Require long-term: Review blade change frequency in maintenance procedure
7. **HARA Review Trigger:**
   - Flag: "Blade chip contamination - validate blade inspection frequency in HARA Step 36"

---

## 5. HARA REVIEW TRIGGER CRITERIA

### 5.1 Automatic HARA Review Recommendation

**AI must recommend HARA review when NCA identifies:**

1. **Novel Failure Mode:** Hazard not previously identified in HARA Step analysis
   - Example: "Skylight polycarbonate fragment falls onto production line" (novel physical hazard)
2. **Control Measure Failure:** Preventive measure documented in HARA proves ineffective
   - Example: "Blade register maintained but blade still broke → blade inspection frequency inadequate"
3. **New Hazard Introduction:** Process change, equipment modification, new raw material introduces unidentified hazard
   - Example: "New zipper supplier material has different adhesion properties → weak seal strength increase"
4. **Increased Likelihood:** Hazard previously assessed as "Rare" now occurring with "Possible" or "Likely" frequency
   - Example: "Cooler bar leaks occurring 3x in 30 days (previously Rare, now Possible) → maintenance frequency inadequate"
5. **Severity Re-Classification:** Hazard impact proves more severe than originally assessed
   - Example: "Delamination previously assessed as Minor quality defect now causing seal integrity failures (Major)"
6. **Regulatory/Legislative Change:** New food safety regulation affects hazard acceptability
   - Example: "New FDA migration limits for LLDPE require re-validation of supplier compliance"
7. **Supplier Change:** Raw material supplier change introduces new hazard profile
   - Example: "New film supplier uses different ink system → taint/odor hazard introduced"
8. **Customer Complaint Trend:** Multiple customer complaints indicate HARA gap
   - Example: "5 complaints in 30 days about zipper opening force (previously not monitored)"
9. **Audit Finding:** Internal/external audit identifies HARA documentation gap
   - Example: "Audit finds temporary modifications not included in HARA hazard analysis"
10. **Incident with Safety Consequence:** Any incident requiring product withdrawal/recall
    - Example: "Product withdrawal due to pest contamination → review pest control HARA effectiveness"

### 5.2 HARA Review Notification Workflow

**When AI triggers HARA review recommendation:**

1. **Auto-Create HARA Review Task:**
   - Assign to: HARA Team Leader (Operations Manager)
   - Priority: Based on NCA severity (Extreme = Immediate, Major = 5 days, Moderate = 10 days)
   - Include: NCA details, failure mode description, recommended HARA section for review
2. **Link to NCA Record:**
   - Add "HARA Review Triggered" flag to NCA
   - Prevent NCA close-out until HARA review task completed or waived by HARA Team Leader
3. **Generate HARA Review Briefing:**
   - Affected Process Step(s)
   - Hazard Type(s) requiring re-assessment
   - Current Control Measures
   - Proposed Control Measure Enhancement
   - Recommended Risk Re-Rating (Likelihood/Severity)
4. **Track HARA Review Outcome:**
   - HARA updated? (YES/NO)
   - CCP determination changed? (YES/NO)
   - New control measure implemented? (YES/NO)
   - Validation study required? (YES/NO)

### 5.3 HARA Review Trigger Examples by NCA Category

| NCA Description | HARA Review Trigger Reason | Recommended HARA Action |
|-----------------|---------------------------|------------------------|
| "Blade chip found in sealed pouch, blade register shows blade 50% over recommended life" | Control measure ineffective (blade change frequency) | Review Step 36 maintenance frequency, add blade life counter alarm |
| "Chemical odor detected in cartons stored near chemical storage room" | New hazard (storage proximity not in HARA) | Review Step 6 (Raw Material Storage) chemical storage segregation distance |
| "Delamination causing seal failures, 15 NCAs in 30 days" | Increased likelihood (Rare → Likely) | Review Step 5 (Material Receipt) supplier qualification, add delamination test to incoming inspection |
| "Customer complaint: zipper opening force too weak, 8 complaints in 60 days" | Novel failure mode (zipper opening force not monitored) | Review Step 28 (Zipper Insertion) add opening force test to SIC |
| "Pest sighting in warehouse, 3 incidents in 90 days" | Control measure failure (pest control frequency inadequate) | Review GMP Pest Control procedure, increase monitoring frequency |
| "New film supplier introduces printed film with strong odor" | Supplier change introduces new hazard | Review Step 3 (Specification Approval) add odor assessment to approval process |

---

## 6. VALIDATION REQUIREMENTS FOR CRITICAL NCAs

### 6.1 When AI Must Require Validation Evidence Upload

**Validation evidence REQUIRED for:**

1. **Seal Integrity Failures:**
   - Water test results (photo or video)
   - Opening force test results (if zipper)
   - Temperature/Dwell/Pressure readings from first-off after correction
2. **Foreign Body Contamination:**
   - Photo of contaminated product
   - Photo of foreign body source (blade, glass, etc.)
   - Inspection results showing contamination eliminated
3. **Chemical Contamination:**
   - Cooler bar inspection report (if leak)
   - Material Safety Data Sheet (if new chemical introduced)
   - Environmental monitoring swab results (if bacteria suspected)
4. **Equipment Malfunction:**
   - Maintenance log entry showing repair completed
   - Calibration verification (if measuring device involved)
   - First-off sample after equipment repair
5. **Process Out of Spec (Concession):**
   - Comparison test results (out-of-spec vs. in-spec product)
   - Customer approval (if concession affects specification)
   - Risk assessment showing no safety impact

### 6.2 Validation Evidence Acceptance Criteria

**AI Validation Checklist:**

| Evidence Type | Minimum Requirements | Rejection Criteria |
|---------------|---------------------|-------------------|
| **Water Test Photo** | Clear image showing pouch submerged, no bubbles, timestamp, WO number visible | Blurry image, no timestamp, WO not visible, bubbles present |
| **Maintenance Log** | Completed by certified technician, includes before/after condition, signature, date | Incomplete fields, no signature, date >24 hours after NCA raised |
| **Calibration Certificate** | Issued by accredited lab, within due date, equipment ID matches | Expired certificate, wrong equipment, no accreditation |
| **First-Off Sample** | Photo attached to Production Log Sheet, signed by Team Leader, within specification | No photo, no signature, measurement outside tolerance |
| **Test Results (3rd Party)** | Certificate of Conformance from BRC/FDA certified supplier/lab | Non-certified lab, results incomplete, no signature |

### 6.3 Evidence Upload Workflow

**AI Enforcement Steps:**

1. **Identify Validation Requirement:** Based on hazard classification and severity
2. **Generate Evidence Checklist:** Auto-populate required evidence types
3. **Block Close-Out:** NCA status locked until all evidence uploaded
4. **Validate Evidence:** AI scans for required elements (timestamp, signature, WO number)
5. **Flag for Human Review:** If evidence borderline, escalate to QA Supervisor for manual approval
6. **Archive Evidence:** Link evidence files to NCA record with traceability to Production Log Sheet, Job Card, HARA Study

---

## 7. EXAMPLE CORRECTIVE ACTIONS BY HAZARD SEVERITY

### 7.1 Extreme Severity Examples

**NCA:** Chemical contamination from cooler bar descale solution leak onto food contact surface

**AI-Generated Corrective Action Suggestions:**

**Immediate (Required before production restart):**
- [ ] Stop production line immediately
- [ ] Quarantine all cartons from last known good production (back tracking required)
- [ ] Inspect all cooler bars for leaks (photo evidence required)
- [ ] Flush and sanitize cooling system with food-grade cleaner
- [ ] Run first-off water test on 10 consecutive pouches before restart

**Short-Term (Complete within 5 working days):**
- [ ] Replace all cooler bar seals/gaskets (maintenance log entry required)
- [ ] Conduct environmental monitoring swab test at cooler bar connections
- [ ] Review and update maintenance procedure for cooler bar seal inspection frequency
- [ ] Re-train operators on cooler bar leak detection (visual inspection at each shift start)
- [ ] Add cooler bar leak check to Short Interval Control checklist

**Long-Term (Complete within 20 working days):**
- [ ] Install leak detection sensors on cooler bar connections (alert to PLC)
- [ ] Schedule HARA review of Step 28, 29, 33 (all cooler bar steps) to validate control effectiveness
- [ ] Conduct validation study: Test product after simulated minor leak to establish detection limits

**HARA Review Trigger:** YES - Control measure effectiveness questioned (maintenance frequency inadequate)

**QA Supervisor Approval Required:** YES

**Validation Evidence Required:**
- Photo of leak source
- Maintenance log showing seal replacement
- Environmental monitoring swab results (negative for contamination)
- First-off water test results (10 consecutive passes)

---

### 7.2 Major Severity Examples

**NCA:** Weak side seal allowing pouch to open without resistance (Step 33)

**AI-Generated Corrective Action Suggestions:**

**Immediate (Required before production restart):**
- [ ] Back track to last known good first-off sample (time/carton number)
- [ ] Segregate all cartons between last good first-off and NCA detection time (RED Hold sticker)
- [ ] Check Temperature/Dwell/Pressure settings against Job Card specification
- [ ] Inspect Teflon condition for wear/damage (photo required)
- [ ] Run new first-off with water test (submerge 5 minutes, no leaks)

**Short-Term (Complete within 10 working days):**
- [ ] Review Production Log Sheet for temperature drift over last 7 days
- [ ] Calibrate side seal temperature sensor (5.6 Calibration Procedure)
- [ ] Replace Teflon if wear visible (maintenance procedure 4.7)
- [ ] Re-train operator on first-off sample water test technique (6.1 Training)
- [ ] Add side seal opening force test to Short Interval Control (every 2 hours)

**Long-Term (Complete within 20 working days):**
- [ ] Analyze NCA Trend: How many side seal NCAs in last 90 days?
- [ ] If trend increasing, schedule machine maintenance audit
- [ ] Evaluate adding seal strength tester for inline monitoring (equipment upgrade ROI)

**HARA Review Trigger:** CONDITIONAL - If >5 side seal NCAs in 90 days, trigger HARA review of Step 33

**QA Supervisor Approval Required:** CONDITIONAL - If back tracking shows >10 cartons affected, require approval

**Validation Evidence Required:**
- Water test photo (first-off after correction)
- Production Log Sheet showing temperature readings before/after
- Teflon condition photo (if applicable)

---

### 7.3 Moderate Severity Examples

**NCA:** Pouch height +3mm outside specification (±1mm tolerance)

**AI-Generated Corrective Action Suggestions:**

**Immediate (Required before production restart):**
- [ ] Check trim blade positioning against Job Card specification
- [ ] Measure first-off sample height with template/gauge (photo required)
- [ ] Adjust blade position and run new first-off
- [ ] Verify 5 consecutive pouches within specification before restart

**Short-Term (Complete within 15 working days):**
- [ ] Inspect blade for sharpness/wear (Blade Register entry)
- [ ] If blade dull, replace and update Blade Register
- [ ] Re-train operator on trim height verification procedure
- [ ] Review last 30 days Production Log Sheets for height measurement trends

**Long-Term (Complete within 20 working days):**
- [ ] Evaluate if height specification tolerance is appropriate for product function
- [ ] If customer complaint related, contact customer for concession or specification review

**HARA Review Trigger:** NO - Functional defect without safety impact

**QA Supervisor Approval Required:** NO - Team Leader concession acceptable if within +/-2mm

**Validation Evidence Required:**
- First-off measurement photo showing height within specification

---

### 7.4 Minor Severity Examples

**NCA:** Scuff marks on pouch surface (cosmetic, no seal/print damage)

**AI-Generated Corrective Action Suggestions:**

**Immediate (Correction during production):**
- [ ] Inspect rubber draw rollers for debris/contamination
- [ ] Clean rollers with approved cleaning cloth
- [ ] Check next 10 pouches for scuff mark elimination

**Short-Term (Complete within 20 working days):**
- [ ] Review housekeeping procedure for roller cleaning frequency
- [ ] Add roller inspection to Short Interval Control visual checklist

**Long-Term (Optional):**
- [ ] Track scuff mark NCAs over 90 days to identify pattern (time of day, operator, machine)

**HARA Review Trigger:** NO - Cosmetic defect only

**QA Supervisor Approval Required:** NO

**Validation Evidence Required:** NONE (Team Leader visual confirmation acceptable)

---

## 8. DECISION TREE FOR AI CORRECTIVE ACTION SUGGESTIONS

```
START: NCA Created
│
├─> STEP 1: Classify Hazard Type
│   ├─> Physical Contamination? → Food Safety = YES
│   ├─> Chemical Contamination? → Food Safety = YES
│   ├─> Microbiological? → Food Safety = YES
│   ├─> Seal Integrity Failure? → Food Safety = CONDITIONAL
│   ├─> Legality/Allergen? → Food Safety = CONDITIONAL
│   └─> Quality/Visual? → Food Safety = NO
│
├─> STEP 2: Assign Severity Level
│   ├─> Use Risk Matrix (Likelihood × Severity)
│   ├─> Extreme/Major + Food Safety = YES → Critical NCA
│   └─> Moderate/Minor/Low → Standard NCA
│
├─> STEP 3: Check CCP Context
│   ├─> Does NCA relate to high-risk control point (Steps 5, 28, 29, 33, 16, 37, 56)?
│   │   └─> YES → Flag for enhanced back tracking + validation evidence
│   └─> NO → Standard NCA workflow
│
├─> STEP 4: Determine Root Cause Requirements
│   ├─> Extreme → 5-Why mandatory, Quality Score ≥90%
│   ├─> Major → 4-5 Why, Quality Score ≥85%
│   ├─> Moderate → 3-4 Why, Quality Score ≥75%
│   └─> Minor/Low → 2-3 Why, Quality Score ≥65%
│
├─> STEP 5: Generate Corrective Actions (Risk-Appropriate)
│   ├─> Immediate: Line stop? Back tracking? Quarantine?
│   ├─> Short-Term: Calibration? Training? Procedure update?
│   └─> Long-Term: Equipment upgrade? HARA review? Validation study?
│
├─> STEP 6: Determine Escalation Requirements
│   ├─> Critical NCA (Extreme/Major + Food Safety) → QA Supervisor approval required
│   ├─> Foreign Body/Chemical/Seal Failure → Factory Team Leader back tracking verification required
│   └─> Standard NCA → Team Leader concession acceptable
│
├─> STEP 7: Validation Evidence Requirements
│   ├─> Extreme/Major + Food Safety → Validation evidence upload mandatory
│   ├─> Seal Integrity → Water test photo required
│   ├─> Equipment Malfunction → Maintenance log + calibration required
│   └─> Minor/Low → Visual confirmation acceptable (no upload)
│
├─> STEP 8: HARA Review Trigger Check
│   ├─> Novel failure mode? → Trigger HARA review
│   ├─> Control measure failure? → Trigger HARA review
│   ├─> Trend increase (>5 same NCAs in 90 days)? → Trigger HARA review
│   └─> NO triggers → Standard close-out
│
└─> STEP 9: Close-Out Enforcement
    ├─> Extreme → 5 working days
    ├─> Major → 10 working days
    ├─> Moderate → 15 working days
    └─> Minor/Low → 20 working days
    ├─> Block close-out if:
    │   ├─> Root cause quality score below threshold
    │   ├─> Validation evidence missing
    │   ├─> Back tracking not verified
    │   └─> HARA review pending
    └─> Allow close-out if all requirements met

END: NCA Closed
```

---

## 9. IMPLEMENTATION GUIDANCE FOR AI SYSTEM

### 9.1 Database Schema Requirements

**NCA Table Enhancements:**
- `hazard_type_id` (FK to hazard_types: 11 types from BRCGS HARA)
- `severity_level` (enum: Extreme, Major, Moderate, Minor, Low)
- `likelihood_level` (enum: Almost Certain, Likely, Possible, Unlikely, Rare)
- `risk_rating` (computed: Likelihood × Severity = L/M/H/E)
- `food_safety_impact` (boolean)
- `ccp_related` (boolean)
- `hara_review_triggered` (boolean)
- `hara_review_task_id` (FK to tasks)
- `requires_validation_evidence` (boolean)
- `validation_evidence_uploaded` (boolean)
- `back_tracking_verified_by` (FK to users)
- `back_tracking_verified_at` (timestamp)
- `root_cause_quality_score` (integer 0-100)
- `root_cause_depth` (integer 1-5)
- `corrective_action_quality_score` (integer 0-100)
- `close_out_target_date` (computed from severity)

**Hazard Types Reference Table:**
```sql
CREATE TABLE hazard_types (
    id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE, -- 'MICRO', 'PHYS', 'CHEM_TAINT', 'CHEM_MIGRATION', etc.
    name TEXT NOT NULL,
    brcgs_category TEXT NOT NULL, -- 'Microbiological', 'Physical', 'Chemical', etc.
    food_safety_impact BOOLEAN DEFAULT TRUE,
    default_severity TEXT CHECK (default_severity IN ('Extreme', 'Major', 'Moderate', 'Minor', 'Low'))
);
```

**HARA Review Tasks Table:**
```sql
CREATE TABLE hara_review_tasks (
    id UUID PRIMARY KEY,
    nca_id UUID REFERENCES ncas(id),
    trigger_reason TEXT NOT NULL, -- 'Novel failure mode', 'Control measure failure', etc.
    assigned_to UUID REFERENCES users(id), -- HARA Team Leader
    priority TEXT CHECK (priority IN ('Immediate', '5 days', '10 days', '15 days')),
    hara_step_affected TEXT, -- e.g., 'Step 28 - Zipper Insertion'
    status TEXT CHECK (status IN ('Pending', 'In Review', 'Completed', 'Waived')),
    hara_updated BOOLEAN DEFAULT FALSE,
    ccp_determination_changed BOOLEAN DEFAULT FALSE,
    new_control_measure TEXT,
    validation_study_required BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by UUID REFERENCES users(id)
);
```

### 9.2 AI Model Training Data Requirements

**Training Data Sources:**
1. Historical NCAs (labeled with hazard type, severity, root cause quality)
2. BRCGS HARA Study (2.0 BRC HARA Rev 28) - all 61 process steps with hazard analysis
3. Production Log Sheets (Short Interval Control data) - identify patterns preceding NCAs
4. Supplier Risk Assessments (3.4 Supplier Approval) - link supplier performance to hazard types
5. Customer Complaints (3.10 Complaint Handling) - link customer issues to HARA gaps

**AI Features for Hazard Classification:**
- NCA Description (text embedding)
- Process Step (categorical: Steps 1-61 from HARA)
- Product Type (categorical: Stand-up pouch, flat pouch, spout pouch)
- Raw Material Type (categorical: PET/LLDPE, BO Nylon/LLDPE, MET PET/LLDPE)
- Department (categorical: Slitting, Pouch Making, Spout Inserter)
- Equipment ID (categorical: DMF, AMJ, LYS, CMH, MDB, FES)
- Time of Detection (temporal: shift, time since line start, time since last first-off)
- Operator/Team Leader (categorical with experience level)

**AI Output:**
- Hazard Type Prediction (multi-label: can be multiple hazard types)
- Severity Level Prediction
- Likelihood Level Prediction
- CCP-Related Flag
- Recommended Root Cause Questions (dynamic 5-Why path)
- Corrective Action Suggestions (tiered: Immediate, Short-Term, Long-Term)
- HARA Review Trigger (boolean + reason)

### 9.3 Validation Rules Engine

**Rule Examples (Implemented as Database Constraints + Application Logic):**

```javascript
// Rule 1: Extreme Severity requires QA Supervisor approval
if (nca.severity_level === 'Extreme') {
    nca.requires_qa_supervisor_approval = true;
    nca.can_submit = false; // Block until approval
}

// Rule 2: Food Safety + Major/Extreme requires validation evidence
if (nca.food_safety_impact && ['Extreme', 'Major'].includes(nca.severity_level)) {
    nca.requires_validation_evidence = true;
    nca.can_close = false; // Block close-out until evidence uploaded
}

// Rule 3: Seal integrity failure requires back tracking
if (nca.hazard_type_id IN ('FUNC_SEAL_INTEGRITY') && nca.process_step IN (28, 29, 31, 32, 33)) {
    nca.requires_back_tracking_verification = true;
    nca.back_tracking_prompt = "Verify all cartons from last known good first-off are segregated with RED Hold sticker";
}

// Rule 4: Root cause quality score threshold by severity
const MIN_SCORES = { 'Extreme': 90, 'Major': 85, 'Moderate': 75, 'Minor': 65, 'Low': 50 };
if (nca.root_cause_quality_score < MIN_SCORES[nca.severity_level]) {
    nca.root_cause_feedback = `Root cause needs more depth (current score: ${nca.root_cause_quality_score}%, required: ${MIN_SCORES[nca.severity_level]}%). Ask: ${generate_why_questions(nca)}`;
    nca.can_close = false;
}

// Rule 5: HARA review trigger on novel failure mode
if (nca.failure_mode_novel === true || nca.same_failure_count_90_days > 5) {
    nca.hara_review_triggered = true;
    create_hara_review_task(nca);
}

// Rule 6: Close-out date enforcement
const CLOSE_OUT_DAYS = { 'Extreme': 5, 'Major': 10, 'Moderate': 15, 'Minor': 20, 'Low': 20 };
nca.close_out_target_date = nca.created_at + CLOSE_OUT_DAYS[nca.severity_level] + ' working days';
if (current_date > nca.close_out_target_date) {
    nca.status = 'Overdue';
    notify_commercial_manager(nca); // Weekly NCA Register review
}
```

---

## 10. SUCCESS METRICS FOR AI CORRECTIVE ACTION SYSTEM

### 10.1 HARA Compliance Metrics

| Metric | Target | Data Source | Review Frequency |
|--------|--------|-------------|-----------------|
| **% NCAs with Hazard Type Classified** | 100% | NCA database | Daily |
| **% NCAs with Severity Level Assigned** | 100% | NCA database | Daily |
| **% Critical NCAs (Extreme/Major + Food Safety) with QA Approval** | 100% | NCA database | Daily |
| **% Seal Integrity NCAs with Back Tracking Verified** | 100% | NCA database | Weekly |
| **% Critical NCAs with Validation Evidence Uploaded** | 100% | NCA database | Weekly |
| **Average Root Cause Quality Score** | ≥80% | NCA database | Weekly |
| **% NCAs Closed Within Target Days** | ≥95% | NCA database | Weekly |
| **% HARA Review Tasks Completed Within Priority Timeframe** | ≥90% | HARA review tasks | Monthly |
| **% HARA Reviews Resulting in Control Measure Update** | Track trend | HARA review tasks | Quarterly |
| **Reduction in Repeat NCAs (Same Failure Mode)** | -20% YoY | NCA trend analysis | Quarterly |

### 10.2 AI System Performance Metrics

| Metric | Target | Evaluation Method |
|--------|--------|------------------|
| **Hazard Classification Accuracy** | ≥95% | Human expert validation sample (100 NCAs/month) |
| **Severity Prediction Accuracy** | ≥90% | Compare AI prediction to QA Supervisor final determination |
| **Root Cause Quality Score Correlation with Human Rating** | R² ≥ 0.85 | Quarterly blind comparison (AI score vs. HARA Team score) |
| **Corrective Action Relevance** | ≥85% acceptance rate | User feedback: "Was AI suggestion helpful? YES/NO" |
| **HARA Review Trigger Precision** | ≥80% | % of triggered reviews that result in HARA update or validation study |
| **False Positive Rate (Unnecessary Escalations)** | ≤10% | QA Supervisor override rate on escalation requirements |

---

## 11. APPENDICES

### Appendix A: BRCGS Risk Assessment Matrix (Reference)

```
Severity Levels:
- Extreme (E): Life-threatening, regulatory action, recall
- Major (Ma): Serious injury potential, withdrawal
- Moderate (Mo): Minor injury potential, complaint
- Minor (Mi): No injury potential, cosmetic defect
- Low (L): Negligible impact

Likelihood Levels:
- Almost Certain (AC): Expected to occur frequently
- Likely (L): Probable to occur
- Possible (P): Could occur
- Unlikely (U): Not expected but possible
- Rare (R): May occur in exceptional circumstances

Risk Rating Formula:
Likelihood × Severity = Risk Rating

Risk Ratings:
- Extreme Risk (E): Immediate action required, stop process
- High Risk (H): Action required, enhanced controls
- Medium Risk (M): Monitor, maintain controls
- Low Risk (L): Acceptable, standard controls
```

### Appendix B: Kangopak Process Steps Reference (from 2.0 BRC HARA)

**High-Risk Control Points (CCP Candidates):**
- Step 5: Material Receipt (Chemical contamination risk)
- Step 12: Removal of Outer Packaging (Foreign body exposure)
- Step 14: Set Blades - Slitting (Blade chip contamination)
- Step 16: Checked for Defects - Slitting (Detection point)
- Step 24: Set Blade - Pouch Makers (Blade chip contamination)
- Step 28: Zipper Insertion & Hot Seal (Seal integrity + cooler bar contamination)
- Step 29: Cross Seal (Seal integrity + cooler bar contamination)
- Step 33: Side Seal (Seal integrity + cooler bar contamination)
- Step 36: Final Cut (Blade chip contamination)
- Step 37: Product Checked for Defects - Pouch Makers (Detection point)
- Step 52-55: Hot Seals - Spout Inserter (Seal integrity)
- Step 56: Checked for Defects - Spout Inserter (Detection point)

### Appendix C: Corrective Action Quality Scoring Rubric

**Scoring Dimensions (100 points total):**

1. **Specificity (30 points)**
   - 0-10: Generic description (e.g., "operator error", "machine issue")
   - 11-20: Somewhat specific (e.g., "temperature incorrect", "blade dull")
   - 21-30: Highly specific (e.g., "side seal temperature 5°C below specification due to sensor drift", "blade exceeded 500m usage limit per maintenance schedule")

2. **Depth of Analysis (30 points)**
   - 0-10: Surface-level (1-Why)
   - 11-20: Adequate depth (2-3 Why for Minor/Moderate, 3-4 Why for Major)
   - 21-30: Comprehensive depth (4-5 Why for Major/Extreme, systemic root cause identified)

3. **Preventability Assessment (20 points)**
   - 0-5: No preventive measure identified
   - 6-10: Vague prevention (e.g., "be more careful")
   - 11-15: Specific prevention (e.g., "add temperature check to SIC")
   - 16-20: Systemic prevention (e.g., "update maintenance procedure to include blade life counter alarm")

4. **Systemic Thinking (20 points)**
   - 0-5: Blaming individual
   - 6-10: Isolated incident view
   - 11-15: Process improvement identified
   - 16-20: System-level improvement (procedure update, training program, equipment upgrade)

**Example Scoring:**

| Root Cause | Specificity | Depth | Preventability | Systemic | Total | Grade |
|------------|-------------|-------|----------------|----------|-------|-------|
| "Operator mistake" | 5 | 5 | 2 | 3 | 15% | F |
| "Temperature too low" | 12 | 10 | 8 | 6 | 36% | F |
| "Temperature 5°C below spec, operator did not verify first-off" | 20 | 15 | 12 | 10 | 57% | D |
| "Temperature 5°C below spec due to sensor drift, operator did not detect because first-off checklist not followed, checklist not visibly posted" | 25 | 25 | 15 | 15 | 80% | B |
| "Temperature 5°C below spec due to sensor drift (last calibration 6 months ago, exceeds 3-month requirement in 5.6 Calibration Procedure), operator did not detect because first-off checklist not visibly posted at machine after line change, housekeeping procedure does not include checklist positioning verification. Preventive measure: Add calibration due date alarm to maintenance system + update housekeeping procedure to include checklist positioning in line clearance verification" | 30 | 30 | 20 | 20 | 100% | A+ |

---

## DOCUMENT CONTROL

**Prepared By:** Claude (BRCGS Section 2 HARA Compliance Specialist)

**Reviewed By:** [QA Manager - Pending]

**Approved By:** [Operations Manager/HARA Team Leader - Pending]

**Next Review Date:** 2026-11-10 (Annual)

**Revision History:**

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-10 | 1.0 | Initial framework creation | Claude |

---

**END OF DOCUMENT**
