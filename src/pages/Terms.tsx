import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-2">
            Terms &amp; Conditions
          </h1>
          <p className="text-white/60 mb-8">Effective Date: March 2026 · Last Updated: March 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-white/80">
            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
              <p>
                Welcome to Trybal. These Terms and Conditions ("Terms") govern your use of the Trybal mobile application ("the App") and the website at trybal.co.za ("the Website"), collectively referred to as "the Platform."
              </p>
              <p className="mt-3">
                The Platform is owned and operated by Kamoo Pty Ltd (Registration Number: K2025188964), a company registered in the Republic of South Africa ("we," "us," or "our").
              </p>
              <p className="mt-3">
                By accessing or using the Platform, you agree to be bound by these Terms. If you do not agree with any part of these Terms, you must not use the Platform.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">2. Eligibility</h2>
              <p>
                You must be at least 13 years of age to create an account and use the Platform. If you are between the ages of 13 and 18, you confirm that you have obtained the consent of a parent or legal guardian to use the Platform. We reserve the right to request proof of age or parental consent at any time.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">3. Account Registration</h2>
              <p>
                To access certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information as necessary. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">4. Acceptable Use</h2>
              <p>You agree to use the Platform only for lawful purposes and in accordance with these Terms. You must not:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Post, share, or transmit any content that is defamatory, offensive, abusive, threatening, discriminatory, or otherwise objectionable</li>
                <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity</li>
                <li>Attempt to gain unauthorised access to any part of the Platform or its systems</li>
                <li>Use automated tools, bots, or scripts to access or interact with the Platform without our prior written consent</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">5. Predictions &amp; Leaderboards</h2>
              <p>
                The Platform includes prediction and leaderboard features that allow users to make predictions about schoolboy rugby First XV match outcomes. These features are provided for entertainment and community engagement purposes only.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>No real money, cryptocurrency, or items of monetary value are wagered, won, or lost through the use of these features</li>
                <li>Predictions do not constitute gambling, betting, or any form of financial wagering</li>
                <li>Leaderboard positions and associated recognition ("bragging rights") hold no monetary value</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">6. User-Submitted Content</h2>
              <p>
                You may submit content to the Platform, including fixture information, match results, school data, and other contributions ("User Content"). By submitting User Content, you grant us a non-exclusive, royalty-free, worldwide, perpetual licence to use, reproduce, modify, display, and distribute your User Content in connection with operating and promoting the Platform. You represent and warrant that you have the right to submit such content and that it does not infringe any third-party rights.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">7. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Platform — including but not limited to text, graphics, logos, icons, images, software, and design — are our property or the property of our licensors and are protected by South African and international intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any part of the Platform without our prior written consent.
              </p>
              <p className="mt-3">
                School names, crests, colours, and associated information are used for informational and community purposes and remain the intellectual property of their respective institutions.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">8. Sponsorship &amp; Advertising</h2>
              <p>
                The Platform may display sponsored content, branded placements, and advertisements from third-party sponsors. Sponsored content will be clearly identified as such. We will endeavour to vet sponsors and advertisers on a best efforts basis to ensure that they do not represent inappropriate or age-restricted content or products. However, we are not responsible for the accuracy, quality, or reliability of third-party sponsored content or the products and services promoted therein.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">9. Availability &amp; Modifications</h2>
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the Platform at any time without notice. We do not guarantee that the Platform will be available at all times or free from errors or interruptions. We may update these Terms from time to time. Continued use of the Platform following any changes constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by South African law, we, our directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from or related to your use of the Platform. The Platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">11. Termination</h2>
              <p>
                We may suspend or terminate your access to the Platform at any time, with or without cause and with or without notice, if we reasonably believe you have violated these Terms. Upon termination, your right to use the Platform will immediately cease.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">12. Governing Law</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the Republic of South Africa. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of the Republic of South Africa.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">13. Contact</h2>
              <p>For any questions regarding these Terms, please contact us at:</p>
              <p className="mt-2">
                Kamoo Pty Ltd (Registration Number: K2025188964)<br />
                Email:{" "}
                <a href="mailto:trybalrugby@gmail.com" className="text-[#FFD60A] hover:underline">
                  trybalrugby@gmail.com
                </a><br />
                Website: trybal.co.za
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
