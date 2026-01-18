import { useState, useEffect, useMemo } from "react";
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
import { Edit, Search, Loader2, Eye, EyeOff, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkYearCorrectionDialog } from "./BulkYearCorrectionDialog";

type SortField = 'date' | 'home' | 'away' | 'venue' | 'tournament' | 'status' | 'visible';
type SortDirection = 'asc' | 'desc';

interface FixturesTableProps {
  onEdit: (fixture: any) => void;
}

export function FixturesTable({ onEdit }: FixturesTableProps) {
  const { toast } = useToast();
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

  useEffect(() => {
    fetchSchools();
    fetchTournaments();
    fetchFixtures();
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

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('match_date', { ascending: false });

      if (error) throw error;
      console.log(`Loaded ${data?.length || 0} fixtures`);
      setFixtures(data || []);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
      toast({
        title: "Error",
        description: "Failed to load fixtures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        title: "Error",
        description: "Failed to update fixture",
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
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const filteredAndSortedFixtures = useMemo(() => {
    const filtered = fixtures.filter((fixture) => {
      const homeSchool = schools.get(fixture.home_school_id) || '';
      const awaySchool = schools.get(fixture.away_school_id) || '';
      const tournamentName = fixture.tournament_id ? tournaments.get(fixture.tournament_id) || '' : '';
      const query = debouncedSearch.toLowerCase();
      const matchDate = format(new Date(fixture.match_date), 'MMM dd yyyy').toLowerCase();
      
      const matchesSearch =
        debouncedSearch === "" ||
        fixture.venue.toLowerCase().includes(query) ||
        homeSchool.toLowerCase().includes(query) ||
        awaySchool.toLowerCase().includes(query) ||
        tournamentName.toLowerCase().includes(query) ||
        matchDate.includes(query);

      const matchesStatus =
        statusFilter === "all" || fixture.status === statusFilter;

      const matchesYear =
        yearFilter === "all" || fixture.year.toString() === yearFilter;

      return matchesSearch && matchesStatus && matchesYear;
    });

    // Sort the filtered results
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
          break;
        case 'home':
          const homeA = schools.get(a.home_school_id) || '';
          const homeB = schools.get(b.home_school_id) || '';
          comparison = homeA.localeCompare(homeB);
          break;
        case 'away':
          const awayA = schools.get(a.away_school_id) || '';
          const awayB = schools.get(b.away_school_id) || '';
          comparison = awayA.localeCompare(awayB);
          break;
        case 'venue':
          comparison = a.venue.localeCompare(b.venue);
          break;
        case 'tournament':
          const tournA = a.tournament_id ? tournaments.get(a.tournament_id) || '' : '';
          const tournB = b.tournament_id ? tournaments.get(b.tournament_id) || '' : '';
          comparison = tournA.localeCompare(tournB);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'visible':
          comparison = (a.is_visible === b.is_visible) ? 0 : a.is_visible ? -1 : 1;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [fixtures, schools, tournaments, debouncedSearch, statusFilter, yearFilter, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setYearFilter("all");
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedFixtures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedFixtures.map((f) => f.id)));
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
    return filteredAndSortedFixtures
      .filter((f) => selectedIds.has(f.id))
      .map((f) => ({
        ...f,
        homeName: schools.get(f.home_school_id) || "Unknown",
        awayName: schools.get(f.away_school_id) || "Unknown",
      }));
  };

  const handleBulkYearSuccess = () => {
    setSelectedIds(new Set());
    fetchFixtures();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'final':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'holding':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
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

      {/* Results count and bulk actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedFixtures.length} of {fixtures.length} fixtures
          {selectedIds.size > 0 && (
            <span className="ml-2 text-primary">
              ({selectedIds.size} selected)
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
                  checked={
                    filteredAndSortedFixtures.length > 0 &&
                    selectedIds.size === filteredAndSortedFixtures.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center">
                  Date
                  {getSortIcon('date')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('home')}
              >
                <div className="flex items-center">
                  Home
                  {getSortIcon('home')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('away')}
              >
                <div className="flex items-center">
                  Away
                  {getSortIcon('away')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('venue')}
              >
                <div className="flex items-center">
                  Venue
                  {getSortIcon('venue')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('tournament')}
              >
                <div className="flex items-center">
                  Tournament
                  {getSortIcon('tournament')}
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
              <TableHead>Score</TableHead>
              <TableHead>Source</TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('visible')}
              >
                <div className="flex items-center">
                  Visible
                  {getSortIcon('visible')}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedFixtures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {fixtures.length === 0 
                        ? "No fixtures loaded. Import CSV data to get started."
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || statusFilter !== "all" || yearFilter !== "all") && (
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
              filteredAndSortedFixtures.map((fixture) => {
                const homeSchool = schools.get(fixture.home_school_id) || 'Unknown School';
                const awaySchool = schools.get(fixture.away_school_id) || 'Unknown School';
                const tournamentName = fixture.tournament_id 
                  ? tournaments.get(fixture.tournament_id) 
                  : null;
                
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
                  <TableCell className="text-sm">{homeSchool}</TableCell>
                  <TableCell className="text-sm">{awaySchool}</TableCell>
                  <TableCell className="text-sm">{fixture.venue}</TableCell>
                  <TableCell className="text-sm">
                    {tournamentName ? (
                      <Badge variant="outline" className="text-xs">
                        {tournamentName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(fixture.status)}>
                      {fixture.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {fixture.home_score !== null && fixture.away_score !== null
                      ? `${fixture.home_score} - ${fixture.away_score}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {fixture.source_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={fixture.source_url} target="_blank" rel="noopener noreferrer" title={fixture.source_url}>
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(fixture)}
                    >
                      {fixture.is_visible ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(fixture)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BulkYearCorrectionDialog
        open={bulkYearDialogOpen}
        onOpenChange={setBulkYearDialogOpen}
        selectedFixtures={getSelectedFixturesWithNames()}
        onSuccess={handleBulkYearSuccess}
      />
    </div>
  );
}
