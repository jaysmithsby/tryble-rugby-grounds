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
import { Pencil, Archive, ArchiveRestore, Trash2, Loader2, Search, RefreshCcw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
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
  const [refreshing, setRefreshing] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

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

  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, provinceFilter, statusFilter, completenessFilter, archiveFilter]);

  const fetchSchools = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let countQuery = supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });

      if (archiveFilter === 'active') countQuery = countQuery.eq('is_archived', false);
      else if (archiveFilter === 'archived') countQuery = countQuery.eq('is_archived', true);
      if (provinceFilter !== 'all') countQuery = countQuery.eq('province', provinceFilter);
      if (statusFilter !== 'all') countQuery = countQuery.eq('status', statusFilter);
      if (debouncedSearch) {
        countQuery = countQuery.or(
          `name.ilike.%${debouncedSearch}%,province.ilike.%${debouncedSearch}%,main_rival.ilike.%${debouncedSearch}%`
        );
      }

      const { count, error: countError } = await countQuery;
      if (countError) console.error('Count error:', countError);
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase.from('schools').select('*');

      if (archiveFilter === 'active') dataQuery = dataQuery.eq('is_archived', false);
      else if (archiveFilter === 'archived') dataQuery = dataQuery.eq('is_archived', true);
      if (provinceFilter !== 'all') dataQuery = dataQuery.eq('province', provinceFilter);
      if (statusFilter !== 'all') dataQuery = dataQuery.eq('status', statusFilter);
      if (debouncedSearch) {
        dataQuery = dataQuery.or(
          `name.ilike.%${debouncedSearch}%,province.ilike.%${debouncedSearch}%,main_rival.ilike.%${debouncedSearch}%`
        );
      }

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
      setRefreshing(false);
    }
  }, [pagination.from, pagination.to, debouncedSearch, provinceFilter, statusFilter, archiveFilter, sortField, sortDirection, toast]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools, refreshTrigger]);

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "School archived successfully." });
      fetchSchools();
    } catch (error) {
      console.error("Error archiving school:", error);
      toast({ title: "Archive Failed", description: "Could not archive the school.", variant: "destructive" });
    } finally {
      setArchiveId(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schools")
        .update({ is_archived: false, archived_at: null })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "School restored successfully." });
      fetchSchools();
    } catch (error) {
      console.error("Error restoring school:", error);
      toast({ title: "Restore Failed", description: "Could not restore the school.", variant: "destructive" });
    } finally {
      setRestoreId(null);
    }
  };

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

  const filteredSchools = useMemo(() => {
    if (completenessFilter === 'all') return schoolsWithCompleteness;
    return schoolsWithCompleteness.filter(school => 
      (completenessFilter === 'complete' && school.completeness.percentage >= 100) ||
      (completenessFilter === 'incomplete' && school.completeness.percentage < 100)
    );
  }, [schoolsWithCompleteness, completenessFilter]);

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

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-500/20 text-green-400 border-green-500/50',
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
      archived: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };
    return colors[status] || colors.draft;
  };

  if (loading && schools.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, province, rival…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-xs"
          />
        </div>
        <Select value={provinceFilter} onValueChange={setProvinceFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Provinces</SelectItem>
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>{province}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={completenessFilter} onValueChange={setCompletenessFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
            <SelectValue placeholder="Completeness" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as ArchiveFilter)}>
          <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs">
            <SelectValue placeholder="Archive" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSchools(true)}
          disabled={refreshing}
          className="gap-1.5 h-9 text-xs"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          {refreshing ? "…" : "Refresh"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead field="name" label="School" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="province" label="Province" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="completeness" label="Complete" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="established" label="Est." current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="rival" label="Rival" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="status" label="Status" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <TableHead className="text-xs px-2 text-right">Act</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSchools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <p>
                      {pagination.totalCount === 0
                        ? "No schools found"
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || provinceFilter !== "all" || statusFilter !== "all" || completenessFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 h-7 text-xs">
                        <RefreshCcw className="h-3 w-3" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedSchools.map((school) => (
                <TableRow key={school.id} className="group">
                  <TableCell className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {(school.emblem_url || school.jersey_url || school.icon_url) && (
                        <button
                          onClick={() => navigate(`/school/${school.slug}`)}
                          className="h-6 w-6 rounded-full overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer shrink-0"
                        >
                          <img
                            src={school.emblem_url || school.jersey_url || school.icon_url || ''}
                            alt={school.name}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-medium truncate block max-w-[160px]" title={school.name}>
                          {school.name}
                        </span>
                        {school.nickname && (
                          <span className="text-[10px] text-muted-foreground truncate block max-w-[160px]">
                            {school.nickname}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground px-2 py-1.5 max-w-[100px] truncate" title={school.province || ''}>
                    {school.province || "–"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={getCompletenessBadgeVariant(school.completeness.percentage)}
                            className="cursor-help text-[10px] px-1.5 py-0"
                          >
                            {school.completeness.percentage}%
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1 text-xs">
                            {school.completeness.score}/{school.completeness.maxScore} points
                          </p>
                          {school.completeness.missingFields.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              Missing: {school.completeness.missingFields.map(f => FIELD_LABELS[f]).join(", ")}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono px-2 py-1.5">
                    {school.established_year || "–"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground px-2 py-1.5 max-w-[100px] truncate" title={school.main_rival || ''}>
                    {school.main_rival || "–"}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusBadge(school.status))}>
                      {school.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right">
                    <div className="flex justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onEdit(school)}
                        disabled={school.is_archived}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      {school.is_archived ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setRestoreId(school.id)}
                          title="Restore"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setArchiveId(school.id)}
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5 text-orange-500" />
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

      <PaginationControls pagination={pagination} loading={loading} />

      {/* Archive Confirmation */}
      <AlertDialog open={archiveId !== null} onOpenChange={() => setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this school?</AlertDialogTitle>
            <AlertDialogDescription>
              This school will be hidden from the app. You can restore it later from the "Archived" filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveId && handleArchive(archiveId)}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
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
            <AlertDialogAction onClick={() => restoreId && handleRestore(restoreId)}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* Compact sortable header cell — matches FixturesTable pattern */
function SortableHead({
  field, label, current, direction, onSort, getIcon,
}: {
  field: SortField;
  label: string;
  current: SortField;
  direction: SortDirection;
  onSort: (f: SortField) => void;
  getIcon: (f: SortField) => React.ReactNode;
}) {
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 text-xs px-2"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center">
        {label}
        {getIcon(field)}
      </div>
    </TableHead>
  );
}
