import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getNCATrendAnalysis } from '@/app/actions/nca-trend-actions';
import { NCTrendAnalysisMonthlyChart } from '@/components/dashboard/nca-trend-analysis-monthly-chart';
import { NCAAgeAnalysisChart } from '@/components/dashboard/nca-age-analysis-chart';
import { NCACategoryBreakdownChart } from '@/components/dashboard/nca-category-breakdown-chart';
import { NCASourceBreakdownChart } from '@/components/dashboard/nca-source-breakdown-chart';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';

/**
 * NCA Trend Analysis Dashboard Page
 * Procedure 5.7.F2: Comprehensive NCA Trend Analysis for pattern identification
 * 
 * Displays:
 * - Monthly trends (opened vs closed)
 * - Age analysis (<10, <20, <30, >30 days)
 * - Category breakdown
 * - Source breakdown (Kangopak vs Supplier vs Customer)
 */

export default async function NCATrendAnalysisPage() {
  const currentYear = new Date().getFullYear();
  const trendData = await getNCATrendAnalysis(currentYear);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">NCA Trend Analysis</h1>
        <p className="text-gray-600">Procedure 5.7.F2 - Pattern Identification and Management Review</p>
        <Badge variant="outline" className="mt-2">
          Year: {currentYear}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Opened (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{trendData.yearToDate.opened}</div>
            <p className="text-xs text-gray-500 mt-1">NCAs opened this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Closed (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{trendData.yearToDate.closed}</div>
            <p className="text-xs text-gray-500 mt-1">NCAs closed this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Still Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{trendData.yearToDate.stillOpen}</div>
            <p className="text-xs text-gray-500 mt-1">NCAs pending closure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Closure Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {trendData.yearToDate.opened > 0
                ? Math.round((trendData.yearToDate.closed / trendData.yearToDate.opened) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-gray-500 mt-1">Percentage closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.TRENDING_UP} size="md" className="text-primary-600" />
            Monthly Trends - Opened vs Closed
          </CardTitle>
          <CardDescription>NCA count by month showing opened and closed trends</CardDescription>
        </CardHeader>
        <CardContent>
          <NCTrendAnalysisMonthlyChart data={trendData.monthlyTrends} />
        </CardContent>
      </Card>

      {/* Age Analysis Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name={ICONS.CALENDAR} size="md" className="text-primary-600" />
            Age Analysis
          </CardTitle>
          <CardDescription>NCA closure time distribution (&lt;10, &lt;20, &lt;30, &gt;30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <NCAAgeAnalysisChart data={trendData.ageAnalysis} />
        </CardContent>
      </Card>

      {/* Category and Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name={ICONS.BAR_CHART} size="md" className="text-primary-600" />
              Issue Category Breakdown
            </CardTitle>
            <CardDescription>NCAs categorized by issue type</CardDescription>
          </CardHeader>
          <CardContent>
            <NCACategoryBreakdownChart data={trendData.categoryBreakdown} />
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name={ICONS.PIE_CHART} size="md" className="text-primary-600" />
              Source Breakdown
            </CardTitle>
            <CardDescription>NCAs by source (Kangopak, Supplier, Customer)</CardDescription>
          </CardHeader>
          <CardContent>
            <NCASourceBreakdownChart data={trendData.sourceBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Pattern Identification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pattern Identification</CardTitle>
          <CardDescription>Key insights from trend analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Top Categories */}
            {trendData.categoryBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Top Issue Categories:</h3>
                <div className="flex flex-wrap gap-2">
                  {trendData.categoryBreakdown.slice(0, 5).map((category) => (
                    <Badge key={category.category} variant="outline">
                      {category.category}: {category.count} ({category.percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source Distribution */}
            {trendData.sourceBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Source Distribution:</h3>
                <div className="flex flex-wrap gap-2">
                  {trendData.sourceBreakdown.map((source) => (
                    <Badge key={source.source} variant="outline">
                      {source.source.charAt(0).toUpperCase() + source.source.slice(1)}: {source.count} ({source.percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Age Analysis Summary */}
            <div>
              <h3 className="font-semibold mb-2">Closure Performance:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {trendData.ageAnalysis.reduce(
                  (acc, month) => ({
                    lessThan10: acc.lessThan10 + month.lessThan10Days,
                    lessThan20: acc.lessThan20 + month.lessThan20Days,
                    lessThan30: acc.lessThan30 + month.lessThan30Days,
                    moreThan30: acc.moreThan30 + month.moreThan30Days,
                  }),
                  { lessThan10: 0, lessThan20: 0, lessThan30: 0, moreThan30: 0 }
                ) && (
                  <>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {trendData.ageAnalysis.reduce((sum, m) => sum + m.lessThan10Days, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Closed in {'<'}10 days</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {trendData.ageAnalysis.reduce((sum, m) => sum + m.lessThan20Days, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Closed in {'<'}20 days</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <div className="text-2xl font-bold text-yellow-600">
                        {trendData.ageAnalysis.reduce((sum, m) => sum + m.lessThan30Days, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Closed in {'<'}30 days</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="text-2xl font-bold text-red-600">
                        {trendData.ageAnalysis.reduce((sum, m) => sum + m.moreThan30Days, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Closed in {'>'}30 days</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

