import { useState, useEffect, useCallback } from "react";
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
import { Edit, Search, Loader2, Eye, EyeOff, RefreshCcw, ArrowUp, ArrowDown, ArrowUpDown, Calendar } from "lucide-react";
import { format, startOfYear, endOfYear } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { BulkYearCorrectionDialog } from "./BulkYearCorrectionDialog";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "./PaginationControls";
import { FixturesDateSelector } from "@/components/fixtures/FixturesDateSelector";

type SortField = 'date' | 'school_a' | 'school_b' | 'venue' | 'tournament' | 'status' | 'visible';
type SortDirection = 'asc' | 'desc';

interface FixturesTableProps {
  onEdit: (fixture: any) => void;
}

export function FixturesTable({ onEdit }: FixturesTableProps) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [schools, setSchools] = useState<Map<string, string>>(new Map());
  const [tournaments, setTournaments] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkYearDialogOpen, setBulkYearDialogOpen] = useState(false);

  const pagination = usePagination(1, 25);

  useEffect(() => {
    fetchSchools();
    fetchTournaments();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('id, name');
      if (error) throw error;
      setSchools(new Map(data?.map(s => [s.id, s.name]) || []));
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase.from('tournaments').select('id, name');
      if (error) throw error;
      setTournaments(new Map(data?.map(t => [t.id, t.name]) || []));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, statusFilter, dateRange]);

  // Find school IDs matching search query (server-side search)
  const getMatchingSchoolIds = useCallback(async (query: string): Promise<string[] | null> => {
    if (!query.trim()) return null; // null = no filter
    const { data, error } = await supabase
      .from('schools')
      .select('id')
      .ilike('name', `%${query}%`);
    if (error) {
      console.error('Error searching schools:', error);
      return [];
    }
    return data?.map(s => s.id) || [];
  }, []);

  const applyFilters = useCallback((query: any, matchingIds: string[] | null) => {
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    query = query
      .gte('match_date', dateRange.from.toISOString())
      .lte('match_date', dateRange.to.toISOString());

    // Server-side search: filter by matching school IDs
    if (matchingIds !== null) {
      if (matchingIds.length === 0) {
        // No schools match → force empty result
        query = query.in('school_a_id', ['00000000-0000-0000-0000-000000000000']);
      } else {
        // school_a OR school_b matches
        const idList = matchingIds.join(',');
        query = query.or(`school_a_id.in.(${idList}),school_b_id.in.(${idList})`);
      }
    }
    return query;
  }, [statusFilter, dateRange]);

  const fetchFixtures = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      // Server-side search: resolve matching school IDs first
      const matchingIds = await getMatchingSchoolIds(debouncedSearch);

      // Count query
      let countQuery = supabase.from('fixtures').select('*', { count: 'exact', head: true });
      countQuery = applyFilters(countQuery, matchingIds);
      const { count, error: countError } = await countQuery;
      if (countError) console.error('Count error:', countError);
      pagination.setTotalCount(count || 0);

      // Data query
      let dataQuery = supabase.from('fixtures').select('*');
      dataQuery = applyFilters(dataQuery, matchingIds);

      const sortColumn = sortField === 'date' ? 'match_date'
        : sortField === 'school_a' ? 'school_a_id'
        : sortField === 'school_b' ? 'school_b_id'
        : sortField === 'visible' ? 'is_visible'
        : sortField;

      dataQuery = dataQuery
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(pagination.from, pagination.to);

      const { data, error } = await dataQuery;
      if (error) throw error;

      setFixtures(data || []);

      if (isManualRefresh) {
        toast({ title: "Refreshed", description: `Loaded ${data?.length || 0} fixtures` });
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      toast({ title: "Failed to Load Fixtures", description: "Could not retrieve fixture data.", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.from, pagination.to, debouncedSearch, statusFilter, dateRange, sortField, sortDirection, getMatchingSchoolIds, applyFilters, toast]);

  useEffect(() => {
    if (schools.size > 0) fetchFixtures();
  }, [fetchFixtures, schools.size]);

  const toggleVisibility = async (fixture: any) => {
    try {
      const { error } = await supabase
        .from('fixtures')
        .update({ is_visible: !fixture.is_visible })
        .eq('id', fixture.id);
      if (error) throw error;
      toast({ title: "Success", description: `Fixture ${fixture.is_visible ? 'hidden' : 'visible'}` });
      fetchFixtures();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({ title: "Update Failed", description: "Could not update fixture visibility.", variant: "destructive" });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    pagination.goToPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
    pagination.goToPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === fixtures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fixtures.map(f => f.id)));
    }
  };

  const toggleSelectFixture = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const getSelectedFixturesWithNames = () =>
    fixtures
      .filter(f => selectedIds.has(f.id))
      .map(f => ({
        ...f,
        schoolAName: schools.get(f.school_a_id) || "Unknown",
        schoolBName: schools.get(f.school_b_id) || "Unknown",
      }));

  const handleBulkYearSuccess = () => {
    setSelectedIds(new Set());
    fetchFixtures();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      completed: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      final: 'bg-green-500/20 text-green-400 border-green-500/50',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/50',
      holding: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };
    return colors[status] || colors.holding;
  };

  if (loading && fixtures.length === 0) {
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
            placeholder="Search schools…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="holding">Holding</SelectItem>
          </SelectContent>
        </Select>
        <FixturesDateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchFixtures(true)}
          disabled={refreshing}
          className="gap-1.5 h-9 text-xs"
        >
          <RefreshCcw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          {refreshing ? "…" : "Refresh"}
        </Button>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary font-medium">{selectedIds.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkYearDialogOpen(true)}
            className="gap-1.5 h-7 text-xs"
          >
            <Calendar className="h-3 w-3" />
            Fix Year ({selectedIds.size})
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 px-2">
                <Checkbox
                  checked={fixtures.length > 0 && selectedIds.size === fixtures.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <SortableHead field="date" label="Date" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="school_a" label="Home" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="school_b" label="Away" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <TableHead className="text-xs px-2">Score</TableHead>
              <SortableHead field="venue" label="Venue" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="tournament" label="Tournament" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <SortableHead field="status" label="Status" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <TableHead className="text-xs px-2">Src</TableHead>
              <SortableHead field="visible" label="Vis" current={sortField} direction={sortDirection} onSort={handleSort} getIcon={getSortIcon} />
              <TableHead className="text-xs px-2 text-right">Act</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fixtures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs">
                    <p>
                      {pagination.totalCount === 0
                        ? "No fixtures loaded. Import CSV data to get started."
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || statusFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5 h-7 text-xs">
                        <RefreshCcw className="h-3 w-3" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              fixtures.map((fixture) => {
                const schoolA = schools.get(fixture.school_a_id) || 'Unknown';
                const schoolB = schools.get(fixture.school_b_id) || 'Unknown';
                const tournamentName = fixture.tournament_id ? tournaments.get(fixture.tournament_id) : null;
                const hasScore = fixture.score_a !== null && fixture.score_b !== null;
                const venueName = fixture.venue_type === 'tournament'
                  ? (fixture.tournament_id ? tournaments.get(fixture.tournament_id) || 'Tournament' : 'Tournament')
                  : fixture.venue_type === 'school' && fixture.venue_id
                    ? (schools.get(fixture.venue_id) || 'TBD')
                    : 'TBD';

                return (
                  <TableRow
                    key={fixture.id}
                    className={cn(
                      "group",
                      selectedIds.has(fixture.id) && "bg-muted/30"
                    )}
                  >
                    <TableCell className="px-2 py-1.5">
                      <Checkbox
                        checked={selectedIds.has(fixture.id)}
                        onCheckedChange={() => toggleSelectFixture(fixture.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground px-2 py-1.5 whitespace-nowrap">
                      {format(new Date(fixture.match_date), 'd MMM yy')}
                    </TableCell>
                    <TableCell className="text-xs px-2 py-1.5 max-w-[120px] truncate" title={schoolA}>
                      {schoolA}
                    </TableCell>
                    <TableCell className="text-xs px-2 py-1.5 max-w-[120px] truncate" title={schoolB}>
                      {schoolB}
                    </TableCell>
                    <TableCell className="text-xs text-center font-mono w-16 px-2 py-1.5">
                      {hasScore ? (
                        <>
                          <span className={fixture.score_a > fixture.score_b ? "font-semibold" : "text-muted-foreground"}>
                            {fixture.score_a}
                          </span>
                          {" - "}
                          <span className={fixture.score_b > fixture.score_a ? "font-semibold" : "text-muted-foreground"}>
                            {fixture.score_b}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">–</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground px-2 py-1.5 max-w-[100px] truncate" title={venueName}>
                      {venueName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground px-2 py-1.5 max-w-[100px] truncate" title={tournamentName || '-'}>
                      {tournamentName || '-'}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusBadge(fixture.status))}>
                        {fixture.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      {fixture.source_url ? (
                        <a href={fixture.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline">
                          Link
                        </a>
                      ) : <span className="text-xs text-muted-foreground">–</span>}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => toggleVisibility(fixture)}
                        title={fixture.is_visible ? "Hide" : "Show"}>
                        {fixture.is_visible
                          ? <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          : <EyeOff className="h-3.5 w-3.5 text-muted-foreground opacity-50" />}
                      </Button>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(fixture)}>
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls pagination={pagination} loading={loading} />

      <BulkYearCorrectionDialog
        open={bulkYearDialogOpen}
        onOpenChange={setBulkYearDialogOpen}
        selectedFixtures={getSelectedFixturesWithNames()}
        onSuccess={handleBulkYearSuccess}
      />
    </div>
  );
}

/* Compact sortable header cell */
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
