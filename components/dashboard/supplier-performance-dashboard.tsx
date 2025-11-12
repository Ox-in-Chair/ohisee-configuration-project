/**
 * Supplier Performance Dashboard Component
 * Displays supplier metrics, NCA trends, and performance scores
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Icon } from '@/components/ui/icons';
import { ICONS } from '@/lib/config/icons';
import { getSupplierTrendAnalysis, calculateSupplierPerformanceScore } from '@/lib/services/supplier-performance-service';

interface Supplier {
  id: string;
  supplier_code: string;
  supplier_name: string;
  approval_status: string;
  nca_count_ytd: number;
  nca_count_last_12mo: number;
  quality_rating: number | null;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  on_time_delivery_pct: number | null;
}

interface SupplierPerformanceDashboardProps {
  suppliers: Supplier[];
}

export function SupplierPerformanceDashboard({ suppliers }: SupplierPerformanceDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [supplierScores, setSupplierScores] = useState<Record<string, number>>({});
  const [supplierTrends, setSupplierTrends] = useState<Record<string, { trend: string; change: number }>>({});
  const [loading, setLoading] = useState(true);

  // Calculate performance scores and trends
  // OPTIMIZED: Fetch all supplier metrics in parallel instead of sequentially
  useEffect(() => {
    async function loadMetrics() {
      if (suppliers.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch all scores and trends in parallel for better performance
        const metricsPromises = suppliers.map(async (supplier) => {
          try {
            const [score, trend] = await Promise.all([
              calculateSupplierPerformanceScore(supplier.id),
              getSupplierTrendAnalysis(supplier.id),
            ]);
            return {
              supplierId: supplier.id,
              score,
              trend: { trend: trend.trend, change: trend.change },
            };
          } catch (error) {
            console.error(`Error loading metrics for ${supplier.supplier_name}:`, error);
            return {
              supplierId: supplier.id,
              score: 0,
              trend: { trend: 'stable', change: 0 },
            };
          }
        });

        // Wait for all metrics to load in parallel
        const results = await Promise.all(metricsPromises);

        // Convert array results to maps
        const scores: Record<string, number> = {};
        const trends: Record<string, { trend: string; change: number }> = {};

        results.forEach(({ supplierId, score, trend }) => {
          scores[supplierId] = score;
          trends[supplierId] = trend;
        });

        setSupplierScores(scores);
        setSupplierTrends(trends);
      } catch (error) {
        console.error('Error loading supplier metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, [suppliers]);

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplier_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || supplier.risk_level === filterRisk;
    return matchesSearch && matchesRisk;
  });

  const getRiskBadgeVariant = (risk: string | null) => {
    switch (risk) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Icon name={ICONS.TRENDING_DOWN} size="sm" className="text-green-600" />;
      case 'declining':
        return <Icon name={ICONS.TRENDING_UP} size="sm" className="text-red-600" />;
      default:
        return <Icon name={ICONS.MINUS} size="sm" className="text-gray-400" />;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Suppliers</Label>
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="risk-filter">Risk Level</Label>
            <select
              id="risk-filter"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suppliers.filter((s) => s.risk_level === 'high' || s.risk_level === 'critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total NCAs (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.reduce((sum, s) => sum + (s.nca_count_ytd || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.length > 0
                ? (
                    suppliers.reduce((sum, s) => sum + (s.quality_rating || 0), 0) / suppliers.length
                  ).toFixed(1)
                : '0.0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>NCAs (YTD)</TableHead>
                <TableHead>NCAs (12mo)</TableHead>
                <TableHead>Quality Rating</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Performance Score</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
                      Loading supplier metrics...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const score = supplierScores[supplier.id] ?? 0;
                  const trend = supplierTrends[supplier.id]?.trend || 'stable';
                  const trendChange = supplierTrends[supplier.id]?.change || 0;

                  return (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{supplier.supplier_name}</div>
                          <div className="text-xs text-gray-500">{supplier.supplier_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supplier.approval_status === 'approved' ? 'default' : 'secondary'}
                        >
                          {supplier.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{supplier.nca_count_ytd || 0}</TableCell>
                      <TableCell>{supplier.nca_count_last_12mo || 0}</TableCell>
                      <TableCell>
                        {supplier.quality_rating ? supplier.quality_rating.toFixed(1) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRiskBadgeVariant(supplier.risk_level)}>
                          {supplier.risk_level || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getPerformanceColor(score)}`}>
                          {score.toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTrendIcon(trend)}
                          <span className="text-sm text-gray-600">
                            {trendChange > 0 ? `+${trendChange}` : trendChange}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


