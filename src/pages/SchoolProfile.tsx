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
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [school, setSchool] = useState<any>(null);
  const [upcomingFixtures, setUpcomingFixtures] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchoolData();
  }, [schoolId]);

  const loadSchoolData = async () => {
    if (!schoolId) return;
    
    setLoading(true);
    try {
      // Load school details
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (schoolError) throw schoolError;
      setSchool(schoolData);

      // Load upcoming fixtures
      const { data: upcomingData } = await supabase
        .from("fixtures")
        .select(`
          *,
          home_school:schools!fixtures_home_school_id_fkey(id, name, icon_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, icon_url)
        `)
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .eq("status", "upcoming")
        .order("match_date", { ascending: true })
        .limit(5);

      setUpcomingFixtures(upcomingData || []);

      // Load recent results
      const { data: resultsData } = await supabase
        .from("fixtures")
        .select(`
          *,
          home_school:schools!fixtures_home_school_id_fkey(id, name, icon_url),
          away_school:schools!fixtures_away_school_id_fkey(id, name, icon_url)
        `)
        .or(`home_school_id.eq.${schoolId},away_school_id.eq.${schoolId}`)
        .eq("status", "completed")
        .order("match_date", { ascending: false })
        .limit(5);

      setRecentResults(resultsData || []);

      // Load top users from this school (mock for now)
      const mockTopUsers = [
        { rank: 1, name: "James S", points: 245 },
        { rank: 2, name: "Sarah M", points: 238 },
        { rank: 3, name: "Thabo K", points: 234 },
        { rank: 4, name: "Emma L", points: 228 },
        { rank: 5, name: "Mike R", points: 221 },
      ];
      setTopUsers(mockTopUsers);

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
      <div className="relative h-64 bg-gradient-to-br from-primary/20 via-accent/10 to-background border-b border-border/40 overflow-hidden">
        {/* Rugby field pattern background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 20px,
            hsl(var(--primary)) 20px,
            hsl(var(--primary)) 22px
          )`
        }}></div>
        
        <div className="container mx-auto px-4 h-full flex flex-col items-center justify-center relative z-10">
          {/* Large School Crest */}
          <div className="w-32 h-32 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center border-4 border-primary shadow-glow overflow-hidden p-4 mb-4">
            {school.icon_url ? (
              <img 
                src={school.icon_url} 
                alt={`${school.name} crest`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-4xl font-bold text-primary">
                {school.name.substring(0, 3).toUpperCase()}
              </span>
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2">{school.name}</h1>
          {school.motto && (
            <p className="text-sm text-muted-foreground italic">"{school.motto}"</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Facts Chips */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {school.established_year && (
                <Badge variant="outline" className="h-10 px-4 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Founded {school.established_year}
                </Badge>
              )}
              {school.province && (
                <Badge variant="outline" className="h-10 px-4 text-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  {school.province}
                </Badge>
              )}
              {school.springboks_count !== null && (
                <Badge variant="outline" className="h-10 px-4 text-sm">
                  <Trophy className="w-4 h-4 mr-2" />
                  {school.springboks_count} Springboks
                </Badge>
              )}
            </div>
            
            {school.trivia_fact && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/40">
                <p className="text-sm text-center">
                  <span className="font-bold text-primary">Did you know?</span> {school.trivia_fact}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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
                        <div className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden">
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
                        </div>
                        <span className="text-sm font-medium">{fixture.home_school?.name}</span>
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">VS</span>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium">{fixture.away_school?.name}</span>
                        <div className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden">
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
                        </div>
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
                        <div className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden">
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
                        </div>
                        <span className="text-sm font-medium">{fixture.home_school?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{fixture.home_score ?? 0}</span>
                        <span className="text-sm text-muted-foreground">-</span>
                        <span className="text-lg font-bold">{fixture.away_score ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-sm font-medium">{fixture.away_school?.name}</span>
                        <div className="w-8 h-8 rounded-full bg-background/60 flex items-center justify-center border border-border overflow-hidden">
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
                        </div>
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

        {/* Main Rival Info */}
        {school.main_rival && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-destructive" />
                Main Rivalry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-sm">
                The historic rivalry with <span className="font-bold">{school.main_rival}</span> fuels 
                the most anticipated matches of the season. These derby fixtures are must-watch events!
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
