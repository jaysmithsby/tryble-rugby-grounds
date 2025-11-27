import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Trash2, CheckCircle, Archive, Upload, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BulkImportPoolPacksDialog } from "./BulkImportPoolPacksDialog";

interface PoolPack {
  id: string;
  name: string;
  description: string | null;
  schools: string[];
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string | null;
}

interface PoolPacksTableProps {
  onEdit: (pack: PoolPack) => void;
}

export const PoolPacksTable = ({ onEdit }: PoolPacksTableProps) => {
  const [packs, setPacks] = useState<PoolPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      const { data, error } = await supabase
        .from("pool_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPacks(data || []);
    } catch (error: any) {
      toast.error("Failed to load pool packs");
      console.error("Error loading pool packs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Pool Pack?")) return;

    try {
      const { error } = await supabase
        .from("pool_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Pool Pack deleted");
      loadPacks();
    } catch (error: any) {
      toast.error("Failed to delete Pool Pack");
      console.error("Error deleting pack:", error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("pool_templates")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Pool Pack ${newStatus}`);
      loadPacks();
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error("Error updating status:", error);
    }
  };

  // Get all unique schools across all packs for reverse lookup filter
  const allSchools = useMemo(() => {
    const schoolSet = new Set<string>();
    packs.forEach(pack => {
      pack.schools.forEach(school => schoolSet.add(school));
    });
    return Array.from(schoolSet).sort();
  }, [packs]);

  // Filter packs based on search, status, and school (reverse lookup)
  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      const query = debouncedSearch.toLowerCase();
      
      // Search by name, description, or any school in the pack
      const matchesSearch =
        debouncedSearch === "" ||
        pack.name.toLowerCase().includes(query) ||
        pack.description?.toLowerCase().includes(query) ||
        pack.schools.some(school => school.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "all" || pack.status === statusFilter;

      // Reverse lookup: filter packs that contain a specific school
      const matchesSchool =
        schoolFilter === "all" || pack.schools.includes(schoolFilter);

      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [packs, debouncedSearch, statusFilter, schoolFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSchoolFilter("all");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      approved: { variant: "default", label: "Approved" },
      draft: { variant: "secondary", label: "Draft" },
      archived: { variant: "outline", label: "Archived" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading pool packs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, description, or school..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by school" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {allSchools.map((school) => (
              <SelectItem key={school} value={school}>
                {school}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setBulkImportOpen(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Bulk Import CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Schools</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {packs.length === 0
                        ? "No pool packs found"
                        : "No matches found for your search"}
                    </p>
                    {(searchTerm || statusFilter !== "all" || schoolFilter !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPacks.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium">{pack.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {pack.description || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{pack.schools.length} schools</span>
                    {schoolFilter !== "all" && pack.schools.includes(schoolFilter) && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        includes {schoolFilter}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(pack.status)}</TableCell>
                  <TableCell>
                    {new Date(pack.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {pack.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(pack.id, "approved")}
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {pack.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(pack.id, "archived")}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(pack)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(pack.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filteredPacks.length} of {packs.length} pool packs
      </p>

      <BulkImportPoolPacksDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={loadPacks}
      />
    </div>
  );
};