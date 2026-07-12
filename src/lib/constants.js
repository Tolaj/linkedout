export const KANBAN_COLUMNS = ["Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Closed"];

export const CLOSED_STATUSES = ["Rejected", "Ghosted", "Withdrawn"];

export const STAGES = ["Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Rejected", "Ghosted", "Withdrawn"];

export const STAGE_COLOR = {
  Wishlist:     { dot: "bg-[#A3A3A3]", ring: "border-[#A3A3A3]", text: "text-[#737373]", bg: "bg-[#F5F5F5]" },
  Applied:      { dot: "bg-[#6366F1]", ring: "border-[#6366F1]", text: "text-[#6366F1]", bg: "bg-[#EEF2FF]" },
  Screening:    { dot: "bg-[#D97706]", ring: "border-[#D97706]", text: "text-[#D97706]", bg: "bg-[#FFFBEB]" },
  Interviewing: { dot: "bg-[#2563EB]", ring: "border-[#2563EB]", text: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
  Offer:        { dot: "bg-[#16A34A]", ring: "border-[#16A34A]", text: "text-[#16A34A]", bg: "bg-[#F0FDF4]" },
  Rejected:     { dot: "bg-[#DC2626]", ring: "border-[#DC2626]", text: "text-[#DC2626]", bg: "bg-[#FEF2F2]" },
  Ghosted:      { dot: "bg-[#9333EA]", ring: "border-[#9333EA]", text: "text-[#9333EA]", bg: "bg-[#FAF5FF]" },
  Withdrawn:    { dot: "bg-[#6B7280]", ring: "border-[#6B7280]", text: "text-[#6B7280]", bg: "bg-[#F9FAFB]" },
  Closed:       { dot: "bg-[#6B7280]", ring: "border-[#6B7280]", text: "text-[#6B7280]", bg: "bg-[#F9FAFB]" },
};

export const SOURCES = [
  "LinkedIn", "Referral", "Company Site", "Handshake",
  "Career Fair", "Indeed", "Recruiter Outreach", "Cold Email", "Other",
];


export const RESUME_ARCHETYPES = [
  "SWE_Generalist", "AI-ML", "Fullstack", "Frontend", "Backend",
  "Data_Engineer", "DevOps", "Mobile", "Other",
];

export const EMAIL_STATUSES = ["draft", "sent", "received", "replied", "no-response", "bounced"];

export const FOLDER_STRUCTURE = [
  "01_Resumes",
  "02_Applications",
  "03_Interview_Prep",
  "03_Interview_Prep/Company_specific",
];

export const EMPTY_APP = {
  company: "", role: "", location: "", dateApplied: "", source: "LinkedIn",
  status: "Applied", resumeVersion: "", referral: "N", domain: "", workspace: "",
  nextActionDate: "", notes: "", link: "",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
