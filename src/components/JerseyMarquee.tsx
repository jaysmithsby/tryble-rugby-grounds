import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SchoolJerseyImage } from "@/components/ui/SchoolJerseyImage";
import { CACHE_TIMES } from "@/lib/queryConfig";

interface MarqueeSchool {
  id: string;
  name: string;
  nickname: string | null;
  jersey_url: string | null;
}

/**
 * Returns the display name for a school in the marquee.
 * Edit this single line to change priority (e.g. swap to `school.name || school.nickname`).
 */
const getDisplayName = (school: MarqueeSchool): string =>
  school.nickname || school.name;

const JerseyMarquee = () => {
  const { data: schools = [] } = useQuery<MarqueeSchool[]>({
    queryKey: ["jersey-marquee-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, nickname, jersey_url")
        .eq("is_archived", false)
        .not("jersey_url", "is", null)
        .order("name");

      if (error) throw error;
      return (data || []) as MarqueeSchool[];
    },
    staleTime: CACHE_TIMES.STATIC,
  });

  if (schools.length === 0) return null;

  // Scale duration so speed feels consistent regardless of count
  const duration = Math.max(schools.length * 4, 20);

  return (
    <section className="py-10 overflow-hidden bg-gradient-to-b from-secondary/20 to-background">
      <div
        className="flex w-max gap-10"
        style={{
          animation: `marquee ${duration}s linear infinite`,
        }}
      >
        {/* Render list twice for seamless loop */}
        {[...schools, ...schools].map((school, i) => (
          <div
            key={`${school.id}-${i}`}
            className="flex flex-col items-center gap-2 min-w-[6rem]"
          >
            <div className="rounded-full ring-2 ring-border shadow-sm">
              <SchoolJerseyImage
                src={school.jersey_url}
                alt={getDisplayName(school)}
                fallbackText={getDisplayName(school)}
                size="lg"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium text-center leading-tight max-w-[5.5rem] truncate">
              {getDisplayName(school)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default JerseyMarquee;
