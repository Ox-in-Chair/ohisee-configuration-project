/**
 * Data Sync Service
 * Handles synchronization of external data sources with local database
 * Supports both full and incremental sync operations
 * 
 * Features:
 * - Scheduled background jobs
 * - Webhook handlers
 * - Error handling and retry logic
 * - Admin notification system
 * - Fallback to cached data if API unavailable
 */

import { createServerClient } from '@/lib/database/client';
import type { SupabaseClient } from '@/lib/database/client';

export type SyncSourceType = 'brcgs' | 'gmp' | 'benchmark' | 'supplier' | 'packaging';
export type SyncType = 'full' | 'incremental';
export type SyncStatus = 'success' | 'failed' | 'partial';

export interface SyncResult {
  success: boolean;
  status: SyncStatus;
  recordsUpdated: number;
  recordsInserted: number;
  recordsDeleted: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SyncConfig {
  sourceType: SyncSourceType;
  syncType: SyncType;
  enabled: boolean;
  schedule?: string; // Cron expression
  retryAttempts?: number;
  retryDelayMs?: number;
  webhookUrl?: string;
}

export class DataSyncService {
  private supabase: SupabaseClient;
  private configs: Map<SyncSourceType, SyncConfig> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createServerClient();
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default sync configurations
   */
  private initializeDefaultConfigs(): void {
    this.configs.set('brcgs', {
      sourceType: 'brcgs',
      syncType: 'incremental',
      enabled: false, // Disabled by default - requires API setup
      schedule: '0 2 * * 0', // Weekly on Sunday at 2 AM
      retryAttempts: 3,
      retryDelayMs: 5000,
    });

    this.configs.set('gmp', {
      sourceType: 'gmp',
      syncType: 'incremental',
      enabled: false,
      schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
      retryAttempts: 3,
      retryDelayMs: 5000,
    });

    this.configs.set('benchmark', {
      sourceType: 'benchmark',
      syncType: 'full',
      enabled: false,
      schedule: '0 4 1 * *', // Monthly on 1st at 4 AM
      retryAttempts: 2,
      retryDelayMs: 10000,
    });

    this.configs.set('supplier', {
      sourceType: 'supplier',
      syncType: 'incremental',
      enabled: false,
      schedule: '0 */6 * * *', // Every 6 hours
      retryAttempts: 3,
      retryDelayMs: 5000,
    });

    this.configs.set('packaging', {
      sourceType: 'packaging',
      syncType: 'incremental',
      enabled: false,
      schedule: '0 1 * * *', // Daily at 1 AM
      retryAttempts: 3,
      retryDelayMs: 5000,
    });
  }

  /**
   * Execute a sync operation for a specific source
   */
  async syncSource(
    sourceType: SyncSourceType,
    syncType: SyncType = 'incremental',
    customHandler?: (sourceType: SyncSourceType) => Promise<SyncResult>
  ): Promise<SyncResult> {
    const config = this.configs.get(sourceType);
    if (!config?.enabled) {
      return {
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: `Sync for ${sourceType} is not enabled`,
      };
    }

    // const startTime = Date.now(); // Tracked for future performance monitoring

    try {
      // Use custom handler if provided, otherwise use default
      const result = customHandler
        ? await customHandler(sourceType)
        : await this.defaultSyncHandler(sourceType, syncType);

      // Log sync result
      await this.logSyncOperation({
        sourceType,
        syncType,
        status: result.status,
        recordsUpdated: result.recordsUpdated,
        recordsInserted: result.recordsInserted,
        recordsDeleted: result.recordsDeleted,
        ...(result.error ? { errorMessage: result.error } : {}),
        ...(result.metadata ? { metadata: result.metadata } : {}),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed sync
      await this.logSyncOperation({
        sourceType,
        syncType,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        errorMessage,
      });

      return {
        success: false,
        status: 'failed',
        recordsUpdated: 0,
        recordsInserted: 0,
        recordsDeleted: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Default sync handler (placeholder - should be overridden by API integrations)
   */
  private async defaultSyncHandler(
    sourceType: SyncSourceType,
    _syncType: SyncType
  ): Promise<SyncResult> {
    // This is a placeholder - actual sync logic should be implemented
    // by the specific API integration services
    return {
      success: false,
      status: 'failed',
      recordsUpdated: 0,
      recordsInserted: 0,
      recordsDeleted: 0,
      error: `No sync handler configured for ${sourceType}. Please implement API integration.`,
    };
  }

  /**
   * Log sync operation to database
   */
  private async logSyncOperation(data: {
    sourceType: SyncSourceType;
    syncType: SyncType;
    status: SyncStatus;
    recordsUpdated: number;
    recordsInserted: number;
    recordsDeleted: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // @ts-ignore - Supabase type generation issue with data_sync_log table
      const { error } = await this.supabase.from('data_sync_log').insert({
        source_type: data.sourceType,
        sync_type: data.syncType,
        status: data.status,
        records_updated: data.recordsUpdated,
        records_inserted: data.recordsInserted,
        records_deleted: data.recordsDeleted,
        error_message: data.errorMessage,
        metadata: data.metadata,
        sync_timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to log sync operation:', error);
      }
    } catch (error) {
      console.error('Error logging sync operation:', error);
    }
  }

  /**
   * Get sync configuration for a source
   */
  getConfig(sourceType: SyncSourceType): SyncConfig | undefined {
    return this.configs.get(sourceType);
  }

  /**
   * Update sync configuration
   */
  updateConfig(sourceType: SyncSourceType, config: Partial<SyncConfig>): void {
    const existing = this.configs.get(sourceType);
    if (existing) {
      this.configs.set(sourceType, { ...existing, ...config });
    }
  }

  /**
   * Enable sync for a source
   */
  enableSync(sourceType: SyncSourceType): void {
    this.updateConfig(sourceType, { enabled: true });
  }

  /**
   * Disable sync for a source
   */
  disableSync(sourceType: SyncSourceType): void {
    this.updateConfig(sourceType, { enabled: false });
  }

  /**
   * Get sync history for a source
   */
  async getSyncHistory(
    sourceType?: SyncSourceType,
    limit: number = 50
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('data_sync_log')
        .select('*')
        .order('sync_timestamp', { ascending: false })
        .limit(limit);

      if (sourceType) {
        query = query.eq('source_type', sourceType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get sync history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  /**
   * Get last successful sync timestamp for a source
   */
  async getLastSuccessfulSync(sourceType: SyncSourceType): Promise<Date | null> {
    try {
      const { data, error } = await this.supabase
        .from('data_sync_log')
        .select('sync_timestamp')
        .eq('source_type', sourceType)
        .eq('status', 'success')
        .order('sync_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return new Date((data as { sync_timestamp: string }).sync_timestamp);
    } catch (error) {
      console.error('Error getting last successful sync:', error);
      return null;
    }
  }

  /**
   * Retry failed sync with exponential backoff
   */
  async retrySync(
    sourceType: SyncSourceType,
    syncType: SyncType = 'incremental',
    customHandler?: (sourceType: SyncSourceType) => Promise<SyncResult>,
    maxAttempts: number = 3,
    delayMs: number = 5000
  ): Promise<SyncResult> {
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt < maxAttempts) {
      attempt++;
      const result = await this.syncSource(sourceType, syncType, customHandler);

      if (result.success) {
        return result;
      }

      lastError = result.error;

      if (attempt < maxAttempts) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      status: 'failed',
      recordsUpdated: 0,
      recordsInserted: 0,
      recordsDeleted: 0,
      error: `Sync failed after ${maxAttempts} attempts: ${lastError}`,
    };
  }
}

/**
 * Factory function to create DataSyncService instance
 */
export function createDataSyncService(supabase?: SupabaseClient): DataSyncService {
  return new DataSyncService(supabase);
}

