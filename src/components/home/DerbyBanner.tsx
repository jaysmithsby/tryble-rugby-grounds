import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

export const DerbyBanner = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 32,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59 };
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card shadow-glow">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800')] bg-cover bg-center opacity-10" />
      
      <div className="relative p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">
            This Week's Derby
          </span>
          <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-primary/30">
              <span className="text-2xl font-bold text-primary">SM</span>
            </div>
            <span className="text-sm font-bold text-center">St. Michael's</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-4xl font-black text-primary">VS</span>
          </div>

          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-accent/30">
              <span className="text-2xl font-bold text-accent">CW</span>
            </div>
            <span className="text-sm font-bold text-center">Clongowes</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Saturday, 15:00 @ Donnybrook</p>
        </div>
      </div>
    </Card>
  );
};
