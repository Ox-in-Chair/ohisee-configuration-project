/**
 * Concrete Implementations
 * Node.js-specific implementations of injectable interfaces
 */

import fs from 'fs';
import type { IFileReader, ILogger } from './types';

/**
 * Node.js File Reader Implementation
 */
export class NodeFileReader implements IFileReader {
  async readFile(filePath: string, encoding: string): Promise<string> {
    return fs.promises.readFile(filePath, encoding as BufferEncoding);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Console Logger Implementation
 */
export class ConsoleLogger implements ILogger {
  info(message: string, context?: any): void {
    if (context) {
      console.log(`ℹ️  ${message}`, context);
    } else {
      console.log(`ℹ️  ${message}`);
    }
  }

  error(message: string, error?: any): void {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  }

  warn(message: string, context?: any): void {
    if (context) {
      console.warn(`⚠️  ${message}`, context);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }
}

/**
 * Supabase Client Adapter
 * Wraps real Supabase client to match ISupabaseClient interface
 */
export class SupabaseClientAdapter {
  constructor(private client: any) {}

  from(table: string) {
    return this.client.from(table);
  }
}
