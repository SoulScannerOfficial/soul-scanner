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

        // 3. 準備發給 Google 的數據
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
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

        // 4. 真實調用 Google (帶顯微鏡)
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // ========== 關鍵診斷區 ==========
        
        // 如果 Google 拒絕請求 (比如 400, 403, 404, 500)
        if (!response.ok) {
            console.error("Google Error:", data);
            return res.status(200).json({ // 這裡故意返回 200，讓前端能顯示錯誤信息
                riskScore: 0,
                patterns: ["API_ERROR"],
                explanation: `【Google 拒絕了請求】\n狀態碼: ${response.status}\n錯誤信息: ${JSON.stringify(data.error || data)}`,
                strategicAdvice: "請截圖這個錯誤信息給我，馬上就能修好。",
                radarData: [0, 0, 0, 0, 0, 0]
            });
        }

        // 如果成功，解析 AI 的回覆
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) {
             throw new Error("Google 返回了空數據 (可能是安全過濾)");
        }

        // 清理 JSON (去掉可能存在的 ```json 包裹)
        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        // 成功返回！
        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Error:", error);
        // 捕獲所有其他錯誤並顯示
        return res.status(200).json({
            riskScore: 0,
            patterns: ["SYSTEM_CRASH"],
            explanation: `【系統內部錯誤】\n${error.message}`,
            strategicAdvice: "代碼運行時崩潰，請截圖。",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
