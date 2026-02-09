import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Headphones,
  School,
  Target,
  Trophy,
  Users,
  Shield,
  Heart,
  GraduationCap,
  BookOpen,
  Sparkles,
  ChevronRight,
  Lock,
  Eye,
  Scale,
} from "lucide-react";
import appFixtures from "@/assets/app-fixtures.jpg";
import appLeaderboard from "@/assets/app-leaderboard.jpg";

const LearnMore = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
          </button>
          <h2 className="text-2xl font-bold text-primary">Trybal</h2>
          <ThemeToggle />
        </div>
      </header>

      {/* Section 1: Podcast */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Hear the Trybal Story
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Listen to our founders explain why Trybal was built, how it works, and what makes it the safest way for students to enjoy school rugby predictions.
          </p>
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <audio
              controls
              className="w-full"
              preload="metadata"
              src="/audio/trybal-podcast.m4a"
            >
              Your browser does not support the audio element.
            </audio>
            <p className="text-sm text-muted-foreground mt-3">
              The Trybal Story — Learn everything about our mission, how the game works, and why parents and schools trust us.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: What is Trybal */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What is Trybal?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A free, youth-safe platform where school rugby fans predict match outcomes, earn points, and compete for bragging rights.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { icon: School, title: "Pick Your School", desc: "Choose your school and represent them on the national leaderboard" },
              { icon: Eye, title: "Browse Fixtures", desc: "See upcoming matches across South African school rugby" },
              { icon: Target, title: "Make Predictions", desc: "Predict winners and margins before kickoff" },
              { icon: Trophy, title: "Earn Points", desc: "Score points for correct predictions and climb the ranks" },
              { icon: Users, title: "Compete in Pools", desc: "Create private pools and challenge your friends" },
            ].map((step, i) => (
              <Card key={i} className="bg-card border-border text-center">
                <CardContent className="pt-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-3">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1 text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Why Trybal Exists */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Trybal Exists</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Born from a love of South African school rugby and a desire to bring communities together — safely.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">School Spirit First</h3>
              <p className="text-sm text-muted-foreground">
                Built around the passion, rivalries, and pride that make school rugby unique in South Africa.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Zero Gambling</h3>
              <p className="text-sm text-muted-foreground">
                No odds, no money, no betting. Just points, badges, and bragging rights among friends.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Community Over Competition</h3>
              <p className="text-sm text-muted-foreground">
                Connecting students, alumni, parents, and fans through shared love of school rugby.
              </p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-8">
            <blockquote className="text-center">
              <p className="text-lg italic mb-4 text-foreground">
                "Trybal gives our students a safe way to engage with school rugby. It's all about school spirit and healthy competition—exactly what we need."
              </p>
              <footer className="text-muted-foreground">
                — School Principal, Pilot Program Participant
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Section 4: App Preview */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See It in Action</h2>
            <p className="text-lg text-muted-foreground">
              A taste of the Trybal experience — designed for mobile, built for school rugby fans.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-4 overflow-hidden">
                <img
                  src={appFixtures}
                  alt="Trybal fixtures screen showing upcoming school rugby matches"
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              </div>
              <h3 className="font-semibold mb-1">Browse & Predict Fixtures</h3>
              <p className="text-sm text-muted-foreground">
                See upcoming matches and make your predictions before kickoff.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-4 overflow-hidden">
                <img
                  src={appLeaderboard}
                  alt="Trybal leaderboard screen showing school rankings"
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              </div>
              <h3 className="font-semibold mb-1">Track Your Rankings</h3>
              <p className="text-sm text-muted-foreground">
                Climb the leaderboard and see how your school stacks up nationally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Safe & Secure */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Safe & Secure</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Trybal is purpose-built with youth safety at its core. Here's what each audience needs to know.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Students */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">For Students</h3>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li>• Predict matches and earn points</li>
                  <li>• No money or gambling involved</li>
                  <li>• Compete with friends in private pools</li>
                  <li>• Represent your school with pride</li>
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/for-players")}
                  className="text-primary p-0 h-auto"
                >
                  Learn more for players <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Parents */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">For Parents</h3>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li>• Zero gambling — points and badges only</li>
                  <li>• Parental consent required for minors</li>
                  <li>• Age verification and data protection</li>
                  <li>• Full transparency on data usage</li>
                </ul>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/for-parents")}
                    className="text-primary p-0 h-auto justify-start"
                  >
                    Parent information <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/privacy-policy")}
                    className="text-primary p-0 h-auto justify-start"
                  >
                    Privacy policy <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Schools */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                  <Scale className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-3">For Schools</h3>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li>• IP and crest protection guaranteed</li>
                  <li>• 72-hour branding removal on request</li>
                  <li>• Full content moderation tools</li>
                  <li>• Partnership and transparency commitments</li>
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/for-schools")}
                  className="text-primary p-0 h-auto"
                >
                  School information <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 6: How Points Work */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-3xl font-bold mb-4">How Points Work</h2>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-center mb-6">
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">10</p>
                  <p className="text-xs text-muted-foreground">Correct Winner</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">+25</p>
                  <p className="text-xs text-muted-foreground">Exact Margin</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">+15</p>
                  <p className="text-xs text-muted-foreground">Within 3 Points</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">+10</p>
                  <p className="text-xs text-muted-foreground">Within 7 Points</p>
                </div>
              </div>
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/how-scoring-works")}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Full Scoring Details
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 7: CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Join the Community?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Pick your school, make your predictions, and start climbing the ranks.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6 shadow-glow hover:shadow-glow hover:scale-105 transition-all"
          >
            Get Started
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            No gambling. No odds. Just school spirit and friendly competition.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Trybal. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/privacy-policy")} className="hover:text-foreground transition-colors">Privacy Policy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LearnMore;
