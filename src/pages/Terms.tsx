import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-invert max-w-none space-y-6 text-white/80">
            <p className="text-lg">
              Last updated: January 2025
            </p>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Trybal, you agree to be bound by these Terms of Service.
                If you are under 18 years of age, you must have parental or guardian consent
                to use this platform.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">2. Platform Purpose</h2>
              <p>
                Trybal is a predictions platform for South African school rugby. It is designed
                for entertainment and school community engagement only. Trybal does not involve:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Gambling or wagering of any kind</li>
                <li>Real money prizes or rewards</li>
                <li>Entry fees or pay-to-play mechanics</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">3. User Conduct</h2>
              <p>Users agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide accurate information during registration</li>
                <li>Treat other users with respect</li>
                <li>Not engage in bullying, harassment, or hate speech</li>
                <li>Not attempt to manipulate leaderboards or predictions</li>
                <li>Not share account credentials with others</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">4. Intellectual Property</h2>
              <p>
                School crests, logos, and branding are used with permission from respective
                institutions. Schools may request removal of their intellectual property at
                any time, and we will comply within 72 hours.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">5. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms.
                Users may also request account deletion at any time by contacting{" "}
                <a href="mailto:support@trybal.app" className="text-[#FFD60A] hover:underline">
                  support@trybal.app
                </a>
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">6. Changes to Terms</h2>
              <p>
                We may update these terms from time to time. Users will be notified of
                significant changes via email or in-app notification.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">7. Contact</h2>
              <p>
                For questions about these terms, please contact:{" "}
                <a href="mailto:legal@trybal.app" className="text-[#FFD60A] hover:underline">
                  legal@trybal.app
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

export default Terms;
