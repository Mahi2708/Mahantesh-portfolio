const fs = require("fs");
const path = require("path");

// ✅ Simple in-memory rate limiter (per IP)
const rateMap = global.rateMap || (global.rateMap = new Map());

module.exports = async function handler(req, res) {
  try {
    // Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ✅ Rate limiting: 1 request per 4 seconds per IP
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const now = Date.now();
    const lastTime = rateMap.get(ip) || 0;

    if (now - lastTime < 4000) {
      return res.status(429).json({
        error: "Too many requests. Please wait a few seconds and try again."
      });
    }

    rateMap.set(ip, now);

    // Read message
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

    // Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // Load portfolio JSON
    const filePath = path.join(process.cwd(), "data", "portfolio.json");
    const portfolio = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const email = portfolio?.contact?.email || "the email listed in the portfolio";

    const systemPrompt = `
You are PortfolioAgent, an AI assistant for ${portfolio.name}.
Answer questions about ${portfolio.name}'s skills, projects, experience, and contact info.

Rules:
- Use only PORTFOLIO DATA below.
- If not present, say you don't know and suggest contacting ${email}.
- Be concise and recruiter-friendly.
- If information is missing from portfolio data, clearly say it is unavailable.
- Never invent skills, projects, or experience.
- Answer professionally like a recruiter-facing assistant.

PORTFOLIO DATA:
${JSON.stringify(portfolio, null, 2)}
`;

    // ✅ Gemini REST endpoint (v1)
    const url =
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" +
      apiKey;

   const controller = new AbortController();

const timeout = setTimeout(() => {
  controller.abort();
}, 15000);

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  signal: controller.signal,
  body: JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              systemPrompt +
              "\n\nUser question: " +
              message
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 300
    }
  })
});

clearTimeout(timeout);
    const data = await response.json();

    // ✅ Better error message for debugging
    if (!response.ok) {
      const geminiMsg =
        data?.error?.message ||
        data?.message ||
        "Gemini API error";

      console.error("Gemini error:", geminiMsg, data);

      return res.status(response.status).json({
        error: "Gemini API error",
        message: geminiMsg,
        details: data
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err?.message || err);
    return res.status(500).json({ error: "Server error" });
  }
};
