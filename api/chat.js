const fs = require("fs");
const path = require("path");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" });
    }

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

PORTFOLIO DATA:
${JSON.stringify(portfolio, null, 2)}
`;

    // ✅ Gemini REST endpoint
    const url =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=" +
  apiKey;


    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: systemPrompt + "\n\nUser question: " + message }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 300
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return res.status(response.status).json({
        error: "Gemini API error",
        details: data
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
