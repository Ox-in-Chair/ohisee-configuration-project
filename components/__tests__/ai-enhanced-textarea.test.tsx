/**
 * EnhancedTextarea Component Unit Tests
 * Tests rendering, user interactions, help button, quality indicator, and character counting
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { EnhancedTextarea } from '../enhanced-textarea';

describe('EnhancedTextarea', () => {
  const defaultProps = {
    label: 'Corrective Action',
    value: '',
    onChange: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render label and textarea', () => {
      render(<EnhancedTextarea {...defaultProps} />);

      expect(screen.getByText('Corrective Action')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Corrective Action' })).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<EnhancedTextarea {...defaultProps} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(
        <EnhancedTextarea {...defaultProps} placeholder="Enter corrective action..." />
      );

      const textarea = screen.getByPlaceholderText('Enter corrective action...');
      expect(textarea).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<EnhancedTextarea {...defaultProps} disabled />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });

    it('should set custom rows', () => {
      render(<EnhancedTextarea {...defaultProps} rows={10} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '10');
    });

    it('should render with data-testid', () => {
      render(<EnhancedTextarea {...defaultProps} data-testid="custom-textarea" />);

      expect(screen.getByTestId('custom-textarea')).toBeInTheDocument();
    });
  });

  describe('Character Counter', () => {
    it('should display character count', () => {
      render(<EnhancedTextarea {...defaultProps} value="Hello" minLength={50} />);

      expect(screen.getByText(/5 \/ 50 minimum/)).toBeInTheDocument();
    });

    it('should show characters needed when below minimum', () => {
      render(
        <EnhancedTextarea
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
        <EnhancedTextarea
          {...defaultProps}
          value={"A".repeat(100)}
          minLength={50}
          data-testid="textarea"
        />
      );

      const charCount = screen.getByTestId('textarea-char-count');
      expect(charCount).toHaveClass('text-green-600');
    });

    it('should show yellow color when halfway to minimum', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value={"A".repeat(30)}
          minLength={100}
          data-testid="textarea"
        />
      );

      const charCount = screen.getByTestId('textarea-char-count');
      expect(charCount).toHaveClass('text-yellow-600');
    });

    it('should show red color when far from minimum', () => {
      render(
        <EnhancedTextarea
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
        <EnhancedTextarea
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
        <EnhancedTextarea
          {...defaultProps}
          value={"A".repeat(100)}
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
      render(<EnhancedTextarea {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledWith('New text');
    });

    it('should handle focus and blur events', () => {
      render(<EnhancedTextarea {...defaultProps} />);

      const textarea = screen.getByRole('textbox');

      // Focus
      fireEvent.focus(textarea);
      expect(textarea.parentElement).toHaveClass('ring-2');

      // Blur
      fireEvent.blur(textarea);
      // Ring class should be removed (component manages this internally)
    });

    it('should update value controlled by parent', () => {
      const { rerender } = render(<EnhancedTextarea {...defaultProps} value="Initial" />);

      expect(screen.getByRole('textbox')).toHaveValue('Initial');

      rerender(<EnhancedTextarea {...defaultProps} value="Updated" />);

      expect(screen.getByRole('textbox')).toHaveValue('Updated');
    });

    it('should not call onChange when disabled', () => {
      const onChange = jest.fn();
      render(<EnhancedTextarea {...defaultProps} onChange={onChange} disabled />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });

      // Should not be called due to disabled state
      expect(onChange).toHaveBeenCalledTimes(0);
    });
  });

  describe('Get Help Button', () => {
    it('should render "Get Help" button when onGetHelp is provided', () => {
      const onGetHelp = jest.fn();
      render(<EnhancedTextarea {...defaultProps} onGetHelp={onGetHelp} />);

      expect(screen.getByText('Get Help')).toBeInTheDocument();
    });

    it('should not render help button when onGetHelp is not provided', () => {
      render(<EnhancedTextarea {...defaultProps} />);

      expect(screen.queryByText('Get Help')).not.toBeInTheDocument();
    });

    it('should call onGetHelp when button is clicked', () => {
      const onGetHelp = jest.fn();
      render(<EnhancedTextarea {...defaultProps} onGetHelp={onGetHelp} />);

      const button = screen.getByText('Get Help');
      fireEvent.click(button);

      expect(onGetHelp).toHaveBeenCalledTimes(1);
    });

    it('should disable help button when isProcessing is true', () => {
      const onGetHelp = jest.fn();
      render(
        <EnhancedTextarea
          {...defaultProps}
          onGetHelp={onGetHelp}
          isProcessing={true}
        />
      );

      const button = screen.getByText('Processing...');
      expect(button).toBeDisabled();
    });

    it('should show loading state when isProcessing', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          onGetHelp={jest.fn()}
          isProcessing={true}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should disable help button when textarea is disabled', () => {
      const onGetHelp = jest.fn();
      render(
        <EnhancedTextarea
          {...defaultProps}
          onGetHelp={onGetHelp}
          disabled={true}
          data-testid="textarea"
        />
      );

      const button = screen.getByTestId('textarea-get-help');
      expect(button).toBeDisabled();
    });

    it('should have correct testid for help button', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          onGetHelp={jest.fn()}
          data-testid="my-textarea"
        />
      );

      expect(screen.getByTestId('my-textarea-get-help')).toBeInTheDocument();
    });
  });

  describe('Quality Badge', () => {
    it('should show quality badge when showQualityBadge is true', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={85}
        />
      );

      // Quality badge should be rendered (tested in its own test file)
      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
    });

    it('should not show quality badge when showQualityBadge is false', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={false}
          qualityScore={85}
        />
      );

      expect(screen.queryByTestId('quality-indicator')).not.toBeInTheDocument();
    });

    it('should show checking state in quality badge', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          isCheckingQuality={true}
        />
      );

      expect(screen.getByTestId('quality-indicator-loading')).toBeInTheDocument();
      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    it('should pass quality score to badge', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={92}
        />
      );

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toHaveAttribute('data-score', '92');
    });

    it('should not show quality badge when score is null', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={null}
        />
      );

      expect(screen.queryByTestId('quality-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          error="This field is required"
          data-testid="textarea"
        />
      );

      expect(screen.getByTestId('textarea-error')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should style textarea with error border when error exists', () => {
      render(<EnhancedTextarea {...defaultProps} error="Error message" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveClass('border-red-500');
    });

    it('should set aria-invalid when error exists', () => {
      render(<EnhancedTextarea {...defaultProps} error="Error message" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error message with aria-describedby', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          error="Error message"
          data-testid="textarea"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'textarea-error');
    });

    it('should not have aria-describedby when no error', () => {
      render(<EnhancedTextarea {...defaultProps} data-testid="textarea" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveAttribute('aria-describedby');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<EnhancedTextarea {...defaultProps} label="Test Label" />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-label', 'Test Label');
    });

    it('should mark textarea as required in DOM when required', () => {
      render(<EnhancedTextarea {...defaultProps} required />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeRequired();
    });

    it('should have accessible label association', () => {
      render(<EnhancedTextarea {...defaultProps} label="Accessible Label" />);

      const label = screen.getByText('Accessible Label');
      const textarea = screen.getByRole('textbox');

      // Label should be associated with textarea
      expect(label).toBeInTheDocument();
      expect(textarea).toHaveAccessibleName('Accessible Label');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const onChange = jest.fn();
      const onGetHelp = jest.fn();

      render(
        <EnhancedTextarea
          label="Complete Test"
          value="Test content"
          onChange={onChange}
          onGetHelp={onGetHelp}
          qualityScore={78}
          isCheckingQuality={false}
          isProcessing={false}
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
      expect(screen.getByText('Get Help')).toBeInTheDocument();
      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter details...')).toBeInTheDocument();
    });

    it('should maintain focus state during quality check', async () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          isCheckingQuality={true}
          data-testid="textarea"
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.focus(textarea);

      // Focus should be maintained even during quality check
      expect(textarea).toHaveFocus();
    });

    it('should allow typing while quality check is in progress', () => {
      const onChange = jest.fn();
      render(
        <EnhancedTextarea
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
        <EnhancedTextarea
          {...defaultProps}
          onChange={onChange}
          disabled={true}
          isProcessing={true}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      render(<EnhancedTextarea {...defaultProps} value="" />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('should handle very long text', () => {
      const longText = 'A'.repeat(5000);
      render(<EnhancedTextarea {...defaultProps} value={longText} maxLength={10000} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue(longText);
    });

    it('should handle zero minLength', () => {
      render(<EnhancedTextarea {...defaultProps} value="Any text" minLength={0} />);

      // Should not show minimum warning
      expect(screen.queryByText(/characters needed/)).not.toBeInTheDocument();
    });

    it('should handle minLength equal to maxLength', () => {
      render(
        <EnhancedTextarea
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
      render(<EnhancedTextarea {...defaultProps} value={specialText} />);

      expect(screen.getByRole('textbox')).toHaveValue(specialText);
    });

    it('should handle newlines in value', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      render(<EnhancedTextarea {...defaultProps} value={multilineText} />);

      expect(screen.getByRole('textbox')).toHaveValue(multilineText);
    });
  });
});
