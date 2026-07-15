window.LinkedOut = window.LinkedOut || {};

(function () {
  var lastUrl = window.location.href;
  var pollTimer = null;

  async function isLoggedIn() {
    try {
      var data = await chrome.storage.local.get("linkedout_token");
      return !!data.linkedout_token;
    } catch { return false; }
  }

  async function runDetection() {
    var url = window.location.href;
    var extractors = LinkedOut.extractors || [];

    for (var i = 0; i < extractors.length; i++) {
      var ext = extractors[i];
      if (!ext.match(url)) continue;

      try {
        var result = ext.extract(document);
        if (result && typeof result.then === "function") {
          result = await result;
        }
        if (result && (result.company || result.role)) {
          console.log("[LinkedOut] Detected job via " + ext.name + ":", result.company, "-", result.role);

          // Notify service worker for badge
          chrome.runtime.sendMessage({ type: "JOB_DETECTED", data: result }).catch(function () {});

          var loggedIn = await isLoggedIn();
          if (loggedIn) {
            waitForPanel(result);
          } else {
            waitForLoginPanel();
          }
          return;
        }
      } catch (e) {
        console.warn("[LinkedOut] Extractor " + ext.name + " failed:", e);
      }
    }
    console.log("[LinkedOut] No job posting detected on this page");
  }

  function waitForPanel(data) {
    if (LinkedOut.showPanel) {
      LinkedOut.showPanel(data);
    } else {
      // panel.js loads right after detector.js, wait for it
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (LinkedOut.showPanel) {
          clearInterval(iv);
          LinkedOut.showPanel(data);
        } else if (tries > 20) {
          clearInterval(iv);
          console.warn("[LinkedOut] Panel not available");
        }
      }, 100);
    }
  }

  function waitForLoginPanel() {
    if (LinkedOut.showLoginPanel) {
      LinkedOut.showLoginPanel();
    } else {
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (LinkedOut.showLoginPanel) {
          clearInterval(iv);
          LinkedOut.showLoginPanel();
        } else if (tries > 20) {
          clearInterval(iv);
        }
      }, 100);
    }
  }

  // Listen for messages from popup / service worker
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.type === "SHOW_PANEL" && msg.data) {
      waitForPanel(msg.data);
    }
    if (msg.type === "RE_DETECT") {
      runDetection();
    }
    if (msg.type === "FORCE_PANEL") {
      forceShowPanel();
    }
  });

  async function forceShowPanel() {
    var loggedIn = await isLoggedIn();
    if (!loggedIn) {
      waitForLoginPanel();
      return;
    }

    var url = window.location.href;
    var extractors = LinkedOut.extractors || [];
    for (var i = 0; i < extractors.length; i++) {
      var ext = extractors[i];
      if (!ext.match(url)) continue;
      try {
        var result = ext.extract(document);
        if (result && typeof result.then === "function") result = await result;
        if (result && (result.company || result.role)) {
          if (LinkedOut.forcePanel) LinkedOut.forcePanel(result);
          return;
        }
      } catch {}
    }
    if (LinkedOut.forcePanel) LinkedOut.forcePanel({ company: "", role: "", location: "", jobUrl: url, source: "", link: url, dateApplied: new Date().toISOString().slice(0, 10) });
  }

  // SPA navigation detection (LinkedIn, etc.)
  function watchNavigation() {
    window.addEventListener("popstate", function () {
      setTimeout(function () {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          runDetection();
        }
      }, 1500);
    });

    var checks = 0;
    function startPoll() {
      if (pollTimer) return;
      checks = 0;
      pollTimer = setInterval(function () {
        checks++;
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          checks = 0;
          setTimeout(runDetection, 1500);
        }
        if (checks > 15) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }, 2000);
    }

    startPoll();
    document.addEventListener("click", function () { startPoll(); }, { passive: true });
  }

  // Initial run — delay slightly to let page content render
  setTimeout(runDetection, 1000);
  watchNavigation();
})();
