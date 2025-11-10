# NCA Workflow Integration Tests - Quick Start

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (if not already done)
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local and add your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role key, not anon key)
```

**Get credentials from**: Supabase Dashboard → Settings → API

### Step 3: Run Database Migrations
```bash
supabase db reset
```

This creates:
- 6 test users (all roles)
- 3 machines
- 3 work orders
- All tables and constraints

### Step 4: Validate Setup
```bash
npx ts-node tests/integration/setup-validation.ts
```

Expected output:
```
✅ NEXT_PUBLIC_SUPABASE_URL: https://...
✅ SUPABASE_SERVICE_ROLE_KEY: [HIDDEN]
✅ Successfully connected to Supabase
✅ Found 6 users with all required roles
✅ Found 1 active work order(s)
✅ Found 3 machine(s)
✅ NCA number generated correctly: NCA-2025-00000001
🎉 Test environment validation completed successfully!
```

### Step 5: Run Tests
```bash
npm run test:integration
```

---

## 📊 Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:integration` | Run all integration tests |
| `npm run test:watch` | Run in watch mode (re-runs on file changes) |
| `npm run test:coverage` | Generate coverage report |
| `npx jest -t "cross-contamination"` | Run specific test by name |
| `npx jest --verbose` | Show detailed test output |

---

## ✅ What Gets Tested

### 23 Total Tests

1. **NCA Creation** (3 tests)
   - Auto-generated NCA numbers
   - Description length validation
   - Machine down timestamp requirement

2. **Submission Workflow** (3 tests)
   - Status transitions
   - Automatic timestamps
   - Audit trail entries

3. **Cross-Contamination (CRITICAL)** (6 tests)
   - Back tracking person required
   - Back tracking signature required
   - Back tracking completion required
   - Complete validation pass

4. **Disposition Decisions** (3 tests)
   - Rework instruction requirement
   - Reject without instruction
   - Authorization signature

5. **Close-Out Workflow** (5 tests)
   - QA signature required
   - Close-out date required
   - Automatic closed_at timestamp

6. **Audit Trail** (2 tests)
   - Creation logging
   - Change field tracking

7. **Complete Workflow** (1 test)
   - Draft → Submit → Review → Close

---

## 🔍 Troubleshooting

### Error: "Missing environment variables"
**Solution**: Add credentials to `.env.local`

### Error: "Failed to fetch test users"
**Solution**: Run `supabase db reset` to seed data

### Error: "Connection refused"
**Solution**: Check Supabase URL is correct and project is active

### Tests timing out
**Solution**: Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000 // 60 seconds
```

---

## 📖 Test Files

| File | Purpose |
|------|---------|
| `nca-workflow.test.ts` | Main test suite (23 tests) |
| `setup-validation.ts` | Environment validation script |
| `README.md` | Detailed documentation |
| `TEST_SUMMARY.md` | Complete test breakdown |
| `QUICK_START.md` | This file |

---

## 🎯 BRCGS Critical Controls Tested

- ✅ Cross-contamination back tracking (mandatory)
- ✅ Disposition authorization (team leader)
- ✅ Close-out signature (QA/Manager)
- ✅ Audit trail (immutable logging)
- ✅ NCA numbering (traceability)

---

## 📈 Expected Test Output

```
Test Suites: 1 passed, 1 total
Tests:       23 passed, 23 total
Time:        8.452s
```

All tests should **PASS** if:
- Environment configured correctly
- Database migrations applied
- Seed data loaded

---

## 🚨 Important Notes

1. **Use Service Role Key**: Tests bypass RLS to validate constraints directly
2. **Test Isolation**: Each test creates its own NCA (no shared state)
3. **Cleanup**: Test NCAs are deleted automatically in `afterAll()`
4. **Audit Trail**: Audit entries are NOT deleted (immutable)
5. **Type Safety**: All operations are fully typed (no `any` types)

---

## 💡 Next Steps After Tests Pass

1. Add tests to CI/CD pipeline
2. Run tests before each deployment
3. Create similar tests for MJC workflow
4. Add performance benchmarks
5. Test file upload integration

---

## 📞 Need Help?

- Check `README.md` for detailed documentation
- Check `TEST_SUMMARY.md` for test breakdown
- Run `setup-validation.ts` to diagnose issues
- Verify Supabase project is active and accessible
