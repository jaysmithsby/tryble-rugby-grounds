import { Heart, GraduationCap, Shirt } from "lucide-react";

const Sponsor = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Giving Back to School Rugby
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Trybal isn't just about predictions—we're committed to supporting grassroots rugby development across South Africa
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
              <Shirt className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Kit Donations</h3>
            <p className="text-muted-foreground">
              Supporting underprivileged schools with quality rugby equipment and jerseys
            </p>
          </div>

          <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Bursary Fund</h3>
            <p className="text-muted-foreground">
              Helping talented rugby players access quality education and coaching
            </p>
          </div>

          <div className="bg-gradient-card border border-border rounded-2xl p-8 shadow-card hover:shadow-glow transition-all duration-300 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 mb-6">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">School Support</h3>
            <p className="text-muted-foreground">
              Partnering with schools to strengthen rugby programs and community engagement
            </p>
          </div>
        </div>

        <div className="mt-12 bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center">
          <p className="text-lg mb-2">
            <span className="font-bold text-primary">100%</span> of sponsor contributions go directly to supporting school rugby
          </p>
          <p className="text-muted-foreground">
            We're building a sustainable model where community engagement fuels grassroots development
          </p>
        </div>
      </div>
    </section>
  );
};

export default Sponsor;
