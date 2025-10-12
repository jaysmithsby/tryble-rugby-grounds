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
  Award,
  Settings,
  LogOut,
  Shield,
  Flag,
  Users,
  Bell,
  School,
  Lock,
  CheckCircle2,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

interface ProfileData {
  firstName: string;
  schoolName: string;
  contactMethod: string;
  userType: string;
}

interface BadgeItem {
  id: string;
  name: string;
  icon: typeof Trophy;
  earned: boolean;
  description: string;
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

  const badges: BadgeItem[] = [
    { id: "1", name: "First Win", icon: Trophy, earned: true, description: "Won your first prediction" },
    { id: "2", name: "Derby Master", icon: Target, earned: true, description: "Predicted 3 derbies correctly" },
    { id: "3", name: "Hot Streak", icon: Flame, earned: true, description: "5 correct predictions in a row" },
    { id: "4", name: "Perfect Weekend", icon: Award, earned: false, description: "All predictions correct in one round" },
    { id: "5", name: "Season Champion", icon: Trophy, earned: false, description: "Top 10 in season leaderboard" },
    { id: "6", name: "Loyal Fan", icon: Shield, earned: false, description: "Predict 20 matches" },
  ];

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
          <Button variant="ghost" onClick={() => navigate("/home")}>
            Back to Home
          </Button>
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

        {/* Achievements Section */}
        <Card className="mb-6 bg-gradient-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏅 Your Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const IconComponent = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`relative p-4 rounded-lg border ${
                      badge.earned
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/5 border-muted/20 opacity-50"
                    } transition-all hover:scale-105`}
                  >
                    {!badge.earned && (
                      <Lock className="absolute top-2 right-2 w-4 h-4 text-muted-foreground" />
                    )}
                    <IconComponent
                      className={`w-8 h-8 mb-2 ${
                        badge.earned ? "text-accent" : "text-muted-foreground"
                      }`}
                    />
                    <div className="font-medium text-sm">{badge.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {badge.description}
                    </div>
                  </div>
                );
              })}
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
