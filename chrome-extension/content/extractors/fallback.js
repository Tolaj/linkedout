window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Fallback",
  match: function () {
    var host = window.location.hostname;
    var skip = /google\.|youtube\.|facebook\.|twitter\.|instagram\.|reddit\.|amazon\.|wikipedia\.|github\.|stackoverflow\.|netflix\.|spotify\.|whatsapp\.|tiktok\.|slack\.|discord\.|zoom\.|notion\.|figma\.|vercel\.|localhost/;
    if (skip.test(host)) return false;
    return true;
  },
  extract: function (doc) {
    var url = (window.location.href + " " + window.location.pathname).toLowerCase();
    var title = doc.title || "";
    var ogTitle = (doc.querySelector("meta[property='og:title']") || {}).content || "";
    var ogSiteName = (doc.querySelector("meta[property='og:site_name']") || {}).content || "";
    var pageTitle = ogTitle || title;

    // --- Signal scoring: accumulate evidence this is a job page ---
    var score = 0;
    var reasons = [];

    // 1. URL keywords
    var urlJobWords = /\b(job|jobs|career|careers|position|positions|opening|openings|apply|application|posting|vacancy|vacancies|recruit|talent|hire|hiring)\b/;
    if (urlJobWords.test(url)) { score += 3; reasons.push("url"); }

    // 2. Known ATS domains
    var atsDomains = /jobvite|icims|taleo|workable|breezy|smartrecruiters|ashbyhq|rippling|bamboohr|paylocity|paycom|adp\.|ultipro|successfactors|cornerstoneondemand|jazz\.co|applytojob|recruitee|personio|join\.com/;
    if (atsDomains.test(window.location.hostname)) { score += 5; reasons.push("ats"); }

    // 3. JSON-LD JobPosting
    var jsonLdResult = extractJsonLd(doc);
    if (jsonLdResult) return jsonLdResult;

    // 4. Page title contains job-related role words
    var roleWords = /engineer|developer|designer|manager|analyst|scientist|director|coordinator|specialist|architect|lead|intern|associate|consultant|programmer|administrator|technician|operator|devops|sre|qa|tester|recruiter|sales|marketing|product|data|software|frontend|backend|fullstack|full.stack/i;
    if (roleWords.test(pageTitle)) { score += 3; reasons.push("title"); }

    // 5. Form fields that look like job applications
    var formSignals = detectApplicationForm(doc);
    if (formSignals >= 3) { score += 4; reasons.push("form(" + formSignals + ")"); }
    else if (formSignals >= 2) { score += 2; reasons.push("form(" + formSignals + ")"); }

    // 6. Page content keywords (headings + labels)
    var contentSignals = detectJobContent(doc);
    if (contentSignals >= 3) { score += 3; reasons.push("content(" + contentSignals + ")"); }
    else if (contentSignals >= 1) { score += 1; reasons.push("content(" + contentSignals + ")"); }

    // 7. "Apply" button on page
    var applyBtn = doc.querySelector('a[href*="apply"], button[class*="apply"], input[value*="Apply"], a[class*="apply"], button:not([type])');
    if (applyBtn && /apply|submit.*application/i.test(applyBtn.textContent || applyBtn.value || "")) {
      score += 2; reasons.push("apply-btn");
    }

    // 8. Negative signals — common non-job pages with similar form fields
    var negWords = /sign.?up|sign.?in|log.?in|register|create.?account|forgot.?password|reset.?password|subscribe|newsletter|contact.?us|get.?started|free.?trial|pricing|checkout|payment|billing|cart|purchase|buy.?now|donate/i;
    var negUrl = /\b(signup|signin|login|register|trial|pricing|checkout|cart|account|auth|subscribe)\b/;
    if (negWords.test(pageTitle)) { score -= 3; reasons.push("neg-title"); }
    if (negUrl.test(url)) { score -= 3; reasons.push("neg-url"); }
    var pageButtons = doc.querySelectorAll("button, input[type='submit']");
    for (var bi = 0; bi < pageButtons.length; bi++) {
      var btnText = (pageButtons[bi].textContent || pageButtons[bi].value || "").trim();
      if (/^(sign.?up|register|create.?account|subscribe|get.?started|start.?free|try.?free)/i.test(btnText)) {
        score -= 3; reasons.push("neg-btn"); break;
      }
    }

    // 9. Negative: job LISTING / search results pages (not a single job posting)
    var listingUrlWords = /\/(jobs|careers|openings|positions|search|results|listings|browse|explore|categories?|departments?)\/?(\?|$|#)/i;
    if (listingUrlWords.test(window.location.pathname + window.location.search)) {
      score -= 4; reasons.push("neg-listing-url");
    }
    // Multiple job cards = listing page
    var jobCards = doc.querySelectorAll('[class*="job-card" i], [class*="jobCard" i], [class*="job_card" i], [class*="job-item" i], [class*="job-result" i], [class*="job-listing" i], [data-testid*="job-card"], [data-testid*="job-result"]');
    if (jobCards.length >= 3) { score -= 5; reasons.push("neg-cards(" + jobCards.length + ")"); }
    // Many links to individual job pages
    var jobLinks = doc.querySelectorAll('a[href*="/job/"], a[href*="/jobs/"], a[href*="/position/"], a[href*="/opening/"], a[href*="/career/"]');
    var uniqueJobLinks = new Set();
    for (var jl = 0; jl < jobLinks.length; jl++) {
      var href = jobLinks[jl].getAttribute("href") || "";
      if (href.length > 10) uniqueJobLinks.add(href);
    }
    if (uniqueJobLinks.size >= 5) { score -= 5; reasons.push("neg-joblinks(" + uniqueJobLinks.size + ")"); }
    // Search filters (dropdowns, keyword inputs in search bars)
    var filterIndicators = doc.querySelectorAll('[class*="filter" i], [class*="search-bar" i], [class*="searchbar" i], [class*="facet" i], [aria-label*="filter" i], [aria-label*="search" i], [class*="sort-by" i], [class*="refine" i]');
    if (filterIndicators.length >= 3) { score -= 3; reasons.push("neg-filters(" + filterIndicators.length + ")"); }
    // Title patterns like "Top X Jobs", "Best X Jobs", "X Jobs in Y"
    if (/\b(top|best|all|\d+\+?)\s+(software|engineer|developer|data|design|product|marketing)?\s*(jobs?|positions?|openings?|careers?)\s+(in|near|at)\b/i.test(pageTitle)) {
      score -= 5; reasons.push("neg-listing-title");
    }
    // Pagination
    var pagination = doc.querySelector('[class*="pagination" i], [aria-label*="pagination" i], nav[role="navigation"] a[href*="page"]');
    if (pagination) { score -= 2; reasons.push("neg-pagination"); }

    // Need enough evidence
    if (score < 4) return null;

    console.log("[LinkedOut] Fallback matched (score=" + score + ", signals=" + reasons.join(",") + ")");

    // --- Extract job details ---
    var company = "";
    var role = "";
    var location = "";

    // Try splitting title: "Role - Company", "Role | Company", "Role at Company"
    var titleParts = pageTitle.split(/\s*[-|–—]\s*/);
    if (titleParts.length >= 2) {
      role = titleParts[0].trim();
      company = titleParts[titleParts.length - 1].trim();
      if (/careers?|jobs?|apply|hiring|home/i.test(company)) {
        company = titleParts.length >= 3 ? titleParts[titleParts.length - 2].trim() : "";
      }
    }
    // Try "Role at Company"
    if (!company) {
      var atMatch = pageTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*[-|]|$)/i);
      if (atMatch) { role = atMatch[1].trim(); company = atMatch[2].trim(); }
    }

    if (!company) company = ogSiteName || "";
    if (!company) {
      var host = window.location.hostname.replace(/^(www|jobs|careers|job|career|apply)\./, "").split(".")[0];
      company = host.replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    if (!role) {
      var h1 = doc.querySelector("h1");
      if (h1 && h1.textContent.trim().length < 120) role = h1.textContent.trim();
    }
    if (!role) {
      var h2s = doc.querySelectorAll("h2");
      for (var i = 0; i < h2s.length; i++) {
        if (roleWords.test(h2s[i].textContent)) { role = h2s[i].textContent.trim(); break; }
      }
    }

    // Try to extract location from common patterns
    var locEl = doc.querySelector("[class*='location' i], [data-testid*='location'], [id*='location']");
    if (locEl) {
      var locText = locEl.textContent.trim();
      if (locText.length <= 80 && !/^(location|locations)$/i.test(locText)) {
        location = locText;
      }
    }

    // Extract domain from company website links
    var domain = "";
    var allLinks = doc.querySelectorAll("a[href]");
    for (var li = 0; li < allLinks.length; li++) {
      var linkHref = allLinks[li].getAttribute("href") || "";
      var lt = allLinks[li].textContent.toLowerCase();
      if (/return to|visit|go to|company site/i.test(lt) && /https?:\/\//.test(linkHref)) {
        try {
          var parsed = new URL(linkHref);
          domain = parsed.hostname.replace(/^www\./, "");
          break;
        } catch (e) {}
      }
    }

    if (!role && !company) return null;

    return {
      company: company,
      role: role,
      location: location,
      domain: domain,
      source: "Company Site",
      link: window.location.href.replace(/\/apply.*$/, ""),
      dateApplied: new Date().toISOString().slice(0, 10),
    };
  },
});

function extractJsonLd(doc) {
  var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < scripts.length; i++) {
    try {
      var data = JSON.parse(scripts[i].textContent);
      var items = Array.isArray(data) ? data : [data];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (item["@graph"]) items = items.concat(item["@graph"]);
        if (item["@type"] === "JobPosting" || item["@type"] === "jobPosting") {
          var org = item.hiringOrganization;
          var loc = item.jobLocation;
          var locStr = "";
          if (loc) {
            if (loc.address) locStr = loc.address.addressLocality || loc.address.name || "";
            else if (typeof loc === "string") locStr = loc;
            else if (Array.isArray(loc) && loc[0]) locStr = (loc[0].address || {}).addressLocality || "";
          }
          return {
            company: (org && (org.name || (typeof org === "string" ? org : ""))) || "",
            role: item.title || item.name || "",
            location: locStr,
            source: window.location.hostname.replace(/^www\./, ""),
            link: window.location.href,
            dateApplied: new Date().toISOString().slice(0, 10),
          };
        }
      }
    } catch (e) {}
  }
  return null;
}

function detectApplicationForm(doc) {
  var signals = 0;
  var allInputs = doc.querySelectorAll("input, select, textarea");
  var labels = doc.querySelectorAll("label");
  var allText = "";
  labels.forEach(function (l) { allText += " " + l.textContent.toLowerCase(); });
  allInputs.forEach(function (inp) {
    var n = ((inp.name || "") + " " + (inp.placeholder || "") + " " + (inp.id || "") + " " + (inp.getAttribute("aria-label") || "")).toLowerCase();
    allText += " " + n;
  });

  // Job-specific fields (strong signals)
  if (/resume|cv|curriculum/i.test(allText)) signals += 2;
  if (/cover.?letter/i.test(allText)) signals += 2;
  if (/work.?(authorization|status|eligib)|visa|sponsor/i.test(allText)) signals += 2;
  if (/salary|compensation|pay.?expect/i.test(allText)) signals++;
  if (/start.?date|notice.?period/i.test(allText)) signals++;
  if (/equal.?opportunity|eeo|demographic|veteran|disability/i.test(allText)) signals++;
  if (/referred|referral|how.?did.?you.?hear/i.test(allText)) signals++;
  if (/years?.?of.?experience|experience.?level/i.test(allText)) signals++;
  if (/linkedin|portfolio|github/i.test(allText)) signals++;

  // Generic fields (appear on signup forms too — don't count)
  // first name, last name, email, phone, company are NOT scored

  return signals;
}

function detectJobContent(doc) {
  var signals = 0;
  var headings = doc.querySelectorAll("h1, h2, h3, h4");
  var headingText = "";
  headings.forEach(function (h) { headingText += " " + h.textContent.toLowerCase(); });

  if (/job.?description|about.?(the|this).?(role|position|job)/i.test(headingText)) signals++;
  if (/responsibilit|what.?you.?will|what.?you.?ll/i.test(headingText)) signals++;
  if (/qualificat|requirement|what.?we.?(look|need|are.?looking)/i.test(headingText)) signals++;
  if (/benefits?|perks|compensation|what.?we.?offer/i.test(headingText)) signals++;
  if (/personal.?information|application.?form|submit.?application/i.test(headingText)) signals++;
  if (/apply.?(now|for|to)|application/i.test(headingText)) signals++;
  if (/about.?(us|the.?company|the.?team)/i.test(headingText)) signals++;

  return signals;
}
