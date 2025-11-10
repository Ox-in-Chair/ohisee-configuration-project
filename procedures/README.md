# Kangopak Procedures Folder

## Purpose

This folder contains Kangopak BRCGS procedures in text format for upload to the AI knowledge base.

## Instructions

1. **Place your procedure files here** in `.txt` format
2. **Name files clearly**: `[Section]_[Name].txt`
   - Example: `5.7_Control_of_Non_Conforming_Product.txt`
3. **Use the example format**: See `EXAMPLE_5.7.txt`

## Example File Provided

**`EXAMPLE_5.7.txt`** - Complete Procedure 5.7 (Control of Non-Conforming Product)

This is a fully-detailed example showing the format and content structure expected.

## File Format

Each procedure file should contain:

```text
KANGOPAK (PTY) LTD
PROCEDURE [NUMBER]: [TITLE]
REVISION: [X]
EFFECTIVE DATE: [YYYY-MM-DD]
BRCGS SECTION: [X.X]

1. PURPOSE
[Why this procedure exists]

2. SCOPE
[What it covers]

3. DEFINITIONS
[Key terms]

4. RESPONSIBILITIES
[Who does what]

5. PROCEDURE
[Detailed steps]

6. RECORDS
[What to keep, how long]

7. REFERENCES
[Related procedures, BRCGS sections]
```

## Priority Procedures for AI Assistant

These procedures are most relevant for NCA/MJC forms:

### **High Priority:**
1. **5.7** - Control of Non-Conforming Product ⭐ (Most important for NCAs)
2. **3.9** - Traceability (for batch identification)
3. **5.3** - Process Control (for production-related NCs)
4. **3.10** - Complaint Handling (for customer complaints)
5. **5.8** - Foreign Body Detection (for contamination NCs)

### **Medium Priority:**
6. **6.1** - Training and Competency (for human error root causes)
7. **4.7** - Maintenance (for equipment failure NCs)
8. **4.9** - Cleaning and Hygiene (for contamination issues)
9. **5.6** - Calibration (for measurement-related NCs)
10. **3.3** - Internal Audits (for systemic issues)

### **Lower Priority (but still useful):**
11. **1.1** - Senior Management Commitment
12. **3.4** - Supplier Management (for raw material NCs)
13. **4.11** - Pest Control
14. **5.1** - Product Design
15. **5.2** - Labeling and Artwork

## Next Steps

1. **Copy your Kangopak procedures** into this folder as `.txt` files
2. **Update the upload script** (`../scripts/upload-procedures.ts`) with your procedure metadata
3. **Run the upload**: `npx tsx scripts/upload-procedures.ts`

## Testing Your Procedures

After upload, test the AI assistant:

1. Go to NCA form: http://localhost:3008/nca/new
2. Click "Get AI Help" in the "NC Description" field
3. The AI should reference your uploaded procedures in the suggestion

## Need Help?

See: `../PROCEDURE_UPLOAD_GUIDE.md`
