# Role-Based AI Language Adaptation - Quick Reference Summary

**Document:** AI-LANG-001 Implementation Summary
**Created:** 2025-11-10
**For:** Development Team Quick Reference

---

## 1. Role-to-Language-Level Mapping (Quick Reference)

| Role | DB Value | Level | Speak Like... | Technical Terms? | Compliance Terms? |
|------|----------|-------|--------------|-----------------|------------------|
| **Operator** | `operator` | 1-2 | "Machine stopped, put product on hold" | NO - explain everything | NO - actions only |
| **Team Leader** | `team-leader` | 2-3 | "Verify immediate corrections per 5.7" | Some - explain complex | YES - basic awareness |
| **Maint Tech** | `maintenance-technician` | 3 | "Drive motor bearing failure, replace SKF 6205" | YES - use freely | MEDIUM - food safety |
| **QA Supervisor** | `qa-supervisor` | 4 | "Disposition decision per 5.7, audit trail required" | YES - technical | YES - full BRCGS |
| **Maint Mgr** | `maintenance-manager` | 3-4 | "$2,400 downtime, 14-day temp repair deadline" | YES + operational | YES + business |
| **Ops Manager** | `operations-manager` | 5 | "3 NCAs in 7 days = systematic issue, KPI impact" | YES + strategic | YES + audit risk |

**Dynamic Adjustment:**
- +1 level if trained in procedure
- +1 level if competent
- -1 level if >12 months since refresher
- -1 level if procedure revised since training

---

## 2. Training Context - SQL Checks Required

**Before EVERY AI response:**

```sql
-- Check 1: Induction completed? (MANDATORY)
SELECT induction_completed FROM users WHERE id = {user_id};
-- If FALSE → Block access, show induction requirement message

-- Check 2: Training status for procedure
SELECT competency_status, last_refresher_date, refresher_required
FROM training_records WHERE user_id = {user_id} AND training_module = {procedure};
-- If NOT competent → Provide step-by-step + escalation option

-- Check 3: Medical exclusion active?
SELECT exclusion_active FROM medical_screening WHERE user_id = {user_id};
-- If TRUE → Block production access, show exclusion message

-- Check 4: Hygiene violations (last 30 days)
SELECT COUNT(*) FROM hygiene_violations
WHERE user_id = {user_id} AND violation_date >= NOW() - INTERVAL '30 days';
-- If >= 3 → Trigger disciplinary action per 6.1.2
```

---

## 3. Authority Matrix - Who Can Do What?

| Action | Operator | Team Leader | QA Supervisor | Ops Manager |
|--------|----------|-------------|---------------|-------------|
| Log issue | ✅ | ✅ | ✅ | ✅ |
| Continue production with issue | ❌ TL | ✅ | ✅ | ✅ |
| Complete hold label | ✅ (if trained) | ✅ | ✅ | ✅ |
| Approve out-of-spec | ❌ TL/QA | ✅ minor | ✅ all | ✅ |
| Authorize rework | ❌ QA | ❌ QA | ✅ | ✅ |
| Grant hygiene clearance | ❌ | ❌ | ✅ | ✅ |
| Close NCA | ❌ | ❌ | ✅ | ✅ |
| STOP for safety | ✅ IMMEDIATE | ✅ IMMEDIATE | ✅ IMMEDIATE | ✅ IMMEDIATE |

**AI Logic:**
```python
if user_lacks_authority(action):
    return escalate_to_supervisor(action, reason="Authority required per 6.1")
```

---

## 4. Terminology Translation - Key Phrases

### OPERATOR (Level 1-2): Plain Language

| Say This ✅ | Not This ❌ |
|------------|------------|
| "Machine stopped working" | "Unplanned downtime event" |
| "Print not lined up" | "Registration misalignment" |
| "Product put on hold" | "Quarantined inventory" |
| "Grease cleaned after maintenance" | "Post-maintenance hygiene verification" |
| "Fill out the form" | "Complete data capture interface" |

### TEAM LEADER (Level 2-3): Procedural

| Say This ✅ | Technical Alternative |
|------------|---------------------|
| "Verify operator's corrective action" | "Validate immediate correction per 5.7 Section 7" |
| "Check previous batches if contamination" | "Execute traceability back-tracking per 3.9" |
| "Sign off on hygiene after maintenance" | "Authorize post-maintenance clearance checklist" |

### QA SUPERVISOR (Level 4): Compliance

| Say This ✅ | Plain Alternative |
|------------|------------------|
| "Disposition decision per 5.7 with audit trail" | "Decide what to do with the bad product" |
| "Root cause analysis per 3.11 required" | "Figure out why it happened" |
| "Concession requires risk assessment documentation" | "Need paperwork to use it anyway" |

### OPERATIONS MANAGER (Level 5): Executive

| Say This ✅ | Detailed Alternative |
|------------|---------------------|
| "3 NCAs in 7 days = systematic issue, KPI impact" | "Three quality problems this week means something's wrong with the process, affecting our performance numbers" |
| "$2,400 downtime, preventive action ROI $11,500" | "Machine stopped cost us $2,400, spending $8k on maintenance prevents $20k more losses" |
| "Audit readiness: demonstrates proactive culture per 1.1.1" | "This shows the auditor we're preventing problems, not just fixing them" |

---

## 5. Hygiene/Safety Keyword Detection

**AI MUST probe when detecting:**

```python
HYGIENE_KEYWORDS = [
    # Personal (6.3)
    "hair", "jewelry", "gloves", "eating", "drinking", "phone",

    # Foreign body (5.8)
    "metal", "plastic", "glass", "tool", "screw", "broken",

    # Contamination
    "grease", "oil", "dirt", "cleaning chemical", "spillage",

    # Medical (6.4)
    "sick", "ill", "cough", "fever", "vomit", "cut", "wound",

    # Maintenance hygiene (MJC)
    "swarf", "metal filings", "tools left", "consumables"
]

if keyword_detected(user_input):
    ask_probing_questions()
    escalate_if_critical()
```

**Example Probing:**
- "hair" detected → "Was hair found near product? Employee name required per 6.3.1"
- "sick" detected → "Is employee showing illness symptoms? Must be excluded per 6.4"
- "tools left" detected → "Tools left after maintenance? CRITICAL foreign body risk per 5.8"

---

## 6. AI Response Examples - Same Scenario, Different Roles

**Scenario:** Print misalignment detected during production

### Operator Response (Level 2):
```
🔍 I see you've noticed a print alignment issue.

Here's what to do:
1. Check if customers can still use product safely
2. Click "Record Non-Conformance" button
3. Describe what looks wrong (use your own words)
4. Mark if machine still running or stopped
5. Put affected product aside with hold label

Not sure if you should stop? Click "Request Team Leader"

⚠️ Safety First: Stop machine if this could harm customers
```

### Team Leader Response (Level 3):
```
📋 NCA-2025-00000847: Print registration misalignment

Required Actions (5.7 Section 7):
☐ Verify product segregated
☐ Verify hold label completed
☐ Assess cross contamination (YES/NO)
☐ Your signature to continue production

Can production continue with monitoring?
- You can approve if no food safety impact
- Escalate to QA if uncertain

[SIGNATURE REQUIRED]
```

### QA Supervisor Response (Level 4):
```
📊 NCA Disposition Required: NCA-2025-00000847

Traceability: WO-20251106-CMH-001, Batch BATCH-2025-1106-001
Sample: Available (quarantined)

Disposition Options (5.7):
☐ Reject to supplier (credit note + upliftment)
☐ Rework at Kangopak (document instruction)
☐ Concession (risk assessment + customer approval)
☐ Discard (document reason)

Root Cause Analysis (3.11): [REQUIRED]
Corrective Action: [REQUIRED]
Close Out Signature: [REQUIRED]

⚠️ Audit Trail: This NCA traceable in external audit

BRCGS Reference: Procedure 5.7, Section 3.11
```

### Operations Manager Response (Level 5):
```
📊 STRATEGIC ALERT: Print Quality Trend

3 print-related NCAs in 7 days - systematic issue
Recommendation: Proactive calibration prevents customer impact

NCA-2025-00000847 Detail:
- 50 units affected (0.5% batch) - LOW financial exposure
- Customer: ABC Foods (18% annual revenue) - HIGH relationship value
- Status: Pending QA disposition

Trend Analysis:
✓ Common factor: CMH-series machines
✓ Pattern: Not random - suggests machine calibration drift

Business Impact (if not addressed):
- Risk: Major customer complaint
- Financial: $5k-$15k potential batch rejection
- Audit: Reactive-only approach = BRCGS weakness

Recommended Decision:
Priority 1: Approve QA disposition (concession likely)
Priority 2: Authorize preventive calibration ($800 vs $5k-$15k risk)
Priority 3: Document proactive approach for audit (1.1.1 compliance)

KPI Impact:
- Print NCAs: 25% of total (normal 10%) ⚠️
- Trend projection: Could reach 67% by month-end if not addressed

ROI: $800 calibration prevents $5k-$15k rejection
Audit Benefit: Demonstrates product safety culture per 1.1.1

Authorize preventive calibration? [YES/NO]
```

---

## 7. Implementation Checklist for Developers

### Database Schema Required:
```sql
-- Add to users table:
ALTER TABLE users ADD COLUMN induction_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN induction_date DATE;

-- Create training_records table:
CREATE TABLE training_records (
  user_id UUID REFERENCES users(id),
  training_module TEXT,  -- e.g., "5.7", "6.3"
  completion_date DATE,
  competency_status TEXT CHECK (competency_status IN ('not_competent', 'competent', 'refresher_required')),
  last_refresher_date DATE,
  PRIMARY KEY (user_id, training_module)
);

-- Create medical_screening table:
CREATE TABLE medical_screening (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  illness_reported BOOLEAN DEFAULT FALSE,
  exclusion_active BOOLEAN DEFAULT FALSE,
  symptom_free_date DATE,
  medical_clearance_required BOOLEAN DEFAULT FALSE,
  clearance_obtained BOOLEAN DEFAULT FALSE
);

-- Create hygiene_violations table:
CREATE TABLE hygiene_violations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  violation_type TEXT,
  violation_date DATE,
  documented BOOLEAN DEFAULT FALSE,
  disciplinary_action_triggered BOOLEAN DEFAULT FALSE
);

-- Create ai_interaction_audit table:
CREATE TABLE ai_interaction_audit (
  interaction_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_role TEXT,
  language_level INTEGER,
  query_text TEXT,
  response_text TEXT,
  escalation_triggered BOOLEAN,
  hygiene_keywords_detected TEXT[],
  authority_check_passed BOOLEAN
);
```

### AI Prompt Engineering:
```python
def generate_ai_response(user_id, query):
    # Step 1: Get user context
    user = get_user_context(user_id)

    # Step 2: Check prerequisites
    if not user['induction_completed']:
        return BLOCK_ACCESS_INDUCTION_MESSAGE

    if user['medical_exclusion_active']:
        return BLOCK_ACCESS_MEDICAL_MESSAGE

    # Step 3: Calculate language level
    level = calculate_language_level(
        base_role=user['role'],
        training_status=user['training_status'],
        competency=user['competency_status']
    )

    # Step 4: Check authority for requested action
    action = extract_action(query)
    if not has_authority(user['role'], action):
        return generate_escalation_message(action, user['role'])

    # Step 5: Detect hygiene/safety keywords
    hygiene_flags = detect_hygiene_keywords(query)
    if hygiene_flags:
        probe_questions = generate_hygiene_probes(hygiene_flags)
        response = f"{probe_questions}\n\n{base_response}"

    # Step 6: Generate response with role-appropriate language
    prompt = build_prompt(user, level, query, hygiene_flags)
    response = call_llm(prompt)

    # Step 7: Validate response
    validation = validate_response(response, user, action)
    if not validation['valid']:
        response = add_missing_elements(response, validation['errors'])

    # Step 8: Log interaction
    log_ai_interaction(user_id, query, response, level, hygiene_flags)

    return response
```

### Validation Rules:
```python
def validate_response(response, user_context, action):
    checks = {
        "language_appropriate": check_complexity_matches_level(response, user_context['language_level']),
        "authority_respected": not suggests_unauthorized_action(response, user_context['role'], action),
        "escalation_provided": has_escalation_if_needed(response, user_context['role'], action),
        "brcgs_referenced": has_procedure_reference(response) if user_context['language_level'] >= 3,
        "hygiene_probed": has_probe_questions(response) if hygiene_keywords_detected
    }

    return {
        "valid": all(checks.values()),
        "errors": [k for k, v in checks.items() if not v]
    }
```

---

## 8. Quick Escalation Decision Tree

```
START: User requests action
  ↓
Does user have induction training?
  NO → Block access, require induction
  YES ↓

Is user medically excluded?
  YES → Block production access
  NO ↓

Does action require training?
  YES → Is user trained?
    NO → Escalate to Team Leader
    YES ↓

Does user have competency?
  NO → Provide step-by-step + escalation option
  YES ↓

Does user have authority?
  NO → Escalate to appropriate role (see matrix)
  YES ↓

Hygiene/safety keywords detected?
  YES → Probe with specific questions
    Critical violation? → Immediate QA escalation
  NO ↓

Generate role-appropriate response (language level)
  ↓
Validate response quality
  ↓
Log interaction for audit
  ↓
DELIVER RESPONSE
```

---

## 9. BRCGS Compliance Quick Check

**Section 6.1 (Training):**
- ✅ AI checks induction before ANY guidance
- ✅ AI checks training status for procedure-specific help
- ✅ AI flags procedure revisions requiring refresher
- ✅ AI adjusts language based on competency

**Section 6.1.2 (Disciplinary):**
- ✅ AI tracks hygiene violations (3+ in 30 days = escalation)
- ✅ AI distinguishes misconduct (safety) vs poor performance (training gap)
- ✅ AI documents all violations with audit trail

**Section 6.3 (Hygiene):**
- ✅ AI probes for hygiene violations in NCA descriptions
- ✅ AI references Personal Hygiene Standard 6.3.1
- ✅ AI reminds of hygiene requirements contextually

**Section 6.4 (Medical):**
- ✅ AI checks medical exclusion status
- ✅ AI blocks production access if excluded
- ✅ AI prompts symptom reporting when illness detected

**Audit Trail:**
- ✅ Every AI interaction logged with user, role, level, query, response
- ✅ Escalations documented
- ✅ Hygiene keyword detections tracked
- ✅ Authority checks recorded

---

## 10. Testing Scenarios for QA

### Test 1: Untrained User Blocked
```
User: Operator (no 5.7 training)
Action: Try to authorize rework
Expected: "⚠️ AUTHORIZATION REQUIRED - You need training in 5.7 and Team Leader authority"
```

### Test 2: Medical Exclusion Enforced
```
User: Operator (medical exclusion active)
Action: Try to access production guidance
Expected: "🚫 PRODUCTION ACCESS RESTRICTED - Work exclusion active due to illness"
```

### Test 3: Hygiene Keyword Detection
```
User: Operator
NCA Description: "Found hair in product area"
Expected: AI probes → "Was any hair found in/near product? Employee name required per 6.3.1"
```

### Test 4: Language Level Adaptation
```
Same NCA, different users:
- Operator → "Machine stopped, put product on hold"
- QA Supervisor → "Disposition decision per 5.7 with traceability to WO"
- Ops Manager → "3 NCAs in 7 days = systematic issue, KPI impact analysis"
```

### Test 5: Authority Escalation
```
User: Operator
Action: Try to close NCA
Expected: "❌ You don't have authority to close NCAs. This requires QA Supervisor approval."
```

### Test 6: Repeat Hygiene Violations
```
User: Operator (3rd hygiene violation in 30 days)
Action: Record hygiene issue
Expected: Automatic escalation → "⚠️ Third violation triggers disciplinary procedure per 6.1.2"
```

---

## Document Control

**Created:** 2025-11-10
**Version:** 1.0
**Full Document:** AI_Language_Adaptation_Framework.md (90+ pages)
**This Summary:** Quick reference for developers

**Key Files:**
- `AI_Language_Adaptation_Framework.md` - Full specification (90 pages)
- `AI_Language_Adaptation_Summary.md` - This quick reference (10 pages)
- Database migrations: Add tables for training, medical screening, violations
- API endpoints: Implement user context queries before AI responses

---

**CRITICAL IMPLEMENTATION RULE:**

Every AI response MUST:
1. Check user context (induction, medical, training, competency)
2. Calculate appropriate language level
3. Verify user authority for suggested actions
4. Detect and probe hygiene/safety keywords
5. Provide escalation path if user lacks authority/competency
6. Log interaction for BRCGS audit trail

**Never bypass these checks - they enforce BRCGS Section 6 compliance.**

---

END OF SUMMARY
