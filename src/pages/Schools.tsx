import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Star, School } from "lucide-react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";

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

const PAGE_SIZE = 20;

export default function Schools() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);
  const pagination = usePagination(1, PAGE_SIZE);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSchool, setDialogSchool] = useState<{ id: string; name: string; isFollowed: boolean } | null>(null);

  // Fetch all schools
  const { schools, loading: schoolsLoading } = useSchoolsQuery<SchoolRow>({
    select: "id, name, slug, province, emblem_url, jersey_url, icon_url",
    orderBy: "name",
  });

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: CACHE_TIMES.STATIC,
  });

  // Fetch user profile for primary school
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

  // Fetch user follows
  const { data: follows = [] } = useQuery({
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

  const followedSet = useMemo(() => new Set(follows), [follows]);
  const primarySchoolId = profile?.school_id;

  // Client-side filtering
  const filtered = useMemo(() => {
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

  // Update pagination total when filtered changes
  useMemo(() => {
    pagination.setTotalCount(filtered.length);
  }, [filtered.length]);

  // Reset to page 1 on filter change
  useMemo(() => {
    pagination.goToPage(1);
  }, [debouncedSearch, province]);

  // Current page slice
  const pageItems = useMemo(
    () => filtered.slice(pagination.from, pagination.to + 1),
    [filtered, pagination.from, pagination.to]
  );

  const handleStarClick = useCallback(
    (school: SchoolRow) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (school.id === primarySchoolId) return;
      const isFollowed = followedSet.has(school.id);
      setDialogSchool({ id: school.id, name: school.name, isFollowed });
      setDialogOpen(true);
    },
    [user, primarySchoolId, followedSet, navigate]
  );

  const handleConfirmFollow = useCallback(async () => {
    if (!dialogSchool || !user) return;
    try {
      if (dialogSchool.isFollowed) {
        const { error } = await supabase
          .from("user_school_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("school_id", dialogSchool.id);
        if (error) throw error;
        toast.success(`Unfollowed ${dialogSchool.name}`);
      } else {
        const { error } = await supabase
          .from("user_school_follows")
          .insert({ user_id: user.id, school_id: dialogSchool.id });
        if (error) throw error;
        toast.success(`Now following ${dialogSchool.name}`);
      }
      queryClient.invalidateQueries({ queryKey: ["user-school-follows", user.id] });
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setDialogOpen(false);
    setDialogSchool(null);
  }, [dialogSchool, user, queryClient]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <School className="w-5 h-5 text-primary shrink-0" />
          <h1 className="text-lg font-semibold text-foreground">Schools</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search schools..."
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

      {/* School list */}
      <div className="px-4">
        {schoolsLoading ? (
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
            No schools found.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {pageItems.map((school) => {
              const imgUrl = getSchoolDisplayImage(school);
              const isFollowed = followedSet.has(school.id);
              const isPrimary = school.id === primarySchoolId;

              return (
                <li
                  key={school.id}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/50 -mx-4 px-4 transition-colors"
                >
                  {/* Avatar */}
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

                  {/* Name & province */}
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

                  {/* Follow star */}
                  {user && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleStarClick(school)}
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
        )}

        {/* Simple pagination */}
        {!schoolsLoading && filtered.length > PAGE_SIZE && (
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
              {dialogSchool?.isFollowed
                ? `Unfollow ${dialogSchool?.name}?`
                : `Follow ${dialogSchool?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogSchool?.isFollowed
                ? "They will be removed from your home feed."
                : "They will be added to your home feed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFollow}>
              {dialogSchool?.isFollowed ? "Unfollow" : "Follow"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
