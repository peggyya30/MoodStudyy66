// ====== Botpress 動態加載邏輯 ======
// 此檔案由 teammate_script.js 移出，並加入了 Race Condition (非同步競爭) 的修復
// 目的：讓貓咪聊天機器人的載入程式獨立管理，避免主程式過長。

function loadBotpress() {
  if (document.getElementById('bp-inject-script')) {
    if (window.botpress) window.botpress.sendEvent({ type: "show" });
    const widget = document.getElementById('bp-web-widget-container');
    if (widget) widget.style.display = 'block';
    return;
  }
  
  const injectScript = document.createElement('script');
  injectScript.id = 'bp-inject-script';
  // 載入 Botpress 核心
  injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.2/inject.js'; 
  
  // 核心載入「完成後」，才載入組態檔，避免 Cannot read properties of undefined (reading 'init')
  injectScript.onload = () => {
    const configScript = document.createElement('script');
    configScript.src = 'https://files.bpcontent.cloud/2026/06/10/15/20260610150935-LRH30M5J.js';
    configScript.defer = true;
    document.body.appendChild(configScript);
  };
  
  document.body.appendChild(injectScript);
}

function hideBotpress() {
  if (window.botpress) window.botpress.sendEvent({ type: "hide" });
  const widget = document.getElementById('bp-web-widget-container');
  if (widget) widget.style.display = 'none';
}

window.loadBotpress = loadBotpress;
window.hideBotpress = hideBotpress;
