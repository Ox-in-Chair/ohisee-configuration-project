# HARA-Based AI Corrective Action Decision Tree

**Visual Reference Guide for OHiSee NCA System**

---

## DECISION TREE: NCA Classification to Close-Out

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER SUBMITS NCA                                     │
│                    (Description + Process Step)                              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: AI CLASSIFIES HAZARD TYPE                        │
│                                                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────┐│
│  │ Food Safety Hazards  │  │ Functional/Quality   │  │ Legality/Fraud     ││
│  │ • Microbiological    │  │ • Functional         │  │ • Legality         ││
│  │ • Physical           │  │   Integrity          │  │ • Malicious        ││
│  │ • Chemical (all)     │  │ • Consumer Safety    │  │   Intervention     ││
│  │ • Migration          │  │ • Quality Defects    │  │ • Raw Material     ││
│  │ • Recycled Material  │  │                      │  │   Fraud            ││
│  └──────────────────────┘  └──────────────────────┘  └────────────────────┘│
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  STEP 2: AI ASSIGNS SEVERITY LEVEL                           │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │  SEVERITY DETERMINATION LOGIC                                    │     │
│   │                                                                  │     │
│   │  Food Safety Hazard (Physical/Chemical/Micro)?                 │     │
│   │  ├─> YES → Minimum Severity = MAJOR                            │     │
│   │  │   ├─> Foreign Body in Sealed Product? → EXTREME             │     │
│   │  │   ├─> Chemical Contact Food Surface? → EXTREME              │     │
│   │  │   ├─> Seal Integrity Failure? → MAJOR                       │     │
│   │  │   └─> Other Physical/Chemical → MAJOR                       │     │
│   │  │                                                              │     │
│   │  └─> NO → Assess Functional Impact                             │     │
│   │      ├─> Affects Product Safety? → MODERATE-MAJOR              │     │
│   │      └─> Visual/Quality Only? → MINOR                          │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│   OUTPUT: Severity Level + Close-Out Target                                 │
│   • EXTREME: 5 working days                                                 │
│   • MAJOR: 10 working days                                                  │
│   • MODERATE: 15 working days                                               │
│   • MINOR/LOW: 20 working days                                              │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                STEP 3: CHECK FOR ESCALATION REQUIREMENTS                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  REQUIRES QA SUPERVISOR APPROVAL? (Block Submission)           │        │
│  │                                                                │        │
│  │  ☑  Extreme OR Major Severity + Food Safety Impact = YES      │        │
│  │  ☑  Foreign Body: Glass, Metal, Brittle Plastic, Pest         │        │
│  │  ☑  Chemical Contamination from Cooler Bar/Descale/Lubricant  │        │
│  │  ☑  Allergen/Trademark/Legality Hazard                        │        │
│  │  ☑  Seal Integrity + Cross-Contamination Detected             │        │
│  │  ☑  Corrective Action Requires Procedure Change               │        │
│  │  ☑  Trend Alert: >3 Same Failures in 7 Days                   │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  IF YES → ⚠️  BLOCK SUBMISSION → NOTIFY QA SUPERVISOR                       │
│  IF NO  → ✓  PROCEED TO NEXT STEP                                           │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  STEP 4: CHECK CCP / BACK TRACKING                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  HIGH-RISK CONTROL POINTS (CCP Candidates)                     │        │
│  │                                                                │        │
│  │  • Step 5:  Material Receipt (Chemical contamination)         │        │
│  │  • Step 28: Zipper Hot Seal (Seal integrity + cooler leak)    │        │
│  │  • Step 29: Cross Seal (Seal integrity + cooler leak)         │        │
│  │  • Step 33: Side Seal (Seal integrity + cooler leak)          │        │
│  │  • Steps 16, 37, 56: Quality Check Points (Detection)         │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  NCA Process Step in Above List?                                            │
│  ├─> YES → Set ccp_related = TRUE                                           │
│  │         → REQUIRE BACK TRACKING VERIFICATION                             │
│  │         → Generate Task: "Verify cartons [X] to [Y] segregated"         │
│  │         → Block Close-Out until Factory Team Leader signs                │
│  │                                                                           │
│  └─> NO  → Standard NCA workflow                                            │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             STEP 5: ROOT CAUSE ANALYSIS QUALITY SCORING                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  MINIMUM 5-WHY DEPTH REQUIREMENTS                              │        │
│  │                                                                │        │
│  │  • EXTREME:  5-Why mandatory, Quality Score ≥ 90%             │        │
│  │  • MAJOR:    4-5 Why required, Quality Score ≥ 85%            │        │
│  │  • MODERATE: 3-4 Why required, Quality Score ≥ 75%            │        │
│  │  • MINOR:    2-3 Why acceptable, Quality Score ≥ 65%          │        │
│  │  • LOW:      1-2 Why optional, Quality Score ≥ 50%            │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  QUALITY SCORING RUBRIC (100 points)                           │        │
│  │                                                                │        │
│  │  1. Specificity (0-30 points)                                 │        │
│  │     • Generic ("operator error") → 0-10 pts                   │        │
│  │     • Specific ("blade dull") → 11-20 pts                     │        │
│  │     • Very Specific ("blade 50% over life limit") → 21-30 pts │        │
│  │                                                                │        │
│  │  2. Depth of Analysis (0-30 points)                           │        │
│  │     • Surface (1-Why) → 0-10 pts                              │        │
│  │     • Adequate depth per severity → 11-20 pts                 │        │
│  │     • Comprehensive (5-Why for Major/Extreme) → 21-30 pts     │        │
│  │                                                                │        │
│  │  3. Preventability Assessment (0-20 points)                   │        │
│  │     • No prevention → 0-5 pts                                 │        │
│  │     • Vague prevention ("be careful") → 6-10 pts              │        │
│  │     • Specific prevention ("add alarm") → 11-15 pts           │        │
│  │     • Systemic prevention (procedure update) → 16-20 pts      │        │
│  │                                                                │        │
│  │  4. Systemic Thinking (0-20 points)                           │        │
│  │     • Blame individual → 0-5 pts                              │        │
│  │     • Process improvement → 6-10 pts                          │        │
│  │     • System-level improvement → 11-20 pts                    │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Quality Score < Threshold?                                                 │
│  ├─> YES → ⚠️  BLOCK CLOSE-OUT                                              │
│  │         → Provide Feedback: "Root cause needs more depth"               │
│  │         → Suggest Next Why Questions                                    │
│  │                                                                           │
│  └─> NO  → ✓  PROCEED TO CORRECTIVE ACTIONS                                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│          STEP 6: AI GENERATES TIERED CORRECTIVE ACTIONS                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  IMMEDIATE ACTIONS (Before Production Restart)                   │      │
│  │                                                                  │      │
│  │  EXTREME:                                                        │      │
│  │  • Stop line immediately                                         │      │
│  │  • Quarantine all cartons (back tracking)                        │      │
│  │  • Inspect equipment (photo evidence)                            │      │
│  │  • Validation test (e.g., 10 consecutive water tests)            │      │
│  │                                                                  │      │
│  │  MAJOR:                                                          │      │
│  │  • Back track to last known good first-off                       │      │
│  │  • Segregate affected cartons (RED Hold sticker)                 │      │
│  │  • Verify settings against Job Card                              │      │
│  │  • Run new first-off with validation                             │      │
│  │                                                                  │      │
│  │  MODERATE:                                                       │      │
│  │  • Check specification                                           │      │
│  │  • Adjust parameters/settings                                    │      │
│  │  • Verify correction with measurement                            │      │
│  │                                                                  │      │
│  │  MINOR:                                                          │      │
│  │  • Visual inspection                                             │      │
│  │  • Quick correction (e.g., clean roller)                         │      │
│  │  • Verify next 10 pieces OK                                      │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  SHORT-TERM ACTIONS (5-20 Days)                                  │      │
│  │                                                                  │      │
│  │  • Calibration verification (if measuring device involved)      │      │
│  │  • Operator re-training (if procedure not followed)              │      │
│  │  • Maintenance repair/replacement (if equipment failure)         │      │
│  │  • Procedure clarification (if work instruction unclear)         │      │
│  │  • Review Production Log Sheet trends                            │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │  LONG-TERM ACTIONS (20+ Days)                                    │      │
│  │                                                                  │      │
│  │  • HARA review (if control measure failure)                      │      │
│  │  • Equipment upgrade (if chronic issue)                          │      │
│  │  • Validation study (if control effectiveness questioned)        │      │
│  │  • Trend analysis (if recurring pattern)                         │      │
│  │  • Procedure update (systemic improvement)                       │      │
│  └──────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              STEP 7: CHECK HARA REVIEW TRIGGER CONDITIONS                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  AUTO-TRIGGER HARA REVIEW WHEN:                                │        │
│  │                                                                │        │
│  │  1. Novel Failure Mode (not in HARA hazard analysis)          │        │
│  │     Example: "Skylight fragment falls on production line"     │        │
│  │                                                                │        │
│  │  2. Control Measure Failure (HARA preventive measure fails)   │        │
│  │     Example: "Blade broke despite Blade Register maintenance" │        │
│  │                                                                │        │
│  │  3. Increased Likelihood (trend: >5 same NCAs in 90 days)     │        │
│  │     Example: "Cooler bar leaks 6x in 90 days (was Rare)"      │        │
│  │                                                                │        │
│  │  4. Severity Re-Classification (impact worse than assessed)   │        │
│  │     Example: "Delamination now causing seal failures"         │        │
│  │                                                                │        │
│  │  5. Supplier Change (new hazard profile)                      │        │
│  │     Example: "New film supplier has strong odor (taint)"      │        │
│  │                                                                │        │
│  │  6. Customer Complaint Trend (>3 complaints in 30 days)       │        │
│  │     Example: "8 complaints about zipper opening force"        │        │
│  │                                                                │        │
│  │  7. Regulatory/Legislative Change                             │        │
│  │     Example: "New FDA migration limits for LLDPE"             │        │
│  │                                                                │        │
│  │  8. Audit Finding (HARA documentation gap identified)         │        │
│  │     Example: "Temporary modifications not in HARA"            │        │
│  │                                                                │        │
│  │  9. Incident with Safety Consequence (withdrawal/recall)      │        │
│  │     Example: "Product withdrawal due to pest contamination"   │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  IF TRIGGERED:                                                              │
│  ├─> Create HARA Review Task                                                │
│  ├─> Assign to HARA Team Leader (Operations Manager)                        │
│  ├─> Set Priority: Immediate / 5 days / 10 days (based on severity)         │
│  ├─> Generate Review Briefing (affected steps, proposed enhancements)       │
│  └─> ⚠️  BLOCK NCA CLOSE-OUT until HARA review completed or waived          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           STEP 8: VALIDATION EVIDENCE REQUIREMENTS CHECK                     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  REQUIRE VALIDATION EVIDENCE UPLOAD FOR:                       │        │
│  │                                                                │        │
│  │  • Seal Integrity Failures                                    │        │
│  │    → Water test photo (5 min submersion, no bubbles)          │        │
│  │    → Opening force test results (if zipper)                   │        │
│  │    → TDP readings from first-off after correction             │        │
│  │                                                                │        │
│  │  • Foreign Body Contamination                                 │        │
│  │    → Photo of contaminated product                            │        │
│  │    → Photo of foreign body source                             │        │
│  │    → Inspection results showing elimination                   │        │
│  │                                                                │        │
│  │  • Chemical Contamination                                     │        │
│  │    → Cooler bar inspection report (if leak)                   │        │
│  │    → Material Safety Data Sheet (if new chemical)             │        │
│  │    → Environmental monitoring swab results                    │        │
│  │                                                                │        │
│  │  • Equipment Malfunction                                      │        │
│  │    → Maintenance log entry showing repair completed           │        │
│  │    → Calibration verification (if measuring device)           │        │
│  │    → First-off sample after equipment repair                  │        │
│  │                                                                │        │
│  │  • Process Out of Spec (Concession)                           │        │
│  │    → Comparison test results (out vs. in spec)                │        │
│  │    → Customer approval (if affects specification)             │        │
│  │    → Risk assessment (no safety impact)                       │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Evidence Required?                                                         │
│  ├─> YES → ⚠️  BLOCK CLOSE-OUT until evidence uploaded                      │
│  │         → AI validates evidence (timestamp, WO number, signature)        │
│  │                                                                           │
│  └─> NO  → ✓  PROCEED TO CLOSE-OUT CHECK                                    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                STEP 9: CLOSE-OUT ELIGIBILITY CHECK                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  NCA CAN CLOSE ONLY WHEN ALL TRUE:                             │        │
│  │                                                                │        │
│  │  ☐  Root Cause Quality Score ≥ Threshold                      │        │
│  │     (Extreme: 90%, Major: 85%, Moderate: 75%, Minor: 65%)     │        │
│  │                                                                │        │
│  │  ☐  Validation Evidence Uploaded                              │        │
│  │     (if requires_validation_evidence = TRUE)                  │        │
│  │                                                                │        │
│  │  ☐  Back Tracking Verified                                    │        │
│  │     (Factory Team Leader signature on NCA)                    │        │
│  │                                                                │        │
│  │  ☐  QA Supervisor Approved                                    │        │
│  │     (if requires_qa_supervisor_approval = TRUE)               │        │
│  │                                                                │        │
│  │  ☐  HARA Review Completed                                     │        │
│  │     (if hara_review_triggered = TRUE)                         │        │
│  │                                                                │        │
│  │  ☐  Disposition Determined                                    │        │
│  │     (Reject / Rework-Sorting / Concession)                    │        │
│  │                                                                │        │
│  │  ☐  Within Close-Out Target Date                              │        │
│  │     (Extreme: 5, Major: 10, Moderate: 15, Minor: 20 days)     │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  ALL CONDITIONS MET?                                                        │
│  ├─> YES → ✅  ALLOW NCA CLOSE-OUT                                          │
│  │         → Archive NCA record                                            │
│  │         → Update NCA Trend Analysis                                     │
│  │         → Link to HARA review if applicable                             │
│  │                                                                           │
│  └─> NO  → ⚠️  BLOCK CLOSE-OUT                                              │
│           → Display Blockers List                                           │
│           → Show Next Required Actions                                      │
│           → If Overdue: Alert Commercial Manager (weekly)                   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
                             ┌────────────────┐
                             │   NCA CLOSED   │
                             └────────────────┘
```

---

## SEVERITY CLASSIFICATION QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SEVERITY LEVEL DECISION                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  EXTREME (Close-Out: 5 Days)                                  │ │
│  │  • Foreign body in sealed product (glass, metal, pest)        │ │
│  │  • Chemical contact with food surface (cooler bar leak)       │ │
│  │  • Allergen contamination or hidden allergen labeling         │ │
│  │  • Trademark fraud / malicious intervention                   │ │
│  │  • Microbiological contamination (bacteria from equipment)    │ │
│  │  • Regulatory non-compliance (FDA/EU limits exceeded)         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  MAJOR (Close-Out: 10 Days)                                   │ │
│  │  • Seal integrity failure (side seal, zipper crush, 3-point)  │ │
│  │  • Foreign body at high-risk control point (blade chip)       │ │
│  │  • Chemical migration risk (non-food grade ink)               │ │
│  │  • Consumer safety defect (spout leak, cap fit failure)       │ │
│  │  • Functional integrity affecting product safety              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  MODERATE (Close-Out: 15 Days)                                │ │
│  │  • Dimensional defect affecting function (height/width)       │ │
│  │  • Weak opening force (zipper not locking)                    │ │
│  │  • Process out of spec (TDP drift, not critical limit)        │ │
│  │  • Storage/handling issue (damaged pallet → wood chips)       │ │
│  │  • Misprint not affecting safety (ink splash, clarity)        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  MINOR (Close-Out: 20 Days)                                   │ │
│  │  • Cosmetic defect (scuff marks, creases, no seal damage)     │ │
│  │  • Visual quality (clarity, appearance, not safety-related)   │ │
│  │  • Small dimensional tolerance breach (<2mm)                  │ │
│  │  • Feature positioning (euro slot, tear nick slightly off)    │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  LOW (Close-Out: 20 Days)                                     │ │
│  │  • Negligible impact, no specification breach                 │ │
│  │  • Near-miss incident (no actual non-conformance)             │ │
│  │  • Administrative error (labeling, paperwork)                 │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## HIGH-RISK CONTROL POINTS (CCP CANDIDATES)

```
┌────────────────────────────────────────────────────────────────────────┐
│  PROCESS STEP          HAZARD CONTROLLED            AI REQUIREMENTS    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 5:               Chemical contamination       • Notify QA        │
│  Material Receipt      from co-loading in           • Back tracking    │
│                        transport vehicle            • Supplier NCA     │
├────────────────────────────────────────────────────────────────────────┤
│  Step 12:              Foreign body exposure        • Photo evidence   │
│  Removal of            when removing outer          • Inspection       │
│  Outer Packaging       packaging                    • Source ID        │
├────────────────────────────────────────────────────────────────────────┤
│  Step 14:              Blade chip contamination     • Blade photo      │
│  Set Blades            during slitting process      • Blade Register   │
│  (Slitting)                                         • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 16:              Detection point for          • Forensic         │
│  Checked for Defects   quality/safety issues        • HARA review if   │
│  (Slitting)                                         • source unknown   │
├────────────────────────────────────────────────────────────────────────┤
│  Step 24:              Blade chip contamination     • Blade photo      │
│  Set Blade             during vertical bar          • Blade Register   │
│  (Pouch Makers)        slitting                     • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 28:              • Seal integrity failure     • Water test       │
│  Zipper Insertion      • Cooler bar chemical leak   • TDP readings     │
│  & Hot Seal            • Microbiological from       • Swab results     │
│                          water leak                 • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 29:              • Seal integrity failure     • Water test       │
│  Cross Seal            • Cooler bar chemical leak   • TDP readings     │
│  (Gusset & Straight)                               • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 33:              • Seal integrity failure     • Water test       │
│  Side Seal             • Cooler bar contamination   • TDP readings     │
│  & Cooler Bars                                      • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 36:              Blade chip contamination     • Blade photo      │
│  Final Cut             during final cutting         • Blade Register   │
│  (Pouch Makers)                                     • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 37:              Detection point for          • Forensic         │
│  Product Checked       quality/safety issues        • HARA review if   │
│  for Defects                                        • source unknown   │
│  (Pouch Makers)                                                        │
├────────────────────────────────────────────────────────────────────────┤
│  Steps 52-55:          Seal integrity failure       • Leak test        │
│  Hot Seals             at spout insertion           • Pressure check   │
│  (Spout Inserter)                                   • Back tracking    │
├────────────────────────────────────────────────────────────────────────┤
│  Step 56:              Detection point for          • Forensic         │
│  Checked for Defects   quality/safety issues        • HARA review if   │
│  (Spout Inserter)                                   • source unknown   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## HARA REVIEW TRIGGER DECISION MATRIX

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRIGGER CONDITION         EXAMPLE                      PRIORITY    │
├─────────────────────────────────────────────────────────────────────┤
│  1. Novel Failure Mode     "Skylight fragment falls    IMMEDIATE    │
│     (not in HARA)          on production line"                      │
│                            → Not in HARA Step analysis              │
├─────────────────────────────────────────────────────────────────────┤
│  2. Control Measure        "Blade broke despite        5 DAYS       │
│     Failure                Blade Register shows        (Extreme/    │
│                            maintenance completed"      Major)       │
│                            → HARA preventive measure               │
│                              proved ineffective                     │
├─────────────────────────────────────────────────────────────────────┤
│  3. Increased Likelihood   "Cooler bar leaks 6x in     10 DAYS      │
│     (Trend: >5 NCAs        90 days"                                │
│      in 90 days)           → Was assessed as "Rare"                │
│                            → Now occurring "Likely"                 │
├─────────────────────────────────────────────────────────────────────┤
│  4. Severity               "Delamination (was Minor)   5 DAYS       │
│     Re-Classification      now causing seal failures   (Major       │
│                            (Major)"                     impact)      │
│                            → Impact worse than                       │
│                              originally assessed                     │
├─────────────────────────────────────────────────────────────────────┤
│  5. Supplier Change        "New film supplier has      10 DAYS      │
│     (New Hazard)           strong odor (taint          │
│                            hazard)"                                 │
│                            → New hazard profile not                 │
│                              in current HARA                        │
├─────────────────────────────────────────────────────────────────────┤
│  6. Customer Complaint     "8 complaints about         10 DAYS      │
│     Trend (>3 in 30 days)  zipper opening force in                 │
│                            60 days"                                 │
│                            → Property not currently                 │
│                              monitored in HARA                      │
├─────────────────────────────────────────────────────────────────────┤
│  7. Regulatory/            "New FDA migration limits   10 DAYS      │
│     Legislative Change     for LLDPE"                               │
│                            → Requires re-validation                 │
│                              of supplier compliance                 │
├─────────────────────────────────────────────────────────────────────┤
│  8. Audit Finding          "Temporary modifications    10 DAYS      │
│     (HARA Gap)             not included in HARA"                    │
│                            → HARA documentation gap                 │
│                              identified                             │
├─────────────────────────────────────────────────────────────────────┤
│  9. Incident with Safety   "Product withdrawal due     IMMEDIATE    │
│     Consequence            to pest contamination"                   │
│     (Withdrawal/Recall)    → Control effectiveness                  │
│                              questioned                             │
└─────────────────────────────────────────────────────────────────────┘

ACTION: Create HARA Review Task → Assign to HARA Team Leader (Operations
Manager) → Block NCA Close-Out until review completed or waived
```

---

## ROOT CAUSE QUALITY SCORING EXAMPLES

```
┌──────────────────────────────────────────────────────────────────────┐
│  ROOT CAUSE DESCRIPTION                          SCORE      GRADE    │
├──────────────────────────────────────────────────────────────────────┤
│  "Operator mistake"                              15%        F        │
│  → Too generic, no depth, no prevention                             │
│  → AI Feedback: "Why did operator make mistake?                     │
│                  Was training adequate? Was                          │
│                  procedure clear?"                                   │
├──────────────────────────────────────────────────────────────────────┤
│  "Temperature too low"                           36%        F        │
│  → Somewhat specific, shallow depth                                 │
│  → AI Feedback: "Why was temperature too low?                       │
│                  Who/what controls temperature?                      │
│                  Is equipment calibrated?"                           │
├──────────────────────────────────────────────────────────────────────┤
│  "Temperature 5°C below spec because              57%        D        │
│   operator did not verify first-off"                                │
│  → Specific, but needs more depth                                   │
│  → AI Feedback: "Why did operator not verify?                       │
│                  Was checklist followed? Was it                      │
│                  visible?"                                           │
├──────────────────────────────────────────────────────────────────────┤
│  "Temperature 5°C below spec due to               80%        B        │
│   sensor drift. Operator did not detect                             │
│   because first-off checklist not followed.                         │
│   Checklist not visibly posted at machine                           │
│   after line change."                                               │
│  → Good specificity and depth                                       │
│  → AI Feedback: "Good root cause analysis.                          │
│                  Consider: Why was checklist not                     │
│                  posted? What system allows this?"                   │
├──────────────────────────────────────────────────────────────────────┤
│  "Temperature 5°C below spec due to sensor       100%        A+       │
│   drift (last calibration 6 months ago,                             │
│   exceeds 3-month requirement in 5.6                                │
│   Calibration Procedure). Operator did not                          │
│   detect because first-off checklist not                            │
│   visibly posted after line change.                                 │
│   Housekeeping procedure does not include                           │
│   checklist positioning verification in line                        │
│   clearance. PREVENTIVE MEASURE: Add                                │
│   calibration due date alarm to maintenance                         │
│   system + update housekeeping procedure to                         │
│   include checklist positioning in line                             │
│   clearance verification."                                          │
│  → Excellent: Specific, deep, systemic,                             │
│    with concrete prevention                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## VALIDATION EVIDENCE QUICK REFERENCE

```
┌─────────────────────────────────────────────────────────────────────┐
│  NCA TYPE                  REQUIRED EVIDENCE         ACCEPTANCE     │
│                                                      CRITERIA        │
├─────────────────────────────────────────────────────────────────────┤
│  Seal Integrity Failure    • Water test photo        • Clear image  │
│                            • Pouch submerged 5 min   • No bubbles   │
│                            • WO number visible       • Timestamp    │
│                            • TDP readings (before    • Within spec  │
│                              and after correction)                  │
├─────────────────────────────────────────────────────────────────────┤
│  Foreign Body              • Photo of contaminated   • Clear image  │
│  Contamination             product                   • Foreign body │
│                            • Photo of source         • visible      │
│                            • Inspection report       • WO number    │
│                              (elimination verified)  • Signature    │
├─────────────────────────────────────────────────────────────────────┤
│  Chemical Contamination    • Cooler bar inspection   • Photo of     │
│                              report (if leak)        • leak source  │
│                            • MSDS (if new chemical)  • Swab results │
│                            • Environmental           • (negative)   │
│                              monitoring swab         • Date <24hrs  │
├─────────────────────────────────────────────────────────────────────┤
│  Equipment Malfunction     • Maintenance log entry   • Certified    │
│                            • Calibration certificate • technician   │
│                              (if device involved)    • Signature    │
│                            • First-off sample        • Within due   │
│                              (after repair)          • date         │
├─────────────────────────────────────────────────────────────────────┤
│  Process Out of Spec       • Comparison test results • BRC/FDA      │
│  (Concession)              • Customer approval       • certified    │
│                            • Risk assessment         • lab          │
│                              (no safety impact)      • Approval     │
│                                                      • signature    │
└─────────────────────────────────────────────────────────────────────┘

⚠️  AI BLOCKS CLOSE-OUT if required evidence missing or fails validation
```

---

**END OF VISUAL DECISION TREE**

**For detailed implementation guidance, see:**
- `HARA_AI_CORRECTIVE_ACTION_DECISION_FRAMEWORK.md` (Full Framework)
- `HARA_AI_IMPLEMENTATION_SUMMARY.md` (Developer Quick Reference)
