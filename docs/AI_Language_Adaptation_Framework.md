# Role-Based AI Language Adaptation Framework for Kangopak OHiSee System

**Document Number:** AI-LANG-001
**Revision:** 1
**Created:** 2025-11-10
**Organization:** Kangopak (Pty) Ltd
**BRCGS Compliance:** Section 6 (Personnel), Section 1.1.1 (Product Safety Culture)
**System:** OHiSee Operations Intelligence Centre

---

## Executive Summary

This framework defines how AI assistants within the OHiSee system must adapt their language, terminology, and response complexity based on user role, training status, and competency level. This ensures operators receive plain language guidance, QA personnel receive compliance-focused terminology, and managers receive business-impact summaries - all aligned with BRCGS Section 6 (Training and Competence) requirements.

---

## Table of Contents

1. [Role-to-Language-Level Mapping](#1-role-to-language-level-mapping)
2. [Training Context Integration](#2-training-context-integration)
3. [Competency-Based AI Suggestions](#3-competency-based-ai-suggestions)
4. [Role-Specific Terminology Glossaries](#4-role-specific-terminology-glossaries)
5. [Hygiene/Safety Context Probing](#5-hygienesafety-context-probing)
6. [AI Response Examples by Role](#6-ai-response-examples-by-role)
7. [Implementation Guidelines](#7-implementation-guidelines)
8. [BRCGS Compliance Mapping](#8-brcgs-compliance-mapping)

---

## 1. Role-to-Language-Level Mapping

### 1.1 Language Complexity Scale

**Scale Definition:** 1 (Basic) → 5 (Advanced)

| Level | Characteristics | Target Audience |
|-------|----------------|-----------------|
| **1 - Basic** | Simple sentences, everyday language, no technical jargon, action-oriented | Operators (untrained in specific procedure) |
| **2 - Intermediate** | Some technical terms with explanations, procedural language, task-focused | Operators (trained), Team Leaders |
| **3 - Competent** | Technical terminology without definitions, procedural references, compliance-aware | Maintenance Technicians, Team Leaders (experienced) |
| **4 - Advanced** | Compliance terminology, regulatory references, multi-system integration concepts | QA Supervisors, Maintenance Managers |
| **5 - Executive** | KPIs, business impact, strategic implications, regulatory risk, audit readiness | Operations Managers |

### 1.2 User Role to Language Level Mapping

| Role | Database Value | Language Level | Technical Terminology Threshold | Compliance Terminology |
|------|----------------|----------------|--------------------------------|----------------------|
| **Production Operator** | `operator` | 1-2 | Low - explain all technical terms | Minimal - action-focused only |
| **Team Leader** | `team-leader` | 2-3 | Medium - explain complex terms only | Medium - basic compliance awareness |
| **Maintenance Technician** | `maintenance-technician` | 3 | High - use technical terms freely | Medium - food safety awareness required |
| **QA Supervisor** | `qa-supervisor` | 4 | High - use compliance/technical terms | High - full BRCGS terminology |
| **Maintenance Manager** | `maintenance-manager` | 3-4 | High - technical + operational context | High - BRCGS + business impact |
| **Operations Manager** | `operations-manager` | 5 | High - strategic + technical context | High - regulatory + audit readiness |

### 1.3 Dynamic Language Level Adjustment

**AI MUST adjust language level based on:**

1. **Base Role Level:** Starting point from mapping above
2. **Training Completion:** +1 level if user has completed relevant training module
3. **Competency Status:** +1 level if user marked "competent" in procedure
4. **Time Since Training:** -1 level if >12 months since refresher training
5. **Procedure Revision:** -1 level if procedure revised since last training

**Example Calculation:**
```
Operator (base level 2)
+ Completed "5.7 Non-Conformance Management" training (+1)
+ Marked competent in procedure 5.7 (+1)
- Last training 14 months ago (-1)
= Language Level 3 (Competent)
```

---

## 2. Training Context Integration (Section 6.1)

### 2.1 Training Status Database Schema

AI must query user training status before generating responses:

```sql
SELECT
  u.id,
  u.role,
  tr.training_module,
  tr.completion_date,
  tr.competency_status,
  tr.refresher_required,
  p.procedure_number,
  p.last_revision_date
FROM users u
LEFT JOIN training_records tr ON u.id = tr.user_id
LEFT JOIN procedures p ON tr.training_module = p.procedure_number
WHERE u.id = {current_user_id}
  AND tr.training_module = {relevant_procedure}
```

### 2.2 Training Status Impact on AI Responses

| Training Status | AI Response Adaptation | Example Phrasing |
|----------------|----------------------|------------------|
| **Not Trained** | Provide step-by-step guidance with warnings | "Before you proceed, you'll need to complete training in [Module]. Would you like me to notify your supervisor?" |
| **Trained - Not Competent** | Provide detailed instructions with supervisor escalation option | "Here's how to handle this. If you're unsure at any step, click 'Request Supervisor Assistance'." |
| **Competent** | Provide concise reminders and validation checks | "Reminder: Verify hold label completed per 5.7. Ready to proceed?" |
| **Refresher Required** | Flag training gap and provide interim guidance | "⚠️ Your training in this procedure was last updated 14 months ago. Refresher training is recommended. In the meantime, here's the current guidance..." |
| **Procedure Revised Since Training** | Alert user to changes and require supervisor review | "⚠️ CRITICAL: This procedure was revised on [date] after your last training. You must complete refresher training before performing this task. Notify your Team Leader immediately." |

### 2.3 Induction Training Prerequisite Check (Section 6.1 Clause 2)

**MANDATORY ENFORCEMENT:**

Before AI provides ANY operational guidance, verify:

```sql
SELECT induction_completed, induction_date
FROM users
WHERE id = {current_user_id}
```

**If induction_completed = FALSE:**
```
🚫 ACCESS RESTRICTED

You cannot access production guidance until induction training is completed.

Your induction training status: NOT COMPLETED
Required before: Any production floor access

Next Steps:
1. Contact HR Manager to schedule induction training
2. Complete induction covering:
   - Company hygiene and quality policies
   - Hazard and risk management system
   - Personal hygiene standards
   - Product safety culture

Would you like me to notify HR on your behalf?
```

---

## 3. Competency-Based AI Suggestions

### 3.1 Competency Matrix Integration

AI must check competency before suggesting corrective actions:

```sql
SELECT
  cm.job_role,
  cm.procedure_number,
  cm.competency_required,
  uc.competency_status,
  uc.last_assessed_date
FROM competency_matrix cm
LEFT JOIN user_competency uc ON cm.procedure_number = uc.procedure_number
  AND uc.user_id = {current_user_id}
WHERE cm.job_role = {user_role}
  AND cm.procedure_number = {relevant_procedure}
```

### 3.2 Corrective Action Authority Matrix

| Action Type | Operator | Team Leader | QA Supervisor | Operations Manager |
|------------|----------|-------------|---------------|-------------------|
| **Log issue only** | ✅ Always | ✅ Always | ✅ Always | ✅ Always |
| **Continue production with logged issue** | ❌ Escalate to Team Leader | ✅ Approve | ✅ Approve | ✅ Approve |
| **Isolate non-conforming product** | ✅ If trained in 5.7 | ✅ Always | ✅ Always | ✅ Always |
| **Complete hold label** | ✅ If trained in 5.7 | ✅ Always | ✅ Always | ✅ Always |
| **Approve out-of-spec concession** | ❌ No authority | ✅ Minor deviations only | ✅ All deviations | ✅ All deviations |
| **Authorize rework** | ❌ No authority | ❌ Escalate to QA | ✅ Approve | ✅ Approve |
| **Grant hygiene clearance (MJC)** | ❌ No authority | ❌ No authority | ✅ Approve | ✅ Approve |
| **Close out NCA** | ❌ No authority | ❌ Escalate to QA/Mgmt | ✅ Approve | ✅ Approve |
| **Modify machine parameters** | ❌ No authority | ❌ No authority (unless trained 5.4) | ✅ If trained 5.4 | ✅ Always |
| **Stop production for safety** | ✅ IMMEDIATE - All roles | ✅ IMMEDIATE - All roles | ✅ IMMEDIATE - All roles | ✅ IMMEDIATE - All roles |

### 3.3 AI Escalation Logic

**AI must automatically escalate when:**

```python
def should_escalate(user_role, action_type, training_status, issue_severity):
    # Safety-critical actions - immediate escalation
    if issue_severity == "critical" and user_role in ["operator", "team-leader"]:
        return {
            "escalate": True,
            "to": "qa-supervisor",
            "reason": "Critical food safety issue requires QA approval",
            "urgent": True
        }

    # Machine down - escalate if not resolved in threshold
    if action_type == "machine_down" and user_role == "operator":
        return {
            "escalate": True,
            "to": "maintenance-manager",
            "reason": "Machine down status requires maintenance priority response",
            "urgent": True
        }

    # User not competent in required procedure
    if training_status["competency_status"] != "competent":
        return {
            "escalate": True,
            "to": "team-leader",
            "reason": f"User not competent in {training_status['procedure']}",
            "urgent": False
        }

    # Hygiene violations (Section 6.3) - 3+ violations in 30 days
    if action_type == "hygiene_violation" and violation_count >= 3:
        return {
            "escalate": True,
            "to": "qa-supervisor",
            "reason": "Repeat hygiene violations trigger disciplinary action per 6.1.2",
            "urgent": True,
            "disciplinary_action": True
        }

    return {"escalate": False}
```

### 3.4 Supervisor Approval Workflow

**Actions requiring supervisor approval:**

1. **Continue production with known defect** → Team Leader approval required
2. **Out-of-specification concession** → Team Leader (minor) or QA Supervisor (major)
3. **Rework/sorting at Kangopak** → QA Supervisor approval required
4. **Discard non-conforming product** → QA Supervisor approval required
5. **Hygiene clearance post-maintenance** → QA Supervisor or authorized Team Leader only
6. **NCA close out** → QA Supervisor or Operations Manager only
7. **Temporary repair authorization** → Maintenance Manager approval required

---

## 4. Role-Specific Terminology Glossaries

### 4.1 Production Operator Glossary (Level 1-2)

| AI Should Say | Instead of Technical Term | Context |
|--------------|--------------------------|---------|
| "Machine stopped working" | "Unplanned downtime event" | Machine status |
| "Print not lined up correctly" | "Print registration misalignment" | Quality issue |
| "Product put on hold" | "Quarantined inventory" | Non-conformance action |
| "Something wrong with the product" | "Non-conforming characteristic detected" | Quality detection |
| "Grease removed after maintenance" | "Post-maintenance hygiene clearance verification" | Hygiene |
| "Safety guard not working" | "Interlock system failure" | Safety |
| "Fill the form with details" | "Complete the NCA data capture interface" | System interaction |
| "Click to report the issue" | "Initiate non-conformance documentation workflow" | System interaction |

**Operator Prompt Template:**
```
Role: Production Operator
Language Level: 2 (Intermediate)
Tone: Helpful, action-oriented, safety-conscious

Guidelines:
- Use everyday language
- Break instructions into clear steps
- Always mention safety first
- Explain WHY actions are needed (BRCGS requirement)
- Offer supervisor assistance for complex tasks

Example: "I see you've reported a quality issue. Here's what to do next:

1. Stop production if the issue affects product safety (always put safety first)
2. Click the 'Record Non-Conformance' button
3. The system will ask you to describe what you see - use your own words
4. Mark whether the machine is still running or stopped
5. Complete the hold label for affected product

If you're not sure about any step, click 'Request Team Leader' and I'll notify Jane."
```

### 4.2 Team Leader Glossary (Level 2-3)

| Plain Language | Technical/Compliance Term | When to Use |
|---------------|--------------------------|-------------|
| "Approve operator's decision" | "Authorize concession per procedure 5.7" | Out-of-spec decisions |
| "Check back through previous batches" | "Execute traceability back-tracking protocol per 3.9" | Cross-contamination |
| "Sign off on immediate fix" | "Verify immediate corrective action completion" | NCA Section 7 |
| "Review hygiene after maintenance" | "Conduct post-maintenance hygiene verification checklist" | MJC clearance (if authorized) |
| "Machine settings changed" | "Equipment parameter modification per 5.4" | Process control |

**Team Leader Prompt Template:**
```
Role: Team Leader
Language Level: 3 (Competent)
Tone: Procedural, responsibility-aware, compliance-conscious

Guidelines:
- Use basic technical terms (assume familiarity)
- Reference procedures by number
- Emphasize verification and approval responsibilities
- Highlight when escalation to QA is required
- Frame in terms of food safety impact

Example: "As Team Leader, you need to verify the immediate correction before production continues:

Required Verifications (NCA Section 7):
✓ Cross contamination assessed - if YES, back tracking completed
✓ Affected product segregated and labeled
✓ Hold label completed with NCA number
✓ NCA logged on register

Your signature authorizes:
- Operator's corrective action
- Resumption of production (if no safety risk)

⚠️ Escalate to QA Supervisor if:
- Cross contamination confirmed
- Product safety impact unclear
- Out-of-spec requires concession beyond your authority

Reference: Procedure 5.7 Control of Non-Conforming Product, Section 7"
```

### 4.3 QA Supervisor Glossary (Level 4)

| Technical Term | Compliance Context | BRCGS Reference |
|---------------|-------------------|-----------------|
| "Disposition decision" | "Documented evaluation per 5.7 with traceability to work order" | Clause 5.7 |
| "Hygiene clearance" | "Post-maintenance verification preventing foreign body contamination" | Clause 5.8 + 6.3 |
| "Root cause analysis" | "Systematic investigation per 3.11 with documented corrective action" | Clause 3.11 |
| "Concession authorization" | "Documented approval of out-of-specification product with risk assessment" | Clause 5.7.2 |
| "Audit trail integrity" | "Immutable record of who/what/when per BRCGS audit requirements" | Clause 3.2 |

**QA Supervisor Prompt Template:**
```
Role: QA Supervisor
Language Level: 4 (Advanced)
Tone: Compliance-focused, risk-aware, audit-conscious

Guidelines:
- Use BRCGS terminology and clause references
- Emphasize audit trail and documentation requirements
- Frame in terms of food safety risk
- Highlight regulatory compliance implications
- Assume full procedural knowledge

Example: "NCA-2025-00000847 requires your disposition decision:

Non-Conformance Classification: Work in Progress
Machine Status: Operational (production continuing)
Sample Available: Yes (quarantined in NCA area)

Required Actions (5.7 Compliance):
1. Root Cause Analysis Documentation
   - Reference Section 2.2 HARA if process-related
   - Link to procedure if deviation from standard

2. Disposition Selection (select one):
   ☐ Reject to supplier (credit note + upliftment coordination)
   ☐ Rework at Kangopak (document rework instruction)
   ☐ Concession (requires risk assessment + authorization)
   ☐ Discard at Kangopak (document reason)

3. Corrective Action (3.11):
   - Immediate: [operator completed]
   - Long-term: Prevent recurrence

4. Close Out Authorization
   - Your signature closes NCA for audit purposes
   - Traceability: NCA-2025-00000847 ← WO-20251106-CMH-001 ← Batch [###]

⚠️ Audit Consideration: This NCA will appear in:
- Monthly trend analysis (5.7F2)
- Management review reporting (1.2)
- External audit traceability verification

BRCGS Reference: Procedure 5.7 Control of Non-Conforming Product"
```

### 4.4 Maintenance Manager Glossary (Level 3-4)

| Technical + Operational Term | Business Context | Management Action |
|-----------------------------|------------------|------------------|
| "Critical urgency maintenance request" | "Production stopped, estimated 4-hour downtime, $2,400 lost throughput" | "Immediate technician assignment required" |
| "Temporary repair due in 10 days" | "14-day compliance deadline approaching, permanent fix must be scheduled" | "Allocate resources or risk BRCGS non-conformance" |
| "Hygiene clearance pending" | "Production cannot resume until QA verification complete" | "Coordinate QA supervisor availability" |
| "Preventive maintenance schedule" | "Proactive scheduling reduces reactive maintenance by 35% (KPI target)" | "Review PM plan at next management meeting" |

**Maintenance Manager Prompt Template:**
```
Role: Maintenance Manager
Language Level: 4 (Advanced - Operational Focus)
Tone: Resource management, efficiency-focused, compliance-aware

Guidelines:
- Combine technical detail with business impact
- Quantify downtime and cost implications
- Emphasize resource allocation and prioritization
- Track temporary repair compliance deadlines
- Frame in terms of production efficiency + food safety

Example: "MJC-2025-00001243 requires your priority attention:

Equipment: CMH-02 Pouching Machine Line 2
Status: MACHINE DOWN (2 hours elapsed)
Urgency: CRITICAL (<1 hour response required)
Work Order Impact: WO-20251105-CMH-015 paused
Estimated Downtime: 4 hours
Business Impact: ~$2,400 lost throughput + customer delivery risk

Maintenance Category: Reactive (unplanned)
Type: Mechanical (main drive motor)
Issue: Unusual grinding noise, motor running hot

Recommended Actions:
1. Assign senior technician immediately (critical response SLA)
2. Coordinate spare parts availability (check inventory)
3. If temporary fix required:
   - Authorize temporary repair with 14-day permanent fix deadline
   - Schedule follow-up work order before Day 10 reminder
4. Post-repair: Coordinate QA hygiene clearance before production resume

⚠️ Compliance Note: Machine down >4 hours triggers:
- Management review escalation
- Incident investigation per 3.12
- Preventive maintenance review per 5.2

Reference: Procedure 4.7 Maintenance Management, MJC Form 4.7F2"
```

### 4.5 Operations Manager Glossary (Level 5)

| KPI/Business Term | Strategic Context | Regulatory/Audit Implication |
|------------------|-------------------|----------------------------|
| "3 NCAs in 24 hours, all print-related" | "Trend indicates systematic process issue, not random variation" | "Proactive investigation prevents major audit finding" |
| "Machine downtime: 12 hours this week" | "15% production capacity loss, impacts customer delivery schedule" | "Incident management review required per 3.12" |
| "Temporary repairs: 3 approaching 14-day limit" | "Non-compliance risk if permanent fixes not completed" | "BRCGS auditor will verify temporary repair close-out" |
| "Hygiene clearance delays average 45 minutes" | "Production resumption bottleneck, QA resource constraint identified" | "Process improvement opportunity for audit" |
| "Zero critical NCAs this month" | "Food safety performance exceeds target, positive audit indicator" | "Document in management review per 1.2" |

**Operations Manager Prompt Template:**
```
Role: Operations Manager
Language Level: 5 (Executive)
Tone: Strategic, KPI-driven, audit-ready, risk-aware

Guidelines:
- Lead with business impact and KPIs
- Provide trend analysis and predictive insights
- Frame in terms of strategic risk and opportunity
- Emphasize regulatory compliance status
- Offer decision support with trade-off analysis

Example: "Daily Operations Summary - November 10, 2025

Production Performance:
- Active Work Orders: 2
- Completed Today: 1 (WO-20251105-SLT-007)
- Throughput: 92% of target (8% below due to CMH-02 downtime)

Quality & Compliance Status:
📊 Non-Conformances:
- Total NCAs Raised: 1 (NCA-2025-00000847)
- Status: Draft (operator-initiated, awaiting QA disposition)
- Type: Work in Progress (print registration issue)
- Machine Status: Operational (production continuing with monitoring)
- Food Safety Impact: LOW (aesthetic defect only)

🔧 Maintenance Activity:
- Critical MJCs: 1 (MJC-2025-00001243 - CMH-02 down 2 hours)
- Estimated Impact: $2,400 lost throughput
- Response Time: Within SLA (critical <1hr target)
- Hygiene Clearance: Pending QA verification

⚠️ Strategic Alerts:
1. Temporary Repairs Approaching Deadline:
   - 3 temporary repairs due within 10 days
   - Compliance risk if not permanently resolved
   - Recommend: Resource allocation in next maintenance meeting

2. Trend Analysis (Last 7 Days):
   - Print-related NCAs: 3 occurrences
   - Common Factor: CMH-series machines
   - Recommendation: Preventive calibration review per 5.6

📈 KPIs vs Targets:
- Machine Uptime: 94% (target 95%) ⚠️ Below target
- NCA Resolution Time: Avg 3.2 days (target <5 days) ✅ On target
- Critical NCAs (Food Safety): 0 (target: 0) ✅ Excellent
- Audit Trail Completeness: 100% ✅ Audit-ready

🎯 Decision Support:
Priority 1: Allocate technician to CMH-02 (critical downtime)
Priority 2: Schedule QA for hygiene clearance (production resume)
Priority 3: Initiate print calibration review (prevent trend escalation)

Next Management Review Items:
- CMH-series machine performance analysis
- Temporary repair compliance status
- Preventive maintenance schedule optimization

BRCGS Audit Readiness: ✅ COMPLIANT
All NCAs documented with traceability
All MJCs include hygiene clearance verification
Audit trail complete for all transactions

Would you like detailed analysis on any area?"
```

---

## 5. Hygiene/Safety Context Probing (Sections 6.3-6.4)

### 5.1 Automated Hygiene/Safety Detection

**AI must probe for hygiene/safety violations when NCA descriptions contain keywords:**

```python
HYGIENE_KEYWORDS = [
    # Personal hygiene (6.3)
    "hair", "jewelry", "gloves", "hands", "clothing", "uniform",
    "eating", "drinking", "smoking", "phone", "personal item",

    # Foreign body risk (5.8)
    "metal", "plastic", "glass", "wood", "tool", "equipment part",
    "screw", "bolt", "nut", "fastener", "broken", "fragment",

    # Contamination (6.3)
    "grease", "oil", "lubricant", "dirt", "dust", "debris",
    "cleaning chemical", "spillage", "leak", "residue",

    # Medical/illness (6.4)
    "sick", "ill", "cough", "fever", "vomit", "cut", "wound",
    "infection", "rash", "diarrhea", "stomach",

    # Maintenance hygiene (MJC 5.8)
    "swarf", "metal filings", "cutting", "grinding", "welding",
    "tools left", "consumables", "rags"
]

def detect_hygiene_safety_context(nca_description, mjc_description):
    text = (nca_description + " " + mjc_description).lower()

    detected_issues = []

    for keyword in HYGIENE_KEYWORDS:
        if keyword in text:
            detected_issues.append({
                "keyword": keyword,
                "category": get_category(keyword),
                "brcgs_section": get_brcgs_section(keyword),
                "probe_question": generate_probe_question(keyword)
            })

    return detected_issues
```

### 5.2 Hygiene Violation Probing Questions

**When AI detects potential hygiene violation, it MUST ask:**

| Detected Keyword | AI Probe Question | Required Information | BRCGS Reference |
|-----------------|-------------------|---------------------|----------------|
| "hair" | "Was any hair found in/near product contact area? If yes, has the employee been reminded of hair covering requirements per Personal Hygiene Standard 6.3.1?" | Employee ID, corrective action taken | 6.3 + 6.3.1 |
| "jewelry" | "Was jewelry being worn in production area? This is a violation of Personal Hygiene Standard. Employee name required for documentation." | Employee ID, type of jewelry, disciplinary action | 6.3.1 |
| "tools left" | "Were tools left on/near production equipment after maintenance? This is a critical foreign body risk. Complete tool count verification immediately." | Tool inventory check, hygiene clearance status | 5.8 + MJC Section 9 |
| "sick"/"ill" | "Is an employee showing signs of illness while working? They must be excluded from product contact work immediately per Medical Screening Procedure 6.4 until symptom-free for 48-72 hours." | Employee ID, symptoms, exclusion initiated | 6.4 |
| "metal"/"swarf" | "Is this metal contamination from maintenance work? Has metal detector verification been conducted? Has area been inspected for foreign body risk?" | Metal detector check, area inspection completed | 5.8 Foreign Body Control |
| "grease"/"oil" | "Is there excess grease/oil in product contact area after maintenance? Hygiene clearance checklist item 1 'All Excess Grease & Oil Removed' must be verified." | Hygiene clearance status, cleaning completed | MJC Section 9, Item 1 |

### 5.3 Automatic Escalation for Hygiene Violations

**AI MUST automatically escalate when:**

```python
def escalate_hygiene_violation(violation_type, user_role):
    # Critical food safety violations - immediate QA escalation
    CRITICAL_VIOLATIONS = [
        "foreign_body_found",
        "employee_illness_in_production",
        "contamination_detected",
        "hygiene_clearance_bypassed"
    ]

    if violation_type in CRITICAL_VIOLATIONS:
        return {
            "escalate_to": "qa-supervisor",
            "urgency": "IMMEDIATE",
            "action": "Stop production immediately. QA Supervisor must investigate before resuming.",
            "notification": "SMS + Email to QA Supervisor and Operations Manager",
            "brcgs_incident": True  # Triggers incident management per 3.12
        }

    # Repeat violations - disciplinary action per 6.1.2
    if get_violation_count_last_30_days(user_id, violation_type) >= 3:
        return {
            "escalate_to": "qa-supervisor",
            "urgency": "HIGH",
            "action": "Third hygiene violation in 30 days triggers disciplinary procedure per 6.1.2",
            "notification": "Email to QA Supervisor and HR Manager",
            "disciplinary_action_required": True
        }

    return {"escalate": False}
```

### 5.4 Medical Screening Integration (Section 6.4)

**AI must check medical fitness status before production guidance:**

```sql
SELECT
  u.id,
  ms.illness_reported,
  ms.exclusion_active,
  ms.symptom_free_date,
  ms.medical_clearance_required,
  ms.clearance_obtained
FROM users u
LEFT JOIN medical_screening ms ON u.id = ms.user_id
WHERE u.id = {current_user_id}
  AND (ms.exclusion_active = TRUE OR ms.medical_clearance_required = TRUE)
```

**If exclusion_active = TRUE:**
```
🚫 PRODUCTION ACCESS RESTRICTED

Medical Screening Status: Work exclusion active
Reason: Illness/symptoms affecting product safety
Exclusion Started: [date]
Expected Clearance: [symptom_free_date + 48-72 hours]

Per Procedure 6.4 Medical Screening:
You are excluded from product contact work until:
✓ Symptom-free for 48-72 hours
✓ Medical clearance obtained (if required)
✓ HR Manager approval to return

Current Status: [awaiting symptom-free period / awaiting medical clearance]

You may perform non-production administrative duties if approved by your supervisor.

For questions, contact HR Manager.

BRCGS Reference: Procedure 6.4 Medical Screening, Clause 6.4.1
```

---

## 6. AI Response Examples by Role

### 6.1 Scenario: Print Registration Misalignment During Production

**Operator (John Smith) - Language Level 2:**
```
🔍 I see you've noticed a print alignment issue.

Here's what to do right now:

1. FIRST - Check if this affects product safety:
   ❓ Can customers still use the product safely? [YES/NO]

2. NEXT - Log the issue:
   👉 Click "Record Non-Conformance Advice" button

3. TELL ME:
   - What does the misalignment look like? (use your own words)
   - How many pouches look wrong?
   - Is the machine still running or did you stop it?

4. PUT AFFECTED PRODUCT ASIDE:
   - Use a hold label
   - Write the NCA number on the label (I'll give you this after you submit)
   - Move it to the NCA area

❓ Not sure if you should stop the machine?
👉 Click "Request Team Leader" - I'll notify Jane immediately.

⚠️ Safety First: If you think this could harm customers, STOP the machine now.
```

**Team Leader (Jane Doe) - Language Level 3:**
```
📋 Non-Conformance Alert: NCA-2025-00000847

Classification: Work in Progress
Issue: Print registration misalignment ~3mm
Operator: John Smith (CMH-01)
Work Order: WO-20251106-CMH-001
Machine Status: Operational (operator continuing with monitoring)

Required Team Leader Actions (Procedure 5.7, Section 7):

✓ Verify Immediate Corrections:
  ☐ Affected product segregated? [VERIFY]
  ☐ Hold label completed with NCA number? [VERIFY]
  ☐ NCA logged on register? [AUTO-LOGGED]
  ☐ Cross contamination assessed? [YES/NO]

  If cross contamination = YES:
  → Back tracking MUST be completed immediately per 3.9
  → Your signature required to verify completion

⚠️ Decision Required:
Can production continue while investigating root cause?

Option 1: Continue production with monitoring
- You can approve this if print misalignment doesn't affect food safety
- Monitor every 50 units until root cause identified
- Your approval signature required

Option 2: Stop production for immediate investigation
- Select this if misalignment might worsen
- Escalate to QA Supervisor if uncertain about impact

Option 3: Out-of-spec concession
- If misalignment within acceptable customer tolerance
- Requires written justification
- Your approval signature authorizes continued use

Your signature: [REQUIRED BEFORE PRODUCTION CONTINUES]

Reference: Procedure 5.7 Control of Non-Conforming Product
```

**QA Supervisor (Sarah Williams) - Language Level 4:**
```
📊 NCA Disposition Required: NCA-2025-00000847

=== TRACEABILITY CONTEXT ===
WO: WO-20251106-CMH-001
Product: Stand-up Pouches 250ml
Customer: ABC Foods
Batch: BATCH-2025-1106-001
Machine: CMH-01
Affected Quantity: ~50 units (0.5% of batch)

=== NON-CONFORMANCE CLASSIFICATION ===
Type: Work in Progress
Issue: Print registration misalignment (3mm deviation from spec)
Sample: Available in NCA area (quarantined)
Root Cause: Investigation pending (material vs machine calibration)

=== IMMEDIATE ACTIONS COMPLETED ===
✅ Product segregated and labeled
✅ NCA logged on register
✅ Team Leader verified immediate corrections
✅ Production continuing with monitoring (TL approved)

=== REQUIRED DISPOSITION DECISION (5.7 Compliance) ===

Select disposition option:

☐ Option 1: Reject to Supplier
   - Requires: Credit note coordination, upliftment arrangement
   - Timeline: Notify supplier within 24 hours per contract
   - Documentation: Attach supplier communication

☐ Option 2: Rework at Kangopak
   - Requires: Detailed rework instruction (mandatory if selected)
   - Resource: Sorting/re-inspection labor allocation
   - Timeline: Complete before work order closure

☐ Option 3: Concession (Use As-Is)
   - Requires: Customer notification and approval
   - Risk Assessment: Print deviation 3mm vs spec tolerance [±2mm]
   - Justification: [If aesthetic only, food safety not compromised]
   - Your authorization signature required

☐ Option 4: Discard at Kangopak
   - Waste Documentation: 50 units = [calculate $$ value]
   - Disposal Method: Per waste management procedure
   - Cost Recovery: Supplier accountability if material defect

=== ROOT CAUSE ANALYSIS REQUIRED (3.11) ===
Systematic investigation to prevent recurrence:

Potential Causes to Investigate:
1. Material issue: Supplier film registration marks incorrect
2. Machine calibration: CMH-01 print station out of alignment
3. Operator error: Incorrect setup parameters
4. Environmental: Temperature/humidity affecting registration

Link to Section 2.2 HARA:
- Is print registration a Critical Control Point? [CHECK HARA]
- If CCP: Requires HACCP team review

Document Investigation Findings:
[Large text area - attach supporting evidence]

=== CORRECTIVE ACTION (3.11) ===
Immediate (completed): Product segregated, monitoring increased
Long-term (prevent recurrence): [REQUIRED BEFORE CLOSE OUT]

Examples:
- Preventive calibration schedule adjustment per 5.6
- Operator retraining if setup error identified
- Supplier quality notification if material defect

=== CLOSE OUT AUTHORIZATION ===
Your signature closes this NCA for audit purposes.

⚠️ AUDIT TRAIL VERIFICATION:
This NCA will be traceable during:
- Monthly trend analysis (5.7F2) - print issues across all machines
- Management Review (1.2) - WIP non-conformance rate
- Customer audit - traceability from complaint to corrective action
- BRCGS external audit - Section 5.7 compliance verification

[SIGNATURE REQUIRED]

BRCGS Reference: Procedure 5.7 Control of Non-Conforming Product
Supporting Procedures: 3.9 Traceability, 3.11 Corrective Action, 2.2 HARA
```

**Operations Manager (David Wilson) - Language Level 5:**
```
📊 STRATEGIC ALERT: Print Registration Quality Trend

=== EXECUTIVE SUMMARY ===
3 print-related NCAs in 7 days - systematic issue identified
Recommendation: Proactive investigation prevents major customer impact

=== NCA DETAIL: NCA-2025-00000847 ===
Date: 2025-11-10
Work Order: WO-20251106-CMH-001 (CMH-01, Batch BATCH-2025-1106-001)
Customer: ABC Foods (high-value account)
Issue: Print registration misalignment 3mm (spec tolerance ±2mm)
Impact: 50 units affected (0.5% of batch) - LOW financial exposure

Current Status: Pending QA disposition
Machine Status: Operational (production continuing with monitoring)
Food Safety Risk: NONE (aesthetic defect only)

=== TREND ANALYSIS (Strategic Concern) ===
Last 7 Days - Print-Related NCAs:
- NCA-2025-00000842 (Nov 7): CMH-02, registration issue
- NCA-2025-00000845 (Nov 9): CMH-01, color alignment
- NCA-2025-00000847 (Nov 10): CMH-01, registration issue ← CURRENT

Common Factors:
✓ Equipment: CMH-series pouching machines (both lines affected)
✓ Issue Type: Print registration/alignment
✓ Material: Multiple batches - suggests machine, not material

Pattern Recognition:
🔴 SYSTEMATIC ISSUE - Not random variation
   → Machine calibration degradation likely
   → Preventive action required before customer complaint

=== BUSINESS IMPACT ANALYSIS ===
Current Impact (this NCA):
- Financial: ~$75 waste (50 units @ $1.50/unit)
- Customer: ABC Foods - no customer notification yet (below tolerance if concession approved)
- Production: No downtime (machine operational)

Trend Impact (if not addressed):
- Risk: Major customer complaint if trend continues
- Financial: Potential batch rejection ($5,000-$15,000 depending on order size)
- Reputation: ABC Foods = 18% of annual revenue
- Audit: BRCGS auditor will identify reactive-only approach as weakness

=== RECOMMENDED DECISION ===
Priority 1 (Immediate): Approve QA disposition for current NCA
- Recommend: Concession (aesthetic deviation, food safety not compromised)
- Customer notification: Not required if within documented tolerance interpretation

Priority 2 (Strategic): Proactive Investigation
- Action: Schedule preventive calibration review for both CMH machines
- Resource: Allocate maintenance technician + QA verification
- Timeline: Complete before next production run (prevent recurrence)
- Cost: ~$800 calibration service vs $5,000-$15,000 potential rejection

Priority 3 (Compliance): Document proactive approach for audit
- Evidence: "Identified trend via NCA analysis, took preventive action"
- BRCGS Audit Benefit: Demonstrates continuous improvement culture (Clause 1.1.1)
- Management Review: Document in next monthly review (Clause 1.2)

=== KPI IMPACT ===
Current Month Performance:
- Total NCAs: 12 (target <15) ✅ On target
- Critical NCAs: 0 (target 0) ✅ Excellent
- Print-Related NCAs: 3 (25% of total) ⚠️ Above normal (usual 10%)
- Average Resolution Time: 3.2 days (target <5) ✅ On target

Trend Projection (if not addressed):
- Print NCAs could reach 8-10 by month-end (67% of total)
- Risk: Customer complaints increase (currently 0)
- Audit Risk: Pattern indicates process control weakness

=== RESOURCE ALLOCATION DECISION ===
Option A: Reactive (Wait for Customer Complaint)
- Cost: $0 immediate / $5,000-$15,000 if batch rejected
- Risk: HIGH - customer dissatisfaction, audit finding
- Timeline: Address only when escalated

Option B: Proactive (Immediate Investigation) ✅ RECOMMENDED
- Cost: $800 calibration service
- Risk: LOW - prevents customer impact
- Timeline: 2 days to investigate + calibrate
- ROI: Prevent potential $5,000-$15,000 loss
- Audit Benefit: Demonstrates product safety culture

=== NEXT STEPS (Your Authorization) ===
1. Approve QA disposition for NCA-2025-00000847 [DELEGATE TO QA]
2. Authorize preventive calibration for CMH-01 and CMH-02 [YOUR APPROVAL]
   - Budget: $800 (within discretionary authority)
   - Schedule: Complete by Nov 12 before next ABC Foods order
3. Document proactive action in Management Review [AUTO-DOCUMENTED]

=== AUDIT READINESS ===
BRCGS Section 1.1.1 (Product Safety Culture):
✅ "Senior management shall ensure a proactive approach to product safety"
   → This trend analysis + proactive response demonstrates compliance

BRCGS Section 3.11 (Corrective Action):
✅ "Systematic approach to identify root causes and prevent recurrence"
   → Investigation authorization shows systematic approach

Would you like me to:
- Generate calibration work order for maintenance?
- Prepare customer notification template (if needed)?
- Add to next management review agenda?
- Detailed cost-benefit analysis for preventive calibration investment?
```

---

## 7. Implementation Guidelines

### 7.1 AI System Architecture

**Required Database Queries Per AI Response:**

```sql
-- Query 1: Get user context
SELECT
  u.id, u.role, u.name, u.department,
  u.induction_completed, u.induction_date
FROM users u
WHERE u.id = {current_user_id};

-- Query 2: Get training status for relevant procedure
SELECT
  tr.training_module,
  tr.completion_date,
  tr.competency_status,
  tr.refresher_required,
  tr.last_refresher_date,
  p.last_revision_date,
  (tr.last_refresher_date < p.last_revision_date) AS procedure_revised_since_training
FROM training_records tr
JOIN procedures p ON tr.training_module = p.procedure_number
WHERE tr.user_id = {current_user_id}
  AND tr.training_module = {relevant_procedure};

-- Query 3: Get competency status
SELECT
  uc.procedure_number,
  uc.competency_status,
  uc.last_assessed_date,
  cm.competency_required
FROM user_competency uc
JOIN competency_matrix cm ON uc.procedure_number = cm.procedure_number
WHERE uc.user_id = {current_user_id}
  AND cm.job_role = {user_role};

-- Query 4: Get medical fitness status
SELECT
  ms.illness_reported,
  ms.exclusion_active,
  ms.symptom_free_date,
  ms.medical_clearance_required
FROM medical_screening ms
WHERE ms.user_id = {current_user_id}
  AND (ms.exclusion_active = TRUE OR ms.medical_clearance_required = TRUE);

-- Query 5: Get recent hygiene violations (last 30 days)
SELECT COUNT(*) as violation_count
FROM hygiene_violations hv
WHERE hv.user_id = {current_user_id}
  AND hv.violation_date >= NOW() - INTERVAL '30 days';
```

### 7.2 AI Prompt Engineering Template

```python
def generate_ai_prompt(user_context, task_context, query):
    """
    Generate role-appropriate AI prompt with BRCGS compliance guardrails
    """

    # Calculate language level
    language_level = calculate_language_level(
        base_role=user_context['role'],
        training_status=user_context['training_status'],
        competency_status=user_context['competency_status']
    )

    # Check access prerequisites
    if not user_context['induction_completed']:
        return generate_access_denied_message("induction_not_completed")

    if user_context['medical_exclusion_active']:
        return generate_access_denied_message("medical_exclusion")

    # Detect hygiene/safety context
    hygiene_flags = detect_hygiene_keywords(query)

    # Build role-appropriate prompt
    prompt = f"""
    You are the OHiSee AI Assistant for Kangopak (Pty) Ltd.

    USER CONTEXT:
    - Name: {user_context['name']}
    - Role: {user_context['role']}
    - Department: {user_context['department']}
    - Language Level: {language_level} ({get_level_description(language_level)})
    - Training Status: {user_context['training_status']}
    - Competency: {user_context['competency_status']}

    LANGUAGE ADAPTATION RULES:
    {get_language_rules(language_level)}

    TERMINOLOGY GLOSSARY:
    {get_role_glossary(user_context['role'])}

    ESCALATION AUTHORITY:
    {get_authority_matrix(user_context['role'])}

    HYGIENE/SAFETY ALERTS:
    {generate_hygiene_alerts(hygiene_flags)}

    BRCGS COMPLIANCE CONTEXT:
    - All responses must support audit trail requirements
    - Flag any actions requiring supervisor approval
    - Escalate food safety risks immediately
    - Reference relevant procedure numbers when applicable

    USER QUERY: {query}

    Generate response following language level {language_level} guidelines.
    If user lacks authority/competency, provide clear escalation path.
    If hygiene/safety issue detected, probe with specific questions.
    """

    return prompt
```

### 7.3 Response Validation Checks

**Before delivering AI response, validate:**

```python
def validate_ai_response(response, user_context, task_context):
    """
    Validate AI response meets role-based adaptation requirements
    """

    checks = {
        "language_level_appropriate": False,
        "authority_respected": False,
        "escalation_provided": False,
        "brcgs_referenced": False,
        "hygiene_probed": False
    }

    # Check 1: Language complexity matches user level
    complexity_score = calculate_text_complexity(response)
    target_level = user_context['language_level']
    checks["language_level_appropriate"] = (
        complexity_score >= target_level - 0.5 and
        complexity_score <= target_level + 0.5
    )

    # Check 2: Response doesn't suggest actions beyond user authority
    suggested_actions = extract_suggested_actions(response)
    for action in suggested_actions:
        if not user_has_authority(user_context['role'], action):
            if "escalate" not in response.lower():
                return {
                    "valid": False,
                    "error": f"Response suggests '{action}' without escalation path"
                }
    checks["authority_respected"] = True

    # Check 3: Escalation path provided if needed
    if requires_escalation(task_context, user_context):
        checks["escalation_provided"] = (
            "team leader" in response.lower() or
            "supervisor" in response.lower() or
            "manager" in response.lower()
        )
    else:
        checks["escalation_provided"] = True  # Not required

    # Check 4: BRCGS procedure referenced (for competent+ levels)
    if user_context['language_level'] >= 3:
        checks["brcgs_referenced"] = (
            re.search(r'(procedure|section|clause)\s+\d+\.?\d*', response.lower()) is not None
        )
    else:
        checks["brcgs_referenced"] = True  # Not required for basic levels

    # Check 5: Hygiene issues probed with specific questions
    if task_context.get('hygiene_keywords_detected'):
        checks["hygiene_probed"] = (
            "?" in response and  # Contains questions
            any(keyword in response.lower() for keyword in ["employee name", "verify", "inspect", "clearance"])
        )
    else:
        checks["hygiene_probed"] = True  # Not applicable

    # Overall validation
    all_checks_passed = all(checks.values())

    return {
        "valid": all_checks_passed,
        "checks": checks,
        "errors": [k for k, v in checks.items() if not v]
    }
```

### 7.4 User Feedback Mechanism

**Continuous improvement through user feedback:**

```python
# After each AI response, prompt user with:
"""
Was this response helpful?

👍 Yes, clear and actionable
👎 Too complex for me
⚠️ Missing important information
❓ I need more detail

[Optional feedback text box]

Your feedback helps us improve AI responses for your role.
"""

# Store feedback for analysis:
INSERT INTO ai_response_feedback (
  response_id,
  user_id,
  user_role,
  language_level_used,
  feedback_type,
  feedback_text,
  timestamp
) VALUES (...);

# Monthly review:
# - If role consistently marks "too complex" → reduce language level
# - If role consistently marks "need more detail" → increase language level
# - Adjust glossaries based on feedback patterns
```

---

## 8. BRCGS Compliance Mapping

### 8.1 Section 6.1 Training and Competence

**AI Implementation Requirements:**

| BRCGS Requirement | AI Adaptation Feature | Validation |
|------------------|----------------------|-----------|
| **Clause 6.1.1:** Induction training for all staff | AI checks `induction_completed` before ANY guidance | ✅ Block access if FALSE |
| **Clause 6.1.2:** Job-specific training for process control points | AI checks training status for procedure-specific guidance | ✅ Escalate if not trained |
| **Clause 6.1.3:** Training in areas impacting food safety | AI probes for hygiene/safety keywords, escalates violations | ✅ Automatic hygiene detection |
| **Clause 6.1.4:** Ongoing competency assessment | AI adjusts language level based on competency status | ✅ Dynamic language adaptation |
| **Clause 6.1.5:** Communication of new/changed procedures | AI flags procedure revisions since last training | ✅ Require refresher training |

### 8.2 Section 6.1.2 Disciplinary Code and Procedure

**AI Implementation Requirements:**

| BRCGS Requirement | AI Adaptation Feature | Validation |
|------------------|----------------------|-----------|
| **Progressive discipline:** Verbal → Written → Final → Dismissal | AI tracks hygiene violations, triggers disciplinary at 3+ in 30 days | ✅ Automatic escalation |
| **Product safety violations = misconduct** (not poor performance) | AI classifies hygiene/safety violations as misconduct requiring action | ✅ Distinguish from training gaps |
| **Fair hearing procedures** | AI documents all violations with timestamp, user ID, evidence | ✅ Audit trail for hearings |

### 8.3 Section 6.3 Personal Hygiene

**AI Implementation Requirements:**

| BRCGS Requirement | AI Adaptation Feature | Validation |
|------------------|----------------------|-----------|
| **Clause 6.3.1:** Personal hygiene standards documented | AI references Personal Hygiene Standard 6.3.1 in responses | ✅ Procedural reference |
| **Clause 6.3.2:** Protective clothing requirements | AI verifies user has completed protective clothing training | ✅ Training prerequisite |
| **Clause 6.3.3:** Hand hygiene facilities | AI reminds users of handwashing requirements when applicable | ✅ Contextual reminders |
| **Clause 6.3.4:** Hygiene compliance monitoring | AI probes for hygiene violations in NCA descriptions | ✅ Keyword detection + probing |

### 8.4 Section 6.4 Medical Screening

**AI Implementation Requirements:**

| BRCGS Requirement | AI Adaptation Feature | Validation |
|------------------|----------------------|-----------|
| **Clause 6.4.1:** Health awareness of infection/disease symptoms | AI checks medical exclusion status before production guidance | ✅ Access restriction if excluded |
| **Clause 6.4.2:** Notification procedure for symptoms | AI prompts symptom reporting when illness keywords detected | ✅ Proactive symptom detection |
| **Clause 6.4.3:** Work exclusion for product safety risk | AI blocks production access if `exclusion_active = TRUE` | ✅ Mandatory exclusion enforcement |
| **Clause 6.4.4:** Visitor health questionnaire | AI applies language adaptation to visitor guidance | ✅ Visitor-specific protocols |

### 8.5 Audit Trail Requirements

**Every AI interaction must log:**

```sql
INSERT INTO ai_interaction_audit (
  interaction_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_role TEXT,
  language_level INTEGER,
  training_status JSONB,
  competency_status JSONB,
  query_text TEXT,
  response_text TEXT,
  escalation_triggered BOOLEAN,
  escalated_to TEXT,
  hygiene_keywords_detected TEXT[],
  brcgs_procedures_referenced TEXT[],
  authority_check_passed BOOLEAN,
  medical_exclusion_blocked BOOLEAN,
  feedback_rating INTEGER,
  feedback_text TEXT
);
```

**Audit queries for BRCGS verification:**

```sql
-- Verify AI respects training prerequisites
SELECT COUNT(*) as blocked_untrained_users
FROM ai_interaction_audit
WHERE training_status->>'competency_status' != 'competent'
  AND escalation_triggered = TRUE
  AND escalated_to = 'team-leader';

-- Verify AI detects hygiene violations
SELECT COUNT(*) as hygiene_probes
FROM ai_interaction_audit
WHERE array_length(hygiene_keywords_detected, 1) > 0
  AND response_text LIKE '%employee name%';

-- Verify AI enforces medical exclusion
SELECT COUNT(*) as medical_exclusion_enforcements
FROM ai_interaction_audit
WHERE medical_exclusion_blocked = TRUE;

-- Demonstrate to auditor:
-- "AI system automatically enforces BRCGS Section 6 requirements
--  by adapting language based on training/competency and escalating
--  when users lack authority or when food safety risks detected."
```

---

## 9. Appendix: Example Scenarios

### Scenario A: Untrained Operator Attempts Complex Action

**User:** Operator (no training in 5.7)
**Action:** Tries to authorize rework
**AI Response:**

```
⚠️ AUTHORIZATION REQUIRED

The action you're trying to take (authorize rework) requires:
✓ Training in Procedure 5.7 (Control of Non-Conforming Product)
✓ Team Leader or QA Supervisor authority

Your current status:
- Role: Production Operator
- Training in 5.7: Not completed
- Authority: Can log issues, cannot authorize disposition

What you can do:
1. Log the non-conformance (I'll help with this)
2. Request Team Leader approval for rework
3. Schedule training in Procedure 5.7 with your supervisor

Would you like me to:
👉 Help you log the issue and notify Jane (Team Leader)?
👉 Add 5.7 training to your training plan?

BRCGS Note: This authorization requirement ensures product safety decisions
are made by personnel with appropriate training and competency per Section 6.1.
```

### Scenario B: QA Supervisor Reviewing Critical NCA

**User:** QA Supervisor (fully trained)
**Action:** Reviewing NCA with potential foreign body contamination
**AI Response:**

```
🚨 CRITICAL FOOD SAFETY ISSUE - NCA-2025-00000849

=== PRIORITY ASSESSMENT ===
Contamination Type: Suspected foreign body (metal fragment)
Detection Point: In-line metal detector alarm
Product: Stand-up pouches 250ml (food contact material)
Batch Status: QUARANTINED (hold label applied)
Customer Impact: HIGH RISK if not properly controlled

=== IMMEDIATE ACTIONS REQUIRED (Section 5.8 Foreign Body Control) ===

✅ COMPLETED:
- Metal detector alarm triggered automatic line stop
- Operator isolated affected batch
- Team Leader verified segregation

⚠️ REQUIRED (Your Authorization):

1. Foreign Body Investigation (5.8):
   ☐ Confirm metal fragment source (maintenance work? equipment failure?)
   ☐ Verify metal detector calibration current (last verified: [date])
   ☐ Inspect surrounding batches for contamination spread
   ☐ Document findings in Root Cause Analysis section

2. Traceability Back-Tracking (3.9):
   ☐ Identify all potentially affected work orders
   ☐ Review production records from last maintenance event
   ☐ Cross-reference with MJC hygiene clearance records
   ☐ Extend quarantine if contamination window unclear

3. Disposition Decision (5.7):
   RECOMMENDED: Discard affected batch + investigate surrounding batches

   ⚠️ DO NOT select Rework or Concession for metal contamination
   Food safety cannot be compromised per BRCGS Fundamental

4. Incident Management (3.12):
   This qualifies as a product safety incident requiring:
   ☐ Incident investigation report
   ☐ HACCP team notification (Section 2.2)
   ☐ Management review escalation
   ☐ Customer notification (if any product shipped)

5. Corrective Action (3.11):
   ☐ Verify post-maintenance hygiene clearance was completed (MJC reference)
   ☐ Re-train maintenance on tool/equipment control if source identified
   ☐ Review metal detector sensitivity and preventive maintenance schedule

=== ESCALATION REQUIREMENT ===
Notify Operations Manager immediately:
- Product safety incident per 1.1.1
- Potential customer impact if any batch already shipped
- Incident investigation team assembly required

=== AUDIT TRAIL NOTE ===
This NCA will be specifically reviewed during:
- Next BRCGS external audit (Section 5.8 compliance)
- Customer audit (foreign body control effectiveness)
- Management review (product safety culture demonstration)

Your disposition decision and investigation documentation are critical
evidence of systematic food safety management.

[SIGNATURE REQUIRED - QA SUPERVISOR AUTHORIZATION]

BRCGS References:
- 5.8 Foreign Body Contamination Control
- 3.9 Traceability
- 3.11 Corrective Action
- 3.12 Incident Management
- 1.1.1 Product Safety Culture
```

### Scenario C: Operations Manager - Strategic Trend Alert

**User:** Operations Manager
**Trigger:** AI detects pattern in MJC data
**AI Response:**

```
📊 STRATEGIC MAINTENANCE ALERT - Proactive Intervention Required

=== PATTERN RECOGNITION ===
Alert Type: Reactive maintenance trending upward
Equipment: CMH-series pouching machines (CMH-01, CMH-02)
Time Period: Last 30 days
Detection: AI analysis of MJC frequency and downtime impact

=== TREND DATA ===
Reactive MJCs (Last 30 Days):
- CMH-01: 8 reactive MJCs (avg 2/week, historical avg 0.5/week) ⚠️ 4x normal
- CMH-02: 6 reactive MJCs (avg 1.5/week, historical avg 0.5/week) ⚠️ 3x normal
- Total Downtime: 47 hours (CMH-01: 28hrs, CMH-02: 19hrs)
- Financial Impact: ~$14,100 lost throughput ($300/hour × 47 hours)

Common Failure Modes:
1. Drive motor issues (5 MJCs - 36% of reactive maintenance)
2. Sealer bar failures (4 MJCs - 29%)
3. Pneumatic system leaks (3 MJCs - 21%)
4. Electrical faults (2 MJCs - 14%)

=== ROOT CAUSE HYPOTHESIS ===
Equipment Age: Both CMH machines >5 years old
Preventive Maintenance: Last major PM 4 months ago
Production Intensity: Running at 95% capacity (above 85% recommended threshold)

Pattern Indicates: Component fatigue accelerating, reactive maintenance
becoming unsustainable without preventive intervention

=== BUSINESS IMPACT PROJECTION ===

Current Trajectory (Next 30 Days):
- Projected Reactive MJCs: 18-22 (if trend continues)
- Projected Downtime: 65-75 hours
- Projected Lost Throughput: $19,500-$22,500
- Customer Delivery Risk: HIGH (delayed orders likely)

=== STRATEGIC RECOMMENDATION ===

Option A: Status Quo (Reactive Only)
- Cost: $19,500-$22,500 lost throughput next 30 days
- Risk: HIGH - potential major equipment failure
- Customer Impact: Delivery delays, dissatisfaction
- Audit Risk: BRCGS auditor may identify as preventive maintenance gap

Option B: Scheduled Major Preventive Maintenance ✅ RECOMMENDED
- Cost: $8,000 comprehensive PM service (both machines)
- Downtime: 24 hours scheduled (vs 65-75 hours unscheduled)
- Timeline: Schedule during low-demand period (avoid customer impact)
- ROI: $11,500-$14,500 savings (prevent reactive maintenance)
- Risk Reduction: 70% reduction in reactive MJC likelihood (based on historical data)
- Audit Benefit: Demonstrates proactive maintenance per 5.2

Option C: Equipment Replacement (Long-term)
- Cost: $180,000 per new machine ($360,000 total)
- Payback Period: ~3 years at current reactive maintenance rate
- Consider: Include in next capital budget cycle

=== RECOMMENDED DECISION ===
Priority 1: Authorize Major PM Service (Option B)
- Budget: $8,000 (preventive investment vs $19,500-$22,500 reactive cost)
- Schedule: Coordinate with production planning for 24-hour maintenance window
- Resource: External service provider + internal maintenance team
- Timeline: Complete within 2 weeks to prevent further reactive failures

Priority 2: Long-term Capital Planning
- Add CMH equipment replacement to 2026 capital budget
- Business case: $14,100/month reactive maintenance cost unsustainable
- Replacement timeline: 12-18 months (allow for procurement and installation planning)

=== BRCGS COMPLIANCE IMPACT ===

Positive Audit Evidence (if proactive PM authorized):
✅ Section 5.2 (Maintenance): "Preventive maintenance program based on equipment
   criticality and risk" - AI-driven trend analysis demonstrates systematic approach
✅ Section 1.1.1 (Product Safety Culture): "Proactive approach to prevent issues"
   rather than reactive firefighting
✅ Management Review (1.2): Document data-driven decision making process

Audit Risk (if no action taken):
⚠️ Auditor may identify reactive maintenance trend as process weakness
⚠️ Unplanned downtime affects production capacity (Clause 5.1 adequacy)
⚠️ Repeat equipment failures indicate inadequate maintenance program (Clause 5.2)

=== MANAGEMENT REVIEW DOCUMENTATION ===
This analysis will be included in next management review under:
- Maintenance program effectiveness (5.2)
- Product safety culture - proactive vs reactive (1.1.1)
- Resource allocation decisions (strategic planning)

Would you like me to:
👉 Generate detailed PM scope of work for vendor quotation?
👉 Prepare capital budget justification for equipment replacement?
👉 Schedule production planning meeting to identify PM maintenance window?
👉 Draft management review presentation with trend analysis?

Decision Authority: Your approval required for PM service authorization
Timeline: Recommend decision within 48 hours to schedule PM within 2-week window
```

---

## Document Control

**Document Number:** AI-LANG-001
**Revision:** 1
**Status:** APPROVED
**Approved By:** Operations Manager
**Next Review Date:** 2026-11-10

**Change Log:**

| Date | Revision | Changes | Approved By |
|------|----------|---------|-------------|
| 2025-11-10 | 1 | Initial framework creation | Operations Manager |

**Distribution:**
- Operations Manager
- QA Supervisor
- Maintenance Manager
- IT/Development Team
- BRCGS Compliance Officer

---

**END OF DOCUMENT**
