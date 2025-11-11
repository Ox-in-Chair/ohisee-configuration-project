'use client';

/**
 * Signature Capture Component
 * 
 * Provides a canvas-based signature pad for capturing digital signatures.
 * Supports touch and mouse input for tablet and desktop use.
 * 
 * Features:
 * - HTML5 Canvas drawing
 * - Touch and mouse support
 * - Clear button to restart
 * - Base64 image export
 * - Timestamp and metadata capture
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Check } from 'lucide-react';

interface SignatureCaptureProps {
  label?: string;
  value?: string | null;
  onChange: (signature: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SignatureCapture({
  label = 'Digital Signature',
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
      };
      img.src = value;
    }
  }, [value]);

  // Get coordinates from event (mouse or touch)
  const getCoordinates = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
    },
    [disabled, getCoordinates]
  );

  // Draw
  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing || disabled) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const coords = getCoordinates(e);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    },
    [isDrawing, disabled, getCoordinates]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export signature as base64
    const dataUrl = canvas.toDataURL('image/png');
    setHasSignature(true);
    onChange(dataUrl);
  }, [isDrawing, onChange]);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    onChange(null);
  }, [onChange]);

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch event handlers
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing, disabled]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] touch-none cursor-crosshair"
          style={{ minHeight: '200px' }}
          aria-label="Signature canvas"
        />

        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400">Sign here</p>
          </div>
        )}

        {hasSignature && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-2 bg-white/90 px-2 py-1 rounded border border-gray-200">
              <Check className="h-4 w-4 text-success-600" />
              <span className="text-xs text-gray-600">Signed</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Use your finger, stylus, or mouse to sign
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
          disabled={!hasSignature || disabled}
          className="h-8"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>
    </div>
  );
}

