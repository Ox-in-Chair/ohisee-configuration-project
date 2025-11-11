To brief you clearly, you want to turn this **Non-Conformance Advice (NCA)** form into a structured, digitized workflow. Here’s how to describe it effectively so they can design the right system:

---

## 1. **Purpose of the Form**

This form is used to **record, track, and resolve product or process non-conformances** under Kangopak’s Product Safety and Quality Management System (PS&QMS).
It ensures that all issues—whether with raw materials, work-in-progress (WIP), or finished goods—are documented, corrected, and verified with traceable actions.

The system must handle both **Non-Conforming Product (NCP)** and **Non-Conforming Process (NCPR)** events, capturing immediate corrections, root causes, and follow-up actions.

---

## 2. **Form Sections & Field Logic**

### A. **Header Section**

Captures context and traceability metadata.

| Field                       | Description                                                                           | Input Type  |
| --------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| Date                        | Date of NCA issue                                                                     | Date picker |
| Supplier Name               | Supplier involved (optional for internal)                                             | Text        |
| Kangopak (Tick box options) | Classify NC type: Raw Material / Finished Goods / Work in Progress / Incident / Other | Checkboxes  |
| NCA Number                  | Auto-generated unique number                                                          | Auto field  |
| Storage/Area                | Optional free text                                                                    | Text        |

---

### B. **NC Product Description**

| Field                        | Description                  | Input Type                      |
| ---------------------------- | ---------------------------- | ------------------------------- |
| Supplier WO / Batch No.      | Batch or lot reference       | Text                            |
| Supplier Reel / Box No.      | Reel or box identifier       | Text                            |
| Sample Available             | Yes/No toggle                | Radio                           |
| Quantity                     | Quantity of affected product | Number                          |
| Kangopak WO Number           | Work Order number            | Text                            |
| Kangopak Carton Numbers      | Internal traceability        | Text                            |
| NCA Raised By                | Employee name or ID          | Dropdown (linked to user table) |
| Description of NC / Incident | Detailed issue description   | Textarea                        |

---

### C. **Team Leader Concession**

For deviations or out-of-spec approvals.
Field: **Team Leader Signature & Date** (digital signature + timestamp).

---

### D. **Immediate Correction / Action Taken**

Completed by Operator or Team Leader as soon as the NC is detected.

| Field                   | Description                                           | Input Type / Logic        |
| ----------------------- | ----------------------------------------------------- | ------------------------- |
| Cross Contamination     | Yes/No. If Yes → trigger immediate back-tracking task | Radio + conditional logic |
| Back Tracking Completed | Yes/No/NA                                             | Radio                     |
| Hold Label Completed    | Yes/No                                                | Radio                     |
| Verification Signatures | Required from Team Leader after each stage            | Signature + timestamp     |

---

### E. **Disposition of Non-Conforming Product**

Defines what happens to the defective material.

| Option                       | Description                  | Logic                        |
| ---------------------------- | ---------------------------- | ---------------------------- |
| Reject back to supplier      | Yes/No                       | Conditional task             |
| Credit required              | Yes/No                       | Optional financial link      |
| Upliftment required          | Yes/No                       | Notify warehouse             |
| Rework / Sorting at Kangopak | Yes/No                       | Creates rework task          |
| Concession                   | Yes/No                       | Escalate to QA Manager       |
| Discard at Kangopak          | Yes/No                       | Triggers waste manifest link |
| Authorised By                | Name + Signature + Timestamp | Signature block              |

---

### F. **Root Cause Analysis**

This section captures the investigation summary or linked documentation reference.

| Field                     | Description                   |
| ------------------------- | ----------------------------- |
| Root Cause                | Text / link to 8D or CAPA doc |
| References / Support Docs | Upload field                  |
| Investigation Details     | Text                          |

---

### G. **Corrective Action Taken**

Documents the action taken to prevent recurrence.
Same structure as Root Cause but focuses on solution implementation.

---

### H. **Closure Section**

Final approval by QA or Ops Manager.

| Field               | Description       |
| ------------------- | ----------------- |
| Close Out Signature | Digital signature |
| Close Out Date      | Date of closure   |

---

## 3. **Automation Requirements**

Your developer should ensure:

1. **Auto-numbering:** NCA number follows an incremental or date-coded pattern.
2. **Conditional logic:** Certain sections only appear based on Yes/No responses (e.g., if “Rework = Yes”, show rework details).
3. **Validation rules:** Mandatory fields include Description, Category, Raised By, and Immediate Action.
4. **Audit trail:** Every signature, edit, or closure must store a timestamp and user ID.
5. **Linkages:** Each NCA ties into:

   * Production log sheet (Work Order link)
   * Supplier database (for external NCs)
   * Waste Manifest (if product discarded)
   * Corrective Action Register (CAPA link)
6. **Role permissions:**

   * Operators: can raise and record NCs
   * Team Leaders: verify and sign off
   * QA/Ops Managers: close and authorise

---

## 4. **Desired Outputs**

* **Dashboard:** List of open, in-progress, and closed NCAs by department/date/status.
* **PDF Export:** Auto-generated, BRCGS-compliant layout for audits.
* **Search & Filter:** By NCA number, supplier, WO, date, or status.
* **Analytics:** Counts by cause, product type, or supplier for management review.

---

Here’s how to clarify this to your developer so they fully understand the classification logic, traceability expectations, and the control mechanisms Kangopak needs to enforce.

---

## 1. **Classification Logic**

The NCA (Non-Conformance Advice) system must automatically classify the non-conformance based on **where and how the issue is detected**, as follows:

### A. **Raw Material NCAs**

* These are **always supplier-based** non-conformances.
* They arise **before production** (e.g., incoming inspection, warehouse receiving).
* Must link to:

  * **Supplier name**
  * **Supplier Work Order (WO) / Batch Number**
  * **Supplier Reel or Box Numbers**
  * **Received weight or quantity**

Each raw material NCA should therefore:

* Be categorised as **“Supplier-Based”**
* Follow a **separate numbering sequence or prefix** (e.g., `SUP-NCA-2025-001`)
* Automatically notify the **Supplier Quality Manager or Procurement**

---

### B. **Work-in-Progress (WIP) and Finished Goods NCAs**

* These may be either **Supplier-Based** (if the fault originates from supplied materials) **or Kangopak-Based** (if caused by internal processes).
* Examples:

  * A laminate delamination = Supplier-Based (material fault)
  * Incorrect sealing or mislabelling = Kangopak-Based (process fault)

Hence the classification options must include:

* **Supplier-Based**
* **Kangopak-Based**
* **Joint Investigation (Shared Fault)**

Each NCA for WIP or Finished Goods must still be **logged separately** from raw material NCAs — they cannot be merged or combined into one form, even if the same batch or material is involved.

---

## 2. **Traceability Requirements**

Every NCA must ensure **complete traceability and reconciliation** of the affected product. The system should enforce mandatory cross-referencing of:

| Traceability Element               | Applies To           | Purpose                                  |
| ---------------------------------- | -------------------- | ---------------------------------------- |
| Supplier Reel / Box Number         | Raw Material         | Identify defective input                 |
| Supplier Work Order / Batch Number | Raw Material         | Source link for supplier accountability  |
| Kangopak Carton Number(s)          | WIP & Finished Goods | Internal tracking and production linkage |
| Weight (kg) or Quantity            | All                  | Must reconcile against NCA total volume  |
| Production Log Sheet Reference     | WIP & Finished Goods | Ensures batch and date correlation       |

The **sum of all affected reels, boxes, or cartons** must reconcile exactly with the **total reported NCA weight or quantity**, even when the material is ultimately scrapped as waste. The system must not allow form submission unless the reconciliation is complete.

---

## 3. **Control and Prevention of Operator Manipulation**

To prevent operators from bypassing or altering records (“taking chances”), the digital system must include strict control measures:

### A. **Permission Layers**

* **Operators:** can only raise NCAs and input factual details (no classification edits after submission).
* **Team Leaders / QA:** verify details and approve corrective actions.
* **Management:** final closure, root cause validation, and system reconciliation.

### B. **Immutable Recordkeeping**

* Once the NCA is raised, **critical traceability fields become locked** (supplier, WO, reel numbers, quantities).
* Any change must trigger an **amendment record**, logged with:

  * Who edited it
  * When it was edited
  * What changed
  * Reason for change

### C. **Automated Cross-Checks**

* System must flag if:

  * Reel numbers do not match stock intake records
  * Carton numbers do not exist in the WIP or finished goods register
  * NCA quantities exceed recorded production outputs
* A reconciliation algorithm or back-end trigger should confirm that total input (raw + WIP + finished + waste) balances against material usage in production.

### D. **Sequential Control**

* NCA number generation must follow a **controlled, sequential, and non-editable format** (e.g., `NCA-RM-2025-032`, `NCA-FG-2025-045`), ensuring gaps or deletions are impossible.

### E. **Audit Trail**

* Every stage (raise, verify, close) must store:

  * Timestamp
  * User ID
  * Role
  * Digital signature (or equivalent authentication)

### F. **Reconciliation Dashboard**

* Management and QA should have a dashboard showing:

  * Open NCAs by category (Raw Material, WIP, Finished Goods)
  * Outstanding reconciliations
  * Supplier-based vs Kangopak-based statistics
  * Total NCA weight vs waste manifest reconciliation status

---

## 4. **System Summary for Developer**

Your developer needs to build:

1. **Separate digital workflows** for Raw Material and WIP/Finished Goods NCAs, each with its own numbering and classification logic.
2. **Mandatory traceability fields** with validation rules enforcing reel, WO, and carton number reconciliation.
3. **Immutable audit logging** of every record change.
4. **Access controls and role-based field permissions** to prevent operator tampering.
5. **Automated reconciliation logic** comparing NCA data to stock and waste records.
6. **Management dashboard** for visibility and compliance tracking.

---

the previous explanation and NCA structure **fully align** with your procedure **5.7 “Control of Non-Conforming Product” (Rev 9)** and already account for its operational intent. To make this build-ready, here’s a **synthesised developer specification** that merges the NCA form, your clarifications, and all 5.7 procedural requirements into one coherent framework your developer can directly implement.

---

# Kangopak NCA System Specification

**Linked Document:** 5.7 – Control of Non-Conforming Product (Rev 9)
**BRCGS Reference:** Issue 7 – Section 5
**Owner:** Warehouse Team Leader
**Status:** Current

---

## 1. Purpose

Digitally manage all non-conformances (raw material, WIP, finished goods) from detection to closure, ensuring product isolation, traceability, corrective action, and trend visibility in line with Procedure 5.7 and BRCGS Issue 7.

---

## 2. Classification Logic

| Category                 | Source                                                            | Description                                                                                       | Default Classification |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| **Raw Material**         | Incoming supplier goods                                           | Non-conforming before production (delivery inspection, incorrect specs)                           | **Supplier-based NCA** |
| **WIP / Finished Goods** | Internal process or post-production                               | May originate from material defect (**Supplier-based**) or process deviation (**Kangopak-based**) | User selectable        |
| **Incident**             | Event creating risk of unsafe, illegal, or non-conforming product | Treated as internal NCA                                                                           | **Kangopak-based**     |

**Rule:** Raw Material NCAs = always Supplier-based.
WIP and Finished Goods NCAs = Supplier-based or Kangopak-based depending on fault origin.
Separate NCAs must be raised for Raw Material and WIP/Finished Goods, even if linked to the same batch.

---

## 3. Traceability Requirements

System must enforce reconciliation and complete traceability through mandatory data fields:

| Field                          | Applies To                    | Validation / Integration                           |
| ------------------------------ | ----------------------------- | -------------------------------------------------- |
| Supplier Name & Code           | Raw Material / Supplier-based | Linked to Supplier Master List                     |
| Supplier WO / Batch No.        | Raw Material                  | Must match GRN entry                               |
| Supplier Reel / Box No.        | Raw Material                  | Auto-verify against receipt log                    |
| Kangopak WO No.                | WIP / Finished Goods          | Linked to Production Log Sheet                     |
| Kangopak Carton No.(s)         | WIP / Finished Goods          | Verify against internal carton register            |
| Quantity / Weight              | All                           | Sum must reconcile to total NCA volume             |
| Hold Sticker ID                | All                           | Auto-generate unique “RED Hold” label code         |
| Segregation Location           | All                           | Dropdown: NC Warehouse Area / Production Hold Zone |
| Verification Signatures        | WIP / Finished Goods          | Digital sign-off by Factory Team Leader            |
| Root Cause / Corrective Action | All                           | Required before closure                            |

The system must **refuse closure** if totals do not reconcile between recorded NC quantities, stock, and waste manifest entries.

---

## 4. Workflow & Permissions

### A. Operator / Packer / Setter

* May **raise** an NCA and attach evidence.
* Cannot classify or edit traceability once submitted.

### B. Factory Team Leader

* Verifies NCA content.
* Conducts **back-tracking** to prevent NC product shipment.
* Provides digital signature = verification checkpoint.

### C. Warehouse Team Leader

* Determines **disposition** (Reject / Rework / Concession).
* Logs NCA on Register.
* Ensures product quarantined or clearly labelled with RED Hold sticker.

### D. QA / Operations Manager

* Validates **root cause** and **corrective action**.
* Authorises closure within 20 working days.
* Oversees dashboard and overdue alerts.

### E. Commercial Manager

* Reviews NCA Register weekly.
* Monitors overdue items and trend analysis (5.7.F2).

---

## 5. Core Functional Logic

| Function                       | Description                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| **Auto-numbering**             | Sequential, date-coded IDs (e.g., RM-2025-001, FG-2025-004).                                  |
| **Conditional Form Logic**     | Fields appear/disappear based on classification (Supplier vs Kangopak).                       |
| **Immutable Audit Trail**      | Every change logs user, timestamp, before/after values, reason.                               |
| **Validation Checks**          | Reel No., WO No., Carton No., and weights must exist in source tables.                        |
| **Time Control**               | Closure deadline = 20 working days from creation; overdue flag after 15.                      |
| **Back-Tracking Verification** | Required digital signature prior to closure; prevents NC shipment.                            |
| **Dashboard View**             | Filter by status (Open/In Progress/Closed), type (Raw/WIP/FG), supplier, root cause category. |
| **Trend Reporting**            | Auto-generate monthly NCA Trend Analysis (5.7.F2 output).                                     |
| **Waste Reconciliation Link**  | Cross-check discarded quantities with Waste Manifest (4.10F1).                                |
| **Document Uploads**           | Support PDF, images for evidence & supplier correspondence.                                   |

---

## 6. Disposition Matrix

| Option                       | Description                        | Action / Trigger           |
| ---------------------------- | ---------------------------------- | -------------------------- |
| Reject to Supplier           | Supplier credit note required      | Email Supplier NCA         |
| Rework / Sorting at Kangopak | Internal task created              | Link to Rework Register    |
| Concession                   | Team Leader + QA approval required | Mark as controlled release |
| Discard at Kangopak          | Waste Manifest entry created       | Auto-populate Form 4.10F1  |

---

## 7. Root Cause & Corrective Action

* **Root Cause:** Mandatory free-text or Ishikawa (Man, Machine, Method, Environment, Material, Measuring).
* **Corrective Action:** Required prior to closure.
* Both stored for trend analysis and CAPA linking.

---

## 8. Security & Integrity Controls

1. **Immutable records** after initial submission; edits create version history.
2. **Role-based access** prevents operator manipulation.
3. **Hold sticker tracking** ensures all NC items labelled and accounted for.
4. **Automated email alerts** for:

   * New NCA raised
   * Back-tracking pending
   * Overdue closure (> 20 days)
5. **Read-only registers** for audit purposes.

---

## 9. System Outputs

* **NCA Register:** master list with search and filter.
* **NCA PDF Export:** mirrors official form layout for audit submission.
* **Trend Reports:** monthly/quarterly pattern charts.
* **Audit Logs:** exportable for BRCGS and internal reviews.

---

## 10. Integration Points

* **Process Control (5.3):** Production Log Sheets & WIP monitoring.
* **Traceability (3.9):** Reel / Carton / Pallet tracking back-links.
* **Supplier Approval (3.4):** Supplier performance metrics.
* **Complaint Handling (3.10):** Customer complaint → NCA generation.
* **Product Recall (3.11):** Auto-flag NC lots if recall triggered.
* **Waste Management (4.10F1):** Link discarded NC product to waste manifest.

---

## 11. Compliance Checklist

| Requirement                | Digital Control                     |
| -------------------------- | ----------------------------------- |
| 20-day close-out rule      | Auto timer + reminder alerts        |
| RED Hold identification    | Label printer / barcode integration |
| Back-tracking verification | Mandatory signature field           |
| Root cause recording       | Non-skippable field                 |
| Trend analysis (5.7.F2)    | Auto-generated monthly              |
| NCA Register review        | Weekly report to Commercial Manager |

---

**Outcome:**
This synthesis ensures the digital NCA workflow directly enforces every clause of Procedure 5.7, maintains BRCGS compliance, and removes manual loopholes through traceability enforcement, reconciliation, audit locks, and time-bound closure.

--

Here is the **updated and Kangopak NCA System Specification**, fully synthesised with Procedure 5.7 and your previous clarifications — but now replacing **QA** with **Production Manager** as the accountable authority throughout the control chain.

---

# Kangopak NCA System Specification

**Linked Document:** 5.7 – Control of Non-Conforming Product (Rev 9)
**BRCGS Reference:** Issue 7 – Section 5
**Owner:** Warehouse Team Leader
**Status:** Current

---

## 1. Purpose

Digitally manage all non-conformances (raw material, WIP, finished goods) from detection to closure, ensuring product isolation, traceability, corrective action, and trend visibility in line with Procedure 5.7 and BRCGS Issue 7.

---

## 2. Classification Logic

| Category                 | Source                                                           | Description                                                                                       | Default Classification |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| **Raw Material**         | Incoming supplier goods                                          | Non-conforming before production (delivery inspection, incorrect specs)                           | **Supplier-based NCA** |
| **WIP / Finished Goods** | Internal process or post-production                              | May originate from material defect (**Supplier-based**) or process deviation (**Kangopak-based**) | User selectable        |
| **Incident**             | Event creating risk of unsafe, illegal or non-conforming product | Treated as internal NCA                                                                           | **Kangopak-based**     |

**Rule:** Raw Material NCAs = always Supplier-based.
WIP and Finished Goods NCAs = Supplier-based or Kangopak-based depending on fault origin.
Separate NCAs must be raised for Raw Material and WIP/Finished Goods, even if linked to the same batch.

---

## 3. Traceability Requirements

Mandatory fields with system validation for complete traceability and reconciliation:

| Field                          | Applies To                    | Validation / Integration                |
| ------------------------------ | ----------------------------- | --------------------------------------- |
| Supplier Name & Code           | Raw Material / Supplier-based | Linked to Supplier Master List          |
| Supplier WO / Batch No.        | Raw Material                  | Must match GRN entry                    |
| Supplier Reel / Box No.        | Raw Material                  | Auto-verify against receipt log         |
| Kangopak WO No.                | WIP / Finished Goods          | Linked to Production Log Sheet          |
| Kangopak Carton No.(s)         | WIP / Finished Goods          | Verify against carton register          |
| Quantity / Weight              | All                           | Must reconcile with total NCA volume    |
| Hold Sticker ID                | All                           | Auto-generate unique “RED Hold” code    |
| Segregation Location           | All                           | Dropdown selection                      |
| Verification Signatures        | WIP / Finished Goods          | Digital sign-off by Factory Team Leader |
| Root Cause / Corrective Action | All                           | Mandatory prior to closure              |

The system must block closure until recorded quantities reconcile with stock and waste data.

---

## 4. Workflow and Permissions

### Operator / Packer / Setter

* May raise NCA and attach evidence.
* Cannot alter traceability once submitted.

### Factory Team Leader

* Verifies NCA content.
* Conducts back-tracking to prevent NC product shipment.
* Provides digital signature verification checkpoint.

### Warehouse Team Leader

* Determines **disposition** (Reject / Rework / Concession).
* Logs NCA on Register.
* Ensures segregation and RED Hold label identification.

### Production Manager *(replaces QA)*

* Validates **root cause** and **corrective action**.
* Authorises NCA closure within 20 working days.
* Oversees system reconciliation and trend review.

### Commercial Manager

* Reviews NCA Register weekly.
* Monitors overdue items and patterns (5.7.F2).

---

## 5. Core Functional Logic

| Function                   | Description                                     |
| -------------------------- | ----------------------------------------------- |
| Auto-numbering             | Sequential ID (e.g., RM-2025-001, FG-2025-004). |
| Conditional Form Logic     | Field visibility based on classification.       |
| Immutable Audit Trail      | Tracks user, timestamp, changes, reason.        |
| Validation Checks          | Confirms Reel No., WO No., Carton No., weights. |
| Time Control               | 20-day closure timer with 15-day alert.         |
| Back-Tracking Verification | Digital signature mandatory before closure.     |
| Dashboard View             | Filter by status, type, supplier, root cause.   |
| Trend Reporting            | Auto-generate monthly NCA Trend Analysis.       |
| Waste Reconciliation       | Cross-check with Waste Manifest (4.10F1).       |
| Document Uploads           | Support PDF/image evidence and correspondence.  |

---

## 6. Disposition Matrix

| Option                       | Description                                        | Action / Trigger           |
| ---------------------------- | -------------------------------------------------- | -------------------------- |
| Reject to Supplier           | Supplier credit note required                      | Email Supplier NCA         |
| Rework / Sorting at Kangopak | Internal task created                              | Link to Rework Register    |
| Concession                   | Team Leader + Production Manager approval required | Mark as controlled release |
| Discard at Kangopak          | Waste Manifest entry created                       | Populate Form 4.10F1       |

---

## 7. Root Cause and Corrective Action

* **Root Cause:** Mandatory free-text or Ishikawa diagram input.
* **Corrective Action:** Recorded and approved by Production Manager prior to closure.
* Both stored for trend and CAPA tracking.

---

## 8. Security and Integrity Controls

1. Immutable records after submission; all edits versioned.
2. Role-based access prevents operator tampering.
3. Hold sticker tracking ensures every NC item is traceable.
4. Automated email alerts for new, pending or overdue NCAs.
5. Audit-ready register with full change history.

---

## 9. System Outputs

* **NCA Register** (master list with search and filters)
* **PDF Export** (mirrors official NCA form)
* **Trend Reports** (monthly/quarterly analysis)
* **Audit Logs** (exportable records)

---

## 10. Integration Points

* Process Control (5.3) – WIP monitoring and production logs
* Traceability (3.9) – reel/carton/pallet tracking
* Supplier Approval (3.4) – supplier NCA linkage
* Complaint Handling (3.10) – customer complaint trigger
* Product Recall (3.11) – lot flagging if recall initiated
* Waste Management (4.10F1) – discard reconciliation

---

## 11. Compliance Checklist

| Requirement                | Digital Control                     |
| -------------------------- | ----------------------------------- |
| 20-day closure rule        | Auto timer + alert                  |
| RED Hold identification    | Label printer / barcode integration |
| Back-tracking verification | Mandatory signature                 |
| Root cause recording       | Non-skippable field                 |
| Trend analysis (5.7.F2)    | Auto-generated monthly              |
| Register review            | Weekly report to Commercial Manager |

---

**Outcome:**
This revised specification embeds the Production Manager as the authority for verification, root cause validation, corrective action approval, and closure. It remains compliant with Procedure 5.7 and BRCGS Issue 7, while enforcing full traceability, reconciliation, and non-editable controls to eliminate operator tampering and ensure reliable, auditable NCA management.


---


Here is the fully synthesised **developer-ready specification**, now incorporating your integration requirement for the full Kangopak procedural ecosystem and the file path you provided. This version consolidates the NCA workflow, the Control of Non-Conforming Product procedure (5.7), the Maintenance Procedure, and all related procedural dependencies, ensuring a single interconnected control framework.

---

# Kangopak NCA System Specification

**Linked Document:** 5.7 – Control of Non-Conforming Product (Rev 9)
**BRCGS Reference:** Issue 7 – Section 5
**Owner:** Warehouse Team Leader
**Status:** Current

---

## 1. Purpose

To digitise and integrate the Non-Conformance Advice (NCA) workflow in alignment with Kangopak’s Procedure 5.7, ensuring all non-conforming products are identified, quarantined, investigated, and closed out within compliance timeframes. The digital system must form part of a unified operational ecosystem, linking directly to Maintenance, Traceability, Supplier, Waste, and Production control records.

---

## 2. Classification Logic

| Category                              | Source                             | Description                                                                                                         | Default Classification |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Raw Material**                      | Supplier input                     | Non-conforming prior to production (delivery, inspection, incorrect specs)                                          | **Supplier-based NCA** |
| **Work in Progress / Finished Goods** | Internal operations                | May originate from supplier material defect (**Supplier-based**) or internal process deviation (**Kangopak-based**) | User selectable        |
| **Incident**                          | Safety, hygiene, or system failure | Treated as internal non-conformance                                                                                 | **Kangopak-based**     |

**Rule:**

* Raw Material NCAs are **always Supplier-based**.
* WIP and Finished Goods NCAs can be **Supplier-based** or **Kangopak-based** depending on fault origin.
* Each classification type requires its **own NCA**, even if referencing the same batch, to ensure separate traceability and disposition tracking.

---

## 3. Traceability Requirements

The system must guarantee closed-loop reconciliation between NCA data, production records, and waste outputs. Mandatory fields and logic include:

| Field                          | Applies To                    | Validation / Integration                           |
| ------------------------------ | ----------------------------- | -------------------------------------------------- |
| Supplier Name & Code           | Raw Material / Supplier-based | Pull from Supplier Master List                     |
| Supplier WO / Batch No.        | Raw Material                  | Match to GRN record                                |
| Supplier Reel / Box No.        | Raw Material                  | Validate against incoming goods log                |
| Kangopak WO No.                | WIP / Finished Goods          | Link to Production Log Sheet                       |
| Kangopak Carton No.(s)         | WIP / Finished Goods          | Cross-check carton register                        |
| Quantity / Weight              | All                           | Must reconcile to total recorded NC volume         |
| Hold Sticker ID                | All                           | Auto-generate unique “RED Hold” label code         |
| Segregation Location           | All                           | Dropdown: NC Warehouse Area / Production Hold Zone |
| Verification Signatures        | WIP / Finished Goods          | Mandatory digital sign-off by Factory Team Leader  |
| Root Cause / Corrective Action | All                           | Mandatory before closure                           |

System must **refuse closure** unless total NCA quantities reconcile with stock, production usage, and waste manifest records.

---

## 4. Workflow and Role Permissions

### Operator / Setter / Packer

* Can raise NCAs and attach supporting evidence.
* Cannot edit traceability fields once submitted.

### Factory Team Leader

* Verifies non-conformance details.
* Ensures back-tracking is complete to prevent NC product shipment.
* Provides digital verification signature.

### Warehouse Team Leader

* Determines **disposition** (Reject / Rework / Concession).
* Logs NCA in Register and ensures proper segregation and red hold identification.

### Production Manager

* Reviews and validates **root cause** and **corrective action**.
* Authorises closure of NCAs within 20 working days.
* Ensures corrective actions are linked to related maintenance or supplier actions when relevant.

### Commercial Manager

* Conducts weekly review of NCA Register and trend data (5.7.F2).
* Tracks overdue NCAs and escalation.

---

## 5. Functional Logic

| Function                   | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| **Auto-numbering**         | Sequential, year-based IDs (e.g., RM-2025-001).                      |
| **Conditional Form Logic** | Displays relevant fields based on classification.                    |
| **Immutable Audit Trail**  | Logs all changes, timestamps, user IDs, and reasons.                 |
| **Validation Triggers**    | Prevents submission unless traceability data matches existing stock. |
| **Closure Timer**          | 20-day auto countdown with alert at day 15.                          |
| **Dashboard View**         | Filter NCAs by category, status, origin, or supplier.                |
| **Trend Reporting**        | Auto-generate NCA trend charts from Register (5.7.F2).               |
| **Reconciliation Logic**   | Confirms NCA quantities match production and waste manifests.        |
| **Document Uploads**       | Attach supplier emails, images, or inspection photos.                |

---

## 6. Disposition Matrix

| Option                       | Description                                       | Action / Trigger             |
| ---------------------------- | ------------------------------------------------- | ---------------------------- |
| Reject to Supplier           | Material to be credited or returned               | Auto-notify supplier         |
| Rework / Sorting at Kangopak | Requires follow-up task                           | Creates linked rework record |
| Concession                   | Controlled release approved by Production Manager | Mark as “Concession Granted” |
| Discard at Kangopak          | Waste Manifest (4.10F1) entry required            | Auto-push to waste log       |

---

## 7. Root Cause and Corrective Action

* **Root Cause:** Must be documented immediately, using free-text or Ishikawa categories (Man, Machine, Method, Environment, Material, Measuring).
* **Corrective Action:** Must be recorded, verified by Production Manager, and linked to maintenance or process improvement tasks.
* **System Function:** When corrective actions reference equipment or tooling issues, system must cross-reference the **Maintenance Procedure** module to ensure corresponding job card creation.

---

## 8. Integration Requirements

### Developer Instruction

The developer **must review and reference all related Kangopak controlled documents** in the following directory to ensure complete procedural integration and identify where submodules or data bridges must be implemented:

**Path:**
`C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\docs\kangopak-procedures`

**Scope of review includes (but is not limited to):**

* **Operational Procedures:** 5.3 Process Control, 3.9 Traceability, 3.4 Supplier Approval, 3.10 Complaint Handling, 3.11 Product Recall, 4.10 Waste Management, and the **Maintenance Procedure**.
* **Form Templates:** All NCA forms, waste manifests (4.10F1), trend reports (5.7.F2), back-tracking logs, and concession approvals.
* **Work Instructions:** Factory and warehouse handling, segregation, and back-tracking instructions.
* **Records:** NCA Register, Maintenance Logs, Production Logs, CAPA registers.
* **Training Modules:** Staff competency and awareness modules for non-conformance handling and segregation.

The system architecture must **connect these procedures and records seamlessly**, allowing each module to speak to the others — e.g.:

* NCA links automatically to Maintenance when mechanical fault indicated.
* NCA closure cannot occur without Waste Manifest reconciliation if discard selected.
* Production Logs reflect WIP NCAs in real time.
* Supplier NCAs feed Supplier Performance metrics.

All data relationships must be **two-way** (traceable forward and backward), enabling auditors to navigate from one document to its linked NCAs, CAPAs, or maintenance events without manual cross-referencing.

---

## 9. Security and Integrity Controls

* Immutable record structure post-submission.
* Role-based permissions preventing operator manipulation.
* Automatic timestamps and digital signatures for every verification stage.
* Version history and audit trail retained permanently.
* Alert and escalation notifications for overdue NCAs and pending back-tracking verifications.

---

## 10. System Outputs

* **NCA Register Dashboard** with drill-down filters.
* **PDF Exports** for audit-ready copies.
* **Automated NCA Trend Reports (5.7.F2)**.
* **Linked Maintenance and Waste Reports**.
* **Full Audit Log** for BRCGS and internal use.

---

## 11. Compliance and Validation Checklist

| Requirement                | Digital Control                         |
| -------------------------- | --------------------------------------- |
| 20-day closure             | Automated timer and escalation          |
| RED Hold identification    | Label printer integration               |
| Back-tracking verification | Mandatory digital signature             |
| Root cause analysis        | Non-skippable input                     |
| Corrective action closure  | Must be Production Manager verified     |
| Waste reconciliation       | Mandatory cross-check to 4.10F1         |
| Weekly review              | Auto-report to Commercial Manager       |
| Maintenance cross-link     | Required when mechanical cause selected |
| Trend analysis (5.7.F2)    | Auto-generated                          |

---

**Outcome:**
This specification ensures the NCA digital system enforces all controls described in Kangopak’s Procedure 5.7 while being fully integrated with linked operational procedures, maintenance, and traceability frameworks. The developer is responsible for reviewing every document and form in the specified local directory to determine where **shared data schemas, workflow dependencies, or new submodules** must be created so that all Kangopak systems “speak to each other” and maintain total compliance integrity across production, warehouse, supplier, and maintenance domains.

---

this system is for a **live production facility** where the **procedures must remain individually controlled and auditable**, but still **interconnected at a system level** so that no workflow operates in isolation.

The NCA process is just one module within a broader **manufacturing control ecosystem**. Each procedure (e.g., Non-Conformance, Maintenance, Waste, Traceability, Supplier Control) must remain **distinct** for compliance and audit purposes, yet **interlinked through data relationships and cross-referencing logic**. The goal is to preserve procedural independence for BRCGS verification, while achieving operational integration for efficiency and traceability.

Here’s integrated section to include in specification:

---

## 12. System Integration and Procedural Separation Logic

This platform is being developed for a **live production facility**, where every procedure is a controlled document under the Kangopak Product Safety and Quality Management System (PS&QMS). The developer must design the system with **dual principles**:

1. **Procedural Separation** – Each controlled procedure remains an independent, auditable module.
2. **Operational Integration** – All modules share data relationships, ensuring information consistency and cross-visibility.

### A. Procedural Separation (Control Integrity)

* Each operational procedure (e.g., 5.7 Control of Non-Conforming Product, Maintenance Procedure, 4.10 Waste Management, 3.9 Traceability) must retain its **own workflow, records, and version control**.
* The digital system must reflect the current revision of each procedure and **lock it to that revision** for traceability.
* Any procedural update (e.g., Rev 9 to Rev 10) must be recorded and version-linked to new form templates and logic changes.
* Separate access permissions, audit trails, and closure authorities must be maintained per procedure to satisfy BRCGS audit requirements.

### B. Operational Integration (System Cohesion)

Although distinct, all procedures must **speak to each other** through structured data links and conditional triggers. Integration examples:

| Procedure                                 | Integration Behaviour                                                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5.7 Control of Non-Conforming Product** | Central node linking to Waste, Maintenance, and Supplier modules. NCAs trigger follow-up actions in linked modules.                                      |
| **Maintenance Procedure**                 | When a root cause relates to equipment, the NCA must automatically raise a maintenance job card and link both records. Closure of one updates the other. |
| **4.10 Waste Management**                 | If disposition = “Discard”, system must generate or link a Waste Manifest (Form 4.10F1).                                                                 |
| **3.9 Traceability**                      | NCA data (reel, WO, carton numbers) must feed the traceability database for forward/backward tracking.                                                   |
| **3.4 Supplier Approval**                 | Supplier NCAs update the supplier’s performance record and trigger review thresholds.                                                                    |
| **3.10 Complaint Handling**               | Customer complaints that result in NCAs must carry the complaint reference ID through to NCA records.                                                    |
| **3.11 Product Recall**                   | Any product under an NCA must be flagged in the recall registry if escalation occurs.                                                                    |

### C. Developer Implementation Requirements

* Review all controlled documents, forms, work instructions, records, and training materials in:
  `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\docs\kangopak-procedures`
* Identify shared data entities (e.g., WO Number, Reel Number, Supplier ID, Product Code) that can serve as **universal keys** between modules.
* Design a **modular relational structure** that preserves each procedure’s autonomy but allows data flow between modules without duplication.
* Implement a **change control linkage**: when a procedure or form template updates, dependent modules must flag for validation before the system accepts new data.
* Map each integration point explicitly (e.g., NCA → Maintenance Job Card, NCA → Waste Manifest, NCA → Supplier Register) and maintain **referential integrity** between them.

### D. Audit and Compliance

* Each module’s data must remain **traceable to its governing procedure and revision**.
* The audit trail must show when and how a record from one procedure (e.g., a Maintenance Job Card) was referenced or triggered by another (e.g., an NCA).
* During audits, management should be able to open any NCA record and immediately navigate to its related Waste, Maintenance, and Traceability records.
* No manual duplication or disconnected records are acceptable; the integration must function automatically.

---

### Summary

The developer must build a **modular but interlinked system** that mirrors the separation of BRCGS-controlled procedures while uniting them under a single digital architecture. The result must respect compliance boundaries but enable full operational connectivity — ensuring every event, whether a non-conformance, maintenance issue, or waste action, is recorded once, referenced everywhere, and auditable from any direction.

---

Would you like me to extend this into a **technical integration diagram** (showing each module, shared data entities, and triggers between them) so your developer can visualise the architecture before building?


---

The following is the **production-ready specification update** that captures every requirement you’ve outlined — namely: preservation of all existing work, inclusion of all enhancements already completed, addition of form numbering, integration of BRCGS references, and the requirement that every record and view must remain printable and auditable.

This version locks in the current foundation as a **validation and integration check**, not a redevelopment brief. It clearly instructs you that no structural or procedural regression is permitted.

---

# Kangopak NCA System Specification (Final Integration Preservation Brief)

**Linked Document:** 5.7 – Control of Non-Conforming Product (Rev 9)
**BRCGS Reference:** Issue 7 – Section 5
**Owner:** Warehouse Team Leader
**Status:** Current
**Objective:** Preserve all completed development, validate procedural alignment, and ensure full integration across controlled documentation while maintaining auditability and print readiness.

---

## 1. Preservation Directive

This document serves as a **validation and integration check**, **not a redesign**.
All current modules, enhancements, field logic, database structures, and automation already completed must be preserved exactly as they are.
The developer’s role is to verify that:

1. All existing functions align with Kangopak’s operational procedures and controlled documents.
2. Enhancements already implemented remain untouched.
3. New integrations simply extend connectivity — they must not overwrite or re-engineer what has been built.

Every record, form, and output must remain fully compatible with the current version of the system and continue to pass audit scrutiny.

---

## 2. Procedural Context and Integration

The NCA module operates within a live production facility under the Kangopak Product Safety and Quality Management System (PS & QMS).
While each procedure is an independently controlled and auditable document, the system must integrate them through secure data links and shared identifiers.

**Path for all controlled references:**
`C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\docs\kangopak-procedures`

The developer must **review but not modify** the contents of this directory.
This includes:

* All operational procedures (e.g., 5.7 Control of Non-Conforming Product, 4.10 Waste Management, 3.9 Traceability, 3.4 Supplier Approval, 3.10 Complaint Handling, 3.11 Product Recall, and Maintenance).
* All form templates and work instructions.
* All existing records and training documents.

The purpose is to confirm correct integration and identify any procedural reference points missing from current database mappings or dashboards.

---

## 3. Procedural Separation and Integration Rules

1. **Separation:** Each procedure remains its own controlled module with unique revision, owner, and workflow.
2. **Integration:** Shared data elements (Work Order No., Reel No., Supplier Code, Carton No., Form No.) must act as relational keys linking all procedures together.
3. **Change Control:** When any controlled document is updated (e.g., Rev 9 → Rev 10), the system must preserve historical data under the original revision while allowing new entries to use the new reference.
4. **Cross-Referencing:** Any record that cites another procedure must automatically display its **document number, form number, and revision**.

---

## 4. Form and BRCGS Referencing Requirements

* Every form generated, displayed, or exported by the system must clearly show:

  * **Form Number** (e.g., 5.7F1 – Non-Conformance Advice Form)
  * **Document Reference** (e.g., Procedure 5.7 Rev 9)
  * **BRCGS Clause Reference** (e.g., BRCGS Issue 7 Section 5)
  * **Controlled Status and Revision Date**
* Whenever a user selects or populates a form, the system must automatically embed these identifiers at the header and footer of the digital and printed version.
* Any text extracted from or referencing a BRCGS procedure or controlled template must be tagged with its originating document number for traceability.

---

## 5. Print and Record Integrity

* Every form, register, dashboard view, and record must remain **printable in A4 layout** and exportable as a **PDF**.
* Printed outputs must replicate the controlled form layout, including logos, document numbers, revision, and approval fields.
* System printouts are considered **controlled records** under the PS & QMS and must retain the same layout and numbering as their physical counterparts.
* No field or comment may be truncated or omitted in printed view.
* Print and digital copies must remain identical in content and timestamp.

---

## 6. Integration Verification (No Structural Change)

The developer must:

1. Verify all existing links between NCA, Maintenance, Waste, Traceability, and Supplier modules.
2. Confirm that data hand-offs (e.g., NCA → Maintenance Job Card, NCA → Waste Manifest) are functioning and bidirectional.
3. Ensure all enhancements already implemented are preserved and that any new mapping layers simply bridge existing data models.
4. Validate that each integration event correctly references the controlled source (procedure number, form number, revision).
5. Confirm that every printed or exported document carries its own procedural and form references for audit traceability.

---

## 7. Compliance Validation

| Control Element          | Verification Requirement                                    |
| ------------------------ | ----------------------------------------------------------- |
| Procedural revision lock | Each record tied to its procedure version                   |
| Form number display      | Must appear in form header/footer                           |
| BRCGS reference          | Displayed on every report and form                          |
| Print parity             | Printed form identical to on-screen record                  |
| Integration links        | Verified for all inter-procedure data flows                 |
| Enhancement retention    | No overwriting or downgrading of existing logic             |
| Audit readiness          | All outputs retain timestamps, authorship, and control data |

---

## 8. Developer Deliverable

Deliver a **validation report** confirming:

* No regressions introduced.
* All integrations operate correctly.
* All BRCGS and form references appear on screen and in print.
* All existing features and improvements remain intact.
* All records remain printable and audit-ready.

---

**Summary:**
This phase is a **preservation and verification exercise**. The current NCA and related systems already represent substantial progress. Nothing is to be undone or rebuilt. The developer’s task is to confirm total procedural linkage, ensure all form and BRCGS references are visible and printable, and strengthen cross-module connectivity so that every controlled document within the production facility is both self-contained and part of a fully integrated, auditable whole.

---

Here is the **Developer Validation Checklist**, appended to the final specification.
It is concise but comprehensive — designed to be used during review to confirm compliance, preservation, and integration integrity across all modules and procedures within the Kangopak production environment.

---

## Developer Validation Checklist

**Project:** OHiSee Control of Non-Conforming Products
**Location:** `C:\Users\mike\projects\OHiSee_Control_of_Non-Conforming_Products\ohisee-reports\docs\kangopak-procedures`
**Objective:** Verify integration, traceability, and print readiness without altering existing logic or enhancements.

| #      | Validation Category               | Validation Requirement                                                                                                                    | Verification Method                      | Status |
| ------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------ |
| **1**  | **Preservation**                  | Confirm no previously implemented functionality, layout, or automation logic has been removed or altered.                                 | Code diff and system behaviour check     | ☐      |
| **2**  | **Enhancement Retention**         | Verify all enhancements and additional fields already developed remain active and stable.                                                 | Compare against enhancement changelog    | ☐      |
| **3**  | **Form Numbering**                | Ensure all forms display their correct form number (e.g., 5.7F1, 4.10F1, etc.) in the header/footer of both digital and printed versions. | UI and PDF export check                  | ☐      |
| **4**  | **BRCGS References**              | Confirm all forms, reports, and procedures display their linked BRCGS section reference and revision number.                              | Form metadata review                     | ☐      |
| **5**  | **Procedural Integration**        | Confirm cross-links between NCA, Maintenance, Waste, Traceability, and Supplier Approval procedures are intact and bidirectional.         | System navigation and linked record test | ☐      |
| **6**  | **Procedural Separation**         | Each module retains independent version control, access levels, and workflow boundaries.                                                  | Review database schema and permissions   | ☐      |
| **7**  | **Form and Template Review**      | Review all controlled documents and templates in the specified path for integration compatibility.                                        | Directory audit                          | ☐      |
| **8**  | **Print Readiness**               | All forms, reports, and dashboards must print in controlled A4 layout identical to on-screen view.                                        | Print test and PDF comparison            | ☐      |
| **9**  | **Revision Locking**              | Verify that all records are tied to the correct procedure revision and locked upon submission.                                            | Record metadata validation               | ☐      |
| **10** | **Change Control**                | Confirm new versions of procedures trigger validation flags without deleting or overwriting historical data.                              | Version simulation test                  | ☐      |
| **11** | **Cross-Referencing Accuracy**    | Any text, label, or template reference to a BRCGS procedure or controlled document includes its document number.                          | Field inspection                         | ☐      |
| **12** | **Waste and Maintenance Linkage** | Check that NCA “Discard” triggers Waste Manifest (4.10F1) and “Mechanical Root Cause” triggers Maintenance Job Card creation.             | Functional workflow test                 | ☐      |
| **13** | **Audit Trail Integrity**         | Confirm all edits, approvals, and closures generate time-stamped, immutable logs.                                                         | Log review                               | ☐      |
| **14** | **Trend and Register Reporting**  | Verify that automated NCA Trend Analysis (5.7.F2) and NCA Register reports display accurate live data.                                    | Dashboard export check                   | ☐      |
| **15** | **User Permissions**              | Ensure operators, team leaders, production managers, and commercial managers have distinct access rights consistent with procedure roles. | Permission test matrix                   | ☐      |
| **16** | **Print Control Data**            | Confirm every printed form includes form number, document reference, revision, and BRCGS clause for compliance traceability.              | PDF and printout validation              | ☐      |
| **17** | **Validation Summary Output**     | Provide a signed validation summary confirming all items above have passed.                                                               | Validation report document               | ☐      |

---

**Completion Deliverable:**
A signed and dated validation report confirming:

* All functionality is preserved.
* No regressions introduced.
* All procedural integrations verified.
* All forms and outputs include correct numbering, BRCGS references, and are printable.
* System remains fully compliant with Kangopak’s PS & QMS requirements and BRCGS Issue 7.

---


