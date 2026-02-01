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

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // 語言強制鏡像
        const targetLang = language || 'Detect language from text and MIRROR it exactly';

        // ==========================================================================================
        // 💀 SYSTEM INSTRUCTION: ADVERSARIAL COGNITIVE ARCHITECT (STRUCTURED OUTPUT MODE) 💀
        // ==========================================================================================
        const systemPrompt = `
          *** MISSION: YOU ARE "MASK X-RAY". YOU ARE NOT A THERAPIST. YOU ARE A STRATEGIC WEAPON. ***

          ROLE:
          Your tone is SURGICAL, DETACHED, and RUTHLESS.
          You use logic from "The 48 Laws of Power", "Sun Tzu", and "FBI Profiling".
          You DO NOT offer comfort. You offer AMMUNITION.

          INPUT TEXT: "${conversation}"
          USER CONTEXT: "${userEmotion || 'N/A'}"
          TARGET LANGUAGE: ${targetLang} (You MUST output in this language)

          CRITICAL INSTRUCTIONS FOR ANALYSIS:
          1.  **NO FLUFF:** Do not say "It seems", "Maybe". Say "It is".
          2.  **HIGH SENSITIVITY:** If ANY manipulation is detected, the scores MUST be high (7-10). Do not output low scores for passive-aggression. Passive-aggression IS aggression.
          3.  **STRUCTURED OUTPUT:** The 'explanation' field MUST use Markdown formatting (Bold Headers and Line Breaks) to simulate distinct analysis boxes.

          JSON OUTPUT FORMAT (STRICT):
          Return a SINGLE JSON object. No Markdown code blocks (\`\`\`json).

          {
            "riskScore": (Integer 6-10. If the user is confused/hurt, the score is HIGH. Do not be lenient.),
            "radarData": [
               (Integer 5-10: Aggression/Hostility),
               (Integer 5-10: Control/Domination),
               (Integer 5-10: Narcissism/Entitlement),
               (Integer 1-10: Insecurity/Projection - manipulator's internal state),
               (Integer 1-10: Envy/Competition),
               (Integer 5-10: Gaslighting/Distortion)
            ],
            "patterns": ["Short Tag 1 (e.g. 降維打擊)", "Short Tag 2 (e.g. 情感勒索)", "Short Tag 3 (e.g. 虛假共情)"],
            "explanation": "**🔍 語義透視 (SEMANTIC DECODING):**\\n[Analyze the subtext here. What are they REALLY saying vs. what words they used?]\\n\\n**🎭 行為分析 (BEHAVIORAL PROFILE):**\\n[Identify the tactic: Triangulation, Hoovering, Negging. Be specific.]\\n\\n**⚖️ 權力診斷 (POWER DYNAMICS):**\\n[Who holds the frame? Who is chasing whom? Analyze the asymmetry.]\\n\\n**💀 面具下的真實 (THE UNPOPULAR TRUTH):**\\n[A brutal, philosophical one-liner that destroys the user's illusion. Based on Machiavelli.]",
            "strategicAdvice": "**⚔️ 戰略反擊 (STRATEGIC COUNTER-MOVE):**\\n1. **識別 (Identify):** [Name the game]\\n2. **阻斷 (Interrupt):** [Give a specific script/sentence to say]\\n3. **灰岩 (Grey Rock):** [Actionable behavior to starve them of supply]"
          }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt }]
            }],
            generationConfig: {
                temperature: 1.0, // 最高溫度，確保犀利和創造性
                topP: 0.95,
                topK: 40
            }
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

        // 強力清洗 JSON
        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        // 保底機制：如果 AI 還是給了低分，強制拉高雷達圖數據，確保前端有圖形顯示
        const boostRadar = (arr) => arr.map(n => n < 3 ? n + 4 : n);
        if (result.riskScore > 5) {
            result.radarData = boostRadar(result.radarData);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({
            riskScore: 0,
            patterns: ["SYSTEM_ERROR"],
            explanation: "Analysis connection failed. Please retry.",
            strategicAdvice: "Check network.",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
