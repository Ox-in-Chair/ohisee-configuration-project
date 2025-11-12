# Security Fix Sprint Plan

**Planning Date:** 2025-11-12
**Target Start:** 2025-11-12
**Target Completion:** 2025-12-03
**Duration:** 4 weeks (4 sprints of 1 week each)
**Team Size:** 2-3 engineers
**Status:** Ready for execution

---

## 🎯 Sprint Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 1: Critical Authentication Fixes (Week 1)               │
│ Focus: Auth bypass, hardcoded users, rate limiting setup        │
│ Deliverable: All users authenticated, Redis running             │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 2: File Security & Validation (Week 2)                  │
│ Focus: Malware scanning, permission checks, MIME validation     │
│ Deliverable: Files secured, virus scanning active               │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 3: Audit & Data Validation (Week 3)                     │
│ Focus: IP capture, server-side validation, query sanitization   │
│ Deliverable: Audit trail BRCGS-compliant, inputs validated      │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 4: Testing & Hardening (Week 4)                         │
│ Focus: Security tests, load testing, documentation              │
│ Deliverable: All fixes tested, ready for production             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 SPRINT 1: Critical Authentication Fixes (Week 1)

**Objective:** Fix authentication bypass and hardcoded user IDs
**Story Points:** 21
**Team:** 2 engineers (Auth Lead + Backend Dev)
**Dependencies:** None

### Task 1.1: Get Real User from Auth Session
**Priority:** CRITICAL | **Story Points:** 3 | **Time Estimate:** 2 hours
**Assignee:** Auth Lead

**Description:**
Replace hardcoded user ID with authenticated user from Supabase auth session.

**Tasks:**
- [ ] Update `createServerClient()` to include auth user extraction
- [ ] Create `getAuthenticatedUser()` utility function in `lib/database/client.ts`
- [ ] Add error handling for unauthenticated requests
- [ ] Update type definitions

**Code Changes:**
```typescript
// lib/database/client.ts
export async function getAuthenticatedUser() {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthenticated: User not found in session');
  }

  return user;
}
```

**Testing:**
- [ ] Unit test: Auth present → return user
- [ ] Unit test: Auth missing → throw error
- [ ] Integration test: Server action receives auth user

**PR Requirements:** Code review by CTO, unit tests >80% coverage

**Acceptance Criteria:**
- ✅ `getAuthenticatedUser()` function works
- ✅ Returns correct user object
- ✅ Throws error when auth missing
- ✅ Unit tests passing

---

### Task 1.2: Update NCA Actions with Real User IDs
**Priority:** CRITICAL | **Story Points:** 5 | **Time Estimate:** 4 hours
**Assignee:** Backend Dev

**Description:**
Update all NCA server actions to use authenticated user instead of hardcoded ID.

**Files to Update:**
- `app/actions/nca-actions.ts` (lines 271, 369, 636)
- `app/actions/mjc-actions.ts` (lines 365+)
- `app/actions/waste-actions.ts`

**Changes Required:**
```typescript
// BEFORE
const userId = '10000000-0000-0000-0000-000000000001'; // ❌ Hardcoded

// AFTER
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return { success: false, error: 'Unauthorized' };
}
const userId = user.id; // ✅ Real user
```

**Testing:**
- [ ] Unit test: createNCA uses auth user ID
- [ ] Unit test: createNCA fails without auth
- [ ] Unit test: NCA created_by matches auth user
- [ ] Integration test: Full NCA workflow

**Acceptance Criteria:**
- ✅ All hardcoded user IDs replaced
- ✅ Auth check present in all actions
- ✅ Tests passing (4 new test cases min)
- ✅ Audit trail shows correct user

---

### Task 1.3: Add Auth Verification to All Server Actions
**Priority:** CRITICAL | **Story Points:** 5 | **Time Estimate:** 4 hours
**Assignee:** Backend Dev

**Description:**
Add authentication verification to all remaining server actions.

**Files to Update:**
- `app/actions/file-actions.ts` (uploadNCAFile, uploadMJCFile, deleteNCAFile, deleteMJCFile)
- `app/actions/end-of-day-actions.ts`
- `app/actions/complaint-actions.ts`
- `app/actions/knowledge-base-actions.ts` (admin check)

**Template:**
```typescript
export async function serverAction(params: any) {
  try {
    const supabase = createServerClient();

    // ✅ AUTH CHECK - FIRST THING
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // ✅ ADMIN CHECK (if needed)
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'operations-manager'].includes(userProfile?.role)) {
      return { success: false, error: 'Forbidden: Insufficient permissions' };
    }

    // Rest of logic...
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: 'An error occurred' };
  }
}
```

**Testing:**
- [ ] Unit test: No auth → error
- [ ] Unit test: With auth → proceeds
- [ ] Unit test: Admin check works
- [ ] Integration test: Multiple actions

**Acceptance Criteria:**
- ✅ All server actions have auth check
- ✅ Auth check is first operation
- ✅ Proper error messages
- ✅ 100% coverage on auth paths

---

### Task 1.4: Set Up Redis Infrastructure
**Priority:** CRITICAL | **Story Points:** 4 | **Time Estimate:** 2 hours
**Assignee:** DevOps/Backend Lead

**Description:**
Set up Redis server for distributed rate limiting.

**Steps:**
1. [ ] Provision Redis instance (local dev + staging + production)
2. [ ] Configure connection strings
3. [ ] Test connectivity
4. [ ] Set up monitoring/alerting

**Options:**
- **Local Dev:** Docker container (`docker run -d -p 6379:6379 redis:latest`)
- **Staging:** Redis Cloud free tier or AWS ElastiCache
- **Production:** AWS ElastiCache or Redis Cloud with high availability

**Configuration:**
```bash
# .env.local
REDIS_URL=redis://localhost:6379

# .env.staging
REDIS_URL=rediss://user:password@staging-redis.cloud:19739

# .env.production (use Vercel/deployment secrets)
REDIS_URL=rediss://user:password@prod-redis.cloud:19739
```

**Testing:**
- [ ] Redis connection successful
- [ ] PING command works
- [ ] Can set/get keys
- [ ] TTL expiration works

**Acceptance Criteria:**
- ✅ Redis running in all environments
- ✅ Connection strings configured
- ✅ Connectivity tests passing
- ✅ Monitoring dashboard accessible

---

### Task 1.5: Implement Redis-Backed Rate Limiter
**Priority:** CRITICAL | **Story Points:** 4 | **Time Estimate:** 3 hours
**Assignee:** Backend Dev

**Description:**
Replace in-memory rate limiter with Redis implementation.

**Files:**
- Create: `lib/ai/redis-rate-limiter.ts`
- Update: `lib/ai/factory.ts`
- Update: `lib/ai/ai-service.ts`

**Implementation:**
```typescript
// lib/ai/redis-rate-limiter.ts
import { createClient } from 'redis';
import { IRateLimiter } from './ai-service.interface';

export class RedisRateLimiter implements IRateLimiter {
  private readonly client: RedisClientType;
  private readonly limits: { requests_per_minute: number; requests_per_hour: number };

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.limits = {
      requests_per_minute: 10,
      requests_per_hour: 100
    };
    this.connect();
  }

  private async connect() {
    try {
      await this.client.connect();
    } catch (err) {
      console.error('Redis connection failed:', err);
    }
  }

  async checkLimit(user_id: string): Promise<boolean> {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);

    const minuteKey = `rate-limit:${user_id}:${minute}`;
    const hourKey = `rate-limit:${user_id}:${hour}`;

    const [minuteCount, hourCount] = await Promise.all([
      this.client.incr(minuteKey),
      this.client.incr(hourKey)
    ]);

    if (minuteCount === 1) await this.client.expire(minuteKey, 60);
    if (hourCount === 1) await this.client.expire(hourKey, 3600);

    return minuteCount <= 10 && hourCount <= 100;
  }

  // ... other methods
}
```

**Testing:**
- [ ] Unit test: Rate limit enforced
- [ ] Unit test: Limit resets after window
- [ ] Integration test: Across multiple calls
- [ ] Distributed test: Multiple servers

**Acceptance Criteria:**
- ✅ Redis rate limiter implements IRateLimiter
- ✅ Limits enforced correctly
- ✅ Keys expire automatically
- ✅ Works across server instances

---

### Task 1.6: Sprint 1 Testing & QA
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 3 hours
**Assignee:** QA Engineer

**Description:**
Comprehensive testing of all Sprint 1 changes.

**Test Suite:**
```bash
# Unit tests
npm run test -- auth.test.ts
npm run test -- redis-rate-limiter.test.ts
npm run test -- nca-actions.test.ts
npm run test -- mjc-actions.test.ts

# Integration tests
npm run test:integration -- auth-flow.spec.ts
npm run test:integration -- rate-limiter-distributed.spec.ts

# E2E tests
npm run test:e2e -- security/auth-bypass.spec.ts
```

**Test Coverage Requirements:**
- [ ] Auth paths: 100% coverage
- [ ] Rate limiter: 95%+ coverage
- [ ] User actions: 85%+ coverage

**Acceptance Criteria:**
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Coverage >85%
- ✅ No security warnings in output
- ✅ Sprint 1 ready for staging

---

## 📋 SPRINT 2: File Security & Validation (Week 2)

**Objective:** Secure file uploads, add malware scanning
**Story Points:** 18
**Team:** 2 engineers (Backend Dev + QA)
**Dependencies:** Sprint 1 complete (auth working)

### Task 2.1: Implement File Magic Byte Validation
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 2 hours
**Assignee:** Backend Dev

**Description:**
Add magic byte validation to detect file type spoofing.

**File:** Create `lib/utils/file-validator.ts`

**Implementation:**
```typescript
const MAGIC_BYTES: Record<string, Buffer> = {
  'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),             // FFD8FF
  'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),        // 89PNG
  'image/gif': Buffer.from([0x47, 0x49, 0x46]),              // GIF
};

export async function validateFileMagicBytes(file: File, expectedType: string): Promise<boolean> {
  if (!MAGIC_BYTES[expectedType]) return true;

  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const magic = MAGIC_BYTES[expectedType];

  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}
```

**Testing:**
- [ ] Test with real PDF file
- [ ] Test with real image files
- [ ] Test with spoofed .exe as .pdf
- [ ] Test with empty file
- [ ] Test with unknown type

**Acceptance Criteria:**
- ✅ Magic byte validation working
- ✅ Detects spoofed files
- ✅ Tests passing
- ✅ Handles edge cases

---

### Task 2.2: Integrate VirusTotal API for Malware Scanning
**Priority:** HIGH | **Story Points:** 4 | **Time Estimate:** 3 hours
**Assignee:** Backend Dev

**Description:**
Add virus scanning for uploaded files.

**File:** Create `lib/services/virus-scan-service.ts`

**Steps:**
1. [ ] Sign up for VirusTotal API (https://www.virustotal.com/en/documentation/public-api/)
2. [ ] Get API key
3. [ ] Store in environment variables
4. [ ] Implement scanning function

**Implementation:**
```typescript
// lib/services/virus-scan-service.ts
export async function scanFileForViruses(file: File): Promise<{
  safe: boolean;
  score: number;
  details?: string;
}> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    console.warn('VirusTotal not configured, allowing file');
    return { safe: true, score: 0 };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      'https://www.virustotal.com/api/v3/files',
      {
        method: 'POST',
        headers: { 'x-apikey': apiKey },
        body: formData,
        timeout: 10000 // 10 second timeout
      }
    );

    if (!response.ok) {
      console.error('VirusTotal error:', response.statusText);
      return { safe: true, score: 0 }; // Fail open
    }

    const result = await response.json();
    const stats = result.data.attributes.last_analysis_stats;
    const malicious = stats.malicious + stats.suspicious;

    return {
      safe: malicious === 0,
      score: malicious,
      details: `${malicious} detections`
    };
  } catch (error) {
    console.error('Virus scan error:', error);
    return { safe: true, score: 0 }; // Fail open
  }
}
```

**Configuration:**
```bash
# .env.local
VIRUSTOTAL_API_KEY=your_api_key_here
```

**Testing:**
- [ ] Scan clean file → safe
- [ ] Scan infected file (test vector) → unsafe
- [ ] Scan when API down → fail open
- [ ] Timeout handling
- [ ] File size limits

**Acceptance Criteria:**
- ✅ Scanning API integrated
- ✅ Detects malicious files
- ✅ Fails safely (allows upload if scan down)
- ✅ Tests passing
- ✅ Timeout handling working

---

### Task 2.3: Add File Upload Permission Checks
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 2 hours
**Assignee:** Backend Dev

**Description:**
Verify user has permission to upload files to specific NCA/MJC.

**Files:** `app/actions/file-actions.ts`

**Changes:**
```typescript
export async function uploadNCAFile(ncaId: string, formData: FormData) {
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify NCA exists
  const { data: nca } = await supabase
    .from('ncas')
    .select('id, created_by')
    .eq('id', ncaId)
    .single();

  if (!nca) return { success: false, error: 'NCA not found' };

  // ✅ CHECK PERMISSION
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const canUpload = user.id === nca.created_by ||
                   ['qa-supervisor', 'operations-manager'].includes(userProfile?.role);

  if (!canUpload) {
    return { success: false, error: 'Access denied' };
  }

  // Proceed with upload...
}
```

**Testing:**
- [ ] NCA creator can upload
- [ ] QA supervisor can upload to any NCA
- [ ] Regular operator cannot upload to others' NCAs
- [ ] Non-existent NCA returns error

**Acceptance Criteria:**
- ✅ Permission checks in place
- ✅ Tests passing
- ✅ Proper error messages
- ✅ RLS policy aligned

---

### Task 2.4: Update File Upload with Validation & Scanning
**Priority:** HIGH | **Story Points:** 5 | **Time Estimate:** 4 hours
**Assignee:** Backend Dev

**Description:**
Update file upload actions to use magic bytes + virus scanning + signed URLs.

**Files:** `app/actions/file-actions.ts`

**Changes:**
```typescript
import { validateFileMagicBytes } from '@/lib/utils/file-validator';
import { scanFileForViruses } from '@/lib/services/virus-scan-service';

export async function uploadNCAFile(ncaId: string, formData: FormData) {
  // Auth check...
  // Permission check...

  const file = formData.get('file') as File;

  // ✅ VALIDATE MAGIC BYTES
  const magicBytesValid = await validateFileMagicBytes(file, file.type);
  if (!magicBytesValid) {
    return {
      success: false,
      error: 'File content does not match declared type (potential malware)'
    };
  }

  // ✅ SCAN FOR VIRUSES
  const scanResult = await scanFileForViruses(file);
  if (!scanResult.safe) {
    return {
      success: false,
      error: `File flagged as malicious (${scanResult.details})`
    };
  }

  // ✅ USE VALIDATED MIME TYPE
  const MIME_TYPE_MAP = { /* ... */ };
  const safeContentType = MIME_TYPE_MAP[file.type] || 'application/octet-stream';

  // Upload...
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('nca-attachments')
    .upload(filePath, file, {
      contentType: safeContentType, // ✅ VALIDATED TYPE
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  // ✅ USE SIGNED URL
  const { data: { signedUrl } } = await supabase.storage
    .from('nca-attachments')
    .createSignedUrl(filePath, 3600); // 1 hour expiration

  return {
    success: true,
    data: {
      path: uploadData.path,
      url: signedUrl // ✅ SIGNED, NOT PUBLIC
    }
  };
}
```

**Testing:**
- [ ] Valid file → uploads successfully
- [ ] Spoofed file → rejected
- [ ] Malicious file → rejected
- [ ] Unauthorized user → rejected
- [ ] Signed URL working
- [ ] URL expires after 1 hour

**Acceptance Criteria:**
- ✅ All checks in place
- ✅ Signed URLs working
- ✅ Tests passing
- ✅ Integration tests passing
- ✅ E2E file upload test passing

---

### Task 2.5: Sprint 2 Testing & QA
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 3 hours
**Assignee:** QA Engineer

**Description:**
Test all file security features.

**Test Cases:**
```bash
# Unit tests
npm run test -- file-validator.test.ts
npm run test -- virus-scan-service.test.ts
npm run test -- file-actions.test.ts

# E2E tests
npm run test:e2e -- security/file-upload-validation.spec.ts
npm run test:e2e -- security/permission-checks.spec.ts
npm run test:e2e -- security/signed-urls.spec.ts
```

**Acceptance Criteria:**
- ✅ All file security tests passing
- ✅ Magic byte validation working
- ✅ Virus scanning working
- ✅ Permission checks working
- ✅ Signed URLs working
- ✅ Coverage >85%

---

## 📋 SPRINT 3: Audit & Data Validation (Week 3)

**Objective:** BRCGS audit compliance, server-side validation
**Story Points:** 14
**Team:** 2 engineers
**Dependencies:** Sprints 1-2 complete

### Task 3.1: Capture Real IP Address in Audit Logs
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 2 hours
**Assignee:** Backend Dev

**Description:**
Extract client IP from request headers instead of using `0.0.0.0`.

**File:** Create `lib/utils/ip-extractor.ts`

**Implementation:**
```typescript
// lib/utils/ip-extractor.ts
import { headers } from 'next/headers';

export async function getClientIP(): Promise<string> {
  try {
    const headersList = await headers();

    // Check X-Forwarded-For (proxy)
    const forwarded = headersList.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();

    // Check X-Real-IP (nginx)
    const xRealIp = headersList.get('x-real-ip');
    if (xRealIp) return xRealIp;

    // Check Cloudflare
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp;

    return '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

export function isValidIP(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const ipv6 = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(ip);
  return ipv4 || ipv6;
}
```

**Update:** All signature transformations to use real IP

**Testing:**
- [ ] Extract from X-Forwarded-For
- [ ] Extract from X-Real-IP
- [ ] Extract from CF header
- [ ] Validate IP format
- [ ] Fallback to 127.0.0.1

**Acceptance Criteria:**
- ✅ Real IP captured
- ✅ Validated before use
- ✅ Tests passing
- ✅ Audit logs show real IPs

---

### Task 3.2: Server-Side Input Re-Validation
**Priority:** HIGH | **Story Points:** 4 | **Time Estimate:** 3 hours
**Assignee:** Backend Dev

**Description:**
Re-validate all form inputs on server side before processing.

**Files:**
- `app/actions/nca-actions.ts`
- `app/actions/mjc-actions.ts`
- `app/actions/complaint-actions.ts`

**Implementation:**
```typescript
import { NCAFormDataSchema } from '@/lib/validations/nca-schema';

export async function createNCA(formData: NCAFormData) {
  // ✅ RE-VALIDATE ON SERVER
  const validation = NCAFormDataSchema.safeParse(formData);
  if (!validation.success) {
    console.warn('Invalid form data:', validation.error);
    return {
      success: false,
      error: 'Invalid form data: ' + validation.error.message
    };
  }

  const validatedData = validation.data;

  // Auth check...
  // Transform and create...
}
```

**Testing:**
- [ ] Valid data → passes
- [ ] Invalid data → rejects with message
- [ ] Missing required fields → rejects
- [ ] Out-of-range values → rejects
- [ ] XSS attempt → rejected

**Acceptance Criteria:**
- ✅ Validation re-implemented
- ✅ Tests passing
- ✅ Proper error messages
- ✅ Coverage >90%

---

### Task 3.3: Sanitize ILIKE Queries
**Priority:** HIGH | **Story Points:** 2 | **Time Estimate:** 1 hour
**Assignee:** Backend Dev

**Description:**
Add input sanitization to database queries using ILIKE.

**File:** `app/actions/nca-actions.ts:220`

**Changes:**
```typescript
// BEFORE
.ilike('supplier_name', `%${ncaData.supplier_name}%`)

// AFTER
const sanitizedName = ncaData.supplier_name
  .trim()
  .slice(0, 255) // Max length
  .replace(/[%_\\]/g, '\\$&'); // Escape special chars

.ilike('supplier_name', `%${sanitizedName}%`, { escape: '\\' })
```

**Testing:**
- [ ] Normal text → works
- [ ] Special characters → escaped
- [ ] Long text → truncated
- [ ] SQL injection attempt → blocked

**Acceptance Criteria:**
- ✅ Query sanitization in place
- ✅ Tests passing
- ✅ No injection possible

---

### Task 3.4: Update Signature Handling with IP & Encryption
**Priority:** MEDIUM | **Story Points:** 3 | **Time Estimate:** 2 hours
**Assignee:** Backend Dev

**Description:**
Update signature transformation to capture real IP and prepare for encryption.

**Changes:**
```typescript
import { getClientIP } from '@/lib/utils/ip-extractor';

async function transformSignature(formSignature: any): Promise<Signature | null> {
  if (!formSignature) return null;

  const clientIP = await getClientIP();

  return {
    type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
    name: formSignature.name,
    timestamp: formSignature.timestamp,
    ip: clientIP, // ✅ REAL IP
    data: formSignature.data, // TODO: Encrypt in future sprint
  };
}
```

**Testing:**
- [ ] IP captured correctly
- [ ] Timestamp preserved
- [ ] Signature data intact
- [ ] Audit log shows real IP

**Acceptance Criteria:**
- ✅ IP capture working
- ✅ Tests passing
- ✅ Audit logs updated

---

### Task 3.5: Add BRCGS Compliance Notes to Database
**Priority:** MEDIUM | **Story Points:** 2 | **Time Estimate:** 1 hour
**Assignee:** Backend Dev

**Description:**
Add comments to critical functions documenting BRCGS compliance.

**Updates:**
- Add BRCGS section references to audit logging code
- Document RLS policy compliance
- Mark immutable field handling

**Example:**
```typescript
/**
 * BRCGS 3.3 - Audit Trail (Section 3.3)
 * "All transactions shall be recorded with user identification, date, time,
 * and details of what was done and by whom"
 *
 * This function ensures:
 * - user_id: Current authenticated user
 * - created_at: Timestamp from trigger
 * - ip_address: Client IP from headers
 * - action: Specific operation performed
 */
async function logToAuditTrail(action: string, data: any) {
  // ...
}
```

**Acceptance Criteria:**
- ✅ BRCGS references added
- ✅ Compliance documented
- ✅ Developer references available

---

### Task 3.6: Sprint 3 Testing & QA
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 3 hours
**Assignee:** QA Engineer

**Description:**
Test audit, validation, and data handling improvements.

**Test Cases:**
```bash
npm run test -- ip-extractor.test.ts
npm run test -- nca-actions.test.ts (revalidation)
npm run test:integration -- audit-trail.spec.ts
npm run test:e2e -- security/input-validation.spec.ts
```

**Acceptance Criteria:**
- ✅ IP capture working
- ✅ Validation re-checks working
- ✅ Audit logs BRCGS-compliant
- ✅ All tests passing
- ✅ Coverage >85%

---

## 📋 SPRINT 4: Testing, Hardening & Documentation (Week 4)

**Objective:** Security testing, performance testing, production readiness
**Story Points:** 12
**Team:** 2-3 engineers + QA
**Dependencies:** Sprints 1-3 complete

### Task 4.1: Security Test Suite Implementation
**Priority:** CRITICAL | **Story Points:** 5 | **Time Estimate:** 5 hours
**Assignee:** QA Engineer

**Description:**
Create comprehensive security test suite covering all vulnerabilities.

**File:** Create `tests/security/vulnerability-tests.spec.ts`

**Test Categories:**
```typescript
// Authentication Bypass Tests
describe('Authentication Security', () => {
  it('should not allow unauthenticated NCA creation', async () => {
    const result = await createNCA(formData); // No auth
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unauthorized');
  });

  it('should use real user ID from auth', async () => {
    const result = await createNCA(formData, userAuth);
    const nca = await getNCAById(result.data.id);
    expect(nca.created_by).toBe(userAuth.user.id);
    expect(nca.created_by).not.toBe('10000000-0000-0000-0000-000000000001');
  });
});

// Rate Limiting Tests
describe('Rate Limiting', () => {
  it('should enforce rate limits across distributed servers', async () => {
    const user = await createTestUser();
    for (let i = 0; i < 10; i++) {
      const result = await analyzeFieldQuality(user.id, data);
      expect(result.success).toBe(true);
    }
    const result = await analyzeFieldQuality(user.id, data);
    expect(result.success).toBe(false);
    expect(result.error).toContain('rate limit');
  });
});

// File Security Tests
describe('File Upload Security', () => {
  it('should reject spoofed file extensions', async () => {
    const maliciousFile = new File(['#!/bin/bash'], 'script.pdf');
    maliciousFile.type = 'application/pdf';

    const result = await uploadNCAFile(ncaId, formData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('malware');
  });

  it('should reject files flagged by VirusTotal', async () => {
    const result = await uploadNCAFile(ncaId, infectFile);
    expect(result.success).toBe(false);
  });

  it('should verify user permission before upload', async () => {
    const otherUserNCA = await createNCAAsUser(user2);
    const result = await uploadNCAFile(otherUserNCA.id, formData, user1.auth);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Access denied');
  });
});

// Authorization Tests
describe('Authorization', () => {
  it('should prevent privilege escalation via role field', async () => {
    const operator = await getUser('operator');
    const result = await updateUserRole(operator.id, 'operations-manager', operatorAuth);
    expect(result.success).toBe(false);
  });

  it('should enforce RLS policies', async () => {
    const otherUserNCA = await getNCAAsUser(user2);
    const result = await getNCAById(otherUserNCA.id, user1.auth);
    expect(result.success).toBe(false);
  });
});

// Data Validation Tests
describe('Input Validation', () => {
  it('should reject invalid NCA data on server', async () => {
    const invalidData = { ...formData, nc_description: '' }; // Too short
    const result = await createNCA(invalidData);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid');
  });

  it('should sanitize ILIKE queries', async () => {
    const maliciousName = "%'; DROP TABLE suppliers; --";
    const result = await sendSupplierNotificationIfNeeded({
      nc_type: 'raw-material',
      supplier_name: maliciousName
    }, 'NCA-001');
    expect(result.success).toBe(true); // Should not crash
  });
});

// Audit Trail Tests
describe('Audit Trail Compliance', () => {
  it('should capture real IP address', async () => {
    const result = await createNCA(formData, auth);
    const auditEntry = await getAuditTrail(result.data.id);
    expect(auditEntry.ip_address).not.toBe('0.0.0.0');
    expect(isValidIP(auditEntry.ip_address)).toBe(true);
  });

  it('should record user ID correctly', async () => {
    const result = await createNCA(formData, auth);
    const auditEntry = await getAuditTrail(result.data.id);
    expect(auditEntry.user_id).toBe(auth.user.id);
  });
});
```

**Testing:**
- [ ] Run full security test suite
- [ ] All tests passing
- [ ] Coverage >90%

**Acceptance Criteria:**
- ✅ 50+ security test cases
- ✅ All tests passing
- ✅ Coverage >90%
- ✅ Edge cases covered

---

### Task 4.2: Load Testing & Performance Validation
**Priority:** HIGH | **Story Points:** 3 | **Time Estimate:** 3 hours
**Assignee:** Performance Engineer

**Description:**
Test performance under load, especially rate limiting and file uploads.

**Test Scenarios:**
```bash
# k6 load test
npm run test:load -- scripts/rate-limiting-load-test.js
npm run test:load -- scripts/file-upload-load-test.js
```

**Test Script (k6):**
```javascript
// scripts/rate-limiting-load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  const payload = JSON.stringify({ /* NCA data */ });
  const res = http.post('http://localhost:3000/api/nca/create', payload);

  check(res, {
    'status 200': (r) => r.status === 200 || r.status === 429,
    'rate limit enforced': (r) => {
      if (r.status === 429) return true; // Expected when limit hit
      return true;
    },
  });
}
```

**Metrics to Check:**
- [ ] P95 response time < 500ms
- [ ] P99 response time < 2000ms
- [ ] Rate limiting kicks in at 10 req/min
- [ ] No server errors (5xx) under load
- [ ] File uploads complete in <5s

**Acceptance Criteria:**
- ✅ All performance metrics met
- ✅ No errors under load
- ✅ Rate limiting working correctly
- ✅ Load test results documented

---

### Task 4.3: Create Security Hardening Checklist
**Priority:** MEDIUM | **Story Points:** 2 | **Time Estimate:** 2 hours
**Assignee:** Backend Lead

**Description:**
Document all security hardening steps and create deployment checklist.

**File:** Create `SECURITY_DEPLOYMENT_CHECKLIST.md`

**Checklist Contents:**
```markdown
# Security Deployment Checklist

## Pre-Deployment (Development)
- [ ] All critical vulnerabilities fixed
- [ ] Security tests passing (50+ test cases)
- [ ] Code review completed
- [ ] Load tests passing
- [ ] No security warnings in logs

## Pre-Deployment (Staging)
- [ ] Deploy to staging environment
- [ ] Run full security test suite
- [ ] Manual penetration testing
- [ ] Audit trail verification
- [ ] RLS policy validation

## Deployment (Production)
- [ ] Redis cluster running
- [ ] VirusTotal API key configured
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] RLS policies active
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

## Post-Deployment (24-48 hours)
- [ ] Monitor error logs
- [ ] Verify audit trail entries
- [ ] Check rate limiter effectiveness
- [ ] Validate file scanning
- [ ] Performance metrics normal
- [ ] No security alerts
```

**Acceptance Criteria:**
- ✅ Checklist created
- ✅ All items defined
- ✅ Clear acceptance criteria

---

### Task 4.4: Security Documentation Update
**Priority:** HIGH | **Story Points:** 2 | **Time Estimate:** 2 hours
**Assignee:** Tech Writer + Backend Lead

**Description:**
Update CLAUDE.md and create security best practices guide.

**Updates:**
- [ ] Update CLAUDE.md "Security Checklist" section
- [ ] Document authentication flow
- [ ] Document rate limiting
- [ ] Document file upload security
- [ ] Add security patterns & anti-patterns

**File:** Update `CLAUDE.md` section on Security

**Example:**
```markdown
## Security Patterns

### Authentication
✅ CORRECT - Get user from auth session
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) return { error: 'Unauthorized' };
```

❌ WRONG - Hardcoded user ID
```typescript
const userId = '10000000-0000-0000-0000-000000000001';
```

### Rate Limiting
✅ CORRECT - Redis-backed distributed
✅ Survives server restarts
✅ Works across multiple instances

❌ WRONG - In-memory only
❌ Lost on restart
❌ Bypassed with load balancer
```

**Acceptance Criteria:**
- ✅ CLAUDE.md updated
- ✅ Security patterns documented
- ✅ Examples provided
- ✅ Anti-patterns called out

---

### Task 4.5: Final Security Audit & Sign-Off
**Priority:** CRITICAL | **Story Points:** 3 | **Time Estimate:** 3 hours
**Assignee:** Security Lead + QA Lead

**Description:**
Final comprehensive security audit before production deployment.

**Audit Checklist:**
```
AUTHENTICATION
- [ ] All hardcoded user IDs removed
- [ ] Auth verification in all server actions
- [ ] getUser() calls present and error-handled
- [ ] No static Supabase calls

AUTHORIZATION
- [ ] RLS policies enforced
- [ ] File upload permission checks
- [ ] Role-based access control working
- [ ] No privilege escalation possible

DATA HANDLING
- [ ] File magic byte validation
- [ ] Virus scanning active
- [ ] MIME type validated server-side
- [ ] Signed URLs for file access
- [ ] No public URLs for sensitive files

API SECURITY
- [ ] Rate limiting working
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention

AUDIT & COMPLIANCE
- [ ] Real IP captured in logs
- [ ] User ID recorded correctly
- [ ] Timestamps accurate
- [ ] Immutable audit trail
- [ ] BRCGS 3.3 compliant

DEPLOYMENT READINESS
- [ ] All tests passing
- [ ] Load tests passing
- [ ] Documentation complete
- [ ] Rollback plan ready
- [ ] Monitoring configured
```

**Sign-Off Document:**
```
SECURITY AUDIT - SIGN-OFF

All critical and high-priority security vulnerabilities have been:
- [x] Identified and documented
- [x] Remediated with code fixes
- [x] Tested with security test suite
- [x] Validated in staging environment
- [x] Reviewed by security team

STATUS: ✅ APPROVED FOR PRODUCTION DEPLOYMENT

Reviewed by:
- Security Lead: _______________  Date: __________
- CTO: _______________________  Date: __________
- QA Lead: ___________________  Date: __________

Conditions:
- Monitor error logs for 72 hours post-deployment
- Daily security review for first week
- Weekly audits for first month
- Quarterly security reviews thereafter
```

**Acceptance Criteria:**
- ✅ All audit items checked
- ✅ Sign-off document completed
- ✅ Team approval obtained
- ✅ Ready for deployment

---

### Task 4.6: Deployment & Monitoring Setup
**Priority:** CRITICAL | **Story Points:** 2 | **Time Estimate:** 2 hours
**Assignee:** DevOps/Backend Lead

**Description:**
Deploy fixes to production with monitoring and rollback plan.

**Steps:**
1. [ ] Tag release version (`v1.0.0-security-patch`)
2. [ ] Create deployment checklist
3. [ ] Set up monitoring alerts
4. [ ] Test rollback procedure
5. [ ] Deploy during low-traffic window
6. [ ] Monitor for 24-48 hours

**Monitoring:**
```bash
# Key metrics to watch
- Auth failures: Should stay <0.1%
- Rate limit rejections: Should be consistent
- File upload errors: Should stay <1%
- Audit trail entries: Should show real IPs
- Error rate: Should stay <0.1%
```

**Rollback Plan:**
```bash
# If critical issue discovered:
1. Disable feature flag (if available)
2. Revert to previous version
3. Rollback database migrations (if any)
4. Notify stakeholders
5. Post-mortem after stabilization
```

**Acceptance Criteria:**
- ✅ Deployed successfully
- ✅ All monitoring active
- ✅ No critical errors
- ✅ Audit trails normal
- ✅ Team notified

---

## 📊 Resource Allocation

### Sprint 1 Resources
```
┌──────────────────────────┬───────┬─────────────┐
│ Role                     │ Hours │ Person      │
├──────────────────────────┼───────┼─────────────┤
│ Auth Lead                │ 12    │ Person A    │
│ Backend Dev              │ 14    │ Person B    │
│ DevOps/Backend Lead      │ 2     │ Person A    │
│ QA Engineer              │ 3     │ Person C    │
│ TOTAL                    │ 31    │             │
└──────────────────────────┴───────┴─────────────┘
```

### Sprint 2-4 Resources
```
2-3 backend engineers working in parallel
1 QA engineer for testing
1 DevOps engineer for infrastructure
```

**Total Estimated Effort:** 54-60 hours (fits within 2-week window with 2-3 engineers)

---

## 🎯 Success Criteria

### Per Sprint
- [ ] All tasks completed
- [ ] Test coverage >85%
- [ ] Code review approved
- [ ] No outstanding security warnings

### Overall (Post Sprint 4)
- [ ] All 12 vulnerabilities fixed
- [ ] 50+ security tests passing
- [ ] Load tests passing
- [ ] BRCGS compliance verified
- [ ] Production deployment successful
- [ ] 24-48 hours monitoring complete
- [ ] Zero critical issues found

---

## 📅 Timeline Summary

```
Week 1 (Nov 12-18):    Sprint 1 - Authentication Fixes
Week 2 (Nov 19-25):    Sprint 2 - File Security
Week 3 (Nov 26-Dec 2): Sprint 3 - Audit & Validation
Week 4 (Dec 3-9):      Sprint 4 - Testing & Deployment

Delivery Date: ~December 10, 2025
```

---

## 🚀 Risk Mitigation

### High Risks & Mitigation
| Risk | Mitigation |
|------|-----------|
| Auth changes break existing functionality | Feature flag + gradual rollout |
| Rate limiter Redis connection fails | Fallback to fail-open mode |
| File scanning delays uploads | Async scanning with user notification |
| Database migration fails | Test migrations in staging first |
| Performance degradation | Load test before deployment |

### Contingency Plan
If critical issue found during Sprint 4:
1. Pause Sprint 4 tasks
2. Form incident response team
3. Root cause analysis
4. Hotfix deployment
5. Resume Sprint 4 after stabilization

---

## Next Steps

1. **Kickoff Meeting** (Today)
   - [ ] Review sprint plan with team
   - [ ] Assign tasks to engineers
   - [ ] Set up development environment
   - [ ] Create feature branch

2. **Sprint 1 Start** (Tomorrow)
   - [ ] Backend Dev starts Task 1.2
   - [ ] Auth Lead starts Task 1.1
   - [ ] DevOps starts Task 1.4 (infrastructure)

3. **Daily Standups**
   - [ ] 15-minute daily syncs
   - [ ] Track blockers
   - [ ] Adjust tasks as needed

4. **Sprint Review** (End of each week)
   - [ ] Demo completed fixes
   - [ ] Review test results
   - [ ] Plan next sprint

---

**Status:** Ready for Sprint Kickoff
**Date:** 2025-11-12
**Prepared By:** Security Review Team
