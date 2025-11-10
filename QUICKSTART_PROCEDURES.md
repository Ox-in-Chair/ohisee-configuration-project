# Quick Start: Upload Procedures & Fix AI Timeout

## Problem

The AI modal shows a spinning indicator then disappears because:
- Knowledge base is empty (no procedures uploaded)
- RAG search fails (nothing to search)
- AI service times out (2000ms)

## Solution (2 Steps)

### Step 1: Add Service Role Key

Edit `.env.local` and add:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get the key from:**
Supabase Dashboard → Settings → API → service_role key (secret, not anon key)

### Step 2: Install tsx and Upload Example Procedure

```bash
# Install tsx (TypeScript runner)
cd ohisee-reports
npm install -D tsx

# Upload the example procedure
npm run upload-procedures
```

**Expected Output:**

```
🚀 Kangopak Procedure Upload Script
=====================================

📤 Uploading: 5.7 - Control of Non-Conforming Product
   ✅ Uploaded successfully (ID: abc123...)

=====================================
📊 Upload Summary:
   ✅ Successful: 1
   ❌ Failed: 0
   📄 Total: 1
=====================================

✨ Procedures uploaded successfully!
```

## Test It Works

1. **Open NCA form:** http://localhost:3008/nca/new
2. **Click "Get AI Help"** in the "NC Description" field
3. **Wait 2-5 seconds** (not instant)
4. **Modal should show AI suggestion** (not disappear)

The suggestion should reference **Procedure 5.7** in its text.

## What We Uploaded

**File:** `procedures/EXAMPLE_5.7.txt`
**Procedure:** 5.7 - Control of Non-Conforming Product (Full BRCGS procedure)
**Size:** ~6,000 words covering:
- Purpose, scope, responsibilities
- Quarantine procedures
- Root cause investigation (5 Whys, Fishbone)
- Disposition options (rework, concession, downgrade, scrap)
- CAPA (Corrective and Preventative Actions)
- BRCGS compliance requirements

## Next Steps: Add Your Real Procedures

### Option A: Replace Example with Your Procedures

1. **Copy your Kangopak procedures** to `procedures/` folder as `.txt` files:
   ```
   procedures/
   ├── 3.9_Traceability.txt
   ├── 5.3_Process_Control.txt
   ├── 5.7_Your_Real_Procedure.txt
   └── ... more procedures
   ```

2. **Update** `scripts/upload-procedures.ts` (around line 150):
   ```typescript
   const yourProcedures = [
     {
       metadata: {
         document_number: '3.9',
         document_name: 'Traceability Procedure',
         document_type: 'procedure' as const,
         revision: 1,
         effective_date: '2025-01-10',
         summary: 'Your procedure summary',
         key_requirements: ['Requirement 1', 'Requirement 2'],
         integration_points: ['Section 3.9'],
         form_sections: ['Batch tracking']
       },
       filePath: './procedures/3.9_Traceability.txt'
     },
     // Add more...
   ];

   const procedures = yourProcedures; // Replace exampleProcedure
   ```

3. **Run upload again:**
   ```bash
   npm run upload-procedures
   ```

### Option B: Quick Batch Upload (All .txt Files)

If you have many procedures and don't want to manually configure each one:

```typescript
// Add to upload-procedures.ts after imports:
import * as glob from 'glob';

// Replace the procedures array with:
const procedureFiles = glob.sync('./procedures/*.txt');
const procedures = procedureFiles.map(filePath => {
  const fileName = path.basename(filePath, '.txt');
  const docNumber = fileName.split('_')[0]; // e.g., "5.7"

  return {
    metadata: {
      document_number: docNumber,
      document_name: fileName.replace(/_/g, ' '),
      document_type: 'procedure' as const,
      revision: 1,
      effective_date: new Date().toISOString().split('T')[0],
      summary: `Procedure ${docNumber}`,
      key_requirements: [],
      integration_points: [`Section ${docNumber}`],
      form_sections: []
    },
    filePath
  };
});
```

## Troubleshooting

### Error: "Missing Supabase credentials"

**Fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Error: "Cannot find module 'tsx'"

**Fix:**
```bash
npm install -D tsx
```

### Modal Still Times Out

**Possible causes:**

1. **No procedures uploaded** → Run `npm run upload-procedures` again
2. **Wrong API key** → Check Anthropic API key in `.env.local` (`ANTHROPIC_API_KEY=sk-ant-...`)
3. **Timeout too short** → Edit `lib/ai/ai-service.ts` line 45:
   ```typescript
   timeout: 5000, // Increase from 2000 to 5000 (5 seconds)
   ```

### AI Suggests Generic Text (Not Your Procedures)

**Cause:** RAG search not finding matches

**Fixes:**
- Check procedure content is comprehensive (100+ words)
- Ensure procedure mentions key terms like "non-conformance", "root cause", "corrective action"
- Upload more procedures (AI needs multiple sources)

## How It Works

1. **User clicks "Get AI Help"**
2. **RAG Search:** System searches `knowledge_base_documents` table using pgvector similarity
3. **Top 3 procedures** retrieved (e.g., Procedure 5.7)
4. **AI generates suggestion** using retrieved procedures as context
5. **Modal shows suggestion** with procedure references

## Files Created

```
ohisee-reports/
├── scripts/
│   ├── upload-procedures.ts           ← Main upload script
│   └── upload-example-procedure.ts    ← Quick test upload
├── procedures/
│   ├── EXAMPLE_5.7.txt                ← Example procedure (6K words)
│   └── README.md                      ← Procedure folder guide
├── PROCEDURE_UPLOAD_GUIDE.md          ← Detailed guide (80+ pages)
└── QUICKSTART_PROCEDURES.md           ← This file
```

## Support

- **Detailed Guide:** See `PROCEDURE_UPLOAD_GUIDE.md` (comprehensive 80-page guide)
- **Procedure Format:** See `procedures/EXAMPLE_5.7.txt`
- **Script Issues:** Check `scripts/upload-procedures.ts`

---

**Ready?** Run these two commands:

```bash
# 1. Install tsx
npm install -D tsx

# 2. Upload example procedure
npm run upload-procedures
```

Then test: http://localhost:3008/nca/new → Click "Get AI Help"
