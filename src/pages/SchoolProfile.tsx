import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Trophy, Flame, Users, Heart, HeartOff } from "lucide-react";
import { FixtureTable } from "@/components/fixtures/FixtureTable";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

export default function SchoolProfile() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [upcomingFixtures, setUpcomingFixtures] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [primarySchoolId, setPrimarySchoolId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 34, g: 197, b: 94 };
  };

  useEffect(() => {
    loadSchoolData();
    loadUserFollowState();
  }, [schoolSlug]);

  const loadUserFollowState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolSlug) return;
    setCurrentUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    setPrimarySchoolId(profile?.school_id || null);

    const { data: schoolData } = await supabase
      .from("schools")
      .select("id")
      .eq("slug", schoolSlug)
      .maybeSingle();
    if (!schoolData) return;

    const { data: follow } = await supabase
      .from("user_school_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("school_id", schoolData.id)
      .maybeSingle();
    setIsFollowing(!!follow);
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || !school) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("user_school_follows")
          .delete()
          .eq("user_id", currentUserId)
          .eq("school_id", school.id);
        setIsFollowing(false);
        sonnerToast(`Unfollowed ${school.name}`);
      } else {
        await supabase
          .from("user_school_follows")
          .insert({ user_id: currentUserId, school_id: school.id });
        setIsFollowing(true);
        sonnerToast(`Now following ${school.name}`);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const loadSchoolData = async () => {
    if (!schoolSlug) return;
    
    setLoading(true);
    try {
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("slug", schoolSlug)
        .maybeSingle();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      if (!schoolData) return;

      const schoolId = schoolData.id;

      const { data: upcomingData, error: upcomingError } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_legacy, school_a_id, school_b_id, status, is_derby,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
        .in("status", ["upcoming", "holding"])
        .gte("match_date", new Date().toISOString())
        .order("match_date", { ascending: true })
        .limit(5);

      setUpcomingFixtures((upcomingData || []) as any[]);

      const { data: resultsData, error: resultsError } = await supabase
        .from("fixtures")
        .select(`
          id, match_date, venue_legacy, school_a_id, school_b_id, status, is_derby, score_a, score_b,
          school_a:schools!fixtures_school_a_id_fkey(id, name, slug, jersey_url, province),
          school_b:schools!fixtures_school_b_id_fkey(id, name, slug, jersey_url, province),
          tournament:tournaments(id, name)
        `)
        .or(`school_a_id.eq.${schoolId},school_b_id.eq.${schoolId}`)
        .eq("status", "completed")
        .not("score_a", "is", null)
        .not("score_b", "is", null)
        .order("match_date", { ascending: false })
        .limit(5);

      setRecentResults((resultsData || []) as any[]);

      const { data: topUsersData } = await supabase
        .from("user_scores")
        .select(`
          season_points,
          user_id,
          profiles!inner(display_name, first_name, school_id)
        `)
        .eq("profiles.school_id", schoolData.id)
        .order("season_points", { ascending: false })
        .limit(5);

      if (topUsersData) {
        const formattedUsers = topUsersData.map((item: any, index) => ({
          rank: index + 1,
          name: item.profiles?.display_name || item.profiles?.first_name || "Anonymous",
          points: item.season_points || 0
        }));
        setTopUsers(formattedUsers);
      }

    } catch (error: any) {
      toast({
        title: "Error loading school",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading school profile...</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">School not found</p>
      </div>
    );
  }

  const isDerby = (fixture: any) => {
    const schoolA = fixture.school_a?.name;
    const schoolB = fixture.school_b?.name;
    return fixture.is_derby || 
           schoolA === school.main_rival || 
           schoolB === school.main_rival;
  };

  const primaryColor = school.primary_color || '#22C55E';
  const secondaryColor = school.secondary_color || '#FFD700';
  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <div className="relative h-72 overflow-hidden border-b border-border/40">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.15) 0%, rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.15) 100%)`
          }}
        >
          <div className="absolute inset-0 bg-background/85"></div>
          <div 
            className="absolute inset-0 opacity-5" 
            style={{
              backgroundImage: `repeating-linear-gradient(
                0deg,
                transparent,
                transparent 18px,
                rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}) 18px,
                rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}) 20px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 80px,
                rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}) 80px,
                rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}) 82px
              )`
            }}
          ></div>
        </div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="relative mb-6">
            <div 
              className="w-36 h-36 rounded-2xl bg-card/90 backdrop-blur-md flex items-center justify-center border-2 overflow-hidden p-5 rotate-45 transform"
              style={{
                borderColor: primaryColor,
                boxShadow: `0 0 50px rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`
              }}
            >
              <div className="-rotate-45 w-full h-full flex items-center justify-center">
                {(school.emblem_url || school.jersey_url || school.icon_url) ? (
                  <img 
                    src={school.emblem_url || school.jersey_url || school.icon_url} 
                    alt={`${school.name} crest`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span 
                    className="text-5xl font-bold"
                    style={{ color: primaryColor }}
                  >
                    {school.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            {upcomingFixtures.some(f => isDerby(f)) && (
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-destructive rounded-full flex items-center justify-center animate-pulse shadow-lg">
                <Flame className="w-6 h-6 text-destructive-foreground" />
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-bold text-center mb-2 tracking-tight">{school.name}</h1>
          {school.motto && (
            <p 
              className="text-sm italic text-center max-w-md px-4 font-medium"
              style={{ color: secondaryColor }}
            >
              "{school.motto}"
            </p>
          )}
          
          {currentUserId && (
            <div className="mt-4">
              {primarySchoolId === school.id ? (
                <Badge variant="secondary" className="px-4 py-1.5">
                  <Heart className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  Primary School
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className="min-w-[120px]"
                >
                  {isFollowing ? (
                    <>
                      <HeartOff className="w-4 h-4 mr-1.5" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-1.5" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap gap-3 justify-center">
          {school.established_year && (
            <div className="h-12 px-5 rounded-full bg-card border border-primary/30 flex items-center gap-2 shadow-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-shadow">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Established {school.established_year}</span>
            </div>
          )}
          {school.province && (
            <div className="h-12 px-5 rounded-full bg-card border border-accent/30 flex items-center gap-2 shadow-sm hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] transition-shadow">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{school.province}</span>
            </div>
          )}
          {school.springboks_count !== null && (
            <div className="h-12 px-5 rounded-full bg-card border border-primary/30 flex items-center gap-2 shadow-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-shadow">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium">{school.springboks_count} Springboks</span>
            </div>
          )}
        </div>

        <FixtureTable fixtures={upcomingFixtures} />

        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>Last 5 completed matches</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent results</p>
            ) : (
              <FixtureTable fixtures={recentResults} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Trybal Users</CardTitle>
            <CardDescription>Best performers from {school.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topUsers.map((user) => (
                <div
                  key={user.rank}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-muted-foreground">Rank #{user.rank}</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {user.points} brags
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {school.main_rival && upcomingFixtures.some(f => isDerby(f)) && (
          <Card className="border-destructive/40 bg-gradient-to-br from-destructive/10 to-destructive/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-3xl"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 relative z-10">
                <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center animate-pulse">
                  <Flame className="w-6 h-6 text-destructive" />
                </div>
                Derby Match Alert!
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {upcomingFixtures.filter(f => isDerby(f)).map(derbyMatch => (
                <div key={derbyMatch.id} className="space-y-3">
                  <p className="text-center font-medium">
                    The historic rivalry with <span className="font-bold text-destructive">{school.main_rival}</span> continues!
                  </p>
                  <div className="p-4 bg-card/60 rounded-lg border border-destructive/20">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-background/60 flex items-center justify-center border-2 border-primary overflow-hidden p-1">
                          {derbyMatch.school_a?.icon_url && (
                            <img src={derbyMatch.school_a.icon_url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-sm">{derbyMatch.school_a?.name}</span>
                      </div>
                      <span className="font-black text-muted-foreground">VS</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-right">{derbyMatch.school_b?.name}</span>
                        <div className="w-10 h-10 rounded-full bg-background/60 flex items-center justify-center border-2 border-accent overflow-hidden p-1">
                          {derbyMatch.school_b?.icon_url && (
                            <img src={derbyMatch.school_b.icon_url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge variant="outline" className="bg-background/50 border-destructive/30 text-destructive">
                        {new Date(derbyMatch.match_date).toLocaleDateString()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
