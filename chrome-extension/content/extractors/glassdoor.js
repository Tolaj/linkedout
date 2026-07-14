window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Glassdoor",
  match: function (url) {
    return /glassdoor\.com\/(job-listing|Job)/.test(url);
  },
  extract: function (doc) {
    var company =
      (doc.querySelector("[data-test='employer-name']") ||
       doc.querySelector(".employerName") ||
       doc.querySelector("[class*='EmployerName']"));
    var role =
      (doc.querySelector("[data-test='job-title']") ||
       doc.querySelector(".e1tk4kwz5") ||
       doc.querySelector("[class*='JobTitle']") ||
       doc.querySelector("h1"));
    var location =
      (doc.querySelector("[data-test='location']") ||
       doc.querySelector("[class*='Location']") ||
       doc.querySelector(".e1tk4kwz1"));

    var companyText = company ? company.textContent.trim() : "";
    var roleText = role ? role.textContent.trim() : "";
    var locationText = location ? location.textContent.trim() : "";

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      source: "Glassdoor",
      link: window.location.href.split("?")[0],
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
