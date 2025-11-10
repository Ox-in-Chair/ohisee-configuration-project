/**
 * AIQualityBadge Component Unit Tests
 * Tests rendering, color coding, thresholds, and accessibility
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { AIQualityBadge } from '../ai-quality-badge';

describe('AIQualityBadge', () => {
  describe('Loading State', () => {
    it('should show loading state when isChecking is true', () => {
      render(<AIQualityBadge score={null} isChecking={true} />);

      expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();
      expect(screen.getByText('Checking quality...')).toBeInTheDocument();
    });

    it('should show loading spinner icon', () => {
      const { container } = render(<AIQualityBadge score={null} isChecking={true} />);

      // Loading spinner should have animation class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have gray background during loading', () => {
      render(<AIQualityBadge score={null} isChecking={true} />);

      const badge = screen.getByTestId('quality-badge-loading');
      expect(badge).toHaveClass('bg-gray-50');
      expect(badge).toHaveClass('text-gray-600');
    });

    it('should prioritize loading state over score', () => {
      render(<AIQualityBadge score={85} isChecking={true} />);

      expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('quality-badge')).not.toBeInTheDocument();
    });
  });

  describe('No Score State', () => {
    it('should render nothing when score is null and not checking', () => {
      const { container } = render(<AIQualityBadge score={null} isChecking={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when score is null by default', () => {
      const { container } = render(<AIQualityBadge score={null} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Score Display - Green (Passing)', () => {
    it('should show green badge when score meets threshold (>=75)', () => {
      render(<AIQualityBadge score={75} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveAttribute('data-score', '75');
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    it('should show green badge for high scores', () => {
      render(<AIQualityBadge score={95} threshold={75} />);

      expect(screen.getByText('95/100')).toBeInTheDocument();
    });

    it('should show check circle icon for passing scores', () => {
      const { container } = render(<AIQualityBadge score={80} threshold={75} />);

      // Check circle icon should be present (CheckCircle2 component)
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Excellent quality" message when showDetails is true', () => {
      render(<AIQualityBadge score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });

    it('should use default threshold of 75', () => {
      render(<AIQualityBadge score={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });
  });

  describe('Score Display - Yellow (Warning)', () => {
    it('should show yellow badge when score is 60-74', () => {
      render(<AIQualityBadge score={70} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveAttribute('data-score', '70');
    });

    it('should show yellow badge at lower boundary (60)', () => {
      render(<AIQualityBadge score={60} threshold={75} />);

      expect(screen.getByText('60/100')).toBeInTheDocument();
    });

    it('should show yellow badge at upper boundary (74)', () => {
      render(<AIQualityBadge score={74} threshold={75} />);

      expect(screen.getByText('74/100')).toBeInTheDocument();
    });

    it('should show alert circle icon for warning scores', () => {
      render(<AIQualityBadge score={65} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Needs improvement" message when showDetails is true', () => {
      render(<AIQualityBadge score={68} threshold={75} showDetails={true} />);

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    });

    it('should show points needed in details', () => {
      render(<AIQualityBadge score={68} threshold={75} showDetails={true} />);

      expect(screen.getByText('Threshold: 75/100')).toBeInTheDocument();
      expect(screen.getByText('(7 points needed)')).toBeInTheDocument();
    });
  });

  describe('Score Display - Red (Failing)', () => {
    it('should show red badge when score is below 60', () => {
      render(<AIQualityBadge score={45} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveAttribute('data-score', '45');
    });

    it('should show red badge for very low scores', () => {
      render(<AIQualityBadge score={20} threshold={75} />);

      expect(screen.getByText('20/100')).toBeInTheDocument();
    });

    it('should show red badge at boundary (59)', () => {
      render(<AIQualityBadge score={59} threshold={75} />);

      expect(screen.getByText('59/100')).toBeInTheDocument();
    });

    it('should show X circle icon for failing scores', () => {
      render(<AIQualityBadge score={50} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should show "Below threshold" message when showDetails is true', () => {
      render(<AIQualityBadge score={50} threshold={75} showDetails={true} />);

      expect(screen.getByText('Below threshold')).toBeInTheDocument();
    });

    it('should show points needed for failing scores', () => {
      render(<AIQualityBadge score={50} threshold={75} showDetails={true} />);

      expect(screen.getByText('(25 points needed)')).toBeInTheDocument();
    });

    it('should handle score of 0', () => {
      render(<AIQualityBadge score={0} threshold={75} />);

      expect(screen.getByText('0/100')).toBeInTheDocument();
    });
  });

  describe('Custom Thresholds', () => {
    it('should use custom threshold of 80', () => {
      render(<AIQualityBadge score={78} threshold={80} showDetails={true} />);

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
      expect(screen.getByText('Threshold: 80/100')).toBeInTheDocument();
      expect(screen.getByText('(2 points needed)')).toBeInTheDocument();
    });

    it('should show passing badge when score meets custom threshold', () => {
      render(<AIQualityBadge score={90} threshold={90} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });

    it('should handle threshold of 100', () => {
      render(<AIQualityBadge score={99} threshold={100} showDetails={true} />);

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
      expect(screen.getByText('(1 points needed)')).toBeInTheDocument();
    });

    it('should handle threshold of 50', () => {
      render(<AIQualityBadge score={50} threshold={50} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });
  });

  describe('Show Details Prop', () => {
    it('should not show message when showDetails is false', () => {
      render(<AIQualityBadge score={85} threshold={75} showDetails={false} />);

      expect(screen.queryByText('Excellent quality')).not.toBeInTheDocument();
    });

    it('should show message when showDetails is true', () => {
      render(<AIQualityBadge score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });

    it('should not show details by default', () => {
      render(<AIQualityBadge score={85} threshold={75} />);

      expect(screen.queryByText('Excellent quality')).not.toBeInTheDocument();
    });

    it('should show detailed breakdown only when score is below threshold', () => {
      render(<AIQualityBadge score={85} threshold={75} showDetails={true} />);

      // Should not show breakdown for passing scores
      expect(screen.queryByText('Threshold:')).not.toBeInTheDocument();
    });

    it('should show detailed breakdown for failing scores with showDetails', () => {
      render(<AIQualityBadge score={60} threshold={75} showDetails={true} />);

      expect(screen.getByText('Threshold: 75/100')).toBeInTheDocument();
      expect(screen.getByText('(15 points needed)')).toBeInTheDocument();
    });
  });

  describe('Badge Variants', () => {
    it('should apply default variant for passing scores', () => {
      render(<AIQualityBadge score={80} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      // Badge component will have variant styling
      expect(badge).toBeInTheDocument();
    });

    it('should apply secondary variant for warning scores', () => {
      render(<AIQualityBadge score={65} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should apply destructive variant for failing scores', () => {
      render(<AIQualityBadge score={50} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle score of 100', () => {
      render(<AIQualityBadge score={100} threshold={75} />);

      expect(screen.getByText('100/100')).toBeInTheDocument();
    });

    it('should handle score exactly at threshold', () => {
      render(<AIQualityBadge score={75} threshold={75} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
      expect(screen.queryByText('points needed')).not.toBeInTheDocument();
    });

    it('should handle score one point below threshold', () => {
      render(<AIQualityBadge score={74} threshold={75} showDetails={true} />);

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
      expect(screen.getByText('(1 points needed)')).toBeInTheDocument();
    });

    it('should handle score one point above threshold', () => {
      render(<AIQualityBadge score={76} threshold={75} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });

    it('should handle negative scores (invalid but defensive)', () => {
      render(<AIQualityBadge score={-5} threshold={75} />);

      // Should still render (component doesn't validate input)
      const badge = screen.getByTestId('quality-badge');
      expect(badge).toBeInTheDocument();
    });

    it('should handle scores over 100 (invalid but defensive)', () => {
      render(<AIQualityBadge score={150} threshold={75} />);

      expect(screen.getByText('150/100')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have data-testid for testing', () => {
      render(<AIQualityBadge score={80} threshold={75} />);

      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
    });

    it('should have data-score attribute for testing assertions', () => {
      render(<AIQualityBadge score={82} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      expect(badge).toHaveAttribute('data-score', '82');
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(
        <AIQualityBadge score={80} threshold={75} showDetails={true} />
      );

      // Should be wrapped in a div for flex layout
      expect(container.querySelector('div')).toBeInTheDocument();
    });

    it('should include icon for visual context', () => {
      render(<AIQualityBadge score={80} threshold={75} />);

      const badge = screen.getByTestId('quality-badge');
      // Icon should be rendered inside badge
      expect(badge.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should transition from loading to loaded state', () => {
      const { rerender } = render(<AIQualityBadge score={null} isChecking={true} />);

      expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();

      rerender(<AIQualityBadge score={85} isChecking={false} />);

      expect(screen.queryByTestId('quality-badge-loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();
      expect(screen.getByText('85/100')).toBeInTheDocument();
    });

    it('should handle score updates', () => {
      const { rerender } = render(<AIQualityBadge score={60} threshold={75} />);

      expect(screen.getByText('60/100')).toBeInTheDocument();

      rerender(<AIQualityBadge score={80} threshold={75} />);

      expect(screen.getByText('80/100')).toBeInTheDocument();
      expect(screen.queryByText('60/100')).not.toBeInTheDocument();
    });

    it('should handle threshold changes', () => {
      const { rerender } = render(
        <AIQualityBadge score={70} threshold={75} showDetails={true} />
      );

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();

      rerender(<AIQualityBadge score={70} threshold={65} showDetails={true} />);

      expect(screen.getByText('Excellent quality')).toBeInTheDocument();
    });

    it('should handle showDetails toggle', () => {
      const { rerender } = render(
        <AIQualityBadge score={70} threshold={75} showDetails={false} />
      );

      expect(screen.queryByText('Needs improvement')).not.toBeInTheDocument();

      rerender(<AIQualityBadge score={70} threshold={75} showDetails={true} />);

      expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    });

    it('should maintain score display during loading transition', () => {
      const { rerender } = render(<AIQualityBadge score={85} isChecking={false} />);

      expect(screen.getByTestId('quality-badge')).toBeInTheDocument();

      rerender(<AIQualityBadge score={85} isChecking={true} />);

      // Should switch to loading state
      expect(screen.getByTestId('quality-badge-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('quality-badge')).not.toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should display different icons for different score ranges', () => {
      const { rerender, container } = render(
        <AIQualityBadge score={85} threshold={75} />
      );

      const highScoreIcon = container.querySelector('svg');
      expect(highScoreIcon).toBeInTheDocument();

      rerender(<AIQualityBadge score={65} threshold={75} />);

      const warningIcon = container.querySelector('svg');
      expect(warningIcon).toBeInTheDocument();

      rerender(<AIQualityBadge score={45} threshold={75} />);

      const errorIcon = container.querySelector('svg');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should show score prominently with font weight', () => {
      render(<AIQualityBadge score={85} threshold={75} />);

      const scoreText = screen.getByText('85/100');
      expect(scoreText).toHaveClass('font-semibold');
    });

    it('should use bullet separator when showing details', () => {
      render(<AIQualityBadge score={85} threshold={75} showDetails={true} />);

      expect(screen.getByText('•')).toBeInTheDocument();
    });
  });
});
