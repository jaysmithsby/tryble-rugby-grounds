import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const CONSENT_KEY = "trybal_cookie_consent";
const CONSENT_VERSION = "1"; // Increment when policy changes

type ConsentChoice = "accepted" | "declined" | null;

interface StoredConsent {
  choice: ConsentChoice;
  version: string;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if consent has been given for the current version
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed: StoredConsent = JSON.parse(stored);
        // Show banner if version changed
        if (parsed.version !== CONSENT_VERSION) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    } else {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "declined") => {
    const consent: StoredConsent = {
      choice,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    
    // Animate out
    setIsClosing(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 ${
        isClosing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-4 shadow-lg md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">We value your privacy</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We use essential cookies to make Trybal work. We'd also like to use analytics 
                cookies to understand how you use our app and improve it. 
                <Link to="/privacy" className="ml-1 text-primary hover:underline">
                  Learn more
                </Link>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConsent("declined")}
              className="flex-1 md:flex-none"
            >
              Essential only
            </Button>
            <Button
              size="sm"
              onClick={() => handleConsent("accepted")}
              className="flex-1 md:flex-none"
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to check consent status
export function getCookieConsent(): ConsentChoice {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return null;
  
  try {
    const parsed: StoredConsent = JSON.parse(stored);
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed.choice;
  } catch {
    return null;
  }
}

// Utility to check if analytics are allowed
export function isAnalyticsAllowed(): boolean {
  return getCookieConsent() === "accepted";
}
