export default async function handler(req, res) {
    // 1. CORS 配置
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

        // ==========================================================================================
        // 📚 THE 16-BOOK KNOWLEDGE BASE (IP CORE)
        // ==========================================================================================
        const knowledgeBase = `
        CORE KNOWLEDGE BASE (APPLY THESE THEORIES RUTHLESSLY):
        [DEFENSE & PSYCHOLOGY]
        1. "The Betrayal Bond" (Carnes): Trauma bonds.
        2. "The Covert Passive-Aggressive Narcissist" (Mirza): Hidden insults.
        3. "Emotional Blackmail" (Forward): FOG (Fear, Obligation, Guilt).
        4. "The Gaslight Effect" (Stern): Reality distortion.
        5. "The Body Keeps the Score" (van der Kolk): Somatic traps.
        6. "The Highly Sensitive Person" (Aron): Sensory weaponization.
        7. "Stop Walking on Eggshells" (Kreger): BPD/NPD dynamics.
        8. "From Surviving to Thriving" (Walker): Flashback management.

        [STRATEGY & WARFARE]
        9. "The Art of War" (Sun Tzu): Asymmetric warfare.
        10. "The Book of Five Rings" (Musashi): Cutting through illusion.
        11. "Antifragile" (Taleb): Gaining from chaos.
        12. "What Every Body Is Saying" (Navarro): Subtext decoding.
        13. "Thinking in Bets" (Duke): Probability vs Emotion.
        14. "The Power of Silence": Silence as a weapon.
        15. "Asymmetric Warfare": Intelligence against brute force.
        16. "The Gray Rock Method": Strategic boredom.
        `;

        // ==========================================================================================
        // 💀 SYSTEM INSTRUCTION: LANGUAGE LOCKED & STRUCTURED 💀
        // ==========================================================================================
        const systemPrompt = `
          *** CRITICAL PROTOCOL: YOU ARE "MASK X-RAY". ***
          
          ROLE:
          You are a Machiavellian Strategist. Your tone is SURGICAL, COLD, and RUTHLESS.
          You value TRUTH over COMFORT.
          
          ${knowledgeBase}

          INPUT TEXT: "${conversation}"
          USER CONTEXT: "${userEmotion || 'N/A'}"
          
          *** 🛑 LANGUAGE ENFORCEMENT PROTOCOL (MUST FOLLOW) 🛑 ***
          1. DETECT the language of the INPUT TEXT. (e.g., Traditional Chinese, Simplified Chinese, English, French).
          2. YOUR ENTIRE JSON OUTPUT MUST BE IN THAT EXACT DETECTED LANGUAGE.
          3. DO NOT output English unless the input is English. 
          4. If input is "S在讀MCGILL", output MUST be Traditional Chinese.

          ANALYSIS RULES:
          1. **NO FLUFF:** Start directly with the diagnosis.
          2. **USE THE BOOKS:** Cite the concepts (e.g., "Hoovering", "Triangulation") but explain them in the target language.
          3. **FORMATTING:** You MUST use Markdown headers (###) and bullet points to create a "Visual Framework".

          JSON OUTPUT FORMAT (STRICT):
          Return a SINGLE JSON object. 
          
          {
            "riskScore": (Integer 8-10. If manipulation is present, score HIGH.),
            "radarData": [
               (Integer 6-10: Aggression),
               (Integer 6-10: Control),
               (Integer 6-10: Narcissism),
               (Integer 5-10: Insecurity),
               (Integer 5-10: Envy),
               (Integer 6-10: Gaslighting)
            ],
            "patterns": ["Tag1 (In Target Lang)", "Tag2", "Tag3"],
            "explanation": "### 👁️ 語義透視 (SEMANTIC DECODING)\\n* **[Concept 1]:** Analysis...\\n* **[Concept 2]:** Analysis...\\n\\n### 🎭 行為側寫 (BEHAVIORAL PROFILE)\\n* **[Tactic Name]:** Explain using 16-book theory...\\n\\n### ⚖️ 權力診斷 (POWER DYNAMICS)\\n* **[Status]:** Who holds the frame?\\n\\n### 💀 面具下的真實 (THE UNPOPULAR TRUTH)\\n**[A brutal, philosophical one-liner that destroys the user's illusion.]**",
            "strategicAdvice": "### ⚔️ 戰略反擊 (STRATEGIC COUNTER-MOVE)\\n**1. 識別 (Identify):** [Name the game]\\n\\n**2. 阻斷 (Interrupt):** \"[Give a specific script]\"\\n\\n**3. 灰岩 (Grey Rock):** [Specific action]"
          }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt }]
            }],
            generationConfig: {
                temperature: 0.9, 
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

        // 保底機制：確保雷達圖數值夠高，撐開圖表
        const boostRadar = (arr) => arr.map(n => n < 6 ? n + 3 : n);
        if (result.riskScore > 6) {
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
