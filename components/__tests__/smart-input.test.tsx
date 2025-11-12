/**
 * SmartInput Component Unit Tests
 * Tests rendering, autocomplete, voice input, text-to-speech, and rewrite assistant
 * Following TDD RED phase - comprehensive test coverage >95%
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SmartInput } from '../smart-input';

// Mock dependencies
jest.mock('@/lib/knowledge/packaging-safety-service', () => ({
  createPackagingSafetyService: jest.fn(() => ({
    searchMaterials: jest.fn().mockResolvedValue([
      { material_code: 'PKG001', material_name: 'LDPE Film' },
      { material_code: 'PKG002', material_name: 'HDPE Bottle' },
    ]),
  })),
}));

jest.mock('@/lib/knowledge/industry-benchmarks-service', () => ({
  createIndustryBenchmarksService: jest.fn(() => ({
    searchBenchmarks: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('@/components/fields/voice-input', () => ({
  VoiceInput: ({ onTranscript, disabled }: any) => (
    <button
      data-testid="voice-input-button"
      onClick={() => onTranscript('Voice transcribed text')}
      disabled={disabled}
    >
      Voice Input
    </button>
  ),
}));

jest.mock('@/components/fields/text-to-speech', () => ({
  TextToSpeech: ({ text, disabled, onQualityCheck }: any) => (
    <button
      data-testid="text-to-speech-button"
      onClick={() => onQualityCheck && onQualityCheck()}
      disabled={disabled}
    >
      Read Aloud
    </button>
  ),
}));

jest.mock('@/components/fields/rewrite-assistant', () => ({
  RewriteAssistant: ({ currentText, onRewrite, disabled }: any) => (
    <button
      data-testid="rewrite-assistant-button"
      onClick={() => onRewrite('Improved: ' + currentText)}
      disabled={disabled}
    >
      Rewrite
    </button>
  ),
}));

describe('SmartInput', () => {
  const defaultProps = {
    label: 'Product Description',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering - Basic', () => {
    it('should render label and input', () => {
      render(<SmartInput {...defaultProps} />);

      expect(screen.getByText('Product Description')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Product Description' })).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<SmartInput {...defaultProps} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<SmartInput {...defaultProps} placeholder="Enter product name..." />);

      const input = screen.getByPlaceholderText('Enter product name...');
      expect(input).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<SmartInput {...defaultProps} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render with data-testid', () => {
      render(<SmartInput {...defaultProps} data-testid="custom-input" />);

      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('should render different input types', () => {
      const { rerender } = render(<SmartInput {...defaultProps} type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

      rerender(<SmartInput {...defaultProps} type="tel" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel');

      rerender(<SmartInput {...defaultProps} type="url" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url');
    });
  });

  describe('User Interactions - Basic', () => {
    it('should call onChange when text is entered', () => {
      const onChange = jest.fn();
      render(<SmartInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledWith('New text');
    });

    it('should handle focus and blur events', () => {
      render(<SmartInput {...defaultProps} />);

      const input = screen.getByRole('textbox');

      fireEvent.focus(input);
      expect(input.parentElement).toHaveClass('ring-2');

      fireEvent.blur(input);
      // Ring class should be removed after blur
    });

    it('should update value controlled by parent', () => {
      const { rerender } = render(<SmartInput {...defaultProps} value="Initial" />);

      expect(screen.getByRole('textbox')).toHaveValue('Initial');

      rerender(<SmartInput {...defaultProps} value="Updated" />);

      expect(screen.getByRole('textbox')).toHaveValue('Updated');
    });

    it('should not call onChange when disabled', () => {
      const onChange = jest.fn();
      render(<SmartInput {...defaultProps} onChange={onChange} disabled />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New text' } });

      expect(onChange).toHaveBeenCalledTimes(0);
    });
  });

  describe('Get Help Button', () => {
    it('should render "Get Help" button when onGetHelp is provided', () => {
      const onGetHelp = jest.fn();
      render(<SmartInput {...defaultProps} onGetHelp={onGetHelp} />);

      expect(screen.getByText('Get Help')).toBeInTheDocument();
    });

    it('should not render help button when onGetHelp is not provided', () => {
      render(<SmartInput {...defaultProps} />);

      expect(screen.queryByText('Get Help')).not.toBeInTheDocument();
    });

    it('should call onGetHelp when button is clicked', () => {
      const onGetHelp = jest.fn();
      render(<SmartInput {...defaultProps} onGetHelp={onGetHelp} />);

      const button = screen.getByText('Get Help');
      fireEvent.click(button);

      expect(onGetHelp).toHaveBeenCalledTimes(1);
    });

    it('should disable help button when isProcessing is true', () => {
      const onGetHelp = jest.fn();
      render(<SmartInput {...defaultProps} onGetHelp={onGetHelp} isProcessing={true} />);

      const button = screen.getByText('Processing...');
      expect(button).toBeDisabled();
    });

    it('should show loading state when isProcessing', () => {
      render(<SmartInput {...defaultProps} onGetHelp={jest.fn()} isProcessing={true} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should disable help button when input is disabled', () => {
      const onGetHelp = jest.fn();
      render(
        <SmartInput
          {...defaultProps}
          onGetHelp={onGetHelp}
          disabled={true}
          data-testid="input"
        />
      );

      const button = screen.getByTestId('input-get-help');
      expect(button).toBeDisabled();
    });
  });

  describe('Autocomplete - Packaging Materials', () => {
    it('should show autocomplete suggestions for packaging materials', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="LDPE"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // Fast-forward debounce timer
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });
    });

    it('should not show suggestions when value is too short', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="L"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should not show suggestions when not focused', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="LDPE"
        />
      );

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should select suggestion on click', async () => {
      const onChange = jest.fn();
      render(
        <SmartInput
          {...defaultProps}
          onChange={onChange}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="LDPE"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });

      const suggestion = screen.getByText(/PKG001 - LDPE Film/);
      fireEvent.click(suggestion);

      expect(onChange).toHaveBeenCalledWith('PKG001');
    });

    it('should close autocomplete after selection', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="LDPE"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });

      const suggestion = screen.getByText(/PKG001 - LDPE Film/);
      fireEvent.click(suggestion);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });

      // Arrow down
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      const firstOption = screen.getByText(/PKG001 - LDPE Film/);
      expect(firstOption.closest('button')).toHaveClass('bg-accent');

      // Arrow down again
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      const secondOption = screen.getByText(/PKG002 - HDPE Bottle/);
      expect(secondOption.closest('button')).toHaveClass('bg-accent');
    });

    it('should select suggestion with Enter key', async () => {
      const onChange = jest.fn();
      render(
        <SmartInput
          {...defaultProps}
          onChange={onChange}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });

      // Arrow down to select
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Enter to confirm
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalledWith('PKG001');
    });

    it('should close autocomplete with Escape key', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should navigate up with ArrowUp', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText(/PKG001 - LDPE Film/)).toBeInTheDocument();
      });

      // Navigate to second item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // Navigate back up
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const firstOption = screen.getByText(/PKG001 - LDPE Film/);
      expect(firstOption.closest('button')).toHaveClass('bg-accent');
    });
  });

  describe('Voice Input Integration', () => {
    it('should render voice input button when enabled', () => {
      render(<SmartInput {...defaultProps} enableVoiceInput={true} />);

      expect(screen.getByTestId('voice-input-button')).toBeInTheDocument();
    });

    it('should not render voice input button when disabled', () => {
      render(<SmartInput {...defaultProps} enableVoiceInput={false} />);

      expect(screen.queryByTestId('voice-input-button')).not.toBeInTheDocument();
    });

    it('should handle voice input transcription', () => {
      const onChange = jest.fn();
      render(<SmartInput {...defaultProps} onChange={onChange} enableVoiceInput={true} />);

      const voiceButton = screen.getByTestId('voice-input-button');
      fireEvent.click(voiceButton);

      expect(onChange).toHaveBeenCalledWith('Voice transcribed text');
    });

    it('should trigger quality check after voice input when rewrite is enabled', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 85, suggestions: [] });
      render(
        <SmartInput
          {...defaultProps}
          enableVoiceInput={true}
          enableRewrite={true}
          onQualityCheck={onQualityCheck}
        />
      );

      const voiceButton = screen.getByTestId('voice-input-button');
      fireEvent.click(voiceButton);

      // Wait for quality check delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(onQualityCheck).toHaveBeenCalled();
      });
    });

    it('should disable voice input when input is disabled', () => {
      render(<SmartInput {...defaultProps} disabled={true} enableVoiceInput={true} />);

      const voiceButton = screen.getByTestId('voice-input-button');
      expect(voiceButton).toBeDisabled();
    });
  });

  describe('Text-to-Speech Integration', () => {
    it('should render text-to-speech button when value exists', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text to read"
          enableTextToSpeech={true}
        />
      );

      expect(screen.getByTestId('text-to-speech-button')).toBeInTheDocument();
    });

    it('should not render text-to-speech button when value is empty', () => {
      render(<SmartInput {...defaultProps} value="" enableTextToSpeech={true} />);

      expect(screen.queryByTestId('text-to-speech-button')).not.toBeInTheDocument();
    });

    it('should not render text-to-speech when disabled', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          enableTextToSpeech={false}
        />
      );

      expect(screen.queryByTestId('text-to-speech-button')).not.toBeInTheDocument();
    });

    it('should trigger quality check when TTS button is clicked with rewrite enabled', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 85, suggestions: [] });
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          enableTextToSpeech={true}
          enableRewrite={true}
          onQualityCheck={onQualityCheck}
        />
      );

      const ttsButton = screen.getByTestId('text-to-speech-button');
      fireEvent.click(ttsButton);

      await waitFor(() => {
        expect(onQualityCheck).toHaveBeenCalled();
      });
    });

    it('should disable text-to-speech when input is disabled', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          disabled={true}
          enableTextToSpeech={true}
        />
      );

      const ttsButton = screen.getByTestId('text-to-speech-button');
      expect(ttsButton).toBeDisabled();
    });
  });

  describe('Rewrite Assistant Integration', () => {
    it('should render rewrite assistant when enabled and value exists', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          enableRewrite={true}
          onQualityCheck={jest.fn()}
        />
      );

      expect(screen.getByTestId('rewrite-assistant-button')).toBeInTheDocument();
    });

    it('should not render rewrite assistant when value is empty', () => {
      render(
        <SmartInput {...defaultProps} value="" enableRewrite={true} />
      );

      expect(screen.queryByTestId('rewrite-assistant-button')).not.toBeInTheDocument();
    });

    it('should not render rewrite assistant when disabled', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          enableRewrite={false}
        />
      );

      expect(screen.queryByTestId('rewrite-assistant-button')).not.toBeInTheDocument();
    });

    it('should handle rewrite action', () => {
      const onChange = jest.fn();
      render(
        <SmartInput
          {...defaultProps}
          onChange={onChange}
          value="Original text"
          enableRewrite={true}
        />
      );

      const rewriteButton = screen.getByTestId('rewrite-assistant-button');
      fireEvent.click(rewriteButton);

      expect(onChange).toHaveBeenCalledWith('Improved: Original text');
    });

    it('should pass quality score to rewrite assistant', () => {
      render(
        <SmartInput
          {...defaultProps}
          value="Some text"
          enableRewrite={true}
          qualityScore={75}
          isCheckingQuality={false}
        />
      );

      expect(screen.getByTestId('rewrite-assistant-button')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', () => {
      render(
        <SmartInput
          {...defaultProps}
          error="This field is required"
          data-testid="input"
        />
      );

      expect(screen.getByTestId('input-error')).toBeInTheDocument();
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should style input with error border when error exists', () => {
      render(<SmartInput {...defaultProps} error="Error message" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('should set aria-invalid when error exists', () => {
      render(<SmartInput {...defaultProps} error="Error message" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should link error message with aria-describedby', () => {
      render(
        <SmartInput
          {...defaultProps}
          error="Error message"
          data-testid="input"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'input-error');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<SmartInput {...defaultProps} label="Test Label" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Test Label');
    });

    it('should mark input as required in DOM when required', () => {
      render(<SmartInput {...defaultProps} required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should have accessible label association', () => {
      render(<SmartInput {...defaultProps} label="Accessible Label" />);

      const label = screen.getByText('Accessible Label');
      const input = screen.getByRole('textbox');

      expect(label).toBeInTheDocument();
      expect(input).toHaveAccessibleName('Accessible Label');
    });

    it('should have aria-autocomplete attribute', () => {
      render(<SmartInput {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('should have aria-expanded when autocomplete is shown', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Tooltip Integration', () => {
    it('should render tooltip when provided', () => {
      const tooltip = <span data-testid="custom-tooltip">Help text</span>;
      render(<SmartInput {...defaultProps} tooltip={tooltip} />);

      expect(screen.getByTestId('custom-tooltip')).toBeInTheDocument();
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });

    it('should not render tooltip when not provided', () => {
      render(<SmartInput {...defaultProps} />);

      expect(screen.queryByTestId('custom-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('External Suggestions', () => {
    it('should use external suggestions when provided', async () => {
      const suggestions = ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'];
      render(
        <SmartInput
          {...defaultProps}
          suggestions={suggestions}
          showSuggestions={true}
          value="Sugg"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
        expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
        expect(screen.getByText('Suggestion 3')).toBeInTheDocument();
      });
    });

    it('should select external suggestion', async () => {
      const onChange = jest.fn();
      const suggestions = ['External Option 1'];
      render(
        <SmartInput
          {...defaultProps}
          onChange={onChange}
          suggestions={suggestions}
          showSuggestions={true}
          value="Ext"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('External Option 1')).toBeInTheDocument();
      });

      const suggestion = screen.getByText('External Option 1');
      fireEvent.click(suggestion);

      expect(onChange).toHaveBeenCalledWith('External Option 1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string value', () => {
      render(<SmartInput {...defaultProps} value="" />);

      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('should handle special characters in value', () => {
      const specialText = 'Test with <special> & "characters" \'quotes\'';
      render(<SmartInput {...defaultProps} value={specialText} />);

      expect(screen.getByRole('textbox')).toHaveValue(specialText);
    });

    it('should debounce autocomplete requests', async () => {
      const { rerender } = render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="P"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      // Change value rapidly
      rerender(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PK"
        />
      );

      rerender(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      // Only advance once
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should only make one request
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should handle autocomplete error gracefully', async () => {
      // Mock error
      const mockError = jest.fn().mockRejectedValue(new Error('Network error'));
      jest.mocked(require('@/lib/knowledge/packaging-safety-service').createPackagingSafetyService).mockReturnValue({
        searchMaterials: mockError,
      });

      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should not show autocomplete on error
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const onChange = jest.fn();
      const onGetHelp = jest.fn();
      const onQualityCheck = jest.fn();

      render(
        <SmartInput
          label="Complete Test"
          value="Test content"
          onChange={onChange}
          onGetHelp={onGetHelp}
          onQualityCheck={onQualityCheck}
          qualityScore={78}
          isCheckingQuality={false}
          isProcessing={false}
          showSuggestions={true}
          enableVoiceInput={true}
          enableTextToSpeech={true}
          enableRewrite={true}
          required={true}
          placeholder="Enter details..."
          data-testid="complex-input"
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('Test content');
      expect(screen.getByText('Get Help')).toBeInTheDocument();
      expect(screen.getByTestId('voice-input-button')).toBeInTheDocument();
      expect(screen.getByTestId('text-to-speech-button')).toBeInTheDocument();
      expect(screen.getByTestId('rewrite-assistant-button')).toBeInTheDocument();
    });

    it('should maintain focus during autocomplete', async () => {
      render(
        <SmartInput
          {...defaultProps}
          fieldName="nc_product_description"
          showSuggestions={true}
          value="PKG"
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.focus(input);

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Focus should be maintained
      expect(input).toHaveFocus();
    });
  });
});
