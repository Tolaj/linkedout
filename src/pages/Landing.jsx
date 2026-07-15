import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import {
  Link2,
  Search,
  MousePointerClick,
  BarChart3,
  Zap,
  Shield,
  ArrowRight,
  Globe,
  Mail,
  Sparkles,
  Send,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Auto-Detect Job Postings",
    desc: "Recognizes job pages on 20+ platforms including LinkedIn, Greenhouse, Lever, Workday, and company career sites.",
  },
  {
    icon: MousePointerClick,
    title: "One-Click Tracking",
    desc: "Log every application with a single click. Company, role, location, and source are auto-filled from the page.",
  },
  {
    icon: Zap,
    title: "Smart Autofill",
    desc: "Save your info once, autofill everywhere. Name, email, work authorization, links — all matched intelligently to form fields.",
  },
  {
    icon: BarChart3,
    title: "Pipeline Dashboard",
    desc: "See your entire job search at a glance. Track response rates, interview rates, and manage applications across stages.",
  },
  {
    icon: Shield,
    title: "Privacy-First",
    desc: "Your data stays in Chrome's secure storage. Extension data is isolated from websites you visit.",
  },
  {
    icon: Link2,
    title: "Works Everywhere",
    desc: "Detects job pages on company career sites using smart scoring — URL patterns, form fields, page content, and ATS iframes.",
  },
];

const PLATFORMS = [
  "LinkedIn", "Indeed", "Greenhouse", "Lever", "Glassdoor", "Workday",
  "Ashby", "iCIMS", "SmartRecruiters", "Taleo", "Jobvite", "BambooHR",
  "Rippling", "Personio", "Recruitee", "JazzHR", "Paylocity", "Dayforce",
  "Breezy HR", "Workable",
];

const STEPS = [
  { num: "1", title: "Install the extension", desc: "Add LinkedOut to Chrome in one click." },
  { num: "2", title: "Browse job postings", desc: "The panel appears automatically on job pages." },
  { num: "3", title: "Track & autofill", desc: "Log applications and fill forms instantly." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-base-800">
      {/* Nav */}
      <nav className="border-b border-base-600">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-mono font-bold text-base-100 text-lg">LinkedOut</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-base-300 hover:text-base-100 transition-colors">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-base-100 text-base-800 px-4 py-2 rounded-lg font-medium hover:bg-base-200 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-base-700 border border-base-600 rounded-full px-4 py-1.5 mb-8">
          <Globe size={14} className="text-base-300" />
          <span className="text-xs text-base-300 font-medium">Chrome Extension</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-base-100 leading-tight mb-6 max-w-3xl mx-auto">
          Stop losing track of where you applied
        </h1>
        <p className="text-lg text-base-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          LinkedOut auto-detects job postings, tracks your applications, and autofills
          repetitive form fields — so you can focus on landing the job, not managing spreadsheets.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://chromewebstore.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-base-100 text-base-800 px-6 py-3 rounded-lg font-medium hover:bg-base-200 transition-colors text-sm"
          >
            <Globe size={18} />
            Add to Chrome
          </a>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 border border-base-500 text-base-100 px-6 py-3 rounded-lg font-medium hover:bg-base-700 transition-colors text-sm"
          >
            Create free account
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-base-100 text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.num} className="text-center">
              <div className="w-10 h-10 rounded-full bg-base-100 text-base-800 flex items-center justify-center font-bold text-sm mx-auto mb-4">
                {s.num}
              </div>
              <h3 className="font-semibold text-base-100 mb-2">{s.title}</h3>
              <p className="text-sm text-base-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-base-700 border-y border-base-600">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-base-100 text-center mb-4">Everything you need to stay organized</h2>
          <p className="text-base-400 text-center mb-12 max-w-xl mx-auto">
            Built for job seekers who apply across dozens of platforms every week.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-base-800 border border-base-600 rounded-xl p-6">
                <div className="w-10 h-10 rounded-lg bg-base-700 flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-base-300" />
                </div>
                <h3 className="font-semibold text-base-100 mb-2">{f.title}</h3>
                <p className="text-sm text-base-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported platforms */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-base-100 text-center mb-4">Works on 20+ platforms</h2>
        <p className="text-base-400 text-center mb-10 max-w-lg mx-auto">
          Plus any company career page with standard job posting patterns.
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {PLATFORMS.map((p) => (
            <span key={p} className="bg-base-700 border border-base-600 text-base-300 text-sm px-4 py-2 rounded-full">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-base-100 text-base-800">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Take control of your job search</h2>
          <p className="text-base-300 mb-8 max-w-lg mx-auto">
            Install the extension, create a free account, and never lose track of an application again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-base-800 text-base-100 px-6 py-3 rounded-lg font-medium hover:bg-base-700 transition-colors text-sm"
            >
              <Globe size={18} />
              Add to Chrome — It's free
            </a>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 border border-base-400 text-base-800 px-6 py-3 rounded-lg font-medium hover:bg-base-300 transition-colors text-sm"
            >
              Sign up
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-600 bg-base-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span className="font-mono text-sm text-base-400">LinkedOut</span>
          </div>
          <p className="text-xs text-base-400">Built for job seekers, by a job seeker.</p>
        </div>
      </footer>
    </div>
  );
}
