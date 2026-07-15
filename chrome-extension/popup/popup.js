document.addEventListener("DOMContentLoaded", async function () {
  var loginView = document.getElementById("login-view");
  var userView = document.getElementById("user-view");
  var loadingView = document.getElementById("loading-view");
  var devSection = document.getElementById("dev-section");
  var loginBtn = document.getElementById("login-btn");
  var logoutBtn = document.getElementById("logout-btn");
  var openDashboard = document.getElementById("open-dashboard");
  var saveUrlBtn = document.getElementById("save-url");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var apiUrlInput = document.getElementById("api-url");
  var dashboardUrlInput = document.getElementById("dashboard-url");
  var urlMsg = document.getElementById("url-msg");
  var headerTap = document.getElementById("header-tap");

  // Tap title 5 times to reveal dev settings
  var tapCount = 0;
  var tapTimer = null;
  headerTap.addEventListener("click", function () {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () { tapCount = 0; }, 1500);
    if (tapCount >= 5) {
      devSection.style.display = devSection.style.display === "none" ? "block" : "none";
      tapCount = 0;
    }
  });

  function showView(view) {
    loginView.style.display = "none";
    userView.style.display = "none";
    loadingView.style.display = "none";
    view.style.display = "block";
  }

  async function checkSession() {
    showView(loadingView);
    var data = await chrome.storage.local.get([
      "linkedout_token", "linkedout_user", "linkedout_api_url", "linkedout_dashboard_url"
    ]);

    apiUrlInput.value = data.linkedout_api_url || "";
    dashboardUrlInput.value = data.linkedout_dashboard_url || "";

    if (!data.linkedout_token) {
      showView(loginView);
      return;
    }

    try {
      var user = await LinkedOut.API.checkAuth();
      if (!user) {
        showView(loginView);
        return;
      }
      showUserView(user || data.linkedout_user);
    } catch {
      showView(loginView);
    }
  }

  function showUserView(user) {
    document.getElementById("user-name").textContent = user.name || "User";
    document.getElementById("user-email").textContent = user.email || "";
    showView(userView);
  }

  function saveUrls() {
    var apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "");
    var dashUrl = dashboardUrlInput.value.trim().replace(/\/+$/, "");
    var toRemove = [];
    var toSave = {};
    if (apiUrl) toSave.linkedout_api_url = apiUrl;
    else toRemove.push("linkedout_api_url");
    if (dashUrl) toSave.linkedout_dashboard_url = dashUrl;
    else toRemove.push("linkedout_dashboard_url");
    var p1 = Object.keys(toSave).length > 0 ? chrome.storage.local.set(toSave) : Promise.resolve();
    var p2 = toRemove.length > 0 ? chrome.storage.local.remove(toRemove) : Promise.resolve();
    return Promise.all([p1, p2]);
  }

  saveUrlBtn.addEventListener("click", async function () {
    await saveUrls();
    urlMsg.style.display = "inline";
    setTimeout(function () { urlMsg.style.display = "none"; }, 2000);
  });

  loginBtn.addEventListener("click", async function () {
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    if (!email || !password) return;

    await saveUrls();

    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    loginError.style.display = "none";

    try {
      var user = await LinkedOut.API.login(email, password);
      showUserView(user);
    } catch (e) {
      loginError.textContent = e.message || "Login failed";
      loginError.style.display = "block";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  });

  passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", async function () {
    await LinkedOut.API.logout();
    showView(loginView);
    emailInput.value = "";
    passwordInput.value = "";
  });

  document.getElementById("show-panel").addEventListener("click", async function () {
    var [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "FORCE_PANEL" });
      window.close();
    }
  });

  openDashboard.addEventListener("click", async function () {
    var data = await chrome.storage.local.get("linkedout_dashboard_url");
    var url = data.linkedout_dashboard_url || "http://localhost:5173";
    chrome.tabs.create({ url: url });
  });

  checkSession();
});
