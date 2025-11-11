'use client';

/**
 * Close Work Order Button Component
 * Handles work order closure with validation
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { closeWorkOrder } from '@/app/actions/work-order-actions';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface CloseWorkOrderButtonProps {
  woId: string;
  hasOpenIssues: boolean;
  openNCAsCount: number;
  openMJCsCount: number;
}

export function CloseWorkOrderButton({
  woId,
  hasOpenIssues,
  openNCAsCount,
  openMJCsCount,
}: CloseWorkOrderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [forceClose, setForceClose] = useState(false);
  const router = useRouter();

  const handleClose = async () => {
    setIsClosing(true);
    const result = await closeWorkOrder(woId, 'current-user', forceClose);

    if (result.success) {
      router.push('/dashboard/production');
      router.refresh();
    } else {
      alert(result.error || 'Failed to close work order');
      setIsClosing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant={hasOpenIssues ? 'destructive' : 'default'}
        disabled={isClosing}
      >
        {hasOpenIssues ? 'Force Close Work Order' : 'Close Work Order'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Work Order</DialogTitle>
            <DialogDescription>
              {hasOpenIssues
                ? 'This work order has open issues. You can force close it, but this is not recommended.'
                : 'Are you sure you want to close this work order?'}
            </DialogDescription>
          </DialogHeader>

          {hasOpenIssues && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-800">Open Issues Detected</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {openNCAsCount} open NCA(s) and {openMJCsCount} open MJC(s) are linked to this
                    work order. It is recommended to resolve all issues before closing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasOpenIssues && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="forceClose"
                checked={forceClose}
                onChange={(e) => setForceClose(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="forceClose" className="text-sm text-gray-700">
                I understand the risks and want to force close this work order
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isClosing}>
              Cancel
            </Button>
            <Button
              onClick={handleClose}
              disabled={isClosing || (hasOpenIssues && !forceClose)}
              variant={hasOpenIssues ? 'destructive' : 'default'}
            >
              {isClosing ? 'Closing...' : hasOpenIssues ? 'Force Close' : 'Close Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

