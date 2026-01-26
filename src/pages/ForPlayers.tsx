import { Target, Trophy, Zap, Users } from "lucide-react";
import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const ForPlayers = () => {
  const sections = [
    {
      icon: Target,
      title: "Pick, Predict, Prove",
      points: [
        "Guess who wins and by how much.",
        "Score points for correct picks and margins.",
        "The closer your prediction, the more points you earn.",
        "Compete every weekend during rugby season.",
      ],
    },
    {
      icon: Trophy,
      title: "School Pride Leaderboards",
      points: [
        "Climb up national and regional leaderboards.",
        "Compete against rivals and win digital badges.",
        "Represent your school with pride.",
        "See how your school stacks up against others.",
      ],
    },
    {
      icon: Zap,
      title: "More Than a Game",
      points: [
        "Play trivia, follow school rugby news, track performance.",
        "Stay connected all year round—even off-season.",
        "Collect badges and achievements.",
        "Challenge your mates in private pools.",
      ],
    },
    {
      icon: Users,
      title: "Join Your Tryble",
      points: [
        "Create or join custom prediction pools with friends.",
        "Invite your classmates with a simple code.",
        "Track who's the best predictor in your group.",
        "Bragging rights for the top dogs.",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-3xl md:text-5xl font-bold text-white font-montserrat mb-6">
              Get Ready to Represent Your School Like Never Before!
            </h1>
            <p className="text-lg text-[#FFD60A] max-w-2xl mx-auto font-semibold">
              Pick. Predict. Prove. 🏉
            </p>
          </div>

          {/* Sections */}
          <div className="grid gap-8 md:gap-12">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FFD60A]/20 flex items-center justify-center flex-shrink-0">
                    <section.icon className="h-6 w-6 text-[#FFD60A]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-white font-montserrat mb-4">
                      {section.title}
                    </h2>
                    <ul className="space-y-3">
                      {section.points.map((point, pointIndex) => (
                        <li
                          key={pointIndex}
                          className="flex items-start gap-3 text-white/80"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD60A] mt-2 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hype CTA */}
          <div className="text-center mt-16 bg-gradient-to-r from-[#FFD60A]/20 to-[#FFD60A]/5 rounded-2xl p-8 border border-[#FFD60A]/30">
            <h3 className="text-2xl font-bold text-white font-montserrat mb-4">
              Ready to prove you're the real rugby brain?
            </h3>
            <p className="text-white/70 mb-6">
              Tryble launches March 2026. Be one of the first to join!
            </p>
            <div className="inline-flex items-center gap-2 bg-transparent border-2 border-[#FFD60A] text-[#FFD60A] px-8 py-4 rounded-2xl font-semibold">
              Coming Soon 🚀
            </div>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default ForPlayers;
