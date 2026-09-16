chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "JOB_DETECTED" && sender.tab) {
    var tabId = sender.tab.id;
    var key = "job_tab_" + tabId;
    chrome.storage.session.set({ [key]: msg.data });
    chrome.action.setBadgeText({ text: "+", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#0891B2", tabId: tabId });
  }

  if (msg.type === "APP_TRACKED" && sender.tab) {
    chrome.action.setBadgeText({ text: "ok", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#16A34A", tabId: sender.tab.id });
  }

  if (msg.type === "OPEN_POPUP") {
    chrome.action.openPopup().catch(function () {
      chrome.windows.create({
        url: chrome.runtime.getURL("popup/popup.html"),
        type: "popup",
        width: 380,
        height: 520,
      });
    });
  }

  if (msg.type === "AUTH_MISSING" && sender.tab) {
    chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#D97706", tabId: sender.tab.id });
  }

  if (msg.type === "GOOGLE_SIGN_IN") {
    (async function () {
      try {
        var config = await chrome.storage.local.get(["linkedout_api_url"]);
        var apiUrl = config.linkedout_api_url || "https://linkedout-backend-seven.vercel.app/api";
        var clientId = "441735946847-vn32ru30nfei3tf8pjm3idu2h9bu1h2h.apps.googleusercontent.com";
        var redirectUrl = chrome.identity.getRedirectURL();
        var nonce = crypto.randomUUID();
        var authUrl = "https://accounts.google.com/o/oauth2/v2/auth"
          + "?client_id=" + encodeURIComponent(clientId)
          + "&response_type=id_token"
          + "&redirect_uri=" + encodeURIComponent(redirectUrl)
          + "&scope=" + encodeURIComponent("openid email profile")
          + "&nonce=" + nonce
          + "&prompt=select_account";

        var responseUrl = await chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true,
        });

        var hash = new URL(responseUrl).hash.substring(1);
        var params = new URLSearchParams(hash);
        var idToken = params.get("id_token");
        if (!idToken) throw new Error("No ID token received");

        var res = await fetch(apiUrl + "/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          throw new Error(err.error || "Google login failed");
        }
        var data = await res.json();
        await chrome.storage.local.set({
          linkedout_token: data.token,
          linkedout_user: data.user,
        });
        var loginDashUrls = ["*://linkedout.swapniljadhav.com/*", "http://localhost/*"];
        loginDashUrls.forEach(function (pattern) {
          chrome.tabs.query({ url: pattern }, function (tabs) {
            tabs.forEach(function (tab) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: function (token) {
                  localStorage.setItem("linkedout_token", token);
                  window.location.reload();
                },
                args: [data.token],
              }).catch(function () {});
            });
          });
        });
        // Show signed-in toast on the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: function (userName) {
                var host = document.createElement("div");
                host.id = "lo-signin-toast";
                var shadow = host.attachShadow({ mode: "closed" });
                shadow.innerHTML = '<style>'
                  + ':host { all: initial !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }'
                  + '.toast { position: fixed; top: 20px; right: 20px; z-index: 2147483647;'
                  + '  background: #ffffff; border: 1px solid #d4d4d4; border-radius: 12px;'
                  + '  box-shadow: 0 8px 32px rgba(0,0,0,0.12); padding: 16px 20px;'
                  + '  display: flex; align-items: center; gap: 12px; min-width: 260px;'
                  + '  animation: lo-toastIn 0.3s ease-out; }'
                  + '@keyframes lo-toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }'
                  + '.icon { width: 36px; height: 36px; background: #f0fdf4; border-radius: 50%;'
                  + '  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }'
                  + '.check { color: #16A34A; font-size: 18px; font-weight: bold; }'
                  + '.text { flex: 1; }'
                  + '.title { font-size: 14px; font-weight: 600; color: #1a1a1a; }'
                  + '.sub { font-size: 12px; color: #737373; margin-top: 2px; }'
                  + '</style>'
                  + '<div class="toast">'
                  + '  <div class="icon"><span class="check">✓</span></div>'
                  + '  <div class="text">'
                  + '    <div class="title">Signed in to LinkedOut</div>'
                  + '    <div class="sub">Welcome, ' + (userName || 'User') + '</div>'
                  + '  </div>'
                  + '</div>';
                document.body.appendChild(host);
                setTimeout(function () { host.remove(); }, 4000);
              },
              args: [data.user.name || data.user.email || "User"],
            }).catch(function () {});
          }
        });
        sendResponse({ success: true, user: data.user });
      } catch (e) {
        if (e.message && e.message.includes("canceled")) {
          sendResponse({ canceled: true });
        } else {
          sendResponse({ error: e.message || "Google sign-in failed" });
        }
      }
    })();
    return true;
  }

  if (msg.type === "SYNC_AUTH" && msg.token) {
    chrome.storage.local.set({ linkedout_token: msg.token });
  }

  if (msg.type === "SYNC_LOGOUT") {
    chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
  }

  if (msg.type === "EXT_DO_LOGIN" && msg.token) {
    var dashUrls = ["*://linkedout.swapniljadhav.com/*", "http://localhost/*"];
    dashUrls.forEach(function (pattern) {
      chrome.tabs.query({ url: pattern }, function (tabs) {
        tabs.forEach(function (tab) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: function (token) {
              localStorage.setItem("linkedout_token", token);
              window.location.reload();
            },
            args: [msg.token],
          }).catch(function () {});
        });
      });
    });
  }

  if (msg.type === "EXT_DO_LOGOUT") {
    chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        chrome.tabs.sendMessage(tab.id, { type: "CLOSE_PANEL" }).catch(function () {});
      });
    });
    var dashUrls2 = ["*://linkedout.swapniljadhav.com/*", "http://localhost/*"];
    dashUrls2.forEach(function (pattern) {
      chrome.tabs.query({ url: pattern }, function (tabs) {
        tabs.forEach(function (tab) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: function () {
              Object.keys(localStorage).filter(function (k) {
                return k.startsWith("linkedout_");
              }).forEach(function (k) { localStorage.removeItem(k); });
              window.location.reload();
            },
          }).catch(function () {});
        });
      });
    });
  }

  if (msg.type === "API_PROXY") {
    (async function () {
      try {
        var fetchOpts = {
          method: msg.options.method || "GET",
          headers: msg.options.headers || {},
        };
        if (msg.options.body) fetchOpts.body = msg.options.body;
        var res = await fetch(msg.url, fetchOpts);
        if (res.status === 401) {
          await chrome.storage.local.remove(["linkedout_token", "linkedout_user"]);
          sendResponse({ _unauthorized: true });
          return;
        }
        if (!res.ok) {
          var err = await res.json().catch(function () { return {}; });
          sendResponse({ _proxyError: err.error || res.statusText });
          return;
        }
        var data = await res.json();
        sendResponse(data);
      } catch (e) {
        sendResponse({ _proxyError: e.message || "Request failed" });
      }
    })();
    return true;
  }

  if (msg.type === "FORCE_PANEL_ON_TAB" && msg.tabId) {
    var tid = msg.tabId;
    chrome.tabs.get(tid, function (tab) {
      if (chrome.runtime.lastError || !tab) return;
      if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:"))) return;
      chrome.tabs.sendMessage(tid, { type: "FORCE_PANEL" }, function (resp) {
        if (chrome.runtime.lastError) {
          var scripts = [
            "lib/constants.js", "lib/api.js",
            "content/extractors/linkedin.js", "content/extractors/indeed.js",
            "content/extractors/greenhouse.js", "content/extractors/lever.js",
            "content/extractors/workday.js", "content/extractors/glassdoor.js",
            "content/extractors/jobvite.js", "content/extractors/fallback.js",
            "content/fieldAliases.js", "content/autofill.js",
            "content/detector.js", "content/panel.js"
          ];
          chrome.scripting.executeScript({
            target: { tabId: tid },
            files: scripts,
          }).then(function () {
            setTimeout(function () {
              chrome.tabs.sendMessage(tid, { type: "FORCE_PANEL" }).catch(function () {});
            }, 300);
          }).catch(function () {});
        }
      });
    });
  }

  if (msg.type === "GET_AUTH") {
    chrome.storage.local.get(["linkedout_token", "linkedout_user", "linkedout_api_url"], function (data) {
      sendResponse(data);
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
    chrome.storage.session.remove("job_tab_" + tabId);
  }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  chrome.storage.session.remove("job_tab_" + tabId);
});
