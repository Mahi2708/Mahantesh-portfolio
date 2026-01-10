document.addEventListener("DOMContentLoaded", () => {
  // ✅ Since frontend + backend on same Vercel project
  const API_URL = "/api/chat";

  const toggleBtn = document.getElementById("ai-toggle");
  const box = document.getElementById("ai-box");
  const messagesDiv = document.getElementById("ai-messages");
  const input = document.getElementById("ai-input");
  const sendBtn = document.getElementById("ai-send");

  // ✅ Safety check
  if (!toggleBtn || !box || !messagesDiv || !input || !sendBtn) {
    console.error("AI Widget elements missing!", {
      toggleBtn, box, messagesDiv, input, sendBtn
    });
    return;
  }

  let history = [
    {
      role: "assistant",
      content:
        "Hi! I'm Mahanthesh's portfolio AI assistant. Ask me about his skills, projects, or experience."
    }
  ];

  function isChatOpen() {
    return !box.classList.contains("hidden") && box.classList.contains("show");
  }

  function renderMessages() {
    messagesDiv.innerHTML = "";
    history.forEach((msg) => {
      const div = document.createElement("div");
      div.className = msg.role === "user" ? "msg user" : "msg bot";
      div.textContent = msg.content;
      messagesDiv.appendChild(div);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function openChat() {
    box.classList.remove("hidden");
    setTimeout(() => box.classList.add("show"), 10);

    // ✅ hide button when chat opens
    toggleBtn.style.display = "none";

    renderMessages();
    input.focus();
  }

  function closeChat() {
    box.classList.remove("show");
    setTimeout(() => box.classList.add("hidden"), 200);

    // ✅ show button again when chat closes
    toggleBtn.style.display = "block";
  }

  function toggleChat() {
    if (isChatOpen()) closeChat();
    else openChat();
  }

  function setLoading(isLoading) {
    sendBtn.disabled = isLoading;
    input.disabled = isLoading;
    sendBtn.textContent = isLoading ? "..." : "Send";
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    history.push({ role: "user", content: text });
    input.value = "";
    renderMessages();

    history.push({ role: "assistant", content: "Thinking..." });
    renderMessages();
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text
        })
      });

      const data = await res.json();
      history = history.filter((m) => m.content !== "Thinking...");

      // ✅ Handle non-OK responses
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("RATE_LIMIT");
        }
        throw new Error(data?.message || data?.error || "Error");
      }

      history.push({ role: "assistant", content: data.reply });
      renderMessages();
    } catch (err) {
      history = history.filter((m) => m.content !== "Thinking...");

      let errorMessage =
        "⚠️ AI assistant is temporarily unavailable. Please try again later.";

      if (err.message === "RATE_LIMIT") {
        errorMessage = "⚠️ Too many requests. Please wait 5–10 seconds and try again.";
      }

      history.push({
        role: "assistant",
        content: errorMessage
      });

      renderMessages();
      console.error("AI chat error:", err);
    } finally {
      setLoading(false);
      input.focus();
    }
  }

  // ✅ Toggle open/close when button clicked
  toggleBtn.addEventListener("click", () => {
    toggleChat();
  });

  // ✅ Close + Send (delegation)
  document.addEventListener("click", (e) => {
    if (e.target.id === "ai-close") {
      e.preventDefault();
      e.stopPropagation();
      closeChat();
      return;
    }

    if (e.target.id === "ai-send") {
      sendMessage();
      return;
    }
  });

  // ✅ Enter sends
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ✅ Auto popup after 3 seconds every refresh
  setTimeout(() => {
    openChat();
  }, 3000);

  renderMessages();
});
