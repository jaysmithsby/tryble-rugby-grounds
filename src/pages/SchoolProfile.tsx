import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Trophy, Flame, Users, Heart, HeartOff } from "lucide-react";
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

  // Helper to convert hex to RGB for styling
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 34, g: 197, b: 94 }; // Default green
  };

  useEffect(() => {
    loadSchoolData();
    loadUserFollowState();
  }, [schoolSlug]);

  const loadUserFollowState = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolSlug) return;
    setCurrentUserId(user.id);

    // Get user's primary school
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    setPrimarySchoolId(profile?.school_id || null);

    // Check if already following (need school id first)
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
      // Load school details by slug
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("slug", schoolSlug)
        .maybeSingle();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      if (!schoolData) return;

      const schoolId = schoolData.id;

      // Load all schools for joining with fixtures
      const { data: allSchools } = await supabase
        .from("schools")
        .select("id, name, slug, icon_url, emblem_url, jersey_url, main_rival");
      
      const schoolsMap = new Map(allSchools?.map(s => [s.id, s]) || []);

      // Load upcoming fixtures (status: upcoming, holding, or future dates)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("fixtures")
        .select("*")
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .in("status", ["upcoming", "holding"])
        .gte("match_date", new Date().toISOString())
        .order("match_date", { ascending: true })
        .limit(5);

      // Join school data to upcoming fixtures
      const upcomingWithSchools = (upcomingData || []).map(fixture => ({
        ...fixture,
        home_school: schoolsMap.get(fixture.home_school_id),
        away_school: schoolsMap.get(fixture.away_school_id)
      }));
      setUpcomingFixtures(upcomingWithSchools);

      // Load recent results (completed matches or past dates with scores)
      const { data: resultsData, error: resultsError } = await supabase
        .from("fixtures")
        .select("*")
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .eq("status", "completed")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("match_date", { ascending: false })
        .limit(5);

      // Join school data to recent results
      const resultsWithSchools = (resultsData || []).map(fixture => ({
        ...fixture,
        home_school: schoolsMap.get(fixture.home_school_id),
        away_school: schoolsMap.get(fixture.away_school_id)
      }));
      setRecentResults(resultsWithSchools);

      // Load top 5 users from this school
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
    const homeSchool = fixture.home_school?.name;
    const awaySchool = fixture.away_school?.name;
    return fixture.is_derby || 
           homeSchool === school.main_rival || 
           awaySchool === school.main_rival;
  };

  // Get school colors with fallback
  const primaryColor = school.primary_color || '#22C55E';
  const secondaryColor = school.secondary_color || '#FFD700';
  const primaryRgb = hexToRgb(primaryColor);
  const secondaryRgb = hexToRgb(secondaryColor);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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

      {/* Hero Section with Dynamic School Colors */}
      <div className="relative h-72 overflow-hidden border-b border-border/40">
        {/* Dynamic gradient background based on school colors */}
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
          {/* Shield-style School Crest Container */}
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
            {/* Derby Flame if rivalry match upcoming */}
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
          
          {/* Follow / Unfollow Button */}
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

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Quick Facts Chips */}
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

        {/* Upcoming Fixtures */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Fixtures</CardTitle>
            <CardDescription>Next 5 matches</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingFixtures.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No upcoming fixtures</p>
            ) : (
              <div className="space-y-3">
                {upcomingFixtures.map((fixture) => (
                  <div key={fixture.id} className="p-4 border border-border/40 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(fixture.match_date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {fixture.status}
                        </Badge>
                        {isDerby(fixture) && (
                          <Badge variant="destructive" className="text-xs">
                            <Flame className="w-3 h-3 mr-1" />
                            Derby
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fixture.home_school?.slug) navigate(`/school/${fixture.home_school.slug}`);
                          }}
                          className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          disabled={!fixture.home_school?.slug}
                        >
                          {(fixture.home_school?.emblem_url || fixture.home_school?.jersey_url || fixture.home_school?.icon_url) ? (
                            <img 
                              src={fixture.home_school?.emblem_url || fixture.home_school?.jersey_url || fixture.home_school?.icon_url} 
                              alt={fixture.home_school.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {fixture.home_school?.name.substring(0, 3)}
                            </span>
                          )}
                        </button>
                        <span className="text-sm font-medium">{fixture.home_school?.name}</span>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">VS</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium">{fixture.away_school?.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fixture.away_school?.slug) navigate(`/school/${fixture.away_school.slug}`);
                          }}
                          className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          disabled={!fixture.away_school?.slug}
                        >
                          {(fixture.away_school?.emblem_url || fixture.away_school?.jersey_url || fixture.away_school?.icon_url) ? (
                            <img 
                              src={fixture.away_school?.emblem_url || fixture.away_school?.jersey_url || fixture.away_school?.icon_url} 
                              alt={fixture.away_school.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {fixture.away_school?.name.substring(0, 3)}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {fixture.venue_legacy || "TBD"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>Last 5 completed matches</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResults.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No recent results</p>
            ) : (
              <div className="space-y-3">
                {recentResults.map((fixture) => (
                  <div key={fixture.id} className="p-4 border border-border/40 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(fixture.match_date).toLocaleDateString()}
                      </span>
                      <Badge variant="outline" className="text-xs">Final</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fixture.home_school?.slug) navigate(`/school/${fixture.home_school.slug}`);
                          }}
                          className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          disabled={!fixture.home_school?.slug}
                        >
                          {(fixture.home_school?.emblem_url || fixture.home_school?.jersey_url || fixture.home_school?.icon_url) ? (
                            <img 
                              src={fixture.home_school?.emblem_url || fixture.home_school?.jersey_url || fixture.home_school?.icon_url} 
                              alt={fixture.home_school.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {fixture.home_school?.name.substring(0, 3)}
                            </span>
                          )}
                        </button>
                        <span className="text-sm font-medium">{fixture.home_school?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{fixture.home_score ?? 0}</span>
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="text-lg font-bold">{fixture.away_score ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium">{fixture.away_school?.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (fixture.away_school?.slug) navigate(`/school/${fixture.away_school.slug}`);
                          }}
                          className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          disabled={!fixture.away_school?.slug}
                        >
                          {(fixture.away_school?.emblem_url || fixture.away_school?.jersey_url || fixture.away_school?.icon_url) ? (
                            <img 
                              src={fixture.away_school?.emblem_url || fixture.away_school?.jersey_url || fixture.away_school?.icon_url} 
                              alt={fixture.away_school.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <span className="text-xs font-bold">
                              {fixture.away_school?.name.substring(0, 3)}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Community - Top Users */}
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

        {/* Rivalry Match Highlight */}
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
                          {derbyMatch.home_school?.icon_url && (
                            <img src={derbyMatch.home_school.icon_url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-sm">{derbyMatch.home_school?.name}</span>
                      </div>
                      <Flame className="w-6 h-6 text-destructive animate-pulse" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{derbyMatch.away_school?.name}</span>
                        <div className="w-10 h-10 rounded-full bg-background/60 flex items-center justify-center border-2 border-primary overflow-hidden p-1">
                          {derbyMatch.away_school?.icon_url && (
                            <img src={derbyMatch.away_school.icon_url} alt="" className="w-full h-full object-contain" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {new Date(derbyMatch.match_date).toLocaleDateString('en-ZA', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{derbyMatch.venue_legacy || "TBD"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Main Rival Info (when no upcoming derby) */}
        {school.main_rival && !upcomingFixtures.some(f => isDerby(f)) && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-destructive" />
                Historic Rivalry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm">
                The historic rivalry with <span className="font-bold text-destructive">{school.main_rival}</span> fuels 
                the most anticipated matches of the season. Derby fixtures are must-watch events!
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
