"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string | null;
  sourceUrl: string;
  heading: string | null;
  excerpt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: (string | Citation)[];
  model?: string | null;
};

type Thread = {
  id: string;
  lessonId: string | null;
  lastMessage: string | null;
};

import { MarkdownContent } from "./markdown-content";

export function ChatPanel({
  courseId,
  threads,
  lessonId,
}: {
  courseId: string;
  threads: Thread[];
  lessonId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resolveCitations = useCallback(async (rawMessages: Message[]): Promise<Message[]> => {
    const allChunkIds = rawMessages
      .flatMap((msg) => msg.citations ?? [])
      .filter((cit): cit is string => typeof cit === "string");
    const uniqueChunkIds = [...new Set(allChunkIds)].filter((id) => typeof id === "string" && id.length > 0);
    if (uniqueChunkIds.length === 0) return rawMessages;

    try {
      const citRes = await fetch(`/api/proxy/courses/${courseId}/citations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunkIds: uniqueChunkIds }),
      });
      if (!citRes.ok) return rawMessages;
      const { citations } = await citRes.json() as { citations: Citation[] };
      const citationMap = new Map(citations.map((c) => [c.chunkId, c]));
      return rawMessages.map((msg) => {
        if (!msg.citations || msg.citations.length === 0) return msg;
        const resolved = msg.citations
          .map((cit) => (typeof cit === "string" ? citationMap.get(cit) : cit))
          .filter((c): c is Citation => c != null);
        return resolved.length > 0 ? { ...msg, citations: resolved } : msg;
      });
    } catch {
      return rawMessages;
    }
  }, [courseId]);

  const loadThread = useCallback(async (tid: string) => {
    setThreadId(tid);
    const res = await fetch(`/api/proxy/courses/${courseId}/threads/${tid}/messages`);
    if (!res.ok) return;
    const data = await res.json() as { messages: Message[] };
    setMessages(await resolveCitations(data.messages));
  }, [courseId, resolveCitations]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    let responseThreadId = threadId;

    try {
      const response = await fetch(`/api/proxy/courses/${courseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          threadId: threadId ?? undefined,
          lessonId: lessonId ?? undefined,
        }),
      });

      if (!response.ok) {
        setError("Failed to send message. Please try again.");
        setStreaming(false);
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read response stream.");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };
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
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as { content?: string; error?: string; threadId?: string };
            if (parsed.threadId) {
              responseThreadId = parsed.threadId;
              setThreadId(parsed.threadId);
            }
            if (parsed.error) {
              setError(parsed.error);
              setStreaming(false);
              break;
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }


    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStreaming(false);
      if (responseThreadId) void loadThread(responseThreadId);
    }
  }, [courseId, input, lessonId, loadThread, streaming, threadId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="chat-container">
      {threads.length > 0 && !threadId ? (
        <section className="thread-panel section-gap">
          <h2>Previous conversations</h2>
          <div className="course-list">
            {threads.map((thread) => (
              <button
                className="lesson-row"
                key={thread.id}
                onClick={() => void loadThread(thread.id)}
                type="button"
              >
                <span className="thread-mark" aria-hidden="true" />
                <div>
                  <h3>{thread.lessonId ? "Lesson chat" : "Course chat"}</h3>
                  <p>{thread.lastMessage?.slice(0, 100) ?? "New conversation"}</p>
                </div>
              </button>
            ))}
          </div>
          <button
            className="button section-gap"
            onClick={() => setMessages([])}
            type="button"
          >
            Start new conversation
          </button>
        </section>
      ) : null}

      <section className="chat-messages">
        {messages.length === 0 && !streaming ? (
          <div className="chat-empty">
            <h2>Ask from the course sources</h2>
            <p>Try asking for an explanation, tradeoff, failure mode, or next step.</p>
            <p className="small">Lumi keeps answers tied to the stored course material.</p>
          </div>
        ) : null}
        {messages.map((msg) => (
          <div className={`chat-bubble ${msg.role}`} key={msg.id}>
            <div className="chat-bubble-content"><MarkdownContent content={msg.content} /></div>
            {msg.citations && msg.citations.length > 0 ? (
              <div className="chat-citations">
                {msg.citations.map((cit) => (typeof cit === "string" ? null : (
                  <a
                    className="citation-chip"
                    href={cit.sourceUrl}
                    key={cit.chunkId}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {cit.sourceTitle ?? cit.heading ?? "Source"}
                  </a>
                )))}
              </div>
            ) : null}
          </div>
        ))}
        {streaming && messages.length === 0 ? (
          <div className="chat-bubble assistant">
            <div className="chat-bubble-content chat-thinking">Thinking…</div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </section>

      {error ? <p className="form-message error" role="alert">{error}</p> : null}

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          disabled={streaming}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lessonId ? "Ask about this lesson…" : "Ask about the course…"}
          ref={inputRef}
          rows={2}
          value={input}
        />
        <button
          className="button"
          disabled={streaming || !input.trim()}
          onClick={() => void sendMessage()}
          type="button"
        >
          {streaming ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
