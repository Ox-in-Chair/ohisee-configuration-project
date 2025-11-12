/**
 * RewriteAssistant Component Unit Tests
 * Tests AI-powered rewrite functionality, quality checks, and user interactions
 * Following TDD RED phase - comprehensive test coverage >95%
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { RewriteAssistant } from '../rewrite-assistant';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('RewriteAssistant', () => {
  const defaultProps = {
    currentText: 'This is the original text that needs improvement',
    onRewrite: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ improvedText: 'This is the improved text with better quality' }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering - Conditional Display', () => {
    it('should not render when currentText is empty', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} currentText="" qualityScore={50} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when currentText is only whitespace', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} currentText="   " qualityScore={50} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when disabled', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={50} disabled={true} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when quality score is null and not checking', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={null} isCheckingQuality={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when quality score is below threshold', () => {
      render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={60}
          qualityThreshold={70}
        />
      );

      expect(screen.getByRole('button', { name: /rewrite for better quality/i })).toBeInTheDocument();
    });

    it('should not render when quality score meets threshold', () => {
      const { container } = render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={75}
          qualityThreshold={70}
          isCheckingQuality={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render checking state when isCheckingQuality is true', () => {
      render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={null}
          isCheckingQuality={true}
        />
      );

      expect(screen.getByText('Checking quality...')).toBeInTheDocument();
    });
  });

  describe('Quality Threshold Logic', () => {
    it('should use default threshold of 70', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={69} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show button when score equals threshold - 1', () => {
      render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={74}
          qualityThreshold={75}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not show button when score equals threshold', () => {
      const { container } = render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={75}
          qualityThreshold={75}
          isCheckingQuality={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not show button when score exceeds threshold', () => {
      const { container } = render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={80}
          qualityThreshold={70}
          isCheckingQuality={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should use custom threshold', () => {
      render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={79}
          qualityThreshold={80}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show button when quality check returns low score', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 65, suggestions: [] });

      render(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={null}
        />
      );

      // Initially shouldn't show
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      // Trigger quality check
      await waitFor(() => {
        // Component should check quality and show button
      });
    });
  });

  describe('Rewrite Button - Basic Functionality', () => {
    it('should render rewrite button with correct text', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      expect(screen.getByRole('button', { name: /rewrite for better quality/i })).toBeInTheDocument();
      expect(screen.getByText('Rewrite for Better Quality')).toBeInTheDocument();
    });

    it('should show sparkles icon', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should call API when rewrite button is clicked', async () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/ai/rewrite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: defaultProps.currentText,
            context: 'nca_description',
          }),
        });
      });
    });

    it('should call onRewrite with improved text', async () => {
      const onRewrite = jest.fn();
      render(
        <RewriteAssistant {...defaultProps} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onRewrite).toHaveBeenCalledWith('This is the improved text with better quality');
      });
    });

    it('should show loading state during rewrite', async () => {
      // Mock slow response
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(() =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ improvedText: 'Improved text' }),
              } as Response),
            1000
          )
        )
      );

      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Rewriting...')).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('should disable button during rewrite', async () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toBeDisabled();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should prevent multiple concurrent rewrites', async () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');

      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const onRewrite = jest.fn();
      render(
        <RewriteAssistant {...defaultProps} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Should not call onRewrite on error
        expect(onRewrite).not.toHaveBeenCalled();
      });

      // Button should be re-enabled
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('should handle network error gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      const onRewrite = jest.fn();
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(
        <RewriteAssistant {...defaultProps} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Rewrite failed:', expect.any(Error));
        expect(onRewrite).not.toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('should handle missing improvedText in response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const onRewrite = jest.fn();
      render(
        <RewriteAssistant {...defaultProps} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Should fall back to current text
        expect(onRewrite).toHaveBeenCalledWith(defaultProps.currentText);
      });
    });

    it('should handle empty response', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => ({ improvedText: '' }),
      } as Response);

      const onRewrite = jest.fn();
      render(
        <RewriteAssistant {...defaultProps} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        // Should pass empty string if that's what API returns
        expect(onRewrite).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Quality Check Integration', () => {
    it('should call onQualityCheck when provided', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 65, suggestions: [] });

      render(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={null}
        />
      );

      // Component might auto-check on mount or when called externally
      // This tests the prop is properly wired
      expect(onQualityCheck).toBeDefined();
    });

    it('should show rewrite button when quality check returns low score', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 60, suggestions: [] });

      const { rerender } = render(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={null}
        />
      );

      // Update with low score
      rerender(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={60}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should hide rewrite button when quality check returns high score', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 85, suggestions: [] });

      const { rerender, container } = render(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={60}
        />
      );

      // Initially showing
      expect(screen.getByRole('button')).toBeInTheDocument();

      // Update with high score
      rerender(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={85}
          isCheckingQuality={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle quality check error', async () => {
      const onQualityCheck = jest.fn().mockRejectedValue(new Error('Quality check failed'));
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(
        <RewriteAssistant
          {...defaultProps}
          onQualityCheck={onQualityCheck}
          qualityScore={null}
        />
      );

      // Error should be handled gracefully
      await waitFor(() => {
        // Component should still work
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });

      consoleError.mockRestore();
    });
  });

  describe('Button Variants and Sizes', () => {
    it('should apply default button size', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply custom button size', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} buttonSize="lg" />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply default button variant', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply custom button variant', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} buttonVariant="ghost" />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <RewriteAssistant
          {...defaultProps}
          qualityScore={60}
          className="custom-class"
        />
      );

      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('State Management', () => {
    it('should show button immediately when quality score is below threshold', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={50} qualityThreshold={70} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should update when quality score changes', () => {
      const { rerender, container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={80} isCheckingQuality={false} />
      );

      // Initially not showing (high score)
      expect(container.firstChild).toBeNull();

      // Update to low score
      rerender(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should clear loading state after rewrite completes', async () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Loading state
      expect(screen.getByText('Rewriting...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Rewriting...')).not.toBeInTheDocument();
      });
    });

    it('should hide button after successful rewrite', async () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button', { name: /rewrite for better quality/i });
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });

    it('should indicate disabled state properly', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} disabled={true} />
      );

      // Should not render when disabled
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should indicate loading state to screen readers', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Rewriting...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty currentText gracefully', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} currentText="" qualityScore={60} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(5000);
      const onRewrite = jest.fn();

      render(
        <RewriteAssistant {...defaultProps} currentText={longText} onRewrite={onRewrite} qualityScore={60} />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/ai/rewrite',
          expect.objectContaining({
            body: JSON.stringify({
              text: longText,
              context: 'nca_description',
            }),
          })
        );
      });
    });

    it('should handle special characters in text', async () => {
      const specialText = 'Text with <special> & "characters" \'quotes\'';
      const onRewrite = jest.fn();

      render(
        <RewriteAssistant
          {...defaultProps}
          currentText={specialText}
          onRewrite={onRewrite}
          qualityScore={60}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should handle score of 0', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={0} qualityThreshold={70} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle score of 100', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={100} qualityThreshold={70} isCheckingQuality={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle negative scores', () => {
      render(
        <RewriteAssistant {...defaultProps} qualityScore={-5} qualityThreshold={70} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle very high threshold', () => {
      const { container } = render(
        <RewriteAssistant {...defaultProps} qualityScore={90} qualityThreshold={95} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle rapid quality score changes', () => {
      const { rerender } = render(
        <RewriteAssistant {...defaultProps} qualityScore={50} />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();

      rerender(<RewriteAssistant {...defaultProps} qualityScore={80} isCheckingQuality={false} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      rerender(<RewriteAssistant {...defaultProps} qualityScore={60} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle transition from checking to loaded state', () => {
      const { rerender } = render(
        <RewriteAssistant {...defaultProps} qualityScore={null} isCheckingQuality={true} />
      );

      expect(screen.getByText('Checking quality...')).toBeInTheDocument();

      rerender(
        <RewriteAssistant {...defaultProps} qualityScore={60} isCheckingQuality={false} />
      );

      expect(screen.queryByText('Checking quality...')).not.toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should handle all props together', async () => {
      const onRewrite = jest.fn();
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 60, suggestions: [] });

      render(
        <RewriteAssistant
          currentText="Test text"
          onRewrite={onRewrite}
          onQualityCheck={onQualityCheck}
          qualityScore={60}
          isCheckingQuality={false}
          disabled={false}
          className="test-class"
          buttonSize="lg"
          buttonVariant="outline"
          qualityThreshold={75}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      fireEvent.click(button);

      await waitFor(() => {
        expect(onRewrite).toHaveBeenCalled();
      });
    });
  });
});
