export default async function handler(req, res) {
    // 1. 設置標準標頭 (CORS) - 確保前端能收到數據
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    // 處理瀏覽器預檢請求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 2. 獲取前端數據
        // conversation: 對話內容
        // userEmotion: 用戶心情
        // language: 用戶選擇的語言 (關鍵！我們將使用這個變量)
        const { conversation, userEmotion, language } = req.body;
        const apiKey = process.env.SOULSCANNER;

        // 3. 檢查 API Key (雙重保險)
        if (!apiKey) {
            throw new Error("Server API Key missing");
        }

        // 4. 準備調用 Google (使用穩定的 2.0 模型)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        // 5. 定義動態提示詞 (核心邏輯)
        // 如果前端沒傳語言，默認用英文(en)，如果有傳則用前端的
        const targetLang = language || 'en'; 

        const systemPrompt = `
          You are "Soul Scanner", a cognitive defense AI designed to detect manipulation.
          
          *** CRITICAL INSTRUCTION: OUTPUT MUST BE IN THIS LANGUAGE: ${targetLang} ***
          
          Your Persona:
          - Tone: Sharp, penetrating, slightly "toxic" (brutally honest), and direct.
          - Role: A "Mask X-Ray" that sees through gaslighting, PUA, and hypocrisy.
          - Do NOT be a gentle therapist. Be a cold, hard truth-teller.
          
          Your Task:
          Analyze the provided text (dialogue or monologue).
          1. Identify the hidden motive.
          2. Rate the toxicity.
          3. Give a strategic counter-move.

          Return ONLY valid JSON. No markdown. No introductory text.
          
          JSON Format:
          { 
            "riskScore": (number 1-10, 10 is extreme danger), 
            "patterns": ["Short Tag 1", "Short Tag 2", "Short Tag 3"], 
            "explanation": "A sharp, 2-sentence analysis in ${targetLang}. Expose the manipulation directly.", 
            "strategicAdvice": "One concrete, actionable counter-move in ${targetLang}.", 
            "radarData": [aggression, control, narcissism, insecurity, envy, gaslighting] (values 0-10)
          }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt + "\n\nUser Context/Emotion: " + (userEmotion || 'Neutral') + "\n\nText to Analyze:\n" + conversation }]
            }]
        };

        // 6. 發送請求
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 7. 錯誤攔截 (如果 Google 報錯，以友好方式返回，不讓前端崩潰)
        if (!response.ok) {
            console.error("Google API Error:", data);
            return res.status(200).json({ 
                riskScore: 0,
                patterns: ["API_ERROR"],
                explanation: (targetLang === 'zh-CN' || targetLang === 'zh-TW') ? 
                    "AI 服務暫時繁忙 (Google API Error)。請稍後再試。" : 
                    "AI Service is busy (Google API Error). Please try again later.",
                strategicAdvice: "Check Vercel Logs.",
                radarData: [0, 0, 0, 0, 0, 0]
            });
        }

        // 8. 解析結果
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) throw new Error("Empty response from AI");

        // 清理 JSON (去掉 Markdown 格式)
        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        // 成功返回
        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Crash:", error);
        // 捕獲所有其他錯誤
        return res.status(200).json({
            riskScore: 0,
            patterns: ["SYSTEM_ERROR"],
            explanation: "Connection failed. Please refresh and try again.",
            strategicAdvice: "Server Error.",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
