const stats = [
  { value: "200+", label: "Schools and Counting" },
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
            Built by the Community, for the Community
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Trybal isn't built in a boardroom. It's built by people who lived it — who remember the bus trips, the rivalry weeks, and the results that defined a generation. We're working with schools across South Africa to make sure every fixture, every school, and every stat is accurate.
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

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Know a result we're missing? Got a fixture list for your school?{" "}
            <a href="mailto:trybalrugby@gmail.com" className="text-primary hover:underline font-medium">
              We want to hear from you.
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
