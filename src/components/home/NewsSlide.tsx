import { Newspaper, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";

interface NewsSlideProps {
  article: {
    id: string;
    title: string;
    summary: string | null;
    image_url: string | null;
    link_url: string | null;
  };
}

export const NewsSlide = ({ article }: NewsSlideProps) => {
  const handleClick = () => {
    if (article.link_url) {
      window.open(article.link_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card 
      className="relative overflow-hidden border-border bg-card cursor-pointer group hover:border-primary/50 transition-colors"
      onClick={handleClick}
      role={article.link_url ? "link" : undefined}
    >
      {article.image_url && (
        <div className="absolute inset-0">
          <img 
            src={article.image_url} 
            alt="" 
            className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/70" />
        </div>
      )}
      
      <div className="relative p-5 flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Newspaper className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                News
              </span>
            </div>
            {article.link_url && (
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            )}
          </div>
          <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {article.summary}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
