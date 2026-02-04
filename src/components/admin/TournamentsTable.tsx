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
import { Edit, Trash2, Loader2, Search, RefreshCw } from "lucide-react";
import { format } from "date-fns";
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

interface Tournament {
  id: string;
  name: string;
  host_school: string;
  venue: string;
  province: string | null;
  start_date: string;
  end_date: string;
  format_notes: string | null;
  participating_schools: string[];
  is_active: boolean;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
}

interface TournamentsTableProps {
  onEdit: (tournament: Tournament) => void;
}

export function TournamentsTable({ onEdit }: TournamentsTableProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({
        title: "Failed to Load Tournaments",
        description: "Could not retrieve tournament data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tournament deleted successfully",
      });
      
      fetchTournaments();
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast({
        title: "Delete Failed",
        description: "Could not remove the tournament. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  // Get unique provinces for filter
  const provinces = useMemo(() => {
    const uniqueProvinces = [...new Set(tournaments.map(t => t.province).filter(Boolean))];
    return uniqueProvinces.sort() as string[];
  }, [tournaments]);

  // Filter tournaments based on search and filters
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const query = debouncedSearch.toLowerCase();
      const matchesSearch =
        debouncedSearch === "" ||
        tournament.name.toLowerCase().includes(query) ||
        tournament.host_school.toLowerCase().includes(query) ||
        tournament.venue.toLowerCase().includes(query) ||
        tournament.province?.toLowerCase().includes(query) ||
        tournament.sponsor_name?.toLowerCase().includes(query) ||
        tournament.participating_schools.some(school => 
          school.toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && tournament.is_active) ||
        (statusFilter === "inactive" && !tournament.is_active);

      const matchesProvince =
        provinceFilter === "all" || tournament.province === provinceFilter;

      return matchesSearch && matchesStatus && matchesProvince;
    });
  }, [tournaments, debouncedSearch, statusFilter, provinceFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setProvinceFilter("all");
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
              placeholder="Search by name, host, venue, or participating school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament Name</TableHead>
              <TableHead>Host School</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Schools</TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTournaments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <p>
                      {tournaments.length === 0
                        ? "No tournaments found"
                        : "No matches found for your search"}
                    </p>
                    {(searchQuery || statusFilter !== "all" || provinceFilter !== "all") && (
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
              filteredTournaments.map((tournament) => (
                <TableRow key={tournament.id}>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/tournament/${tournament.id}`)}
                      className="font-medium hover:text-primary transition-colors text-left"
                    >
                      {tournament.name}
                    </button>
                  </TableCell>
                  <TableCell>{tournament.host_school}</TableCell>
                  <TableCell>
                    {tournament.venue}
                    {tournament.province && `, ${tournament.province}`}
                  </TableCell>
                  <TableCell>
                    {format(new Date(tournament.start_date), "MMM d")} -{" "}
                    {format(new Date(tournament.end_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{tournament.participating_schools.length} schools</TableCell>
                  <TableCell>
                    {tournament.sponsor_logo_url ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={tournament.sponsor_logo_url}
                          alt={tournament.sponsor_name || "Sponsor"}
                          className="h-8 object-contain"
                        />
                      </div>
                    ) : tournament.sponsor_name ? (
                      <span className="text-sm">{tournament.sponsor_name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        tournament.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tournament.is_active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(tournament)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(tournament.id)}
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
        Showing {filteredTournaments.length} of {tournaments.length} tournaments
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tournament</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tournament? This action cannot be undone.
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