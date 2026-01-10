import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Trophy, 
  Target, 
  Flame,
  Settings,
  LogOut,
  Shield,
  Flag,
  Users,
  Bell,
  School,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { allBadges } from "@/data/badgesData";
import { ScoreSubmission } from "@/components/scores/ScoreSubmission";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ProfileData {
  firstName: string;
  schoolName: string;
  contactMethod: string;
  userType: string;
}


const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  // Mock data - replace with real data from backend
  const stats = {
    seasonPoints: 1450,
    accuracy: 63,
    currentStreak: 3
  };


  const pools = [
    { id: "1", name: "Michaelhouse vs Grey" },
    { id: "2", name: "Top Schools SA" },
    { id: "3", name: "KZN Region" },
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, school_name, contact_method, user_type")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile({
        firstName: data.first_name,
        schoolName: data.school_name,
        contactMethod: data.contact_method,
        userType: data.user_type
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getSchoolCode = (schoolName: string) => {
    const words = schoolName.split(" ");
    if (words.length === 1) return schoolName.substring(0, 3).toUpperCase();
    return words.map(w => w[0]).join("").toUpperCase();
  };

  const getDisplayName = () => {
    if (!profile) return "";
    const lastInitial = profile.firstName.length > 1 ? profile.firstName[profile.firstName.length - 1].toUpperCase() : "";
    const schoolCode = getSchoolCode(profile.schoolName);
    return `${profile.firstName} ${lastInitial}. — ${schoolCode}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Tryble</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={() => navigate("/home")}>
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Identity Block */}
        <Card className="mb-6 bg-gradient-card border-border/40">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-4">
                <Shield className="w-12 h-12 text-primary" />
              </div>

              {/* Display Name */}
              <h1 className="text-2xl font-bold mb-2">{getDisplayName()}</h1>
              
              {/* School */}
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <School className="w-4 h-4" />
                <span>{profile?.schoolName}</span>
              </div>

              {/* User Type Badge */}
              <Badge variant="secondary" className="mb-2">
                {profile?.userType}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Widget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-card border-border/40">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.seasonPoints}</div>
                  <div className="text-sm text-muted-foreground">Season Points</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/40">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.accuracy}%</div>
                  <div className="text-sm text-muted-foreground">Accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/40">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.currentStreak}</div>
                  <div className="text-sm text-muted-foreground">Win Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score Submission Section */}
        <ScoreSubmission />

        {/* Achievements Section */}
        <Card className="mb-6 bg-gradient-card border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🏅 Your Badges
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/badges")}
              className="text-primary hover:text-primary/80"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allBadges.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  onClick={() => navigate("/badges")}
                  className={`relative p-4 rounded-lg border transition-all duration-300 hover:scale-105 cursor-pointer ${
                    badge.earned
                      ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                      : "bg-muted/5 border-muted/20 hover:bg-muted/10"
                  }`}
                >
                  <div className={`flex flex-col items-center text-center ${!badge.earned ? "opacity-40" : ""}`}>
                    <div className={`text-4xl mb-2 ${badge.earned ? "animate-fade-in" : ""}`}>
                      {badge.icon}
                    </div>
                    <div className="font-semibold text-sm mb-1 line-clamp-2">
                      {badge.name}
                    </div>
                    <div className="text-xs text-primary font-medium">
                      {badge.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Groups & Pools */}
        <Card className="mb-6 bg-gradient-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Your Pools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pools.map((pool) => (
                <button
                  key={pool.id}
                  onClick={() => toast({ title: "Pool clicked", description: pool.name })}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="font-medium">{pool.name}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Settings & Account Controls */}
        <Card className="mb-6 bg-gradient-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change School */}
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <School className="w-5 h-5 text-muted-foreground" />
                <span>Change School</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Notification Preferences */}
            <div className="space-y-3 p-3 rounded-lg bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="notifications">Push Notifications</Label>
                </div>
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="email-updates">Email Updates</Label>
                </div>
                <Switch
                  id="email-updates"
                  checked={emailUpdates}
                  onCheckedChange={setEmailUpdates}
                />
              </div>
            </div>

            {/* Parental Consent Status */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span className="font-medium">Parental Consent: Verified</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your account is protected under POPIA. Certain features are restricted for your safety.
              </p>
            </div>

            {/* Log Out */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>

        {/* Report & Safety */}
        <Card className="bg-gradient-card border-border/40">
          <CardContent className="pt-6 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toast({ title: "Report", description: "Opening report form..." })}
            >
              <Flag className="w-4 h-4 mr-2" />
              🔔 Report a Problem
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => toast({ title: "Family Dashboard", description: "Opening parent view..." })}
            >
              <Shield className="w-4 h-4 mr-2" />
              📊 Family Dashboard (For Parents)
            </Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/10 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Your safety is our priority. All activity is monitored and profiles are moderated.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Profile;
