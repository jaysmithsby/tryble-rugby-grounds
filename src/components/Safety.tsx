import { Shield, Heart, Users2 } from "lucide-react";

const Safety = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-card border border-primary/20 rounded-3xl p-12 shadow-glow">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Youth-Safe & Community-Focused</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Trybal is built on school spirit, not gambling. We're creating a safe space for students, parents, and alumni to celebrate South African school rugby.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">No Cash Prizes</h3>
              <p className="text-sm text-muted-foreground">Points and badges only—no money involved</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">No Gambling</h3>
              <p className="text-sm text-muted-foreground">No odds, no betting, no commercial pressure</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl border border-primary/20 mb-4">
                <Users2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-2">Community First</h3>
              <p className="text-sm text-muted-foreground">Built for school pride and friendly rivalry</p>
            </div>
          </div>

          <div className="bg-background/50 border border-border rounded-2xl p-8">
            <blockquote className="text-center">
              <p className="text-lg italic mb-4">
                "Trybal gives our students a safe way to engage with school rugby. It's all about school spirit and healthy competition—exactly what we need."
              </p>
              <footer className="text-muted-foreground">
                — School Principal, Pilot Program Participant
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Safety;
