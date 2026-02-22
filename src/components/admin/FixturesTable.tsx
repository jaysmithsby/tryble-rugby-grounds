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
import { format } from "date-fns";
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
  const [yearFilter, setYearFilter] = useState("all");
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
      const { data, error } = await supabase
        .from('schools')
        .select('id, name');

      if (error) throw error;

      const schoolMap = new Map(data?.map(s => [s.id, s.name]) || []);
      setSchools(schoolMap);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name');

      if (error) throw error;

      const tournamentMap = new Map(data?.map(t => [t.id, t.name]) || []);
      setTournaments(tournamentMap);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  useEffect(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, statusFilter, yearFilter]);

  const fetchFixtures = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      let countQuery = supabase
        .from('fixtures')
        .select('*', { count: 'exact', head: true });

      if (statusFilter !== 'all') {
        countQuery = countQuery.eq('status', statusFilter);
      }
      if (yearFilter !== 'all') {
        countQuery = countQuery.eq('year', parseInt(yearFilter));
      }

      const { count, error: countError } = await countQuery;
      if (countError) console.error('Count error:', countError);
      
      pagination.setTotalCount(count || 0);

      let dataQuery = supabase
        .from('fixtures')
        .select('*');

      if (statusFilter !== 'all') {
        dataQuery = dataQuery.eq('status', statusFilter);
      }
      if (yearFilter !== 'all') {
        dataQuery = dataQuery.eq('year', parseInt(yearFilter));
      }

      const sortColumn = sortField === 'date' ? 'match_date'
        : sortField === 'school_a' ? 'school_a_id'
        : sortField === 'school_b' ? 'school_b_id'
        : sortField === 'visible' ? 'is_visible'
        : sortField;
      
      dataQuery = dataQuery.order(sortColumn, { ascending: sortDirection === 'asc' });
      dataQuery = dataQuery.range(pagination.from, pagination.to);

      const { data, error } = await dataQuery;

      if (error) throw error;
      
      let filteredData = data || [];
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        filteredData = filteredData.filter(fixture => {
          const schoolA = schools.get(fixture.school_a_id) || '';
          const schoolB = schools.get(fixture.school_b_id) || '';
          const tournamentName = fixture.tournament_id ? tournaments.get(fixture.tournament_id) || '' : '';
          const matchDate = format(new Date(fixture.match_date), 'MMM dd yyyy').toLowerCase();
          
          return (fixture.venue_legacy || '').toLowerCase().includes(query) ||
            schoolA.toLowerCase().includes(query) ||
            schoolB.toLowerCase().includes(query) ||
            tournamentName.toLowerCase().includes(query) ||
            matchDate.includes(query);
        });
      }

      setFixtures(filteredData);
      
      if (isManualRefresh) {
        toast({
          title: "Refreshed",
          description: `Loaded ${data?.length || 0} fixtures`,
        });
      }
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      toast({
        title: "Failed to Load Fixtures",
        description: "Could not retrieve fixture data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.from, pagination.to, debouncedSearch, statusFilter, yearFilter, sortField, sortDirection, schools, tournaments, toast]);

  useEffect(() => {
    if (schools.size > 0) {
      fetchFixtures();
    }
  }, [fetchFixtures, schools.size]);

  const handleManualRefresh = () => {
    fetchFixtures(true);
  };

  const toggleVisibility = async (fixture: any) => {
    try {
      const { error } = await supabase
        .from('fixtures')
        .update({ is_visible: !fixture.is_visible })
        .eq('id', fixture.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Fixture ${fixture.is_visible ? 'hidden' : 'visible'}`,
      });

      fetchFixtures();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast({
        title: "Update Failed",
        description: "Could not update fixture visibility. Please try again.",
        variant: "destructive",
      });
    }
  };

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

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setYearFilter("all");
    pagination.goToPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === fixtures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(fixtures.map((f) => f.id)));
    }
  };

  const toggleSelectFixture = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getSelectedFixturesWithNames = () => {
    return fixtures
      .filter((f) => selectedIds.has(f.id))
      .map((f) => ({
        ...f,
        schoolAName: schools.get(f.school_a_id) || "Unknown",
        schoolBName: schools.get(f.school_b_id) || "Unknown",
      }));
  };

  const handleBulkYearSuccess = () => {
    setSelectedIds(new Set());
    fetchFixtures();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'final': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'holding': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (loading && fixtures.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by school name or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="holding">Holding</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size > 0 && (
            <span className="text-primary">
              {selectedIds.size} selected
            </span>
          )}
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkYearDialogOpen(true)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Fix Year ({selectedIds.size})
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={fixtures.length > 0 && selectedIds.size === fixtures.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('date')}>
                <div className="flex items-center">Date {getSortIcon('date')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('school_a')}>
                <div className="flex items-center">School A {getSortIcon('school_a')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('school_b')}>
                <div className="flex items-center">School B {getSortIcon('school_b')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('venue')}>
                <div className="flex items-center">Venue {getSortIcon('venue')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('tournament')}>
                <div className="flex items-center">Tournament {getSortIcon('tournament')}</div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status {getSortIcon('status')}</div>
              </TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort('visible')}>
                <div className="flex items-center">Visible {getSortIcon('visible')}</div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fixtures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {pagination.totalCount === 0 
                        ? "No fixtures loaded. Import CSV data to get started."
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || statusFilter !== "all" || yearFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              fixtures.map((fixture) => {
                const schoolAName = schools.get(fixture.school_a_id) || 'Unknown School';
                const schoolBName = schools.get(fixture.school_b_id) || 'Unknown School';
                const tournamentName = fixture.tournament_id ? tournaments.get(fixture.tournament_id) : null;
                
                return (
                <TableRow key={fixture.id} className={selectedIds.has(fixture.id) ? "bg-muted/30" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(fixture.id)}
                      onCheckedChange={() => toggleSelectFixture(fixture.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(fixture.match_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-sm">{schoolAName}</TableCell>
                  <TableCell className="text-sm">{schoolBName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fixture.venue_legacy || 'TBD'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tournamentName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(fixture.status)}>
                      {fixture.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {(fixture.score_a !== null && fixture.score_b !== null) 
                      ? `${fixture.score_a} - ${fixture.score_b}` 
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {fixture.source_url ? (
                      <a 
                        href={fixture.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Link
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(fixture)}
                      title={fixture.is_visible ? "Hide fixture" : "Show fixture"}
                    >
                      {fixture.is_visible ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground opacity-50" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(fixture)}
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationControls pagination={pagination} />

      <BulkYearCorrectionDialog 
        open={bulkYearDialogOpen}
        onOpenChange={setBulkYearDialogOpen}
        selectedFixtures={getSelectedFixturesWithNames()}
        onSuccess={handleBulkYearSuccess}
      />
    </div>
  );
}
