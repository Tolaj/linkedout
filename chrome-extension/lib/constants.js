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
  nextActionDate: "", notes: "", link: "", formFields: [],
};

LinkedOut.uid = function () {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
};

LinkedOut.extractors = [];
