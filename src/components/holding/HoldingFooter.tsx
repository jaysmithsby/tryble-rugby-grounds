import { Link } from "react-router-dom";

const HoldingFooter = () => {
  return (
    <footer className="w-full bg-[#1B4332] dark:bg-[#0d2118] border-t border-white/10 py-8">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              to="/privacy-policy"
              className="text-white/70 hover:text-[#FFD60A] transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-white/30">|</span>
            <Link
              to="/privacy-note"
              className="text-white/70 hover:text-[#FFD60A] transition-colors"
            >
              Short Privacy Note
            </Link>
            <span className="text-white/30">|</span>
            <Link
              to="/terms"
              className="text-white/70 hover:text-[#FFD60A] transition-colors"
            >
              Terms & Conditions
            </Link>
            <span className="text-white/30">|</span>
            <Link
              to="/age-policy"
              className="text-white/70 hover:text-[#FFD60A] transition-colors"
            >
              Age Policy
            </Link>
          </div>

          {/* Contact Email */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="mailto:trybalrugby@gmail.com"
              className="text-white/70 hover:text-[#FFD60A] transition-colors"
            >
              trybalrugby@gmail.com
            </a>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © 2026 Trybal. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default HoldingFooter;
