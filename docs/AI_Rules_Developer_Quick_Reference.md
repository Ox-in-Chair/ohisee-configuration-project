# AI Corrective Action Rules - Developer Quick Reference

**Version:** 1.0 | **Date:** 2025-11-10 | **1-Page Cheat Sheet**

---

## AI TRIGGER POINTS

### NCA - Section 10: Corrective Action
**When:** User reaches Section 10 of NCA form
**Button:** "AI Suggest Corrective Action"
**Input:** Analyzes `nc_description`, `nc_type`, `machine_status`, `cross_contamination`, disposition fields
**Output:** Populates `corrective_action` field (user can edit before save)

### MJC - Section 7: Maintenance Performed
**When:** Maintenance technician reaches Section 7 of MJC form
**Button:** "AI Suggest Maintenance Action"
**Input:** Analyzes `description_required`, `maintenance_category`, `maintenance_type_*`, `urgency`, `temporary_repair`
**Output:** Populates `maintenance_performed` field (user can edit before save)

---

## API STRUCTURE

### Request Format
```typescript
// NCA Corrective Action Request
POST /api/ai/suggest-corrective-action
{
  nca_id: "uuid",
  nc_description: "string (min 100 chars)",
  nc_type: "raw-material" | "finished-goods" | "wip" | "incident" | "other",
  nc_type_other?: "string",
  machine_status: "down" | "operational",
  machine_down_since?: "timestamp",
  cross_contamination: boolean,
  disposition_rework: boolean,
  disposition_concession: boolean,
  // Optional: existing root_cause_analysis for context
  root_cause_analysis?: "string"
}

// MJC Maintenance Action Request
POST /api/ai/suggest-maintenance-action
{
  mjc_id: "uuid",
  description_required: "string (min 50 chars)",
  maintenance_category: "reactive" | "planned",
  maintenance_type_electrical: boolean,
  maintenance_type_mechanical: boolean,
  maintenance_type_pneumatical: boolean,
  maintenance_type_other?: "string",
  machine_status: "down" | "operational",
  urgency: "critical" | "high" | "medium" | "low",
  temporary_repair: boolean,
  machine_equipment: "string"
}
```

### Response Format
```typescript
// AI Suggestion Response (both NCA and MJC)
{
  suggestion: {
    text: "string",                    // Full formatted suggestion
    sections: {
      immediate_correction?: "string", // NCAs only
      root_cause?: "string",           // NCAs only
      corrective_action?: "string",    // NCAs only
      maintenance_scope?: "string",    // MJCs only
      safety_considerations?: "string", // MJCs only
      contamination_prevention?: "string", // MJCs only
      hygiene_clearance?: "string",    // MJCs only (10 items)
      verification: "string"           // Both
    }
  },
  quality_score: number,               // 0-100
  confidence: "high" | "medium" | "low",
  confidence_percentage: number,       // 0-100
  procedure_references: string[],      // ["5.7", "5.3", "5.6", etc.]
  keywords_detected: {
    category: string,                  // "equipment", "process", "material", etc.
    keywords: string[]
  },
  recommendations: {
    create_mjc?: boolean,              // If equipment issue detected
    calibration_check?: boolean,       // If measurement issue
    training_required?: boolean,       // If operator error
    hara_review?: boolean              // If systemic/design issue
  }
}
```

---

## KEYWORD DETECTION RULES

### NCA Keywords (scan `nc_description`)
```javascript
const NCA_KEYWORDS = {
  equipment: ["machine", "motor", "bearing", "seal", "wear", "breakdown", "malfunction"],
  process: ["specification", "tolerance", "out of spec", "drift", "parameter"],
  material: ["raw material", "film", "supplier", "batch", "reel", "gauge", "defect"],
  operator: ["operator error", "training", "forgot", "missed", "didn't check"],
  contamination: ["foreign body", "glass", "metal", "blade", "contamination", "debris"],
  calibration: ["measurement", "scale", "gauge", "accuracy", "calibration", "counting"]
};

// AI categorizes based on highest keyword match count
```

### MJC Keywords (scan `description_required`)
```javascript
const MJC_KEYWORDS = {
  urgent: ["broken", "failed", "stopped", "emergency", "critical", "not working"],
  safety_critical: ["guard", "interlock", "e-stop", "safety", "hazard", "injury"],
  contamination_risk: ["leak", "oil", "grease", "metal", "debris", "loose", "missing"],
  calibration_equipment: ["scale", "gauge", "measuring", "testing", "counting", "sensor"],
  electrical: ["electrical", "motor", "power", "circuit", "control", "PLC"],
  mechanical: ["bearing", "chain", "belt", "alignment", "lubrication"],
  pneumatic: ["air", "pneumatic", "cylinder", "valve", "pressure", "leak"]
};
```

---

## PROCEDURE REFERENCE LOOKUP

```javascript
const PROCEDURE_MAP = {
  "raw-material": ["5.7", "5.3", "3.4", "5.1"],
  "finished-goods": ["5.7", "5.3", "5.6", "6.1"],
  "wip": ["5.7", "5.3", "3.9"],
  "incident": ["5.8", "5.7", "5.8.1", "5.8.2"],
  "equipment_detected": ["4.7", "5.6", "5.3"],
  "calibration_detected": ["5.6", "5.6F2", "5.7", "3.9"],
  "contamination_detected": ["5.8", "5.7"],
  "training_detected": ["6.1", "5.3"],
  "reactive_maintenance": ["4.7", "5.8", "5.6"],
  "planned_maintenance": ["4.7F5-F12", "5.6", "5.3"]
};

// AI includes 2+ relevant procedures in every suggestion
```

---

## QUALITY SCORE CALCULATION

### NCA Score (0-100)
```javascript
function calculateNCAScore(suggestion) {
  let score = 0;

  // Immediate correction completeness (20 points)
  if (suggestion.includes("Quarantine")) score += 5;
  if (suggestion.includes("RED Hold sticker")) score += 5;
  if (suggestion.includes("back tracking") || suggestion.includes("Back tracking")) score += 5;
  if (suggestion.includes("Segregate") || suggestion.includes("segregation")) score += 5;

  // Root cause specificity (20 points)
  score += rootCauseSpecificityScore; // AI model confidence-based

  // Preventive action clarity (25 points)
  if (suggestion.includes("Procedure") || suggestion.includes("procedure")) score += 5;
  if (suggestion.includes("Skills Matrix") || suggestion.includes("training")) score += 5;
  if (suggestion.includes("Review") || suggestion.includes("review")) score += 5;
  if (suggestion.includes("Monitor") || suggestion.includes("verify")) score += 5;
  if (suggestion.split("CORRECTIVE ACTION").length > 3) score += 5; // Multiple actions

  // Procedure integration (20 points)
  const procedureCount = countProcedureReferences(suggestion);
  score += Math.min(procedureCount * 5, 20); // 5 points per procedure, max 20

  // Verification measurability (15 points)
  if (suggestion.includes("Monitor next")) score += 5;
  if (suggestion.includes("days") || suggestion.includes("months")) score += 5;
  if (suggestion.includes("Management Review")) score += 5;

  return Math.min(score, 100);
}
```

### MJC Score (0-100)
```javascript
function calculateMJCScore(suggestion) {
  let score = 0;

  // Maintenance scope specificity (20 points)
  if (suggestion.includes("part") || suggestion.includes("Part")) score += 5;
  if (suggestion.includes("torque") || suggestion.includes("specification")) score += 5;
  if (suggestion.includes("Removed") || suggestion.includes("Installed")) score += 10; // Specific actions

  // Safety emphasis (20 points)
  if (suggestion.includes("LOTO") || suggestion.includes("Lock Out Tag Out")) score += 10;
  if (suggestion.includes("PPE")) score += 5;
  if (suggestion.includes("energy") || suggestion.includes("isolation")) score += 5;

  // Contamination prevention (20 points)
  if (suggestion.includes("Clean as You Go")) score += 10;
  if (suggestion.includes("shadow board") || suggestion.includes("tool")) score += 5;
  if (suggestion.includes("swarf") || suggestion.includes("debris")) score += 5;

  // Hygiene clearance completeness (25 points)
  const checklistItems = countHygieneChecklistItems(suggestion); // Should be 10
  score += Math.min(checklistItems * 2.5, 25); // 2.5 points per item, max 25

  // Post-maintenance verification (15 points)
  if (suggestion.includes("Functional test")) score += 5;
  if (suggestion.includes("Test samples") || suggestion.includes("quality")) score += 5;
  if (suggestion.includes("calibration") || suggestion.includes("Calibration")) score += 5;

  return Math.min(score, 100);
}
```

---

## SPECIAL HANDLING FLAGS

```javascript
// Check these conditions and enhance suggestions accordingly:

// NCA Special Flags
if (machine_status === "down") {
  // Add: "CRITICAL PRIORITY - MACHINE DOWN ALERT"
  // Add: Operations Manager notification
  // Add: Downtime duration calculation
}

if (cross_contamination === true) {
  // Add: "MANDATORY BACK TRACKING VERIFICATION"
  // Add: Team Leader signature requirement
  // Add: Traceability emphasis (Procedure 3.9)
}

if (disposition_rework === true) {
  // Enhance rework_instruction with:
  // - Specific quality checks
  // - Acceptance criteria
  // - Skills Matrix requirements
}

if (disposition_concession === true) {
  // Add: "OUT-OF-SPECIFICATION CONCESSION APPROVAL"
  // Add: Team Leader authorization requirement
  // Add: Customer notification consideration
}

// MJC Special Flags
if (temporary_repair === true) {
  // Add: "⚠️ TEMPORARY REPAIR - 14-DAY CLOSE OUT REQUIRED ⚠️"
  // Add: close_out_due_date calculation (TODAY + 14 days)
  // Add: Follow-up MJC creation reminder
}

if (machine_status === "down" && urgency === "critical") {
  // Add: "🚨 CRITICAL MACHINE DOWN - IMMEDIATE RESPONSE 🚨"
  // Add: <1 hour response time emphasis
  // Add: Maintenance Manager notification
  // Add: Parts expediting authorization
}

if (maintenance_affects_measuring_equipment) {
  // Add: "CALIBRATION VERIFICATION REQUIRED (5.6)"
  // Add: Window of exposure assessment
  // Add: Product traceability if out-of-calibration
}

if (maintenance_type_mechanical && involves_metal_work) {
  // Add: "FOREIGN BODY CONTAMINATION CONTROL (5.8)"
  // Add: Swarf mat requirements
  // Add: Tool accountability (shadow board check-out/return)
  // Add: Metal detector test if product has metal detection CCP
}
```

---

## UI INTEGRATION

### Suggestion Display Component
```typescript
interface AISuggestionDisplay {
  suggestion: string;
  qualityScore: number;
  confidence: "high" | "medium" | "low";
  procedureReferences: string[];
  actions: {
    accept: () => void;
    edit: () => void;
    reject: () => void;
    rate: (rating: 1 | 2 | 3 | 4 | 5) => void;
  };
}

// Visual indicators:
// - Green border: score >= 90 (Excellent)
// - Blue border: score 75-89 (Good)
// - Yellow border: score 60-74 (Acceptable)
// - Red border: score < 60 (Inadequate - manual review required)
```

### User Workflow States
```typescript
enum SuggestionState {
  LOADING = "loading",           // AI processing
  READY = "ready",               // Suggestion available
  ACCEPTED = "accepted",         // User clicked Accept
  EDITED = "edited",             // User modified suggestion
  REJECTED = "rejected",         // User clicked Reject
  RATED = "rated"                // User provided rating
}

// Track state transitions for analytics
```

---

## FEEDBACK CAPTURE

```typescript
// Save user feedback for AI training
interface AIFeedback {
  record_id: string;             // nca_id or mjc_id
  record_type: "nca" | "mjc";
  suggestion_type: "corrective_action" | "maintenance_performed";
  ai_suggestion: string;         // Original AI suggestion
  user_edited_version?: string;  // If user edited before saving
  suggestion_accepted: boolean;  // True if accepted as-is
  user_rating?: 1 | 2 | 3 | 4 | 5;
  user_feedback?: string;        // Optional text comment
  quality_score: number;         // 0-100
  confidence: string;            // "high" | "medium" | "low"
  keywords_detected: string[];
  procedure_references: string[];
  created_at: timestamp;
}

// POST /api/ai/feedback
// Store in ai_suggestion_feedback table
```

---

## VALIDATION BEFORE DISPLAY

```javascript
// Validate AI suggestion before showing to user
function validateSuggestion(suggestion, type) {
  const errors = [];

  // Minimum character count
  if (suggestion.text.length < 150) {
    errors.push("Suggestion too short (minimum 150 characters)");
  }

  // Procedure references (at least 2)
  if (suggestion.procedure_references.length < 2) {
    errors.push("Insufficient procedure references (minimum 2)");
  }

  // Type-specific validation
  if (type === "nca") {
    if (!suggestion.sections.immediate_correction) {
      errors.push("Missing immediate correction section");
    }
    if (!suggestion.sections.verification) {
      errors.push("Missing verification method");
    }
  }

  if (type === "mjc") {
    if (!suggestion.sections.hygiene_clearance) {
      errors.push("Missing hygiene clearance section");
    }
    const checklistCount = countHygieneChecklistItems(suggestion.sections.hygiene_clearance);
    if (checklistCount < 10) {
      errors.push(`Incomplete hygiene checklist (${checklistCount}/10 items)`);
    }
  }

  // Quality score threshold
  if (suggestion.quality_score < 60) {
    errors.push("Quality score below acceptable threshold (60)");
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: suggestion.quality_score < 75 ? ["Quality score below 75 - review recommended"] : []
  };
}
```

---

## ERROR HANDLING

```typescript
// AI service errors
enum AIErrorCode {
  INSUFFICIENT_INPUT = "insufficient_input",         // Description too short
  ANALYSIS_FAILED = "analysis_failed",               // AI model error
  LOW_CONFIDENCE = "low_confidence",                 // Confidence < 30%
  TIMEOUT = "timeout",                               // AI service timeout
  VALIDATION_FAILED = "validation_failed"            // Suggestion validation errors
}

// Error response format
interface AIError {
  error: {
    code: AIErrorCode;
    message: string;
    details?: any;
  };
  fallback?: {
    template: string;                                // Generic template as fallback
    manual_input_required: true;
  };
}

// Handle gracefully in UI:
// - Show error message
// - Provide generic template if available
// - Allow manual input without AI assistance
```

---

## PERFORMANCE TARGETS

- **Response Time**: < 3 seconds for AI suggestion generation
- **Availability**: 99% uptime for AI service
- **Quality Score Average**: Target >80/100
- **Acceptance Rate**: Target >75%
- **User Rating Average**: Target 4+ stars (out of 5)

---

## TESTING CHECKLIST

- [ ] NCA raw-material with supplier issue → Suggests supplier NCA (5.7, 3.4)
- [ ] NCA finished-goods with seal width issue → Suggests calibration check (5.6)
- [ ] NCA WIP with line clearance mention → Emphasizes line clearance (5.3)
- [ ] NCA incident with "glass" keyword → References 5.8, 5.8.1
- [ ] NCA with machine_status='down' → Adds downtime alert
- [ ] NCA with cross_contamination=true → Adds mandatory back tracking
- [ ] MJC reactive with "broken bearing" → Detailed mechanical repair steps
- [ ] MJC planned with machine_id → References correct checklist (4.7F5-F12)
- [ ] MJC with temporary_repair=true → Adds 14-day warning
- [ ] MJC with urgency='critical' → Emphasizes <1 hour response
- [ ] Quality score calculation accuracy (0-100 range)
- [ ] Procedure reference correctness (cross-check against BRCGS procedures)
- [ ] Hygiene checklist completeness (10 items for MJCs)
- [ ] User feedback capture and storage
- [ ] Validation prevents display of low-quality suggestions (<60 score)

---

## DEPLOYMENT NOTES

1. **AI Model**: Use LLM with Section 5 procedure context (5.1, 5.3, 5.6, 5.7, 5.8)
2. **Context Window**: Include full procedure text for accurate references
3. **Temperature**: 0.3-0.5 (low creativity, high consistency for compliance)
4. **Prompt Engineering**: Use structured templates with CRITICAL, MANDATORY keywords
5. **Caching**: Cache procedure texts to reduce token usage
6. **Rate Limiting**: Implement per-user rate limits (e.g., 10 suggestions/minute)
7. **Monitoring**: Track quality score distribution, acceptance rate, user ratings
8. **Feedback Loop**: Weekly review of rejected suggestions, monthly AI retraining

---

**FULL DOCUMENTATION**:
- AI_Corrective_Action_Rules.md (complete rules, 70+ pages)
- AI_Rules_Executive_Summary.md (high-level overview)

**CONTACT**: Development Team Lead | Operations Manager | Systems Coordinator

---

**END OF QUICK REFERENCE**
