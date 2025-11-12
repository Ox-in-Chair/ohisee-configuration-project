# Security Remediation Guide

**Status:** Implementation Steps for Critical & High-Priority Vulnerabilities
**Target Completion:** 4 weeks
**Testing Required:** Each fix requires unit + integration test

---

## Fix #1: Hardcoded User ID → Real Authentication

### Current Problem
```typescript
// app/actions/nca-actions.ts:271
const userId = '10000000-0000-0000-0000-000000000001'; // TODO: Get from auth
```

### Step-by-Step Fix

**Step 1:** Update `createServerClient()` to optionally accept request headers
```typescript
// lib/database/client.ts

export async function getAuthenticatedUser() {
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('User not authenticated');
  }

  return user;
}
```

**Step 2:** Update all server actions to use authenticated user
```typescript
// app/actions/nca-actions.ts

export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
    const supabase = createServerClient();

    // ✅ GET REAL USER FROM AUTH
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // ✅ USE REAL USER ID
    const userId = user.id;

    // Transform and create...
    const ncaData = transformFormDataToInsert(formData, userId);
    // ... rest of function
  } catch (error) {
    console.error('Unexpected error creating NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
```

**Step 3:** Apply same fix to other files
- `app/actions/mjc-actions.ts` (line 365)
- `app/actions/waste-actions.ts`
- `app/actions/end-of-day-actions.ts`
- `app/actions/complaint-actions.ts`

**Step 4:** Test
```typescript
// lib/actions/__tests__/nca-actions.test.ts

describe('createNCA with authentication', () => {
  it('should use authenticated user ID', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null
        })
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'nca-1', nca_number: 'NCA-2025-12345678' },
              error: null
            })
          })
        })
      })
    };

    const result = await createNCA(validFormData);

    expect(result.success).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('ncas');
    // Verify user ID in insert data
  });
});
```

---

## Fix #2: In-Memory Rate Limiter → Redis

### Current Problem
```typescript
// lib/ai/rate-limiter.ts:24
private readonly storage: Map<string, RateLimitEntry>;
```

### Step-by-Step Fix

**Step 1:** Install Redis client
```bash
npm install redis
```

**Step 2:** Create Redis-backed rate limiter
```typescript
// lib/ai/redis-rate-limiter.ts

import { createClient, RedisClientType } from 'redis';
import { IRateLimiter } from './ai-service.interface';

interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  redis_url?: string;
}

export class RedisRateLimiter implements IRateLimiter {
  private readonly client: RedisClientType;
  private readonly limits: RateLimitConfig;
  private connected = false;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.limits = {
      requests_per_minute: config.requests_per_minute ?? 10,
      requests_per_hour: config.requests_per_hour ?? 100
    };

    this.client = createClient({
      url: config.redis_url || process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => console.error('Redis error:', err));
    this.connect();
  }

  private async connect() {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (err) {
      console.error('Failed to connect to Redis:', err);
      // Fallback to in-memory if Redis unavailable (with warning)
    }
  }

  async checkLimit(user_id: string): Promise<boolean> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping rate limit');
      return true; // Fail open
    }

    const now = Date.now();
    const minuteKey = `rate-limit:${user_id}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `rate-limit:${user_id}:hour:${Math.floor(now / 3600000)}`;

    const [minuteCount, hourCount] = await Promise.all([
      this.client.incr(minuteKey),
      this.client.incr(hourKey)
    ]);

    // Set expiration on new keys
    if (minuteCount === 1) {
      await this.client.expire(minuteKey, 60);
    }
    if (hourCount === 1) {
      await this.client.expire(hourKey, 3600);
    }

    const withinMinuteLimit = minuteCount <= this.limits.requests_per_minute;
    const withinHourLimit = hourCount <= this.limits.requests_per_hour;

    return withinMinuteLimit && withinHourLimit;
  }

  async recordRequest(user_id: string): Promise<void> {
    // Already recorded in checkLimit
  }

  async getRemainingRequests(user_id: string): Promise<number> {
    if (!this.connected) return this.limits.requests_per_minute;

    const now = Date.now();
    const minuteKey = `rate-limit:${user_id}:minute:${Math.floor(now / 60000)}`;

    const count = await this.client.get(minuteKey);
    return Math.max(0, this.limits.requests_per_minute - (parseInt(count || '0')));
  }

  async resetLimits(user_id: string): Promise<void> {
    if (!this.connected) return;

    const keys = await this.client.keys(`rate-limit:${user_id}:*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  getConfig(): RateLimitConfig {
    return { ...this.limits };
  }

  updateConfig(config: Partial<RateLimitConfig>): void {
    if (config.requests_per_minute !== undefined) {
      this.limits.requests_per_minute = config.requests_per_minute;
    }
    if (config.requests_per_hour !== undefined) {
      this.limits.requests_per_hour = config.requests_per_hour;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.disconnect();
    }
  }
}
```

**Step 3:** Update AI service factory
```typescript
// lib/ai/factory.ts

import { RedisRateLimiter } from './redis-rate-limiter';

export function createAIService() {
  const rateLimiter = new RedisRateLimiter({
    redis_url: process.env.REDIS_URL
  });

  return new AIService(
    createAnthropicClient(),
    createKnowledgeBaseService(),
    createAuditLogger(),
    rateLimiter
  );
}
```

**Step 4:** Environment setup
```bash
# .env.local
REDIS_URL=redis://:password@redis-server:6379
# Or for Redis Cloud:
REDIS_URL=rediss://default:password@host:port
```

**Step 5:** Test
```typescript
// lib/ai/__tests__/redis-rate-limiter.test.ts

describe('RedisRateLimiter', () => {
  let limiter: RedisRateLimiter;

  beforeEach(() => {
    limiter = new RedisRateLimiter({
      requests_per_minute: 3,
      redis_url: process.env.REDIS_TEST_URL
    });
  });

  it('should enforce rate limits across requests', async () => {
    const userId = 'test-user-' + Date.now();

    // First 3 requests allowed
    expect(await limiter.checkLimit(userId)).toBe(true);
    expect(await limiter.checkLimit(userId)).toBe(true);
    expect(await limiter.checkLimit(userId)).toBe(true);

    // 4th request blocked
    expect(await limiter.checkLimit(userId)).toBe(false);

    // After 60 seconds, resets
    await new Promise(r => setTimeout(r, 60100));
    expect(await limiter.checkLimit(userId)).toBe(true);
  });
});
```

---

## Fix #3: Missing IP Address Capture

### Current Problem
```typescript
// app/actions/nca-actions.ts:40
ip: '0.0.0.0', // TODO: Get real IP from request headers
```

### Step-by-Step Fix

**Step 1:** Create IP extraction utility
```typescript
// lib/utils/ip-extractor.ts

import { headers } from 'next/headers';

export async function getClientIP(): Promise<string> {
  try {
    const headersList = await headers();

    // Check X-Forwarded-For (proxy)
    const forwarded = headersList.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    // Check X-Real-IP (nginx)
    const xRealIp = headersList.get('x-real-ip');
    if (xRealIp) {
      return xRealIp;
    }

    // Check Cloudflare
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback
    return '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

// Validate IP format
export function isValidIP(ip: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  const ipv6 = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(ip);
  return ipv4 || ipv6;
}
```

**Step 2:** Update signature transformation
```typescript
// app/actions/nca-actions.ts

import { getClientIP } from '@/lib/utils/ip-extractor';

function transformSignature(formSignature: {
  type: 'manual' | 'digital';
  data: string;
  name: string;
  timestamp: string;
} | null | undefined): Promise<Signature | null> {
  if (!formSignature) return Promise.resolve(null);

  return (async () => {
    const clientIP = await getClientIP();

    return {
      type: formSignature.type === 'manual' ? 'drawn' : 'uploaded',
      name: formSignature.name,
      timestamp: formSignature.timestamp,
      ip: clientIP, // ✅ REAL IP
      data: formSignature.data,
    };
  })();
}
```

**Step 3:** Update all callers (async)
```typescript
export async function createNCA(formData: NCAFormData) {
  // ... auth check ...

  // ✅ Await signature transformation
  const ncaData = await transformFormDataToInsertAsync(formData, userId);
}
```

---

## Fix #4: File Upload Malware Scanning

### Step 1: Add Magic Byte Validation
```typescript
// lib/utils/file-validator.ts

const MAGIC_BYTES: Record<string, Buffer> = {
  'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),             // FFD8FF
  'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]),        // 89PNG
  'image/gif': Buffer.from([0x47, 0x49, 0x46]),              // GIF
};

export async function validateFileMagicBytes(
  file: File,
  expectedType: string
): Promise<boolean> {
  if (!MAGIC_BYTES[expectedType]) {
    // Unknown type, can't validate magic bytes
    return true; // Allow if no signature known
  }

  const buffer = await file.slice(0, 512).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const magic = MAGIC_BYTES[expectedType];

  // Check if file starts with expected magic bytes
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) {
      return false;
    }
  }

  return true;
}
```

### Step 2: Add VirusTotal Integration
```typescript
// lib/services/virus-scan-service.ts

interface VirusTotalResponse {
  data: {
    attributes: {
      last_analysis_stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
      };
    };
  };
}

export async function scanFileForViruses(file: File): Promise<{
  safe: boolean;
  score: number;
  details?: string;
}> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    console.warn('VirusTotal API key not configured');
    return { safe: true, score: 0 }; // Fail open
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      'https://www.virustotal.com/api/v3/files',
      {
        method: 'POST',
        headers: {
          'x-apikey': apiKey
        },
        body: formData
      }
    );

    if (!response.ok) {
      console.error('VirusTotal API error:', response.statusText);
      return { safe: true, score: 0 }; // Fail open
    }

    const result: VirusTotalResponse = await response.json();
    const stats = result.data.attributes.last_analysis_stats;
    const maliciousCount = stats.malicious + stats.suspicious;

    return {
      safe: maliciousCount === 0,
      score: maliciousCount,
      details: `${maliciousCount} detections`
    };
  } catch (error) {
    console.error('Virus scan error:', error);
    return { safe: true, score: 0 }; // Fail open
  }
}
```

### Step 3: Update file upload action
```typescript
// app/actions/file-actions.ts

import { validateFileMagicBytes } from '@/lib/utils/file-validator';
import { scanFileForViruses } from '@/lib/services/virus-scan-service';

export async function uploadNCAFile(
  ncaId: string,
  formData: FormData
): Promise<ActionResponse<{ path: string; url: string }>> {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds 10MB limit`
      };
    }

    // Validate MIME type
    if (!NCA_ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `File type not allowed: ${file.type}`
      };
    }

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
        error: `File flagged as potentially malicious (${scanResult.details})`
      };
    }

    // Verify NCA exists and user has permission
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: nca } = await supabase
      .from('ncas')
      .select('id, created_by')
      .eq('id', ncaId)
      .single();

    if (!nca) {
      return { success: false, error: 'NCA not found' };
    }

    // ✅ CHECK USER PERMISSION
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

    // ✅ USE VALIDATED CONTENT TYPE
    const MIME_TYPE_MAP: Record<string, string> = {
      'image/jpeg': 'image/jpeg',
      'image/png': 'image/png',
      'image/gif': 'image/gif',
      'image/webp': 'image/webp',
      'application/pdf': 'application/pdf',
      'application/msword': 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain': 'text/plain',
      'text/csv': 'text/csv',
    };

    const safeContentType = MIME_TYPE_MAP[file.type] || 'application/octet-stream';

    // Generate safe filename
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${ncaId}/${timestamp}_${safeFilename}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('nca-attachments')
      .upload(filePath, file, {
        contentType: safeContentType, // ✅ VALIDATED TYPE
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }

    // ✅ USE SIGNED URL FOR PRIVATE ACCESS
    const { data: { signedUrl } } = await supabase.storage
      .from('nca-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    revalidatePath(`/nca/${ncaId}`);

    return {
      success: true,
      data: {
        path: uploadData.path,
        url: signedUrl // ✅ SIGNED URL, NOT PUBLIC
      }
    };
  } catch (error) {
    console.error('Unexpected error uploading NCA file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
```

---

## Fix #5: Server-Side Input Validation

```typescript
// app/actions/nca-actions.ts

import { NCAFormDataSchema, type NCAFormData } from '@/lib/validations/nca-schema';

export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
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

    // Get authenticated user
    const supabase = createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Transform validated data
    const ncaData = transformFormDataToInsert(validatedData, user.id);

    // Insert...
  } catch (error) {
    console.error('Unexpected error creating NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
```

---

## Testing Each Fix

```bash
# Phase 1 testing
npm run test -- nca-actions.test.ts
npm run test -- redis-rate-limiter.test.ts
npm run test -- ip-extractor.test.ts

# Integration testing
npm run test:integration -- app/actions

# E2E testing
npm run test:e2e -- security.spec.ts
```

---

## Deployment Checklist

- [ ] All critical fixes implemented
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E security tests passing
- [ ] Code review completed
- [ ] Redis infrastructure deployed
- [ ] VirusTotal API key configured
- [ ] Environment variables set
- [ ] RLS policies verified
- [ ] Audit trail logging confirmed
- [ ] Load testing completed
- [ ] Security team sign-off obtained

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 weeks for all fixes
**Next Steps:** Start with Phase 1 (critical) fixes first
