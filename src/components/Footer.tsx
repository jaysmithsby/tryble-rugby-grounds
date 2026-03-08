import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Apple, PlayCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* CTA Section */}
        <div className="text-center mb-16 pb-16 border-b border-border">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get in the Game
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Trybal is free to download on Android and iOS. Pick your school, follow the season, and join the tribe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="shadow-glow">
              <Apple className="mr-2 h-5 w-5" />
              Free on iOS
            </Button>
            <Button size="lg" variant="secondary">
              <PlayCircle className="mr-2 h-5 w-5" />
              Free on Android
            </Button>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center mb-16">
          <p className="text-muted-foreground">
            Got questions? Drop us a line at{" "}
            <a href="mailto:trybalrugby@gmail.com" className="text-primary hover:underline font-medium">
              trybalrugby@gmail.com
            </a>
          </p>
        </div>

        {/* Links */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">Trybal</h3>
            <p className="text-sm text-muted-foreground">
              South Africa's home of schoolboy rugby.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Leaderboards</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><a href="mailto:trybalrugby@gmail.com" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/age-policy" className="hover:text-primary transition-colors">Age Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Trybal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
