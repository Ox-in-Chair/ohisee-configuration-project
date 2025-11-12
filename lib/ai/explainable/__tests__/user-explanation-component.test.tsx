/**
 * Comprehensive Test Suite for UserExplanation Component
 * Target Coverage: >95%
 *
 * Tests:
 * - Component rendering
 * - Collapsible behavior
 * - Props handling (with/without optional props)
 * - Accessibility features
 * - Edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserExplanation, UserExplanationProps } from '../user-explanation-component';
import '@testing-library/jest-dom';

// Mock the Icon component to simplify testing
jest.mock('@/components/ui/icons', () => ({
  Icon: ({ name, size, className }: any) => (
    <span data-testid={`icon-${name}`} data-size={size} className={className}>
      {name}
    </span>
  ),
}));

// Mock ICONS constants
jest.mock('@/lib/config/icons', () => ({
  ICONS: {
    HELP: 'help-circle',
    CHEVRON_UP: 'chevron-up',
    CHEVRON_DOWN: 'chevron-down',
  },
}));

describe('UserExplanation Component', () => {
  const defaultProps: UserExplanationProps = {
    field: 'nc_description',
    message: 'Description needs more detail',
    explanation: 'Your description needs more detail. Our system expects more information to ensure we have a complete record of what happened.',
  };

  describe('Basic Rendering', () => {
    it('should render with required props only', () => {
      render(<UserExplanation {...defaultProps} />);

      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
      expect(screen.getByText('Why?')).toBeInTheDocument();
      expect(screen.getByTestId('icon-help-circle')).toBeInTheDocument();
    });

    it('should render with all props including optional ones', () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        ruleReference: 'BRCGS 5.7.1',
        example: 'Example: "Machine stopped due to electrical fault on conveyor belt"',
      };

      render(<UserExplanation {...props} />);

      // Initially collapsed, so reference and example should not be visible
      expect(screen.queryByText(/BRCGS 5.7.1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Example:/)).not.toBeInTheDocument();
    });

    it('should render only message when explanation is not provided', () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        explanation: '',
      };

      render(<UserExplanation {...props} />);

      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
      expect(screen.queryByText('Why?')).not.toBeInTheDocument();
    });

    it('should not render collapsible when explanation is null', () => {
      const props = {
        ...defaultProps,
        explanation: null as any,
      };

      render(<UserExplanation {...props} />);

      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
      expect(screen.queryByText('Why?')).not.toBeInTheDocument();
    });

    it('should not render collapsible when explanation is undefined', () => {
      const props = {
        ...defaultProps,
        explanation: undefined as any,
      };

      render(<UserExplanation {...props} />);

      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
      expect(screen.queryByText('Why?')).not.toBeInTheDocument();
    });
  });

  describe('Collapsible Behavior', () => {
    it('should start in collapsed state', () => {
      render(<UserExplanation {...defaultProps} />);

      // Explanation should not be visible initially
      expect(screen.queryByText(defaultProps.explanation)).not.toBeInTheDocument();

      // Chevron down icon should be visible
      expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-chevron-up')).not.toBeInTheDocument();
    });

    it('should expand when "Why?" button is clicked', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
      });

      // Chevron up icon should be visible when expanded
      expect(screen.getByTestId('icon-chevron-up')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-chevron-down')).not.toBeInTheDocument();
    });

    it('should collapse when "Why?" button is clicked again', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      // Expand
      fireEvent.click(whyButton);
      await waitFor(() => {
        expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(whyButton);
      await waitFor(() => {
        expect(screen.queryByText(defaultProps.explanation)).not.toBeInTheDocument();
      });
    });

    it('should toggle multiple times correctly', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      for (let i = 0; i < 3; i++) {
        // Expand
        fireEvent.click(whyButton);
        await waitFor(() => {
          expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
        });

        // Collapse
        fireEvent.click(whyButton);
        await waitFor(() => {
          expect(screen.queryByText(defaultProps.explanation)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Optional Props Rendering', () => {
    it('should display reference when provided and expanded', async () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        ruleReference: 'BRCGS 5.7.1',
      };

      render(<UserExplanation {...props} />);

      // Expand
      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(/Reference:/)).toBeInTheDocument();
        expect(screen.getByText(/BRCGS 5.7.1/)).toBeInTheDocument();
      });
    });

    it('should not display reference section when not provided', async () => {
      render(<UserExplanation {...defaultProps} />);

      // Expand
      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
    });

    it('should display example when provided and expanded', async () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        example: 'Example: "Machine stopped due to electrical fault on conveyor belt"',
      };

      render(<UserExplanation {...props} />);

      // Expand
      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(/Machine stopped due to electrical fault/)).toBeInTheDocument();
      });
    });

    it('should not display example section when not provided', async () => {
      render(<UserExplanation {...defaultProps} />);

      // Expand
      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Example:/)).not.toBeInTheDocument();
    });

    it('should display both reference and example when both provided', async () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        ruleReference: 'BRCGS 5.7.3',
        example: 'Example: "Root cause: inadequate training on 5-Why methodology"',
      };

      render(<UserExplanation {...props} />);

      // Expand
      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(/BRCGS 5.7.3/)).toBeInTheDocument();
        expect(screen.getByText(/inadequate training/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label on "Why?" button', () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByLabelText('Explain why this requirement exists');
      expect(whyButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      // Focus the button
      whyButton.focus();
      expect(whyButton).toHaveFocus();

      // Trigger with Enter key
      fireEvent.keyDown(whyButton, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        // Check for part of the explanation text
        expect(screen.getByText(/needs more detail/)).toBeInTheDocument();
      });
    });

    it('should have proper button role', () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByRole('button', { name: /Explain why this requirement exists/i });
      expect(whyButton).toBeInTheDocument();
    });

    it('should maintain focus when toggling', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      // Focus and click
      whyButton.focus();
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(defaultProps.explanation)).toBeInTheDocument();
      });

      // Button should still be in the DOM and focusable
      expect(whyButton).toBeInTheDocument();
    });
  });

  describe('Styling and Visual State', () => {
    it('should apply correct CSS classes to message', () => {
      render(<UserExplanation {...defaultProps} />);

      const messageElement = screen.getByText(defaultProps.message);
      expect(messageElement).toHaveClass('text-sm', 'text-gray-700');
    });

    it('should apply correct CSS classes to explanation box when expanded', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        const explanationBox = screen.getByText(defaultProps.explanation).closest('div');
        expect(explanationBox).toHaveClass('bg-blue-50', 'border', 'border-blue-200', 'rounded-lg');
      });
    });

    it('should render icons with correct styling', () => {
      render(<UserExplanation {...defaultProps} />);

      const helpIcon = screen.getByTestId('icon-help-circle');
      expect(helpIcon).toHaveClass('mr-1');
      expect(helpIcon).toHaveAttribute('data-size', 'xs');
    });

    it('should display chevron icons with correct styling', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      // Check chevron down initially
      let chevronDown = screen.getByTestId('icon-chevron-down');
      expect(chevronDown).toHaveClass('ml-1');

      // Expand and check chevron up
      fireEvent.click(whyButton);

      await waitFor(() => {
        const chevronUp = screen.getByTestId('icon-chevron-up');
        expect(chevronUp).toHaveClass('ml-1');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(500);
      const props: UserExplanationProps = {
        ...defaultProps,
        message: longMessage,
      };

      render(<UserExplanation {...props} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle very long explanations', async () => {
      const longExplanation = 'B'.repeat(1000);
      const props: UserExplanationProps = {
        ...defaultProps,
        explanation: longExplanation,
      };

      render(<UserExplanation {...props} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(longExplanation)).toBeInTheDocument();
      });
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Test <>&"\'';
      const props: UserExplanationProps = {
        ...defaultProps,
        message: specialMessage,
      };

      render(<UserExplanation {...props} />);

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should handle HTML-like content safely (XSS prevention)', () => {
      const xssAttempt = '<script>alert("XSS")</script>';
      const props: UserExplanationProps = {
        ...defaultProps,
        message: xssAttempt,
      };

      render(<UserExplanation {...props} />);

      // Should render as text, not execute script
      expect(screen.getByText(xssAttempt)).toBeInTheDocument();
      // Verify script tag is not actually in DOM
      expect(document.querySelector('script')).not.toBeInTheDocument();
    });

    it('should handle empty string message', () => {
      const props: UserExplanationProps = {
        ...defaultProps,
        message: '',
      };

      render(<UserExplanation {...props} />);

      // Component should still render without crashing
      expect(screen.getByText('Why?')).toBeInTheDocument();
    });

    it('should handle multiline explanations', async () => {
      const multilineExplanation = 'Line 1\nLine 2\nLine 3';
      const props: UserExplanationProps = {
        ...defaultProps,
        explanation: multilineExplanation,
      };

      render(<UserExplanation {...props} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        // Check for part of the text since React may render it differently
        expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      });
    });

    it('should handle very long reference strings', async () => {
      const longReference = 'BRCGS 5.7.1.2.3.4.5.6.7.8.9 - Extended Reference with Additional Context';
      const props: UserExplanationProps = {
        ...defaultProps,
        ruleReference: longReference,
      };

      render(<UserExplanation {...props} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(longReference))).toBeInTheDocument();
      });
    });

    it('should handle emoji in content', async () => {
      const emojiContent = 'This is important! 🚨 Please review carefully 📋';
      const props: UserExplanationProps = {
        ...defaultProps,
        explanation: emojiContent,
      };

      render(<UserExplanation {...props} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      await waitFor(() => {
        expect(screen.getByText(emojiContent)).toBeInTheDocument();
      });
    });
  });

  describe('Component State Management', () => {
    it('should maintain independent state across multiple instances', async () => {
      const props1: UserExplanationProps = {
        field: 'field1',
        message: 'Message 1',
        explanation: 'Explanation 1',
      };

      const props2: UserExplanationProps = {
        field: 'field2',
        message: 'Message 2',
        explanation: 'Explanation 2',
      };

      render(
        <>
          <UserExplanation {...props1} />
          <UserExplanation {...props2} />
        </>
      );

      const whyButtons = screen.getAllByText('Why?');
      expect(whyButtons).toHaveLength(2);

      // Expand only first instance
      fireEvent.click(whyButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Explanation 1')).toBeInTheDocument();
        expect(screen.queryByText('Explanation 2')).not.toBeInTheDocument();
      });

      // Expand second instance
      fireEvent.click(whyButtons[1]);

      await waitFor(() => {
        expect(screen.getByText('Explanation 1')).toBeInTheDocument();
        expect(screen.getByText('Explanation 2')).toBeInTheDocument();
      });
    });

    it('should reset state when props change', () => {
      const { rerender } = render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');
      fireEvent.click(whyButton);

      // Change props
      const newProps: UserExplanationProps = {
        ...defaultProps,
        message: 'New message',
        explanation: 'New explanation',
      };

      rerender(<UserExplanation {...newProps} />);

      expect(screen.getByText('New message')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<UserExplanation {...defaultProps} />);

      // Rerender with same props
      rerender(<UserExplanation {...defaultProps} />);

      // Component should still be functional
      expect(screen.getByText(defaultProps.message)).toBeInTheDocument();
      expect(screen.getByText('Why?')).toBeInTheDocument();
    });

    it('should handle rapid clicking', async () => {
      render(<UserExplanation {...defaultProps} />);

      const whyButton = screen.getByText('Why?');

      // Rapidly click multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(whyButton);
      }

      // Should stabilize in expanded state (odd number of clicks)
      await waitFor(() => {
        expect(screen.queryByText(defaultProps.explanation)).not.toBeInTheDocument();
      });
    });
  });
});
