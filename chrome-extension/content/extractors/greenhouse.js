window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Greenhouse",
  match: function (url) {
    return /greenhouse\.io/.test(url);
  },
  extract: function (doc) {
    var company =
      (doc.querySelector("span.company-name") ||
       doc.querySelector(".company-name") ||
       doc.querySelector("meta[property='og:site_name']"));
    var role =
      (doc.querySelector("h1.app-title") ||
       doc.querySelector(".posting-headline h2") ||
       doc.querySelector("h1[class*='title']"));
    var location =
      (doc.querySelector(".location") ||
       doc.querySelector("div.location") ||
       doc.querySelector(".body--metadata"));

    var companyText = "";
    if (company) {
      companyText = company.tagName === "META" ? company.getAttribute("content") : company.textContent;
      companyText = (companyText || "").trim();
    }
    if (!companyText) {
      var match = window.location.hostname.match(/^([^.]+)\.greenhouse\.io/);
      if (match) companyText = match[1].replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    var roleText = role ? role.textContent.trim() : "";
    var locationText = location ? location.textContent.trim() : "";

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      source: "Company Site",
      link: window.location.href,
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
