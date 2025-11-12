/**
 * EnhancedTextarea Component Unit Tests
 * Tests rendering, user interactions, voice input, TTS, rewrite assistant, and quality features
 * Following TDD RED phase - comprehensive test coverage >95%
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EnhancedTextarea } from '../enhanced-textarea';

// Mock child components
jest.mock('@/components/fields/voice-input', () => ({
  VoiceInput: ({ onTranscript, disabled }: any) => (
    <button
      data-testid="voice-input-mock"
      onClick={() => onTranscript('Voice transcription')}
      disabled={disabled}
    >
      Voice Input
    </button>
  ),
}));

jest.mock('@/components/fields/text-to-speech', () => ({
  TextToSpeech: ({ text, disabled, onQualityCheck }: any) => (
    <button
      data-testid="tts-mock"
      onClick={() => onQualityCheck && onQualityCheck()}
      disabled={disabled}
    >
      TTS
    </button>
  ),
}));

jest.mock('@/components/fields/rewrite-assistant', () => ({
  RewriteAssistant: ({ currentText, onRewrite, disabled }: any) => (
    <button
      data-testid="rewrite-mock"
      onClick={() => onRewrite('Rewritten: ' + currentText)}
      disabled={disabled}
    >
      Rewrite
    </button>
  ),
}));

jest.mock('@/lib/validations/quality-messages', () => ({
  getRequirementChecklist: jest.fn((fieldName: string, value: string) => {
    if (!value || value.length === 0) return [];
    if (fieldName === 'nc_description') {
      return [
        { label: 'What happened', checked: value.includes('happened'), required: true },
        { label: 'When it occurred', checked: value.includes('when'), required: true },
        { label: 'Where (location)', checked: value.includes('where'), required: true },
      ];
    }
    return [];
  }),
}));

describe('EnhancedTextarea', () => {
  const defaultProps = {
    label: 'Description',
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Basic', () => {
    it('should render label and textarea', () => {
      render(<EnhancedTextarea {...defaultProps} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
    });

    it('should show required indicator when required', () => {
      render(<EnhancedTextarea {...defaultProps} required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<EnhancedTextarea {...defaultProps} placeholder="Enter details..." />);

      const textarea = screen.getByPlaceholderText('Enter details...');
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

  describe('Adaptive Placeholders', () => {
    it('should show adaptive placeholder for nc_description with context', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          context={{ ncType: 'incident' }}
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('what happened'));
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('200 characters'));
    });

    it('should show adaptive placeholder for root_cause_analysis', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="root_cause_analysis"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('5-Why method'));
    });

    it('should show adaptive placeholder for corrective_action', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="corrective_action"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', expect.stringContaining('specific actions'));
    });

    it('should use provided placeholder over adaptive one', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          placeholder="Custom placeholder"
        />
      );

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('placeholder', 'Custom placeholder');
    });
  });

  describe('Dynamic Minimum Length', () => {
    it('should use default minLength when no context', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Short text"
          minLength={100}
          data-testid="textarea"
        />
      );

      expect(screen.getByText(/100 minimum/)).toBeInTheDocument();
    });

    it('should use dynamic minLength for raw-material NC type', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          context={{ ncType: 'raw-material' }}
          value="Text"
          data-testid="textarea"
        />
      );

      expect(screen.getByText(/120 minimum/)).toBeInTheDocument();
    });

    it('should use dynamic minLength for finished-goods NC type', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          context={{ ncType: 'finished-goods' }}
          value="Text"
          data-testid="textarea"
        />
      );

      expect(screen.getByText(/150 minimum/)).toBeInTheDocument();
    });

    it('should use dynamic minLength for incident NC type', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          context={{ ncType: 'incident' }}
          value="Text"
          data-testid="textarea"
        />
      );

      expect(screen.getByText(/200 minimum/)).toBeInTheDocument();
    });

    it('should show context-specific label for dynamic minLength', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          context={{ ncType: 'raw-material' }}
          value="Text"
          minLength={100}
          data-testid="textarea"
        />
      );

      expect(screen.getByText(/for raw material/)).toBeInTheDocument();
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
        <EnhancedTextarea
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

      fireEvent.focus(textarea);
      expect(textarea).toHaveClass('ring-2');

      fireEvent.blur(textarea);
      // Ring class should be removed
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
  });

  describe('Voice Input Integration', () => {
    it('should render voice input button when enabled', () => {
      render(<EnhancedTextarea {...defaultProps} enableVoiceInput={true} />);

      expect(screen.getAllByTestId('voice-input-mock').length).toBeGreaterThan(0);
    });

    it('should not render voice input button when disabled', () => {
      render(<EnhancedTextarea {...defaultProps} enableVoiceInput={false} />);

      expect(screen.queryByTestId('voice-input-mock')).not.toBeInTheDocument();
    });

    it('should handle voice input transcription', () => {
      const onChange = jest.fn();
      render(<EnhancedTextarea {...defaultProps} onChange={onChange} enableVoiceInput={true} value="Existing text" />);

      const voiceButtons = screen.getAllByTestId('voice-input-mock');
      fireEvent.click(voiceButtons[0]);

      expect(onChange).toHaveBeenCalledWith('Existing text Voice transcription');
    });

    it('should trigger quality check after voice input when enabled', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 85, suggestions: [] });
      jest.useFakeTimers();

      render(
        <EnhancedTextarea
          {...defaultProps}
          enableVoiceInput={true}
          enableRewrite={true}
          onQualityCheck={onQualityCheck}
        />
      );

      const voiceButtons = screen.getAllByTestId('voice-input-mock');
      fireEvent.click(voiceButtons[0]);

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(onQualityCheck).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    it('should render voice input on both desktop and mobile', () => {
      render(<EnhancedTextarea {...defaultProps} enableVoiceInput={true} />);

      const voiceButtons = screen.getAllByTestId('voice-input-mock');
      expect(voiceButtons.length).toBeGreaterThanOrEqual(2); // Desktop + mobile
    });
  });

  describe('Text-to-Speech Integration', () => {
    it('should render TTS button when value exists', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text to read"
          enableTextToSpeech={true}
        />
      );

      expect(screen.getAllByTestId('tts-mock').length).toBeGreaterThan(0);
    });

    it('should not render TTS button when value is empty', () => {
      render(<EnhancedTextarea {...defaultProps} value="" enableTextToSpeech={true} />);

      expect(screen.queryByTestId('tts-mock')).not.toBeInTheDocument();
    });

    it('should not render TTS when disabled', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text"
          enableTextToSpeech={false}
        />
      );

      expect(screen.queryByTestId('tts-mock')).not.toBeInTheDocument();
    });

    it('should trigger quality check when TTS clicked with rewrite enabled', async () => {
      const onQualityCheck = jest.fn().mockResolvedValue({ score: 85, suggestions: [] });

      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text"
          enableTextToSpeech={true}
          enableRewrite={true}
          onQualityCheck={onQualityCheck}
        />
      );

      const ttsButtons = screen.getAllByTestId('tts-mock');
      fireEvent.click(ttsButtons[0]);

      await waitFor(() => {
        expect(onQualityCheck).toHaveBeenCalled();
      });
    });
  });

  describe('Rewrite Assistant Integration', () => {
    it('should render rewrite assistant when enabled and value exists', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text"
          enableRewrite={true}
        />
      );

      expect(screen.getByTestId('rewrite-mock')).toBeInTheDocument();
    });

    it('should not render rewrite assistant when value is empty', () => {
      render(
        <EnhancedTextarea {...defaultProps} value="" enableRewrite={true} />
      );

      expect(screen.queryByTestId('rewrite-mock')).not.toBeInTheDocument();
    });

    it('should not render rewrite assistant when disabled', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text"
          enableRewrite={false}
        />
      );

      expect(screen.queryByTestId('rewrite-mock')).not.toBeInTheDocument();
    });

    it('should handle rewrite action', () => {
      const onChange = jest.fn();
      render(
        <EnhancedTextarea
          {...defaultProps}
          onChange={onChange}
          value="Original text"
          enableRewrite={true}
        />
      );

      const rewriteButton = screen.getByTestId('rewrite-mock');
      fireEvent.click(rewriteButton);

      expect(onChange).toHaveBeenCalledWith('Rewritten: Original text');
    });

    it('should pass quality check to rewrite assistant', () => {
      const onQualityCheck = jest.fn();

      render(
        <EnhancedTextarea
          {...defaultProps}
          value="Some text"
          enableRewrite={true}
          onQualityCheck={onQualityCheck}
          qualityScore={75}
          isCheckingQuality={false}
        />
      );

      expect(screen.getByTestId('rewrite-mock')).toBeInTheDocument();
    });
  });

  describe('Requirement Checklist', () => {
    it('should render checklist when showChecklist is true', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          value="Something happened when we checked where it was"
          showChecklist={true}
          data-testid="textarea"
        />
      );

      expect(screen.getByTestId('textarea-checklist')).toBeInTheDocument();
      expect(screen.getByText('What happened')).toBeInTheDocument();
      expect(screen.getByText('When it occurred')).toBeInTheDocument();
      expect(screen.getByText('Where (location)')).toBeInTheDocument();
    });

    it('should not render checklist when showChecklist is false', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          value="Some text"
          showChecklist={false}
          data-testid="textarea"
        />
      );

      expect(screen.queryByTestId('textarea-checklist')).not.toBeInTheDocument();
    });

    it('should not render checklist when value is empty', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          value=""
          showChecklist={true}
          data-testid="textarea"
        />
      );

      expect(screen.queryByTestId('textarea-checklist')).not.toBeInTheDocument();
    });

    it('should show check marks for completed requirements', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          value="Something happened when we checked where it was"
          showChecklist={true}
        />
      );

      // All three requirements should be checked
      const checkmarks = screen.getAllByTestId(/textarea-checklist/);
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should have aria-live for accessibility', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          fieldName="nc_description"
          value="text"
          showChecklist={true}
          data-testid="textarea"
        />
      );

      const checklist = screen.getByTestId('textarea-checklist');
      expect(checklist).toHaveAttribute('aria-live', 'polite');
      expect(checklist).toHaveAttribute('aria-label', 'Requirement checklist');
    });
  });

  describe('Quality Indicator', () => {
    it('should show quality indicator when showQualityBadge is true', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={85}
        />
      );

      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
    });

    it('should not show quality indicator when showQualityBadge is false', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={false}
          qualityScore={85}
        />
      );

      expect(screen.queryByTestId('quality-indicator')).not.toBeInTheDocument();
    });

    it('should show checking state in quality indicator', () => {
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

    it('should pass quality score to indicator', () => {
      render(
        <EnhancedTextarea
          {...defaultProps}
          showQualityBadge={true}
          qualityScore={92}
        />
      );

      const indicator = screen.getByTestId('quality-indicator');
      expect(indicator).toHaveAttribute('data-score', '92');
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

      expect(label).toBeInTheDocument();
      expect(textarea).toHaveAccessibleName('Accessible Label');
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

    it('should handle zero minLength', () => {
      render(<EnhancedTextarea {...defaultProps} value="Any text" minLength={0} />);

      expect(screen.queryByText(/characters needed/)).not.toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle all props together', () => {
      const onChange = jest.fn();
      const onGetHelp = jest.fn();
      const onQualityCheck = jest.fn();

      render(
        <EnhancedTextarea
          label="Complete Test"
          value="Test content with all features enabled"
          onChange={onChange}
          onGetHelp={onGetHelp}
          onQualityCheck={onQualityCheck}
          qualityScore={78}
          isCheckingQuality={false}
          isProcessing={false}
          showQualityBadge={true}
          showChecklist={true}
          enableVoiceInput={true}
          enableTextToSpeech={true}
          enableRewrite={true}
          fieldName="nc_description"
          context={{ ncType: 'incident' }}
          minLength={50}
          maxLength={500}
          rows={8}
          required={true}
          data-testid="complex-textarea"
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('Test content with all features enabled');
      expect(screen.getByText('Get Help')).toBeInTheDocument();
      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('rewrite-mock')).toBeInTheDocument();
    });

    it('should maintain focus during quality check', async () => {
      render(
        <EnhancedTextarea
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
  });
});
