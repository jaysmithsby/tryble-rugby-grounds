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
import { Edit, Search, Loader2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  const filteredFixtures = useMemo(() => {
    return fixtures.filter((fixture) => {
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
  }, [fixtures, schools, tournaments, debouncedSearch, statusFilter, yearFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setYearFilter("all");
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredFixtures.length} of {fixtures.length} fixtures
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Home</TableHead>
              <TableHead>Away</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFixtures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
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
              filteredFixtures.map((fixture) => {
                const homeSchool = schools.get(fixture.home_school_id) || 'Unknown School';
                const awaySchool = schools.get(fixture.away_school_id) || 'Unknown School';
                const tournamentName = fixture.tournament_id 
                  ? tournaments.get(fixture.tournament_id) 
                  : null;
                
                return (
                <TableRow key={fixture.id}>
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
    </div>
  );
}
