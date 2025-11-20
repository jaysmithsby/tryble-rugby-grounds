import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, TrendingUp, AlertTriangle, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SchoolAnalytics {
  school_name: string;
  province: string | null;
  total_users: number;
  active_users_30d: number;
  total_sanctions: number;
  active_sanctions: number;
  total_reports: number;
  pending_reports: number;
  sanction_rate: number;
  report_rate: number;
}

export function SchoolAnalytics() {
  const [loading, setLoading] = useState(true);
  const [schoolData, setSchoolData] = useState<SchoolAnalytics[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("users");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchSchoolAnalytics();
  }, []);

  const fetchSchoolAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all profiles grouped by school
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('school_name, province, created_at');
      if (profilesError) throw profilesError;

      // Fetch all schools for province info
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('name, province');
      if (schoolsError) throw schoolsError;

      // Fetch all sanctions with user profiles
      const { data: sanctions, error: sanctionsError } = await supabase
        .from('user_sanctions')
        .select(`
          *,
          profiles:user_id (school_name)
        `);
      if (sanctionsError) throw sanctionsError;

      // Fetch all reports with user profiles
      const { data: reports, error: reportsError } = await supabase
        .from('user_reports')
        .select(`
          *,
          profiles:reported_user_id (school_name)
        `);
      if (reportsError) throw reportsError;

      // Group data by school
      const schoolMap = new Map<string, SchoolAnalytics>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Initialize schools from profiles
      profiles?.forEach(profile => {
        const schoolName = profile.school_name;
        if (!schoolMap.has(schoolName)) {
          const schoolInfo = schools?.find(s => s.name === schoolName);
          schoolMap.set(schoolName, {
            school_name: schoolName,
            province: schoolInfo?.province || profile.province || null,
            total_users: 0,
            active_users_30d: 0,
            total_sanctions: 0,
            active_sanctions: 0,
            total_reports: 0,
            pending_reports: 0,
            sanction_rate: 0,
            report_rate: 0,
          });
        }

        const school = schoolMap.get(schoolName)!;
        school.total_users += 1;

        // Check if user was active in last 30 days (created recently or made predictions)
        if (new Date(profile.created_at) >= thirtyDaysAgo) {
          school.active_users_30d += 1;
        }
      });

      // Add sanctions data
      sanctions?.forEach(sanction => {
        const schoolName = (sanction.profiles as any)?.school_name;
        if (schoolName && schoolMap.has(schoolName)) {
          const school = schoolMap.get(schoolName)!;
          school.total_sanctions += 1;
          if (sanction.is_active) {
            school.active_sanctions += 1;
          }
        }
      });

      // Add reports data
      reports?.forEach(report => {
        const schoolName = (report.profiles as any)?.school_name;
        if (schoolName && schoolMap.has(schoolName)) {
          const school = schoolMap.get(schoolName)!;
          school.total_reports += 1;
          if (report.status === 'under_review') {
            school.pending_reports += 1;
          }
        }
      });

      // Calculate rates
      schoolMap.forEach(school => {
        if (school.total_users > 0) {
          school.sanction_rate = (school.total_sanctions / school.total_users) * 100;
          school.report_rate = (school.total_reports / school.total_users) * 100;
        }
      });

      setSchoolData(Array.from(schoolMap.values()));
    } catch (error) {
      console.error('Error fetching school analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedData = schoolData
    .filter(school => 
      school.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.province?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case "users":
          aValue = a.total_users;
          bValue = b.total_users;
          break;
        case "sanctions":
          aValue = a.total_sanctions;
          bValue = b.total_sanctions;
          break;
        case "reports":
          aValue = a.total_reports;
          bValue = b.total_reports;
          break;
        case "sanction_rate":
          aValue = a.sanction_rate;
          bValue = b.sanction_rate;
          break;
        case "report_rate":
          aValue = a.report_rate;
          bValue = b.report_rate;
          break;
        default:
          return 0;
      }

      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

  const getRiskLevel = (school: SchoolAnalytics): "high" | "medium" | "low" => {
    if (school.active_sanctions > 0 || school.pending_reports > 2) return "high";
    if (school.sanction_rate > 5 || school.report_rate > 10) return "medium";
    return "low";
  };

  const getRiskBadge = (level: "high" | "medium" | "low") => {
    switch (level) {
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium Risk</Badge>;
      case "low":
        return <Badge variant="secondary">Low Risk</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalUsers = schoolData.reduce((sum, s) => sum + s.total_users, 0);
  const totalSanctions = schoolData.reduce((sum, s) => sum + s.total_sanctions, 0);
  const totalReports = schoolData.reduce((sum, s) => sum + s.total_reports, 0);
  const highRiskSchools = schoolData.filter(s => getRiskLevel(s) === "high").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">School-Level Analytics</h2>
        <p className="text-muted-foreground mt-1">
          Breakdown of user activity, sanctions, and reports by school
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schoolData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalUsers} total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Schools</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highRiskSchools}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sanctions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSanctions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all schools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all schools
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>School Details</CardTitle>
          <CardDescription>
            Filter and sort schools by various metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="users">User Count</SelectItem>
                <SelectItem value="sanctions">Sanctions</SelectItem>
                <SelectItem value="reports">Reports</SelectItem>
                <SelectItem value="sanction_rate">Sanction Rate</SelectItem>
                <SelectItem value="report_rate">Report Rate</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">High to Low</SelectItem>
                <SelectItem value="asc">Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Active (30d)</TableHead>
                  <TableHead className="text-right">Sanctions</TableHead>
                  <TableHead className="text-right">Active Sanctions</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Sanction Rate</TableHead>
                  <TableHead className="text-right">Report Rate</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No schools found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedData.map((school) => (
                    <TableRow key={school.school_name}>
                      <TableCell className="font-medium">{school.school_name}</TableCell>
                      <TableCell>{school.province || 'N/A'}</TableCell>
                      <TableCell className="text-right">{school.total_users}</TableCell>
                      <TableCell className="text-right">{school.active_users_30d}</TableCell>
                      <TableCell className="text-right">
                        {school.total_sanctions > 0 ? (
                          <span className="text-destructive font-medium">{school.total_sanctions}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {school.active_sanctions > 0 ? (
                          <Badge variant="destructive">{school.active_sanctions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {school.total_reports > 0 ? (
                          <span className="font-medium">{school.total_reports}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {school.pending_reports > 0 ? (
                          <Badge variant="outline">{school.pending_reports}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {school.sanction_rate > 0 ? (
                          <span className={school.sanction_rate > 5 ? "text-destructive font-medium" : ""}>
                            {school.sanction_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {school.report_rate > 0 ? (
                          <span className={school.report_rate > 10 ? "text-yellow-600 font-medium" : ""}>
                            {school.report_rate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0%</span>
                        )}
                      </TableCell>
                      <TableCell>{getRiskBadge(getRiskLevel(school))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredAndSortedData.length} of {schoolData.length} schools
          </div>
        </CardContent>
      </Card>
    </div>
  );
}