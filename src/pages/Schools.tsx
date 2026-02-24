import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Star, School, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

import GlobalHeader from "@/components/GlobalHeader";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useSchoolsQuery } from "@/hooks/useSchoolsQuery";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/use-debounce";
import { CACHE_TIMES } from "@/lib/queryConfig";
import { getSchoolDisplayImage } from "@/lib/schoolImageUtils";
import { saProvinces } from "@/data/saProvinces";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  emblem_url: string | null;
  jersey_url: string | null;
  icon_url: string | null;
  status?: string;
}

interface TournamentRow {
  id: string;
  name: string;
}

type DiscoveryMode = "schools" | "tournaments";

interface DialogTarget {
  type: "school" | "tournament";
  id: string;
  name: string;
  isFollowed: boolean;
}

const PAGE_SIZE = 20;

export default function Schools() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DiscoveryMode>("schools");
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);
  const pagination = usePagination(1, PAGE_SIZE);

  // Unified dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<DialogTarget | null>(null);

  // ── Current user ──
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: CACHE_TIMES.STATIC,
  });

  // ── User profile (primary school) ──
  const { data: profile } = useQuery({
    queryKey: ["user-profile-school", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.USER_PROFILE,
  });

  // ── Schools data ──
  const { schools, loading: schoolsLoading } = useSchoolsQuery<SchoolRow>({
    select: "id, name, slug, province, emblem_url, jersey_url, icon_url",
    orderBy: "name",
  });

  // ── School follows ──
  const { data: schoolFollows = [] } = useQuery({
    queryKey: ["user-school-follows", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_school_follows")
        .select("school_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data?.map((f) => f.school_id) || [];
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.REFERENCE,
  });

  // ── Tournaments data ──
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ["all-tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return (data || []) as TournamentRow[];
    },
    staleTime: CACHE_TIMES.REFERENCE,
  });

  // ── Tournament follows ──
  const { data: tournamentFollows = [] } = useQuery({
    queryKey: ["user-tournament-follows", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_tournament_follows")
        .select("tournament_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data?.map((f) => f.tournament_id) || [];
    },
    enabled: !!user?.id,
    staleTime: CACHE_TIMES.REFERENCE,
  });

  const schoolFollowedSet = useMemo(() => new Set(schoolFollows), [schoolFollows]);
  const tournamentFollowedSet = useMemo(() => new Set(tournamentFollows), [tournamentFollows]);
  const primarySchoolId = profile?.school_id;

  // ── Sorted & filtered tournaments ──
  const sortedTournaments = useMemo(() => {
    return [...tournaments].sort((a, b) => a.name.localeCompare(b.name));
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    let list = sortedTournaments;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [sortedTournaments, debouncedSearch]);

  // ── Filtered schools ──
  const filteredSchools = useMemo(() => {
    let list = schools;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (province !== "all") {
      list = list.filter((s) => s.province === province);
    }
    return list;
  }, [schools, debouncedSearch, province]);

  // Active filtered list for pagination
  const activeList = mode === "schools" ? filteredSchools : filteredTournaments;

  // Update pagination total when filtered changes
  useMemo(() => {
    pagination.setTotalCount(activeList.length);
  }, [activeList.length]);

  // Reset to page 1 on filter/mode change
  useMemo(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, province, mode]);

  const pageItems = useMemo(
    () => activeList.slice(pagination.from, pagination.to + 1),
    [activeList, pagination.from, pagination.to]
  );

  // ── Follow/Unfollow handlers ──
  const handleStarClick = useCallback(
    (target: DialogTarget) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (target.type === "school" && target.id === primarySchoolId) return;
      setDialogTarget(target);
      setDialogOpen(true);
    },
    [user, primarySchoolId, navigate]
  );

  const handleConfirmFollow = useCallback(async () => {
    if (!dialogTarget || !user) return;
    try {
      if (dialogTarget.type === "school") {
        if (dialogTarget.isFollowed) {
          const { error } = await supabase
            .from("user_school_follows")
            .delete()
            .eq("user_id", user.id)
            .eq("school_id", dialogTarget.id);
          if (error) throw error;
          toast.success(`Unfollowed ${dialogTarget.name}`);
        } else {
          const { error } = await supabase
            .from("user_school_follows")
            .insert({ user_id: user.id, school_id: dialogTarget.id });
          if (error) throw error;
          toast.success(`Now following ${dialogTarget.name}`);
        }
        queryClient.invalidateQueries({ queryKey: ["user-school-follows", user.id] });
      } else {
        if (dialogTarget.isFollowed) {
          const { error } = await supabase
            .from("user_tournament_follows")
            .delete()
            .eq("user_id", user.id)
            .eq("tournament_id", dialogTarget.id);
          if (error) throw error;
          toast.success(`Unfollowed ${dialogTarget.name}`);
        } else {
          const { error } = await supabase
            .from("user_tournament_follows")
            .insert({ user_id: user.id, tournament_id: dialogTarget.id });
          if (error) throw error;
          toast.success(`Now following ${dialogTarget.name}`);
        }
        queryClient.invalidateQueries({ queryKey: ["user-tournament-follows", user.id] });
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setDialogOpen(false);
    setDialogTarget(null);
  }, [dialogTarget, user, queryClient]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const isLoading = mode === "schools" ? schoolsLoading : tournamentsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <GlobalHeader />
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 space-y-2">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "schools" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("schools")}
            className="flex-1"
          >
            Schools
          </Button>
          <Button
            variant={mode === "tournaments" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("tournaments")}
            className="flex-1"
          >
            Tournaments
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {mode === "schools" ? (
            <School className="w-5 h-5 text-primary shrink-0" />
          ) : (
            <Trophy className="w-5 h-5 text-primary shrink-0" />
          )}
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "schools" ? "Schools" : "Tournaments"}
          </h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={mode === "schools" ? "Search schools..." : "Search tournaments..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Province" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {saProvinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      <div className="px-4">
        {isLoading ? (
          <div className="space-y-2 pt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="w-5 h-5 rounded" />
              </div>
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            {mode === "schools" ? "No schools found." : "No tournaments found."}
          </p>
        ) : mode === "schools" ? (
          /* ── School rows ── */
          <ul className="divide-y divide-border/40">
            {(pageItems as SchoolRow[]).map((school) => {
              const imgUrl = getSchoolDisplayImage(school);
              const isFollowed = schoolFollowedSet.has(school.id);
              const isPrimary = school.id === primarySchoolId;

              return (
                <li
                  key={school.id}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={school.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {getInitials(school.name)}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/school/${school.slug}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {school.name}
                    </p>
                    {school.province && (
                      <p className="text-xs text-muted-foreground truncate">
                        {school.province}
                      </p>
                    )}
                  </button>

                  {user && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              handleStarClick({
                                type: "school",
                                id: school.id,
                                name: school.name,
                                isFollowed,
                              })
                            }
                            disabled={isPrimary}
                            className="shrink-0 p-1 disabled:cursor-default"
                            aria-label={
                              isPrimary
                                ? "Primary School"
                                : isFollowed
                                ? `Unfollow ${school.name}`
                                : `Follow ${school.name}`
                            }
                          >
                            <Star
                              className={`w-4.5 h-4.5 transition-colors ${
                                isFollowed || isPrimary
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground hover:text-yellow-400"
                              }`}
                            />
                          </button>
                        </TooltipTrigger>
                        {isPrimary && (
                          <TooltipContent>
                            <p>Primary School</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          /* ── Tournament rows ── */
          <ul className="divide-y divide-border/40">
            {(pageItems as TournamentRow[]).map((tournament) => {
              const isFollowed = tournamentFollowedSet.has(tournament.id);

              return (
                <li
                  key={tournament.id}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>

                  <button
                    onClick={() => navigate(`/tournament/${tournament.id}`)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium text-foreground truncate">
                      {tournament.name}
                    </p>
                  </button>

                  {user && (
                    <button
                      onClick={() =>
                        handleStarClick({
                          type: "tournament",
                          id: tournament.id,
                          name: tournament.name,
                          isFollowed,
                        })
                      }
                      className="shrink-0 p-1"
                      aria-label={
                        isFollowed
                          ? `Unfollow ${tournament.name}`
                          : `Follow ${tournament.name}`
                      }
                    >
                      <Star
                        className={`w-4.5 h-4.5 transition-colors ${
                          isFollowed
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!isLoading && activeList.length > PAGE_SIZE && (
          <div className="flex items-center justify-between py-4">
            <span className="text-xs text-muted-foreground">
              {pagination.startItem}–{pagination.endItem} of {pagination.totalCount}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Follow/Unfollow confirmation dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogTarget?.isFollowed
                ? `Unfollow ${dialogTarget?.name}?`
                : `Follow ${dialogTarget?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogTarget?.isFollowed
                ? dialogTarget?.type === "school"
                  ? "They will be removed from your home feed."
                  : "Tournament matches will be removed from your feed."
                : dialogTarget?.type === "school"
                ? "They will be added to your home feed."
                : "Tournament matches will appear in your feed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFollow}>
              {dialogTarget?.isFollowed ? "Unfollow" : "Follow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}
