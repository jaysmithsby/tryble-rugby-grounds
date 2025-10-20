import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Lightbulb, Newspaper } from "lucide-react";

const triviaItems = [
  {
    type: "trivia",
    content: "Which Irish school has won the most Leinster Senior Cups?",
    answer: "Blackrock College (71 titles)",
  },
  {
    type: "news",
    content: "Schools Cup Final Set for Donnybrook",
    description: "The highly anticipated derby match will kick off at 3 PM this Saturday.",
  },
  {
    type: "trivia",
    content: "What year was the first Leinster Schools Senior Cup held?",
    answer: "1887",
  },
  {
    type: "news",
    content: "Record Crowd Expected at RDS",
    description: "Over 8,000 fans are expected to attend this weekend's semi-final clash.",
  },
];

export const TriviaCarousel = () => {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold px-4">Rugby Insights</h2>
      <Carousel className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {triviaItems.map((item, index) => (
            <CarouselItem key={index} className="pl-2 md:pl-4 basis-[85%] md:basis-1/2">
              <Card className="bg-gradient-card border-border/40 shadow-card h-full">
                <div className="p-4 space-y-3 h-full flex flex-col">
                  <div className="flex items-center gap-2">
                    {item.type === "trivia" ? (
                      <>
                        <Lightbulb className="w-4 h-4 text-accent" />
                        <span className="text-xs font-semibold text-accent uppercase">Trivia</span>
                      </>
                    ) : (
                      <>
                        <Newspaper className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase">News</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">{item.content}</p>
                    {item.type === "trivia" && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Answer:</span> {item.answer}
                      </p>
                    )}
                    {item.type === "news" && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-0 -translate-x-1/2" />
        <CarouselNext className="right-0 translate-x-1/2" />
      </Carousel>
    </div>
  );
};
