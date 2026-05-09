const fs = require("fs");
const path = require("path");

// ✅ Simple in-memory rate limiter (per IP)
const rateMap = global.rateMap || (global.rateMap = new Map());

module.exports = async function handler(req, res) {
  try {
    // ✅ Allow only POST
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    // ✅ Rate limiting: 1 request per 4 seconds per IP
    const ip =
      (req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        ?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const now = Date.now();
    const lastTime = rateMap.get(ip) || 0;

    if (now - lastTime < 4000) {
      return res.status(429).json({
        error:
          "Too many requests. Please wait a few seconds and try again."
      });
    }

    rateMap.set(ip, now);

    // ✅ Read message
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Invalid message"
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: "Message too long"
      });
    }

    // ✅ OpenRouter API Key
    console.log(
      "API KEY EXISTS:",
      !!process.env.OPENROUTER_API_KEY
    );

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing OPENROUTER_API_KEY"
      });
    }

    // ✅ Load portfolio JSON
    const filePath = path.join(
      process.cwd(),
      "data",
      "portfolio.json"
    );

    const portfolio = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    const email =
      portfolio?.contact?.email ||
      "the email listed in the portfolio";

    // ✅ System Prompt
    const systemPrompt = `
You are PortfolioAgent, an AI assistant for ${portfolio.name}.

Answer questions about ${portfolio.name}'s:
- skills
- projects
- experience
- education
- contact information

Rules:
- Use ONLY the provided portfolio data.
- Never invent information.
- If something is unavailable, clearly say so.
- Keep answers concise and recruiter-friendly.
- Mention technologies used in projects when relevant.
- Format clearly using short paragraphs or bullet points.

PORTFOLIO DATA:
${JSON.stringify(portfolio)}
`;

    // ✅ OpenRouter endpoint
    const url =
      "https://openrouter.ai/api/v1/chat/completions";

    // ✅ Timeout controller
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    // ✅ API request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model:
  "openai/gpt-3.5-turbo",

        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],

        temperature: 0.4,
        max_tokens: 300
      })
    });

    clearTimeout(timeout);

    // ✅ Read raw response
    const text = await response.text();

    console.log("Raw OpenRouter Response:", text);

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "Invalid JSON response from OpenRouter",
        raw: text
      });
    }

    // ✅ Handle API errors
    if (!response.ok) {
      const apiMessage =
        data?.error?.message ||
        data?.message ||
        "OpenRouter API error";

      console.error(
        "OpenRouter error:",
        apiMessage,
        data
      );

      return res.status(response.status).json({
        error: "OpenRouter API error",
        message: apiMessage,
        details: data
      });
    }

    // ✅ Extract reply
    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    // ✅ Success response
    return res.status(200).json({
      reply
    });

  } catch (err) {
    console.error(
      "Server error:",
      err?.message || err
    );

    return res.status(500).json({
      error: "Server error"
    });
  }
};