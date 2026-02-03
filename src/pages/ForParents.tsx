import { Lock, UserCheck, Trophy, Heart } from "lucide-react";
import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const ForParents = () => {
  const sections = [
    {
      icon: Lock,
      title: "Privacy Built-In",
      points: [
        "POPIA-compliant: Only collects first name, age band, and school.",
        "No ads targeting children, no selling of user data.",
        "Data encrypted at rest and in transit.",
        "Minimal data collection by design.",
      ],
    },
    {
      icon: UserCheck,
      title: "Parental Consent Required",
      points: [
        "All under-18s go through email-based parent verification.",
        "Parents stay in control of participation.",
        "Easy opt-out process at any time.",
        "Clear notifications about account activity.",
      ],
    },
    {
      icon: Trophy,
      title: "Safe, Skill-Based Competition",
      points: [
        "No gambling, no prizes, no fees.",
        "It's for bragging rights and school pride only.",
        "Healthy competition that builds critical thinking.",
        "Focus on sportsmanship and fair play.",
      ],
    },
    {
      icon: Heart,
      title: "Wellbeing First",
      points: [
        "No addictive mechanics or endless scrolling.",
        "Encourages real-world engagement with school sport.",
        "Positive community guidelines enforced strictly.",
        "Resources for parents on digital wellness.",
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
              Trybal Is a Safe Space for Your Child to Compete and Connect
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              We've built Trybal with your child's safety and privacy as our top priority.
              No gambling, no data selling, just healthy competition.
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

          {/* CTA */}
          <div className="text-center mt-16">
            <p className="text-white/70 mb-4">
              Have questions about your child's safety?
            </p>
            <a
              href="mailto:safety@trybal.app"
              className="inline-flex items-center gap-2 bg-white text-[#1B4332] px-8 py-4 rounded-2xl font-semibold hover:bg-white/90 transition-all hover:scale-105"
            >
              Contact Our Safety Team
            </a>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default ForParents;
