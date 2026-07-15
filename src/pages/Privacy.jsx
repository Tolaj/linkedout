import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold text-base-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-base-400 mb-10">Last updated: July 15, 2026</p>

        <div className="space-y-8 text-base-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Overview</h2>
            <p>
              LinkedOut is a job application tracking tool consisting of a web dashboard and a Chrome extension.
              This policy describes what data we collect, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information:</strong> Name, email address, and a hashed password when you create an account.
              </li>
              <li>
                <strong>Application data:</strong> Job application details you choose to track — company name, role, location, status, dates, notes, and job posting URLs.
              </li>
              <li>
                <strong>Profile fields:</strong> Personal information you voluntarily save for form autofill — such as name, phone, address, work authorization, education, and links.
              </li>
              <li>
                <strong>Website content:</strong> The Chrome extension reads text from job posting pages (titles, headings, form labels) to detect and extract job details. This data is processed locally and only the extracted job information is stored if you click "Track Application."
              </li>
              <li>
                <strong>Email data:</strong> If you connect Gmail, we access email metadata (subject, sender, date) to detect application-related emails. Email content is processed to display in the dashboard and is not shared with third parties.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide the core functionality: tracking applications, autofilling forms, and displaying your job search pipeline.</li>
              <li>To authenticate your account and sync data across devices.</li>
              <li>To detect job postings on web pages you visit (extension only, processed locally).</li>
              <li>To send cold emails on your behalf when you explicitly initiate them.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Account and application data is stored in a MongoDB database secured with authentication.</li>
              <li>Passwords are hashed using bcrypt before storage.</li>
              <li>Authentication uses JSON Web Tokens (JWT) with a 7-day expiry.</li>
              <li>The Chrome extension stores data in Chrome's secure storage API, isolated from host page scripts.</li>
              <li>All API communication uses HTTPS encryption.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Data Sharing</h2>
            <p>We do not sell, transfer, or share your personal data with third parties. Your data is used solely to provide LinkedOut's functionality. Exceptions:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>If you use the AI features, your prompts are sent to the AI provider you configure (e.g., OpenAI, Anthropic) to generate responses. No personal data is sent beyond what you include in the prompt.</li>
              <li>Gmail integration uses Google's OAuth2 API. We store a refresh token to maintain the connection but do not share your email data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Chrome Extension Permissions</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>activeTab:</strong> Access the current tab to detect job postings and extract job details from the page you are viewing.</li>
              <li><strong>storage:</strong> Store authentication tokens, form drafts, and profile data locally in Chrome.</li>
              <li><strong>scripting:</strong> Inject content scripts on career pages to detect job postings when automatic matching doesn't cover the site.</li>
              <li><strong>Host permissions:</strong> Access specific job board and ATS domains (LinkedIn, Greenhouse, Lever, Workday, etc.) to run job detection scripts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Your Rights</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You can delete your account and all associated data at any time.</li>
              <li>You can clear extension data from Chrome's settings.</li>
              <li>You can disconnect Gmail integration at any time, which revokes access to your email data.</li>
              <li>You can export your application data from the dashboard.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-3">Contact</h2>
            <p>
              For privacy-related questions or requests, visit our{" "}
              <Link to="/support" className="text-base-100 underline">support page</Link>{" "}
              or email <span className="text-base-100">swapnilhgf@gmail.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
