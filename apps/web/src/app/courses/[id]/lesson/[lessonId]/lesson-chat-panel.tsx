"use client";

import { useCallback, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function LessonChatPanel({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setStreaming(true);

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch(`/api/proxy/courses/${courseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lessonId, threadId: threadId ?? undefined }),
      });

      if (!response.ok) {
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let content = "";
      const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as { content?: string; threadId?: string };
            if (parsed.threadId) setThreadId(parsed.threadId);
            if (parsed.content) {
              content += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* network error */ }
    finally { setStreaming(false); }
  }, [courseId, input, lessonId, streaming, threadId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="lesson-chat">
      {messages.length === 0 ? (
        <p className="helper-text">Ask a question about this lesson.</p>
      ) : (
        <div className="chat-messages compact">
          {messages.map((msg) => (
            <div className={`chat-bubble ${msg.role} compact`} key={msg.id}>
              <div className="chat-bubble-content small">{msg.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      <div className="chat-input-row compact">
        <input
          className="search"
          disabled={streaming}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this lesson…"
          style={{ minHeight: "36px", fontSize: "13px" }}
          value={input}
        />
        <button className="button" disabled={streaming || !input.trim()} onClick={() => void sendMessage()} type="button" style={{ minHeight: "36px", fontSize: "13px" }}>
          Ask
        </button>
      </div>
    </div>
  );
}
