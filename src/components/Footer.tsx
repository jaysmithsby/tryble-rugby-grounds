import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Apple, PlayCircle, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* CTA Section */}
        <div className="text-center mb-16 pb-16 border-b border-border">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join the Tryble Community?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Download the app and start making predictions today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="shadow-glow">
              <Apple className="mr-2 h-5 w-5" />
              Download on iOS
            </Button>
            <Button size="lg" variant="secondary">
              <PlayCircle className="mr-2 h-5 w-5" />
              Get it on Android
            </Button>
          </div>
        </div>

        {/* Newsletter */}
        <div className="max-w-md mx-auto mb-16">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-2">Stay Updated</h3>
            <p className="text-sm text-muted-foreground">
              Get the latest news, features, and school rugby insights
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter your email"
              className="bg-background/50 border-border"
            />
            <Button className="shrink-0">
              <Mail className="h-4 w-4 mr-2" />
              Subscribe
            </Button>
          </div>
        </div>

        {/* Links */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary">Tryble</h3>
            <p className="text-sm text-muted-foreground">
              South Africa's premier school rugby prediction platform
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
              <li><a href="#" className="hover:text-primary transition-colors">CSR Programs</a></li>
              <li><a href="mailto:hello@tryble.co.za" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Youth Safety</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Tryble. All rights reserved. Built for school rugby fans by school rugby fans.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
