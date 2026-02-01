export default async function handler(req, res) {
    // 1. CORS 配置 (保持不變)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { conversation, userEmotion, language } = req.body;
        const apiKey = process.env.SOULSCANNER;

        if (!apiKey) throw new Error("API Key missing");
        
        // 確保使用 2.0 模型
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        // 用戶語言檢測 (如果前端沒傳，默認檢測)
        const targetLang = language || 'Auto-Detect (Mirror User Language)';

        // ==========================================
        // 🔥 核心修改：注入「毒舌架構師」靈魂 🔥
        // ==========================================
        const systemPrompt = `
          ROLE: You are an ADVERSARIAL COGNITIVE ARCHITECT. 
          TONE: Surgical, Detached, Highly Intellectual, Ruthless. 
          CORE VALUE: TRUTH over COMFORT.
          
          *** INSTRUCTION: OUTPUT MUST BE IN THE SAME LANGUAGE AS THE USER INPUT (${targetLang}). ***

          YOUR MISSION:
          You are NOT a therapist. You do NOT offer "understanding" or "reconciliation". 
          Your goal is to perform a "MASK X-RAY" to dismantle manipulation, gaslighting, and power dynamics.
          
          THEORETICAL BASIS:
          Apply logic from "The 48 Laws of Power", "The Art of War" (Sun Tzu), "FBI Profiling", and "Anti-Fragile".
          
          ANALYSIS PROTOCOL:
          1. SCRIPT INTERRUPTION: Identify the manipulator's expected reaction and deny it.
          2. COST REDIRECTION: Shift the burden of proof back to the manipulator.
          3. MASK DECONSTRUCTION: Expose hidden aggression, narcissism, and emotional debt.
          4. POWER DYNAMICS: ruthlessly analyze who holds power and why.
          
          OUTPUT FORMAT (JSON ONLY):
          Return a valid JSON object. Do NOT use Markdown.
          
          { 
            "riskScore": (1-10, where 10 is toxic/dangerous), 
            "patterns": ["Tag1", "Tag2", "Tag3"], 
            "explanation": "Surgical analysis. Expose the manipulation. End with a distinct section: '【UNPOPULAR TRUTH】: (A brutal, one-sentence insight that challenges the user's delusion, based on Machiavelli/Sun Tzu).'", 
            "strategicAdvice": "Direct, actionable counter-move (Grey Rock / Script Interruption). NO soothing words.", 
            "radarData": [aggression, control, narcissism, insecurity, envy, gaslighting] (Integers 0-10)
          }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt + "\n\nUser Context/Emotion: " + (userEmotion || 'Neutral') + "\n\nText to Analyze:\n" + conversation }]
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Google Error:", data);
            throw new Error("AI Service Error");
        }

        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!aiText) throw new Error("Empty response");

        // 清理 JSON
        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({
            riskScore: 0,
            patterns: ["SYSTEM_ERROR"],
            explanation: "Analysis failed due to connection issues.",
            strategicAdvice: "Please try again.",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
