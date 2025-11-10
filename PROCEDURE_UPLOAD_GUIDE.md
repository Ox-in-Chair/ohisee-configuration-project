# Kangopak Procedure Upload Guide

## Overview

This guide explains how to upload your Kangopak BRCGS procedures to the AI knowledge base so the AI assistant can provide compliant suggestions.

## Why Upload Procedures?

The AI assistant uses **RAG (Retrieval-Augmented Generation)** to:
- Search your procedures for relevant requirements
- Generate BRCGS-compliant suggestions based on YOUR procedures
- Reference specific procedure sections in suggestions
- Ensure consistency with your documented processes

**Current Issue:** The AI modal times out because the knowledge base is empty.

**Solution:** Upload your Kangopak procedures using the script below.

## Prerequisites

1. **Service Role Key**: You need the Supabase service role key
   - Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
   - Get it from: Supabase Dashboard → Settings → API → service_role key

2. **Procedure Files**: Your Kangopak procedures in text format
   - Supported: `.txt`, `.md`, `.pdf` (converted to text)
   - Location: `./procedures/` folder

3. **tsx Runtime**: For running TypeScript directly
   ```bash
   npm install -D tsx
   ```

## Step 1: Prepare Procedure Files

Create a `procedures/` folder in your project root:

```bash
mkdir procedures
```

Convert your procedures to plain text format. Example structure:

```
procedures/
├── 3.9_Traceability.txt
├── 5.3_Process_Control.txt
├── 5.7_Control_of_Non_Conforming_Product.txt
├── 5.8_Foreign_Body_Detection.txt
└── 6.1_Training_and_Competency.txt
```

**Example Procedure Format** (see `procedures/EXAMPLE_5.7.txt`):

```text
KANGOPAK (PTY) LTD
PROCEDURE 5.7: CONTROL OF NON-CONFORMING PRODUCT
REVISION: 1
EFFECTIVE DATE: 2025-01-10

1. PURPOSE
To establish a system for identification, segregation, investigation, and disposition
of non-conforming product to prevent unintended use or delivery.

2. SCOPE
Applies to all non-conformances detected during production, inspection, or storage.

3. DEFINITIONS
- Non-Conformance (NC): Product that does not meet specifications
- Quarantine: Physical separation of NC product
- Disposition: Decision on how to handle NC product

4. RESPONSIBILITIES
- Production Staff: Report NC immediately
- Team Leaders: Initiate NCR, quarantine product
- QA Manager: Investigate root cause, approve disposition
- Site Manager: Approve concessions or deviations

5. PROCEDURE

5.1 IDENTIFICATION
- Any employee detecting NC must report immediately to Team Leader
- Team Leader creates NCR (Non-Conformance Report) in OHiSee system
- NC product tagged with red "QUARANTINE" label

5.2 QUARANTINE
- NC product moved to designated quarantine area
- Physical barriers prevent accidental use
- Quarantine logged in traceability system

5.3 INVESTIGATION (within 24 hours)
- QA Manager investigates root cause using 5 Whys or Fishbone
- Identify affected batches via traceability (Procedure 3.9)
- Document findings in NCR

5.4 DISPOSITION OPTIONS
- Rework: Reprocess to meet specifications (requires validation)
- Concession: Use as-is with customer approval (requires Site Manager approval)
- Downgrade: Use for alternative purpose (requires QA approval)
- Scrap: Dispose as waste (requires QA approval)

5.5 CORRECTIVE AND PREVENTATIVE ACTIONS (CAPA)
- Immediate correction: Fix the problem
- Corrective action: Prevent recurrence
- Preventative action: Prevent similar issues
- CAPA tracked to completion with effectiveness verification

6. RECORDS
- NCR (OHiSee system) - retained 3 years
- Quarantine logs - retained 3 years
- CAPA records - retained 3 years

7. REFERENCES
- BRCGS Section 5.7: Control of Non-Conforming Product
- Procedure 3.9: Traceability
- Procedure 5.3: Process Control
```

## Step 2: Update Upload Script

Edit `scripts/upload-procedures.ts` and update the `procedures` array with YOUR procedure metadata:

```typescript
const procedures: Array<{ metadata: ProcedureMetadata; filePath: string }> = [
  {
    metadata: {
      document_number: '5.7',
      document_name: 'Control of Non-Conforming Product',
      document_type: 'procedure',
      revision: 1,
      effective_date: '2025-01-10',
      summary: 'Identification, quarantine, investigation, and disposition of non-conforming product',
      key_requirements: [
        'Immediate quarantine of non-conforming product',
        'Root cause investigation within 24 hours',
        'CAPA (Corrective and Preventative Actions)',
        'Management approval for disposition',
        'Traceability to affected batches'
      ],
      integration_points: ['Section 5.7 Non-Conformance', 'Section 3.9 Traceability'],
      form_sections: ['NC description', 'Root cause analysis', 'Corrective actions', 'Preventative measures']
    },
    filePath: './procedures/5.7_Control_of_Non_Conforming_Product.txt'
  },
  // Add more procedures here...
];
```

## Step 3: Add Service Role Key

Create/update `.env.local`:

```bash
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Add this line:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**⚠️ Security Note:** Never commit `.env.local` to git. It's already in `.gitignore`.

## Step 4: Run Upload Script

```bash
# Install tsx if needed
npm install -D tsx

# Run the upload script
npx tsx scripts/upload-procedures.ts
```

**Expected Output:**

```
🚀 Kangopak Procedure Upload Script
=====================================

📤 Uploading: 5.7 - Control of Non-Conforming Product
   ✅ Uploaded successfully (ID: abc123...)

📤 Uploading: 3.9 - Traceability Procedure
   ✅ Uploaded successfully (ID: def456...)

=====================================
📊 Upload Summary:
   ✅ Successful: 2
   ❌ Failed: 0
   📄 Total: 2
=====================================

✨ Procedures uploaded successfully!
   The AI assistant can now provide BRCGS-compliant suggestions.
```

## Step 5: Verify Upload

Check Supabase directly:

```bash
# Query knowledge base
npx supabase db sql "SELECT document_number, document_name, revision, status FROM knowledge_base_documents ORDER BY document_number;"
```

Or via Supabase Dashboard:
1. Go to Table Editor
2. Select `knowledge_base_documents`
3. Verify your procedures are listed with `status = 'current'`

## Step 6: Test AI Assistant

1. Open NCA form: http://localhost:3008/nca/new
2. Click "Get AI Help" in any field
3. Modal should now show AI suggestions (not timeout)

**Expected Behavior:**
- Modal shows spinning indicator
- After 2-5 seconds, AI suggestion appears
- Suggestion references your uploaded procedures
- Quality score shown (0-100)

## Troubleshooting

### Error: "Missing Supabase credentials"

**Fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Error: "File not found: ./procedures/..."

**Fix:**
1. Create `procedures/` folder in project root
2. Place procedure text files in folder
3. Update `filePath` in script to match actual filenames

### Error: "Insert failed: duplicate key value"

**Fix:** Procedure already exists. Script should auto-supersede, but if not:
```sql
-- Manually supersede old version
UPDATE knowledge_base_documents
SET status = 'superseded'
WHERE document_number = '5.7' AND status = 'current';
```

### AI Modal Still Times Out

**Possible Causes:**
1. Procedures uploaded but RAG search not finding matches
   - Check procedure content is comprehensive
   - Ensure key terms match form field context

2. Anthropic API key missing/invalid
   - Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

3. Timeout too short
   - Increase in `lib/ai/ai-service.ts` line 45: `timeout: 5000` (5 seconds)

## Next Steps

After successful upload:

1. **Test All Form Fields**: Try "Get AI Help" in each field
2. **Verify Suggestions**: Ensure suggestions match your procedures
3. **Adjust Timeout**: If still timing out, increase in `ai-service.ts`
4. **Upload More Procedures**: Add all BRCGS sections you use

## Advanced: Batch Upload from Folder

If you have many procedures, use this pattern:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Auto-discover all procedures in folder
const proceduresDir = './procedures';
const files = fs.readdirSync(proceduresDir).filter(f => f.endsWith('.txt'));

const procedures = files.map(file => {
  const docNumber = file.split('_')[0]; // e.g., "5.7" from "5.7_Control.txt"
  return {
    metadata: {
      document_number: docNumber,
      document_name: file.replace('.txt', '').replace(/_/g, ' '),
      document_type: 'procedure' as const,
      revision: 1,
      effective_date: new Date().toISOString().split('T')[0],
      summary: 'Auto-imported procedure',
      key_requirements: [],
      integration_points: [],
      form_sections: []
    },
    filePath: path.join(proceduresDir, file)
  };
});
```

## Support

- **Script Issues**: Check `scripts/upload-procedures.ts`
- **AI Service Issues**: Check `lib/ai/ai-service.ts`
- **Database Issues**: Check Supabase logs in Dashboard
- **RAG Search Issues**: Check `lib/ai/rag/knowledge-base-service.ts`
