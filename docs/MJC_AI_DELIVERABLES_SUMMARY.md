# MJC AI Assistance - Deliverables Summary
## Task Completion Report for Mike

**Task**: Analyze Kangopak Site Standards & Maintenance Procedures to define AI assistance rules for MJC (Maintenance Job Card) completion.

**Completed**: 2025-11-10

---

## DELIVERABLE 1: MJC Quality Criteria and Scoring Rubric

**Location**: `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\MJC_AI_ASSISTANCE_RULES.md` (Section 1 & 6)

### Summary

**Quality Scoring Rubric (0-100 points)**:

| Category | Weight | Key Requirements |
|----------|--------|------------------|
| **Completeness** (30 pts) | 30% | What done, parts used, NSF certs, root cause, verification, contamination control |
| **Specificity** (25 pts) | 25% | Part numbers, measurements, precise locations, quantities |
| **BRCGS Compliance** (25 pts) | 25% | Post-maintenance cleaning, tools accounted for, food-grade materials, contamination risk |
| **Preventative Insight** (10 pts) | 10% | Root cause analysis, future prevention, PPM recommendations |
| **Clarity** (10 pts) | 10% | No ambiguous terms, proper grammar, logical sequence |

**Score Thresholds**:
- **90-100**: Excellent (auto-approve for clearance)
- **75-89**: Good (minor improvements suggested)
- **60-74**: Adequate (requires revision)
- **40-59**: Poor (major revision needed)
- **0-39**: Insufficient (reject, complete rewrite)

**Auto-Deductions**:
- Missing NSF certification: -15 pts
- No contamination control: -20 pts
- Vague descriptions: -10 pts
- No verification method: -10 pts
- Wrong cleaning materials (rag on food contact): -25 pts (BRCGS violation)

**Complete Definition**: See Section 1 (lines 17-89) and Section 6 (lines 648-798) of main rules document.

---

## DELIVERABLE 2: Machine-Specific Maintenance Context

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 3)

### Summary

**Equipment Registry**:
- **5 Departments**: Pouching, Spouting, Slitting, Warehouse, Maintenance
- **Machine Code Format**: XXX-## (e.g., DMF-01, AMJ-01, FES-01)

**Machine-Specific Failure Modes and Preventive Maintenance**:

#### Stand-Up Pouch Machines (DMF-01, LYS-01)
**Maintenance Plan**: 4.7F4 (22 pages, 9 major unit sections)

**Critical Components**:
- Unwind Unit (bearings, timing belt, air shaft)
- Gusset Unwind (bearings, rubber draw rollers)
- Zipper Unit (zipper plates, Teflon, cooler bar)
- Cross/Side Seals (thermocouple connections, rubber pads)
- Main Machine (cutting blades, packing table, conveyor belt)
- Cooling Unit (air filter, water solution bi-annual replacement)
- Cut Off Unit (bearing slide)
- Trim Unit (spindle)

**Common Failures**:
- Stiff bearings → Grease monthly with Foodlube Universal 2 (NSF H1-121603)
- Torn Teflon → Replace at shift changeover + job start
- Indented rubber pads → Replace (finger test for indentations)
- Leaking cooler bar fittings → Replace with new fitting + thread tape
- Poly buildup on Teflon → Clean with Industrial Cleaner (NSF K1-135883)

**Food Contact Cleaning Protocol**:
- **Blue cloth ONLY** for: Aluminium rollers, rubber rollers, punches, packing table
- **Rags ONLY** for: Machine frames, rails, excess grease areas
- **NEVER mix**: Contaminated blue cloth = immediate discard

#### Flat Pouch Machine (AMJ-01)
**Maintenance Plan**: 4.7F6 (19 pages, similar to DMF but no gusset unwind)
**Key difference**: Air reticulation with monthly water trap draining + oil level check (Foodlube Hi-Power Compressor Oil)

#### Slitting Machine (FES-01)
**Maintenance Plan**: 4.7F13
**Focus**: Blade wear, tension control, web guides, core chucks

#### Spout Inserting Machines (MDB-01)
**Maintenance Plan**: 4.7F8
**Focus**: Spout feeding mechanism, insertion head alignment, sealing jaws

#### Baler (LAB-01)
**Maintenance Plan**: 4.7F15
**Focus**: Hydraulic system, wire feed mechanism, safety interlocks

**NSF Certified Lubricants**:
- Foodlube Universal 2 (NSF H1-121603) → Standard bearings, linkages, slides
- Foodlube Hi-Power Compressor Oil (NSF H1) → Air systems
- Industrial Cleaner (NSF K1-135883) → Food contact surface cleaning

**Complete Context**: See Section 3.2 (lines 267-495) of main rules document.

---

## DELIVERABLE 3: Preventative Measure Suggestion Rules

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 2 & 11)

### Summary

**When AI Should Suggest PPM Addition**:

1. **Recurring Failures**: Same component failed >2 times in 6 months
2. **Predictable Wear**: Gradual degradation patterns (bearings, belts, seals)
3. **Manufacturer Recommendations**: Equipment manual specifies interval
4. **Environmental Factors**: High-dust, high-temp, heavy-use zones

**PPM Suggestion Template**:
```
"This is the [X] time [component] has required reactive maintenance in [timeframe].
Consider adding [component] to [Machine] Maintenance Plan (4.7F[X]) with:
- Frequency: [Monthly/Bi-annually/Annually]
- Method: [Inspect/Replace/Lubricate/Calibrate]
- Responsibility: [Day Shift Operator/Maintenance Technician]

This would reduce unplanned downtime and align with BRCGS 4.7 preventive maintenance requirements."
```

**PPM Frequency Guidelines** (from actual maintenance plans):
- **Daily**: Critical safety checks (shift start)
- **Weekly**: High-wear components, cleaning verification
- **Monthly**: Bearings, pneumatics, rollers, belts, silencers
- **Bi-annually**: Timing belts, drive belts, thermocouples, cooling water
- **Annually**: Major overhauls, calibration verification

**Advanced Detection**:
- **Wear Pattern Analysis**: Detect keywords ("worn", "degraded", "aged") → Suggest proactive replacement intervals
- **Environmental Factors**: Detect ("dust", "heat", "moisture") → Recommend engineering improvements
- **Operator Error**: Detect ("improper operation", "not changed per procedure") → Trigger retraining workflow

**Complete Rules**: See Section 2 (lines 90-178) and Section 11 (lines 1136-1262) of main rules document.

---

## DELIVERABLE 4: Equipment Manual Integration Requirements

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 8)

### Summary

**When AI Should Reference Equipment Manuals**:

1. **Adjustments/Calibrations**: "Refer to [Machine] manual for torque specifications (e.g., 15 Nm)"
2. **Complex Repairs**: "Consult service manual for disassembly sequence to avoid damage"
3. **New Equipment**: "Review FAT report and commissioning checklist (4.6F1)"
4. **Safety-Critical Work**: "Follow manufacturer lockout/tagout procedure per manual Section [X]"

**Key Manual References in Maintenance Plans**:
- **Cooling Unit Manual**: Water solution replacement (bi-annually)
- **Manufacturer Specs**: Torque values, tolerances, lubrication schedules
- **FAT/SAT Reports**: Factory Acceptance Test, Site Acceptance Test for new equipment

**Future Database Enhancement** (not currently in schema):
```sql
ALTER TABLE machines ADD COLUMN equipment_manual_url TEXT;
ALTER TABLE machines ADD COLUMN supplier_contact JSONB;
ALTER TABLE machines ADD COLUMN fat_sat_report_url TEXT;
```

**AI Prompt Example**:
```
"This repair requires reference to the [Machine Model] Equipment Manual.
Location: Maintenance Office / Shared Drive / Equipment Folder
Relevant sections: [Chapter/Page if known]
If unavailable, contact supplier technical support before proceeding."
```

**Complete Integration**: See Section 8 (lines 914-994) of main rules document.

---

## DELIVERABLE 5: Example High vs Low Quality MJC Descriptions

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 7)

### Example 1: Bearing Replacement (DMF-01 Unwind Unit)

#### LOW QUALITY (Score: 35/100)
```
Fixed the bearing. Used grease. Ran the machine. Cleaned up.
```
**Deficiencies**: No part spec, no NSF cert, no root cause, no contamination detail, vague terms.

#### HIGH QUALITY (Score: 95/100)
```
Replaced worn Unwind Unit Pillar Block Bearing (DMF-01) due to excessive noise and stiffness
during monthly maintenance check (4.7F5 checklist item).

Actions Taken:
1. Locked out DMF-01, de-energized and isolated compressed air supply
2. Removed worn pillar block bearing (serial: PB-2019-04, installed 2019-04-15)
3. Cleaned bearing housing with Industrial Cleaner (NSF K1-135883) and blue cloth
4. Installed new pillow block bearing (serial: PB-2024-11, supplier: ABC Bearings)
5. Applied Foodlube Universal 2 (NSF H1-121603) to bearing surfaces (approx. 50ml)
6. Reinstalled assembly, torqued mounting bolts to 15 Nm per manufacturer spec
7. Verified smooth rotation by hand, no binding or noise
8. Ran unwind unit at low speed (10% for 5 minutes), no vibration or heat detected
9. Ran full speed test (100% for 3 minutes), no abnormal noise or temperature rise
10. Post-Maintenance Cleaning:
    - Wiped excess grease from frame with rag (non-food contact)
    - Cleaned pillar block exterior with blue cloth (food contact zone)
    - Accounted for and removed all tools: 1x 13mm socket wrench, 1x torque wrench,
      1x bearing puller
    - Verified no metal swarf or debris in production zone
    - Discarded contaminated blue cloth and rag in designated waste bin

Root Cause: Bearing worn after 5.5 years of service (expected lifespan: 5 years per
manufacturer). No premature failure.

Verification: Bearing rotates smoothly, no noise at full operational speed. Temperature
normal (35°C ambient, 42°C bearing housing after 30 min run).

Parts Used:
- 1x Pillow Block Bearing PB-2024-11 (ABC Bearings, NSF H1 rated)
- 50ml Foodlube Universal 2 (NSF H1-121603)
- 1x Blue cloth (food contact cleaning)
- 1x Rag (non-food contact cleaning)

Work Duration: 45 minutes (10:15 - 11:00)

Preventative Note: Consider adding "Replace Unwind Pillar Block Bearing" to DMF-01
Maintenance Plan (4.7F4) at 5-year interval to prevent future reactive maintenance.
```

**Excellence Factors**:
- Complete 10-step action sequence
- NSF certifications documented
- Precise measurements (50ml, 15 Nm, temperatures)
- Serial number traceability
- Root cause with lifespan analysis
- Verification with quantifiable tests
- Contamination control detail (blue cloth vs rag protocol)
- PPM recommendation with business justification

**Additional Examples**:
- Example 2: Teflon Replacement (AMJ-01 Zipper Unit) - Score 92/100
- Example 3: Temporary Repair (FES-01 Conveyor Belt) - Score 88/100

**Complete Examples**: See Section 7 (lines 799-913) of main rules document.

---

## DELIVERABLE 6: Glass & Foreign Body Control Integration

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 4)

### Summary

**When AI Should Probe for Glass Register Updates**:

**Trigger Conditions**:
1. Maintenance involves **glass components**: Light bulbs, gauges, sight glasses, thermometer covers
2. Maintenance involves **brittle plastic**: Clear guards, polycarbonate shields, acrylic windows
3. **ANY breakage** during maintenance

**AI Alert (if glass breakage detected)**:
```
"⚠️ GLASS BREAKAGE DETECTED ⚠️

BRCGS CRITICAL:
1. Stop all production in affected area
2. Quarantine all products within 5 meters
3. Update Glass & Brittle Plastic Register for [Machine] (Section 5.8F[X])
4. Initiate Non-Conforming Product procedure (Section 5.7)
5. Perform thorough inspection and cleaning
6. DO NOT grant hygiene clearance until QA verifies all glass accounted for

Has all broken glass been recovered and accounted for? (YES/NO)"
```

**Machine-Specific Glass Registers**:
- Factory/Warehouse: 5.8F1
- DMF Machine: 5.8F4
- AMJ Machine: 5.8F5
- CMH Machine: 5.8F6
- MDB Machines: 5.8F7
- LYS Machine: 5.8F9
- FES Slitter: 5.8F10

**Common Glass Items on Machines**:
- Operator spectacles (PPE)
- Light covers above machines
- Gauge faces (pressure, temperature)
- Inspection lights/magnifiers

**BRCGS Violation Risk**: Glass breakage without proper quarantine and documentation = automatic audit non-conformance.

**Complete Integration**: See Section 4 (lines 496-577) of main rules document.

---

## DELIVERABLE 7: Cleaning Procedure Differentiation

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 5)

### Summary

**Maintenance Cleaning** (Section 4.7):
- **Trigger**: After ANY maintenance work, before production resumes
- **Purpose**: Remove contamination introduced during maintenance (grease, swarf, debris, tools)
- **Documentation**: MJC Post-Hygiene Clearance Checklist (10 items)
- **Verification**: QA-only signature required
- **Status Gate**: Cannot close MJC without hygiene clearance

**Routine Sanitation** (Section 4.9):
- **Trigger**: Scheduled per Master Cleaning Schedule (daily/weekly/monthly)
- **Purpose**: Maintain hygiene standards, prevent contamination buildup
- **Documentation**: Machine Cleaning Checklists (4.9F4-F10, F20)
- **Verification**: Visual inspection, ATP testing
- **Integration**: Separate from maintenance workflow

**AI Differentiation Prompt**:
```
"Cleaning performed during this maintenance is documented in the Post-Hygiene Clearance
section (part of this MJC).

Routine machine cleaning per Master Cleaning Schedule (4.9F7) is separate and ongoing.

Verify that routine cleaning was up-to-date before this failure occurred - check Machine
Cleaning Checklist (4.9F[X]) for [Machine]."
```

**Machine-Specific Cleaning Checklists** (Section 4.9):
- DMF: 4.9F4
- AMJ: 4.9F5
- MDB: 4.9F6
- CMH: 4.9F8
- LYS: 4.9F10
- FES: 4.9F20
- Master Schedule: 4.9F7

**Key Distinction**: Maintenance cleaning is **reactive** (after contamination risk introduced). Routine cleaning is **preventive** (maintain standards).

**Complete Differentiation**: See Section 5 (lines 578-647) of main rules document.

---

## DELIVERABLE 8: AI Prompting Strategy (Decision Tree)

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 9 & 12)

### Summary

**AI Decision Tree for MJC Assistance**:

```
START: Technician opens "Maintenance Performed" field
│
├─ Step 1: Detect machine_id → Load machine-specific context
│  └─ Auto-suggest common components and procedures for that machine
│
├─ Step 2: Ask initial questions
│  ├─ Maintenance type (reactive/planned/condition-based)
│  ├─ Safety confirmation (lockout/tagout)
│  ├─ Parts/materials used (with NSF certs)
│  └─ Root cause (if reactive)
│
├─ Step 3: Progressive disclosure prompts
│  ├─ Contamination control detail (blue cloth vs rag)
│  ├─ Verification method (test runs, measurements)
│  └─ Preventative recommendations (PPM additions)
│
├─ Step 4: Real-time quality scoring
│  ├─ Display live score (0-100) as technician types
│  ├─ Highlight missing elements
│  └─ Suggest improvements to reach next quality threshold
│
├─ Step 5: Specialized checks
│  ├─ Glass breakage detection → Alert + Glass Register prompt
│  ├─ Temporary repair detection → 14-day close-out reminder
│  ├─ Cleaning vs maintenance → Differentiate per Section 5
│  └─ Recurring failure detection → PPM recommendation
│
├─ Step 6: Hygiene checklist guidance
│  ├─ Present 10-item checklist
│  ├─ Require verification of all items
│  └─ Prevent clearance if incomplete (database constraint)
│
└─ Step 7: Final validation
   ├─ Minimum 50 characters (database constraint)
   ├─ Quality score ≥60 (adequate threshold)
   ├─ All required fields populated
   └─ Submit for hygiene clearance (QA-only)

END: MJC status → "awaiting-clearance"
```

**Progressive Disclosure Example**:

**Initial Prompt**:
```
"What type of maintenance was this?
1. Reactive (breakdown/failure during production)
2. Planned (scheduled preventive maintenance per 4.7F[X])
3. Condition-based (identified during inspection/PPM check)"
```

**After initial description**:
```
"Great start. Let's add detail on contamination control:
- Was any grease/oil removed? How?
- Were tools and debris accounted for and cleared?
- What cleaning materials were used? (Blue cloth for food contact, rags for frames)
- Were any loose fasteners (bolts, washers, screws) left in the area?"
```

**After contamination control**:
```
"How was the repair verified?
- Visual inspection?
- Operational test (speed, duration, cycles)?
- Measurements (temperature, vibration, pressure)?
- Leak test?
- Quality check (sample products tested)?"
```

**Real-Time Feedback**:
```
Current Quality Score: 72/100 (Adequate - Requires Revision)

Missing:
- NSF certification for lubricant used (-15 pts)
- Contamination control detail (-10 pts)
- Verification method specifics (-5 pts)

Add these details to reach "Good" quality (75+).
```

**Complete Strategy**: See Section 9 (lines 995-1135) and Section 12 (lines 1263-1292) of main rules document.

---

## DELIVERABLE 9: Database Schema Integration

**Location**: `MJC_AI_ASSISTANCE_RULES.md` (Section 10)

### Summary

**Schema Constraints AI Must Enforce**:

From `mjcs` table (20251106102000_mjcs_table.sql):

1. **description_required**: Minimum 50 characters (Line 98 constraint)
2. **maintenance_performed**: Required when status ≥ 'in-progress' (Line 105-111)
3. **hygiene_clearance_signature**: Required when status = 'closed' (Line 112-118)
4. **hygiene_checklist**: All 10 items verified before clearance (Line 220-244)
5. **temporary_repair = true**: Auto-calculates `close_out_due_date = TODAY + 14 days` (Line 201-214 trigger)
6. **At least one maintenance type**: electrical OR mechanical OR pneumatical OR other (Line 122-127)

**Hygiene Checklist (10 Items)** - AI presents sequentially:
```json
[
  "All Excess Grease & Oil Removed",
  "All Consumables Removed",
  "All Tools & Equipment Removed",
  "All Safety Mechanisms in Good Working Order",
  "All Product Safety Equipment Reinstated (e.g., Swarf Mats)",
  "Area Inspected and Cleared of Debris (e.g., Metal Swarf, Wood Cuttings)",
  "Verification that No Contamination Risk Exists",
  "Inspection for Potential Sources of Foreign Bodies (e.g., Loose Fasteners, Small Parts)",
  "Inspection for Damage or Wear to Production Surfaces (e.g., Sealer Bars, Rollers)",
  "Area Prepared and Ready for Production Resumption"
]
```

**Status Workflow** (AI guides progression):
```
draft → open → assigned → in-progress → awaiting-clearance → closed
```

AI enforces:
- Cannot move to `in-progress` without `assigned_to`
- Cannot move to `awaiting-clearance` without `maintenance_performed` + signature
- Cannot move to `closed` without hygiene checklist (all 10 verified) + QA clearance signature

**Foreign Keys for Traceability**:
- `wo_id`: Links to work order (production batch traceability)
- `machine_id`: Links to machine register
- `raised_by_user_id`: Who reported issue
- `created_by`: Who created MJC
- `assigned_to`: Maintenance technician

**AI Auto-Population**:
- `job_card_number`: "Your MJC number is MJC-2025-00012345" (auto-generated)
- `close_out_due_date`: "[TODAY + 14 days]" if temporary repair
- `work_duration`: Auto-calculated from `work_started_at` to `work_completed_at`

**Complete Integration**: See Section 10 (lines 1042-1135) of main rules document.

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core Functionality (Weeks 1-2)
- [ ] Load machine-specific context from BRCGS procedures
- [ ] Implement progressive disclosure prompting
- [ ] Build real-time quality scoring engine
- [ ] Integrate database schema validation
- [ ] Create hygiene checklist workflow

### Phase 2: Intelligence Features (Weeks 3-4)
- [ ] Recurring failure detection (historical MJC analysis)
- [ ] PPM recommendation engine
- [ ] Glass breakage alerts
- [ ] Temporary repair workflow
- [ ] Operator error detection and retraining suggestions

### Phase 3: Advanced Integration (Weeks 5-6)
- [ ] Equipment manual reference system
- [ ] Historical data analysis (6-month trend detection)
- [ ] Environmental factor analysis
- [ ] Wear pattern prediction
- [ ] Auto-generate PPM entries for approval

### Phase 4: User Experience (Weeks 7-8)
- [ ] Gamification (score tracking, improvement trends)
- [ ] Auto-suggestions based on machine type
- [ ] Mobile-friendly interface for shop floor
- [ ] Voice-to-text input (hands-free for gloves)
- [ ] Multi-language support (English/Afrikaans)

---

## APPENDICES IN MAIN RULES DOCUMENT

**Appendix A**: BRCGS Procedure Cross-References (Lines 1293-1303)
- Section 4.7 (Maintenance), 4.9 (Cleaning), 5.7 (Non-Conforming), 5.8 (Glass), 6.1 (Training), 3.9 (Traceability)

**Appendix B**: NSF Certified Materials Quick Reference (Lines 1305-1318)
- Foodlube Universal 2 (NSF H1-121603)
- Foodlube Hi-Power Compressor Oil (NSF H1)
- Industrial Cleaner (NSF K1-135883)

**Appendix C**: Common Maintenance Keywords for AI Parsing (Lines 1320-1346)
- Component keywords (bearings, belts, rollers, seals, pneumatics, electrical)
- Action keywords (replace, install, clean, lubricate, adjust, calibrate)
- Condition keywords (worn, damaged, torn, frayed, cracked, loose)
- Cleaning keywords (blue cloth, rag, vacuum, grease removal, swarf)
- Verification keywords (test run, visual inspection, measurement, leak test)

---

## FILE LOCATIONS

**Main Rules Document**:
`C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\MJC_AI_ASSISTANCE_RULES.md`

**This Summary**:
`C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\MJC_AI_DELIVERABLES_SUMMARY.md`

**BRCGS Reference Documents**:
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Procedures\4.7 Maintenance Procedure.md` (Rev 14)
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Form_Templates\4.7F2 Maintenance Job Card.md`
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Form_Templates\4.7F4 BRC Maintenance Plan DMF & LYS.md`
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Form_Templates\4.7F6 BRC Maintenance Plan AMJ.md`
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Procedures\4.9 Housekeeping and Cleaning Procedure.md` (Rev 15)

**Database Schema**:
- `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\supabase\migrations\20251106101800_initial_schema.sql`
- `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\supabase\migrations\20251106102000_mjcs_table.sql`

---

## NEXT STEPS

1. **Review Deliverables**: Read `MJC_AI_ASSISTANCE_RULES.md` for complete implementation specifications
2. **Validate with Stakeholders**: Share example MJC descriptions with Maintenance Manager and QA Supervisor for feedback
3. **Refine Scoring Rubric**: Test rubric with historical MJCs to calibrate thresholds
4. **Prototype AI Prompts**: Build mockup of progressive disclosure prompting for technician testing
5. **Database Enhancements**: Consider adding `equipment_manual_url`, `supplier_contact` fields to `machines` table
6. **Training Materials**: Develop training slides for maintenance technicians on high-quality MJC writing

---

**Analysis Completed By**: Claude (BRCGS Section 4 Compliance Specialist)
**Date**: 2025-11-10
**Total Analysis Time**: ~2 hours
**Documents Analyzed**: 7 BRCGS procedures, 2 database schemas, 4 maintenance plans
**Lines of Specification**: 1,346 in main rules document
