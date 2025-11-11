import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { createServerClient } from '@/lib/database/client';
import { AlertTriangle, CheckCircle2, Clock, FileText, Wrench } from "lucide-react";

/**
 * Production Dashboard Page (Operator View)
 *
 * Displays real-time production status for operators:
 * - Active work order
 * - Today's NCAs and MJCs
 * - Active alerts (machine down, critical issues)
 * - Quick action buttons
 *
 * Per implementation plan Week 8, provides operator-focused visibility
 * with <2s page load performance target.
 */

interface DashboardStats {
  activeWorkOrder: {
    wo_number: string;
    machine_id: string;
    status: string;
    operator_id: string;
  } | null;
  todaysNCAs: number;
  todaysMJCs: number;
  machineDownCount: number;
  criticalMJCs: number;
}

async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServerClient();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayISO = today.toISOString();
  const tomorrowISO = tomorrow.toISOString();

  // Execute all queries in parallel for better performance (<2s target)
  const [
    activeWOResult,
    ncaCountResult,
    mjcCountResult,
    machineDownCountResult,
    criticalCountResult,
  ] = await Promise.all([
    // Fetch active work order
    supabase
      .from('work_orders')
      .select('wo_number, machine_id, status, operator_id')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Count today's NCAs
    supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)
      .lt('created_at', tomorrowISO),

    // Count today's MJCs
    supabase
      .from('mjcs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayISO)
      .lt('created_at', tomorrowISO),

    // Count machine down NCAs today
    supabase
      .from('ncas')
      .select('*', { count: 'exact', head: true })
      .eq('machine_status', 'down')
      .gte('created_at', todayISO)
      .lt('created_at', tomorrowISO),

    // Count critical MJCs
    supabase
      .from('mjcs')
      .select('*', { count: 'exact', head: true })
      .eq('urgency', 'critical')
      .in('status', ['open', 'assigned', 'in-progress']),
  ]);

  return {
    activeWorkOrder: activeWOResult.data ?? null,
    todaysNCAs: ncaCountResult.count ?? 0,
    todaysMJCs: mjcCountResult.count ?? 0,
    machineDownCount: machineDownCountResult.count ?? 0,
    criticalMJCs: criticalCountResult.count ?? 0,
  };
}

export default async function ProductionDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time view of production operations and quality issues
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/nca/new">
              <Button size="lg" className="min-h-[44px]">
                <FileText className="mr-2 h-5 w-5" />
                Create NCA
              </Button>
            </Link>
            <Link href="/mjc/new">
              <Button size="lg" variant="secondary" className="min-h-[44px]">
                <Wrench className="mr-2 h-5 w-5" />
                Create MJC
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Work Order */}
        <Card data-testid="active-work-order-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary-600" />
              Active Work Order
            </CardTitle>
            <CardDescription>Current production run</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activeWorkOrder ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-2xl font-alt">
                    {stats.activeWorkOrder.wo_number}
                  </span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Machine: {stats.activeWorkOrder.machine_id || 'Not specified'}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No active work order. Start a production run to begin tracking.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's NCAs */}
          <Card data-testid="todays-ncas-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-critical-600" />
                Today's NCAs
              </CardTitle>
              <CardDescription>Non-conformance advisories created today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-5xl font-bold font-alt text-gray-900">
                  {stats.todaysNCAs}
                </div>
                <Link href="/nca/register">
                  <Button variant="outline" className="min-h-[44px]">
                    View All
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Today's MJCs */}
          <Card data-testid="todays-mjcs-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning-600" />
                Today's MJCs
              </CardTitle>
              <CardDescription>Maintenance job cards created today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-5xl font-bold font-alt text-gray-900">
                  {stats.todaysMJCs}
                </div>
                <Link href="/mjc/register">
                  <Button variant="outline" className="min-h-[44px]">
                    View All
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <Card data-testid="active-alerts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-600" />
              Active Alerts
            </CardTitle>
            <CardDescription>Critical issues requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="machine-status">
              {stats.machineDownCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{stats.machineDownCount}</strong> machine(s) currently down.
                    Immediate attention required.
                  </AlertDescription>
                </Alert>
              )}

              {stats.criticalMJCs > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{stats.criticalMJCs}</strong> critical maintenance job(s) pending.
                  </AlertDescription>
                </Alert>
              )}

              {stats.machineDownCount === 0 && stats.criticalMJCs === 0 && (
                <Alert variant="default" className="border-success-600 bg-success-600/10">
                  <CheckCircle2 className="h-4 w-4 text-success-600" />
                  <AlertDescription className="text-success-600">
                    No active alerts. All systems operational.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for production operators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/nca/new" className="block">
                <Button variant="outline" className="w-full min-h-[44px] h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Create NCA</span>
                  </div>
                </Button>
              </Link>

              <Link href="/mjc/new" className="block">
                <Button variant="outline" className="w-full min-h-[44px] h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-6 w-6" />
                    <span>Create MJC</span>
                  </div>
                </Button>
              </Link>

              <Link href="/nca/register" className="block">
                <Button variant="outline" className="w-full min-h-[44px] h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-6 w-6" />
                    <span>View NCAs</span>
                  </div>
                </Button>
              </Link>

              <Link href="/mjc/register" className="block">
                <Button variant="outline" className="w-full min-h-[44px] h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Wrench className="h-6 w-6" />
                    <span>View MJCs</span>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
