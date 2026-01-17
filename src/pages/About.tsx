import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Target, Users, Trophy, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            About <span className="text-primary">Tryble</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connecting school rugby communities through the thrill of prediction, building rivalries and friendships that last a lifetime.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                Tryble was born from a simple observation: school rugby in South Africa is more than just a sport—it's a tradition that unites communities, builds character, and creates memories that last generations.
              </p>
              <p className="text-muted-foreground mb-4">
                Our mission is to amplify that spirit by giving fans, students, parents, and old boys a platform to engage with the matches they love. Through predictions, friendly competition, and community building, we're creating a digital home for school rugby enthusiasts.
              </p>
              <p className="text-muted-foreground">
                We believe that every try scored and every tackle made deserves to be celebrated—and who better to do that than the community that lives and breathes this beautiful game?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-card border border-border rounded-2xl p-6 text-center">
                <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-1">Passion</h3>
                <p className="text-sm text-muted-foreground">For school rugby</p>
              </div>
              <div className="bg-gradient-card border border-border rounded-2xl p-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-1">Community</h3>
                <p className="text-sm text-muted-foreground">Building connections</p>
              </div>
              <div className="bg-gradient-card border border-border rounded-2xl p-6 text-center">
                <Target className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-1">Accuracy</h3>
                <p className="text-sm text-muted-foreground">Fair predictions</p>
              </div>
              <div className="bg-gradient-card border border-border rounded-2xl p-6 text-center">
                <Trophy className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold mb-1">Excellence</h3>
                <p className="text-sm text-muted-foreground">Celebrating success</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet the Founder</h2>
            <p className="text-muted-foreground">The passion behind Tryble</p>
          </div>
          
          <div className="bg-gradient-card border border-border rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Founder Avatar */}
              <div className="shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center">
                  <span className="text-4xl md:text-5xl font-bold text-primary">J</span>
                </div>
              </div>
              
              {/* Founder Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2">James</h3>
                <p className="text-primary font-medium mb-4">Founder & CEO</p>
                <p className="text-muted-foreground mb-4">
                  A lifelong school rugby enthusiast, James grew up on the sidelines of matches across South Africa. Watching the passion, the rivalries, and the community spirit that school rugby creates inspired him to build Tryble—a platform that brings fans closer to the game they love.
                </p>
                <p className="text-muted-foreground mb-6">
                  With a background in technology and a deep appreciation for South African rugby traditions, James set out to create more than just an app. Tryble is his vision of a connected community where every fan has a voice and every prediction tells a story.
                </p>
                <div className="flex gap-3 justify-center md:justify-start">
                  <Button variant="outline" size="sm" asChild>
                    <a href="mailto:james@tryble.co.za" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-muted-foreground">
            <p>
              It started with a WhatsApp group. Friends from different schools, scattered across the country, debating who would win the big match on Saturday. The banter was fierce, the predictions were bold, and the bragging rights were everything.
            </p>
            <p>
              But keeping track of who called it right? That was a mess. Spreadsheets got lost, memories faded, and the glory of a perfect prediction would be forgotten by Monday.
            </p>
            <p>
              That's when the idea for Tryble was born. What if there was a proper platform for this? A place where predictions were tracked, where schools had their own leaderboards, where the rivalry extended beyond the pitch and into the community?
            </p>
            <p>
              Today, Tryble serves thousands of school rugby fans across South Africa. From Grey College to Affies, from Bishops to Maritzburg College—every school, every match, every prediction matters here.
            </p>
            <p className="text-foreground font-medium">
              We're just getting started, and we're building this for you—the true fans of school rugby.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Tryble Community</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Ready to put your rugby knowledge to the test? Join thousands of fans making predictions every week.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Tryble. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
