import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Trophy, Flame, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  useEffect(() => {
    loadSchoolData();
  }, [schoolSlug]);

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

      // Load upcoming fixtures (status: upcoming, holding, or future dates)
      const { data: upcomingData } = await supabase
        .from("fixtures")
        .select(`
          *,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, icon_url, main_rival),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, icon_url, main_rival)
        `)
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .in("status", ["upcoming", "holding"])
        .gte("match_date", new Date().toISOString())
        .order("match_date", { ascending: true })
        .limit(5);

      setUpcomingFixtures(upcomingData || []);

      // Load recent results (completed matches or past dates with scores)
      const { data: resultsData } = await supabase
        .from("fixtures")
        .select(`
          *,
          home_school:schools!fixtures_home_school_id_fkey(id, name, slug, icon_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, slug, icon_url)
        `)
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .eq("status", "completed")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("match_date", { ascending: false })
        .limit(5);

      setRecentResults(resultsData || []);

      // Load top 5 users from this school
      const { data: topUsersData } = await supabase
        .from("user_scores")
        .select(`
          season_points,
          user_id,
          profiles!inner(display_name, first_name, school_name)
        `)
        .eq("profiles.school_name", schoolData.name)
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

      {/* Hero Section with School Crest */}
      <div className="relative h-72 overflow-hidden border-b border-border/40">
        {/* Rugby field background with dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 18px,
              hsl(var(--primary)) 18px,
              hsl(var(--primary)) 20px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 80px,
              hsl(var(--primary)) 80px,
              hsl(var(--primary)) 82px
            )`
          }}></div>
        </div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          {/* Shield-style School Crest Container */}
          <div className="relative mb-6">
            <div className="w-36 h-36 rounded-2xl bg-card/90 backdrop-blur-md flex items-center justify-center border-2 border-primary shadow-[0_0_50px_rgba(34,197,94,0.2)] overflow-hidden p-5 rotate-45 transform">
              <div className="-rotate-45 w-full h-full flex items-center justify-center">
                {school.icon_url ? (
                  <img 
                    src={school.icon_url} 
                    alt={`${school.name} crest`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-5xl font-bold text-primary">
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
            <p className="text-sm text-accent italic text-center max-w-md px-4">
              "{school.motto}"
            </p>
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
                          {fixture.home_school?.icon_url ? (
                            <img 
                              src={fixture.home_school.icon_url} 
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
                          {fixture.away_school?.icon_url ? (
                            <img 
                              src={fixture.away_school.icon_url} 
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
                      {fixture.venue}
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
                          {fixture.home_school?.icon_url ? (
                            <img 
                              src={fixture.home_school.icon_url} 
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
                          {fixture.away_school?.icon_url ? (
                            <img 
                              src={fixture.away_school.icon_url} 
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
            <CardTitle>Top Tryble Users</CardTitle>
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
                    {user.points} pts
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
                      <p className="text-xs text-muted-foreground mt-1">{derbyMatch.venue}</p>
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
