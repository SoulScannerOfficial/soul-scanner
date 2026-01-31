export const config = {
    maxDuration: 60, // 延長超時時間，防止 AI 思考太久報錯
};

export default async function handler(req, res) {
    // 1. 處理 CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { conversation, language, userEmotion } = req.body;

        // 2. 檢查 API Key (這裡是關鍵)
        const apiKey = process.env.SOULSCANNER;
        if (!apiKey) {
            console.error("CRITICAL ERROR: API Key is missing in server environment!");
            return res.status(500).json({ error: 'Server Configuration Error: Missing API Key' });
        }

        // 3. 定義 Prompt
        const systemPrompt = `
          You are Soul Scanner, an AI cognitive prosthesis.
          Analyze this dialogue for "Mask X-Ray".
          Output strictly in JSON format. Do not use Markdown code blocks.
          
          JSON Structure:
          {
            "riskScore": (number 1-10),
            "patterns": ["tag1", "tag2"],
            "explanation": "Short analysis.",
            "strategicAdvice": "One tactic.",
            "radarData": [0,0,0,0,0,0]
          }
          User Context: ${userEmotion || 'uncertain'}
        `;

        // 4. 調用 Google API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt + "\n\nDialogue:\n" + conversation }]
                    }]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error Details:", JSON.stringify(data));
            return res.status(500).json({ error: 'AI Service Error', details: data });
        }

        // 5. 解析結果 (防彈邏輯)
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiText) {
             console.error("AI returned empty response (Safety Block?)");
             return res.status(500).json({ error: 'AI Safety Block - Content filtered' });
        }

        // 提取 JSON (無論 AI 說了什麼廢話，只抓取 {} 之間的內容)
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("AI output invalid JSON:", aiText);
            throw new Error("Invalid JSON format from AI");
        }
        
        const result = JSON.parse(jsonMatch[0]);
        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Crash:", error);
        return res.status(500).json({ error: 'Internal Processing Error', message: error.message });
    }
}
