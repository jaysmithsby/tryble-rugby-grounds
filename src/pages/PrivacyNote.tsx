import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";
import { Shield, Lock, Eye, Heart } from "lucide-react";

const PrivacyNote = () => {
  const points = [
    {
      icon: Shield,
      title: "We keep you safe",
      description: "No strangers can message you. No bad words allowed. Adults watch out for you.",
    },
    {
      icon: Lock,
      title: "Your info stays private",
      description: "We only know your first name, your age group, and your school. That's it!",
    },
    {
      icon: Eye,
      title: "Your parents know",
      description: "If you're under 18, your parent or guardian gave permission for you to use Tryble.",
    },
    {
      icon: Heart,
      title: "It's just for fun",
      description: "No money, no prizes. Just bragging rights and school pride!",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-4">
            How We Keep You Safe 🛡️
          </h1>
          <p className="text-lg text-[#FFD60A] mb-12">
            A simple guide for young rugby fans
          </p>

          <div className="grid gap-6">
            {points.map((point, index) => (
              <div
                key={index}
                className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FFD60A]/20 flex items-center justify-center flex-shrink-0">
                    <point.icon className="h-6 w-6 text-[#FFD60A]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white font-montserrat mb-2">
                      {point.title}
                    </h2>
                    <p className="text-white/70 text-lg">
                      {point.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-[#FFD60A]/10 rounded-2xl p-6 border border-[#FFD60A]/30">
            <p className="text-white text-lg">
              <strong>Got questions?</strong> Ask your parent or guardian, or they can email us at{" "}
              <a href="mailto:safety@trybal.app" className="text-[#FFD60A] hover:underline">
                safety@trybal.app
              </a>
            </p>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default PrivacyNote;
