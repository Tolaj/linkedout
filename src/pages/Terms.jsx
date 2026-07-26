import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function Terms() {
  return (
    <div className="min-h-screen bg-base-800">
      <nav className="border-b border-base-600">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-mono font-bold text-base-100 text-lg">LinkedOut</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-base-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-base-400 mb-10">Last updated: July 20, 2026</p>

        <div className="space-y-8 text-base-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using LinkedOut (the "Service"), including the web dashboard, Chrome extension, and API, you agree to these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">2. Description of Service</h2>
            <p>
              LinkedOut is a job application tracking platform that helps users organize their job search. Features include application tracking, email integration via Gmail, resume management, form autofill via a Chrome extension, and AI-assisted cold email drafting.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must not share your account with others or create multiple accounts.</li>
              <li>You must be at least 13 years old to use the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Use the Service for any unlawful purpose or to violate any laws.</li>
              <li>Send spam, unsolicited bulk messages, or harassing content through the email features.</li>
              <li>Attempt to access other users' accounts or data.</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
              <li>Use automated scripts or bots to interact with the Service beyond its intended functionality.</li>
              <li>Interfere with or disrupt the Service or its infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">5. Gmail Integration</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Gmail integration is optional. You may connect and disconnect at any time.</li>
              <li>When connected, the Service accesses your Gmail to read email metadata and content related to job applications, and to send emails on your behalf when you explicitly initiate them.</li>
              <li>LinkedOut's use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-base-100 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</li>
              <li>We do not use Gmail data for advertising, market research, or any purpose unrelated to providing the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">6. Chrome Extension</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>The Chrome extension reads page content on job board and career sites to detect and extract job posting details.</li>
              <li>Page content is processed locally in your browser. Only extracted job details are stored if you choose to track an application.</li>
              <li>The extension does not collect browsing history or track your activity on non-job-related sites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">7. AI Features</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>AI-powered features (email drafting, interview prep) use third-party AI providers configured by you.</li>
              <li>You are responsible for providing your own API keys for AI services.</li>
              <li>Content sent to AI providers is subject to their respective terms of service and privacy policies.</li>
              <li>AI-generated content is provided as suggestions. You are responsible for reviewing and editing before sending.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">8. Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You retain ownership of all data you submit to the Service.</li>
              <li>You can export your data at any time from Settings.</li>
              <li>You can delete your account and all associated data at any time.</li>
              <li>We may retain anonymized, aggregated data that cannot identify you.</li>
            </ul>
            <p className="mt-2">
              For details on how we handle your data, see our{" "}
              <Link to="/privacy" className="text-base-100 underline">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">9. Service Availability</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>The Service is provided "as is" without warranties of any kind.</li>
              <li>We do not guarantee uninterrupted or error-free operation.</li>
              <li>We may modify, suspend, or discontinue any part of the Service at any time.</li>
              <li>We will make reasonable efforts to notify users of significant changes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">10. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, LinkedOut and its developer shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, loss of profits, or loss of job opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">11. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will update the "Last updated" date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">12. Contact</h2>
            <p>
              For questions about these Terms, visit our{" "}
              <Link to="/support" className="text-base-100 underline">support page</Link>{" "}
              or email <span className="text-base-100">swapnilhgf@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
