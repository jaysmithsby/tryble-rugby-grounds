import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Pencil, Archive, ArchiveRestore, Loader2, Search, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
  getCompletenessBadgeVariant,
  FIELD_LABELS,
} from "@/lib/schoolCompleteness";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./PaginationControls";

type SortField = 'name' | 'province' | 'completeness' | 'established' | 'rival' | 'status';
type SortDirection = 'asc' | 'desc';
type ArchiveFilter = 'active' | 'archived' | 'all';

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
  is_archived?: boolean;
  archived_at?: string | null;
}

interface SchoolsTableProps {
  onEdit: (school: School) => void;
  refreshTrigger?: number;
}

export function SchoolsTable({ onEdit, refreshTrigger }: SchoolsTableProps) {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [provinces, setProvinces] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  const pagination = usePagination(1, 25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    pagination.goToPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Fetch provinces once for filter dropdown
  useEffect(() => {
    const fetchProvinces = async () => {
      const { data } = await supabase
        .from('schools')
        .select('province')
        .not('province', 'is', null);
      
      if (data) {
        const uniqueProvinces = [...new Set(data.map(s => s.province).filter(Boolean))];
        setProvinces(uniqueProvinces.sort() as string[]);
      }
    };
    fetchProvinces();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, provinceFilter, statusFilter, completenessFilter, archiveFilter]);

  const fetchSchools = useCallback(async () => {
    try {
      setLoading(true);

      // Build count query
      let countQuery = supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      // Apply filters
      if (archiveFilter === 'active') {
        countQuery = countQuery.eq('is_archived', false);
      } else if (archiveFilter === 'archived') {
        countQuery = countQuery.eq('is_archived', true);
      }
      if (provinceFilter !== 'all') {
        countQuery = countQuery.eq('province', provinceFilter);
      }
      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('status', statusFilter);
      }
      if (debouncedSearch) {
        countQuery = countQuery.or(
          `name.ilike.%${debouncedSearch}%,province.ilike.%${debouncedSearch}%,main_rival.ilike.%${debouncedSearch}%`
        );
      }

      const { count, error: countError } = await countQuery;
      if (countError) console.error('Count error:', countError);
      
      pagination.setTotalCount(count || 0);

      // Build data query
      let dataQuery = supabase
        .from('schools')
        .select('*');

      // Apply same filters
      if (archiveFilter === 'active') {
        dataQuery = dataQuery.eq('is_archived', false);
      } else if (archiveFilter === 'archived') {
        dataQuery = dataQuery.eq('is_archived', true);
      }
      if (provinceFilter !== 'all') {
        dataQuery = dataQuery.eq('province', provinceFilter);
      }
      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('status', statusFilter);
      }
      if (debouncedSearch) {
        dataQuery = dataQuery.or(
          `name.ilike.%${debouncedSearch}%,province.ilike.%${debouncedSearch}%,main_rival.ilike.%${debouncedSearch}%`
        );
      }

      // Apply sorting (completeness is calculated client-side, so sort by name for that)
      const sortColumn = sortField === 'completeness' ? 'name'
        : sortField === 'established' ? 'established_year'
        : sortField === 'rival' ? 'main_rival'
        : sortField;
      
      dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === 'asc' });
      dataQuery = dataQuery.range(pagination.from, pagination.to);

      const { data, error } = await dataQuery;

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast({
        title: "Failed to Load Schools",
        description: "Could not retrieve school data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.from, pagination.to, debouncedSearch, provinceFilter, statusFilter, archiveFilter, sortField, sortDirection, toast]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools, refreshTrigger]);

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ 
          is_archived: true, 
          archived_at: new Date().toISOString() 
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School archived successfully. You can restore it from the 'Archived' filter.",
      });
      
      fetchSchools();
    } catch (error) {
      console.error("Error archiving school:", error);
      toast({
        title: "Archive Failed",
        description: "Could not archive the school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setArchiveId(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ 
          is_archived: false, 
          archived_at: null 
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School restored successfully",
      });
      
      fetchSchools();
    } catch (error) {
      console.error("Error restoring school:", error);
      toast({
        title: "Restore Failed",
        description: "Could not restore the school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoreId(null);
    }
  };

  // Calculate completeness for each school (client-side since it's complex logic)
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

  // Filter by completeness (client-side since it's calculated)
  const filteredSchools = useMemo(() => {
    if (completenessFilter === 'all') return schoolsWithCompleteness;
    
    return schoolsWithCompleteness.filter(school => 
      (completenessFilter === 'complete' && school.completeness.percentage >= 100) ||
      (completenessFilter === 'incomplete' && school.completeness.percentage < 100)
    );
  }, [schoolsWithCompleteness, completenessFilter]);

  // Sort by completeness if needed (client-side)
  const sortedSchools = useMemo(() => {
    if (sortField !== 'completeness') return filteredSchools;
    
    return [...filteredSchools].sort((a, b) => {
      const comparison = a.completeness.percentage - b.completeness.percentage;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredSchools, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchQuery("");
    setProvinceFilter("all");
    setStatusFilter("all");
    setCompletenessFilter("all");
    setArchiveFilter("active");
    setSortField("name");
    setSortDirection("asc");
    pagination.goToPage(1);
  };

  if (loading && schools.length === 0) {
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
          <Select value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as ArchiveFilter)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Archive" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
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
            {sortedSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {pagination.totalCount === 0
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
              sortedSchools.map((school) => (
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
                        disabled={school.is_archived}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {school.is_archived ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestoreId(school.id)}
                          title="Restore school"
                        >
                          <ArchiveRestore className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchiveId(school.id)}
                          title="Archive school"
                        >
                          <Archive className="h-4 w-4 text-orange-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <PaginationControls pagination={pagination} loading={loading} />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveId !== null} onOpenChange={() => setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this school?</AlertDialogTitle>
            <AlertDialogDescription>
              This school will be moved to the archive. It will no longer appear in the app,
              but you can restore it later from the "Archived" filter if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && handleArchive(archiveId)}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreId !== null} onOpenChange={() => setRestoreId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this school?</AlertDialogTitle>
            <AlertDialogDescription>
              This school will be restored and become visible in the app again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreId && handleRestore(restoreId)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
