import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, Monitor, LogOut, User, FileText, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import trybalLogo from "@/assets/trybal-logo.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface GlobalHeaderProps {
  /** Optional content rendered below the main header row (e.g. welcome banner) */
  children?: React.ReactNode;
}

const GlobalHeader = ({ children }: GlobalHeaderProps) => {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  const navTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
        <button onClick={() => navigate("/home")} className="shrink-0">
          <img src={trybalLogo} alt="Trybal" className="h-9" />
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle className="text-left text-base">Menu</SheetTitle>
            </SheetHeader>

            <nav className="flex flex-col">
              {/* Profile */}
              <button
                onClick={() => navTo("/profile")}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                My Profile
              </button>

              <Separator />

              {/* Appearance */}
              <div className="px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</p>
                <div className="flex gap-1">
                  {([
                    { value: "light", icon: Sun, label: "Light" },
                    { value: "dark", icon: Moon, label: "Dark" },
                    { value: "system", icon: Monitor, label: "System" },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-2 rounded-md text-xs transition-colors",
                        theme === value
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Legal */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Legal</p>
              </div>
              <button
                onClick={() => navTo("/privacy-policy")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                Privacy Policy
              </button>
              <button
                onClick={() => navTo("/terms")}
                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Terms of Use
              </button>

              <Separator />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      {children}
    </header>
  );
};

export default GlobalHeader;