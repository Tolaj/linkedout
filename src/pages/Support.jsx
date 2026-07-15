import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { Mail, MessageSquare, Bug } from "lucide-react";

export default function Support() {
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
        <h1 className="text-3xl font-bold text-base-100 mb-2">Support</h1>
        <p className="text-base-400 mb-10">Need help with LinkedOut? We're here for you.</p>

        <div className="grid gap-6 md:grid-cols-3 mb-12">
          <a
            href="mailto:swapnilhgf@gmail.com?subject=LinkedOut Support"
            className="border border-base-600 rounded-xl p-6 hover:bg-base-700 transition-colors block"
          >
            <Mail className="w-6 h-6 text-base-300 mb-4" />
            <h3 className="font-semibold text-base-100 mb-1">Email Us</h3>
            <p className="text-sm text-base-400">swapnilhgf@gmail.com</p>
          </a>

          <a
            href="mailto:swapnilhgf@gmail.com?subject=LinkedOut Feature Request"
            className="border border-base-600 rounded-xl p-6 hover:bg-base-700 transition-colors block"
          >
            <MessageSquare className="w-6 h-6 text-base-300 mb-4" />
            <h3 className="font-semibold text-base-100 mb-1">Feature Request</h3>
            <p className="text-sm text-base-400">Suggest improvements</p>
          </a>

          <a
            href="mailto:swapnilhgf@gmail.com?subject=LinkedOut Bug Report"
            className="border border-base-600 rounded-xl p-6 hover:bg-base-700 transition-colors block"
          >
            <Bug className="w-6 h-6 text-base-300 mb-4" />
            <h3 className="font-semibold text-base-100 mb-1">Report a Bug</h3>
            <p className="text-sm text-base-400">Help us fix issues</p>
          </a>
        </div>

        <div className="space-y-8 text-sm">
          <section>
            <h2 className="text-lg font-semibold text-base-100 mb-4">Frequently Asked Questions</h2>

            <div className="space-y-4">
              <div className="border border-base-600 rounded-lg p-4">
                <h3 className="font-medium text-base-100 mb-2">The extension panel doesn't appear on a job page</h3>
                <p className="text-base-400">
                  Click the LinkedOut icon in your browser toolbar and press "Show Panel" to manually activate it.
                  The panel auto-appears on major job boards but may not detect all company career pages automatically.
                </p>
              </div>

              <div className="border border-base-600 rounded-lg p-4">
                <h3 className="font-medium text-base-100 mb-2">Auto Fill isn't filling some fields</h3>
                <p className="text-base-400">
                  Some application forms use embedded iframes (like Greenhouse or Workday forms inside a company's career page).
                  Browser security prevents the extension from accessing fields inside cross-origin iframes.
                  Fill those fields manually.
                </p>
              </div>

              <div className="border border-base-600 rounded-lg p-4">
                <h3 className="font-medium text-base-100 mb-2">How do I set up the API and Dashboard URLs?</h3>
                <p className="text-base-400">
                  Click the LinkedOut extension icon, then tap the title "LinkedOut" 5 times quickly to reveal
                  developer settings. Enter your API URL and Dashboard URL there.
                </p>
              </div>

              <div className="border border-base-600 rounded-lg p-4">
                <h3 className="font-medium text-base-100 mb-2">How do I delete my account?</h3>
                <p className="text-base-400">
                  Email us at swapnilhgf@gmail.com with your account email and we'll delete all your data.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
