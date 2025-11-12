'use client';

/**
 * OHiSee File Upload Component
 * Reusable drag-and-drop file upload with preview and management
 * Architecture: Uses Server Actions via dependency injection
 */

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * File item type
 */
interface FileItem {
  name: string;
  size: number;
  created_at: string;
}

/**
 * FileUpload component props
 */
interface FileUploadProps {
  /**
   * Entity ID (NCA or MJC UUID)
   */
  entityId: string | null;

  /**
   * Upload type (nca or mjc)
   */
  uploadType: 'nca' | 'mjc';

  /**
   * Upload function (Server Action)
   */
  onUpload: (entityId: string, formData: FormData) => Promise<{ success: boolean; error?: string }>;

  /**
   * Delete function (Server Action)
   */
  onDelete: (entityId: string, filename: string) => Promise<{ success: boolean; error?: string }>;

  /**
   * List function (Server Action)
   */
  onList: (entityId: string) => Promise<{ success: boolean; data?: FileItem[]; error?: string }>;

  /**
   * Label for the upload area
   */
  label?: string;

  /**
   * Allowed file types (for validation display)
   */
  allowedTypes?: string[];

  /**
   * Max file size in MB
   */
  maxSizeMB?: number;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100  } ${  sizes[i]}`;
}

/**
 * FileUpload Component
 */
export function FileUpload({
  entityId,
  uploadType,
  onUpload,
  onDelete,
  onList,
  label = 'Attachments',
  allowedTypes = ['PDF', 'Images', 'Word', 'Excel', 'Text'],
  maxSizeMB = 10,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Load files when entity ID changes
   */
  const loadFiles = useCallback(async () => {
    if (!entityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onList(entityId);
      if (result.success && result.data) {
        setFiles(result.data);
      } else {
        setError(result.error || 'Failed to load files');
      }
    } catch (err) {
      setError('Unexpected error loading files');
      console.error('Load files error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, onList]);


  /**
   * Handle file upload
   */
  const handleUpload = async (file: File) => {
    if (!entityId) {
      setError('Cannot upload: entity not saved yet');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await onUpload(entityId, formData);

      if (result.success) {
        // Reload file list
        await loadFiles();
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Unexpected error during upload');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle file deletion
   */
  const handleDelete = async (filename: string) => {
    if (!entityId) return;

    setError(null);

    try {
      const result = await onDelete(entityId, filename);

      if (result.success) {
        // Reload file list
        await loadFiles();
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (err) {
      setError('Unexpected error during deletion');
      console.error('Delete error:', err);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles[0]); // Upload first file only
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleUpload(selectedFiles[0]); // Upload first file only
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {files.length > 0 && (
          <span className="text-xs text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Upload Area */}
      {!entityId ? (
        <Card className="p-6 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Save the {uploadType.toUpperCase()} first to enable file uploads
          </p>
        </Card>
      ) : (
        <Card
          className={`p-6 border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-white'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            {isUploading ? (
              <>
                <Icon name={ICONS.LOADING} size="md" className="text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
                <Icon name={ICONS.UPLOAD} size="md" className="text-gray-400" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Drag and drop a file here, or{' '}
                    <button
                      type="button"
                      onClick={handleBrowseClick}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: {allowedTypes.join(', ')} (max {maxSizeMB}MB)
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isUploading || !entityId}
          />
        </Card>
      )}

      {/* Error Display */}
      {error ? <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div> : null}

      {/* File List */}
      {entityId ? <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Icon name={ICONS.LOADING} size="md" className="text-gray-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading files...</span>
            </div>
          ) : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <Card key={file.name} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <Icon name={ICONS.FILE_ICON} size="md" className="text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.name)}
                      className="flex-shrink-0 ml-2"
                    >
                      <Icon name={ICONS.CLOSE} size="sm" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No files uploaded yet</p>
          )}
        </div> : null}

      {/* Load Files Button (for initial load) */}
      {entityId && files.length === 0 && !isLoading ? <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadFiles}
          className="w-full"
        >
          Load Attachments
        </Button> : null}
    </div>
  );
}
