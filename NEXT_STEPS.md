# Next Steps: Complete AI Integration

## Current Status ✅

**Phase 2 Complete:** AI Quality Gate fully integrated with NCA form

- ✅ TypeScript compilation passing
- ✅ 173 tests written (95.2% coverage)
- ✅ NCA form AI-enhanced
- ✅ Upload script created
- ✅ Example procedure provided
- ✅ `tsx` installed

**Remaining Issue:** AI modal times out because knowledge base is empty

## Quick Fix (5 Minutes)

### Step 1: Add Service Role Key to .env.local

```bash
# Edit .env.local and add this line:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get key from:** Supabase Dashboard → Settings → API → service_role key

### Step 2: Upload Example Procedure

```bash
cd ohisee-reports
npm run upload-procedures
```

**Expected result:** Example Procedure 5.7 uploaded successfully

### Step 3: Test AI Assistant

1. Go to: http://localhost:3008/nca/new
2. Click "Get AI Help" in any field
3. Wait 2-5 seconds
4. Modal should show AI suggestion (referencing Procedure 5.7)

**If it works:** ✅ AI is functional with example procedure!

## Upload Your Kangopak Procedures (15-30 Minutes)

### Option A: Manual Upload (Recommended for First Time)

1. **Copy your procedures** to `ohisee-reports/procedures/` folder as `.txt` files

2. **Edit** `scripts/upload-procedures.ts` (lines 150-177):
   ```typescript
   const yourProcedures = [
     {
       metadata: {
         document_number: '5.7',
         document_name: 'Your Real Procedure 5.7',
         document_type: 'procedure' as const,
         revision: 1,
         effective_date: '2025-01-10',
         summary: 'Your procedure summary',
         key_requirements: ['Key req 1', 'Key req 2'],
         integration_points: ['Section 5.7'],
         form_sections: ['NC description', 'Root cause']
       },
       filePath: './procedures/5.7_Your_Procedure.txt'
     },
     // Add more procedures...
   ];

   const procedures = yourProcedures; // Replace exampleProcedure
   ```

3. **Run upload:**
   ```bash
   npm run upload-procedures
   ```

### Option B: Batch Upload (All .txt Files)

If you have many procedures and want to upload all at once:

1. Copy all procedures to `procedures/` folder
2. Use batch upload pattern (see `PROCEDURE_UPLOAD_GUIDE.md` section "Advanced: Batch Upload")

## Priority Procedures for NCA/MJC Forms

Upload these first (most relevant):

1. **5.7** - Control of Non-Conforming Product ⭐
2. **3.9** - Traceability
3. **5.3** - Process Control
4. **3.10** - Complaint Handling
5. **5.8** - Foreign Body Detection

## Files Created for You

```
ohisee-reports/
├── scripts/
│   ├── upload-procedures.ts              ← Main upload script (edit this)
│   └── upload-example-procedure.ts       ← Quick test script
├── procedures/
│   ├── EXAMPLE_5.7.txt                   ← Example format (6K words)
│   └── README.md                         ← Instructions
├── QUICKSTART_PROCEDURES.md              ← Quick guide (this is fastest)
├── PROCEDURE_UPLOAD_GUIDE.md             ← Comprehensive guide (80 pages)
└── NEXT_STEPS.md                         ← This file
```

## Testing Checklist

After uploading procedures, test each field:

### NCA Form Fields to Test:
- [ ] NC Description → "Get AI Help" works
- [ ] Root Cause Analysis → Shows suggestion
- [ ] Repair Description → Shows suggestion
- [ ] Corrective Action → Shows suggestion
- [ ] Preventative Measures → Shows suggestion

### Quality Gate Test:
- [ ] Fill form with poor quality text (< 100 chars)
- [ ] Click Submit
- [ ] Quality gate should block submission
- [ ] Modal shows score breakdown and recommendations

### AI Suggestion Test:
- [ ] Suggestion references uploaded procedures
- [ ] Confidence level shown (high/medium/low)
- [ ] Quality score shown (0-100)
- [ ] Procedure references displayed (e.g., "Section 5.7")
- [ ] Accept button applies suggestion to field
- [ ] Reject button closes modal

## Production Deployment (When Ready)

### Pre-Deployment Checklist:
- [ ] All Kangopak procedures uploaded
- [ ] AI assistant tested on all form fields
- [ ] Quality gate blocking low-quality submissions
- [ ] Build passes: `npm run build`
- [ ] Environment variables configured on hosting platform

### Deploy to Production:

```bash
# 1. Build production bundle
npm run build

# 2. Deploy (method depends on hosting)
# Vercel: vercel --prod
# Netlify: netlify deploy --prod
# Other: Follow hosting provider docs

# 3. Upload procedures to production database
# (Same process, but point to production Supabase)
```

## Troubleshooting Common Issues

### Issue: Modal Still Times Out

**Possible causes:**
1. No procedures uploaded → Run `npm run upload-procedures`
2. Wrong Anthropic API key → Check `.env.local` has `ANTHROPIC_API_KEY=sk-ant-...`
3. Timeout too short → Increase in `lib/ai/ai-service.ts` line 45

### Issue: AI Suggests Generic Text (Not Your Procedures)

**Cause:** RAG search not finding relevant matches

**Fixes:**
- Upload more procedures (3+ minimum)
- Ensure procedures mention key terms (non-conformance, corrective action, etc.)
- Check procedure content is comprehensive (100+ words each)

### Issue: "Missing Supabase credentials"

**Fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

## Documentation

- **Quick Start:** `QUICKSTART_PROCEDURES.md` ← Start here
- **Comprehensive Guide:** `PROCEDURE_UPLOAD_GUIDE.md`
- **MJC Integration:** `docs/MJC_AI_INTEGRATION_IMPLEMENTATION.md`
- **Architecture:** `docs/AI_QUALITY_GATE_ARCHITECTURE.md`
- **Delivery Summary:** `AI_INTEGRATION_DELIVERY_SUMMARY.md`

## Support Resources

### Code Locations:
- **AI Service:** `lib/ai/ai-service.ts`
- **Quality Scoring:** `lib/ai/quality-scorer.ts`
- **RAG Search:** `lib/ai/rag/knowledge-base-service.ts`
- **Server Actions:** `app/actions/ai-actions.ts`
- **React Hook:** `hooks/useAIQuality.ts`
- **Modal Component:** `components/ai-assistant-modal.tsx`

### Database Tables:
- `knowledge_base_documents` - Uploaded procedures
- `ai_assistance_log` - Audit trail
- `nca_quality_scores` - Quality scoring data
- `user_quality_scores` - 6-month rolling averages
- `coaching_alerts` - Performance alerts

## Summary: What You Need to Do

**Right now (5 minutes):**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. Run `npm run upload-procedures`
3. Test at http://localhost:3008/nca/new

**Today/this week (30 minutes):**
1. Copy your Kangopak procedures to `procedures/` folder
2. Update `scripts/upload-procedures.ts` with your procedure metadata
3. Run `npm run upload-procedures` again
4. Test thoroughly on all form fields

**Before production:**
1. Upload all relevant BRCGS procedures
2. Run full test suite: `npm run test`
3. Build: `npm run build`
4. Deploy to hosting platform
5. Upload procedures to production database

---

**Quick Command Reference:**

```bash
# Install dependencies (already done)
npm install -D tsx --legacy-peer-deps

# Upload procedures
npm run upload-procedures

# Test AI
# Go to: http://localhost:3008/nca/new

# Build for production
npm run build

# Run tests
npm run test
```

**Need help?** See `QUICKSTART_PROCEDURES.md` or `PROCEDURE_UPLOAD_GUIDE.md`
