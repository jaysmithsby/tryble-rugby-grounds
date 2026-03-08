import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const AgePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-2">
            Age Policy
          </h1>
          <p className="text-white/60 mb-8">Effective Date: March 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-white/80">
            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Minimum Age Requirement</h2>
              <p>
                Trybal is designed for South Africa's schoolboy rugby community. To create an account and use the Platform, you must be at least 13 years old.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Users Aged 13 to 17</h2>
              <p>
                If you are between 13 and 17 years of age, you confirm that a parent or legal guardian has given you permission to use the Platform. We may request proof of parental consent at any time. We encourage parents and guardians to be involved in their children's use of the Platform and to contact us with any concerns.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Users Under 13</h2>
              <p>
                We do not allow users under the age of 13 to create accounts or use the Platform. If we become aware that a user is under 13, we will promptly delete their account and all associated personal information.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Age Verification</h2>
              <p>
                During registration, users are required to confirm that they meet the minimum age requirement. We reserve the right to request additional verification of age at any time. If we are unable to verify that a user meets the minimum age, we may suspend or terminate their account.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">No Gambling or Financial Wagering</h2>
              <p>
                Trybal's prediction and leaderboard features are for entertainment and community engagement only. No real money or items of monetary value are involved. These features do not constitute gambling or betting and are designed to be safe and appropriate for users aged 13 and above.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">Reporting Concerns</h2>
              <p>
                If you believe a user is under the age of 13, or if you have any concerns about the safety of a minor using the Platform, please contact us immediately at{" "}
                <a href="mailto:trybalrugby@gmail.com" className="text-[#FFD60A] hover:underline">
                  trybalrugby@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <HoldingFooter />
    </div>
  );
};

export default AgePolicy;
