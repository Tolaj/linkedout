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
