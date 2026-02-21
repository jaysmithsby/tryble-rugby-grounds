const stats = [
  { value: "10K+", label: "Predictions Locked In" },
  { value: "50+", label: "Schools Represented" },
  { value: "9", label: "Provinces Active" },
  { value: "85%", label: "Weekly Return Rate" },
];

const SocialProof = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The Tribe Is Growing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From KZN derbies to Cape Town classics — supporters across the country are making their calls
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-gradient-card border border-border rounded-2xl p-8 text-center shadow-card hover:shadow-glow hover:border-primary/30 transition-all duration-300"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                JM
              </div>
              <div>
                <div className="font-bold">James M.</div>
                <div className="text-sm text-muted-foreground">Student, Grey High School</div>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              "Finally — a way to prove I know my rugby without it being about money. The school vs school leaderboard is everything."
            </p>
          </div>

          <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card">
            <div className="flex gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                TP
              </div>
              <div>
                <div className="font-bold">Thandi P.</div>
                <div className="text-sm text-muted-foreground">Old Girl, St. Stithians</div>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              "Love staying connected to my school's rugby. Trybal makes it feel like I'm back on the touchline every Saturday."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
