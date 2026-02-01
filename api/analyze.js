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
        // 🌍 LANGUAGE ROUTER (THE FIX)
        // 根據前端傳來的 language 參數，動態生成對應語言的 Prompt 模板
        // ==========================================================================================
        
        // 默認英語，防止 undefined
        const safeLang = language || 'en';

        const LANG_CONFIG = {
            'fr': {
                role: "Vous êtes 'MASK X-RAY', une arme stratégique d'analyse cognitive.",
                target: "Français (French)",
                headers: {
                    semantic: "👁️ DÉCODAGE SÉMANTIQUE",
                    behavior: "🎭 PROFIL COMPORTEMENTAL",
                    power: "⚖️ DYNAMIQUE DE POUVOIR",
                    truth: "💀 LA VÉRITÉ BRUTALE (UNPOPULAR TRUTH)",
                    strategy: "⚔️ CONTRE-STRATÉGIE"
                },
                tags_example: '["Dévalorisation", "Manipulation", "Gaslighting"]',
                rule: "Répondez STRICTEMENT en Français. Ne jamais utiliser l'anglais ou le chinois."
            },
            'zh_cn': {
                role: "你是 'MASK X-RAY'，一把認知手術刀。",
                target: "Simplified Chinese (简体中文)",
                headers: {
                    semantic: "👁️ 语义透视",
                    behavior: "🎭 行为侧写",
                    power: "⚖️ 权力诊断",
                    truth: "💀 面具下的真实 (UNPOPULAR TRUTH)",
                    strategy: "⚔️ 战略反击"
                },
                tags_example: '["降维打击", "情感勒索", "煤气灯效应"]',
                rule: "必须使用简体中文回答。"
            },
            'zh_tw': {
                role: "你是 'MASK X-RAY'，一把認知手術刀。",
                target: "Traditional Chinese (繁體中文)",
                headers: {
                    semantic: "👁️ 語義透視",
                    behavior: "🎭 行為側寫",
                    power: "⚖️ 權力診斷",
                    truth: "💀 面具下的真實 (UNPOPULAR TRUTH)",
                    strategy: "⚔️ 戰略反擊"
                },
                tags_example: '["降維打擊", "情感勒索", "煤氣燈效應"]',
                rule: "必須使用繁體中文回答。"
            },
            'en': {
                role: "You are 'MASK X-RAY', a strategic cognitive weapon.",
                target: "English",
                headers: {
                    semantic: "👁️ SEMANTIC DECODING",
                    behavior: "🎭 BEHAVIORAL PROFILE",
                    power: "⚖️ POWER DYNAMICS",
                    truth: "💀 THE UNPOPULAR TRUTH",
                    strategy: "⚔️ STRATEGIC COUNTER-MOVE"
                },
                tags_example: '["Devaluation", "Triangulation", "Gaslighting"]',
                rule: "Answer STRICTLY in English."
            }
        };

        // 獲取當前語言配置，如果找不到就回退到英文
        const config = LANG_CONFIG[safeLang] || LANG_CONFIG['en'];

        // ==========================================================================================
        // 📚 THE 16-BOOK KNOWLEDGE BASE (Pure Logic, No Language Bias)
        // ==========================================================================================
        const knowledgeBase = `
        CORE KNOWLEDGE BASE:
        1. "The Betrayal Bond" (Carnes)
        2. "The Covert Passive-Aggressive Narcissist" (Mirza)
        3. "Emotional Blackmail" (Forward)
        4. "The Gaslight Effect" (Stern)
        5. "The Body Keeps the Score" (van der Kolk)
        6. "The Highly Sensitive Person" (Aron)
        7. "Stop Walking on Eggshells" (Kreger)
        8. "From Surviving to Thriving" (Walker)
        9. "The Art of War" (Sun Tzu)
        10. "The Book of Five Rings" (Musashi)
        11. "Antifragile" (Taleb)
        12. "What Every Body Is Saying" (Navarro)
        13. "Thinking in Bets" (Duke)
        14. "The Power of Silence"
        15. "Asymmetric Warfare"
        16. "The Gray Rock Method"
        `;

        // ==========================================================================================
        // 💀 DYNAMIC SYSTEM INSTRUCTION 💀
        // ==========================================================================================
        const systemPrompt = `
          *** CRITICAL PROTOCOL: LANGUAGE MODE = ${config.target} ***
          
          ROLE: ${config.role}
          TONE: SURGICAL, COLD, RUTHLESS. TRUTH OVER COMFORT.
          
          ${knowledgeBase}

          INPUT TEXT: "${conversation}"
          USER CONTEXT: "${userEmotion || 'N/A'}"
          
          *** STRICT OUTPUT RULES ***
          1. **LANGUAGE LOCK:** YOUR ENTIRE JSON OUTPUT MUST BE IN ${config.target}. 
             - If the target is French, keys remain English (like 'riskScore'), but VALUES must be French.
             - Do NOT mix languages.
          2. **HEADERS:** You MUST use the exact headers provided below in the explanation structure.
          3. **NO FLUFF:** Start directly with the diagnosis.

          REQUIRED HEADERS (Use these EXACT strings in your Markdown):
          - ${config.headers.semantic}
          - ${config.headers.behavior}
          - ${config.headers.power}
          - ${config.headers.truth}
          - ${config.headers.strategy}

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
            "patterns": ${config.tags_example},
            "explanation": "### ${config.headers.semantic}\\n* **[Concept]:** Analysis in ${config.target}...\\n\\n### ${config.headers.behavior}\\n* **[Tactic]:** Analysis in ${config.target}...\\n\\n### ${config.headers.power}\\n* **[Status]:** Analysis in ${config.target}...\\n\\n### ${config.headers.truth}\\n**[Brutal truth in ${config.target}]**",
            "strategicAdvice": "1. **Identify:** Analysis...\\n2. **Interrupt:** Script...\\n3. **Grey Rock:** Action..."
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

        const cleanJson = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        // 保底機制
        const boostRadar = (arr) => arr.map(n => n < 6 ? n + 3 : n);
        if (result.riskScore > 6) {
            result.radarData = boostRadar(result.radarData);
        }

        return res.status(200).json(result);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(200).json({
            riskScore: 0,
            patterns: ["ERROR"],
            explanation: "Connection failed. Please try again.",
            strategicAdvice: "Check network.",
            radarData: [0, 0, 0, 0, 0, 0]
        });
    }
}
