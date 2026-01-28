const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 語言配置：嚴格對應前端，並配置毒舌語氣
const LANG_CONFIG = {
    'en': { name: 'English', tone: 'Savage, Clinical, No Mercy. Use terms like "Gaslighting", "Projection".' },
    'fr': { name: 'French', tone: 'Cynical, Philosophical, Sharp.' },
    'zh_cn': { name: 'Simplified Chinese', tone: '一针见血，犀利，不留情面。使用心理学术语（煤气灯、投射）。' },
    'zh_tw': { name: 'Traditional Chinese', tone: '毒舌，犀利，冷血。一針見血地揭露操控本質。' }
};

// 容錯提取器
function extractTag(text, tagName) {
    const patterns = [
        new RegExp(`\\[${tagName}\\]([\\s\\S]*?)\\[END_${tagName}\\]`, 'i'),
        new RegExp(`\\[${tagName}\\]([\\s\\S]*?)\\[\/${tagName}\\]`, 'i'),
        new RegExp(`\\[${tagName}\\]([\\s\\S]*?)\\[${tagName}\\]`, 'i') // 容錯
    ];
    for (let p of patterns) {
        const match = text.match(p);
        if (match) return match[1].trim();
    }
    return null;
}

async function callGemini(userText, targetLangCode, userEmotion) {
    const langKey = targetLangCode || 'en';
    const langConfig = LANG_CONFIG[langKey];
    
    const SYSTEM_PROMPT = `
Role: You are Mask X-Ray. A psychological sniper.
**CRITICAL RULE: OUTPUT MUST BE IN ${langConfig.name}.**

### 🎯 Input
Context: User feels [${userEmotion}].
Dialogue: "${userText}"

### ⚡ ANALYSIS RULES (${langConfig.tone})
1. **NO FLUFF:** Get straight to the point.
2. **DECODE:** Translate their "nice words" into their "ugly intent".
3. **FORMAT:** Use the tags below STRICTLY.

### 📦 OUTPUT FORMAT
[RISK_SCORE](Integer 0-100)[END_RISK_SCORE]
[RADAR](6 integers 0-10: Aggression, Control, Narcissism, Insecurity, Envy, Gaslighting)[END_RADAR]
[TAGS](3-4 short keywords in ${langConfig.name})[END_TAGS]

[BEHAVIOR]
(Bullet points. What tactics are they using? Be specific.)
[END_BEHAVIOR]

[SEMANTICS]
(Format: "Quote" -> "Real Meaning". Be sarcastic and sharp.)
[END_SEMANTICS]

[POWER]
(1 sentence. Who is the Predator? Who is the Prey?)
[END_POWER]

[STRATEGY]
(3 direct commands. Actionable and defensive.)
[END_STRATEGY]
`;

    const requestBody = {
        contents: [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }],
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: { temperature: 1.0 }
    };

    console.log(`📡 Analyzing in ${langConfig.name}...`);
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (response.status === 429) {
        throw new Error("429_RATE_LIMIT");
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    // 數據解析與預設值
    let riskScore = 85;
    const scoreRaw = extractTag(rawText, "RISK_SCORE");
    if (scoreRaw) {
        const match = scoreRaw.match(/\d+/);
        if (match) riskScore = parseInt(match[0]);
    }

    let radarData = [5,5,5,5,5,5];
    const radarRaw = extractTag(rawText, "RADAR");
    if (radarRaw) {
        radarData = radarRaw.split(/,|，/).map(n => parseInt(n.replace(/\D/g, '')) || 5).slice(0, 6);
    }

    return {
        riskScore,
        radarData,
        tags: extractTag(rawText, "TAGS")?.split(/,|，/) || ["Toxic"],
        behavior: extractTag(rawText, "BEHAVIOR"),
        semantics: extractTag(rawText, "SEMANTICS"),
        power: extractTag(rawText, "POWER"),
        strategy: extractTag(rawText, "STRATEGY")
    };
}

app.post('/api/analyze', async (req, res) => {
    try {
        const { conversation, language, userEmotion } = req.body;
        const analysis = await callGemini(conversation, language, userEmotion);
        
        // HTML 渲染：保持顏色與層次
        const styledExplanation = `
<div style="margin-bottom:20px;">
    <h4 style="color:#B45309; margin:0 0 8px 0; font-family:'Noto Serif SC', serif; font-size:0.95em; letter-spacing:1px;">🧬 BEHAVIOR</h4>
    <div style="color:#1c1917; line-height:1.6; font-size:0.95em;">${analysis.behavior}</div>
</div>
<div style="margin-bottom:20px;">
    <h4 style="color:#B91C1C; margin:0 0 8px 0; font-family:'Noto Serif SC', serif; font-size:0.95em; letter-spacing:1px;">👁️ SEMANTICS</h4>
    <div style="color:#1c1917; line-height:1.6; font-size:0.95em;">${analysis.semantics}</div>
</div>
<div>
    <h4 style="color:#0F766E; margin:0 0 8px 0; font-family:'Noto Serif SC', serif; font-size:0.95em; letter-spacing:1px;">⚖️ POWER</h4>
    <div style="color:#1c1917; line-height:1.6; font-size:0.95em;">${analysis.power}</div>
</div>
        `;

        const styledAdvice = `
<div style="background:#FFF7ED; border-left: 4px solid #F97316; padding:15px; border-radius:4px;">
    <h4 style="color:#9A3412; margin:0 0 8px 0; font-family:'Noto Serif SC', serif; font-size:0.95em; letter-spacing:1px;">🛡️ STRATEGY</h4>
    <div style="color:#431407; line-height:1.6; font-size:0.95em; white-space: pre-wrap;">${analysis.strategy}</div>
</div>
        `;

        res.json({
            riskScore: analysis.riskScore,
            radarData: analysis.radarData,
            patterns: analysis.tags,
            explanation: styledExplanation, 
            strategicAdvice: styledAdvice
        });

    } catch (error) {
        console.error("Server Error:", error.message);
        if (error.message === "429_RATE_LIMIT") {
            res.status(429).json({ error: "System Overheated (Rate Limit). Please wait 1 min." });
        } else {
            res.status(500).json({ error: "Analysis failed. Please retry." });
        }
    }
});

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });
app.listen(PORT, () => { console.log(`🚀 Soul Scanner (Gold Master) running on port ${PORT}`); });