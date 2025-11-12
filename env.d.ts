/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // Next.js
    readonly NODE_ENV: 'development' | 'production' | 'test';
    readonly NEXT_PUBLIC_SUPABASE_URL: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY: string;

    // Supabase
    readonly SUPABASE_SERVICE_ROLE_KEY: string;

    // Anthropic AI
    readonly ANTHROPIC_API_KEY: string;

    // Email (Resend)
    readonly RESEND_API_KEY?: string;

    // Analytics (optional)
    readonly ANALYZE?: string;

    // AI Configuration
    readonly AI_CONFIG?: string;
  }
}

// Make this file a module
export {};
