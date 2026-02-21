import { BarChart3, Users, Award, Newspaper } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Make Your Call",
    description: "Pick the winner and the margin. The closer you are, the more points you earn. No odds. No betting. Just knowledge.",
  },
  {
    icon: Users,
    title: "Compete on Every Level",
    description: "Leaderboards by school, province, and nationally. Create private pools with mates. See who really reads the game.",
  },
  {
    icon: Award,
    title: "Earn Your Stripes",
    description: "Unlock badges for perfect weekends, derby wins, and prediction streaks. Bragging rights you can actually show off.",
  },
  {
    icon: Newspaper,
    title: "Stay in the Loop",
    description: "School rugby news, match previews, and trivia. Everything a true supporter needs, in one place.",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Built for the Touchline</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything a schoolboy rugby supporter needs. Nothing they don't.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card hover:shadow-glow hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="flex items-start gap-6">
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
