export const KANBAN_COLUMNS = ["Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Closed"];

export const CLOSED_STATUSES = ["Rejected", "Ghosted", "Withdrawn"];

export const STAGES = ["Wishlist", "Applied", "Screening", "Interviewing", "Offer", "Rejected", "Ghosted", "Withdrawn"];

export const STAGE_COLOR = {
  Wishlist:     { dot: "bg-[#A3A3A3]", ring: "border-[#A3A3A3]", text: "text-[#737373]", bg: "bg-[#F5F5F5]" },
  Applied:      { dot: "bg-[#0891B2]", ring: "border-[#0891B2]", text: "text-[#0891B2]", bg: "bg-[#ECFEFF]" },
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

export const PROFILE_CATEGORIES = ["personal", "work", "education", "links", "eeo", "custom"];

export const DEFAULT_PROFILE_FIELDS = [
  { category: "personal", fieldKey: "first_name", label: "First Name", type: "text", sortOrder: 0 },
  { category: "personal", fieldKey: "last_name", label: "Last Name", type: "text", sortOrder: 1 },
  { category: "personal", fieldKey: "email", label: "Email", type: "text", sortOrder: 2 },
  { category: "personal", fieldKey: "phone", label: "Phone", type: "text", sortOrder: 3 },
  { category: "personal", fieldKey: "address", label: "Address", type: "text", sortOrder: 4 },
  { category: "personal", fieldKey: "city", label: "City", type: "text", sortOrder: 5 },
  { category: "personal", fieldKey: "state", label: "State", type: "text", sortOrder: 6 },
  { category: "personal", fieldKey: "zip", label: "Zip Code", type: "text", sortOrder: 7 },
  { category: "personal", fieldKey: "country", label: "Country", type: "text", sortOrder: 8 },
  { category: "personal", fieldKey: "resume", label: "Resume", type: "file", sortOrder: 9 },

  { category: "work", fieldKey: "work_authorization", label: "Work Authorization", type: "select", options: ["Yes", "No"], sortOrder: 0 },
  { category: "work", fieldKey: "visa_sponsorship", label: "Visa Sponsorship Needed", type: "select", options: ["Yes", "No"], sortOrder: 1 },
  { category: "work", fieldKey: "salary_expectation", label: "Salary Expectation", type: "text", sortOrder: 2 },
  { category: "work", fieldKey: "years_experience", label: "Years of Experience", type: "text", sortOrder: 3 },
  { category: "work", fieldKey: "start_date", label: "Start Date Availability", type: "text", sortOrder: 4 },
  { category: "work", fieldKey: "current_company", label: "Current Company", type: "text", sortOrder: 5 },
  { category: "work", fieldKey: "current_title", label: "Current Title", type: "text", sortOrder: 6 },

  { category: "education", fieldKey: "highest_degree", label: "Highest Degree", type: "select", options: ["High School", "Associate", "Bachelor's", "Master's", "PhD"], sortOrder: 0 },
  { category: "education", fieldKey: "school", label: "School", type: "text", sortOrder: 1 },
  { category: "education", fieldKey: "major", label: "Major", type: "text", sortOrder: 2 },
  { category: "education", fieldKey: "graduation_year", label: "Graduation Year", type: "text", sortOrder: 3 },
  { category: "education", fieldKey: "gpa", label: "GPA", type: "text", sortOrder: 4 },

  { category: "links", fieldKey: "linkedin_url", label: "LinkedIn URL", type: "text", sortOrder: 0 },
  { category: "links", fieldKey: "github_url", label: "GitHub URL", type: "text", sortOrder: 1 },
  { category: "links", fieldKey: "portfolio_url", label: "Portfolio URL", type: "text", sortOrder: 2 },
  { category: "links", fieldKey: "personal_website", label: "Personal Website", type: "text", sortOrder: 3 },

  { category: "eeo", fieldKey: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Non-binary", "Prefer not to say"], sortOrder: 0 },
  { category: "eeo", fieldKey: "race_ethnicity", label: "Race / Ethnicity", type: "select", options: ["American Indian or Alaska Native", "Asian", "Black or African American", "Hispanic or Latino", "Native Hawaiian or Other Pacific Islander", "White", "Two or More Races", "Prefer not to say"], sortOrder: 1 },
  { category: "eeo", fieldKey: "veteran_status", label: "Veteran Status", type: "select", options: ["Not a veteran", "Veteran", "Prefer not to say"], sortOrder: 2 },
  { category: "eeo", fieldKey: "disability_status", label: "Disability Status", type: "select", options: ["No", "Yes", "Prefer not to say"], sortOrder: 3 },
];
