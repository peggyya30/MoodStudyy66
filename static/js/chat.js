document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. MoodStudy 園丁 AI 設定
    // ==========================================
    // 請在 config.js 中設定：
    // window.GEMINI_API_KEY = "你的 Gemini API Key";
    // window.GEMINI_MODEL = "gemini-2.0-flash";

    const API_KEY = window.GEMINI_API_KEY || "";
    const MODEL = window.GEMINI_MODEL || "gemini-2.0-flash";

    // ==========================================
    // 1. 懸浮視窗開關邏輯
    // ==========================================
    const chatBtn = document.getElementById('chat-widget-btn');
    const chatWindow = document.getElementById('chat-widget-window');
    const closeBtn = document.getElementById('chat-widget-close');

    if (!chatBtn || !chatWindow || !closeBtn) {
        console.warn("MoodStudy 園丁 AI：找不到聊天視窗元素。");
        return;
    }

    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden-widget');
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden-widget');
    });

    // ==========================================
    // 2. 對話與記憶邏輯
    // ==========================================
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    if (!chatContainer || !userInput || !sendBtn) {
        console.warn("MoodStudy 園丁 AI：找不到輸入框或送出按鈕。");
        return;
    }

    let chatHistory = JSON.parse(localStorage.getItem('lms_chat_history')) || [];

    chatHistory.forEach(msg => {
        appendMessage(msg.role === 'user' ? '我' : '心靈園丁', msg.content);
    });

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.style.margin = "10px 0";
        msgDiv.style.padding = "10px";
        msgDiv.style.borderRadius = "10px";
        msgDiv.style.lineHeight = "1.6";
        msgDiv.style.whiteSpace = "pre-wrap";
        msgDiv.style.backgroundColor = sender === '我' ? '#e3f2fd' : '#f1f8e9';
        msgDiv.innerHTML = `<strong>${sender}：</strong> ${escapeHtml(text)}`;
        chatContainer.appendChild(msgDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function escapeHtml(text) {
        return String(text)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function buildGeminiHistory(history) {
        const sanitizedHistory = [];

        for (const msg of history) {
            const role = msg.role === 'user' ? 'user' : 'model';

            if (
                sanitizedHistory.length === 0 ||
                sanitizedHistory[sanitizedHistory.length - 1].role !== role
            ) {
                sanitizedHistory.push({
                    role,
                    parts: [{ text: msg.content }]
                });
            } else {
                sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += "\n" + msg.content;
            }
        }

        if (sanitizedHistory.length > 0 && sanitizedHistory[0].role !== 'user') {
            sanitizedHistory.unshift({
                role: 'user',
                parts: [{ text: '嗨，請用繁體中文陪我聊天。' }]
            });
        }

        return sanitizedHistory;
    }

    function getFallbackReply(userText) {
        const text = userText.toLowerCase();

        if (text.includes("整理") || text.includes("房間") || text.includes("打掃")) {
            return `可以，我先幫你拆成小步驟，不用一次全部做完：

1. 先把垃圾丟掉
2. 把衣服分類收好
3. 整理桌面雜物
4. 擦桌面或櫃子
5. 最後掃地或拖地

你先做第 1 步就好，完成一點點也算開始了。`;
        }

        if (text.includes("壓力") || text.includes("焦慮") || text.includes("煩") || text.includes("累")) {
            return `辛苦了，你現在應該真的撐很久了。

先不要急著把所有事情做好，我建議你先做三件小事：
1. 喝一口水
2. 深呼吸 3 次
3. 選一件 10 分鐘內可以完成的小任務

你不用一次恢復滿血，先讓自己慢慢穩下來就好。`;
        }

        if (text.includes("報告") || text.includes("考試") || text.includes("作業")) {
            return `可以，我幫你抓一個開始方向：

1. 先確認題目或範圍
2. 列出要完成的 3 個重點
3. 找資料或整理筆記
4. 先完成最簡單的一小段
5. 最後再檢查格式與內容

先從「列出重點」開始，壓力會小很多。`;
        }

        return `我在這裡陪你。你可以把現在最卡的事情講出來，我可以幫你：

1. 拆成小任務
2. 找開始的第一步
3. 給你學習或生活建議
4. 陪你整理壓力

先不用講得很完整，打一兩句也可以。`;
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        appendMessage('我', text);
        chatHistory.push({ role: 'user', content: text });
        userInput.value = '';

        const loadingId = 'loading-' + Date.now();
        chatContainer.innerHTML += `<div id="${loadingId}" style="color: gray; font-style: italic; margin: 10px 0;">園丁正在整理思緒...</div>`;
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
                throw new Error("API_KEY_MISSING");
            }

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{
                                text: `
你是 MoodStudy 的「心靈園丁 AI」，是一位溫柔、幽默、實用的學習陪伴者。

你的功能不是只回答課業，也不是只拆讀書任務。你可以協助：
1. 學習建議與考試、報告規劃
2. To-Do 任務拆解
3. 生活任務規劃，例如整理房間、洗衣服、打掃
4. 壓力紓解與情緒陪伴
5. 專案、簡報、程式與習慣養成建議
6. 大方向問題分析與下一步建議

回答規則：
- 一律使用繁體中文
- 語氣溫柔、自然、不要太官方
- 回答不要太長，優先具體可執行
- 不要把所有問題都硬轉成讀書內容
- 如果使用者輸入生活任務，請依照生活任務拆解
- 如果使用者輸入學習任務，請依照學習任務拆解
- 如果使用者情緒不好，先安撫，再給簡單建議
- 如果使用者只是輸入一個任務，請拆成 3 到 5 個小步驟
- 每個小步驟盡量簡短
                                `
                            }]
                        },
                        contents: buildGeminiHistory(chatHistory)
                    })
                }
            );

            const data = await response.json();
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();

            if (response.ok && data.candidates && data.candidates.length > 0) {
                const replyText = data.candidates[0].content.parts[0].text;
                appendMessage('心靈園丁', replyText);

                chatHistory.push({ role: 'model', content: replyText });
                localStorage.setItem('lms_chat_history', JSON.stringify(chatHistory));
            } else {
                console.error("Gemini API error:", data);

                if (data.error && String(data.error.message).includes("quota")) {
                    const fallback = getFallbackReply(text);
                    appendMessage('心靈園丁', fallback);
                    chatHistory.push({ role: 'model', content: fallback });
                    localStorage.setItem('lms_chat_history', JSON.stringify(chatHistory));
                } else {
                    appendMessage('系統', 'API 回傳發生錯誤：' + (data.error ? data.error.message : '未知錯誤'));
                }
            }

        } catch (error) {
            const loading = document.getElementById(loadingId);
            if (loading) loading.remove();

            console.error("Fetch error:", error);

            if (error.message === "API_KEY_MISSING") {
                appendMessage('系統', 'API Key 未設定，請到 config.js 填入 Gemini API Key。');
            } else {
                const fallback = getFallbackReply(text);
                appendMessage('心靈園丁', fallback);
                chatHistory.push({ role: 'model', content: fallback });
                localStorage.setItem('lms_chat_history', JSON.stringify(chatHistory));
            }
        }
    }

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
