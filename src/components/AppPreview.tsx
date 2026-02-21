import fixturesImage from "@/assets/app-fixtures.jpg";
import leaderboardImage from "@/assets/app-leaderboard.jpg";

const AppPreview = () => {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-secondary/30 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Saturdays Feel Different Here</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A digital extension of the touchline. Built by someone who lived it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-3">Make Your Call</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your school's fixtures are waiting. Pick the winner, set the margin, and lock it in before kickoff. No odds. Just your rugby brain.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-3">Who's Reading the Game?</h3>
              <p className="text-muted-foreground leading-relaxed">
                See how you stack up against mates, schoolmates, and supporters nationwide. Climb the ranks. Earn respect.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-4 flex-1">
                <div className="text-3xl font-bold text-primary">5K+</div>
                <div className="text-sm text-muted-foreground">Supporters</div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-6 py-4 flex-1">
                <div className="text-3xl font-bold text-primary">50+</div>
                <div className="text-sm text-muted-foreground">Schools</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
                <div className="relative bg-card border-2 border-border rounded-3xl overflow-hidden shadow-card transform hover:-translate-y-2 transition-all duration-300">
                  <img
                    src={fixturesImage}
                    alt="Fixtures screen"
                    className="w-full h-auto"
                  />
                </div>
              </div>

              <div className="relative group mt-12">
                <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
                <div className="relative bg-card border-2 border-border rounded-3xl overflow-hidden shadow-card transform hover:-translate-y-2 transition-all duration-300">
                  <img
                    src={leaderboardImage}
                    alt="Leaderboard screen"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppPreview;
