import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary mb-2">Tryble</div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Tryble</div>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content - Placeholder for now */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome to Tryble</h1>
          <p className="text-muted-foreground">
            The home screen with fixtures, predictions, and leaderboards is coming soon!
          </p>
          {user && (
            <p className="text-sm text-muted-foreground">
              Logged in as: {user.email}
            </p>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-around text-sm">
            <button onClick={() => navigate("/home")} className="text-primary font-medium">Home</button>
            <button onClick={() => navigate("/leaderboard")} className="text-muted-foreground hover:text-foreground transition-colors">Leaderboards</button>
            <button onClick={() => navigate("/profile")} className="text-muted-foreground hover:text-foreground transition-colors">Profile</button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Home;
