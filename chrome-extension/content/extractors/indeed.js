window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Indeed",
  match: function (url) {
    return /indeed\.com\/(viewjob|jobs|rc\/clk)/.test(url);
  },
  extract: function (doc) {
    var company =
      (doc.querySelector("[data-company-name]") ||
       doc.querySelector(".jobsearch-InlineCompanyRating-companyHeader") ||
       doc.querySelector("[data-testid='inlineHeader-companyName'] a") ||
       doc.querySelector(".css-1ioi40n"));
    var role =
      (doc.querySelector("h1.jobsearch-JobInfoHeader-title") ||
       doc.querySelector("[data-testid='jobsearch-JobInfoHeader-title']") ||
       doc.querySelector("h1[class*='JobInfoHeader-title']"));
    var location =
      (doc.querySelector("[data-testid='job-location']") ||
       doc.querySelector("[data-testid='inlineHeader-companyLocation']") ||
       doc.querySelector(".jobsearch-JobInfoHeader-subtitle div:nth-child(2)"));

    var companyText = company ? (company.getAttribute("data-company-name") || company.textContent).trim() : "";
    var roleText = role ? role.textContent.trim() : "";
    var locationText = location ? location.textContent.trim().replace(/^[-–—•]\s*/, "") : "";

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      source: "Indeed",
      link: window.location.href.split("?")[0],
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
