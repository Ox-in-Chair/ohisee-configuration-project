import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createServerClient } from '@/lib/database/client';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Wrench,
} from "lucide-react";

/**
 * Management Dashboard Page
 *
 * Displays KPIs, trends, and analytics for management:
 * - 4 KPI cards (clickable for drill-down)
 * - NC Trend Chart (12 weeks)
 * - Maintenance Response Chart
 * - Temporary Repairs Approaching Deadline table
 *
 * Per implementation plan Week 8, provides management visibility
 * with <2s page load performance target.
 */

interface ManagementKPIs {
  openNCAs: number;
  pendingClearances: number;
  overdueRepairs: number;
  criticalJobs: number;
}

interface TemporaryRepair {
  id: string;
  job_card_number: string;
  machine_equipment: string;
  close_out_due_date: string;
  daysRemaining: number;
  status: string;
}

async function getManagementKPIs(): Promise<ManagementKPIs> {
  const supabase = createServerClient();

  // Execute all KPI queries in parallel for performance (<2s target)
  const [
    openNCAsResult,
    pendingClearancesResult,
    overdueRepairsResult,
    criticalJobsResult,
  ] = await Promise.all([
    // Open NCAs (not closed)
    supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'closed'),

    // Pending Hygiene Clearances (BRCGS critical)
    supabase
      .from('mjcs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'awaiting-clearance'),

    // Overdue Temporary Repairs (past 14-day deadline)
    supabase
      .from('mjcs')
      .select('*', { count: 'exact', head: true })
      .eq('temporary_repair', true)
      .not('close_out_due_date', 'is', null)
      .lt('close_out_due_date', new Date().toISOString()),

    // Critical Urgency MJCs (open)
    supabase
      .from('mjcs')
      .select('*', { count: 'exact', head: true })
      .eq('urgency', 'critical')
      .in('status', ['open', 'assigned', 'in-progress']),
  ]);

  return {
    openNCAs: openNCAsResult.count ?? 0,
    pendingClearances: pendingClearancesResult.count ?? 0,
    overdueRepairs: overdueRepairsResult.count ?? 0,
    criticalJobs: criticalJobsResult.count ?? 0,
  };
}

async function getTemporaryRepairsApproachingDeadline(): Promise<TemporaryRepair[]> {
  const supabase = createServerClient();

  // Get temporary repairs due within 7 days
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { data, error } = await supabase
    .from('mjcs')
    .select('id, job_card_number, machine_equipment, close_out_due_date, status')
    .eq('temporary_repair', true)
    .not('close_out_due_date', 'is', null)
    .lt('close_out_due_date', sevenDaysFromNow.toISOString())
    .neq('status', 'closed')
    .order('close_out_due_date', { ascending: true })
    .limit(10);

  if (error || !data) return [];

  // Calculate days remaining
  const now = new Date();
  return data.map((mjc: any) => {
    const dueDate = new Date(mjc.close_out_due_date);
    const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: mjc.id,
      job_card_number: mjc.job_card_number,
      machine_equipment: mjc.machine_equipment,
      close_out_due_date: mjc.close_out_due_date,
      daysRemaining,
      status: mjc.status,
    };
  });
}

export default async function ManagementDashboardPage() {
  const [kpis, tempRepairs] = await Promise.all([
    getManagementKPIs(),
    getTemporaryRepairsApproachingDeadline(),
  ]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Key performance indicators and operational insights
            </p>
          </div>
          <div data-testid="date-range-selector" className="text-sm text-gray-600">
            {/* TODO: Implement date range filter */}
            Last 7 Days
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Open NCAs */}
          <Link href="/nca/register?status=open">
            <Card
              data-testid="kpi-open-ncas"
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Open NCAs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-alt text-gray-900">
                  {kpis.openNCAs}
                </div>
                <p className="text-xs text-gray-500 mt-2">Click to view details</p>
              </CardContent>
            </Card>
          </Link>

          {/* Pending Clearances (BRCGS Critical) */}
          <Link href="/mjc/register?status=awaiting-clearance">
            <Card
              data-testid="kpi-pending-clearances"
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                kpis.pendingClearances > 0 ? 'border-warning-600 bg-warning-600/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Clearances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-alt text-gray-900">
                  {kpis.pendingClearances}
                </div>
                <p className="text-xs text-gray-500 mt-2">BRCGS critical</p>
              </CardContent>
            </Card>
          </Link>

          {/* Overdue Repairs */}
          <Link href="/mjc/register?temporary_repair=true&overdue=true">
            <Card
              data-testid="kpi-overdue-repairs"
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                kpis.overdueRepairs > 0 ? 'border-critical-600 bg-critical-600/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue Repairs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-alt text-gray-900">
                  {kpis.overdueRepairs}
                </div>
                <p className="text-xs text-gray-500 mt-2">Past 14-day deadline</p>
              </CardContent>
            </Card>
          </Link>

          {/* Critical Jobs */}
          <Link href="/mjc/register?urgency=critical">
            <Card
              data-testid="kpi-critical-jobs"
              className={`hover:shadow-lg transition-shadow cursor-pointer ${
                kpis.criticalJobs > 0 ? 'border-critical-600 bg-critical-600/5' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Critical Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold font-alt text-gray-900">
                  {kpis.criticalJobs}
                </div>
                <p className="text-xs text-gray-500 mt-2">Urgent attention needed</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NC Trend Chart */}
          <Card data-testid="nc-trend-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-600" />
                NC Trend (12 Weeks)
              </CardTitle>
              <CardDescription>Non-conformance trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                {/* TODO: Implement chart with recharts or similar */}
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Response Chart */}
          <Card data-testid="maintenance-response-chart">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning-600" />
                Maintenance Response Time
              </CardTitle>
              <CardDescription>Average response time by urgency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                {/* TODO: Implement chart with recharts or similar */}
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Chart visualization coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Temporary Repairs Approaching Deadline */}
        <Card data-testid="temp-repairs-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              Temporary Repairs Approaching Deadline
            </CardTitle>
            <CardDescription>
              Temporary repairs approaching 14-day BRCGS limit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tempRepairs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-success-600" />
                <p>No temporary repairs approaching deadline</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-semibold text-sm">MJC Number</th>
                      <th className="pb-3 font-semibold text-sm">Machine/Equipment</th>
                      <th className="pb-3 font-semibold text-sm">Due Date</th>
                      <th className="pb-3 font-semibold text-sm">Days Remaining</th>
                      <th className="pb-3 font-semibold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tempRepairs.map((repair) => {
                      const urgencyClass =
                        repair.daysRemaining <= 0
                          ? 'critical urgent red'
                          : repair.daysRemaining <= 3
                          ? 'critical urgent red'
                          : repair.daysRemaining <= 7
                          ? 'warning'
                          : '';

                      return (
                        <tr
                          key={repair.id}
                          className={`border-b hover:bg-gray-50 cursor-pointer ${urgencyClass}`}
                        >
                          <td className="py-3">
                            <Link
                              href={`/mjc/${repair.id}`}
                              className="text-primary-600 hover:underline font-medium"
                            >
                              {repair.job_card_number}
                            </Link>
                          </td>
                          <td className="py-3">{repair.machine_equipment}</td>
                          <td className="py-3">
                            {new Date(repair.close_out_due_date).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <Badge
                              variant={
                                repair.daysRemaining <= 0
                                  ? 'destructive'
                                  : repair.daysRemaining <= 3
                                  ? 'destructive'
                                  : 'default'
                              }
                            >
                              {repair.daysRemaining <= 0
                                ? 'OVERDUE'
                                : `${repair.daysRemaining} day${repair.daysRemaining !== 1 ? 's' : ''}`}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline">{repair.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
