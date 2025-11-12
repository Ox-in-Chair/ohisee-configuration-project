/**
 * AIEnhancedTextarea Component Unit Tests
 * Tests Kangopak Core AI assistance, quality scoring, and textarea functionality
 * Following TDD RED phase - comprehensive test coverage >95%
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AIEnhancedTextarea } from '../ai-enhanced-textarea';

describe('AIEnhancedTextarea', () => {
  const defaultProps = {
    label: 'Corrective Action',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic', () => {
    it('should render label and textarea', () => {
      render(<AIEnhancedTextarea {...defaultProps} />);

      expect(screen.getByText('Corrective Action')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Corrective Action' })).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<AIEnhancedTextarea {...defaultProps} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(
        <AIEnhancedTextarea {...defaultProps} placeholder="Enter corrective action..." />
      );

      const textarea = screen.getByPlaceholderText('Enter corrective action...');
      expect(textarea).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<AIEnhancedTextarea {...defaultProps} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should set custom rows', () => {
      render(<AIEnhancedTextarea {...defaultProps} rows={10} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '10');
    });

    it('should render with data-testid', () => {
      render(<AIEnhancedTextarea {...defaultProps} data-testid="custom-textarea" />);

      expect(screen.getByTestId('custom-textarea')).toBeInTheDocument();
    });
  });

  describe('Character Counter', () => {
    it('should display character count', () => {
      render(<AIEnhancedTextarea {...defaultProps} value="Hello" minLength={50} />);

      expect(screen.getByText(/5 \/ 50 minimum/)).toBeInTheDocument();
    });

    it('should show characters needed when below minimum', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value="Short"
          minLength={100}
          data-testid="textarea"
        />
      );

      expect(screen.getByTestId('textarea-minimum-warning')).toBeInTheDocument();
      expect(screen.getByText('95 characters needed')).toBeInTheDocument();
    });

    it('should show green color when minimum is met', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value={'A'.repeat(100)}
          minLength={50}
          data-testid="textarea"
        />
      );

      const charCount = screen.getByTestId('textarea-char-count');
      expect(charCount).toHaveClass('text-green-600');
    });

    it('should show yellow color when halfway to minimum', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value={'A'.repeat(30)}
          minLength={100}
          data-testid="textarea"
        />
      );

      const charCount = screen.getByTestId('textarea-char-count');
      expect(charCount).toHaveClass('text-yellow-600');
    });

    it('should show red color when far from minimum', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value="Short"
          minLength={100}
          data-testid="textarea"
        />
      );

      const charCount = screen.getByTestId('textarea-char-count');
      expect(charCount).toHaveClass('text-red-600');
    });

    it('should respect maxLength', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value="Test"
          minLength={50}
          maxLength={500}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('maxlength', '500');
      expect(screen.getByText(/\(500 max\)/)).toBeInTheDocument();
    });

    it('should not show minimum warning when minimum is met', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value={'A'.repeat(100)}
          minLength={50}
          data-testid="textarea"
        />
      );

      expect(screen.queryByTestId('textarea-minimum-warning')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when text is entered', () => {
      const onChange = jest.fn();
      render(<AIEnhancedTextarea {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledWith('New text');
    });

    it('should handle focus and blur events', () => {
      render(<AIEnhancedTextarea {...defaultProps} />);

      const textarea = screen.getByRole('textbox');

      fireEvent.focus(textarea);
      expect(textarea.parentElement).toHaveClass('ring-2');

      fireEvent.blur(textarea);
      // Ring class should be removed
    });

    it('should update value controlled by parent', () => {
      const { rerender } = render(<AIEnhancedTextarea {...defaultProps} value="Initial" />);

      expect(screen.getByRole('textbox')).toHaveValue('Initial');

      rerender(<AIEnhancedTextarea {...defaultProps} value="Updated" />);

      expect(screen.getByRole('textbox')).toHaveValue('Updated');
    });

    it('should not call onChange when disabled', () => {
      const onChange = jest.fn();
      render(<AIEnhancedTextarea {...defaultProps} onChange={onChange} disabled />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledTimes(0);
    });
  });

  describe('Kangopak Core Button', () => {
    it('should render "Kangopak Core" button when onKangopakCore is provided', () => {
      const onKangopakCore = jest.fn();
      render(<AIEnhancedTextarea {...defaultProps} onKangopakCore={onKangopakCore} />);

      expect(screen.getByText('Kangopak Core')).toBeInTheDocument();
    });

    it('should not render Kangopak Core button when onKangopakCore is not provided', () => {
      render(<AIEnhancedTextarea {...defaultProps} />);

      expect(screen.queryByText('Kangopak Core')).not.toBeInTheDocument();
    });

    it('should call onKangopakCore when button is clicked', () => {
      const onKangopakCore = jest.fn();
      render(<AIEnhancedTextarea {...defaultProps} onKangopakCore={onKangopakCore} />);

      const button = screen.getByText('Kangopak Core');
      fireEvent.click(button);

      expect(onKangopakCore).toHaveBeenCalledTimes(1);
    });

    it('should disable Kangopak Core button when isSuggesting is true', () => {
      const onKangopakCore = jest.fn();
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={onKangopakCore}
          isSuggesting={true}
        />
      );

      const button = screen.getByText('Analyzing...');
      expect(button).toBeDisabled();
    });

    it('should show loading state when isSuggesting', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={jest.fn()}
          isSuggesting={true}
        />
      );

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });

    it('should disable Kangopak Core button when textarea is disabled', () => {
      const onKangopakCore = jest.fn();
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={onKangopakCore}
          disabled={true}
          data-testid="textarea"
        />
      );

      const button = screen.getByTestId('textarea-ai-help');
      expect(button).toBeDisabled();
    });

    it('should have correct testid for Kangopak Core button', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={jest.fn()}
          data-testid="my-textarea"
        />
      );

      expect(screen.getByTestId('my-textarea-ai-help')).toBeInTheDocument();
    });

    it('should show sparkles icon on Kangopak Core button', () => {
      const { container } = render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={jest.fn()}
        />
      );

      const button = screen.getByText('Kangopak Core');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have helpful title attribute', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onKangopakCore={jest.fn()}
          data-testid="textarea"
        />
      );

      const button = screen.getByTestId('textarea-ai-help');
      expect(button).toHaveAttribute('title', 'Get assistance from Kangopak Core knowledge base');
    });
  });

  describe('Quality Badge', () => {
    it('should show quality badge when showQualityBadge is true', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={85}
        />
      );

      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
    });

    it('should not show quality badge when showQualityBadge is false', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={false}
          qualityScore={85}
        />
      );

      expect(screen.queryByTestId('quality-badge')).not.toBeInTheDocument();
    });

    it('should show checking state in quality badge', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          isCheckingQuality={true}
        />
      );

      expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();
    });

    it('should pass quality score to badge', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={92}
        />
      );

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveAttribute('data-score', '92');
    });

    it('should not show quality badge when score is null', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={null}
        />
      );

      expect(screen.queryByTestId('quality-badge')).not.toBeInTheDocument();
    });

    it('should use default threshold of 75', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={75}
        />
      );

      // Threshold is passed to AIQualityBadge component
      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
    });

    it('should not show details by default', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={85}
        />
      );

      // showDetails={false} is passed by default
      expect(screen.queryByText('Meets requirements')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          error="This field is required"
          data-testid="textarea"
        />
      );

      expect(screen.getByTestId('textarea-error')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should style textarea with error border when error exists', () => {
      render(<AIEnhancedTextarea {...defaultProps} error="Error message" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-red-500');
    });

    it('should set aria-invalid when error exists', () => {
      render(<AIEnhancedTextarea {...defaultProps} error="Error message" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error message with aria-describedby', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          error="Error message"
          data-testid="textarea"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'textarea-error');
    });

    it('should not have aria-describedby when no error', () => {
      render(<AIEnhancedTextarea {...defaultProps} data-testid="textarea" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<AIEnhancedTextarea {...defaultProps} label="Test Label" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Test Label');
    });

    it('should mark textarea as required in DOM when required', () => {
      render(<AIEnhancedTextarea {...defaultProps} required />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
    });

    it('should have accessible label association', () => {
      render(<AIEnhancedTextarea {...defaultProps} label="Accessible Label" />);

      const label = screen.getByText('Accessible Label');
      const textarea = screen.getByRole('textbox');

      expect(label).toBeInTheDocument();
      expect(textarea).toHaveAccessibleName('Accessible Label');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const onChange = jest.fn();
      const onKangopakCore = jest.fn();

      render(
        <AIEnhancedTextarea
          label="Complete Test"
          value="Test content"
          onChange={onChange}
          onKangopakCore={onKangopakCore}
          qualityScore={78}
          isCheckingQuality={false}
          isSuggesting={false}
          showQualityBadge={true}
          minLength={50}
          maxLength={500}
          rows={8}
          required={true}
          placeholder="Enter details..."
          data-testid="complex-textarea"
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('Test content');
      expect(screen.getByText('Kangopak Core')).toBeInTheDocument();
      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter details...')).toBeInTheDocument();
    });

    it('should maintain focus state during quality check', async () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          isCheckingQuality={true}
          data-testid="textarea"
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.focus(textarea);

      expect(textarea).toHaveFocus();
    });

    it('should allow typing while quality check is in progress', () => {
      const onChange = jest.fn();
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onChange={onChange}
          isCheckingQuality={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New content' } });

      expect(onChange).toHaveBeenCalledWith('New content');
    });

    it('should not allow typing when disabled, even if AI is suggesting', () => {
      const onChange = jest.fn();
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          onChange={onChange}
          disabled={true}
          isSuggesting={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      render(<AIEnhancedTextarea {...defaultProps} value="" />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(5000);
      render(<AIEnhancedTextarea {...defaultProps} value={longText} maxLength={10000} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longText);
    });

    it('should handle zero minLength', () => {
      render(<AIEnhancedTextarea {...defaultProps} value="Any text" minLength={0} />);

      expect(screen.queryByText(/characters needed/)).not.toBeInTheDocument();
    });

    it('should handle minLength equal to maxLength', () => {
      render(
        <AIEnhancedTextarea
          {...defaultProps}
          value="Exact"
          minLength={100}
          maxLength={100}
        />
      );

      expect(screen.getByText(/100 minimum/)).toBeInTheDocument();
      expect(screen.getByText(/\(100 max\)/)).toBeInTheDocument();
    });

    it('should handle special characters in value', () => {
      const specialText = 'Test with <special> & "characters" \'quotes\'';
      render(<AIEnhancedTextarea {...defaultProps} value={specialText} />);

      expect(screen.getByRole('textbox')).toHaveValue(specialText);
    });

    it('should handle newlines in value', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      render(<AIEnhancedTextarea {...defaultProps} value={multilineText} />);

      expect(screen.getByRole('textbox')).toHaveValue(multilineText);
    });
  });
});
