import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Edit, Trash2, CheckCircle, Archive, Upload } from "lucide-react";
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
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

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

  const filteredPacks = packs.filter((pack) => {
    const matchesSearch =
      pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pack.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || pack.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pool packs found
                </TableCell>
              </TableRow>
            ) : (
              filteredPacks.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium">{pack.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {pack.description || "—"}
                  </TableCell>
                  <TableCell>{pack.schools.length} schools</TableCell>
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
