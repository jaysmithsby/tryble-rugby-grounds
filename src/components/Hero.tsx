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
          The Digital Home of Schoolboy Rugby
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
          Your Tribe. Your Rugby.
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed">
          South Africa's home of schoolboy rugby. Follow your school. Track every First XV fixture. Predict the results. Settle the debate.
        </p>

        <p className="text-base text-muted-foreground/70 mb-12 max-w-2xl mx-auto">
          No betting. No gambling. Just pure schoolboy rugby.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            onClick={() => navigate("/auth")}
            className="text-lg px-8 py-6 shadow-glow hover:shadow-glow hover:scale-105 transition-all"
          >
            Join the Tribe
          </Button>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover:scale-105 transition-all opacity-60 cursor-not-allowed">
            <Apple className="mr-2 h-5 w-5" />
            Free on iOS
          </Button>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover:scale-105 transition-all opacity-60 cursor-not-allowed">
            <PlayCircle className="mr-2 h-5 w-5" />
            Free on Android
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground/70">
          Free to download. No betting. No gambling. Just pure schoolboy rugby.
        </p>
      </div>
    </div>
    </section>
  );
};

export default Hero;
