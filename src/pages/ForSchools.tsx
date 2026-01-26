import { Shield, Eye, Settings, CheckCircle } from "lucide-react";
import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const ForSchools = () => {
  const sections = [
    {
      icon: Shield,
      title: "Child Protection First",
      points: [
        "No private messages, no group chats, no open comment fields.",
        "Built-in protections against bullying and grooming.",
        "Age-appropriate content moderation at all times.",
        "Transparent reporting and escalation procedures.",
      ],
    },
    {
      icon: CheckCircle,
      title: "Crest Control and IP Respect",
      points: [
        "All visual branding used with written permission.",
        "Removal requests honored within 72 hours, no questions asked.",
        "Schools retain full ownership of their intellectual property.",
        "Regular audits to ensure compliance.",
      ],
    },
    {
      icon: Settings,
      title: "Moderation by Design",
      points: [
        "Smart detection of harmful language using AI filters.",
        "Admin dashboards to review all user activity logs.",
        "Real-time alerts for suspicious behaviour.",
        "Dedicated support channel for school administrators.",
      ],
    },
    {
      icon: Eye,
      title: "Full Transparency",
      points: [
        "Schools can request data reports at any time.",
        "Clear communication about platform updates.",
        "Regular consultations with school leadership.",
        "Open feedback channels for continuous improvement.",
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
              Partnering With Schools for a Safe, Proud Rugby Community
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Tryble is built with schools in mind. We prioritize safety, respect intellectual property,
              and provide tools for complete oversight.
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
              Interested in partnering with Tryble?
            </p>
            <a
              href="mailto:schools@trybal.app"
              className="inline-flex items-center gap-2 bg-[#FFD60A] text-[#1B4332] px-8 py-4 rounded-2xl font-semibold hover:bg-[#FFD60A]/90 transition-all hover:scale-105"
            >
              Contact Our Schools Team
            </a>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default ForSchools;
