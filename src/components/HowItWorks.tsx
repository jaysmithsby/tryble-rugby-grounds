import { Target, TrendingUp, Trophy } from "lucide-react";

const steps = [
  {
    icon: Target,
    title: "Pick Your Fixtures",
    description: "Browse upcoming school rugby matches across South Africa and select the games you want to predict.",
  },
  {
    icon: TrendingUp,
    title: "Predict & Submit",
    description: "Choose the winner and score margin. The closer your prediction, the more points you earn.",
  },
  {
    icon: Trophy,
    title: "Climb the Leaderboard",
    description: "Compete globally, provincially, or by school. Earn badges and streaks for consistent predictions.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to join South Africa's biggest school rugby prediction community
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group"
            >
              <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 h-full">
                <div className="mb-6 relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-primary/20">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/5">
                  {index + 1}
                </div>

                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
