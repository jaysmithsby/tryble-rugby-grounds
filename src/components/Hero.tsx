import { Button } from "@/components/ui/button";
import { Apple, PlayCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import trybalLogo from "@/assets/trybal-logo.png";
import heroImage from "@/assets/hero-stadium.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <img src={trybalLogo} alt="Trybal" className="h-10" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              onClick={() => navigate("/learn-more")}
              className="text-muted-foreground hover:text-foreground"
            >
              Learn More
            </Button>
            <Button 
              variant="default"
              onClick={() => navigate("/auth", { state: { mode: "signin" } })}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Rugby stadium"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Youth-Safe Rugby Predictions Platform
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
          Predict School Rugby.<br />
          Climb the Ranks.<br />
          Earn Bragging Rights.
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          Join a national community of school rugby fans. Predict outcomes, compete with friends, and represent your school with pride.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6 shadow-glow hover:shadow-glow hover:scale-105 transition-all"
          >
            Get Started
          </Button>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover:scale-105 transition-all opacity-60 cursor-not-allowed">
            <Apple className="mr-2 h-5 w-5" />
            Coming to iOS
          </Button>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover:scale-105 transition-all opacity-60 cursor-not-allowed">
            <PlayCircle className="mr-2 h-5 w-5" />
            Coming to Android
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          No gambling. No odds. Just school spirit and friendly competition.
        </p>
      </div>
    </div>
    </section>
  );
};

export default Hero;
