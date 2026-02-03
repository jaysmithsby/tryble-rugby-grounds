import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Mail } from "lucide-react";
import trybalLogo from "@/assets/trybal-logo.png";
import { useState } from "react";
import { toast } from "sonner";
import HoldingFooter from "@/components/holding/HoldingFooter";
import { supabase } from "@/integrations/supabase/client";

const HoldingPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBetaSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke("beta-signup", {
        body: { email },
      });

      if (error) throw error;

      toast.success("🏉 TRY! You're on the team! We'll be in touch before kickoff.", {
        duration: 5000,
        description: "Welcome to the Trybal community!",
      });
      setEmail("");
    } catch (error) {
      console.error("Beta signup error:", error);
      toast.error("Knock-on! Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      {/* Header */}
      <header className="w-full border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={trybalLogo} alt="Trybal" className="h-16" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo/Crest */}
          <div className="flex justify-center mb-6">
            <img src={trybalLogo} alt="Trybal" className="h-36 md:h-44 object-contain" />
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white font-montserrat leading-tight">
            Trybal — The ultimate platform for South African schoolboy rugby.
            <span className="block mt-2 text-[#FFD60A]">Coming March 2026</span>
          </h1>

          {/* Tagline */}
          <p className="text-lg md:text-xl text-[#FFD60A] font-inter">
            "Where School Pride Meets Predictions"
          </p>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Button
              size="lg"
              onClick={() => navigate("/for-schools")}
              className="w-full sm:w-auto min-w-[200px] h-14 text-lg font-semibold rounded-2xl bg-[#FFD60A] text-[#1B4332] hover:bg-[#FFD60A]/90 transition-all hover:scale-105"
            >
              For Schools
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/for-parents")}
              className="w-full sm:w-auto min-w-[200px] h-14 text-lg font-semibold rounded-2xl bg-white text-[#1B4332] hover:bg-white/90 transition-all hover:scale-105"
            >
              For Parents
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/for-players")}
              className="w-full sm:w-auto min-w-[200px] h-14 text-lg font-semibold rounded-2xl bg-transparent border-2 border-white text-white hover:bg-white/10 transition-all hover:scale-105"
            >
              For Players
            </Button>
          </div>

          {/* Beta Signup */}
          <div className="pt-12 max-w-md mx-auto">
            <h3 className="text-white font-semibold mb-4 font-montserrat">
              Join our Beta Community
            </h3>
            <form onSubmit={handleBetaSignup} className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[#FFD60A] focus:ring-[#FFD60A]"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-6 bg-[#FFD60A] text-[#1B4332] hover:bg-[#FFD60A]/90 font-semibold"
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSubmitting ? "..." : "Join"}
              </Button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <HoldingFooter />
    </div>
  );
};

export default HoldingPage;
