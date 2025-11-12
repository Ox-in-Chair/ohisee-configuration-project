/**
 * Form Header Component
 * Displays form number, procedure reference, BRCGS reference, and controlled status
 * Used across all NCA views for compliance and audit traceability
 */

interface FormHeaderProps {
  formNumber?: string;
  procedureReference?: string;
  procedureRevision?: string;
  brcgsReference?: string;
  revisionDate?: string;
  className?: string;
}

export function FormHeader({
  formNumber = '5.7F1',
  procedureReference = '5.7',
  procedureRevision = 'Rev 9',
  brcgsReference = 'BRCGS Issue 7 Section 5',
  revisionDate,
  className = '',
}: FormHeaderProps) {
  const displayRevisionDate = revisionDate || new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={`border-b border-gray-200 bg-gray-50 px-6 py-4 ${className}`}
      data-testid="nca-form-header"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-900">
            <span>Form {formNumber}</span>
            <span className="text-gray-400">|</span>
            <span>Procedure {procedureReference} {procedureRevision}</span>
            <span className="text-gray-400">|</span>
            <span>{brcgsReference}</span>
          </div>
          <div className="text-xs text-gray-600">
            Non-Conformance Advice (NCA) - Controlled Document
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-gray-600">
          <div>Controlled Status: Current</div>
          <div>Revision Date: {displayRevisionDate}</div>
        </div>
      </div>
    </div>
  );
}


