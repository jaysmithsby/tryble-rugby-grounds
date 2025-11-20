import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, Ban, Flag, Activity, TrendingUp, TrendingDown } from "lucide-react";
import { UserGrowthChart } from "./analytics/UserGrowthChart";
import { SanctionsChart } from "./analytics/SanctionsChart";
import { ReportsChart } from "./analytics/ReportsChart";
import { ModerationWorkloadChart } from "./analytics/ModerationWorkloadChart";
import { SchoolAnalytics } from "./SchoolAnalytics";

interface AnalyticsData {
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  totalBans: number;
  totalSuspensions: number;
  activeSanctions: number;
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  avgResponseTime: number;
  usersByMonth: Array<{ month: string; count: number }>;
  sanctionsByMonth: Array<{ month: string; bans: number; suspensions: number }>;
  reportsByMonth: Array<{ month: string; reports: number; resolved: number }>;
  moderationActivity: Array<{ date: string; actions: number }>;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("90"); // days
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at');
      if (profilesError) throw profilesError;

      // Fetch sanctions
      const { data: sanctions, error: sanctionsError } = await supabase
        .from('user_sanctions')
        .select('*')
        .gte('created_at', startDate.toISOString());
      if (sanctionsError) throw sanctionsError;

      // Fetch all sanctions for totals
      const { data: allSanctions, error: allSanctionsError } = await supabase
        .from('user_sanctions')
        .select('*');
      if (allSanctionsError) throw allSanctionsError;

      // Fetch reports
      const { data: reports, error: reportsError } = await supabase
        .from('user_reports')
        .select('*')
        .gte('created_at', startDate.toISOString());
      if (reportsError) throw reportsError;

      // Fetch all reports for totals
      const { data: allReports, error: allReportsError } = await supabase
        .from('user_reports')
        .select('*');
      if (allReportsError) throw allReportsError;

      // Fetch admin audit log
      const { data: auditLog, error: auditError } = await supabase
        .from('admin_audit_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      if (auditError) throw auditError;

      // Calculate metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const newUsersThisMonth = profiles?.filter(
        p => new Date(p.created_at) >= thirtyDaysAgo
      ).length || 0;

      const newUsersLastMonth = profiles?.filter(
        p => new Date(p.created_at) >= sixtyDaysAgo && new Date(p.created_at) < thirtyDaysAgo
      ).length || 0;

      const growthRate = newUsersLastMonth > 0
        ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
        : 0;

      const activeBans = allSanctions?.filter(
        s => s.sanction_type === 'ban' && s.is_active
      ).length || 0;

      const activeSuspensions = allSanctions?.filter(
        s => s.sanction_type === 'suspension' && s.is_active
      ).length || 0;

      const pendingReportsCount = allReports?.filter(
        r => r.status === 'under_review'
      ).length || 0;

      const resolvedReportsCount = allReports?.filter(
        r => r.status === 'resolved'
      ).length || 0;

      // Calculate average response time for resolved reports
      const resolvedReportsWithTime = allReports?.filter(
        r => r.status === 'resolved' && r.reviewed_at
      ) || [];
      
      let avgResponseTime = 0;
      if (resolvedReportsWithTime.length > 0) {
        const totalResponseTime = resolvedReportsWithTime.reduce((acc, report) => {
          const created = new Date(report.created_at).getTime();
          const reviewed = new Date(report.reviewed_at).getTime();
          return acc + (reviewed - created);
        }, 0);
        avgResponseTime = totalResponseTime / resolvedReportsWithTime.length / (1000 * 60 * 60); // hours
      }

      // Group data by month
      const usersByMonth = groupByMonth(profiles || [], days);
      const sanctionsByMonth = groupSanctionsByMonth(sanctions || [], days);
      const reportsByMonth = groupReportsByMonth(reports || [], days);
      const moderationActivity = groupAuditLogByDay(auditLog || [], days);

      setData({
        totalUsers: profiles?.length || 0,
        newUsersThisMonth,
        userGrowthRate: Math.round(growthRate * 10) / 10,
        totalBans: allSanctions?.filter(s => s.sanction_type === 'ban').length || 0,
        totalSuspensions: allSanctions?.filter(s => s.sanction_type === 'suspension').length || 0,
        activeSanctions: activeBans + activeSuspensions,
        totalReports: allReports?.length || 0,
        pendingReports: pendingReportsCount,
        resolvedReports: resolvedReportsCount,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        usersByMonth,
        sanctionsByMonth,
        reportsByMonth,
        moderationActivity,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByMonth = (data: any[], days: number) => {
    const months: { [key: string]: number } = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    data.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months[monthKey] = (months[monthKey] || 0) + 1;
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  };

  const groupSanctionsByMonth = (data: any[], days: number) => {
    const months: { [key: string]: { bans: number; suspensions: number } } = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    data.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!months[monthKey]) {
          months[monthKey] = { bans: 0, suspensions: 0 };
        }
        if (item.sanction_type === 'ban') {
          months[monthKey].bans += 1;
        } else {
          months[monthKey].suspensions += 1;
        }
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  };

  const groupReportsByMonth = (data: any[], days: number) => {
    const months: { [key: string]: { reports: number; resolved: number } } = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    data.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= startDate) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!months[monthKey]) {
          months[monthKey] = { reports: 0, resolved: 0 };
        }
        months[monthKey].reports += 1;
        if (item.status === 'resolved') {
          months[monthKey].resolved += 1;
        }
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  };

  const groupAuditLogByDay = (data: any[], days: number) => {
    const dayGroups: { [key: string]: number } = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    data.forEach(item => {
      const date = new Date(item.created_at);
      if (date >= startDate) {
        const dayKey = date.toISOString().split('T')[0];
        dayGroups[dayKey] = (dayGroups[dayKey] || 0) + 1;
      }
    });

    return Object.entries(dayGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, actions]) => ({ date, actions }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground mt-1">Platform metrics and moderation insights</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="180">Last 6 Months</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={data.userGrowthRate >= 0 ? "text-green-600" : "text-red-600"}>
                {data.userGrowthRate >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                {' '}{Math.abs(data.userGrowthRate)}%
              </span>
              {' '}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sanctions</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSanctions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalBans} bans, {data.totalSuspensions} suspensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.resolvedReports} resolved, {data.totalReports} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              For report resolution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="sanctions">Sanctions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="moderation">Moderation Activity</TabsTrigger>
          <TabsTrigger value="schools">School Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Over Time</CardTitle>
              <CardDescription>New user registrations by month</CardDescription>
            </CardHeader>
            <CardContent>
              <UserGrowthChart data={data.usersByMonth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sanctions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sanctions Issued</CardTitle>
              <CardDescription>Bans and suspensions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <SanctionsChart data={data.sanctionsByMonth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Trends</CardTitle>
              <CardDescription>Reports filed and resolution rate</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsChart data={data.reportsByMonth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Workload</CardTitle>
              <CardDescription>Admin actions performed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationWorkloadChart data={data.moderationActivity} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schools" className="space-y-4">
          <SchoolAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}