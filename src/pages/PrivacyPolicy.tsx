import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-white/80">
            <p className="text-lg">
              Last updated: January 2025
            </p>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
              <p>
                Trybal ("we", "our", or "us") is committed to protecting the privacy of all users,
                especially children and young people. This Privacy Policy explains how we collect,
                use, and protect your personal information in compliance with the Protection of
                Personal Information Act (POPIA) of South Africa.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
              <p>We collect minimal information necessary to provide our service:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>First name (display purposes only)</li>
                <li>Age band (to ensure age-appropriate experience)</li>
                <li>School affiliation</li>
                <li>Email address (for account verification)</li>
                <li>Parent/guardian email (for users under 18)</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p>Your information is used solely to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide and improve our prediction platform</li>
                <li>Display school-based leaderboards</li>
                <li>Ensure age-appropriate content delivery</li>
                <li>Communicate important updates about your account</li>
                <li>Obtain parental consent for minor users</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">4. Data Protection</h2>
              <p>
                We implement industry-standard security measures including encryption at rest
                and in transit, secure authentication, and regular security audits. We never
                sell user data to third parties.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">5. Your Rights</h2>
              <p>Under POPIA, you have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">6. Contact Us</h2>
              <p>
                For any privacy-related questions or requests, please contact us at:{" "}
                <a href="mailto:privacy@trybal.app" className="text-[#FFD60A] hover:underline">
                  privacy@trybal.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default PrivacyPolicy;
