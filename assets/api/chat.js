import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    // Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { message, history } = req.body || {};

    // Validate message
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message" });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: "Message too long" });
    }

    // Load portfolio data
    const filePath = path.join(process.cwd(), "data", "portfolio.json");
    const portfolio = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // System Prompt
    const systemPrompt = `
You are PortfolioAgent, an AI assistant for ${portfolio.name}.
You answer questions about ${portfolio.name}'s portfolio projects, skills, experience, and contact info.

Rules:
- Only use information from PORTFOLIO DATA.
- If not present, say you don't know and suggest contacting ${portfolio.email}.
- Be concise, recruiter-friendly, and professional.
- If asked for best projects, pick 2-3 and justify using impact + stack.
- Never hallucinate.

PORTFOLIO DATA:
${JSON.stringify(portfolio, null, 2)}
`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message }
    ];

    // OpenAI key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Call OpenAI Chat API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "OpenAI API error", details: data });
    }

    const reply = data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
