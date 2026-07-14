window.LinkedOut = window.LinkedOut || {};

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
  nextActionDate: "", notes: "", link: "",
};

LinkedOut.uid = function () {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

LinkedOut.extractors = [];
