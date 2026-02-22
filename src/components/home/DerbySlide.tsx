import { useState, useEffect } from "react";
import { Clock, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { JerseyFallbackIcon } from "@/components/ui/JerseyFallbackIcon";

interface DerbySlideProps {
  derby: {
    id: string;
    school_a: { name: string; slug: string; icon_url: string | null };
    school_b: { name: string; slug: string; icon_url: string | null };
    match_date: string;
    venue_type?: string | null;
    venue_id?: string | null;
  };
}

export const DerbySlide = ({ derby }: DerbySlideProps) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const matchDate = new Date(derby.match_date);
      const now = new Date();
      
      if (matchDate <= now) {
        return { days: 0, hours: 0, minutes: 0 };
      }

      const days = differenceInDays(matchDate, now);
      const hours = differenceInHours(matchDate, now) % 24;
      const minutes = differenceInMinutes(matchDate, now) % 60;
      
      return { days, hours, minutes };
    };

    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, [derby.match_date]);

  const getShortName = (name: string) => {
    const words = name.split(" ");
    if (words.length === 1) return name.slice(0, 10);
    return words[0].slice(0, 8);
  };

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/20 via-card to-card shadow-glow">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800')] bg-cover bg-center opacity-10" />
      
      <div className="relative p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-destructive" />
            <span className="text-xs font-bold text-accent uppercase tracking-wider">
              Derby Week
            </span>
            <span className="text-xs text-muted-foreground ml-1">Pride on the line.</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium">
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <button 
            onClick={() => navigate(`/school/${derby.school_a.slug}`)}
            className="flex flex-col items-center gap-2 flex-1 group"
          >
            <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-primary/30 overflow-hidden group-hover:border-primary transition-colors">
              {derby.school_a.icon_url ? (
                <img 
                  src={derby.school_a.icon_url} 
                  alt={derby.school_a.name}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <JerseyFallbackIcon size="md" className="text-primary" />
              )}
            </div>
            <span className="text-sm font-bold text-center line-clamp-1">
              {getShortName(derby.school_a.name)}
            </span>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-3xl font-black text-primary">VS</span>
          </div>

          <button 
            onClick={() => navigate(`/school/${derby.school_b.slug}`)}
            className="flex flex-col items-center gap-2 flex-1 group"
          >
            <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border-2 border-accent/30 overflow-hidden group-hover:border-accent transition-colors">
              {derby.school_b.icon_url ? (
                <img 
                  src={derby.school_b.icon_url} 
                  alt={derby.school_b.name}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <JerseyFallbackIcon size="md" className="text-accent" />
              )}
            </div>
            <span className="text-sm font-bold text-center line-clamp-1">
              {getShortName(derby.school_b.name)}
            </span>
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {new Date(derby.match_date).toLocaleDateString("en-ZA", {
              weekday: "long",
              hour: "2-digit",
              minute: "2-digit",
            })} @ {(() => {
              if (derby.venue_type === 'school' && derby.venue_id) {
                if (derby.school_a && (derby.venue_id as any) === (derby.school_a as any).id) return derby.school_a.name;
                if (derby.school_b && (derby.venue_id as any) === (derby.school_b as any).id) return derby.school_b.name;
              }
              return "TBD";
            })()}
          </p>
        </div>
      </div>
    </Card>
  );
};
