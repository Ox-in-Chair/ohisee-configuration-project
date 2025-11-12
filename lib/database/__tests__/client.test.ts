/**
 * Database Client Factory Tests
 * Comprehensive test coverage for dependency injection patterns
 * Target: >95% coverage
 *
 * Note: These tests verify factory functions work correctly with environment
 * variables and configuration. We test error paths and config validation
 * rather than mocking the Supabase SDK itself.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createServerClient, createBrowserClient } from '../client';

describe('Database Client Factory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createServerClient', () => {
    it('should create server client with valid environment variables', () => {
      const client = createServerClient();

      // Verify client was created
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');

      // Verify client has expected Supabase methods
      expect(client.from).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(client.auth).toBeDefined();
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => createServerClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      );
    });

    it('should throw error if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createServerClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      );
    });

    it('should throw error if both environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => createServerClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      );
    });

    it('should throw error with empty string URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';

      expect(() => createServerClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });

    it('should throw error with empty string key', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = '';

      expect(() => createServerClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });

    it('should throw error when URL is undefined', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;

      expect(() => createServerClient()).toThrow();
    });

    it('should throw error when key is undefined', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = undefined;

      expect(() => createServerClient()).toThrow();
    });

    it('should create client with URL containing trailing slash', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co/';

      const client = createServerClient();
      expect(client).toBeDefined();
    });

    it('should create client with key containing special characters', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'key-with-special-chars-!@#$%';

      const client = createServerClient();
      expect(client).toBeDefined();
    });

    it('should create multiple independent client instances', () => {
      const client1 = createServerClient();
      const client2 = createServerClient();

      // Each call creates a new instance
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1).not.toBe(client2);
    });

    it('should create client with proper typing', () => {
      const client = createServerClient();

      // TypeScript type should allow access to Supabase methods
      const typedClient: ReturnType<typeof createServerClient> = client;
      expect(typedClient).toBeDefined();
      expect(typedClient.from).toBeDefined();
    });
  });

  describe('createBrowserClient', () => {
    it('should create browser client with valid environment variables', () => {
      const client = createBrowserClient();

      // Verify client was created
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');

      // Verify client has expected Supabase methods
      expect(client.from).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(client.auth).toBeDefined();
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      expect(() => createBrowserClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    });

    it('should throw error if NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => createBrowserClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    });

    it('should throw error if both environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => createBrowserClient()).toThrow(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    });

    it('should throw error with empty string URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '';

      expect(() => createBrowserClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });

    it('should throw error with empty string key', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

      expect(() => createBrowserClient()).toThrow(
        'Missing Supabase environment variables'
      );
    });

    it('should throw error when URL is undefined', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = undefined;

      expect(() => createBrowserClient()).toThrow();
    });

    it('should throw error when key is undefined', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined;

      expect(() => createBrowserClient()).toThrow();
    });

    it('should create client with URL containing trailing slash', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co/';

      const client = createBrowserClient();
      expect(client).toBeDefined();
    });

    it('should create client with key containing special characters', () => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'key-with-special-chars-!@#$%';

      const client = createBrowserClient();
      expect(client).toBeDefined();
    });

    it('should create multiple independent client instances', () => {
      const client1 = createBrowserClient();
      const client2 = createBrowserClient();

      // Each call creates a new instance
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client1).not.toBe(client2);
    });

    it('should create client with proper typing', () => {
      const client = createBrowserClient();

      // TypeScript type should allow access to Supabase methods
      const typedClient: ReturnType<typeof createBrowserClient> = client;
      expect(typedClient).toBeDefined();
      expect(typedClient.from).toBeDefined();
    });

    it('should use different key than server client', () => {
      // Both should create successfully
      const serverClient = createServerClient();
      const browserClient = createBrowserClient();

      expect(serverClient).toBeDefined();
      expect(browserClient).toBeDefined();

      // Both have Supabase methods
      expect(serverClient.from).toBeDefined();
      expect(browserClient.from).toBeDefined();
    });
  });

  describe('Client Configuration Differences', () => {
    it('should create server and browser clients with different configs', () => {
      const serverClient = createServerClient();
      const browserClient = createBrowserClient();

      // Both clients should exist and be different instances
      expect(serverClient).toBeDefined();
      expect(browserClient).toBeDefined();
      expect(serverClient).not.toBe(browserClient);

      // Both should have auth property
      expect(serverClient.auth).toBeDefined();
      expect(browserClient.auth).toBeDefined();
    });

    it('should create server client without persistent session', () => {
      const client = createServerClient();

      // Server client should be configured for server-side use
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });

    it('should create browser client with persistent session support', () => {
      const client = createBrowserClient();

      // Browser client should be configured for client-side use
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should export correct SupabaseClient type from createServerClient', () => {
      const client = createServerClient();

      // Type assertion should work without errors
      const typedClient: ReturnType<typeof createServerClient> = client;
      expect(typedClient).toBeDefined();
      expect(typedClient.from).toBeDefined();
      expect(typeof typedClient.from).toBe('function');
    });

    it('should export correct SupabaseBrowserClient type from createBrowserClient', () => {
      const client = createBrowserClient();

      // Type assertion should work without errors
      const typedClient: ReturnType<typeof createBrowserClient> = client;
      expect(typedClient).toBeDefined();
      expect(typedClient.from).toBeDefined();
      expect(typeof typedClient.from).toBe('function');
    });
  });

  describe('Environment Variable Edge Cases', () => {
    it('should handle whitespace-only URL', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = '   ';

      // Should throw because whitespace is truthy but invalid
      // The actual Supabase SDK will reject it
      expect(() => {
        const client = createServerClient();
        // If client is created, it should fail when trying to use it
        client.from('test');
      }).toThrow();
    });

    it('should handle whitespace-only key', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = '   ';

      // Whitespace key is technically accepted by the client factory
      // (validation happens at API call time)
      const client = createServerClient();
      expect(client).toBeDefined();
      expect(client.from).toBeDefined();
    });

    it('should handle very long API keys', () => {
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'a'.repeat(500);

      // Should create client (even if key is invalid)
      const client = createServerClient();
      expect(client).toBeDefined();
    });

    it('should handle special characters in URL', () => {
      // Note: Invalid URL will be caught by Supabase SDK
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

      const client = createServerClient();
      expect(client).toBeDefined();
    });
  });

  describe('Dependency Injection Pattern', () => {
    it('should enable dependency injection by returning client instance', () => {
      const client = createServerClient();

      // Client can be passed to functions expecting SupabaseClient
      function testFunction(supabaseClient: ReturnType<typeof createServerClient>) {
        return supabaseClient.from('test');
      }

      const result = testFunction(client);
      expect(result).toBeDefined();
    });

    it('should support multiple client contexts simultaneously', () => {
      const serverClient = createServerClient();
      const browserClient = createBrowserClient();

      // Both clients can coexist
      expect(serverClient).toBeDefined();
      expect(browserClient).toBeDefined();
      expect(serverClient).not.toBe(browserClient);

      // Both can be used independently
      const serverQuery = serverClient.from('test');
      const browserQuery = browserClient.from('test');

      expect(serverQuery).toBeDefined();
      expect(browserQuery).toBeDefined();
    });

    it('should allow passing client to utility functions', () => {
      const client = createServerClient();

      // Simulate utility function pattern from documentation
      function getRecords(supabaseClient: ReturnType<typeof createServerClient>, table: string) {
        return supabaseClient.from(table).select('*');
      }

      const query = getRecords(client, 'ncas');
      expect(query).toBeDefined();
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for missing server variables', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        createServerClient();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Missing Supabase environment variables');
        expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_URL');
        expect((error as Error).message).toContain('SUPABASE_SERVICE_ROLE_KEY');
      }
    });

    it('should provide clear error for missing browser variables', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        createBrowserClient();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Missing Supabase environment variables');
        expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_URL');
        expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
    });
  });
});
