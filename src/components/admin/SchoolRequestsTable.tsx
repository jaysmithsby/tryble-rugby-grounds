import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Users, Eye } from "lucide-react";
import { ReviewSchoolRequestDialog } from "./ReviewSchoolRequestDialog";
import { CreateSchoolDialog, type PrefilledSchoolData } from "./CreateSchoolDialog";

interface DraftSchool {
  id: string;
  name: string;
  province: string | null;
  school_type: string | null;
  request_logo_url: string | null;
  note_to_admin: string | null;
  submitted_by_user_id: string | null;
  created_at: string;
  status: string;
}

interface GroupedRequest {
  school_name: string;
  school_type: string;
  province: string;
  request_count: number;
  requests: DraftSchool[];
  latest_logo_url: string | null;
}

export function SchoolRequestsTable() {
  const [groupedRequests, setGroupedRequests] = useState<GroupedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("draft");
  const [selectedGroup, setSelectedGroup] = useState<GroupedRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<PrefilledSchoolData | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('schools')
        .select('id, name, province, school_type, request_logo_url, note_to_admin, submitted_by_user_id, created_at, status')
        .order('created_at', { ascending: false });

      if (statusFilter === "all") {
        query = query.in('status', ['draft', 'rejected']);
      } else {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group requests by name + school_type
      const grouped = (data || []).reduce<Record<string, GroupedRequest>>((acc, school) => {
        const key = `${school.name.toLowerCase()}_${school.school_type || 'unknown'}`;
        
        if (!acc[key]) {
          acc[key] = {
            school_name: school.name,
            school_type: school.school_type || 'unknown',
            province: school.province || 'Unknown',
            request_count: 0,
            requests: [],
            latest_logo_url: null,
          };
        }
        
        acc[key].request_count++;
        acc[key].requests.push(school);
        
        if (school.request_logo_url && !acc[key].latest_logo_url) {
          acc[key].latest_logo_url = school.request_logo_url;
        }

        return acc;
      }, {});

      const sortedGroups = Object.values(grouped).sort((a, b) => b.request_count - a.request_count);
      setGroupedRequests(sortedGroups);
    } catch (error) {
      console.error('Error fetching school requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = groupedRequests.filter(group =>
    group.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReview = (group: GroupedRequest) => {
    setSelectedGroup(group);
    setReviewDialogOpen(true);
  };

  const handleApproveAndCreate = (data: PrefilledSchoolData) => {
    setPrefillData(data);
    setCreateDialogOpen(true);
  };

  const handleCreateSuccess = () => {
    setPrefillData(null);
    fetchRequests();
  };

  const getSchoolTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      boys: "default",
      girls: "secondary",
      "co-ed": "outline",
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
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
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by school name or province..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No School Requests</h3>
          <p className="text-muted-foreground">
            {statusFilter === "draft" 
              ? "No pending school requests at this time."
              : "No school requests found matching your criteria."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Province</TableHead>
                <TableHead className="text-center">Requests</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((group, index) => (
                <TableRow key={`${group.school_name}-${group.school_type}-${index}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {group.latest_logo_url && (
                        <img 
                          src={group.latest_logo_url} 
                          alt={group.school_name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      )}
                      {group.school_name}
                    </div>
                  </TableCell>
                  <TableCell>{getSchoolTypeBadge(group.school_type)}</TableCell>
                  <TableCell>{group.province}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {group.request_count}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReview(group)}
                      className="gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReviewSchoolRequestDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        groupedRequest={selectedGroup}
        onSuccess={fetchRequests}
        onApproveAndCreate={handleApproveAndCreate}
      />

      <CreateSchoolDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        prefillData={prefillData}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
