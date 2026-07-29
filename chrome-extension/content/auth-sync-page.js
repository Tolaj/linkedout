// Runs in the page's main world (injected via manifest, not inline script).
// Detects localStorage changes and bridges them to the content script via custom events.

(function () {
  var _origRemoveItem = localStorage.removeItem.bind(localStorage);
  var _origSetItem = localStorage.setItem.bind(localStorage);

  localStorage.removeItem = function (key) {
    _origRemoveItem(key);
    if (key === "linkedout_token") {
      window.dispatchEvent(new CustomEvent("__linkedout_auth", { detail: { action: "logout" } }));
    }
  };

  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (key === "linkedout_token" && value) {
      window.dispatchEvent(new CustomEvent("__linkedout_auth", { detail: { action: "login", token: value } }));
    }
  };

  window.addEventListener("__linkedout_ext_action", function (e) {
    if (e.detail && e.detail.action === "logout") {
      localStorage.removeItem = _origRemoveItem;
      localStorage.setItem = _origSetItem;
      Object.keys(localStorage).filter(function (k) {
        return k.startsWith("linkedout_");
      }).forEach(function (k) { _origRemoveItem(k); });
      window.location.reload();
    }
    if (e.detail && e.detail.action === "login" && e.detail.token) {
      localStorage.setItem = _origSetItem;
      _origSetItem("linkedout_token", e.detail.token);
      window.location.reload();
    }
  });
})();
