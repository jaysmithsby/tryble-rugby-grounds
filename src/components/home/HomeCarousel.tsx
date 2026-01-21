import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveDate } from "@/hooks/useEffectiveDate";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { DerbySlide } from "./DerbySlide";
import { NudgeSlide } from "./NudgeSlide";
import { NewsSlide } from "./NewsSlide";
import { AdSlide } from "./AdSlide";
import { cn } from "@/lib/utils";

interface Derby {
  id: string;
  home_school: { name: string; slug: string; icon_url: string | null };
  away_school: { name: string; slug: string; icon_url: string | null };
  match_date: string;
  venue: string;
}

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  link_url: string | null;
}

interface Advertisement {
  id: string;
  campaign_name: string;
  sponsor_name: string;
  image_url: string;
  link_url: string;
}

interface HomeCarouselProps {
  unpickedFixturesCount?: number;
  onPredictionNudgeClick?: () => void;
}

export const HomeCarousel = ({ 
  unpickedFixturesCount = 0, 
  onPredictionNudgeClick 
}: HomeCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [derbies, setDerbies] = useState<Derby[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { weekendRange } = useEffectiveDate();
  const { start, end } = weekendRange;

  const fetchCarouselData = useCallback(async () => {
    setLoading(true);
    
    const now = new Date().toISOString();
    
    // Fetch all data in parallel
    const [derbiesRes, newsRes, adsRes] = await Promise.all([
      // Fetch derbies for this weekend
      supabase
        .from("fixtures")
        .select(`
          id,
          match_date,
          venue,
          home_school:schools!fixtures_home_school_id_fkey(name, slug, icon_url),
          away_school:schools!fixtures_away_school_id_fkey(name, slug, icon_url)
        `)
        .eq("is_derby", true)
        .eq("status", "upcoming")
        .gte("match_date", start.toISOString())
        .lte("match_date", end.toISOString())
        .order("match_date", { ascending: true })
        .limit(5),
      
      // Fetch active news articles
      supabase
        .from("news_articles")
        .select("id, title, summary, image_url, link_url")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order("display_order", { ascending: true })
        .limit(5),
      
      // Fetch active advertisements
      supabase
        .from("advertisements")
        .select("id, campaign_name, sponsor_name, image_url, link_url")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order("display_order", { ascending: true })
        .limit(5),
    ]);

    if (derbiesRes.data) {
      setDerbies(derbiesRes.data as unknown as Derby[]);
    }
    
    if (newsRes.data) {
      setNews(newsRes.data as NewsArticle[]);
    }
    
    if (adsRes.data) {
      setAds(adsRes.data as Advertisement[]);
      
      // Track impressions for visible ads
      adsRes.data.forEach((ad) => {
        supabase.rpc("increment_ad_impression", { ad_id: ad.id });
      });
    }
    
    setLoading(false);
  }, [start, end]);

  useEffect(() => {
    fetchCarouselData();
  }, [fetchCarouselData]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!api || count <= 1) return;
    
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [api, count]);

  // Calculate total slides
  const hasNudge = unpickedFixturesCount > 0;
  const totalSlides = derbies.length + (hasNudge ? 1 : 0) + news.length + ads.length;

  if (loading) {
    return (
      <div className="h-48 rounded-xl bg-card animate-pulse" />
    );
  }

  if (totalSlides === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {/* Derby slides */}
          {derbies.map((derby) => (
            <CarouselItem key={`derby-${derby.id}`}>
              <DerbySlide derby={derby} />
            </CarouselItem>
          ))}
          
          {/* Prediction nudge slide */}
          {hasNudge && (
            <CarouselItem key="nudge">
              <NudgeSlide 
                unpickedCount={unpickedFixturesCount} 
                onClick={onPredictionNudgeClick} 
              />
            </CarouselItem>
          )}
          
          {/* News slides */}
          {news.map((article) => (
            <CarouselItem key={`news-${article.id}`}>
              <NewsSlide article={article} />
            </CarouselItem>
          ))}
          
          {/* Ad slides */}
          {ads.map((ad) => (
            <CarouselItem key={`ad-${ad.id}`}>
              <AdSlide ad={ad} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: count }).map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                current === index 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
