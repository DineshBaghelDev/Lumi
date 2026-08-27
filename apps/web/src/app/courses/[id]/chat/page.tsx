import { apiFetch } from "../../../../lib/api";
import { AppShell, CourseTabs } from "../../../ui";
import { ChatPanel } from "./chat-panel";

type Course = { id: string; title: string; topic: string; status: string };

export default async function CourseChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await apiFetch(`/courses/${id}`);
  if (!response.ok) {
    return (
      <AppShell active="Courses">
        <a className="back-link" href={`/courses/${id}`}>Back</a>
        <section className="panel module-box">
          <h1>Course not found</h1>
        </section>
      </AppShell>
    );
  }
  const { course } = await response.json() as { course: Course };

  // Load existing threads
  const threadsResponse = await apiFetch(`/courses/${id}/threads`);
  const threads = threadsResponse.ok
    ? (await threadsResponse.json() as { threads: Array<{ id: string; lessonId: string | null; lastMessage: string | null }> }).threads
    : [];

  return (
    <AppShell active="Courses">
      <a className="back-link" href={`/courses/${id}`}>Back</a>
      <div className="page-title">
        <h1>Chat with Lumi</h1>
        <p>Ask questions about &ldquo;{course.topic}&rdquo; and get answers grounded in course sources.</p>
      </div>
      <CourseTabs active="Chat" courseId={id} />
      <ChatPanel courseId={id} threads={threads} />
    </AppShell>
  );
}
