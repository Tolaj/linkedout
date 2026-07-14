window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "LinkedIn",
  match: function (url) {
    return /linkedin\.com\/jobs\/(view|collections|search)/.test(url);
  },
  extract: function (doc) {
    var company =
      (doc.querySelector(".job-details-jobs-unified-top-card__company-name a") ||
       doc.querySelector(".job-details-jobs-unified-top-card__company-name") ||
       doc.querySelector(".topcard__org-name-link") ||
       doc.querySelector(".jobs-unified-top-card__company-name a") ||
       doc.querySelector("[class*='company-name']"));
    var role =
      (doc.querySelector("h1.job-details-jobs-unified-top-card__job-title") ||
       doc.querySelector("h1.topcard__title") ||
       doc.querySelector("h1.jobs-unified-top-card__job-title") ||
       doc.querySelector("h1[class*='job-title']") ||
       doc.querySelector(".job-details-jobs-unified-top-card__job-title"));
    var location =
      (doc.querySelector(".job-details-jobs-unified-top-card__bullet") ||
       doc.querySelector(".topcard__flavor--bullet") ||
       doc.querySelector(".jobs-unified-top-card__bullet") ||
       doc.querySelector("[class*='job-details'] [class*='bullet']"));

    var companyText = company ? company.textContent.trim() : "";
    var roleText = role ? role.textContent.trim() : "";
    var locationText = location ? location.textContent.trim() : "";

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      source: "LinkedIn",
      link: window.location.href.split("?")[0],
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
