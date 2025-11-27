import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Loader2, Search, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface School {
  id: string;
  name: string;
  slug: string;
  nickname?: string | null;
  province: string | null;
  website: string | null;
  icon_url: string | null;
  emblem_url?: string | null;
  jersey_url?: string | null;
  main_rival: string | null;
  established_year: number | null;
  springboks_count: number | null;
  trivia_fact: string | null;
  motto?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  status: string;
  is_visible?: boolean;
}

interface SchoolsTableProps {
  onEdit: (school: School) => void;
}

export function SchoolsTable({ onEdit }: SchoolsTableProps) {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name");

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast({
        title: "Error",
        description: "Failed to load schools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("schools").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School deleted successfully",
      });
      
      fetchSchools();
    } catch (error) {
      console.error("Error deleting school:", error);
      toast({
        title: "Error",
        description: "Failed to delete school",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Get unique provinces for filter dropdown
  const provinces = useMemo(() => {
    const uniqueProvinces = [...new Set(schools.map(s => s.province).filter(Boolean))];
    return uniqueProvinces.sort() as string[];
  }, [schools]);

  // Filter schools based on search and filters
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch =
        debouncedSearch === "" ||
        school.name.toLowerCase().includes(query) ||
        school.province?.toLowerCase().includes(query) ||
        school.main_rival?.toLowerCase().includes(query) ||
        school.established_year?.toString().includes(query);

      const matchesProvince =
        provinceFilter === "all" || school.province === provinceFilter;

      const matchesStatus =
        statusFilter === "all" || school.status === statusFilter;

      return matchesSearch && matchesProvince && matchesStatus;
    });
  }, [schools, debouncedSearch, provinceFilter, statusFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setProvinceFilter("all");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, province, rival, or year..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School Name</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Established</TableHead>
              <TableHead>Main Rival</TableHead>
              <TableHead>Springboks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {schools.length === 0
                        ? "No schools found"
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || provinceFilter !== "all" || statusFilter !== "all") && (
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
              filteredSchools.map((school) => (
                 <TableRow key={school.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {(school.emblem_url || school.jersey_url || school.icon_url) && (
                        <button
                          onClick={() => navigate(`/school/${school.slug}`)}
                          className="h-8 w-8 rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                        >
                          <img
                            src={school.emblem_url || school.jersey_url || school.icon_url || ''}
                            alt={school.name}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )}
                      <div className="flex flex-col">
                        <span>{school.name}</span>
                        {school.nickname && (
                          <span className="text-xs text-muted-foreground">{school.nickname}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{school.province || "-"}</TableCell>
                  <TableCell>{school.established_year || "-"}</TableCell>
                  <TableCell>{school.main_rival || "-"}</TableCell>
                  <TableCell>{school.springboks_count || 0}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        school.status === "verified"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {school.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(school)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(school.id)}
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground mt-4">
        Showing {filteredSchools.length} of {schools.length} schools
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the school
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}