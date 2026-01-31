export default async function handler(req, res) {
    // 1. 設置基礎標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    // 2. 處理 OPTIONS 請求 (瀏覽器預檢)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 3. 檢查 API Key 是否存在 (這是關鍵測試點！)
        const apiKey = process.env.SOULSCANNER;
        const keyStatus = apiKey ? "✅ 鑰匙已讀取" : "❌ 鑰匙丟失";
        const keyPreview = apiKey ? apiKey.substring(0, 5) + "..." : "None";

        // 4. 不調用 Google，直接返回一個「假結果」
        // 這會讓前端以為 AI 已經分析完了，並顯示出來
        const fakeResult = {
            riskScore: 1,
            patterns: ["DEBUG_MODE", "CONNECTION_TEST"],
            explanation: `【系統自檢報告】\n服務器連接：正常。\nAPI Key狀態：${keyStatus} (${keyPreview})。\n如果看到這段話，說明你的 Vercel 是完全健康的，問題出在 Google Gemini API 的調用上。`,
            strategicAdvice: "請截圖告訴我這段話顯示了什麼，我們就能鎖定最後的兇手。",
            radarData: [5, 5, 5, 5, 5, 5]
        };

        return res.status(200).json(fakeResult);

    } catch (error) {
        return res.status(500).json({ error: 'Server Error', details: error.message });
    }
}
