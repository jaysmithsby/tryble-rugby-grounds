import HoldingHeader from "@/components/holding/HoldingHeader";
import HoldingFooter from "@/components/holding/HoldingFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#1B4332] dark:bg-[#0d2118]">
      <HoldingHeader showBackButton />

      <main className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-montserrat mb-2">
            Privacy Policy
          </h1>
          <p className="text-white/60 mb-8">Effective Date: March 2026 · Last Updated: March 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-white/80">
            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
              <p>
                This Privacy Policy explains how Kamoo Pty Ltd (Registration Number: K2025188964) ("we," "us," or "our") collects, uses, stores, and protects your personal information when you use the Trybal mobile application and website (collectively, "the Platform"). We are committed to protecting your privacy in compliance with the Protection of Personal Information Act, 2013 (POPIA) and other applicable South African legislation.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
              <h3 className="text-lg font-semibold text-white/90 mb-2">2.1 Information You Provide</h3>
              <p>
                When you create an account, we collect your email address, display name or username, school affiliation, and age confirmation (to verify you meet the minimum age requirement of 13 years). If you submit content such as fixture data, match results, or corrections, we may collect the content of those submissions along with your username.
              </p>
              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">2.2 Information Collected Automatically</h3>
              <p>When you use the Platform, we may automatically collect:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Device information (device type, operating system, unique device identifiers)</li>
                <li>Usage data (pages viewed, features used, time spent on the Platform)</li>
                <li>IP address and approximate location data</li>
                <li>Crash reports and performance data</li>
              </ul>
              <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2">2.3 Information from Third Parties</h3>
              <p>
                If you sign in using a third-party service (such as Google), we may receive your name, email address, and profile picture as permitted by that service.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p>We use your personal information to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Operate, maintain, and improve the Platform</li>
                <li>Personalise your experience, including showing relevant school and fixture content</li>
                <li>Display leaderboards and prediction results</li>
                <li>Communicate with you about updates, features, and community contributions</li>
                <li>Display relevant sponsored content and advertising</li>
                <li>Ensure compliance with our Terms and Conditions</li>
                <li>Comply with applicable legal obligations</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">4. Legal Basis for Processing (POPIA)</h2>
              <p>Under POPIA, we process your personal information on the following grounds:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your consent (provided at registration and where required)</li>
                <li>The legitimate interest of operating and improving the Platform</li>
                <li>Contractual necessity to provide you with the services of the Platform</li>
                <li>Compliance with legal obligations</li>
              </ul>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">5. Sharing Your Information</h2>
              <p>
                We do not sell your personal information. We may share your information with service providers who assist us in operating the Platform (such as hosting, analytics, and advertising partners), provided they are bound by appropriate data processing agreements. We may share information with sponsors in aggregated, anonymised form that does not identify you personally. We may also disclose your information if required by law, regulation, or legal process.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">6. Children's Privacy</h2>
              <p>
                The Platform is open to users aged 13 and above. We do not knowingly collect personal information from children under 13. If we become aware that a user is under 13, we will take steps to delete their account and associated data. For users between 13 and 18, we encourage parental involvement and supervision. We limit the personal information collected from minors to what is necessary to operate the Platform.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">7. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide you with the Platform's services. If you delete your account, we will delete or anonymise your personal information within a reasonable period, except where retention is required by law.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">8. Data Security</h2>
              <p>
                We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, loss, destruction, or alteration. However, no method of electronic transmission or storage is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">9. Your Rights Under POPIA</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate or incomplete information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to the processing of your personal information</li>
                <li>Lodge a complaint with the Information Regulator of South Africa</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:trybalrugby@gmail.com" className="text-[#FFD60A] hover:underline">
                  trybalrugby@gmail.com
                </a>.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">10. Cookies &amp; Tracking</h2>
              <p>
                The Website may use cookies and similar technologies to improve your experience and for analytics purposes. You can manage your cookie preferences through your browser settings.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">11. Third-Party Links</h2>
              <p>
                The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on the Platform with a revised effective date.
              </p>
            </section>

            <section className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-4">13. Contact</h2>
              <p>For any questions or requests regarding this Privacy Policy, please contact:</p>
              <p className="mt-2">
                Kamoo Pty Ltd (Registration Number: K2025188964)<br />
                Email:{" "}
                <a href="mailto:trybalrugby@gmail.com" className="text-[#FFD60A] hover:underline">
                  trybalrugby@gmail.com
                </a><br />
                Website: trybal.co.za
              </p>
              <p className="mt-3">
                Information Regulator (South Africa):{" "}
                <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="text-[#FFD60A] hover:underline">
                  https://inforegulator.org.za
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
