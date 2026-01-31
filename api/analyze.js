export default async function handler(req, res) {
    // 1. 設置標準標頭 (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 2. 獲取前端數據
        const { conversation, userEmotion } = req.body;
        const apiKey = process.env.SOULSCANNER;

        // 3. 準備發給 Google 的數據 (已升級為 2.5-flash)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const systemPrompt = `
          Analyze this dialogue for "Mask X-Ray". 
          Return ONLY valid JSON. No markdown.
          Format: { "riskScore": number, "patterns": [], "explanation": "string", "strategicAdvice": "string", "radarData": [0,0,0,0,0,0] }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt + "\n\nUser Context: " + (userEmotion || 'None') + "\n\nDialogue:\n" + conversation }]
            }]
        };

        // 4. 真實調用 Google
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 5. 錯誤處理 (保留顯微鏡功能，以防萬一)
        if (!response.ok) {
            console.error("Google Error:", data);
            return res.status(200).json({ 
                riskScore: 0,
                patterns: ["API_ERROR"],
                explanation: `【模型錯誤】\n${data.error?.message || JSON.stringify(data)}\n請檢查 Vercel 日誌。`,
                strategicAdvice: "請嘗試將代碼中的 gemini-2.5-flash 改為 gemini-2.0-flash。",
                radarData: [0, 0, 0, 0, 0, 0]
            });
        }

        // 6. 解析 AI 的回覆
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) throw new Error("Google 返回了空數據");

        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({
            riskScore: 0,
            patterns: ["SYSTEM_CRASH"],
            explanation: `【系統內部錯誤】\n${error.message}`,
            strategicAdvice: "請截圖反饋。",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
