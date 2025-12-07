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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, Loader2, Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { 
  calculateCompleteness, 
  getCompletenessColor,
  getCompletenessBadgeVariant,
  FIELD_LABELS,
} from "@/lib/schoolCompleteness";

type SortField = 'name' | 'province' | 'completeness' | 'established' | 'rival' | 'status';
type SortDirection = 'asc' | 'desc';

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
  refreshTrigger?: number;
}

export function SchoolsTable({ onEdit, refreshTrigger }: SchoolsTableProps) {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  useEffect(() => {
    fetchSchools();
  }, [refreshTrigger]);

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

  // Calculate completeness for each school
  const schoolsWithCompleteness = useMemo(() => {
    return schools.map(school => ({
      ...school,
      completeness: calculateCompleteness({
        name: school.name,
        province: school.province,
        nickname: school.nickname,
        main_rival: school.main_rival,
        motto: school.motto,
        website: school.website,
        established_year: school.established_year,
        springboks_count: school.springboks_count,
        emblem_url: school.emblem_url || school.icon_url,
        jersey_url: school.jersey_url,
        logo_url: school.emblem_url || school.icon_url,
      }),
    }));
  }, [schools]);

  // Get unique provinces for filter dropdown
  const provinces = useMemo(() => {
    const uniqueProvinces = [...new Set(schools.map(s => s.province).filter(Boolean))];
    return uniqueProvinces.sort() as string[];
  }, [schools]);

  // Filter and sort schools
  const filteredSchools = useMemo(() => {
    const filtered = schoolsWithCompleteness.filter((school) => {
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

      const matchesCompleteness =
        completenessFilter === "all" ||
        (completenessFilter === "complete" && school.completeness.percentage >= 100) ||
        (completenessFilter === "incomplete" && school.completeness.percentage < 100);

      return matchesSearch && matchesProvince && matchesStatus && matchesCompleteness;
    });

    // Sort results based on sortField and sortDirection
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'province':
          const provA = a.province || '';
          const provB = b.province || '';
          comparison = provA.localeCompare(provB);
          break;
        case 'completeness':
          comparison = a.completeness.percentage - b.completeness.percentage;
          break;
        case 'established':
          const yearA = a.established_year || 0;
          const yearB = b.established_year || 0;
          comparison = yearA - yearB;
          break;
        case 'rival':
          const rivalA = a.main_rival || '';
          const rivalB = b.main_rival || '';
          comparison = rivalA.localeCompare(rivalB);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [schoolsWithCompleteness, debouncedSearch, provinceFilter, statusFilter, completenessFilter, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchQuery("");
    setProvinceFilter("all");
    setStatusFilter("all");
    setCompletenessFilter("all");
    setSortField("name");
    setSortDirection("asc");
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
          <Select value={completenessFilter} onValueChange={setCompletenessFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Completeness" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools</SelectItem>
              <SelectItem value="incomplete">Incomplete (&lt;100%)</SelectItem>
              <SelectItem value="complete">Complete (100%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  School Name
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('province')}
              >
                <div className="flex items-center">
                  Province
                  {getSortIcon('province')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('completeness')}
              >
                <div className="flex items-center">
                  Completeness
                  {getSortIcon('completeness')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('established')}
              >
                <div className="flex items-center">
                  Established
                  {getSortIcon('established')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('rival')}
              >
                <div className="flex items-center">
                  Main Rival
                  {getSortIcon('rival')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
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
                    {(searchQuery || provinceFilter !== "all" || statusFilter !== "all" || completenessFilter !== "all") && (
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
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={getCompletenessBadgeVariant(school.completeness.percentage)}
                            className="cursor-help"
                          >
                            {school.completeness.percentage}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">
                            {school.completeness.score}/{school.completeness.maxScore} points
                          </p>
                          {school.completeness.missingFields.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Missing: {school.completeness.missingFields.map(f => FIELD_LABELS[f]).join(", ")}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{school.established_year || "-"}</TableCell>
                  <TableCell>{school.main_rival || "-"}</TableCell>
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
