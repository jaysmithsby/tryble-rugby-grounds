import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface AdSlideProps {
  ad: {
    id: string;
    campaign_name: string;
    sponsor_name: string;
    image_url: string;
    link_url: string;
  };
}

export const AdSlide = ({ ad }: AdSlideProps) => {
  const handleClick = async () => {
    // Track click
    await supabase.rpc("increment_ad_click", { ad_id: ad.id });
    
    // Open link
    window.open(ad.link_url, "_blank", "noopener,noreferrer");
  };

  return (
    <Card 
      className="relative overflow-hidden border-border bg-card cursor-pointer group hover:border-primary/30 transition-colors"
      onClick={handleClick}
      role="link"
    >
      <div className="relative h-36">
        <img 
          src={ad.image_url} 
          alt={ad.campaign_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Sponsored label */}
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Sponsored
        </div>
        
        {/* Sponsor name */}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs text-muted-foreground mb-0.5">Presented by</p>
          <p className="font-bold text-sm text-foreground">{ad.sponsor_name}</p>
        </div>
      </div>
    </Card>
  );
};
