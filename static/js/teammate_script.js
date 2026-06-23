const app = document.getElementById("app");

window.getLocalDateString = function (d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const todayKey = window.getLocalDateString();

// Botpress 載入邏輯已移至 static/js/botpress_loader.js

/* ===== Gemini AI 設定 =====
// 組員更新：現在可以從 localStorage 讀取，並提供 UI 讓使用者自行輸入
let GEMINI_API_KEY = window.GEMINI_API_KEY || localStorage.getItem("moodstudy_gemini_api_key") || "";
const GEMINI_MODEL = window.GEMINI_MODEL || "gemini-2.0-flash";

function askAndSaveGeminiKeyIfNeeded() {
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE" && GEMINI_API_KEY !== "你的 Gemini API Key") return true;

  const wantsInput = confirm(
    "目前沒有設定 Gemini API Key，所以會使用內建備援拆解。\n\n" +
    "若要使用真正 Gemini AI 即時拆解，請按「確定」輸入 API Key。\n" +
    "這組 Key 只會安全地暫存在您的瀏覽器，不會外洩或寫進 GitHub。"
  );

  if (!wantsInput) return false;

  const key = prompt("請貼上您的 Gemini API Key：");
  if (key && key.trim()) {
    GEMINI_API_KEY = key.trim();
    localStorage.setItem("moodstudy_gemini_api_key", GEMINI_API_KEY);
    alert("Gemini API Key 已暫存在此瀏覽器。接下來會嘗試使用 Gemini AI 拆解。");
    return true;
  }

  alert("沒有輸入 API Key，系統會先使用內建備援拆解。");
  return false;
}

function clearSavedGeminiKey() {
  localStorage.removeItem("moodstudy_gemini_api_key");
  GEMINI_API_KEY = window.GEMINI_API_KEY || "";
  alert("已清除瀏覽器中的 Gemini API Key。");
}

const TOKEN_REWARD_MAIN = 3;
const TOKEN_REWARD_SUB = 1;
const MAX_DAILY_TOKENS = 15;

function showToast(message) {
  let toast = document.getElementById("token-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "token-toast";
    toast.className = "toast-message";
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function updateTokens(amount) {
  const today = window.getLocalDateString();
  let savedDate = localStorage.getItem(`lms_daily_earned_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`);
  let dailyEarned = parseInt(localStorage.getItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 0;

  if (savedDate !== today) {
    dailyEarned = 0;
    localStorage.setItem(`lms_daily_earned_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, today);
  }

  let tokens = parseInt(localStorage.getItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 15;

  if (amount > 0) {
    const spaceLeft = MAX_DAILY_TOKENS - dailyEarned;
    if (spaceLeft <= 0) {
      showToast("🎉 完成任務！(今日代幣獲取已達上限 " + MAX_DAILY_TOKENS + " 枚)");
      if (typeof window.confetti === 'function') window.confetti();
      return;
    }
    const actualEarned = Math.min(amount, spaceLeft);
    tokens += actualEarned;
    dailyEarned += actualEarned;
    localStorage.setItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyEarned);
    showToast("🎉 恭喜完成任務！獲得 " + actualEarned + " 枚代幣！");
    if (typeof window.confetti === 'function') window.confetti();
  } else if (amount < 0) {
    // 扣回機制 Clawback
    tokens += amount;
    if (tokens < 0) tokens = 0;

    // 從每日額度扣回來，讓使用者可以再次賺取
    if (dailyEarned > 0) {
      dailyEarned += amount;
      if (dailyEarned < 0) dailyEarned = 0;
      localStorage.setItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyEarned);
    }
    showToast("⚠️ 任務狀態變更，已扣回 " + Math.abs(amount) + " 枚代幣");
  }

  localStorage.setItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, tokens);

  // Update token display in topbar
  const tokenDisplay = document.getElementById("topbar-token-count");
  if (tokenDisplay) tokenDisplay.innerText = tokens;
}

const now = new Date();

function defaultUserState() {
  return {
    mood: "尚未填寫",
    stress: "-",
    note: "",
    pressureReason: [],
    streak: 0,
    lastCheckinDate: "",
    checkinDates: [],
    checkinTaskStatus: {},
    moodRecords: [],
    pressureRecords: [],
    todos: [
      { text: "整理今天的筆記重點", time: "20 分鐘", done: false, subtasks: [] },
      { text: "完成數學作業練習題", time: "40 分鐘", done: false, subtasks: [] },
      { text: "閱讀一篇英文課文", time: "30 分鐘", done: false, subtasks: [] }
    ],
    theme: "yellow",
    fontSize: "normal",
    fontFamily: "default",
    chatMessages: [
      { role: "ai", text: "嗨嗨，我是 MoodStudy AI 學習助手！你可以跟我聊學習、壓力、心情，或只是想放鬆一下。" }
    ]
  };
}

let state = defaultUserState();

function getLoginInfo() {
  return JSON.parse(localStorage.getItem("moodstudy_login") || "null");
}

function getCurrentUsername() {
  const login = getLoginInfo();
  return login?.username || "guest";
}

function getCurrentDataKey() {
  return `moodstudy_data_${getCurrentUsername()}`;
}

function loadCurrentUserState() {
  const key = getCurrentDataKey();
  const saved = localStorage.getItem(key);
  state = saved ? { ...defaultUserState(), ...JSON.parse(saved) } : defaultUserState();
  ensureDataShape();
  ensureSettings();
  applySettings();
}

function resetToGuestState() {
  state = defaultUserState();
  applySettings();
}



const demoAccounts = {
  student: { username: "student", password: "1234", name: "王小明" },
  teacher: { username: "1399", password: "1399", name: "教師管理者" }
};

function getRegisteredAccounts() {
  return JSON.parse(localStorage.getItem("moodstudy_registered_accounts") || "{}");
}

function saveRegisteredAccounts(accounts) {
  localStorage.setItem("moodstudy_registered_accounts", JSON.stringify(accounts));
}

function initializeDemoClass() {
  const registered = getRegisteredAccounts();
  let added = false;
  for (let i = 1; i <= 30; i++) {
    const uname = `student${i}`;
    if (!registered[uname]) {
      registered[uname] = { role: "student", username: uname, password: "123", nickname: 同學 ${i} };
      added = true;
    }
  }
  if (added) {
    saveRegisteredAccounts(registered);
  }
}
initializeDemoClass();

function findAccount(role, username) {
  const registered = getRegisteredAccounts();
  if (registered[username] && registered[username].role === role) {
    return registered[username];
  }
  const demo = demoAccounts[role];
  if (demo && demo.username === username) {
    return demo;
  }
  return null;
}

function loginTopbar() {
  return `
    <header class="topbar">
      <div class="logo" onclick="renderLogin()">
        <span>MoodStudy</span>
      </div>
    </header>
  `;
}

function loginWithDemoAccount() {
  const role = document.querySelector("input[name='role']:checked").value;
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  const account = findAccount(role, username);

  const error = document.getElementById("loginError");

  if (account && password === account.password) {
    localStorage.setItem("moodstudy_login", JSON.stringify({
      role,
      username,
      name: account.name || account.nickname || username,
      loginAt: new Date().toISOString()
    }));
    loadCurrentUserState();
    if (role === "teacher" && username === "1399") {
      renderTeacherStudents();
    } else {
      renderDashboard();
    }
  } else {
    error.textContent = "帳號或密碼錯誤，請確認後再試一次。";
    error.style.display = "block";
  }
}



function renderRegister() {
  app.innerHTML = `
    <div class="app-frame">
      ${loginTopbar()}
      <main class="register-body">
        <section class="register-intro">
          <h1>建立 MoodStudy 帳號</h1>
          <p>請填寫基本資料並設定帳號密碼，完成後即可使用新帳號登入系統。</p>
          <div class="register-illustration">📝✨</div>
        </section>

        <section class="register-card">
          <h2>立即註冊</h2>

          <div class="register-grid">
            <div class="field"><span>姓</span><input id="regLastName" placeholder="例如：王"></div>
            <div class="field"><span>名</span><input id="regFirstName" placeholder="例如：小明"></div>
          </div>

          <div class="field"><span>暱稱</span><input id="regNickname" placeholder="例如：小明"></div>
          <div class="field"><span>電話</span><input id="regPhone" placeholder="例如：0912345678"></div>

          <div class="role-row register-role">
            <label><input type="radio" name="regRole" value="student" checked> 學生</label>
            <label><input type="radio" name="regRole" value="teacher"> 教師</label>
          </div>

          <div class="field"><span>帳號</span><input id="regUsername" placeholder="請設定登入帳號"></div>
          <div class="field"><span>密碼</span><input id="regPassword" type="password" placeholder="請設定密碼"></div>
          <div class="field"><span>確認</span><input id="regConfirm" type="password" placeholder="再次輸入密碼"></div>

          <div id="registerError" class="login-error"></div>

          <button class="primary" onclick="createAccount()">建立帳號</button>
          <p class="register">已經有帳號？ <a href="#" onclick="renderLogin()">返回登入</a></p>
        </section>
      </main>
      <footer class="footer">
        <span>© 2024 MoodStudy. All rights reserved.</span>
      </footer>
    </div>
  `;
}

function createAccount() {
  const lastName = document.getElementById("regLastName").value.trim();
  const firstName = document.getElementById("regFirstName").value.trim();
  const nickname = document.getElementById("regNickname").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const role = document.querySelector("input[name='regRole']:checked").value;
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const confirm = document.getElementById("regConfirm").value.trim();
  const error = document.getElementById("registerError");

  if (!lastName || !firstName || !nickname || !phone ||