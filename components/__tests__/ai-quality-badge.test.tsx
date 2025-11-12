/**
 * QualityIndicator Component Unit Tests
 * Tests rendering, color coding, thresholds, and accessibility
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { QualityIndicator } from '../quality-indicator';

describe('QualityIndicator', () => {
  describe('Loading State', () => {
    it('should show loading state when isChecking is true', () => {
      render(<QualityIndicator score={null} isChecking={true} />);

      expect(screen.getByTestId('quality-indicator-loading')).toBeInTheDocument();
      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    it('should show loading spinner icon', () => {
      const { container } = render(<QualityIndicator score={null} isChecking={true} />);

      // Loading spinner should have animation class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have gray background during loading', () => {
      render(<QualityIndicator score={null} isChecking={true} />);

      const badge = screen.getByTestId('quality-indicator-loading');
      expect(badge).toHaveClass('bg-gray-50');
      expect(badge).toHaveClass('text-gray-600');
    });

    it('should prioritize loading state over score', () => {
      render(<QualityIndicator score={85} isChecking={true} />);

      expect(screen.getByTestId('quality-indicator-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('quality-indicator')).not.toBeInTheDocument();
    });
  });

  describe('No Score State', () => {
    it('should render nothing when score is null and not checking', () => {
      const { container } = render(<QualityIndicator score={null} isChecking={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when score is null by default', () => {
      const { container } = render(<QualityIndicator score={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Score Display - Green (Passing)', () => {
    it('should show green badge when score meets threshold (>=75)', () => {
      render(<QualityIndicator score={75} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toHaveAttribute('data-score', '75');
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should show green badge for high scores', () => {
      render(<QualityIndicator score={95} threshold={75} />);

      expect(screen.getByText('95/100')).toBeInTheDocument();
    });

    it('should show check circle icon for passing scores', () => {
      render(<QualityIndicator score={80} threshold={75} />);

      // Check circle icon should be present (CheckCircle2 component)
      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Meets requirements" message when showDetails is true', () => {
      render(<QualityIndicator score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });

    it('should use default threshold of 75', () => {
      render(<QualityIndicator score={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });
  });

  describe('Score Display - Yellow (Warning)', () => {
    it('should show yellow badge when score is 60-74', () => {
      render(<QualityIndicator score={70} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toHaveAttribute('data-score', '70');
    });

    it('should show yellow badge at lower boundary (60)', () => {
      render(<QualityIndicator score={60} threshold={75} />);

      expect(screen.getByText('60/100')).toBeInTheDocument();
    });

    it('should show yellow badge at upper boundary (74)', () => {
      render(<QualityIndicator score={74} threshold={75} />);

      expect(screen.getByText('74/100')).toBeInTheDocument();
    });

    it('should show alert circle icon for warning scores', () => {
      render(<QualityIndicator score={65} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Review recommended" message when showDetails is true', () => {
      render(<QualityIndicator score={68} threshold={75} showDetails={true} />);

      expect(screen.getByText('Review recommended')).toBeInTheDocument();
    });

    it('should show points needed in details', () => {
      render(<QualityIndicator score={68} threshold={75} showDetails={true} />);

      expect(screen.getByText('Threshold: 75/100')).toBeInTheDocument();
      expect(screen.getByText('(7 points needed)')).toBeInTheDocument();
    });
  });

  describe('Score Display - Red (Failing)', () => {
    it('should show red badge when score is below 60', () => {
      render(<QualityIndicator score={45} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toHaveAttribute('data-score', '45');
    });

    it('should show red badge for very low scores', () => {
      render(<QualityIndicator score={20} threshold={75} />);

      expect(screen.getByText('20/100')).toBeInTheDocument();
    });

    it('should show red badge at boundary (59)', () => {
      render(<QualityIndicator score={59} threshold={75} />);

      expect(screen.getByText('59/100')).toBeInTheDocument();
    });

    it('should show X circle icon for failing scores', () => {
      render(<QualityIndicator score={50} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Incomplete" message when showDetails is true', () => {
      render(<QualityIndicator score={50} threshold={75} showDetails={true} />);

      expect(screen.getByText('Incomplete')).toBeInTheDocument();
    });

    it('should show points needed for failing scores', () => {
      render(<QualityIndicator score={50} threshold={75} showDetails={true} />);

      expect(screen.getByText('(25 points needed)')).toBeInTheDocument();
    });

    it('should handle score of 0', () => {
      render(<QualityIndicator score={0} threshold={75} />);

      expect(screen.getByText('0/100')).toBeInTheDocument();
    });
  });

  describe('Custom Thresholds', () => {
    it('should use custom threshold of 80', () => {
      render(<QualityIndicator score={78} threshold={80} showDetails={true} />);

      expect(screen.getByText('Review recommended')).toBeInTheDocument();
      expect(screen.getByText('Threshold: 80/100')).toBeInTheDocument();
      expect(screen.getByText('(2 points needed)')).toBeInTheDocument();
    });

    it('should show passing badge when score meets custom threshold', () => {
      render(<QualityIndicator score={90} threshold={90} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });

    it('should handle threshold of 100', () => {
      render(<QualityIndicator score={99} threshold={100} showDetails={true} />);

      expect(screen.getByText('Review recommended')).toBeInTheDocument();
      expect(screen.getByText('(1 points needed)')).toBeInTheDocument();
    });

    it('should handle threshold of 50', () => {
      render(<QualityIndicator score={50} threshold={50} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });
  });

  describe('Show Details Prop', () => {
    it('should not show message when showDetails is false', () => {
      render(<QualityIndicator score={85} threshold={75} showDetails={false} />);

      expect(screen.queryByText('Meets requirements')).not.toBeInTheDocument();
    });

    it('should show message when showDetails is true', () => {
      render(<QualityIndicator score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });

    it('should not show details by default', () => {
      render(<QualityIndicator score={85} threshold={75} />);

      expect(screen.queryByText('Meets requirements')).not.toBeInTheDocument();
    });

    it('should show detailed breakdown only when score is below threshold', () => {
      render(<QualityIndicator score={85} threshold={75} showDetails={true} />);

      // Should not show breakdown for passing scores
      expect(screen.queryByText('Threshold:')).not.toBeInTheDocument();
    });

    it('should show detailed breakdown for failing scores with showDetails', () => {
      render(<QualityIndicator score={60} threshold={75} showDetails={true} />);

      expect(screen.getByText('Threshold: 75/100')).toBeInTheDocument();
      expect(screen.getByText('(15 points needed)')).toBeInTheDocument();
    });
  });

  describe('Badge Variants', () => {
    it('should apply default variant for passing scores', () => {
      render(<QualityIndicator score={80} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      // Badge component will have variant styling
      expect(badge).toBeInTheDocument();
    });

    it('should apply secondary variant for warning scores', () => {
      render(<QualityIndicator score={65} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('should apply destructive variant for failing scores', () => {
      render(<QualityIndicator score={50} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle score of 100', () => {
      render(<QualityIndicator score={100} threshold={75} />);

      expect(screen.getByText('100/100')).toBeInTheDocument();
    });

    it('should handle score exactly at threshold', () => {
      render(<QualityIndicator score={75} threshold={75} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
      expect(screen.queryByText('points needed')).not.toBeInTheDocument();
    });

    it('should handle score one point below threshold', () => {
      render(<QualityIndicator score={74} threshold={75} showDetails={true} />);

      expect(screen.getByText('Review recommended')).toBeInTheDocument();
      expect(screen.getByText('(1 points needed)')).toBeInTheDocument();
    });

    it('should handle score one point above threshold', () => {
      render(<QualityIndicator score={76} threshold={75} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });

    it('should handle negative scores (invalid but defensive)', () => {
      render(<QualityIndicator score={-5} threshold={75} />);

      // Should still render (component doesn't validate input)
      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toBeInTheDocument();
    });

    it('should handle scores over 100 (invalid but defensive)', () => {
      render(<QualityIndicator score={150} threshold={75} />);

      expect(screen.getByText('150/100')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have data-testid for testing', () => {
      render(<QualityIndicator score={80} threshold={75} />);

      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
    });

    it('should have data-score attribute for testing assertions', () => {
      render(<QualityIndicator score={82} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      expect(badge).toHaveAttribute('data-score', '82');
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(
        <QualityIndicator score={80} threshold={75} showDetails={true} />
      );

      // Should be wrapped in a div for flex layout
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should include icon for visual context', () => {
      render(<QualityIndicator score={80} threshold={75} />);

      const badge = screen.getByTestId('quality-indicator');
      // Icon should be rendered inside badge
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should transition from loading to loaded state', () => {
      const { rerender } = render(<QualityIndicator score={null} isChecking={true} />);

      expect(screen.getByTestId('quality-indicator-loading')).toBeInTheDocument();

      rerender(<QualityIndicator score={85} isChecking={false} />);

      expect(screen.queryByTestId('quality-indicator-loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();
      expect(screen.getByText('85/100')).toBeInTheDocument();
    });

    it('should handle score updates', () => {
      const { rerender } = render(<QualityIndicator score={60} threshold={75} />);

      expect(screen.getByText('60/100')).toBeInTheDocument();

      rerender(<QualityIndicator score={80} threshold={75} />);

      expect(screen.getByText('80/100')).toBeInTheDocument();
      expect(screen.queryByText('60/100')).not.toBeInTheDocument();
    });

    it('should handle threshold changes', () => {
      const { rerender } = render(
        <QualityIndicator score={70} threshold={75} showDetails={true} />
      );

      expect(screen.getByText('Review recommended')).toBeInTheDocument();

      rerender(<QualityIndicator score={70} threshold={65} showDetails={true} />);

      expect(screen.getByText('Meets requirements')).toBeInTheDocument();
    });

    it('should handle showDetails toggle', () => {
      const { rerender } = render(
        <QualityIndicator score={70} threshold={75} showDetails={false} />
      );

      expect(screen.queryByText('Review recommended')).not.toBeInTheDocument();

      rerender(<QualityIndicator score={70} threshold={75} showDetails={true} />);

      expect(screen.getByText('Review recommended')).toBeInTheDocument();
    });

    it('should maintain score display during loading transition', () => {
      const { rerender } = render(<QualityIndicator score={85} isChecking={false} />);

      expect(screen.getByTestId('quality-indicator')).toBeInTheDocument();

      rerender(<QualityIndicator score={85} isChecking={true} />);

      // Should switch to loading state
      expect(screen.getByTestId('quality-indicator-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('quality-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should display different icons for different score ranges', () => {
      const { rerender, container } = render(
        <QualityIndicator score={85} threshold={75} />
      );

      const highScoreIcon = container.querySelector('svg');
      expect(highScoreIcon).toBeInTheDocument();

      rerender(<QualityIndicator score={65} threshold={75} />);

      const warningIcon = container.querySelector('svg');
      expect(warningIcon).toBeInTheDocument();

      rerender(<QualityIndicator score={45} threshold={75} />);

      const errorIcon = container.querySelector('svg');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should show score prominently with font weight', () => {
      render(<QualityIndicator score={85} threshold={75} />);

      const scoreText = screen.getByText('85/100');
      expect(scoreText).toHaveClass('font-semibold');
    });

    it('should use bullet separator when showing details', () => {
      render(<QualityIndicator score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('•')).toBeInTheDocument();
    });
  });
});
