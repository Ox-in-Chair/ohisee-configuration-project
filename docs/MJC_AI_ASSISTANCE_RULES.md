# MJC AI Assistance Rules for Kangopak
## BRCGS Section 4.7 Maintenance Procedure Compliance

**Document Purpose**: Define quality criteria, scoring rubrics, and machine-specific context for AI-assisted Maintenance Job Card (MJC) completion.

**Reference Authority**:
- `C:\Users\mike\.claude\.brcgs\Section_4_Site_Standards\Section_4_Procedures\4.7 Maintenance Procedure.md` (Rev 14)
- `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\supabase\migrations\20251106102000_mjcs_table.sql`

---

## 1. MAINTENANCE PERFORMED QUALITY CRITERIA

### 1.1 Core Requirements (Section 4.7 Line 198-223)

**Minimum Description Length**: 50 characters (enforced by database constraint)

**Required Elements**:
1. **What was done**: Specific actions taken (parts replaced, adjustments made, repairs completed)
2. **Parts/Materials used**:
   - Part names with specifications
   - Food-grade lubricants MUST include NSF certification (e.g., "Foodlube Universal 2 NSF H1-121603")
   - Tools used (if specialized)
3. **Time taken**: Work duration (auto-calculated from `work_started_at` to `work_completed_at`)
4. **Root cause** (for reactive maintenance): What caused the failure?
5. **Verification**: How was repair validated? (e.g., "Ran machine for 10 cycles, no deviation observed")
6. **Contamination control**: Debris removal, cleaning performed, swarf/cuttings accounted for

### 1.2 BRCGS-Critical Details

**Post-Maintenance Cleaning** (Section 4.7 Line 212-223):
- All excess grease and oil removed
- All tools and maintenance equipment accounted for and removed
- All loose bolts, washers, screws, feral, lugs accounted for and cleared
- Blue cloth used ONLY for food contact surfaces (rollers, punches, packing table)
- Non-food-contact surfaces cleaned with rags (never blue cloth)
- Contaminated blue cloths discarded immediately

**Sealer Bars, Cooler Bars, Pads & Teflon** (Section 4.7 Line 224-233):
- If replaced: Must be changed at shift changeover AND job start (operator responsibility)
- Check for impurities and damage
- Document storage location (tooling racks)

### 1.3 Temporary Repairs (Section 4.7 Line 236-239)

If `temporary_repair = true`:
- AI MUST ask: "What permanent repair is needed?"
- AI MUST suggest: "This temporary repair must be closed out within 14 days (by [auto-calculated date])"
- Examples of temporary repairs: wire, string, tape, cardboard
- ONLY permitted when product contamination risk is absent

---

## 2. PPM (PLANNED PREVENTATIVE MAINTENANCE) RECOMMENDATIONS

### 2.1 When to Suggest PPM Addition

AI should flag for PPM schedule addition when:
1. **Recurring failures**: Same component failed >2 times in 6 months
2. **Predictable wear**: Bearings, belts, seals showing gradual degradation
3. **Manufacturer recommendations**: Equipment manual specifies maintenance interval
4. **Environmental factors**: High-dust areas, high-temperature zones, heavy-use machines

### 2.2 PPM Suggestion Phrasing

**Template**:
```
"This is the [X] time [component] has required reactive maintenance in [timeframe].
Consider adding [component] to the [Machine] Maintenance Plan (Procedure 4.7F[X]) with:
- Frequency: [Monthly/Bi-annually/Annually]
- Method: [Inspect/Replace/Lubricate/Calibrate]
- Responsibility: [Day Shift Operator/Maintenance Technician]

This would reduce unplanned downtime and align with BRCGS 4.7 preventive maintenance requirements."
```

**Example**:
```
"This is the 3rd bearing replacement on AMJ-01 Unwind Unit in 5 months.
Consider adding 'Unwind Unit Bearings' to AMJ Maintenance Plan (4.7F6) with:
- Frequency: Monthly
- Method: Check for stiffness, lightly grease with Foodlube Universal 2 (NSF H1-121603)
- Responsibility: Day Shift Operator

This would reduce unplanned downtime and align with BRCGS 4.7 preventive maintenance requirements."
```

### 2.3 PPM Frequency Guidelines

Based on machine maintenance plans (4.7F4-F16):
- **Daily**: Critical safety checks (operators at shift start)
- **Weekly**: High-wear components, cleaning verification
- **Monthly**: Standard bearings, pneumatics, rollers, belts
- **Bi-annually**: Timing belts, drive belts, thermocouple connections, cooling unit water solutions
- **Annually**: Major overhauls, calibration verification

---

## 3. EQUIPMENT-SPECIFIC MAINTENANCE CONTEXT

### 3.1 Machine Register (from `machines` table)

**Departments**:
- `pouching`: Pouch making machines (DMF, LYS, AMJ, CMH, MDB)
- `spouting`: Spout insertion machines
- `slitting`: Slitter/rewinder machines (FES)
- `warehouse`: Balers (LAB)
- `maintenance`: Workshop equipment

**Machine Code Format**: `XXX-##` (e.g., DMF-01, AMJ-01, SLT-01)

### 3.2 Common Failure Modes by Machine Type

#### 3.2.1 Stand-Up Pouch Machines (DMF, LYS)
**Reference**: 4.7F4 BRC Maintenance Plan DMF & LYS

**Critical Components**:
- **Unwind Unit**: Bearings (grease with Foodlube Universal 2), threaded bars, dancer arm pillar block bearing, timing belt, air shaft
- **Gusset Unwind**: Bearings, pneumatic silencers, rubber draw rollers (check for wear/foreign objects)
- **Zipper Unit**: Mainframe linkages, zipper plates, Teflon (check for tears/poly buildup), cooler bar fittings/connections
- **Cross Seals & Cooling Unit**: Pneumatic silencers, mainframe linkages, thermocouple connections, Teflon (sealing/cooling/zipper surfaces), rubber pads (check for indentations)
- **Side Seal & Cooling Unit**: Same as cross seals
- **Main Machine**: Bearings, pneumatic silencers, cutting blades (check for damage), rubber pads, packing table (check for wood chips/plastic fragments), conveyor belt (check for fray), drive belts
- **Cooling Unit**: Air filter & radiator (vacuum clean monthly), water solution (replace bi-annually per manual)
- **Cut Off Unit**: Bearing slide (grease with Foodlube Universal 2), pneumatic silencers
- **Trim Unit**: Spindle (check for noise, grease bi-annually)

**Common Failures**:
- Stiff bearings → Replace or grease (monthly check)
- Torn Teflon → Replace at shift changeover/job start
- Indented rubber pads → Replace (run finger over pad to check)
- Worn rubber draw rollers → Replace (check for foreign objects)
- Leaking cooler bar fittings → Replace with new fitting + thread tape
- Damaged cutting blades → Replace at shift changeover/job start
- Poly buildup on Teflon → Clean with Industrial Cleaner (NSF K1-135883)
- Cracked zipper plates → Wipe with brown scotch bright, replace Teflon

**Food Contact Surfaces** (ALWAYS use blue cloth):
- Aluminium rollers
- Rubber rollers
- Punches
- Packing table

**Non-Food Contact Surfaces** (NEVER use blue cloth):
- Machine frames
- Rails with excess grease

#### 3.2.2 Flat Pouch Machine (AMJ)
**Reference**: 4.7F6 BRC Maintenance Plan AMJ

**Critical Components**: (Similar to DMF/LYS but simpler - no gusset unwind)
- **Unwind Unit**: Bearings, threaded bars, dancer arm pillar block bearing, timing belt, air shaft, top unwind shaft end slots
- **Zipper Unit**: Pneumatic silencers, mainframe linkages, thermocouple connections, zipper plates, Teflon, cooler bar fittings
- **Cross Seals & Cooling**: Pneumatic silencers, mainframe linkages, thermocouple connections, Teflon, rubber pads
- **Side Seal & Cooling**: Same as cross seals
- **Main Machine**: Bearings, pneumatic silencers, air reticulation (drain water traps, check oil level - Foodlube Hi-Power Compressor and Arline Oil), cutting blades, packing table, conveyor belt, drive belts
- **Cooling Unit**: Air filter & radiator, water solution
- **Cut Off Unit**: Bearing slide, pneumatic silencers
- **Trim Unit**: Spindle

**Common Failures**: Same as DMF/LYS

#### 3.2.3 Slitting Machines (FES)
**Reference**: 4.7F13 BRC Maintenance Plan FES

**Critical Components**:
- Unwind tension control
- Slitting blades (shear/razor)
- Rewind cores and chucks
- Web guides and sensors
- Drive motors and controllers

**Common Failures**:
- Blade wear → Poor edge quality, web tears
- Tension inconsistency → Wrinkles, telescoping rolls
- Core chuck slippage → Roll damage
- Web guide sensor drift → Misalignment

#### 3.2.4 Spout Inserting Machines (MDB)
**Reference**: 4.7F8 BRC Maintenance Plan MDB Spout Inserting Machines

**Critical Components**:
- Spout feeding mechanism
- Insertion head alignment
- Sealing jaws
- Vision inspection system

**Common Failures**:
- Spout jams → Feeding mechanism blockage
- Misalignment → Rejected pouches
- Seal integrity failures → Leaks

#### 3.2.5 Baler (LAB)
**Reference**: 4.7F15 BRC Maintenance Plan LAB Baler

**Critical Components**:
- Hydraulic system
- Baling chamber
- Wire feed mechanism
- Safety interlocks

**Common Failures**:
- Hydraulic leaks → Contamination risk
- Wire binding failures → Loose bales
- Safety interlock malfunctions → Production stoppage

### 3.3 Food-Grade Lubricants (NSF Certified)

**ALWAYS specify NSF certification when documenting lubricant use**:
- **Foodlube Universal 2** (NSF H1-121603): Bearings, threaded bars, linkages, pillar block bearings, spindles, slides
- **Foodlube Hi-Power Compressor and Arline Oil**: Air reticulation systems
- **Industrial Cleaner** (NSF K1-135883): Cleaning punches, plates, food contact surfaces

**NEVER use non-food-grade lubricants on any equipment in manufacturing areas.**

### 3.4 Cleaning Materials (BRCGS Critical)

**Blue Cloth** (Food Contact ONLY):
- Aluminium rollers
- Rubber rollers
- Punches
- Packing table
- **IF contaminated with grease/lubricants → DISCARD IMMEDIATELY**

**Rags** (Non-Food Contact):
- Machine frames
- Rails
- Areas with excess grease
- **NEVER use on food contact surfaces**

**Brown Scotch Bright**:
- Zipper plates (to remove buildup before Teflon replacement)

---

## 4. GLASS & FOREIGN BODY CONTROL INTEGRATION

### 4.1 When AI Should Probe for Glass Register Updates

**Trigger Conditions**:
1. Maintenance involves **glass components**:
   - Light bulbs/strip lights
   - Equipment gauges with glass faces
   - Sight glasses on tanks/pipes
   - Thermometer covers
2. Maintenance involves **brittle plastic**:
   - Clear plastic guards
   - Polycarbonate shields
   - Acrylic inspection windows
3. **ANY breakage during maintenance**

### 4.2 Glass Register Prompts

**If glass/brittle plastic involved**:
```
"This maintenance involves glass/brittle plastic components.
Was any glass or brittle plastic broken during this work?
- If YES: Glass & Brittle Plastic Register MUST be updated (Section 5.8)
- If NO: Confirm all glass items intact and accounted for

Glass breakage requires:
1. Immediate area quarantine
2. Product hold (Section 5.7)
3. Thorough inspection and cleaning
4. QA verification before production resume"
```

### 4.3 Machine-Specific Glass Registers

**Reference documents** (from `.brcgs/Section_5_Process_Control/Section_5_Form_Templates/`):
- Factory & Warehouse: `5.8F1 BRC Glass & Brittle Plastic Register Factory & Warehouse.md`
- DMF Machine: `5.8F4 BRC Glass & Brittle Plastic Register DMF.md`
- AMJ Machine: `5.8F5 BRC Glass & Brittle Plastic Register AMJ.md`
- CMH Machine: `5.8F6 BRC Glass & Brittle Plastic Register CMH.md`
- MDB Spout Machines: `5.8F7 BRC Glass & Brittle Plastic Register MDB Spout Inserting Machines.md`
- LYS Machine: `5.8F9 BRC Glass & Brittle Plastic Register LYS.md`
- FES Slitter: `5.8F10 BRC Glass & Brittle Plastic Register FES.md`

**Common Glass Items on Machines**:
- Operator spectacles (personal protective equipment)
- Light covers above machines
- Gauge faces (pressure, temperature)
- Inspection lights/magnifiers

**If glass is broken**:
1. AI MUST flag: "BRCGS VIOLATION RISK: Glass breakage requires immediate product quarantine and Non-Conforming Product procedure (Section 5.7)"
2. AI MUST ask: "Has all broken glass been accounted for and removed?"
3. AI MUST suggest: "Update Glass & Brittle Plastic Register for [Machine] (Section 5.8F[X])"

---

## 5. CLEANING PROCEDURE DIFFERENTIATION

### 5.1 Maintenance Cleaning vs. Routine Sanitation

**Maintenance Cleaning** (Section 4.7 Line 212-223):
- **Trigger**: After ANY maintenance work, before production resumes
- **Purpose**: Remove contamination introduced during maintenance (grease, metal swarf, debris, tools)
- **Documented in**: MJC Post-Hygiene Clearance Checklist (10 items)
- **Verification**: QA-only signature required
- **Integration**: Links to 4.9 Housekeeping & Cleaning via Post-Hygiene Clearance

**Routine Sanitation** (Section 4.9 Housekeeping & Cleaning):
- **Trigger**: Scheduled per Master Cleaning Schedule (daily/weekly/monthly)
- **Purpose**: Maintain hygiene standards, prevent contamination buildup
- **Documented in**: Machine Cleaning Checklists (4.9F4-F10, F20)
- **Verification**: Visual inspection, ATP testing (where applicable)
- **Integration**: Separate from maintenance workflow

### 5.2 When AI Should Reference Cleaning Schedules

**Scenarios**:
1. **Maintenance involves cleaning**: AI should say "This cleaning is part of Post-Maintenance Hygiene Clearance (Section 4.7). Routine cleaning per Master Cleaning Schedule (Section 4.9) is separate."
2. **Cleaning-related failure**: AI should ask "Was routine cleaning performed per schedule before this failure? Check Machine Cleaning Checklist (4.9F[X]) for [Machine]."
3. **Grease/oil contamination**: AI should suggest "After cleaning excess grease/oil, verify no contamination risk per Post-Hygiene Clearance checklist."

### 5.3 Master Cleaning Schedule References

**Machine-Specific Cleaning Checklists** (Section 4.9):
- DMF Machine: `4.9F4 BRC Machine Cleaning Checklist DMF.md`
- AMJ Machine: `4.9F5 BRC Machine Cleaning Checklist AMJ.md`
- MDB Machine: `4.9F6 BRC Machine Cleaning Checklist MDB.md`
- CMH Machine: `4.9F8 BRC Machine Cleaning Checklist CMH.md`
- LYS Machine: `4.9F10 BRC Machine Cleaning Checklist LYS.md`
- FES Slitter: `4.9F20 BRC Machine Cleaning Checklist FES Slitting Machine.md`
- Master Schedule: `4.9F7 BRC Master Cleaning Schedule Machinery.md`

**AI Prompt** (when cleaning is part of maintenance):
```
"Cleaning performed during this maintenance is documented in the Post-Hygiene Clearance section.
Routine machine cleaning per Master Cleaning Schedule (4.9F7) is separate and ongoing.
Verify that routine cleaning was up-to-date before this failure occurred."
```

---

## 6. MJC QUALITY SCORING RUBRIC (0-100)

### 6.1 Scoring Categories

| Category | Weight | Max Points |
|----------|--------|------------|
| **Completeness** | 30% | 30 |
| **Specificity** | 25% | 25 |
| **BRCGS Compliance** | 25% | 25 |
| **Preventative Insight** | 10% | 10 |
| **Clarity** | 10% | 10 |

### 6.2 Detailed Scoring Criteria

#### 6.2.1 Completeness (30 points)
- [ ] **What was done** described (5 pts)
- [ ] **Parts/materials used** with specifications (5 pts)
- [ ] **Food-grade lubricants** include NSF certification (5 pts)
- [ ] **Root cause** identified (for reactive) (5 pts)
- [ ] **Verification method** documented (5 pts)
- [ ] **Contamination control** actions detailed (5 pts)

#### 6.2.2 Specificity (25 points)
- [ ] Part numbers/names specific (not "bearing" but "Unwind Unit Pillar Block Bearing") (8 pts)
- [ ] Measurements/tolerances included where applicable (e.g., "Torque to 15 Nm") (6 pts)
- [ ] Location precise (not "machine" but "AMJ-01 Zipper Unit Left Side Seal") (6 pts)
- [ ] Quantities specified (e.g., "3 bolts", "200ml lubricant") (5 pts)

#### 6.2.3 BRCGS Compliance (25 points)
- [ ] Post-maintenance cleaning documented (blue cloth vs. rag usage) (10 pts)
- [ ] All tools/debris accounted for (5 pts)
- [ ] Food-grade materials used (NSF certified) (5 pts)
- [ ] Product contamination risk assessed (5 pts)

#### 6.2.4 Preventative Insight (10 points)
- [ ] Root cause analysis present (5 pts)
- [ ] Future prevention suggestions (3 pts)
- [ ] PPM addition recommended if recurring (2 pts)

#### 6.2.5 Clarity (10 points)
- [ ] Free of ambiguous terms ("fixed", "repaired" without detail) (5 pts)
- [ ] Proper grammar and punctuation (3 pts)
- [ ] Logical sequence of actions (2 pts)

### 6.3 Score Interpretation

| Score | Quality Level | Action |
|-------|--------------|--------|
| 90-100 | Excellent | Auto-approve for hygiene clearance queue |
| 75-89 | Good | Minor improvements suggested, approve |
| 60-74 | Adequate | Requires revision before clearance |
| 40-59 | Poor | Major revision needed, flag for Maintenance Manager review |
| 0-39 | Insufficient | Reject, requires complete rewrite |

### 6.4 Auto-Deductions

- **Missing NSF certification on lubricants**: -15 points
- **No contamination control documented**: -20 points
- **Vague descriptions** ("fixed the issue"): -10 points
- **No verification method**: -10 points
- **Wrong cleaning materials** (rag on food contact surface): -25 points (BRCGS violation)

---

## 7. EXAMPLE MJC DESCRIPTIONS (HIGH vs. LOW QUALITY)

### 7.1 Example 1: Bearing Replacement (DMF-01 Unwind Unit)

#### LOW QUALITY (Score: 35/100)
```
Maintenance Performed:
Fixed the bearing. Used grease. Ran the machine. Cleaned up.
```

**Deductions**:
- Completeness: 10/30 (missing parts spec, root cause, verification detail, contamination control)
- Specificity: 5/25 (no part name, no location, no quantities)
- BRCGS Compliance: 5/25 (no cleaning detail, no NSF certification)
- Preventative Insight: 0/10 (no root cause or prevention)
- Clarity: 5/10 (ambiguous terms)
- **Missing NSF certification**: -15
- **No contamination control**: -20
- **Vague descriptions**: -10

#### HIGH QUALITY (Score: 95/100)
```
Maintenance Performed:
Replaced worn Unwind Unit Pillar Block Bearing (DMF-01) due to excessive noise and stiffness during monthly maintenance check (4.7F5 checklist item).

Actions Taken:
1. Locked out DMF-01, de-energized and isolated compressed air supply
2. Removed worn pillar block bearing (serial: PB-2019-04, installed 2019-04-15)
3. Cleaned bearing housing with Industrial Cleaner (NSF K1-135883) and blue cloth
4. Installed new pillar block bearing (serial: PB-2024-11, supplier: ABC Bearings)
5. Applied Foodlube Universal 2 (NSF H1-121603) to bearing surfaces (approx. 50ml)
6. Reinstalled assembly, torqued mounting bolts to 15 Nm per manufacturer spec
7. Verified smooth rotation by hand, no binding or noise
8. Ran unwind unit at low speed (10% for 5 minutes), no vibration or heat detected
9. Ran full speed test (100% for 3 minutes), no abnormal noise or temperature rise
10. Post-Maintenance Cleaning:
    - Wiped excess grease from frame with rag (non-food contact)
    - Cleaned pillar block exterior with blue cloth (food contact zone)
    - Accounted for and removed all tools: 1x 13mm socket wrench, 1x torque wrench, 1x bearing puller
    - Verified no metal swarf or debris in production zone
    - Discarded contaminated blue cloth and rag in designated waste bin

Root Cause: Bearing worn after 5.5 years of service (expected lifespan: 5 years per manufacturer). No premature failure.

Verification: Bearing rotates smoothly, no noise at full operational speed. Temperature normal (35°C ambient, 42°C bearing housing after 30 min run).

Parts Used:
- 1x Pillow Block Bearing PB-2024-11 (ABC Bearings, NSF H1 rated)
- 50ml Foodlube Universal 2 (NSF H1-121603)
- 1x Blue cloth (food contact cleaning)
- 1x Rag (non-food contact cleaning)

Work Duration: 45 minutes (10:15 - 11:00)

Preventative Note: Consider adding "Replace Unwind Pillar Block Bearing" to DMF-01 Maintenance Plan (4.7F4) at 5-year interval to prevent future reactive maintenance.
```

**Scoring**:
- Completeness: 30/30 (all elements present)
- Specificity: 24/25 (excellent detail, minor: could include bearing dimensions)
- BRCGS Compliance: 25/25 (perfect cleaning documentation, NSF certs, contamination control)
- Preventative Insight: 10/10 (root cause + PPM recommendation)
- Clarity: 10/10 (clear, logical, professional)
- **No deductions**

### 7.2 Example 2: Teflon Replacement (AMJ-01 Zipper Unit)

#### LOW QUALITY (Score: 40/100)
```
Maintenance Performed:
Changed Teflon. Cleaned machine. Production resumed.
```

**Deductions**:
- Completeness: 10/30
- Specificity: 5/25
- BRCGS Compliance: 10/25 (no detail on cleaning)
- Preventative Insight: 0/10
- Clarity: 5/10
- **Vague descriptions**: -10
- **No contamination control detail**: -20

#### HIGH QUALITY (Score: 92/100)
```
Maintenance Performed:
Replaced torn Teflon sheet on AMJ-01 Zipper Unit Left Side Seal discovered during pre-shift inspection (operator reported poly buildup and visible tear).

Actions Taken:
1. Locked out AMJ-01, isolated electrical and pneumatic systems
2. Removed worn Teflon sheet from left side seal zipper plate (dimensions: 300mm x 80mm x 0.5mm)
3. Inspected zipper plate for cracks - none detected
4. Cleaned zipper plate surface with brown scotch bright to remove poly buildup
5. Wiped plate clean with Industrial Cleaner (NSF K1-135883) and blue cloth
6. Installed new Teflon sheet (supplier: XYZ Films, food-grade PTFE, NSF certified)
7. Verified no tears, wrinkles, or poly residue on new Teflon surface
8. Manually cycled seal mechanism 10 times - smooth operation, no binding
9. Ran test production: 20 pouches at low speed - seal integrity verified, no leaks
10. Post-Maintenance Cleaning:
    - Wiped zipper plate assembly with blue cloth (food contact)
    - Cleaned frame surrounding zipper unit with rag (non-food contact)
    - Removed and stored tools: 1x flathead screwdriver, 1x Allen key set
    - Verified no Teflon scraps or debris in production zone
    - Discarded torn Teflon sheet and contaminated blue cloth in waste bin

Root Cause: Poly buildup from previous production run (customer: PET film pouches) caused Teflon degradation. Operator did not change Teflon at shift changeover per procedure (4.7 Line 224-233).

Verification: New Teflon surface smooth, no tears. Test pouches sealed correctly, leak test passed (20/20 pouches).

Parts Used:
- 1x Teflon sheet 300mm x 80mm x 0.5mm (XYZ Films, NSF food-grade PTFE)
- 50ml Industrial Cleaner (NSF K1-135883)
- 1x Brown scotch bright pad
- 1x Blue cloth (food contact cleaning)
- 1x Rag (non-food contact cleaning)

Work Duration: 25 minutes (08:10 - 08:35)

Preventative Note: Operator retrained on Teflon change requirement (every shift changeover + every job start per 4.7F6 Maintenance Plan). Team Leader to verify compliance during shift handover for next 7 days.
```

**Scoring**:
- Completeness: 30/30
- Specificity: 23/25 (excellent, minor: could include Teflon thickness tolerance)
- BRCGS Compliance: 25/25
- Preventative Insight: 9/10 (root cause + operator retraining, but no PPM change needed - already scheduled)
- Clarity: 10/10
- **Minor deduction**: -5 (could have referenced Production Log Sheet carton number for traceability)

### 7.3 Example 3: Temporary Repair (FES-01 Conveyor Belt Fraying)

#### LOW QUALITY (Score: 30/100)
```
Maintenance Performed:
Trimmed belt with knife. Works fine now.
```

**Deductions**:
- Completeness: 5/30
- Specificity: 5/25
- BRCGS Compliance: 5/25
- Preventative Insight: 0/10
- Clarity: 5/10
- **No temporary repair flag**: -10
- **No verification**: -10
- **No contamination control**: -20

#### HIGH QUALITY (Score: 88/100)
```
Maintenance Performed:
Temporary repair: Trimmed frayed edge of FES-01 Packing Table Conveyor Belt to prevent fiber shedding into product zone.

Actions Taken:
1. Stopped FES-01, locked out drive motor
2. Inspected conveyor belt - 15mm frayed edge on operator side, 400mm length
3. Marked fray area with chalk
4. Trimmed frayed fibers with sharp cutter knife (heat-sealed edge to prevent further fraying)
5. Vacuumed trimmed fibers from belt and surrounding area
6. Inspected belt for remaining fray - none detected
7. Verified belt alignment and tension - within spec
8. Ran belt at low speed (5 minutes) - no fiber shedding observed
9. Ran belt at full speed (3 minutes) - no vibration or shedding
10. Post-Maintenance Cleaning:
    - Vacuumed all trimmed belt fibers from packing table and floor
    - Wiped packing table with blue cloth (food contact surface)
    - Wiped belt edge with damp blue cloth to remove chalk marks
    - Removed and stored tools: 1x cutter knife, 1x vacuum cleaner
    - Verified no loose fibers or debris in production zone
    - Discarded contaminated blue cloth in waste bin

Root Cause: Belt wear from continuous operation (installed 2023-06-15, 17 months ago). Expected lifespan: 18-24 months per manufacturer.

Verification: No fiber shedding during 8-minute test run. Belt edge clean and sealed.

**TEMPORARY REPAIR NOTICE**:
This is a temporary fix. Permanent repair required: Replace entire conveyor belt.
Close-out due date: [14 days from today - auto-calculated by system]
Belt replacement parts ordered from supplier (lead time: 10 days).

Parts Used:
- 1x Cutter knife with heat-seal blade
- 1x Blue cloth (food contact cleaning)
- Vacuum cleaner

Work Duration: 30 minutes (14:20 - 14:50)

Preventative Note: Order replacement conveyor belt for FES-01 (current belt at 17 months, approaching end of life). Consider adding "Replace Packing Table Conveyor Belt" to FES Maintenance Plan (4.7F13) at 18-month interval.
```

**Scoring**:
- Completeness: 30/30
- Specificity: 23/25
- BRCGS Compliance: 25/25
- Preventative Insight: 10/10 (root cause + temporary repair flagged + PPM recommendation)
- Clarity: 10/10
- **Minor deduction**: -10 (temporary repair acknowledged but could have been more prominent in opening statement)

---

## 8. EQUIPMENT MANUAL INTEGRATION REQUIREMENTS

### 8.1 Manual References in Maintenance Plans

**Key manuals referenced in maintenance procedures**:
- **Cooling Unit Manual**: Water solution replacement procedures (bi-annually)
- **Manufacturer specifications**: Torque values, tolerances, lubrication schedules
- **FAT/SAT reports**: For newly installed equipment (Section 4.7 Line 157-165)

### 8.2 When AI Should Reference Equipment Manuals

**Scenarios**:
1. **Adjustments/calibrations**: "Refer to [Machine] manual for torque specifications before tightening bolts."
2. **Complex repairs**: "Consult [Machine] service manual for disassembly sequence to avoid damage."
3. **New equipment**: "Review FAT report and commissioning checklist (4.6F1) for baseline performance parameters."
4. **Safety-critical work**: "Follow manufacturer lockout/tagout procedure per [Machine] manual Section [X]."

### 8.3 Manual Storage and Accessibility

**AI Prompt** (if manual needed):
```
"This repair requires reference to the [Machine Model] Equipment Manual.
Location: [Maintenance Office/Shared Drive/Equipment Folder]
Relevant sections: [Chapter/Page numbers if known]
If manual unavailable, contact supplier technical support before proceeding."
```

### 8.4 Integration with Database Schema

**Future enhancement** (not currently in schema):
```sql
-- Potential addition to machines table
ALTER TABLE machines ADD COLUMN equipment_manual_url TEXT;
ALTER TABLE machines ADD COLUMN supplier_contact JSONB; -- {name, phone, email, support_url}
ALTER TABLE machines ADD COLUMN fat_sat_report_url TEXT; -- Link to Factory/Site Acceptance Test reports
```

**AI should suggest** (when manual reference needed):
```
"Consider adding equipment manual link to [Machine] record in machines table for quick reference during maintenance."
```

---

## 9. AI PROMPTING STRATEGY FOR MJC COMPLETION

### 9.1 Initial Assessment Questions

When technician begins "Maintenance Performed" entry, AI should ask:

**Question 1: Context**
```
"What type of maintenance was this?
1. Reactive (breakdown/failure during production)
2. Planned (scheduled preventive maintenance per 4.7F[X])
3. Condition-based (identified during inspection/PPM check)"
```

**Question 2: Safety & Isolation**
```
"Before we document the work, confirm:
- Was [Machine] locked out and isolated (electrical + pneumatic)?
- Were safety protocols followed per manufacturer manual?
This ensures BRCGS compliance with Occupational Health & Safety Act (Section 4.7 Line 105-117)."
```

**Question 3: Parts & Materials**
```
"What parts or materials were used?
Please include:
- Part names and specifications
- Quantities
- NSF certification numbers (for lubricants/cleaners)
- Supplier names (for traceability)

Example: '1x Pillow Block Bearing PB-2024-11 (ABC Bearings, NSF H1 rated)'"
```

**Question 4: Root Cause** (reactive only)
```
"What caused this failure?
- Component wear (age-related)?
- Improper operation?
- Environmental factors (dust, heat, moisture)?
- Insufficient lubrication?
- Other?

Understanding root cause helps prevent recurrence."
```

### 9.2 Progressive Disclosure Prompts

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

**After verification**:
```
"Any preventative recommendations?
- Should this component be added to PPM schedule?
- Is operator retraining needed?
- Are there environmental improvements (dust control, temperature regulation)?
This demonstrates proactive maintenance thinking (BRCGS best practice)."
```

### 9.3 Real-Time Quality Scoring Feedback

AI should display live quality score as technician types:

**Example feedback**:
```
Current Quality Score: 72/100 (Adequate - Requires Revision)

Missing:
- NSF certification for lubricant used (-15 pts)
- Contamination control detail (-10 pts)
- Verification method specifics (-5 pts)

Add these details to reach "Good" quality (75+).
```

**Gamification suggestion**:
```
"Your last 5 MJCs averaged 68/100. Let's aim for 80+ on this one!
High-quality MJCs speed up hygiene clearance and reduce rework."
```

### 9.4 Auto-Suggestions Based on Machine Type

**AI detects machine_id = AMJ-01, suggests**:
```
"Common maintenance on AMJ-01 Flat Pouch Machine:
- Unwind Unit Bearings → Use Foodlube Universal 2 (NSF H1-121603)
- Teflon Replacement → Change at shift changeover (4.7F6 requirement)
- Zipper Plate Cleaning → Use brown scotch bright + Industrial Cleaner (NSF K1-135883)
- Rubber Draw Rollers → Check for wear and foreign objects

Does your work involve any of these? I can auto-fill common details."
```

### 9.5 Glass Breakage Detection

**AI scans description for keywords**: "glass", "broke", "shattered", "light", "bulb", "gauge"

**If detected, immediate alert**:
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

### 9.6 Temporary Repair Workflow

**If `temporary_repair = true`**:
```
"This MJC is flagged as a TEMPORARY REPAIR.

Requirements:
1. Describe the temporary fix clearly
2. Explain what permanent repair is needed
3. System will auto-calculate close-out due date: [TODAY + 14 days]
4. Confirm: Is product contamination risk ZERO? (Temporary repairs only allowed if no contamination risk)

BRCGS Compliance: Section 4.7 Line 236-239 - Temporary repairs must be closed out within 14 days and recorded on maintenance job card."
```

---

## 10. INTEGRATION WITH DATABASE SCHEMA

### 10.1 Schema Validation Rules

**From `mjcs` table** (20251106102000_mjcs_table.sql):

- `description_required`: Minimum 50 characters (Line 98)
- `maintenance_performed`: Required when status = 'in-progress', 'awaiting-clearance', or 'closed' (Line 105-111)
- `hygiene_clearance_signature`: Required when status = 'closed' (Line 112-118)
- `hygiene_checklist`: Must have all 10 items verified before clearance (Line 220-244)
- `temporary_repair = true`: Requires `close_out_due_date` (Line 102-104)
- At least one maintenance type must be checked (Line 122-127)

### 10.2 AI-Database Integration Points

**Auto-population from schema**:
1. `job_card_number`: AI displays "Your MJC number is [MJC-2025-00012345]" (generated by `generate_mjc_number()`)
2. `close_out_due_date`: AI calculates "[TODAY + 14 days]" if temporary repair (trigger: `calculate_mjc_due_date()`)
3. `urgency`: AI prompts "Select urgency based on downtime impact:
   - Critical: <2 hours (production halt)
   - High: <4 hours (significant impact)
   - Medium: <24 hours (minor impact)
   - Low: Planned maintenance"

**Status workflow enforcement**:
```
draft → open → assigned → in-progress → awaiting-clearance → closed
```

AI should guide:
```
"Your MJC is currently 'in-progress'.
To move to 'awaiting-clearance', you must complete:
- Maintenance Performed section (50+ characters)
- Maintenance Signature (via login)
- Work completion timestamp

After hygiene clearance by QA, status will change to 'closed'."
```

### 10.3 Hygiene Checklist (10 Items)

**From schema** (Line 71-73):
```json
hygiene_checklist: [
  {item: "All Excess Grease & Oil Removed", verified: boolean, notes: ""},
  {item: "All Consumables Removed", verified: boolean, notes: ""},
  {item: "All Tools & Equipment Removed", verified: boolean, notes: ""},
  {item: "All Safety Mechanisms in Good Working Order", verified: boolean, notes: ""},
  {item: "All Product Safety Equipment Reinstated (e.g., Swarf Mats)", verified: boolean, notes: ""},
  {item: "Area Inspected and Cleared of Debris (e.g., Metal Swarf, Wood Cuttings)", verified: boolean, notes: ""},
  {item: "Verification that No Contamination Risk Exists", verified: boolean, notes: ""},
  {item: "Inspection for Potential Sources of Foreign Bodies (e.g., Loose Fasteners, Small Parts)", verified: boolean, notes: ""},
  {item: "Inspection for Damage or Wear to Production Surfaces (e.g., Sealer Bars, Rollers)", verified: boolean, notes: ""},
  {item: "Area Prepared and Ready for Production Resumption", verified: boolean, notes: ""}
]
```

**AI prompt** (when technician completes "Maintenance Performed"):
```
"You've completed the maintenance description.
Next step: Post-Hygiene Clearance Checklist (10 items).

Walk through the area and verify each item:
1. All Excess Grease & Oil Removed
2. All Consumables Removed (rags, cloths, lubricant containers)
3. All Tools & Equipment Removed (wrenches, screwdrivers, vacuum)
4. All Safety Mechanisms in Good Working Order (guards, interlocks, e-stops)
5. All Product Safety Equipment Reinstated (swarf mats, drip trays)
6. Area Inspected and Cleared of Debris (metal swarf, wood cuttings, plastic scraps)
7. Verification that No Contamination Risk Exists
8. Inspection for Potential Sources of Foreign Bodies (loose bolts, washers, screws)
9. Inspection for Damage or Wear to Production Surfaces (sealer bars, rollers)
10. Area Prepared and Ready for Production Resumption

Mark each item as verified or add notes if issues found.
QA cannot grant clearance until ALL 10 items are verified."
```

### 10.4 Foreign Keys for Traceability

**From schema**:
- `wo_id`: Links to active work order (traceability to production batch)
- `machine_id`: Links to machine register
- `raised_by_user_id`: Who reported the issue
- `created_by`: Who created the MJC
- `assigned_to`: Maintenance technician assigned

**AI prompt** (when creating MJC):
```
"Link this MJC to current production:
- Work Order: [WO-20251110-AMJ-001] (auto-detected from active WO on [Machine])
- Machine: [AMJ-01 Flat Pouch Making Machine]
- Raised by: [Operator Name]
- Assigned to: [Maintenance Technician Name]

This ensures BRCGS traceability (Section 3.9) - all maintenance linked to production batches."
```

---

## 11. PREVENTATIVE MEASURE RECOMMENDATION RULES

### 11.1 Recurring Failure Detection

**AI should analyze historical MJCs** (via database query):
```sql
-- Find recurring failures on same machine/component
SELECT
  machine_id,
  machine_equipment,
  COUNT(*) as failure_count,
  MAX(created_at) as last_failure,
  MIN(created_at) as first_failure
FROM mjcs
WHERE
  machine_id = [current_machine_id]
  AND description_required ILIKE '%[component_keyword]%'
  AND created_at > NOW() - INTERVAL '6 months'
GROUP BY machine_id, machine_equipment
HAVING COUNT(*) >= 2
ORDER BY failure_count DESC;
```

**AI prompt** (if query returns results):
```
"Historical Analysis:
This is the [X] time '[Component]' has failed on [Machine] in the last [Y] months.
Previous failures:
- [Date 1]: [Brief description]
- [Date 2]: [Brief description]

Recommendation: Add '[Component] Inspection/Replacement' to [Machine] Maintenance Plan (4.7F[X])
Frequency: [Monthly/Bi-annually] based on [X] failures in [Y] months
This reduces unplanned downtime by ~[estimated %] and aligns with BRCGS 4.7 preventive maintenance requirements."
```

### 11.2 Wear Pattern Analysis

**AI should detect wear keywords** in maintenance description:
- "worn", "degraded", "aged", "end of life", "exceeded service interval"

**If detected**:
```
"Wear Analysis:
This component shows age-related degradation.
Current age: [calculated from installation date or last replacement]
Manufacturer expected lifespan: [from equipment manual if available]

Recommendation: Replace '[Component]' proactively at [X-month] intervals before failure.
Add to PPM schedule to prevent future reactive maintenance."
```

### 11.3 Environmental Factor Detection

**AI should detect environmental keywords**:
- "dust", "contamination", "moisture", "heat", "vibration", "overload"

**If detected**:
```
"Environmental Factor Detected: [Dust/Heat/Moisture/Vibration]

Root Cause: Environmental conditions accelerating component wear.

Recommendations:
1. Engineering: Improve [dust control/ventilation/insulation/mounting]
2. Operations: Monitor [temperature/cleanliness/load] more frequently
3. Maintenance: Increase inspection frequency from [current] to [recommended]

Escalate to Maintenance Manager for environmental improvement project?"
```

### 11.4 Operator Error Detection

**AI should detect operator-related keywords**:
- "improper operation", "not changed per procedure", "operator error", "incorrect settings"

**If detected**:
```
"Operator-Related Root Cause Detected

Recommendation:
1. Retrain [Operator Name/Team] on [Procedure 4.7F[X] / SOP]
2. Team Leader to verify compliance during shift handover for next [7/14] days
3. Update training records (Section 6.2 Personnel Competency)
4. Consider visual aids/signage at machine to prevent recurrence

BRCGS Compliance: Section 6.1 Training - documented retraining after procedural non-conformance."
```

### 11.5 PPM Addition Workflow

**AI prompt** (when PPM addition recommended):
```
"Preventative Maintenance Schedule Update Recommended

Machine: [Machine Name] ([Machine Code])
Component: [Component Name]
Recommended Frequency: [Monthly/Bi-annually/Annually]
Recommended Method: [Inspect/Replace/Lubricate/Calibrate]
Responsibility: [Day Shift Operator/Maintenance Technician]

Add to Maintenance Plan:
- Document: [4.7F4/4.7F6/4.7F8/etc.]
- Checklist: [4.7F5/4.7F7/4.7F9/etc.]

Would you like me to draft the PPM addition for Maintenance Manager approval?
(AI can auto-generate maintenance plan entry based on this MJC details)"
```

---

## 12. SUMMARY: AI DECISION TREE FOR MJC ASSISTANCE

```
START: Technician opens "Maintenance Performed" field
├─ Step 1: Detect machine_id → Load machine-specific context (Section 3.3)
│  ├─ DMF/LYS: Load 4.7F4 maintenance plan, common failures
│  ├─ AMJ: Load 4.7F6 maintenance plan, common failures
│  ├─ FES: Load 4.7F13 maintenance plan, common failures
│  └─ MDB/CMH/LAB: Load respective maintenance plans
│
├─ Step 2: Ask initial questions (Section 9.1)
│  ├─ Maintenance type (reactive/planned/condition-based)
│  ├─ Safety confirmation (lockout/tagout)
│  ├─ Parts/materials used (with NSF certs)
│  └─ Root cause (if reactive)
│
├─ Step 3: Progressive disclosure prompts (Section 9.2)
│  ├─ Contamination control detail (blue cloth vs rag)
│  ├─ Verification method (test runs, measurements)
│  └─ Preventative recommendations (PPM additions)
│
├─ Step 4: Real-time quality scoring (Section 6)
│  ├─ Display live score (0-100)
│  ├─ Highlight missing elements
│  └─ Suggest improvements
│
├─ Step 5: Specialized checks
│  ├─ Glass breakage detection → Alert + Glass Register prompt (Section 4)
│  ├─ Temporary repair detection → 14-day close-out reminder (Section 4.1.3)
│  ├─ Cleaning vs maintenance → Differentiate per Section 5.1
│  └─ Recurring failure detection → PPM recommendation (Section 11.1)
│
├─ Step 6: Hygiene checklist guidance (Section 10.3)
│  ├─ Present 10-item checklist
│  ├─ Require verification of all items
│  └─ Prevent clearance if incomplete
│
└─ Step 7: Final validation
   ├─ Minimum 50 characters (database constraint)
   ├─ Quality score ≥60 (adequate threshold)
   ├─ All required fields populated
   └─ Submit for hygiene clearance (QA-only)

END: MJC status → "awaiting-clearance"
```

---

## 13. IMPLEMENTATION CHECKLIST FOR AI SYSTEM

### Phase 1: Core Functionality
- [ ] Load machine-specific maintenance context from BRCGS procedures (Section 3)
- [ ] Implement progressive disclosure prompting (Section 9.1-9.2)
- [ ] Build real-time quality scoring engine (Section 6)
- [ ] Integrate database schema validation (Section 10.1)
- [ ] Create hygiene checklist workflow (Section 10.3)

### Phase 2: Intelligence Features
- [ ] Recurring failure detection (Section 11.1)
- [ ] PPM recommendation engine (Section 2)
- [ ] Glass breakage alerts (Section 4)
- [ ] Temporary repair workflow (Section 9.6)
- [ ] Operator error detection and retraining suggestions (Section 11.4)

### Phase 3: Advanced Integration
- [ ] Equipment manual reference system (Section 8)
- [ ] Historical data analysis (6-month trend detection)
- [ ] Environmental factor analysis (Section 11.3)
- [ ] Wear pattern prediction (Section 11.2)
- [ ] Auto-generate PPM entries for approval (Section 11.5)

### Phase 4: User Experience
- [ ] Gamification (score tracking, improvement trends)
- [ ] Auto-suggestions based on machine type (Section 9.4)
- [ ] Mobile-friendly interface for shop floor use
- [ ] Voice-to-text input (hands-free for technicians wearing gloves)
- [ ] Multi-language support (English/Afrikaans for South African workforce)

---

## APPENDIX A: BRCGS PROCEDURE CROSS-REFERENCES

| Section | Document | Revision | Key Requirements |
|---------|----------|----------|------------------|
| 4.7 | Maintenance Procedure | 14 | PPM schedules, MJC workflow, post-hygiene clearance |
| 4.9 | Housekeeping & Cleaning | 15 | Master Cleaning Schedules, blue cloth vs rag protocol |
| 5.7 | Control of Non-Conforming Product | - | Product hold/quarantine after contamination risk |
| 5.8 | Foreign Body Control (Glass) | - | Glass register updates, breakage protocol |
| 6.1 | Training | - | Operator retraining after procedural violations |
| 3.9 | Traceability | - | Link MJCs to work orders and production batches |

---

## APPENDIX B: NSF CERTIFIED MATERIALS QUICK REFERENCE

| Material | NSF Code | Use Case | Section Reference |
|----------|----------|----------|-------------------|
| Foodlube Universal 2 | NSF H1-121603 | Bearings, linkages, threaded bars, pillar blocks, spindles, slides | 4.7F4, 4.7F6, 4.7F8 |
| Foodlube Hi-Power Compressor Oil | NSF H1 | Air reticulation systems, pneumatic lubricators | 4.7F6 |
| Industrial Cleaner | NSF K1-135883 | Cleaning punches, zipper plates, food contact surfaces | 4.7F4, 4.7F6 |

**CRITICAL**: Always specify NSF certification number in maintenance descriptions to ensure BRCGS audit compliance.

---

## APPENDIX C: COMMON MAINTENANCE KEYWORDS FOR AI PARSING

**Component Keywords**:
- Bearings: pillow block, ball bearing, roller bearing, thrust bearing
- Belts: timing belt, drive belt, conveyor belt
- Rollers: rubber draw roller, aluminum roller, pressure roller
- Seals: sealer bar, cooler bar, Teflon, rubber pad, silicon pad
- Pneumatics: pneumatic silencer, air cylinder, air valve, solenoid
- Electrical: thermocouple, heating element, temperature controller, PLC, sensor

**Action Keywords**:
- Replace, install, remove, disassemble, clean, lubricate, adjust, calibrate, tighten, torque, inspect, verify, test

**Condition Keywords**:
- Worn, damaged, torn, frayed, cracked, loose, stiff, noisy, leaking, misaligned, corroded, degraded

**Cleaning Keywords**:
- Blue cloth, rag, vacuum, wipe, sweep, grease removal, debris, swarf, cuttings, fragments

**Verification Keywords**:
- Test run, cycle, visual inspection, measurement, temperature check, leak test, quality check, no deviation

---

**Document Version**: 1.0
**Created**: 2025-11-10
**Author**: Claude (BRCGS Section 4 Compliance Specialist)
**Review Date**: Quarterly or upon BRCGS procedure revision
