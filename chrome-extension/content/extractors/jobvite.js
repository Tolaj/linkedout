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

    var locationText = "";
    var locEl = doc.querySelector(".jv-job-detail-meta .location");
    if (!locEl) {
      // Look for location in the subtitle area near the role heading, not nav
      var metas = doc.querySelectorAll("h2 ~ p, h2 ~ div, .jv-job-detail-meta, [class*='job-detail'] [class*='location']");
      for (var k = 0; k < metas.length; k++) {
        var txt = metas[k].textContent.trim();
        if (/,\s*[A-Z]{2}/.test(txt) || /,\s*[A-Z][a-z]+\s+[A-Z][a-z]/.test(txt)) {
          var parts = txt.split(/\s*[·•|]\s*/);
          for (var p = 0; p < parts.length; p++) {
            if (/,\s*[A-Z]/.test(parts[p])) { locationText = parts[p].trim(); break; }
          }
          if (locationText) break;
        }
      }
    } else {
      locationText = locEl.textContent.trim();
    }

    var roleText = role ? role.textContent.trim() : "";

    // Extract domain from "Return to X.com" links or company website links
    var domain = "";
    var links = doc.querySelectorAll("a[href]");
    for (var m = 0; m < links.length; m++) {
      var href = links[m].getAttribute("href") || "";
      var linkText = links[m].textContent.toLowerCase();
      if (/return to|visit|go to/i.test(linkText) && /\.\w{2,}/.test(href)) {
        try {
          var u = new URL(href, window.location.origin);
          domain = u.hostname.replace(/^www\./, "");
          break;
        } catch (e) {}
      }
    }

    if (!companyText && !roleText) return null;

    return {
      company: companyText,
      role: roleText,
      location: locationText,
      domain: domain,
      source: "Company Site",
      link: window.location.href.replace(/\/apply.*$/, ""),
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});
