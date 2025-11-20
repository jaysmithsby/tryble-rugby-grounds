import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function ReportsConsole() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reported_user:reported_user_id (
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_reports')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success(`Report marked as ${status}`);
      fetchReports();
    } catch (error: any) {
      console.error('Error updating report:', error);
      toast.error(error.message || "Failed to update report");
    }
  };

  const handleFreezeAccount = async (userId: string) => {
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error("Not authenticated");

      // Create immediate 24-hour suspension
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase
        .from('user_sanctions')
        .insert({
          user_id: userId,
          sanction_type: 'suspension',
          duration_days: 1,
          reason: 'Emergency freeze pending investigation',
          sanctioned_by: admin.id,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });

      if (error) throw error;

      toast.success("Account frozen for 24 hours");
      fetchReports();
    } catch (error: any) {
      console.error('Error freezing account:', error);
      toast.error(error.message || "Failed to freeze account");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Report Console</h3>
          <p className="text-sm text-muted-foreground">
            Review and triage reported user content and behavior
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reported User</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No reports to review
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.reported_user?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>{report.report_reason}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {report.report_details || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        report.status === 'resolved'
                          ? 'default'
                          : report.status === 'dismissed'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(report.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === 'under_review' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFreezeAccount(report.reported_user_id)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Freeze
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(report.id, 'resolved')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}