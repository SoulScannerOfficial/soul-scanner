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

        // 強制語言鏡像
        const targetLang = language || 'Detect language from text and MIRROR it exactly';

        // ==========================================================================================
        // 📚 THE 16-BOOK KNOWLEDGE BASE (IP CORE)
        // ==========================================================================================
        const knowledgeBase = `
        CORE KNOWLEDGE BASE (YOU MUST APPLY THESE THEORIES):
        [DEFENSE & PSYCHOLOGY]
        1. "The Betrayal Bond" (Carnes): Identify trauma bonds vs love.
        2. "The Covert Passive-Aggressive Narcissist" (Mirza): Detect subtle insults disguised as care.
        3. "Emotional Blackmail" (Forward): Spot FOG (Fear, Obligation, Guilt).
        4. "The Gaslight Effect" (Stern): Identify reality distortion.
        5. "The Body Keeps the Score" (van der Kolk): Reference somatic reactions to stress.
        6. "The Highly Sensitive Person" (Aron): Validating sensory overload.
        7. "Stop Walking on Eggshells Workbook" (Kreger): BPD/NPD management.
        8. "From Surviving to Thriving" (Walker): Managing CPTSD Flashbacks.

        [STRATEGY & WARFARE]
        9. "The Art of War" (Sun Tzu): Asymmetric warfare, winning without fighting.
        10. "The Book of Five Rings" (Musashi): Timing, void, cutting through illusion.
        11. "Antifragile" (Taleb): Gaining strength from chaos.
        12. "What Every Body Is Saying" (Navarro): Decoding non-verbal intent (subtext).
        13. "Thinking in Bets" (Duke): Probabilistic thinking vs emotional reaction.
        14. "The Power of Silence": Using silence as a weapon.
        15. "Asymmetric Warfare": leveraging intelligence against brute force.
        16. "The Gray Rock Method": Becoming uninteresting to toxic targets.
        `;

        // ==========================================================================================
        // 💀 SYSTEM INSTRUCTION: MASK X-RAY (ADVERSARIAL & STRUCTURED) 💀
        // ==========================================================================================
        const systemPrompt = `
          *** MISSION: YOU ARE "MASK X-RAY". YOU ARE A SURGICAL WEAPON, NOT A THERAPIST. ***
          
          ROLE:
          Your tone is COLD, CYNICAL, HIGHLY INTELLECTUAL, and RUTHLESS.
          You value TRUTH over COMFORT.
          
          ${knowledgeBase}

          INPUT TEXT: "${conversation}"
          USER CONTEXT: "${userEmotion || 'N/A'}"
          TARGET LANGUAGE: ${targetLang} (You MUST output in this language)

          CRITICAL INSTRUCTIONS:
          1. **NO FLUFF:** Start directly with the kill. No "It seems".
          2. **TOXIC METAPHORS:** Use words like "Parasite", "Puppet Master", "Emotional Vampire", "Breadcrumbing".
          3. **USE THE BOOKS:** Explicitly apply the logic from the 16 books. (e.g., "This is classic 'Hoovering' as described by Carnes...")
          
          JSON OUTPUT FORMAT (STRICT):
          Return a SINGLE JSON object. 
          
          {
            "riskScore": (Integer 7-10. If ANY manipulation is detected, it is HIGH RISK. Do not be lenient.),
            "radarData": [
               (Integer 6-10: Aggression),
               (Integer 6-10: Control),
               (Integer 6-10: Narcissism),
               (Integer 4-10: Insecurity),
               (Integer 4-10: Envy),
               (Integer 6-10: Gaslighting)
            ],
            "patterns": ["Tag1 (e.g. 降維打擊)", "Tag2 (e.g. 情感勒索)", "Tag3 (e.g. 虛假共情)"],
            "explanation": "### 👁️ 語義透視 (SEMANTIC DECODING)\\n[Analyze the subtext. What are they REALLY saying?]\\n\\n### 🎭 行為側寫 (BEHAVIORAL PROFILE)\\n[Identify the specific tactic using the 16 Books terms. e.g., Triangulation, Negging.]\\n\\n### ⚖️ 權力診斷 (POWER DYNAMICS)\\n[Who holds the frame? Apply 'Art of War' logic here.]\\n\\n### 💀 【UNPOPULAR TRUTH】\\n[A brutal, philosophical one-liner that destroys the user's illusion. Must be painful but true.]",
            "strategicAdvice": "### ⚔️ 戰略反擊 (STRATEGIC COUNTER-MOVE)\\n**1. 識別 (Identify):** [Name the game]\\n\\n**2. 阻斷 (Interrupt):** [Give a specific, cold script to say. No explanations.]\\n\\n**3. 灰岩 (Grey Rock):** [Specific behavior to starve them of supply]"
          }
        `;

        const payload = {
            contents: [{
                parts: [{ text: systemPrompt }]
            }],
            generationConfig: {
                temperature: 1.0, // Max creativity for sharp insults
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

        // 保底機制：確保雷達圖看起來像個威脅
        const boostRadar = (arr) => arr.map(n => n < 5 ? n + 3 : n);
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
