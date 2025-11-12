/**
 * Form Footer Component
 * Displays controlled document footer with page numbers for PDF exports
 * Used across all NCA views for compliance and audit traceability
 */

interface FormFooterProps {
  pageNumber?: number;
  totalPages?: number;
  className?: string;
  showPageNumbers?: boolean;
}

export function FormFooter({
  pageNumber,
  totalPages,
  className = '',
  showPageNumbers = true,
}: FormFooterProps) {
  return (
    <div
      className={`border-t border-gray-200 bg-gray-50 px-6 py-3 ${className}`}
      data-testid="nca-form-footer"
    >
      <div className="flex flex-col gap-1 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <div>
            Kangopak (Pty) Ltd - BRCGS Certified | Controlled Document - Do Not Copy
          </div>
          {showPageNumbers && pageNumber && totalPages ? <div className="font-medium">
              Page {pageNumber} of {totalPages}
            </div> : null}
        </div>
        <div className="text-xs text-gray-500">
          This document is a controlled record under the Product Safety and Quality Management
          System (PS & QMS)
        </div>
      </div>
    </div>
  );
}


