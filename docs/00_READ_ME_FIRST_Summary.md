# OHiSee System Enhancement - Complete Documentation Package

**Created:** Wednesday, November 05, 2025  
**For:** Mike Roodt - Operations Manager, Kangopak (Pty) Ltd  
**Purpose:** Digital transformation of Non-Conformance Advice and Maintenance Job Card processes

---

## Executive Summary

This documentation package provides comprehensive specifications for enhancing the OHiSee Operations Intelligence Centre with integrated Non-Conformance Advice (NCA) and Maintenance Job Card (MJC) functionality. The enhancement will replace paper-based operational reporting with a fully integrated digital workflow that automatically links all issues to active work orders, enabling real-time tracking, automated register updates, and management reporting.

---

## Package Contents

### 1. OHiSee_Enhancement_Requirements_Prompt.md

**Purpose:** Master requirements document and development brief  
**Size:** 27KB  
**Sections:**

- Executive Summary
- Context & Background
- Technical Architecture Requirements
- Functional Requirements (NCA & MJC modules)
- Work Order Integration & Automatic Linking
- End-of-Day Submission & Reporting
- Validation & Quality Assurance
- Implementation Considerations
- Success Metrics
- Questions for Clarification
- Glossary & Document Control

**Key Features:**

- Comprehensive system integration architecture
- Detailed workflow specifications
- Windows environment requirements
- BRCGS compliance alignment
- Success metrics and KPIs

**Use This Document For:**

- Providing to development teams as the primary brief
- Project scoping and estimation
- Stakeholder alignment and approval
- Architecture planning and design discussions

---

### 2. NCA_Wireframe_Specification.md

**Purpose:** Detailed Non-Conformance Advice form wireframe and field specifications  
**Size:** 41KB  
**Sections:**

- Document Overview
- Complete ASCII Wireframe Layout (11 sections)
- Field Specifications (Auto-Generated, Required, Conditional)
- Validation Rules
- Digital Signature Implementation
- Integration Requirements
- Mobile Responsiveness
- BRCGS Compliance Notes

**Form Sections Detailed:**

1. NCA Identification (auto-generated)
2. Non-Conformance Classification
3. Supplier & Product Information
4. Non-Conformance Description
5. Machine Status (with downtime tracking)
6. Out of Specification Concession
7. Immediate Correction/Action Taken
8. Disposition of Non-Conforming Product
9. Root Cause Analysis
10. Corrective Action
11. Close Out

**Key Features:**

- Auto-population from active work order
- Mandatory machine status declaration
- Immediate correction workflow with team leader verification
- Comprehensive disposition options
- Root cause and corrective action documentation
- Management authorization for close out

**Use This Document For:**

- UI/UX design reference
- Frontend development specifications
- Database schema design for NCA tables
- Validation logic implementation
- Testing and QA checklists

---

### 3. MJC_Wireframe_Specification.md

**Purpose:** Detailed Maintenance Job Card form wireframe and field specifications  
**Size:** 44KB  
**Sections:**

- Document Overview
- Complete ASCII Wireframe Layout (11 sections)
- Field Specifications (Auto-Generated, Required, Conditional)
- Workflow States
- Post Hygiene Clearance Checklist Details
- Integration Requirements
- Mobile Responsiveness
- BRCGS Compliance Notes
- Preventive Maintenance Integration
- Reporting & Analytics
- Permission Levels Matrix

**Form Sections Detailed:**

1. Job Card Identification (auto-generated)
2. Machine/Equipment Identification
3. Maintenance Type & Classification
4. Machine Status & Urgency
5. Temporary Repair Status (with 14-day tracking)
6. Description of Maintenance Required
7. Maintenance Performed
8. Additional Comments
9. Post Hygiene Clearance Record (10-item checklist)
10. Post Hygiene Clearance Signature
11. Job Card Status & Closure

**Key Features:**

- Reactive vs. Planned maintenance tracking
- Critical urgency level escalation
- Temporary repair management with automated follow-up
- Comprehensive 10-item hygiene clearance checklist (BRCGS critical)
- Multi-stage workflow (Draft → Open → Assigned → In Progress → Awaiting Clearance → Closed)
- QA/Supervisor authorization required before production resumption

**Use This Document For:**

- UI/UX design reference
- Frontend development specifications
- Database schema design for MJC tables
- Workflow state machine implementation
- Notification logic development
- Testing and QA checklists

---

## Key Architectural Concepts

### 1. Work Order as Central Linking Mechanism

All operational activities link to the active work order:

```
Active Work Order (WO-20251105-CMH-001)
    ├── Production Data Capture (waste metrics, quantities)
    ├── Non-Conformance Advice entries (NCA-2025-0847, NCA-2025-0848)
    ├── Maintenance Job Cards (MJC-2025-1243, MJC-2025-1244)
    └── End-of-Day Submission (consolidated summary)
```

**Benefits:**

- Complete traceability from issue to work order to product
- Prevents orphaned records
- Enables work order closure validation
- Supports BRCGS audit requirements

### 2. Auto-Generated vs. User-Entered Fields

**Auto-Generated Fields** (system-populated, not editable):

- Date/Time stamps
- Sequential reference numbers (NCA-YYYY-#########, MJC-YYYY-########)
- Work order linkage
- User identification from active session
- Department/machine from production context

**User-Entered Fields** (operator input required):

- Issue descriptions
- Machine status declarations
- Disposition selections
- Root cause analysis
- Corrective actions

**Why This Matters:**

- Reduces data entry time
- Eliminates manual errors in work order linking
- Ensures consistent traceability
- Maintains operator focus on problem description

### 3. Machine Status Declaration

Both forms require explicit machine status declaration:

- **Machine Down:** Production halted, immediate response required
- **Machine Operational:** Production continuing, issue logged

**Critical Business Logic:**

- Machine Down status triggers priority alerts (SMS/email to management)
- Machine Down status starts downtime clock for metrics
- No default selection allowed (forces conscious declaration)
- Status affects workflow priority and response time expectations

### 4. Multi-Stage Workflows

**NCA Workflow:**

```
Draft → Submitted → Under Review → Closed
         ↓              ↓            ↓
      Register      Investigation  Management
      Entry         & Analysis     Sign-off
```

**MJC Workflow:**

```
Draft → Open → Assigned → In Progress → Awaiting Clearance → Closed
        ↓       ↓          ↓             ↓                    ↓
     Register  Tech     Maintenance   Hygiene            Production
     Entry   Assigned    Work        Verification        Resumption
```

**Why This Matters:**

- Clear accountability at each stage
- Status visibility for management
- Prevents premature closure
- BRCGS compliance for documented processes

### 5. End-of-Day Integration

Operator daily submission includes:

- Production data summary
- Real-time list of NCAs created during shift
- Real-time list of MJCs created during shift
- Work order status
- Operator sign-off

**Automated Actions:**

- Register updates
- Management report generation
- Email distribution to relevant personnel
- Audit trail creation

---

## Critical Implementation Requirements

### Windows Environment Compliance

**MUST USE WINDOWS-COMPATIBLE:**

- File path conventions (backslashes, drive letters)
- PowerShell scripts (not bash)
- Windows authentication for database connections
- .NET or compatible frameworks
- IIS or Windows-compatible web server

**DO NOT USE:**

- iOS-specific implementations
- macOS-specific implementations
- Linux-only syntax or tools
- Unix-style file paths

### BRCGS Compliance Requirements

**Mandatory for both forms:**

- Complete audit trail (who, what, when for every action)
- Timestamp accuracy and immutability
- No deletion capability (records can be closed, not deleted)
- Historical data retention (minimum 3 years)
- Export capability for external audits
- Tamper-evident logging

**Specific to Maintenance Job Cards:**

- Post Hygiene Clearance mandatory before production resumption
- All 10 checklist items must be verified
- QA/Supervisor authorization required
- Food safety contamination prevention verification

### Mobile/Tablet Optimization

**Shop floor usage requirements:**

- Portrait and landscape orientation support
- Touch-friendly controls (minimum 44px tap targets)
- Large text input areas with zoom
- Camera integration for photo attachments
- Signature pad capability (touch/stylus)
- Offline data capture with sync (if connectivity unreliable)

### Notification Infrastructure

**Required notification triggers:**

**Immediate (SMS + Email):**

- Machine Down status (NCA or MJC)
- Critical urgency maintenance requests

**Email Only:**

- NCA submission confirmation
- MJC assignment to technician
- Hygiene clearance completion
- Daily summary reports

**Scheduled/Reminder:**

- Temporary repair Day 10 reminder
- Temporary repair Day 13 escalation
- Temporary repair Day 14 compliance notification

---

## Database Schema Considerations

### Core Tables Required

**work_orders**

- wo_id (primary key)
- wo_number (unique, indexed)
- machine_id (foreign key)
- start_timestamp
- end_timestamp
- status (active/closed)
- operator_id (foreign key)

**nca_register**

- nca_id (primary key)
- nca_number (unique, indexed)
- wo_id (foreign key to work_orders)
- raised_by_user_id (foreign key)
- timestamp
- nc_type
- machine_status
- disposition_status
- close_out_status
- (all other form fields...)

**mjc_register**

- mjc_id (primary key)
- mjc_number (unique, indexed)
- wo_id (foreign key to work_orders)
- raised_by_user_id (foreign key)
- timestamp
- machine_id (foreign key)
- urgency_level
- machine_status
- temporary_repair_flag
- temporary_repair_due_date
- workflow_status
- (all other form fields...)

**mjc_hygiene_clearance**

- clearance_id (primary key)
- mjc_id (foreign key)
- checklist_item_id
- verification_status (verified/not_verified)
- cleared_by_user_id (foreign key)
- clearance_timestamp

**audit_trail**

- audit_id (primary key)
- entity_type (NCA/MJC/WorkOrder)
- entity_id (foreign key)
- action (created/modified/status_change/closed)
- user_id (foreign key)
- timestamp
- old_value
- new_value
- ip_address

### Relationships

```
work_orders (1) ──< (many) nca_register
work_orders (1) ──< (many) mjc_register
mjc_register (1) ──< (many) mjc_hygiene_clearance
users (1) ──< (many) nca_register.raised_by
users (1) ──< (many) mjc_register.raised_by
machines (1) ──< (many) work_orders
machines (1) ──< (many) mjc_register
```

---

## Validation Framework

### Data Integrity Validation

- Work order must exist and be active when NCA/MJC created
- Work order foreign key constraint enforcement
- Sequential number generation without gaps or duplicates
- Timestamp consistency across related records

### User Input Validation

- Required field presence validation
- Minimum character counts on text areas
- Date range validation (e.g., close out date >= issue date)
- File upload type and size restrictions
- Email format validation for notifications

### Workflow Validation

- Cannot submit with incomplete required fields
- Cannot close work order with open NCAs (or requires override)
- Cannot close work order with open MJCs (or requires override)
- Cannot grant hygiene clearance with any "Not Verified" items
- Cannot mark temporary repair complete without permanent fix within 14 days
- Status transitions must follow defined workflow progression

### Business Logic Validation

- Machine Down status must trigger priority notifications
- Cross contamination = YES must trigger immediate action verification
- Temporary repair = YES must auto-calculate 14-day due date
- Post hygiene clearance must be completed by authorized role only
- NCA close out must be completed by authorized role only

---

## Testing Scenarios

### Happy Path Testing

1. Operator creates NCA during active production → linked to work order → submitted to register → management review → close out
2. Operator creates MJC during active production → maintenance assigned → work performed → hygiene clearance → production resumed
3. End-of-day submission includes all daily NCAs and MJCs → automated report generation → email distribution

### Edge Case Testing

1. Work order closes with open NCAs → system prevents closure or requires override
2. Machine Down status selected → verify immediate SMS/email alerts sent
3. Temporary repair flag = YES → verify 14-day follow-up reminders triggered
4. Cross contamination = YES on NCA → verify mandatory back tracking workflow enforced
5. Hygiene clearance attempted with "Not Verified" items → system prevents clearance
6. Multiple NCAs/MJCs created for same work order → verify all properly linked

### Error Handling Testing

1. Network failure during form submission → offline data capture and sync
2. Duplicate NCA/MJC number generation attempt → verify conflict resolution
3. User permission insufficient for action → verify proper error message
4. Required field left blank → verify validation prevents submission
5. File upload exceeds size limit → verify error handling
6. Email server unavailable → verify notification retry mechanism

### Performance Testing

1. Page load time < 2 seconds (requirement)
2. Form submission processing < 3 seconds (requirement)
3. Register update < 5 seconds (requirement)
4. Report generation < 10 seconds (requirement)
5. Multiple concurrent users creating forms → verify no race conditions

---

## Migration Considerations

### From Paper to Digital

**If historical paper records exist:**

- Assess volume and date range of historical data
- Determine if historical migration necessary for reporting/trends
- Create data entry template matching digital form structure
- Consider scanning paper forms as PDF attachments to digital records
- Maintain paper archives per retention policy even after digital migration

**Training Requirements:**

- Operators: How to create NCAs and MJCs during production
- Team Leaders: How to verify and sign immediate corrections
- Maintenance Technicians: How to complete maintenance work and sign off
- QA/Supervisors: How to perform hygiene clearance and authorize closure
- Management: How to review registers and run reports

---

## Success Metrics (Baseline → Target)

### Operational Efficiency

- Time to record non-conformance: 15 minutes (paper) → 5 minutes (digital)
- Time to record maintenance request: 10 minutes (paper) → 3 minutes (digital)
- Daily summary compilation time: 30 minutes (paper) → 0 minutes (automated)

### Data Quality

- Work order traceability: 70% (paper) → 100% (digital)
- Missing required fields: 25% (paper) → 0% (digital, validation enforced)
- Illegible handwriting issues: 15% (paper) → 0% (digital)

### Response Time

- Maintenance response time (critical): 2 hours (paper) → 30 minutes (digital, instant alerts)
- Management visibility delay: 24 hours (paper) → real-time (digital dashboard)

### Compliance

- Audit trail completeness: 60% (paper) → 100% (digital, automatic logging)
- BRCGS documentation accessibility: manual search → instant retrieval
- Historical data retention: physical storage constraints → unlimited digital retention

---

## Next Steps

### Immediate Actions Required

1. **Review & Approve:** Stakeholder review of all three specification documents
2. **Answer Clarification Questions:** Address the 14 questions in the requirements document
3. **Technology Stack Decision:** Confirm frontend, backend, database technologies for Windows environment
4. **User Permissions Matrix:** Define detailed permission levels by role
5. **Notification Infrastructure:** Confirm email server and SMS gateway capabilities

### Phase 1: Foundation (Weeks 1-4)

- Database schema design and creation
- User authentication and permission system
- Work order module enhancement (if needed)
- Core form rendering engine

### Phase 2: Form Development (Weeks 5-8)

- NCA form frontend and backend
- MJC form frontend and backend
- Validation logic implementation
- Auto-population and work order linking

### Phase 3: Integration (Weeks 9-10)

- Register creation and updates
- Notification system integration
- End-of-day submission workflow
- Management reporting

### Phase 4: Testing & Deployment (Weeks 11-12)

- User acceptance testing
- Performance testing
- Training material creation
- Phased rollout (pilot → full deployment)

---

## Support & Maintenance

### Documentation Maintenance

These specifications should be updated whenever:

- Business process changes occur
- New BRCGS requirements emerge
- User feedback identifies improvements
- System integrations are added

### Version Control

- Current Version: 1.0 (November 05, 2025)
- All three documents should maintain synchronized version numbers
- Change log should track modifications to requirements

### Contact

**Project Owner:** Mike Roodt, Operations Manager  
**Organization:** Kangopak (Pty) Ltd  
**Purpose:** OHiSee Operations Intelligence Centre Enhancement  

---

## Appendix: Form Comparison Matrix

| Feature | NCA Form | MJC Form |
|---------|----------|----------|
| **Primary Purpose** | Record quality/specification non-conformances | Request maintenance work |
| **Auto-Generated ID** | NCA-YYYY-######### | MJC-YYYY-######## |
| **Machine Status** | Down / Operational | Down / Operational |
| **Urgency Levels** | Implicit (based on type) | Explicit (Critical/High/Medium/Low) |
| **Multi-Stage Workflow** | Draft → Submit → Review → Close | Draft → Open → Assign → Progress → Clearance → Close |
| **Disposition Options** | 6 options (reject/rework/concession/discard/uplift/credit) | N/A (work performed description) |
| **Hygiene Clearance** | Not applicable | 10-item checklist REQUIRED |
| **Team Leader Involvement** | Signs immediate corrections | Signs immediate corrections (if applicable) |
| **QA/Supervisor Role** | Optional (for out-of-spec concession) | MANDATORY (hygiene clearance) |
| **Management Closure** | Required (close out signature) | Automatic upon hygiene clearance |
| **Temporary vs Permanent** | Not applicable | Tracks temporary repairs with 14-day follow-up |
| **Cross Contamination Check** | Yes (mandatory question) | Implicit in hygiene clearance |
| **Root Cause Analysis** | Large text area + attachments | Part of maintenance performed description |
| **BRCGS Criticality** | High (traceability) | CRITICAL (food safety) |

---

## Conclusion

This documentation package provides a complete, production-ready specification for implementing Non-Conformance Advice and Maintenance Job Card functionality within the OHiSee Operations Intelligence Centre.

**Key Strengths:**

- ✅ Based on actual hard copy forms from Kangopak operations
- ✅ Windows environment compliance explicitly specified
- ✅ BRCGS compliance requirements integrated throughout
- ✅ Work order linking architecture clearly defined
- ✅ Complete field-by-field specifications for development
- ✅ Validation rules and business logic documented
- ✅ Multi-stage workflows with clear authorization gates
- ✅ Mobile/tablet optimization requirements included

**Ready for:**

- Development team handoff
- Project scoping and estimation
- UI/UX design initiation
- Database schema design
- Stakeholder approval presentations

**Document Package:**

1. [OHiSee_Enhancement_Requirements_Prompt.md](computer:///mnt/user-data/outputs/OHiSee_Enhancement_Requirements_Prompt.md) - Master requirements
2. [NCA_Wireframe_Specification.md](computer:///mnt/user-data/outputs/NCA_Wireframe_Specification.md) - NCA form wireframe
3. [MJC_Wireframe_Specification.md](computer:///mnt/user-data/outputs/MJC_Wireframe_Specification.md) - MJC form wireframe
4. This summary document

All specifications are comprehensive, production-ready, and designed for immediate implementation in a Windows-based BRCGS-compliant manufacturing environment.
