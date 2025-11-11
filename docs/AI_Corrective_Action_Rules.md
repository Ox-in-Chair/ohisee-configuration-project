# AI Corrective Action Suggestion Rules for Kangopak OHiSee System

**Document Version:** 1.0
**Created:** 2025-11-10
**Purpose:** Define AI suggestion rules for corrective actions (NCAs) and maintenance actions (MJCs) aligned with BRCGS Section 5 Process Control procedures
**Integration:** Sections 5.1, 5.3, 5.6, 5.7, 5.8

---

## 1. NCA CORRECTIVE ACTION SUGGESTION RULES

### 1.1 Rule Structure

Each NCA corrective action suggestion must include:

1. **Immediate Correction** (what to do NOW)
2. **Root Cause Category** (why it happened)
3. **Corrective Action** (prevent recurrence)
4. **Procedure Reference** (BRCGS compliance)
5. **Verification Method** (how to confirm effectiveness)

---

### 1.2 NCA Type-Specific Suggestion Rules

#### 1.2.1 Raw Material Non-Conformance

**Root Cause Categories:**

- Supplier quality control failure
- Incorrect material specification
- Material handling damage during transport/storage
- Material degradation (age, storage conditions)
- Wrong material delivered

**AI Suggestion Template:**

```
IMMEDIATE CORRECTION:
- Quarantine all affected raw material (Reel/Box: [numbers])
- Apply RED Hold sticker with NCA number
- Back tracking: Verify no WIP/FG produced from this material
- Inform Warehouse Team Leader for disposition

ROOT CAUSE:
[AI analyzes description and suggests most likely from above categories]

CORRECTIVE ACTION:
- Issue NCA to supplier (Procedure 5.7, Section 2.1)
- Review supplier performance on NCA Trend Analysis (5.7.F2)
- Consider supplier audit if recurring issue
- Update incoming material inspection plan (Procedure 5.3, Incoming Material Inspection Plan)
- Verify raw material specification matches Pouch Specification Form (5.1F2)

VERIFICATION:
- Confirm supplier response within 10 working days
- Check next 3 deliveries from supplier for conformance
- Review incoming inspection results at next Management Review
```

**Quality Score Calculation:**

- Immediate correction completeness: 25 points
- Root cause specificity: 20 points
- Preventive action clarity: 25 points
- Procedure reference accuracy: 15 points
- Verification method measurability: 15 points

---

#### 1.2.2 Finished Goods Non-Conformance

**Root Cause Categories:**

- Process parameter out of specification
- Equipment malfunction/calibration drift
- Operator error/training gap
- Job card specification incorrect
- Raw material defect not detected
- Artwork mismatch

**AI Suggestion Template:**

```
IMMEDIATE CORRECTION:
- Quarantine all affected cartons: [carton numbers]
- Apply RED Hold sticker with NCA number
- Back tracking: Check Production Log Sheets for extent of NC
- Review retained samples from 2-hour intervals
- Verify 1st off sample still meets specification

ROOT CAUSE:
[AI analyzes description, checks for keywords like "seal width", "dimension", "print quality", "quantity" to categorize]

CORRECTIVE ACTION:
[AI selects based on detected issue type:]

IF process parameter issue:
- Review Job Card specifications vs. Production Log Sheet recordings (5.3)
- Check calibration status of relevant measuring equipment (5.6)
- Verify equipment maintenance schedule compliance (4.7)
- Retrain operator on process specification limits (6.1 Skills Matrix)
- Consider HARA review if specification limit inadequate (2.0)

IF equipment issue:
- Create Maintenance Job Card for equipment repair/calibration
- Review Preventive Maintenance Plan compliance
- Check for temporary modifications on Production Log Sheet (5.3)
- Consider equipment upgrade if recurring failures

IF operator error:
- Verify Skills Matrix competency for task (6.1)
- Provide retraining on specific procedure
- Review adequacy of Work Instructions
- Consider supervision level during critical operations

IF artwork/specification issue:
- Verify artwork approval vs. production artwork (5.2)
- Check Pouch Specification Form approval status (5.1F2)
- Review Job Card password protection and version control (5.3)
- Verify customer approval of specifications before production

VERIFICATION:
- Monitor next 5 production runs for same issue
- Review in-process checks on Production Log Sheets
- Check NCA Trend Analysis for similar occurrences
- Verify corrective action effectiveness at 30-day review
```

**Quality Score Calculation:**

- Immediate correction completeness: 25 points
- Root cause category accuracy (AI confidence): 20 points
- Corrective action specificity to root cause: 30 points
- Procedure integration (references 2+ sections): 15 points
- Verification timeline defined: 10 points

---

#### 1.2.3 Work in Progress (WIP) Non-Conformance

**Root Cause Categories:**

- Line clearance incomplete
- Material cross-contamination
- Mid-run process drift
- Equipment adjustment during production
- Temporary modification failure

**AI Suggestion Template:**

```
IMMEDIATE CORRECTION:
- STOP PRODUCTION IMMEDIATELY
- Quarantine all WIP from affected period (check Production Log Sheet timestamps)
- Record NCA number on Production Log Sheet
- Team Leader verification of back tracking completion (5.7)
- Segregate NC WIP to NCA holding area

ROOT CAUSE:
[AI prioritizes line clearance issues if mentioned in description]

CORRECTIVE ACTION:
[AI emphasizes line clearance and process control:]

IF line clearance issue:
- Review Line Clearance Procedure compliance (5.3, Section 2.6.2)
- Verify 5C's completion: Clearing, Cleaning, Checking, Validation, Documentation
- Retrain operator and packer on line clearance requirements
- Supervisor to verify next 10 line clearances personally
- Consider disciplinary action per procedure (5.3: "misconduct not performance")

IF material cross-contamination:
- Immediate back tracking to identify all affected product (5.7)
- Review material handling procedures
- Check Return to Stores label compliance (5.3)
- Verify traceable items recorded on Production Log Sheet

IF process drift:
- Review Short Interval Control recordings (5.3)
- Check retained samples at 2-hour intervals
- Verify in-process checks performed per Work Instructions
- Consider increasing check frequency
- Review 1st off sample approval per shift (5.3)

IF equipment issue:
- Create Maintenance Job Card (4.7F2)
- Review temporary modifications section of Production Log Sheet
- Verify MJC created for correction within 14 days (5.3)
- Post-Hygiene Clearance required before production resume

VERIFICATION:
- 100% line clearance validation by supervisor for next 20 runs
- Review Production Log Sheets for Short Interval Control compliance
- Check GMP Activity Audit findings at next scheduled audit
- Monitor WIP non-conformance rate for next 30 days
```

**Quality Score Calculation:**

- Production stop urgency: 30 points
- Line clearance emphasis (BRCGS critical): 25 points
- Back tracking traceability: 20 points
- Process control integration: 15 points
- Verification rigor: 10 points

---

#### 1.2.4 Incident Non-Conformance

**Root Cause Categories:**

- Foreign body contamination (glass, metal, sharps)
- Cross-contamination event
- Water disruption
- Maintenance contamination risk
- Pest activity
- Chemical spillage

**AI Suggestion Template:**

```
IMMEDIATE CORRECTION:
- INCIDENT MANAGEMENT FOLLOW UP ACTIVATED (5.7, Section 1.5)
- All potentially affected product quarantined IMMEDIATELY
- RED Hold stickers applied with traceability details
- Warehouse Team Leader notified for disposition determination
- Incident recorded in NCA Register as "Incident" type

ROOT CAUSE:
[AI categorizes incident type based on keywords: glass, metal, water, pest, chemical, contamination]

CORRECTIVE ACTION:
[AI selects incident-specific procedures:]

IF foreign body (glass/brittle plastic):
- Follow Handling of Glass Breakage Work Instruction (5.8.1)
- Complete Glass and Brittle Plastic Register inspection (5.8F1)
- If damaged/missing item: Create MJC immediately (5.8)
- Review all product in contamination zone for disposal
- Inspect adjacent production lines for contamination risk
- Verify Glass and Brittle Plastic Register inspection frequency adequate

IF foreign body (metal/sharps):
- Blade and Knife Register reconciliation IMMEDIATELY (5.8F2)
- If missing blade: NCA raised, Control of NC Product Procedure (5.8)
- Check shadow board for missing tools
- Review sharps control compliance with Sharps Policy (5.8.2)
- Verify blade exchange records for discrepancies
- Check spectacles register if applicable (5.8F8)

IF water disruption:
- Follow Water Disruption Procedure (5.8.3.1)
- STOP PRODUCTION until water quality testing complete
- Test water per SANS 241 compliance after restoration
- Obtain approval before production restart
- Document disruption, testing, approval on Production Log Sheet

IF maintenance contamination:
- Review Post-Maintenance Cleaning compliance (5.8)
- Verify Post-Hygiene Clearance checklist (10 items) completed
- Check for missing fasteners, loose parts (5.8)
- Review Clean as You Go Policy adherence
- Verify tools returned to shadow board/workshop
- Ensure all swarf, metal cuttings, debris removed

IF cross-contamination:
- Back tracking MANDATORY (5.7)
- Team Leader signature verification of back tracking completion
- Review line clearance procedure compliance (5.3)
- Check material handling and Return to Stores labels (5.3)
- Verify segregation of non-conforming product

IF chemical spillage:
- Review Chemical and Biological Control Procedure (5.8.3)
- Check SDS compliance and emergency response
- Verify storage area segregation
- Review chemical register and mapping
- Ensure cleaning validation before production resume

VERIFICATION:
- Factory Team Leader signature on NCA (5.7)
- Confirmation no NC product sent to customer
- Review incident at Management Review
- Root cause analysis using Ishikawa diagram (Man, Machine, Method, Environment, Material, Measuring)
- Close out within 20 working days maximum
```

**Quality Score Calculation:**

- Incident severity recognition: 30 points
- Immediate product safety action: 25 points
- Procedure-specific response accuracy: 20 points
- Root cause analysis rigor (Ishikawa): 15 points
- Management escalation: 10 points

---

#### 1.2.5 Other (Storage/Training/Process/Equipment/Other)

**Root Cause Categories:**

- Training gap identified
- Storage condition failure (temperature, humidity, contamination)
- Process procedure inadequacy
- Equipment not fit for purpose
- Documentation/control system failure

**AI Suggestion Template:**

```
IMMEDIATE CORRECTION:
- [AI analyzes "other" description to determine urgency]
- Quarantine affected product if quality/safety risk identified
- Record specific "Other" category on NCA form

ROOT CAUSE:
[AI analyzes free-text "nc_type_other" field for keywords]

CORRECTIVE ACTION:
[AI provides general framework with specific emphasis:]

IF training issue:
- Review Skills Matrix for affected personnel (6.1)
- Identify competency gap
- Schedule training with specific objectives
- Verify training effectiveness through observation/testing
- Update Skills Matrix with new competency level
- Consider Work Instruction clarity and adequacy

IF storage issue:
- Review storage conditions vs. material specifications
- Check warehouse segregation compliance
- Verify non-conforming area labeling (5.7)
- Review housekeeping and cleaning schedule compliance (4.9)
- Consider storage environment monitoring (temperature, humidity)

IF process procedure inadequacy:
- Flag for HARA review (2.0)
- Review Process Control Procedure (5.3)
- Check if process specification limits adequate
- Consider production trial for process validation (5.1)
- Update Job Card specifications if necessary (password-protected, 5.3)

IF equipment inadequacy:
- Review equipment maintenance history
- Check calibration status and frequency (5.6)
- Assess if equipment capable of meeting specification
- Consider equipment upgrade or replacement
- Review HARA for equipment-related risks (2.0)

IF documentation/control failure:
- Review document control procedure compliance
- Check revision numbers and approval status
- Verify Job Card / Pouch Specification Form currency (5.1, 5.3)
- Audit document distribution and access
- Review artwork control if applicable (5.2)

VERIFICATION:
- Specific verification based on corrective action type
- Monitor for recurrence over 60 days
- Review effectiveness at Management Review
- Update relevant procedure if systemic issue identified
```

**Quality Score Calculation:**

- Root cause identification from free text: 15 points
- Corrective action relevance: 25 points
- Systemic issue recognition: 20 points
- Multiple procedure integration: 20 points
- Long-term prevention emphasis: 20 points

---

### 1.3 Machine Status Integration

**IF machine_status = 'down':**
AI must emphasize:

```
CRITICAL PRIORITY - MACHINE DOWN ALERT
Estimated downtime: [calculated from machine_down_since]

IMMEDIATE ACTIONS:
1. Operations Manager notified automatically
2. Assess if Maintenance Job Card required
3. Review production schedule impact
4. Consider alternate machine/line capability
5. Communicate delivery impact to customer if significant

CORRECTIVE ACTION EMPHASIS:
- Root cause must prevent recurrence of downtime
- Consider preventive maintenance schedule adequacy
- Review equipment reliability history
- Assess if equipment upgrade needed
```

---

### 1.4 Cross-Contamination Handling

**IF cross_contamination = true:**
AI must verify:

```
MANDATORY BACK TRACKING VERIFICATION

Requirements per Procedure 5.7:
✓ Back tracking person identified: [back_tracking_person]
✓ Back tracking completed: [back_tracking_completed = true]
✓ Team Leader verification signature: [back_tracking_signature]
✓ All affected product segregated
✓ NCA holding area utilization confirmed

AI CORRECTIVE ACTION MUST INCLUDE:
- Review traceability procedures (3.9)
- Verify Production Log Sheet carton number recording
- Check line clearance compliance (5.3)
- Assess material handling procedures
- Review segregation effectiveness
```

---

### 1.5 Disposition-Specific Corrective Actions

**IF disposition_rework = true:**
AI enhances rework instruction:

```
REWORK/SORTING INSTRUCTIONS ENHANCEMENT

AI analyzes rework_instruction and suggests:
- Specific quality checks required during rework
- Acceptance criteria for reworked product
- Personnel competency requirements (Skills Matrix 6.1)
- Inspection/testing methods (5.6A)
- Disposition of product that fails rework
- Traceability maintenance during rework
- Customer notification requirements if contractual

Rework must be documented on Production Log Sheet
```

**IF disposition_concession = true:**
AI emphasizes authorization:

```
OUT-OF-SPECIFICATION CONCESSION APPROVAL

Requirements per Procedure 5.3:
- Team Leader concession signature required (Section 6)
- Concession only valid if bag manufacture in order
- NCA form completed to trend out-of-spec conditions
- Customer notification may be required
- Specification deviation documented on Production Log Sheet
- Consider if HARA review needed for repeated concessions
```

---

## 2. MJC MAINTENANCE ACTION SUGGESTION RULES

### 2.1 Rule Structure

Each MJC maintenance action suggestion must include:

1. **Maintenance Scope** (what needs to be done)
2. **Safety Considerations** (risks and precautions)
3. **Hygiene Requirements** (contamination prevention)
4. **Post-Maintenance Verification** (10-item checklist)
5. **Production Resume Criteria**

---

### 2.2 Maintenance Category-Specific Rules

#### 2.2.1 Reactive Maintenance (Breakdown/Failure)

**AI Suggestion Template:**

```
MAINTENANCE SCOPE:
[AI analyzes description_required field for failure symptoms]

Suggested actions based on maintenance_type:
- Electrical: Check connections, circuit protection, motor windings, control systems
- Mechanical: Inspect bearings, alignment, wear components, lubrication
- Pneumatical: Check air pressure, valve operation, cylinder seals, line integrity

SAFETY CONSIDERATIONS:
- Lock Out Tag Out (LOTO) procedure compliance
- Isolate electrical/pneumatic/hydraulic power sources
- Verify zero energy state before work begins
- PPE requirements: [specific to maintenance type]
- Adjacent line protection if contamination risk

CONTAMINATION PREVENTION (5.8):
- Clean as You Go Policy during maintenance
- Swarf mats/protection for metal work areas
- Tool accountability: Shadow board check-out/return
- Temporary modifications recorded on Production Log Sheet if used
- Post-maintenance cleaning plan

PARTS/MATERIALS REQUIRED:
[AI suggests common parts based on equipment type and failure description]
- Verify parts availability before starting work
- Check spare parts specifications
- Consider OEM vs. aftermarket parts

HYGIENE CLEARANCE REQUIREMENTS (10 items per 4.7F2):
1. ☐ All excess grease & oil removed
2. ☐ All consumables removed (rags, cleaning materials, packaging)
3. ☐ All tools & equipment removed (count verified)
4. ☐ All safety mechanisms tested (guards, interlocks, e-stops)
5. ☐ Product safety equipment reinstated (swarf mats, guards)
6. ☐ Area cleared of debris (metal swarf, wood cuttings, fasteners)
7. ☐ No contamination risk verified
8. ☐ Foreign body sources inspected (loose fasteners, small parts)
9. ☐ Production surfaces inspected (sealer bars, rollers, wear)
10. ☐ Area ready for production resumption

POST-MAINTENANCE VERIFICATION:
- Functional test under no-load conditions
- Run test samples and verify quality specifications
- Check calibration if measuring/counting equipment affected (5.6)
- Verify all fasteners torqued to specification
- Team Leader, Operator, Packer inspection before use
- QA/Supervisor Hygiene Clearance Signature REQUIRED

PRODUCTION RESUME CRITERIA:
- ALL 10 hygiene checklist items verified ✅
- QA/Supervisor signature obtained
- No ❌ items permitted
- MJC status = 'closed'
- Production Log Sheet updated with MJC number if temporary mod used
```

**Quality Score Calculation:**

- Maintenance scope specificity: 20 points
- Safety emphasis: 20 points
- Contamination prevention: 20 points
- Hygiene clearance completeness: 25 points
- Production resume criteria: 15 points

---

#### 2.2.2 Planned Maintenance (Preventive/Scheduled)

**AI Suggestion Template:**

```
MAINTENANCE SCOPE:
[AI references equipment-specific maintenance checklists]

Equipment-specific checklists per Procedure 4.7:
- DMF: 4.7F5
- AMJ: 4.7F7
- MDB Spout Inserter: 4.7F9
- CMH: 4.7F11
- LYS: 4.7F12

Planned maintenance activities:
- Lubrication per manufacturer specifications
- Wear component inspection and replacement schedule
- Calibration verification (5.6)
- Safety system testing (interlocks, emergency stops)
- Cleaning and adjustment per Maintenance Plan

SCHEDULING CONSIDERATIONS:
- Coordinate with production schedule (minimize downtime)
- Order parts in advance
- Allocate sufficient time for proper completion
- Consider line clearance timing for minimal impact
- Schedule during product changeover if possible

SAFETY CONSIDERATIONS:
- LOTO procedure for energy isolation
- Verify maintenance personnel competency (Skills Matrix 6.1)
- Tool and equipment preparation
- Adjacent line protection
- PPE compliance

CONTAMINATION PREVENTION (5.8):
- All work performed per Clean as You Go Policy
- Swarf/debris containment measures in place
- Tools tracked on shadow board
- No temporary modifications unless recorded on Production Log Sheet
- Post-maintenance cleaning plan

HYGIENE CLEARANCE REQUIREMENTS:
[Same 10-item checklist as reactive maintenance]

POST-MAINTENANCE VERIFICATION:
- Maintenance checklist completion (equipment-specific)
- Functional test and quality verification
- Calibration verification if applicable (5.6)
- Update Maintenance Plan with completion date
- Team Leader, Operator, Packer inspection
- QA/Supervisor Hygiene Clearance Signature

PREVENTIVE MAINTENANCE EFFECTIVENESS:
- Review equipment reliability since last PM
- Assess if PM frequency adequate
- Consider interval adjustment based on usage/wear
- Update Maintenance Plan if needed
```

**Quality Score Calculation:**

- Checklist reference accuracy: 25 points
- Scheduling optimization: 15 points
- Safety and hygiene: 25 points
- Preventive maintenance effectiveness: 20 points
- Documentation completeness: 15 points

---

### 2.3 Temporary Repair Handling

**IF temporary_repair = true:**
AI must emphasize:

```
⚠️ TEMPORARY REPAIR - 14-DAY CLOSE OUT REQUIRED ⚠️

Close out due date: [close_out_due_date]

TEMPORARY REPAIR RESTRICTIONS (5.3):
- Only permitted in emergencies
- Only where product contamination not at risk
- Examples: wire, string, tape, cardboard
- MUST be removed after job completion (Line Clearance, Production Log Sheet)
- MUST schedule permanent fix via MJC within 14 days

CORRECTIVE ACTION PLAN:
- Immediate: Complete temporary repair to stabilize production
- Record on Production Log Sheet: Date, reason, expected duration
- MJC created: [job_card_number] for permanent correction
- Schedule permanent fix: Within 14 days
- Verification: Supervisor sign-off on Production Log Sheet

FOLLOW-UP MANAGEMENT:
- Day 1: Temporary repair MJC created
- Day 7: Check permanent fix progress
- Day 10: REMINDER - 4 days remaining
- Day 13: ESCALATION - 1 day remaining
- Day 14: MANDATORY COMPLIANCE - permanent fix or production stop

PERMANENT FIX REQUIREMENTS:
- Create follow-up MJC for permanent correction
- Order parts if required
- Schedule maintenance window
- Verify temporary mod removed from Production Log Sheet
- Confirm no contamination risk throughout temporary period
```

---

### 2.4 Machine Status Integration

**IF machine_status = 'down' AND urgency = 'critical':**
AI prioritizes:

```
🚨 CRITICAL MACHINE DOWN - IMMEDIATE RESPONSE 🚨

Downtime impact: [estimated_downtime] minutes
Down since: [machine_down_since]

IMMEDIATE ACTIONS:
1. Maintenance Manager notified automatically (SMS/email)
2. Assess spare parts availability
3. Mobilize maintenance team immediately
4. Consider external contractor if specialized skills needed
5. Communicate production impact to Operations Manager

URGENCY-BASED RESPONSE TIMES (per MJC specification):
- Critical: <1 hour response (production stopped)
- High: <4 hours response
- Medium: <24 hours response
- Low: >24 hours acceptable

PRIORITIZATION:
- Critical machine down takes priority over planned maintenance
- Allocate best available technician
- Overtime authorization pre-approved for critical issues
- Parts expediting authorized
```

---

### 2.5 Calibration Integration

**IF maintenance affects measuring/monitoring equipment:**
AI must include:

```
CALIBRATION VERIFICATION REQUIRED (5.6)

Equipment affected: [machine_equipment]

CALIBRATION PROCEDURES:
- Check Calibration and Verification chart (5.6) for equipment
- Verify calibration sticker: Asset number, calibration date, next due date
- If calibration expired: CANNOT USE until recalibrated
- If verification overdue: Follow risk-based schedule (High: Quarterly, Medium: Bi-Annually, Low: Annually)

EQUIPMENT FAILURE RISK ASSESSMENT (5.6):
IF equipment found out of calibration during maintenance:
1. STOP USE immediately - fit OUT OF SERVICE tag
2. Open NCA referencing device ID and failure mode
3. Window of exposure assessment:
   - Last known good check: [date]
   - Failure detection: [date]
   - Use Production Log Sheets to identify all WIP/FG affected
4. Risk assessment:
   - What does device control? (quantity, seal width, dimensions, test result)
   - Is safety/legality/quality at risk?
5. Quarantine affected product if risk identified
6. Document on Control of Inspection, Measuring and Test Equipment Record (5.6F2)

POST-CALIBRATION VERIFICATION:
- Verify at 3 measurement points (5.6)
- Record on 5.6F2
- Check deviation within tolerance
- If out of tolerance: Isolate and follow Control of NC Product Procedure
- Update calibration sticker/verification code
```

---

### 2.6 Foreign Body Control Integration

**IF maintenance_type_mechanical = true OR maintenance involves metal work:**
AI emphasizes:

```
FOREIGN BODY CONTAMINATION CONTROL (5.8)

PRE-MAINTENANCE:
- Shadow board tool check-out documented
- Swarf mats/protection placed under work area
- Adjacent production lines protected if risk exists
- Tool count recorded

DURING MAINTENANCE:
- Clean as You Go Policy mandatory
- All fasteners, washers, screws, ferrules, lugs accounted for
- Broken/damaged parts disposed immediately (not left on machine)
- Metal swarf/cuttings contained and removed continuously

POST-MAINTENANCE HYGIENE CLEARANCE:
Item 6: ☐ Area cleared of debris (metal swarf, wood cuttings, fasteners)
Item 8: ☐ Foreign body sources inspected (loose fasteners, small parts)
Item 9: ☐ Production surfaces inspected (sealer bars, rollers for wear/damage)

VERIFICATION:
- Tool count reconciliation (all tools returned to shadow board)
- Visual inspection for loose parts/fasteners
- Metal detector test if product has metal detection CCP
- Team Leader verification of clearance
- QA/Supervisor signature REQUIRED

IF foreign body risk identified:
- Area re-cleaned immediately
- ALL potentially contaminated product quarantined
- NCA raised (Incident type)
- Production CANNOT resume until clearance obtained
```

---

## 3. AI QUALITY SCORING RUBRIC (0-100 SCALE)

### 3.1 NCA Corrective Action Scoring

**Section 10: Corrective Action Quality Score**

| Criteria | Weight | Scoring Method |
|----------|--------|----------------|
| **Immediate Correction Completeness** | 20% | 0-20 points: Does AI identify all required immediate actions? (quarantine, hold sticker, back tracking, segregation) |
| **Root Cause Specificity** | 20% | 0-20 points: Does AI accurately categorize root cause from description keywords and context? |
| **Preventive Action Clarity** | 25% | 0-25 points: Are corrective actions specific, measurable, and prevent recurrence? |
| **Procedure Integration** | 20% | 0-20 points: Does AI reference correct BRCGS procedures (5.1, 5.3, 5.6, 5.7, 5.8, 2.0, 3.9, 6.1)? |
| **Verification Measurability** | 15% | 0-15 points: Are verification methods specific with timelines and success criteria? |

**Total Score: 0-100**

**Scoring Ranges:**

- 90-100: Excellent - Comprehensive, procedure-aligned, measurable
- 75-89: Good - Adequate coverage, minor gaps
- 60-74: Acceptable - Basic requirements met, needs enhancement
- Below 60: Inadequate - Significant gaps, manual review required

---

### 3.2 MJC Maintenance Action Scoring

**Section 7: Maintenance Performed Quality Score**

| Criteria | Weight | Scoring Method |
|----------|--------|----------------|
| **Maintenance Scope Specificity** | 20% | 0-20 points: Does AI describe specific tasks, parts, adjustments, not generic statements? |
| **Safety Emphasis** | 20% | 0-20 points: Does AI include LOTO, PPE, energy isolation, adjacent line protection? |
| **Contamination Prevention** | 20% | 0-20 points: Clean as You Go, tool accountability, swarf management, temporary mods? |
| **Hygiene Clearance Completeness** | 25% | 0-25 points: All 10 items addressed, QA signature requirement, production resume criteria? |
| **Post-Maintenance Verification** | 15% | 0-15 points: Functional test, quality verification, calibration check, documentation? |

**Total Score: 0-100**

**Scoring Ranges:**

- 90-100: Excellent - BRCGS-compliant, comprehensive, production-ready
- 75-89: Good - Adequate safety and hygiene, minor gaps
- 60-74: Acceptable - Basic requirements, needs technician enhancement
- Below 60: Inadequate - Critical gaps, cannot proceed without manual input

---

## 4. GOOD vs BAD CORRECTIVE ACTION EXAMPLES

### 4.1 NCA Corrective Action Examples

#### EXAMPLE 1: Raw Material - Film Gauge Out of Specification

**BAD (Score: 35/100):**

```
ROOT CAUSE: Material problem from supplier

CORRECTIVE ACTION: Send NCA to supplier and order new material

VERIFICATION: Check next delivery
```

**Issues:**

- No immediate correction identified (0/20)
- Root cause too vague (5/20)
- No preventive action (5/25)
- No procedure references (0/20)
- Verification not measurable (5/15)

---

**GOOD (Score: 95/100):**

```
IMMEDIATE CORRECTION:
- Quarantine Reel 12345-7890 (150kg remaining)
- Apply RED Hold sticker with NCA-2025-00123
- Back tracking: Production Log Sheets show Cartons 450-520 produced from this reel
- Quarantine Cartons 450-520 in NCA holding area
- Verify 1st off sample and retained samples from these cartons
- Warehouse Team Leader disposition: REJECT back to supplier

ROOT CAUSE: Supplier quality control failure - film gauge specification 75 micron ±5%, received material measured 68-70 micron (out of tolerance)

CORRECTIVE ACTION:
- Issue NCA to supplier immediately (Procedure 5.7, Section 2.1)
- Supplier response required within 10 working days
- Review incoming material inspection plan frequency (Procedure 5.3):
  * Current: Visual inspection only
  * Revised: Add gauge measurement every 5th reel
- Verify raw material specification on Pouch Specification Form (5.1F2) matches Job Card
- Add this supplier to NCA Trend Analysis monitoring (5.7.F2)
- If 3 NCAs in 6 months: Supplier audit required (Procedure 3.4)
- Review supplier performance at next Management Review

VERIFICATION:
- Supplier provides 8D report within 10 days
- Incoming inspection enhanced: Measure gauge on next 10 reels from this supplier
- Monitor NCA register: No repeat gauge issues for 6 months
- Review at Management Review: Supplier performance trend
- Update Incoming Material Inspection Plan by [date]
```

**Scoring:**

- Immediate correction: 20/20 (complete traceability, quarantine, back tracking)
- Root cause: 20/20 (specific measurement, specification reference)
- Preventive action: 25/25 (inspection plan revision, supplier monitoring, escalation criteria)
- Procedure integration: 20/20 (5.1, 5.3, 5.7, 3.4 referenced)
- Verification: 10/15 (measurable but could add specific dates)

---

#### EXAMPLE 2: Finished Goods - Seal Width Below Specification

**BAD (Score: 40/100):**

```
ROOT CAUSE: Machine not set correctly

CORRECTIVE ACTION: Adjust machine and retrain operator

VERIFICATION: Check next batch
```

**Issues:**

- No immediate correction for affected product (0/20)
- Root cause lacks depth (why wasn't it set correctly?) (8/20)
- Generic corrective action (10/25)
- No procedure references (0/20)
- Vague verification (2/15)

---

**GOOD (Score: 92/100):**

```
IMMEDIATE CORRECTION:
- Quarantine Cartons 101-150 (seal width 8mm, specification 10mm ±1mm)
- Apply RED Hold sticker with NCA-2025-00124
- Production STOPPED at 14:30 when detected
- Review 1st off sample (shift started 06:00): Seal width was 10mm - conforming
- Check retained samples at 2-hour intervals:
  * 06:00: 10mm ✓
  * 08:00: 10mm ✓
  * 10:00: 9.5mm ✓
  * 12:00: 9mm ⚠
  * 14:00: 8.5mm ✗
- Conclusion: Process drift occurred between 10:00-12:00
- Affected period: Cartons 101-150 (back tracking complete)
- Disposition: REWORK - re-seal affected cartons

ROOT CAUSE: Equipment calibration drift during production run
- Seal bar temperature decreased due to cooling system malfunction
- Operator did not detect drift during in-process checks (12:00 check recorded 9mm as "acceptable" but trend was declining)

CORRECTIVE ACTION:
1. Equipment:
   - Create Maintenance Job Card MJC-2025-00456 for seal bar cooling system repair
   - Verify seal bar calibration per Calibration Procedure (5.6)
   - Check Calibration and Verification chart for seal gauge due date
   - Post-Hygiene Clearance required before production resume

2. Process Control:
   - Retrain operator on in-process check frequency and trend analysis (Procedure 5.3, Short Interval Control)
   - Update Work Instruction: Flag declining trends even if within tolerance
   - Increase seal width check frequency: Every 30 minutes for next 10 runs
   - Verify Skills Matrix competency for in-process checks (6.1)

3. Preventive:
   - Review Preventive Maintenance Plan for seal bar cooling system (currently annual, consider quarterly)
   - Add seal bar temperature to Production Log Sheet monitoring
   - Install visual alarm for temperature drift >5°C

VERIFICATION:
- MJC-2025-00456 closed with hygiene clearance
- Seal gauge calibration verified within tolerance
- Operator retraining completed with sign-off
- Monitor next 10 production runs: Seal width within 10mm ±1mm on 100% of checks
- Review Production Log Sheets: Seal width trend analysis documented
- 30-day follow-up: No repeat seal width NCAs
- Management Review: Assess preventive maintenance interval change
```

**Scoring:**

- Immediate correction: 20/20 (detailed back tracking, root cause timeline, disposition)
- Root cause: 18/20 (specific cause identified, operator contribution noted)
- Preventive action: 25/25 (equipment, process, and preventive measures)
- Procedure integration: 19/20 (5.3, 5.6, 6.1, 4.7 referenced)
- Verification: 10/15 (measurable with timeline, could specify exact dates)

---

### 4.2 MJC Maintenance Action Examples

#### EXAMPLE 1: Reactive Maintenance - Pouch Maker Mechanical Issue

**BAD (Score: 30/100):**

```
MAINTENANCE PERFORMED:
Fixed the machine. Replaced worn bearing. Machine running now.
```

**Issues:**

- No maintenance scope detail (5/20)
- No safety considerations (0/20)
- No contamination prevention (0/20)
- No hygiene clearance (0/25)
- No post-maintenance verification (5/15)

---

**GOOD (Score: 93/100):**

```
MAINTENANCE PERFORMED:

1. SAFETY PROCEDURES:
   - LOTO applied: Electrical isolation panel 3, locked by Technician badge #45
   - Zero energy verified: Main drive motor, pneumatic system
   - PPE: Safety glasses, gloves, hearing protection
   - Adjacent line protection: Barrier placed, warning signs posted

2. DIAGNOSTIC FINDINGS:
   - Main drive bearing (part #MB-2025-45) excessive play detected
   - Bearing temperature 65°C (normal 40°C)
   - Unusual noise confirmed by operator description
   - Visual inspection: Bearing seal damaged, contamination visible

3. MAINTENANCE SCOPE:
   - Removed bearing housing assembly
   - Replaced bearing MB-2025-45 (OEM part, stock #S-1234)
   - Cleaned bearing housing, inspected for damage (none found)
   - Installed new bearing with correct torque (45 Nm per spec)
   - Reinstalled bearing housing assembly
   - Lubricated per manufacturer specification (Grease type: NLGI Grade 2, 30g)

4. CONTAMINATION PREVENTION (Procedure 5.8):
   - Clean as You Go: Area cleaned continuously during work
   - Swarf mat placed under bearing housing during removal
   - Tool check-out: 6 tools from shadow board (list: wrench 19mm, 22mm, torque wrench, hammer, punch, scraper)
   - Old bearing and seal disposed in metal scrap bin (not left on machine)
   - All fasteners accounted for: 8 bolts removed, 8 bolts reinstalled

5. ADDITIONAL OBSERVATIONS:
   - Belt tension checked: Within specification
   - Alignment verified: No issues detected
   - Other bearings inspected: Normal condition
   - Recommend: Monitor bearing temperature next 5 runs

6. POST-MAINTENANCE VERIFICATION:
   - Functional test: Motor run 5 minutes no-load, bearing temperature 42°C ✓
   - Test samples produced: 50 pouches, dimensions checked, seal width checked - ALL WITHIN SPEC ✓
   - No unusual noise detected ✓
   - All safety guards reinstalled and tested ✓
   - Tool count verified: All 6 tools returned to shadow board ✓

7. HYGIENE CLEARANCE (10-Item Checklist per 4.7F2):
   1. ☑ All excess grease & oil removed (cleaned with degreaser, wiped dry)
   2. ☑ All consumables removed (rags, packaging, old bearing disposed)
   3. ☑ All tools & equipment removed (6 tools returned, torque wrench calibration checked)
   4. ☑ All safety mechanisms tested (interlocks, e-stop tested - functional)
   5. ☑ Product safety equipment reinstated (guards, swarf mat removed)
   6. ☑ Area cleared of debris (no metal particles, no fasteners loose)
   7. ☑ No contamination risk verified (visual inspection complete)
   8. ☑ Foreign body sources inspected (all fasteners torqued, no loose parts)
   9. ☑ Production surfaces inspected (sealer bars, rollers checked - acceptable)
   10. ☑ Area ready for production resumption (team leader, operator, packer inspection complete)

Comments: Bearing failure likely due to seal damage allowing contamination. Recommend increasing preventive maintenance inspection frequency from annual to 6-monthly for all main drive bearings.

PRODUCTION RESUME CLEARANCE:
✅ ALL 10 HYGIENE ITEMS VERIFIED
✅ QA Supervisor Clearance Signature Required
✅ Production Log Sheet updated with MJC-2025-00456
✅ MJC Status: Closed
✅ PRODUCTION CLEARED TO RESUME
```

**Scoring:**

- Maintenance scope: 20/20 (detailed steps, parts, specifications)
- Safety: 20/20 (LOTO, PPE, adjacent line protection)
- Contamination prevention: 20/20 (Clean as You Go, tool accountability, disposal)
- Hygiene clearance: 23/25 (all 10 items verified, minor: could add timestamp for each item)
- Post-maintenance verification: 10/15 (functional test, samples, but could add calibration check if measuring equipment affected)

---

#### EXAMPLE 2: Planned Maintenance - Preventive Maintenance

**BAD (Score: 35/100):**

```
MAINTENANCE PERFORMED:
Completed PM checklist. Lubricated machine. All OK.
```

**Issues:**

- No specific checklist reference (5/20)
- No safety procedure (0/20)
- No contamination prevention (0/20)
- No hygiene clearance (0/25)
- Minimal verification (10/15)

---

**GOOD (Score: 95/100):**

```
MAINTENANCE PERFORMED:

1. PLANNED MAINTENANCE DETAILS:
   - Equipment: DMF Pouch Maker (Machine ID: DMF-01)
   - Maintenance Checklist: 4.7F5 (DMF Maintenance Checklist)
   - Scheduled frequency: Quarterly
   - Last PM: 2025-08-10
   - This PM: 2025-11-10 (on schedule)

2. SAFETY PROCEDURES:
   - LOTO applied: Electrical panel 1, pneumatic isolation valve closed
   - Zero energy verified
   - PPE: Safety glasses, gloves
   - Scheduled during product changeover (minimal production impact)

3. MAINTENANCE CHECKLIST COMPLETION (4.7F5):
   ✓ Lubrication: All grease points per manufacturer schedule (15 points, NLGI Grade 2)
   ✓ Chain tension: Adjusted to specification (10mm deflection)
   ✓ Belt inspection: Wear within acceptable limits, no cracks
   ✓ Bearing inspection: All normal temperature, no unusual noise
   ✓ Pneumatic system: Pressure 6 bar (spec: 6 bar ±0.5), no leaks detected
   ✓ Safety systems: Interlocks tested (5 locations, all functional), e-stop tested
   ✓ Sealer bars: Inspected for wear, cleaned, PTFE coating intact
   ✓ Cutting blades: Inspected, sharpness acceptable, no replacement required
   ✓ Sensors: Cleaned, alignment checked, functional test passed
   ✓ Electrical connections: Inspected, no loose connections, no overheating signs

4. CALIBRATION VERIFICATION (Procedure 5.6):
   - Counting scale (Asset #CS-DMF-01): Calibration sticker checked
     * Last calibration: 2025-09-15
     * Next due: 2026-03-15
     * Status: CURRENT ✓
   - Seal width gauge: Verification performed at 3 points (8mm, 10mm, 12mm)
     * Deviation: +0.1mm, +0.1mm, 0mm
     * Within tolerance (±0.5mm) ✓

5. PARTS REPLACED:
   - None required this PM
   - Consumables used: Grease (500g), cleaning solvent (200ml), rags (10)

6. OBSERVATIONS:
   - Chain #2 showing early wear signs - monitor, likely replacement at next PM (3 months)
   - Pneumatic line to cylinder #3: Minor leak detected, tightened fitting, leak stopped
   - Recommend: Add pneumatic leak check to weekly operator checks

7. CONTAMINATION PREVENTION (Procedure 5.8):
   - Clean as You Go throughout maintenance
   - All old grease wiped and disposed
   - Tools tracked on shadow board (12 tools used, all returned)
   - No foreign body risks identified

8. POST-MAINTENANCE VERIFICATION:
   - Functional test: 30-minute run, all systems normal
   - Test samples: 100 pouches produced, random 10 inspected
     * Dimensions: Within specification
     * Seal width: Within specification
     * No defects detected
   - Counting scale verification: 10 pouches counted, weighed, accurate ✓

9. HYGIENE CLEARANCE (10-Item Checklist per 4.7F2):
   1. ☑ All excess grease & oil removed
   2. ☑ All consumables removed
   3. ☑ All tools & equipment removed (12 tools returned)
   4. ☑ All safety mechanisms tested (interlocks, e-stop functional)
   5. ☑ Product safety equipment reinstated
   6. ☑ Area cleared of debris
   7. ☑ No contamination risk verified
   8. ☑ Foreign body sources inspected
   9. ☑ Production surfaces inspected (sealer bars, rollers acceptable)
   10. ☑ Area ready for production resumption

Comments: PM completed on schedule. Equipment in good condition. Chain #2 to monitor. Pneumatic leak resolved. Next PM due: 2026-02-10.

10. PREVENTIVE MAINTENANCE EFFECTIVENESS:
   - No breakdowns since last PM ✓
   - No NCAs related to this equipment in past 3 months ✓
   - PM interval adequate: MAINTAIN QUARTERLY
   - Update Maintenance Plan: Add pneumatic leak check to weekly operator checklist

PRODUCTION RESUME CLEARANCE:
✅ ALL 10 HYGIENE ITEMS VERIFIED
✅ QA Supervisor Clearance Signature Required
✅ Maintenance Plan updated with completion date: 2025-11-10
✅ Next PM scheduled: 2026-02-10
✅ MJC Status: Closed
✅ PRODUCTION CLEARED TO RESUME
```

**Scoring:**

- Maintenance scope: 20/20 (checklist reference, detailed steps, observations)
- Safety: 20/20 (LOTO, scheduling optimization)
- Contamination prevention: 20/20 (Clean as You Go, tool tracking)
- Hygiene clearance: 25/25 (all 10 items verified, comments provided)
- Post-maintenance verification: 10/15 (functional test, samples, calibration check; could add specific operator competency verification)

---

## 5. IMPLEMENTATION GUIDANCE FOR AI

### 5.1 NCA Description Analysis Keywords

AI should scan `nc_description` field for these keywords to categorize root cause:

**Equipment-related:**

- Keywords: machine, equipment, motor, bearing, seal, temperature, pressure, alignment, wear, breakdown, malfunction
- Action: Suggest MJC creation, calibration check, preventive maintenance review

**Process-related:**

- Keywords: specification, tolerance, out of spec, process drift, parameter, temperature, speed, tension
- Action: Review Job Card, Production Log Sheet, in-process checks, operator training

**Material-related:**

- Keywords: raw material, film, zipper, spout, cap, supplier, batch, reel, gauge, thickness, defect
- Action: Supplier NCA, incoming inspection enhancement, specification verification

**Operator-related:**

- Keywords: operator error, training, forgot, missed, didn't check, line clearance, documentation
- Action: Skills Matrix review, retraining, procedure clarification, supervision

**Contamination-related:**

- Keywords: foreign body, glass, metal, blade, contamination, cross-contamination, debris, swarf
- Action: Incident procedures, glass register, sharps control, back tracking, quarantine

**Calibration-related:**

- Keywords: measurement, counting, scale, gauge, calibration, accuracy, tolerance, verification
- Action: Calibration procedure 5.6, equipment failure risk assessment, window of exposure

---

### 5.2 MJC Description Analysis Keywords

AI should scan `description_required` field for these keywords:

**Urgent maintenance:**

- Keywords: broken, failed, stopped, not working, emergency, production stopped, critical
- Action: Emphasize safety, downtime impact, parts availability, immediate response

**Safety-critical:**

- Keywords: guard, interlock, e-stop, safety, hazard, risk, injury
- Action: Extra safety emphasis, cannot operate until fixed, management notification

**Contamination risk:**

- Keywords: leak, oil, grease, metal, swarf, debris, loose, missing
- Action: Enhanced hygiene clearance, foreign body control procedures, area containment

**Calibration equipment:**

- Keywords: scale, gauge, measuring, testing, counting, sensor
- Action: Calibration procedure integration, window of exposure assessment, product traceability

**Electrical:**

- Keywords: electrical, motor, power, circuit, control, PLC, sensor
- Action: Electrical safety, qualified technician requirement, testing procedures

**Mechanical:**

- Keywords: bearing, chain, belt, alignment, lubrication, wear, adjustment
- Action: Torque specifications, alignment procedures, parts specifications

**Pneumatic:**

- Keywords: air, pneumatic, cylinder, valve, pressure, leak
- Action: Pressure verification, leak detection, line integrity

---

### 5.3 AI Confidence Thresholds

**High Confidence (>80%):**

- Clear keyword match
- Equipment type identified
- Root cause obvious from description
- Provide detailed specific suggestions

**Medium Confidence (50-80%):**

- Partial keyword match
- Root cause category identified but not specific
- Provide general framework with multiple options

**Low Confidence (<50%):**

- No clear keywords
- Description vague or incomplete
- Provide generic template, flag for manual review

---

### 5.4 Procedure Reference Mapping

AI must reference these procedures based on issue type:

| Issue Type | Required Procedure References |
|------------|------------------------------|
| Raw material NC | 5.7 (NC control), 5.3 (incoming inspection), 3.4 (supplier), 5.1 (specifications) |
| Finished goods NC | 5.7 (NC control), 5.3 (process control), 5.6 (calibration), 6.1 (training) |
| WIP NC | 5.7 (NC control), 5.3 (line clearance, short interval control), 3.9 (traceability) |
| Foreign body incident | 5.8 (foreign body control), 5.8.1 (glass breakage), 5.8.2 (sharps), 5.7 (NC control) |
| Equipment failure | 4.7 (maintenance), 5.6 (calibration), 5.3 (process control), 5.7 (NC if product affected) |
| Calibration issue | 5.6 (calibration), 5.6F2 (equipment record), 5.7 (NC for affected product), 3.9 (traceability) |
| Water disruption | 5.8.3.1 (water disruption), 5.3 (production stop/restart), 4.3 (water quality) |
| Training issue | 6.1 (training and competence), 5.3 (skills matrix), 3.11 (if recurring complaint pattern) |
| Design issue | 5.1 (product design), 2.0 (HARA), 5.2 (artwork), 3.7 (specifications) |

---

## 6. PRODUCTION DATABASE INTEGRATION

### 6.1 NCA Table Fields for AI Analysis

```sql
-- AI must analyze these fields to generate suggestions:
SELECT
  nc_description,           -- Primary analysis field (minimum 100 characters)
  nc_type,                  -- raw-material, finished-goods, wip, incident, other
  nc_type_other,            -- Free text if nc_type = 'other'
  machine_status,           -- down, operational (affects urgency)
  machine_down_since,       -- Calculate downtime duration
  cross_contamination,      -- Mandatory back tracking if true
  disposition_rework,       -- Enhance rework instructions
  disposition_concession,   -- Emphasize authorization requirements
  root_cause_analysis,      -- Existing content (AI enhances, not replaces)
  corrective_action         -- AI populates this field
FROM ncas
WHERE status IN ('submitted', 'under-review');
```

### 6.2 MJC Table Fields for AI Analysis

```sql
-- AI must analyze these fields to generate suggestions:
SELECT
  description_required,     -- Primary analysis field (minimum 50 characters)
  maintenance_category,     -- reactive, planned
  maintenance_type_electrical, maintenance_type_mechanical, maintenance_type_pneumatical,
  machine_status,           -- down, operational (affects urgency)
  urgency,                  -- critical, high, medium, low
  temporary_repair,         -- 14-day follow-up if true
  hygiene_checklist,        -- Validate all 10 items verified
  maintenance_performed     -- AI populates this field
FROM mjcs
WHERE status IN ('open', 'assigned', 'in-progress');
```

---

## 7. VALIDATION AND QUALITY CONTROL

### 7.1 AI Suggestion Validation Rules

**Before presenting suggestion to user:**

1. Verify minimum character count for corrective action (150 characters minimum)
2. Confirm at least 2 procedure references included
3. Check immediate correction section present for NCAs
4. Validate hygiene clearance section present for MJCs
5. Ensure verification method includes timeline/measurable criteria

**AI confidence display:**

```
AI Suggestion Confidence: [High/Medium/Low]
Quality Score: [0-100]
Procedure References: [5.3, 5.6, 5.7, etc.]
Recommended Action: [Accept / Review / Manual Input Required]
```

### 7.2 User Override and Feedback

**Allow users to:**

- Accept AI suggestion as-is
- Edit AI suggestion before saving
- Reject AI suggestion and write manually
- Rate suggestion quality (thumbs up/down for ML training)

**Capture feedback:**

```sql
CREATE TABLE ai_suggestion_feedback (
  id UUID PRIMARY KEY,
  nca_id UUID REFERENCES ncas(id),
  mjc_id UUID REFERENCES mjcs(id),
  suggestion_type TEXT, -- 'corrective_action' or 'maintenance_performed'
  ai_suggestion TEXT,
  user_edited_version TEXT,
  suggestion_accepted BOOLEAN,
  user_rating INTEGER, -- 1-5 stars
  user_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. CONTINUOUS IMPROVEMENT

### 8.1 AI Learning from Historical Data

**Train AI models on:**

- Closed NCAs with effective corrective actions (low recurrence rate)
- Completed MJCs with successful post-maintenance performance
- NCA Trend Analysis patterns (5.7.F2)
- Recurring issues and their effective solutions

### 8.2 Periodic Review

**Quarterly review:**

- AI suggestion acceptance rate
- User override patterns (what do users consistently change?)
- Quality score distribution
- Procedure reference accuracy
- Corrective action effectiveness (recurrence rates)

**Annual review:**

- Update AI rules based on new BRCGS procedures
- Incorporate lessons learned from audits (internal, second-party, third-party)
- Add new issue categories based on production changes
- Refine scoring rubric based on user feedback

---

## APPENDIX A: Procedure Quick Reference

| Procedure | Title | Key Integration Points |
|-----------|-------|------------------------|
| 2.0 | Hazard Analysis Risk Assessment (HARA) | Product design, process validation, CCP management |
| 3.4 | Supplier Approval and Performance Monitoring | Raw material NCAs, supplier audits |
| 3.7 | Specifications | Pouch Specification Forms, raw material specs |
| 3.9 | Traceability | Back tracking, carton numbers, Production Log Sheets |
| 3.10 | Complaint Handling | Customer complaint NCAs |
| 4.7 | Maintenance | MJCs, preventive maintenance, equipment checklists |
| 4.9 | Housekeeping and Cleaning | Daily cleaning, packing table maintenance |
| 5.1 | Product Design and Development | Specifications, production trials, sample retention |
| 5.2 | Graphic Design and Artwork Control | Printed product artwork verification |
| 5.3 | Process Control | Job Cards, line clearance, 1st off, Production Log Sheets, quantity control |
| 5.6 | Calibration | Equipment calibration/verification, failure risk assessment |
| 5.6F2 | Control of Inspection, Measuring and Test Equipment Record | Verification documentation |
| 5.7 | Control of Non-Conforming Product | NCA procedures, segregation, disposition, root cause, corrective action |
| 5.7.F2 | NCA Trend Analysis | Pattern identification, overdue tracking |
| 5.8 | Foreign Body Contamination Control | Glass, brittle plastic, sharps, temporary modifications |
| 5.8.1 | Handling of Glass Breakage | Incident response for breakage |
| 5.8.2 | Sharps Policy | Blade control, knife exchange, disposal |
| 5.8.3 | Chemical and Biological Control | Chemical register, SDS, storage |
| 5.8.3.1 | Water Disruption | Water supply interruption response |
| 6.1 | Training and Competence | Skills matrices, personnel competency |

---

## APPENDIX B: Ishikawa Diagram Categories

**For root cause analysis (NCA Section 9):**

**Man:**

- Training inadequacy
- Operator error
- Supervision failure
- Communication breakdown
- Competency gap

**Machine:**

- Equipment malfunction
- Calibration drift
- Wear and tear
- Design inadequacy
- Capacity limitation

**Method:**

- Procedure inadequacy
- Process specification incorrect
- Work Instruction unclear
- Line clearance incomplete
- Verification method inadequate

**Environment:**

- Temperature/humidity deviation
- Storage conditions failure
- Housekeeping deficiency
- Contamination risk
- Facility infrastructure

**Material:**

- Raw material out of specification
- Supplier quality control failure
- Material handling damage
- Material degradation
- Wrong material used

**Measuring:**

- Calibration failure
- Measurement error
- Equipment accuracy inadequate
- Verification frequency insufficient
- Measuring technique incorrect

---

## DOCUMENT CONTROL

**Document Owner:** Operations Manager
**Review Frequency:** Quarterly (or upon BRCGS procedure updates)
**Approval Required:** Operations Manager, Commercial Manager, Systems Coordinator
**Distribution:** Development Team, Operations, Quality Assurance, Maintenance
**Next Review Date:** 2026-02-10

---

**END OF DOCUMENT**
