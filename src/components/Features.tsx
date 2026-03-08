import { School, BarChart3, Calendar, Search } from "lucide-react";

const features = [
  {
    icon: School,
    title: "Follow Your School",
    description: "Select your school and make it yours. Get First XV fixture updates, results, and a profile page packed with history, colours, and stats. Then follow your biggest rivals — because you'll want to keep an eye on them.",
  },
  {
    icon: BarChart3,
    title: "Predictions & Leaderboards",
    description: "Think you know schoolboy rugby better than your chommies? Prove it. Make your predictions, climb the leaderboard, and earn bragging rights that actually mean something.",
  },
  {
    icon: Calendar,
    title: "Every First XV Fixture, Every Weekend",
    description: "From the opening round to interschools — Trybal tracks First XV fixtures across the country so you never miss a result. We're building the most complete schoolboy rugby fixture database in South Africa.",
  },
  {
    icon: Search,
    title: "School Profiles & History",
    description: "Explore the schools that shaped South African rugby. Colours, crests, records, and rivalries — if it happened on a school rugby field, it belongs on Trybal.",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">What You Get</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Every school. Every fixture. One app.
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
