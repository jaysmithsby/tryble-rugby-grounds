import { Link } from "react-router-dom";
import { Shield, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

interface HoldingHeaderProps {
  showBackButton?: boolean;
}

const HoldingHeader = ({ showBackButton = false }: HoldingHeaderProps) => {
  return (
    <header className="w-full border-b border-white/10 bg-[#1B4332] dark:bg-[#0d2118]">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-white hover:text-[#FFD60A] hover:bg-white/10"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          )}
          {!showBackButton && (
            <Link to="/" className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-[#FFD60A]" />
              <span className="text-2xl font-bold text-white font-montserrat">Tryble</span>
            </Link>
          )}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
};

export default HoldingHeader;
