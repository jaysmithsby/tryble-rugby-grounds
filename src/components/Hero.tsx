import { Button } from "@/components/ui/button";
import { Apple, PlayCircle } from "lucide-react";
import heroImage from "@/assets/hero-stadium.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
          <Button size="lg" className="text-lg px-8 py-6 shadow-glow hover:shadow-glow hover:scale-105 transition-all">
            <Apple className="mr-2 h-5 w-5" />
            Download on iOS
          </Button>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6 hover:scale-105 transition-all">
            <PlayCircle className="mr-2 h-5 w-5" />
            Get it on Android
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          No gambling. No odds. Just school spirit and friendly competition.
        </p>
      </div>
    </section>
  );
};

export default Hero;
