"use client";

import { useCallback, useEffect, useState } from "react";

type Note = {
  id: string;
  type: "note" | "bookmark";
  blockId: string | null;
  content: string | null;
  createdAt: string;
};

type Block = { id: string; type: string; text?: string };

export function LessonNotesPanel({
  courseId,
  lessonId,
  blocks,
}: {
  courseId: string;
  lessonId: string;
  blocks: Block[];
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    const res = await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`);
    if (res.ok) {
      const data = await res.json() as { notes: Note[] };
      setNotes(data.notes);
    }
    setLoading(false);
  }, [courseId, lessonId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const addBookmark = useCallback(async (blockId: string) => {
    await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bookmark", blockId }),
    });
    void loadNotes();
  }, [courseId, lessonId, loadNotes]);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "note",
        blockId: selectedBlock || undefined,
        content: newNote.trim(),
      }),
    });
    setNewNote("");
    setSelectedBlock("");
    void loadNotes();
  }, [courseId, lessonId, loadNotes, newNote, selectedBlock]);

  const deleteNote = useCallback(async (noteId: string) => {
    await fetch(`/api/proxy/notes/${noteId}`, { method: "DELETE" });
    void loadNotes();
  }, [loadNotes]);

  const bookmarks = notes.filter((n) => n.type === "bookmark");
  const noteItems = notes.filter((n) => n.type === "note");

  if (loading) return <p className="helper-text">Loading notes…</p>;

  return (
    <div className="lesson-notes-panel">
      {bookmarks.length > 0 ? (
        <div className="notes-section">
          <p className="helper-text">{bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}</p>
        </div>
      ) : null}

      <div className="notes-section">
        <textarea
          className="note-box"
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          value={newNote}
        />
        <div className="topline compact section-gap" style={{ gap: "8px" }}>
          <select
            className="select"
            onChange={(e) => setSelectedBlock(e.target.value)}
            style={{ minHeight: "34px", fontSize: "12px" }}
            value={selectedBlock}
          >
            <option value="">No block selected</option>
            {blocks.filter((b) => b.type === "heading").map((b) => (
              <option key={b.id} value={b.id}>{b.text ?? b.id}</option>
            ))}
          </select>
          <button className="button" disabled={!newNote.trim()} onClick={() => void addNote()} type="button" style={{ minHeight: "34px" }}>
            Save
          </button>
        </div>
      </div>

      {noteItems.length > 0 ? (
        <div className="notes-list section-gap">
          {noteItems.map((note) => (
            <div className="note-item" key={note.id}>
              <p className="note-content">{note.content}</p>
              {note.blockId ? <p className="helper-text">Block: {note.blockId}</p> : null}
              <button className="button ghost" onClick={() => void deleteNote(note.id)} type="button" style={{ minHeight: "28px", fontSize: "11px", marginTop: "4px" }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {notes.length === 0 ? (
        <p className="helper-text">No notes or bookmarks yet. Add a note above or bookmark a section.</p>
      ) : null}
    </div>
  );
}
