window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Jobvite",
  match: function (url) {
    return /jobs\.jobvite\.com/.test(url) || /app\.jobvite\.com/.test(url);
  },
  extract: function (doc) {
    // Job listing page
    var role =
      (doc.querySelector("h2.jv-header") ||
       doc.querySelector(".jv-job-detail-name") ||
       doc.querySelector("h2[class*='header']") ||
       doc.querySelector(".job-title"));
    // Application page — try breadcrumb or page title
    if (!role) {
      var titleEl = doc.querySelector("title");
      if (titleEl && /apply/i.test(window.location.pathname)) {
        role = { textContent: titleEl.textContent.replace(/\s*[-|].*$/, "").replace(/apply\s*(for|to)?\s*/i, "").trim() };
      }
    }

    // Company from URL path or page content
    var companyText = "";
    var pathMatch = window.location.pathname.match(/^\/([^/]+)/);
    if (pathMatch && pathMatch[1] !== "job") {
      companyText = pathMatch[1].replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    if (!companyText) {
      var ogSite = doc.querySelector("meta[property='og:site_name']");
      if (ogSite) companyText = ogSite.getAttribute("content") || "";
    }

    var location =
      (doc.querySelector(".jv-job-detail-meta .location") ||
       doc.querySelector("[class*='location']"));

    var roleText = role ? role.textContent.trim() : "";
    var locationText = location ? location.textContent.trim() : "";

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      source: "Company Site",
      link: window.location.href.replace(/\/apply.*$/, ""),
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
