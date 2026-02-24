import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Loader2, Search, RefreshCw, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Tournament {
  id: string;
  name: string;
  host_school: string;
  venue: string;
  province: string | null;
  format_notes: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
}

export interface TournamentEdition {
  id: string;
  tournament_id: string;
  year: number;
  start_date: string;
  end_date: string;
  participating_schools: string[];
  is_active: boolean;
}

interface TournamentsTableProps {
  onEdit: (tournament: Tournament) => void;
  onEditEdition?: (edition: TournamentEdition, tournament: Tournament) => void;
  onAddEdition?: (tournament: Tournament) => void;
  refreshTrigger?: number;
}

export function TournamentsTable({ onEdit, onEditEdition, onAddEdition, refreshTrigger }: TournamentsTableProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editions, setEditions] = useState<TournamentEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"tournament" | "edition">("tournament");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      const [tournamentsRes, editionsRes] = await Promise.all([
        supabase.from("tournaments").select("*").order("name"),
        supabase.from("tournament_editions" as any).select("*").order("year", { ascending: false }),
      ]);

      if (tournamentsRes.error) throw tournamentsRes.error;
      if (editionsRes.error) throw editionsRes.error;

      setTournaments(tournamentsRes.data || []);
      setEditions((editionsRes.data || []) as TournamentEdition[]);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({ title: "Failed to Load Tournaments", description: "Could not retrieve tournament data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const table = deleteType === "edition" ? ("tournament_editions" as any) : "tournaments";
      const { error } = await supabase.from(table).delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Success", description: `${deleteType === "edition" ? "Edition" : "Tournament"} deleted successfully` });
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Delete Failed", description: "Could not delete. It may have linked fixtures.", variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const provinces = useMemo(() => {
    const unique = [...new Set(tournaments.map(t => t.province).filter(Boolean))];
    return unique.sort() as string[];
  }, [tournaments]);

  const editionsByTournament = useMemo(() => {
    const map = new Map<string, TournamentEdition[]>();
    for (const e of editions) {
      const list = map.get(e.tournament_id) || [];
      list.push(e);
      map.set(e.tournament_id, list);
    }
    return map;
  }, [editions]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const q = debouncedSearch.toLowerCase();
      const matchesSearch = !debouncedSearch ||
        t.name.toLowerCase().includes(q) ||
        t.host_school.toLowerCase().includes(q) ||
        t.venue.toLowerCase().includes(q) ||
        t.province?.toLowerCase().includes(q) ||
        t.sponsor_name?.toLowerCase().includes(q);
      const matchesProvince = provinceFilter === "all" || t.province === provinceFilter;
      return matchesSearch && matchesProvince;
    });
  }, [tournaments, debouncedSearch, provinceFilter]);

  const clearFilters = () => { setSearchQuery(""); setProvinceFilter("all"); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, host, venue..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Province" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {provinces.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Tournament Name</TableHead>
              <TableHead>Host School</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Editions</TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTournaments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>{tournaments.length === 0 ? "No tournaments found" : "No matches found"}</p>
                    {(searchQuery || provinceFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Clear filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTournaments.map((tournament) => {
                const tournamentEditions = editionsByTournament.get(tournament.id) || [];
                const isExpanded = expandedIds.has(tournament.id);

                return (
                  <>
                    <TableRow key={tournament.id}>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(tournament.id)}>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => {
                          const latestEdition = tournamentEditions[0];
                          if (latestEdition) navigate(`/tournament/${latestEdition.id}`);
                        }} className="font-medium hover:text-primary transition-colors text-left">
                          {tournament.name}
                        </button>
                      </TableCell>
                      <TableCell>{tournament.host_school}</TableCell>
                      <TableCell>{tournament.venue}{tournament.province && `, ${tournament.province}`}</TableCell>
                      <TableCell>{tournamentEditions.length} edition(s)</TableCell>
                      <TableCell>
                        {tournament.sponsor_logo_url ? (
                          <img src={tournament.sponsor_logo_url} alt={tournament.sponsor_name || "Sponsor"} className="h-8 object-contain" />
                        ) : tournament.sponsor_name ? (
                          <span className="text-sm">{tournament.sponsor_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {onAddEdition && (
                            <Button variant="outline" size="sm" onClick={() => onAddEdition(tournament)} title="Add Edition">
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => onEdit(tournament)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setDeleteType("tournament"); setDeleteId(tournament.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && tournamentEditions.map((edition) => (
                      <TableRow key={edition.id} className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          ↳ {edition.year} Edition
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(edition.start_date), "MMM d")} – {format(new Date(edition.end_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">{edition.participating_schools.length} schools</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${edition.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {edition.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {onEditEdition && (
                              <Button variant="outline" size="sm" onClick={() => onEditEdition(edition, tournament)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => { setDeleteType("edition"); setDeleteId(edition.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}

                    {isExpanded && tournamentEditions.length === 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell></TableCell>
                        <TableCell colSpan={6} className="text-sm text-muted-foreground italic">
                          No editions yet.{" "}
                          {onAddEdition && (
                            <button onClick={() => onAddEdition(tournament)} className="text-primary hover:underline">
                              Add one
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground mt-4">
        Showing {filteredTournaments.length} of {tournaments.length} tournaments
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteType === "edition" ? "Edition" : "Tournament"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "tournament"
                ? "This will delete the tournament and all its editions. This cannot be undone."
                : "This will delete this edition. Linked fixtures will lose their tournament reference."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
