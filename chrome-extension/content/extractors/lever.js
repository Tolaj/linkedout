window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Lever",
  match: function (url) {
    return /jobs\.lever\.co\//.test(url);
  },
  extract: function (doc) {
    var company =
      (doc.querySelector(".main-header-logo img") ||
       doc.querySelector("meta[property='og:site_name']") ||
       doc.querySelector(".main-header a"));
    var role =
      (doc.querySelector("h2[data-qa='posting-name']") ||
       doc.querySelector(".posting-headline h2") ||
       doc.querySelector("h2"));
    var location =
      (doc.querySelector(".posting-categories .sort-by-time .posting-category") ||
       doc.querySelector(".location") ||
       doc.querySelector(".posting-categories div"));

    var companyText = "";
    if (company) {
      if (company.tagName === "IMG") companyText = company.getAttribute("alt") || "";
      else if (company.tagName === "META") companyText = company.getAttribute("content") || "";
      else companyText = company.textContent || "";
      companyText = companyText.trim();
    }
    if (!companyText) {
      var parts = window.location.pathname.split("/").filter(Boolean);
      if (parts.length > 0) companyText = parts[0].replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
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
