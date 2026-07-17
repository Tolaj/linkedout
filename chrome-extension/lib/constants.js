window.LinkedOut = window.LinkedOut || {};

const isDev = !('update_url' in chrome.runtime.getManifest());
LinkedOut.DEFAULT_API_URL = isDev
  ? "http://localhost:4000/api"
  : "https://api.linkedout.swapniljadhav.com/api";

LinkedOut.DEFAULT_DASHBOARD_URL = isDev
  ? "http://localhost:5173"
  : "https://linkedout.swapniljadhav.com";


LinkedOut.SOURCES = [
  "LinkedIn", "Referral", "Company Site", "Handshake",
  "Career Fair", "Indeed", "Recruiter Outreach", "Cold Email", "Glassdoor", "Other",
];

LinkedOut.STAGES = [
  "Wishlist", "Applied", "Screening", "Interviewing", "Offer",
  "Rejected", "Ghosted", "Withdrawn",
];

LinkedOut.EMPTY_APP = {
  company: "", role: "", location: "", dateApplied: "", source: "LinkedIn",
  status: "Applied", resumeVersion: "", referral: "N", domain: "", workspace: "",
  nextActionDate: "", notes: "", link: "", formFields: [],
};

LinkedOut.uid = function () {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
};

LinkedOut.extractors = [];
