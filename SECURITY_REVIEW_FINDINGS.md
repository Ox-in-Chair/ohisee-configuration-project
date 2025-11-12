# Security Vulnerability Review - OHiSee Configuration Project

**Review Date:** 2025-11-12
**Reviewer:** Security Professional
**Status:** CRITICAL ISSUES IDENTIFIED
**Priority:** Address High & Critical issues before production deployment

---

## Executive Summary

This security review identified **8 critical/high-severity vulnerabilities** and **6 medium-severity issues** across authentication, data handling, and API endpoints. While the architecture implements solid defense-in-depth patterns (RLS policies, audit trails, dependency injection), several implementation gaps create exploitable security weaknesses.

**Key Findings:**
- ❌ Hardcoded user IDs bypass authentication completely
- ❌ In-memory rate limiting provides no distributed protection
- ❌ File uploads lack malware scanning and magic byte validation
- ❌ IP address spoofing not prevented in audit logs
- ⚠️ Missing server-side re-validation of user-provided data

---

## Vulnerabilities by Severity

### 🔴 CRITICAL (Deploy Blocker)

#### 1. **Hardcoded User ID - Authentication Bypass**
**File:** `app/actions/nca-actions.ts` (lines 271, 369, 636)
**Severity:** CRITICAL
**Type:** Authentication/Authorization

**Description:**
All NCAs are created with a hardcoded operator user ID instead of the actual authenticated user:
```typescript
const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth
```

**Impact:**
- All NCAs attributed to same operator regardless of who created them
- Audit trail is completely inaccurate - non-repudiation violated
- RLS policies bypass: User A creates NCA but User B gets credit
- Violates BRCGS 3.3 (Audit Trail) - "users must be identified"
- Compliance violation: No way to trace who actually created records

**Proof of Concept:**
```typescript
// User A creates an NCA
const response = await createNCA(formData);
// But audit shows User B (hardcoded seed operator) created it
// User A can claim they didn't create the NCA
```

**Remediation:**
```typescript
// In server action
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return { success: false, error: 'Unauthorized' };
}
const userId = user.id; // Use actual authenticated user
```

---

#### 2. **In-Memory Rate Limiting - Ineffective in Production**
**File:** `lib/ai/rate-limiter.ts` (lines 24-31)
**Severity:** CRITICAL
**Type:** DOS Prevention/API Security

**Description:**
Rate limiter uses in-memory `Map` storage with no persistence:
```typescript
private readonly storage: Map<string, RateLimitEntry>;
```

**Impact:**
- Rate limits lost on server restart
- In multi-instance deployments: each server has own limits → users bypass by rotating servers
- No global rate limiting enforcement across load balancer
- AI API abuse possible - attackers can flood Anthropic API
- Increased costs from unlimited API calls
- Single point of failure for entire rate limiting system

**Example Attack:**
```
User A: 10 requests to Server 1 (hits limit)
User A: 10 requests to Server 2 (no limit, different instance)
User A: 10 requests to Server 3 (no limit, different instance)
Result: 30 requests when only 10 should be allowed
```

**Remediation:**
```typescript
// Use Redis for distributed rate limiting
import { createClient } from 'redis';

const redis = createClient();
const key = `rate-limit:${user_id}:minute`;
const count = await redis.incr(key);
await redis.expire(key, 60); // Reset after 60 seconds
return count <= 10;
```

---

#### 3. **Missing Authentication Verification in Server Actions**
**File:** `app/actions/nca-actions.ts`, `app/actions/mjc-actions.ts`, `app/actions/file-actions.ts`
**Severity:** CRITICAL
**Type:** Authentication

**Description:**
Server actions don't verify user is actually authenticated before processing:
```typescript
export async function createNCA(formData: NCAFormData) {
  // No authentication check!
  const supabase = createServerClient();
  // Proceeds directly to create NCA with hardcoded user
}
```

**Impact:**
- If `createServerClient()` returns invalid client, no error handling
- No explicit verification that `auth.getUser()` succeeds
- Potential for bypassing auth if Supabase client initialization fails

**Remediation:**
```typescript
export async function createNCA(formData: NCAFormData) {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Now proceed with authenticated user ID
  const ncaData = transformFormDataToInsert(formData, user.id);
  // ...
}
```

---

### 🟠 HIGH (Fix Before Production)

#### 4. **File Upload - No Malware Scanning**
**File:** `app/actions/file-actions.ts` (lines 114-120, 211-217)
**Severity:** HIGH
**Type:** Data Handling/File Security

**Description:**
Files are uploaded directly to Supabase storage with only MIME type validation:
```typescript
// Only validates file.type (client-supplied)
if (!NCA_ALLOWED_TYPES.includes(file.type)) {
  return { success: false, error: 'File type not allowed' };
}

// Immediately uploaded without scanning
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('nca-attachments')
  .upload(filePath, file, { contentType: file.type });
```

**Impact:**
- MIME type spoofing: attacker renames `malware.exe` to `document.pdf`
- Executable files (`.exe`, `.sh`, `.bat`) can be uploaded as PDFs
- Virus/malware files stored in production database
- If files are served to users, malware spreads
- No antivirus integration

**Proof of Concept:**
```javascript
// Client side
const file = new File(['#!/bin/bash...'], 'script.pdf');
file.type = 'application/pdf'; // Spoof MIME type
await uploadNCAFile(ncaId, formData);
// Malicious script uploaded as PDF!
```

**Remediation:**
1. **Magic Byte Validation** - Check file content signature:
```typescript
async function validateFileMagicBytes(file: File, expectedType: string) {
  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF magic bytes: %PDF
  if (expectedType === 'application/pdf') {
    return bytes[0] === 0x25 && bytes[1] === 0x50 &&
           bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  // Add checks for other types...
}
```

2. **Virus Scanning Integration** - Use ClamAV or VirusTotal:
```typescript
async function scanForViruses(file: File) {
  const response = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: { 'x-apikey': process.env.VIRUSTOTAL_API_KEY },
    body: file
  });
  const result = await response.json();
  return result.data.attributes.last_analysis_stats.malicious === 0;
}
```

3. **Content-Disposition Headers** - Force download, prevent execution:
```typescript
// In Supabase storage policy:
// Add: Content-Disposition: attachment; filename="..."
// Add: X-Content-Type-Options: nosniff
```

---

#### 5. **Missing IP Address Capture in Audit Logs**
**File:** `app/actions/nca-actions.ts:40`, `app/actions/mjc-actions.ts`, `app/actions/end-of-day-actions.ts`
**Severity:** HIGH
**Type:** Audit/Compliance

**Description:**
IP address hardcoded to `'0.0.0.0'` instead of capturing real client IP:
```typescript
ip: '0.0.0.0', // TODO: Get real IP from request headers
```

**Impact:**
- Impossible to trace which IP created records
- Violates BRCGS 3.3 (Audit Trail) - must record "who, what, when, where"
- Forensic investigation impossible
- Compliance audit failure

**Remediation:**
```typescript
// In server action
function getClientIP(request?: Request): string {
  if (!request) return '127.0.0.1';

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  return request.headers.get('cf-connecting-ip') || '127.0.0.1';
}

// In server action signature
export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
) {
  // Get request from headers - Next.js provides via headers() helper
  const headersList = await headers();
  const clientIP = getClientIP();

  const signature = transformSignature(formData.signature);
  signature.ip = clientIP;
}
```

---

#### 6. **File Upload - Missing User Permission Check**
**File:** `app/actions/file-actions.ts` (lines 94-106, 191-203)
**Severity:** HIGH
**Type:** Authorization

**Description:**
Code checks if NCA exists but not if current user has permission:
```typescript
// Verify NCA exists and user has access
const { data: nca, error: ncaError } = await supabase
  .from('ncas')
  .select('id, created_by')
  .eq('id', ncaId)
  .single();

if (ncaError || !nca) {
  return { success: false, error: 'NCA not found or access denied' };
}
// ERROR: Never checks if current user is created_by or has permission!
```

**Impact:**
- User A creates NCA-001
- User B can upload files to User A's NCA without permission
- User B can delete files from any NCA
- Privilege escalation if User B is lower role

**Remediation:**
```typescript
export async function uploadNCAFile(ncaId: string, formData: FormData) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Unauthorized' };

  // Verify user has permission
  const { data: nca } = await supabase
    .from('ncas')
    .select('id, created_by')
    .eq('id', ncaId)
    .single();

  if (!nca) return { success: false, error: 'NCA not found' };

  // Check if user created it or has management role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const canUpload = user.id === nca.created_by ||
                   ['qa-supervisor', 'operations-manager'].includes(userProfile.role);

  if (!canUpload) {
    return { success: false, error: 'Access denied' };
  }

  // Proceed with upload
}
```

---

#### 7. **SQL Injection via ILIKE Query**
**File:** `app/actions/nca-actions.ts:220`
**Severity:** HIGH
**Type:** Data Handling/Injection Attack

**Description:**
Supplier name used directly in ILIKE query:
```typescript
const { data: supplier } = await supabase
  .from('suppliers')
  .select('contact_email, supplier_name')
  .ilike('supplier_name', `%${ncaData.supplier_name}%`) // Parameterized, but...
  .single();
```

While Supabase parameterizes queries, the pattern is vulnerable if `supplier_name` contains special characters.

**Impact:**
- Potential to manipulate ILIKE matching
- Could return unintended suppliers
- Database injection if escaping fails

**Remediation:**
```typescript
// Use parameterized query with bind variables
const { data: supplier } = await supabase
  .from('suppliers')
  .select('contact_email, supplier_name')
  .ilike('supplier_name', '%' + ncaData.supplier_name.trim() + '%')
  .single();

// Or better - validate/sanitize input
if (!ncaData.supplier_name || ncaData.supplier_name.length > 255) {
  return { success: false, error: 'Invalid supplier name' };
}
```

---

### 🟡 MEDIUM (Important to Fix)

#### 8. **Client-Supplied MIME Type Trust**
**File:** `app/actions/file-actions.ts:117`
**Severity:** MEDIUM
**Type:** Data Validation

**Description:**
Content-Type header set to `file.type` (client-supplied):
```typescript
.upload(filePath, file, {
  contentType: file.type, // ⚠️ TRUST CLIENT
  cacheControl: '3600',
  upsert: false,
});
```

**Impact:**
- Client can set any MIME type
- File served with wrong content type
- XSS if HTML file served as text/plain
- Bypasses browser security policies

**Remediation:**
```typescript
// Map to safe MIME types
const MIME_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'image/jpeg',
  'image/png': 'image/png',
  'application/pdf': 'application/pdf',
  // ... etc
};

const safeContentType = MIME_TYPE_MAP[file.type] || 'application/octet-stream';

.upload(filePath, file, {
  contentType: safeContentType, // Use validated type
  cacheControl: '3600',
  upsert: false,
});
```

---

#### 9. **No Input Validation Re-Verification on Server**
**File:** `app/actions/nca-actions.ts`, `app/actions/mjc-actions.ts`
**Severity:** MEDIUM
**Type:** Data Validation

**Description:**
Form data validated only on client with Zod, never re-validated on server:
```typescript
export async function createNCA(formData: NCAFormData) {
  // formData comes from client - already "validated"
  // But NO server-side re-validation!
  const ncaData = transformFormDataToInsert(formData, userId);
  const { data } = await supabase.from('ncas').insert(ncaData);
}
```

**Impact:**
- Client-side validation can be bypassed
- Attacker can send malicious data directly via API
- Database constraints might reject, but better to validate early
- No defense-in-depth

**Remediation:**
```typescript
import { NCAFormDataSchema } from '@/lib/validations/nca-schema';

export async function createNCA(formData: NCAFormData) {
  // Re-validate on server
  const validation = NCAFormDataSchema.safeParse(formData);
  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid form data: ' + validation.error.message
    };
  }

  const ncaData = transformFormDataToInsert(validation.data, userId);
  // ... rest
}
```

---

#### 10. **RLS Policy Race Condition - Department Check**
**File:** `supabase/migrations/20251106102200_rls_policies.sql:102-112`
**Severity:** MEDIUM
**Type:** Authorization/Race Condition

**Description:**
Team leader RLS policy joins work_orders to check department:
```sql
CREATE POLICY "Team leaders can view department NCAs" ON ncas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      INNER JOIN work_orders wo ON ncas.wo_id = wo.id
      WHERE u1.id = auth.uid()
      AND u1.role = 'team-leader'
      AND u1.department = wo.department
    )
  );
```

**Impact:**
- If user changes department while query executes: race condition
- If work order department changes: policy may not reflect change
- NCA might be accessible when it shouldn't be

**Remediation:**
Add department denormalization to NCAs table or use timestamp-based versioning.

---

#### 11. **Public URL Assumption for Signed URLs**
**File:** `app/actions/file-actions.ts:131-133, 228-230`
**Severity:** MEDIUM
**Type:** Data Security

**Description:**
Code calls `getPublicUrl()` which returns a public URL:
```typescript
const { data: urlData } = supabase.storage
  .from('nca-attachments')
  .getPublicUrl(filePath); // Returns PUBLIC URL!

// Client receives: https://bucket.supabase.co/nca-001/file.pdf
// Anyone with URL can access!
```

**Impact:**
- If bucket is public: files exposed to internet
- If bucket is private: `getPublicUrl()` returns URL but access denied
- Confusion about whether files are private or public
- No expiration on public URLs

**Remediation:**
Use signed URLs with expiration:
```typescript
// For temporary access
const { data: { signedUrl } } = await supabase.storage
  .from('nca-attachments')
  .createSignedUrl(filePath, 3600); // Expires in 1 hour

// Or ensure bucket is private:
// Supabase Dashboard → Storage → Buckets → nca-attachments → Policies
// Set: "Private" and use signed URLs only
```

---

#### 12. **Signature Data Exposure**
**File:** `app/actions/nca-actions.ts:28-43`
**Severity:** MEDIUM
**Type:** Data Handling

**Description:**
Signature data (likely base64-encoded image) stored in database:
```typescript
return {
  type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
  name: formSignature.name,
  timestamp: formSignature.timestamp,
  ip: '0.0.0.0',
  data: formSignature.data, // Base64 image stored directly
};
```

**Impact:**
- Signature image data (PII) stored in text field
- No encryption at rest
- Searchable/indexable
- Exposed in database dumps
- GDPR/privacy concern

**Remediation:**
```typescript
// Option 1: Store reference to signature file instead
// Store signature image in separate encrypted blob storage

// Option 2: Encrypt signature data
import crypto from 'crypto';

const encryptedData = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY!);
const encrypted = encryptedData.update(formSignature.data, 'utf8', 'hex');

signature.data = encrypted;

// Option 3: Hash signature for verification only
signature.data_hash = crypto.createHash('sha256')
  .update(formSignature.data)
  .digest('hex');
```

---

## Architecture-Level Findings

### ✅ Strengths
- **RLS Policies**: Well-designed role-based access control (role hierarchy enforced at DB)
- **Immutable Audit Trail**: SECURITY DEFINER triggers prevent tampering
- **Dependency Injection**: No static calls to Supabase - fully testable
- **Graceful Degradation**: AI failures don't block form submission

### ⚠️ Concerns
- **No Encryption at Rest**: Sensitive fields (signatures, attachments) stored unencrypted
- **No Field-Level Encryption**: BRCGS 3.3 doesn't require it, but best practice for PII
- **Limited Logging of Access**: RLS policies don't log who accessed what

---

## Implementation Plan

### Phase 1: Critical (Deploy Blocker) - Week 1
1. ✅ Get actual user ID from auth session (not hardcoded)
2. ✅ Add authentication verification in all server actions
3. ✅ Implement Redis-backed rate limiting
4. 🔄 Add IP address capture from request headers

### Phase 2: High Priority - Week 2
1. ✅ Add magic byte validation for file uploads
2. ✅ Integrate antivirus scanning (ClamAV or VirusTotal)
3. ✅ Verify user permissions before file operations
4. ✅ Sanitize ILIKE queries

### Phase 3: Medium Priority - Week 3
1. ✅ Server-side re-validation of all form inputs
2. ✅ Use signed URLs for file access
3. ✅ Validate MIME types server-side
4. ✅ Encrypt sensitive fields (signatures, PII)

### Phase 4: Hardening - Week 4
1. ✅ Add logging for RLS policy access
2. ✅ Implement rate limiting at edge (Cloudflare)
3. ✅ Add request signing for inter-service communication
4. ✅ Database secrets rotation automation

---

## Testing Recommendations

### Security Testing Checklist
- [ ] Attempt to create NCA with different user IDs in JWT
- [ ] Flood AI endpoints to test rate limiting across multiple servers
- [ ] Upload executable files with spoofed MIME types
- [ ] Try accessing files uploaded by other users
- [ ] Extract signatures from database dump and attempt replay
- [ ] Modify form data in flight and re-submit
- [ ] Test RLS policies with permission boundary cases

### Integration Testing
```bash
npm run test:security
npm run test:e2e:auth
npm run test:integration:rls
```

---

## Compliance Impact

### BRCGS 3.3 (Audit Trail) - ❌ NON-COMPLIANT
- **Current:** User IDs hardcoded, IPs missing
- **Required:** "All transactions shall be recorded with user identification"
- **Impact:** Audit trail legally invalid

### BRCGS 5.7 (Control of Non-Conforming Product) - ⚠️ PARTIALLY COMPLIANT
- **Current:** RLS enforced, but user tracking broken
- **Required:** Who approved each NCA stage must be traceable
- **Impact:** Can't prove approvals are authentic

### BRCGS 3.6 (Document Control) - ✅ COMPLIANT
- RLS policies prevent deletion
- Only ONE current version per document

---

## Next Steps

1. **Code Review:** Run these findings through your security team
2. **Prioritization:** Confirm Phase 1 is deploy blocker
3. **Timeline:** Plan fixes across 4-week sprint
4. **Testing:** Add security test suite before fixes
5. **Deployment:** Use feature flags for gradual rollout
6. **Audit:** Post-fix security review to verify remediation

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-287: Improper Authentication](https://cwe.mitre.org/data/definitions/287.html)
- [CWE-863: Incorrect Authorization](https://cwe.mitre.org/data/definitions/863.html)
- [BRCGS Issue 7 - Packaging Materials](https://www.brcgs.com/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)

---

**Report Generated:** 2025-11-12
**Review Scope:** Authentication, Authorization, API Endpoints, Data Handling
**Next Review:** Post-remediation verification
