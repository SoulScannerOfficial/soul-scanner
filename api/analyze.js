// 文件路徑: api/analyze.js

export const config = {
  runtime: 'edge', // 使用 Edge Runtime 速度更快，更省錢
};

export default async function handler(req) {
  // 1. 處理 CORS (允許前端訪問)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 2. 獲取前端數據
    const body = await req.json();
    const { conversation, language, userEmotion } = body;

    // 3. 獲取 API Key (你的新變量名)
    const apiKey = process.env.SOULSCANNER;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Config Error: Missing API Key' }), {
        status: 500,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
        },
      });
    }

    // 4. 定義 Prompt (Mask X-Ray 核心邏輯)
    const systemPrompt = `
      You are Soul Scanner, an AI cognitive prosthesis for neurodivergent (ND) individuals.
      Analyze the provided dialogue for "Mask X-Ray" - detecting subtle aggression, gaslighting, or manipulation.
      
      Output strictly in JSON format:
      {
        "riskScore": (number 1-10),
        "patterns": ["array", "of", "short", "tags"],
        "explanation": "Brief, validation-focused analysis (max 2 sentences).",
        "strategicAdvice": "One actionable defense tactic.",
        "radarData": [aggression, control, narcissism, insecurity, envy, gaslighting] (numbers 0-10)
      }
      User Language: ${language || 'en'}
      User Context: The user feels ${userEmotion || 'uncertain'}.
    `;

    // 5. 調用 Google Gemini API (Flash 模型)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: systemPrompt + "\n\nDialogue to analyze:\n" + conversation }]
          }]
        })
      }
    );

    const data = await response.json();

    // 6. 錯誤處理
    if (!response.ok) {
        console.error("Gemini API Error:", data);
        return new Response(JSON.stringify({ error: 'AI Connection Failed', details: data }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' 
            },
        });
    }

    // 7. 解析 Gemini 的回复
    const aiText = data.candidates[0].content.parts[0].text;
    // 清理可能存在的 Markdown 格式
    const jsonStr = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // 允許跨域
      },
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal Processing Error' }), {
      status: 500,
      headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
      },
    });
  }
}
