# OHiSee Operations Intelligence Centre - System Enhancement Requirements

@extends: C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\docs\files\00_READ_ME_FIRST_Summary
@extends: C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\docs\files\NCA_Wireframe_Specification
@extends: C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\docs\files\0MJC_Wireframe_Specification

## Executive Summary

This document defines the requirements for enhancing the OHiSee Operations Intelligence Centre by integrating operational process reporting capabilities. The enhancement focuses on seamless communication between system modules through proper dependency management, routing architecture, and direct data linkage, with specific emphasis on Non-Conformance Advice Forms and Maintenance Job Cards.

---

## Context & Background

**System:** OHiSee Operations Intelligence Centre  
**Organization:** Kangopak (Pty) Ltd - BRCGS-certified flexible packaging manufacturer  
**Purpose:** Replace paper-based operational processes with integrated digital workflow  
**Target Users:** Production operators, maintenance personnel, management  
**Operating Environment:** Windows-based production environment  

**Current State:**
- Paper-based non-conformance reporting
- Manual maintenance job card systems
- Disconnected production data capture
- No real-time issue tracking or automated work order generation

**Desired State:**
- Fully integrated digital workflow with automated work order generation
- Real-time issue capture linked to active production runs
- Automated register updates and management reporting
- Seamless communication between all system modules

---

## Technical Architecture Requirements

### 1. System Integration & Communication

**Requirement:** Establish comprehensive integration architecture across all existing system pages.

**Components:**
- **Dependencies:** Define and implement all inter-module dependencies to ensure proper data flow and functional relationships
- **Direct Communication:** Enable direct module-to-module communication for real-time data exchange
- **Routing Architecture:** Implement navigation routing that maintains context and state across module transitions

**Success Criteria:**
- All pages can access shared data without duplication
- Navigation between modules preserves active production context
- Work order information flows seamlessly across all relevant modules

### 2. Feature Enhancement & Legacy System Handling

**Requirement:** Prioritize development of Non-Conformance Advice Forms and Maintenance Job Cards as primary operational features.

**Approach:**
- Identify features that will become obsolete due to new functionality
- Plan graceful deprecation or removal of redundant features
- Ensure backward compatibility during transition period if historical data exists

**Note:** The new integrated approach may render standalone features obsolete by incorporating their functionality into the unified workflow.

---

## Functional Requirements

### 3. Non-Conformance Advice Module

#### 3.1 Data Capture Interface

**Requirement:** Implement a "Record Non-Conformance Advice" button accessible from active production screens.

**Trigger Conditions:**
- Available only when production run is active
- Visible to operators with appropriate permissions
- Accessible from waste metrics capture interface

**User Workflow:**
1. Operator identifies defect or non-conformance during production
2. Operator clicks "Record Non-Conformance Advice" button
3. System automatically captures:
   - Active work order number
   - Current timestamp
   - Machine identification
   - Operator identification
   - Current production run context
4. System redirects to Non-Conformance Advice Form

#### 3.2 Non-Conformance Advice Form

**Requirement:** Create data input form based on existing hard copy wireframe specifications (see NCA_Wireframe_Specification.md).

**Form Sections:**

**Section 1: NCA Identification (Auto-Generated)**
- Date (system timestamp)
- NCA Number (format: NCA-YYYY-#########, sequential)
- Raised By (from active user session)
- Kangopak WO Number (from active production session)
- Work Order Status (real-time display)

**Section 2: Non-Conformance Classification** *REQUIRED
- Kangopak NC Type (select one):
  - Raw Material
  - Finished Goods
  - Work in Progress
  - Incident
  - Other (with text specification field: Storage/Training/Process/Equipment/Other)

**Section 3: Supplier & Product Information**
- Supplier Name (text input or dropdown from supplier database)
- NC Product Description *REQUIRED (multi-line text area)
- Supplier WO / Batch No.
- Supplier Reel / Box Number/s
- Sample Available *REQUIRED (Yes/No radio buttons)
- Quantity (number + unit)
- Kangopak Carton Number/s (comma-separated for multiple)

**Section 4: Non-Conformance Description** *REQUIRED
- Description of NC/Incident (large text area, minimum 100 characters)
- Character count display

**Section 5: Machine Status** *REQUIRED
- Current Machine Status (must be explicitly declared):
  - MACHINE DOWN (production halted, triggers priority alert)
  - MACHINE OPERATIONAL (production continuing, issue logged)
- Machine Down Time (auto-calculated if Machine Down selected)
  - Down Since (auto-timestamp)
  - Estimated Downtime (minutes)

**Section 6: Out of Specification Concession**
- Team Leader Approval:
  - Team Leader Name (text input)
  - Digital Signature (signature pad or login authentication)
  - Timestamp (auto-generated)
- Additional Notes (text area)

**Section 7: Immediate Correction/Action Taken**
- Any cross contamination? *REQUIRED (YES/NO)
  - If YES: Back tracking must be done IMMEDIATELY
  - Person Name Completing Task
  - Team Leader Verification Signature
- Back tracking completed? *REQUIRED IF CROSS CONTAMINATION = YES (YES/NO/N/A)
  - Note: All affected product segregated and put on hold in NCA area
  - Person Name Completing Task
  - Team Leader Verification Signature
- Hold label completed? *REQUIRED (YES/NO)
- NCA number recorded on log sheet? *REQUIRED (YES/NO)
  - Person Name Completing Task
  - Team Leader Verification Signature

**Section 8: Disposition of Non-Conforming Product**
All items must be answered - select relevant answers:
- Reject back to supplier? (YES/NO)
- Credit note required? (YES/NO)
- Upliftment required? (YES/NO)
- Rework/sorting required at Kangopak? (YES/NO)
- Concession? (YES/NO)
- Discard at Kangopak? (YES/NO)
- Rework Instruction (multi-line text, *REQUIRED if Rework selected)
- Authorised By:
  - Name (text input)
  - Digital Signature
  - Timestamp (auto-generated)

**Section 9: Root Cause Analysis**
- Root Cause Analysis (large text area)
  - Either references, support docs, or investigation details
- Attach Supporting Documents (file upload: PDF, Images, Excel, etc.)

**Section 10: Corrective Action**
- Corrective Action Taken (large text area)
  - Either references, support docs, or investigation details
- Attach Supporting Documents (file upload: PDF, Images, Excel, etc.)

**Section 11: Close Out**
- Close Out Signature (Management/QA Authorization Required):
  - Close Out By (text input or auto-populated from login)
  - Digital Signature (signature pad or login authentication)
  - Close Out Date (date picker)
  - Timestamp (auto-generated)

**Form Actions:**
- Save Draft
- Submit to NCA Register
- Cancel
- Print

**Data Validation:**
- Cannot submit until all *REQUIRED fields completed
- Machine status must be explicitly selected (no default)
- Machine Down status triggers immediate priority alert to Operations Manager
- Disposition section must have at least one action selected
- Root cause and corrective action minimum 50 characters if entered
- Close Out can only be completed by authorized personnel (QA/Management role)
- Cross contamination = YES mandates immediate back tracking verification
- If rework selected, rework instruction is mandatory

#### 3.3 Non-Conformance Advice Register

**Requirement:** Maintain centralized register of all non-conformance entries with automatic updates.

**Register Functionality:**
- Auto-populate entry upon form submission
- Generate unique non-conformance reference number
- Link non-conformance to originating work order
- Timestamp all entries with submission time
- Track status (Open / In Progress / Resolved / Closed)
- Maintain audit trail of all changes

**Reporting Capabilities:**
- Real-time view of open non-conformances
- Historical trend analysis
- Filter by date range, machine, product type, severity
- Export functionality for BRCGS compliance documentation

---

### 4. Maintenance Job Card Module

#### 4.1 Data Capture Interface

**Requirement:** Implement "Create Maintenance Job Card" button accessible from active production screens.

**Trigger Conditions:**
- Available only when production run is active
- Visible to operators with appropriate permissions
- Accessible from waste metrics capture interface
- Can be triggered simultaneously with non-conformance advice

**User Workflow:**
1. Operator identifies maintenance issue during production
2. Operator clicks "Create Maintenance Job Card" button
3. System automatically captures:
   - Active work order number
   - Current timestamp
   - Machine identification
   - Operator identification
   - Current production run context
4. System redirects to Maintenance Job Card Form

#### 4.2 Maintenance Job Card Form

**Requirement:** Create data input form based on existing hard copy wireframe specifications (see MJC_Wireframe_Specification.md) - Form no. 4.7F2 Revision 4.

**Form Sections:**

**Section 1: Job Card Identification (Auto-Generated)**
- Date (system timestamp)
- Time (system timestamp)
- Job Card No. (format: MJC-YYYY-########, sequential)
- Raised By - Name (from active user session)
- Department (from active user session/work order)
- Kangopak WO Number (from active production session)
- Work Order Status (real-time display)

**Section 2: Machine/Equipment Identification** *REQUIRED
- Machine / Equipment / Plant Description (dropdown or auto-populated from active work order, text input if manual entry required)

**Section 3: Maintenance Type & Classification** *REQUIRED
- Maintenance Category (select one):
  - Reactive Maintenance
  - Planned Maintenance
- Maintenance Type (select all that apply):
  - Electrical
  - Mechanical
  - Pneumatical
  - Other (with text specification field)

**Section 4: Machine Status & Urgency** *REQUIRED
- Current Machine Status (must be explicitly declared):
  - MACHINE DOWN (production halted, immediate response required)
  - MACHINE OPERATIONAL (production continuing, scheduled maintenance OK)
- Urgency Level *REQUIRED (select one):
  - Critical (<1 hour response required)
  - High (<4 hours response required)
  - Medium (<24 hours response required)
  - Low (>24 hours response acceptable)
- Machine Down Time (auto-calculated if Machine Down selected):
  - Down Since (auto-timestamp)
  - Estimated Downtime (minutes)

**Section 5: Temporary Repair Status** *REQUIRED
- Temporary Repair? (YES/NO)
- If YES: Close out due date auto-calculated (Current Date + 14 days)
- Warning reminder displayed: "Permanent fix required within 14 days of temporary repair"

**Section 6: Description of Maintenance Required** *REQUIRED
- Description of Maintenance Required (large text area, minimum 100 characters)
  - Describe issue, symptoms, affected components, safety concerns
- Character count display
- Attach Photos/Documents (file upload capability)

**Section 7: Maintenance Performed**
(To be completed by Maintenance Personnel)
- Maintenance Performed (large text area)
  - Detail all work performed, parts replaced, adjustments made, additional issues discovered
- Character count display
- Maintenance Technician Details:
  - Print Name (text input or auto-populated from login)
  - Digital Signature (signature pad or login authentication)
  - Timestamp (auto-generated)

**Section 8: Additional Comments**
- Additional Comments (medium text area)
  - For additional notes, observations, or recommendations for future preventive maintenance

**Section 9: Post Hygiene Clearance Record** *CRITICAL FOR BRCGS
ALL items must be verified before production can resume:
- ☐ All Excess Grease & Oil Removed
  - Verification: No contamination risk exists (✅ Verified / ❌ Not Verified)
- ☐ All Consumables Removed
  - Verification: No consumables left in production area (✅ Verified / ❌ Not Verified)
- ☐ All Tools & Equipment Removed
  - Verification: Tool count verified, all accounted for (✅ Verified / ❌ Not Verified)
- ☐ All Safety Mechanisms in Good Working Order
  - Verification: Guards, interlocks, e-stops tested and functional (✅ Verified / ❌ Not Verified)
- ☐ All Product Safety Equipment Reinstated (e.g., Swarf Mats)
  - Verification: Foreign body prevention measures in place (✅ Verified / ❌ Not Verified)
- ☐ Area Inspected and Cleared of Debris (e.g., Metal Swarf, Wood Cuttings)
  - Verification: Metal swarf, wood cuttings, etc. removed (✅ Verified / ❌ Not Verified)
- ☐ Verification that No Contamination Risk Exists
  - Overall clearance: Area safe for food production (✅ Verified / ❌ Not Verified)
- ☐ Inspection for Potential Sources of Foreign Bodies (e.g., Loose Fasteners, Small Parts)
  - Verification: Loose fasteners, small parts checked (✅ Verified / ❌ Not Verified)
- ☐ Inspection for Damage or Wear to Production Surfaces (e.g., Sealer Bars, Rollers)
  - Verification: Sealer bars, rollers inspected and acceptable (✅ Verified / ❌ Not Verified)
- ☐ Area Prepared and Ready for Production Resumption
  - Final verification: All systems go for production restart (✅ Verified / ❌ Not Verified)
- Comments (text area for additional hygiene clearance notes)

**Section 10: Post Hygiene Clearance Signature** *REQUIRED BEFORE PRODUCTION RESUME
- Quality Assurance / Supervisor Clearance:
  - Print Name (text input or auto-populated from login)
  - Digital Signature (signature pad or login authentication)
  - Timestamp (auto-generated)
  - ✅ PRODUCTION CLEARED TO RESUME

**Section 11: Job Card Status & Closure**
- Job Card Status (Current Status display):
  - Open / In Progress / Awaiting Clearance / Closed
- Close Out Information:
  - Closed By (auto-populated from Post Hygiene Clearance user)
  - Close Date (auto-timestamp from clearance signature)
- If Temporary Repair = YES:
  - Follow-up Job Card Required By (display calculated 14-day date)
  - Create Follow-up Job Card Button

**Form Actions:**
- Save Draft
- Submit to Maintenance Register
- Cancel
- Print Job Card
- Email to Maintenance Team

**Document Control Footer:**
- Form No: 4.7F2
- Revision: 4
- Date: 13 August 2024

**Data Validation:**
- Cannot submit initial job card until all operator *REQUIRED fields completed
- Cannot close job card until Maintenance Performed section completed
- Cannot close job card until ALL Post Hygiene Clearance items verified as ✅
- Machine status must be explicitly selected (no default)
- Machine Down status triggers immediate priority alert to Maintenance Manager
- Post Hygiene Clearance signature can only be completed by authorized QA/Supervisor role
- Temporary repairs automatically schedule 14-day follow-up notification
- Cannot have any ❌ Not Verified items and still grant hygiene clearance
- All 10 hygiene checklist items must be individually verified

**Workflow States:**
1. Draft - Job card created but not submitted
2. Open - Submitted to Maintenance Register, awaiting assignment
3. Assigned - Assigned to maintenance technician
4. In Progress - Maintenance work underway
5. Awaiting Clearance - Work completed, pending hygiene clearance
6. Closed - Hygiene clearance signed, production can resume

**Temporary Repair Management:**
- Day 10: Automatic reminder email to maintenance manager
- Day 13: Escalation alert if permanent fix not scheduled
- Day 14: Mandatory compliance notification
- Dashboard widget showing all active temporary repairs approaching 14-day limit

#### 4.3 Maintenance Job Card Register

**Requirement:** Maintain centralized register of all maintenance requests with automatic updates and workflow tracking.

**Register Functionality:**
- Auto-populate entry upon form submission
- Generate unique maintenance job card reference number
- Link maintenance request to originating work order
- Timestamp all entries with submission time
- Track status (Pending / Assigned / In Progress / Completed / Verified)
- Assign to maintenance personnel
- Record completion details and time
- Maintain audit trail of all actions

**Reporting Capabilities:**
- Real-time view of pending maintenance requests
- Maintenance history by machine
- Filter by date range, machine, urgency, status
- Maintenance response time analytics
- Export functionality for maintenance planning

---

### 5. Work Order Integration & Automatic Linking

**Requirement:** Establish work order as the central linking mechanism for all operational events.

#### 5.1 Automatic Work Order Generation

**Behavior:**
- When operator initiates production data capture (e.g., waste metrics), system automatically generates or retrieves active work order
- Work order number becomes the primary key for all related activities
- Work order remains active throughout production run until formal closure

#### 5.2 Automatic Issue Linking

**Requirement:** All issues (non-conformances and maintenance requests) must automatically link to the active work order.

**Implementation Logic:**
```
IF operator records non-conformance OR creates maintenance job card
THEN system retrieves currently active work order number
AND automatically associates issue with that work order
AND maintains bidirectional linkage for reporting
```

**Data Relationships:**
- One work order can have multiple non-conformances
- One work order can have multiple maintenance job cards
- Each issue must reference exactly one work order
- Work order closure requires review of all linked issues

#### 5.3 Machine Status Tracking

**Requirement:** Enable operators to declare machine operational status during issue reporting.

**Status Options:**
- **Machine Down:** Production halted, immediate attention required
- **Machine Operational:** Production continuing, issue logged for attention

**Impact:**
- Machine Down status triggers priority escalation
- Machine Down status may trigger automatic downtime tracking
- Operational status allows continued production with logged concern

---

### 6. End-of-Day Submission & Reporting

#### 6.1 Daily Summary Submission

**Requirement:** Operators must submit end-of-day summary that consolidates all activities for their shift.

**Summary Components:**
- Production data captured (waste metrics, quantities, etc.)
- Real-time list of non-conformance advice entries created during shift
- Real-time list of maintenance job cards created during shift
- Work order(s) status
- Operator sign-off and timestamp

**Validation Requirements:**
- All open non-conformances must have status notes
- All maintenance job cards must be acknowledged
- Cannot submit with incomplete entries
- Requires operator authentication/signature

#### 6.2 Automated Register Updates

**Requirement:** Daily submission automatically updates all relevant registers.

**Update Process:**
1. System validates submission completeness
2. Updates Non-Conformance Advice Register with final daily entries
3. Updates Maintenance Job Card Register with final daily entries
4. Updates Work Order tracking with daily summary
5. Generates timestamp and audit trail entry
6. Locks entries from further editing (unless authorized)

#### 6.3 Management Reporting

**Requirement:** Automated distribution of operational reports to management and relevant personnel.

**Report Distribution:**
- **Immediate Recipients:** Operations Manager, relevant Department Supervisors
- **Reporting Format:** Structured daily summary document (PDF/email)
- **Timing:** Automatically generated upon daily submission approval

**Report Contents:**
- Shift summary overview
- All non-conformances logged (with severity and status)
- All maintenance requests logged (with urgency and status)
- Work order completion status
- Machine downtime events
- Operator notes and concerns
- Trend indicators (if applicable)

**Alert Mechanisms:**
- Critical non-conformances trigger immediate notifications
- Machine Down status triggers SMS/email alerts
- High-urgency maintenance requests trigger immediate notifications

---

## Validation & Quality Assurance

### 7.1 Data Integrity Validation

**Requirements:**
- Work order linkage must be validated on every entry
- Duplicate prevention mechanisms for work order generation
- Referential integrity between issues and work orders
- Timestamp accuracy and consistency

### 7.2 User Input Validation

**Requirements:**
- Mandatory field completion enforcement
- Data format validation (dates, numbers, text)
- Machine status explicit declaration requirement
- Permission-based form access control

### 7.3 Workflow Validation

**Requirements:**
- Cannot submit daily summary with incomplete entries
- Cannot close work order with open non-conformances (or requires override authorization)
- Cannot delete entries once submitted (audit trail preservation)
- Status progression follows defined workflow rules

### 7.4 Reporting Validation

**Requirements:**
- Real-time data accuracy in registers
- Report generation completeness
- Notification delivery confirmation
- Historical data preservation and accessibility

---

## Implementation Considerations

### 8.1 Windows Environment Specifications

**Critical Note:** All development, syntax, scripts, and implementations must be Windows-compatible.

**Specific Requirements:**
- File path conventions must use Windows format
- PowerShell scripts (if needed) must use correct Windows syntax
- Database connections must accommodate Windows authentication
- No iOS, macOS, or Linux-specific implementations

### 8.2 User Experience Priorities

**Design Principles:**
- Minimize clicks required for issue reporting
- Auto-populate all available information
- Provide clear visual feedback on submission success
- Maintain production context throughout navigation
- Mobile-responsive design for tablet use on shop floor

### 8.3 BRCGS Compliance Alignment

**Requirement:** All features must support BRCGS Issue 7 compliance requirements for:
- Traceability
- Non-conformance management
- Corrective action tracking
- Audit trail maintenance
- Management review reporting

---

## Success Metrics

### 9.1 System Performance

- Page load times < 2 seconds
- Form submission processing < 3 seconds
- Real-time register updates within 5 seconds
- Report generation < 10 seconds

### 9.2 Operational Efficiency

- Reduction in paper-based reporting time
- Improved response time to maintenance requests
- Reduced data entry errors
- Improved traceability accuracy

### 9.3 User Adoption

- Operator training completion rate
- Daily submission compliance rate
- Issue reporting completeness rate
- System usage consistency

---

## Questions for Clarification

1. ~~**Hard Copy Wireframes:** Can you provide the specific field layouts and validation rules from the existing paper forms for both Non-Conformance Advice and Maintenance Job Cards?~~ 
   **RESOLVED:** Full wireframe specifications created from uploaded forms (see NCA_Wireframe_Specification.md and MJC_Wireframe_Specification.md)

2. **Current System Architecture:** What is the current technology stack (database, frontend framework, backend language) for the existing OHiSee system?

3. **User Permissions:** What are the specific permission levels required for different user roles (operator, supervisor, manager, maintenance)?
   **PARTIAL INFO FROM WIREFRAMES:**
   - Operators: Can create NCAs and MJCs, edit own drafts
   - Team Leaders: Can verify immediate corrections, sign approvals
   - Maintenance Technicians: Can complete maintenance work, sign maintenance performed
   - QA/Supervisors: Can grant hygiene clearance, close job cards
   - Management: Can close NCAs, view all reports
   - Operations Manager: Receives priority alerts for machine down status

4. **Work Order System:** Does the current system already have a work order generation mechanism, or does this need to be created from scratch?

5. **Notification Infrastructure:** What notification systems are currently in place (email server, SMS gateway, internal messaging)?
   **REQUIREMENTS FROM WIREFRAMES:**
   - Machine Down status requires immediate SMS/email alerts
   - Critical/High urgency maintenance requires priority notifications
   - Daily summary requires automated email distribution
   - Temporary repair follow-up requires scheduled reminders (Day 10, 13, 14)

6. **Historical Data:** Is there existing historical data from paper systems that needs to be migrated or integrated?

7. **Integration Points:** Are there any external systems (ERP, maintenance management software) that need integration?
   **POTENTIAL INTEGRATIONS IDENTIFIED:**
   - Supplier database (for NCA supplier name dropdown)
   - Spare parts inventory system (for MJC parts tracking - future enhancement)
   - Preventive maintenance scheduling system (for planned maintenance tracking)

8. **Reporting Frequency:** Beyond daily summaries, are there weekly, monthly, or on-demand reporting requirements?

9. **Digital Signature Implementation:** What method should be used for digital signatures - login authentication capture, stylus/touch signature pad, or both options available?

10. **File Upload Limits:** What are the maximum file sizes and allowable file types for document/photo attachments on both forms?

11. **Offline Capability:** Should the system support offline data capture with later synchronization, or is continuous connectivity guaranteed on the shop floor?

12. **Temporary Repair Tracking:** Should the system prevent work order closure if there are open temporary repairs awaiting permanent fixes?

13. **NCA Close Out Authorization:** What specific roles can authorize NCA close out signatures (QA only, or also Operations Manager/Plant Manager)?

14. **Machine Database:** Is there an existing machine/equipment master database that can populate dropdown lists for machine identification?

---

## Glossary

**Work Order:** A unique identifier for a production run that tracks all activities, issues, and outcomes related to that specific production batch.

**Non-Conformance Advice:** A formal record of any defect, quality issue, or deviation from specifications identified during production.

**Maintenance Job Card:** A formal request for maintenance attention, repair, or preventive maintenance activity on production equipment.

**Active Production Run:** The current work order and production activity being executed by an operator at a given time.

**Register:** A centralized, chronological log of entries (non-conformances or maintenance requests) with full audit trail and reporting capabilities.

**Daily Submission:** The end-of-shift summary that consolidates all production data, issues, and activities for management review.

---

## Document Control

**Version:** 1.0  
**Created:** Wednesday, November 05, 2025  
**Purpose:** Requirements specification for OHiSee system enhancement  
**Audience:** Development team, project stakeholders, system architects  
**Status:** Draft for review and clarification
