window.LinkedOut = window.LinkedOut || {};
LinkedOut.extractors = LinkedOut.extractors || [];

LinkedOut.extractors.push({
  name: "Workday",
  match: function (url) {
    return /myworkdayjobs\.com/.test(url) || /workday\.com.*\/job\//.test(url);
  },
  extract: function (doc) {
    function tryExtract() {
      var company =
        (doc.querySelector("[data-automation-id='jobPostingHeader'] a") ||
         doc.querySelector("[data-automation-id='headerTitle']") ||
         doc.querySelector(".css-1q2dra3"));
      var role =
        (doc.querySelector("[data-automation-id='jobPostingTitle']") ||
         doc.querySelector("h2[data-automation-id='jobPostingHeader']") ||
         doc.querySelector("[data-automation-id='jobTitle']") ||
         doc.querySelector("h1") ||
         doc.querySelector("h2"));
      var location =
        (doc.querySelector("[data-automation-id='locations'] dd") ||
         doc.querySelector("[data-automation-id='locations']") ||
         doc.querySelector("dd.css-129m7dg"));

      var companyText = company ? company.textContent.trim() : "";
      if (!companyText) {
        var match = window.location.hostname.match(/^([^.]+)\./);
        if (match && match[1] !== "www") {
          companyText = match[1].replace(/[-_]/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        }
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
    }

    var result = tryExtract();
    if (result) return result;

    return new Promise(function (resolve) {
      var timeout = setTimeout(function () {
        observer.disconnect();
        resolve(tryExtract());
      }, 5000);

      var observer = new MutationObserver(function () {
        var r = tryExtract();
        if (r) {
          observer.disconnect();
          clearTimeout(timeout);
          resolve(r);
        }
      });

      observer.observe(doc.body, { childList: true, subtree: true });
    });
  },
});
