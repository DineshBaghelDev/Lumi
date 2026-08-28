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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const readErrorMessage = useCallback(async (response: Response, fallback: string) => {
    try {
      const body = await response.json() as { message?: string; error?: string };
      return body.message ?? body.error ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`);
      if (!res.ok) {
        setError(await readErrorMessage(res, "Notes could not load right now."));
        return;
      }

      const data = await res.json() as { notes: Note[] };
      setNotes(data.notes);
      setError(null);
    } catch {
      setError("Notes could not load right now.");
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, readErrorMessage]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const addBookmark = useCallback(async (blockId: string) => {
    setSavingKey(`bookmark:${blockId}`);
    setError(null);

    try {
      const response = await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bookmark", blockId }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Bookmark could not be saved."));
        return;
      }

      await loadNotes();
    } catch {
      setError("Bookmark could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }, [courseId, lessonId, loadNotes, readErrorMessage]);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;

    setSavingKey("new-note");
    setError(null);

    try {
      const response = await fetch(`/api/proxy/courses/${courseId}/lessons/${lessonId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "note",
          blockId: selectedBlock || undefined,
          content: newNote.trim(),
        }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Note could not be saved."));
        return;
      }

      setNewNote("");
      setSelectedBlock("");
      await loadNotes();
    } catch {
      setError("Note could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }, [courseId, lessonId, loadNotes, newNote, readErrorMessage, selectedBlock]);

  const updateNote = useCallback(async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    setSavingKey(`edit:${editingNoteId}`);
    setError(null);

    try {
      const response = await fetch(`/api/proxy/notes/${editingNoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Note changes could not be saved."));
        return;
      }

      setEditingNoteId(null);
      setEditingContent("");
      await loadNotes();
    } catch {
      setError("Note changes could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }, [editingContent, editingNoteId, loadNotes, readErrorMessage]);

  const deleteNote = useCallback(async (noteId: string) => {
    setSavingKey(`delete:${noteId}`);
    setError(null);

    try {
      const response = await fetch(`/api/proxy/notes/${noteId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(await readErrorMessage(response, "This item could not be removed."));
        return;
      }

      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditingContent("");
      }

      await loadNotes();
    } catch {
      setError("This item could not be removed.");
    } finally {
      setSavingKey(null);
    }
  }, [editingNoteId, loadNotes, readErrorMessage]);

  const bookmarks = notes.filter((n) => n.type === "bookmark");
  const noteItems = notes.filter((n) => n.type === "note");
  const bookmarkIds = new Set(bookmarks.map((bookmark) => bookmark.blockId).filter(Boolean));

  if (loading) return <p className="helper-text">Loading notes…</p>;

  return (
    <div className="lesson-notes-panel">
      {error ? <p className="helper-text" role="alert">{error}</p> : null}

      {blocks.filter((block) => block.type === "heading").length > 0 ? (
        <div className="notes-section">
          <p className="helper-text">Bookmark a section</p>
          <div className="notes-list">
            {blocks.filter((block) => block.type === "heading").map((block) => {
              const saved = bookmarkIds.has(block.id);

              return (
                <div className="note-item" key={block.id}>
                  <p className="note-content">{block.text ?? block.id}</p>
                  <button
                    className="button ghost"
                    disabled={saved || savingKey === `bookmark:${block.id}`}
                    onClick={() => void addBookmark(block.id)}
                    type="button"
                  >
                    {saved ? "Bookmarked" : "Bookmark"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {bookmarks.length > 0 ? (
        <div className="notes-section">
          <p className="helper-text">{bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}</p>
          <div className="notes-list">
            {bookmarks.map((bookmark) => (
              <div className="note-item" key={bookmark.id}>
                <p className="note-content">
                  {blocks.find((block) => block.id === bookmark.blockId)?.text ?? bookmark.blockId ?? "Saved section"}
                </p>
                <button
                  className="button ghost"
                  disabled={savingKey === `delete:${bookmark.id}`}
                  onClick={() => void deleteNote(bookmark.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
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
          <button className="button" disabled={!newNote.trim() || savingKey === "new-note"} onClick={() => void addNote()} type="button" style={{ minHeight: "34px" }}>
            Save
          </button>
        </div>
      </div>

      {noteItems.length > 0 ? (
        <div className="notes-list section-gap">
          {noteItems.map((note) => (
            <div className="note-item" key={note.id}>
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    className="note-box"
                    onChange={(event) => setEditingContent(event.target.value)}
                    rows={3}
                    value={editingContent}
                  />
                  <div className="topline compact section-gap" style={{ gap: "8px" }}>
                    <button
                      className="button"
                      disabled={!editingContent.trim() || savingKey === `edit:${note.id}`}
                      onClick={() => void updateNote()}
                      type="button"
                    >
                      Save changes
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => {
                        setEditingNoteId(null);
                        setEditingContent("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="note-content">{note.content}</p>
                  {note.blockId ? <p className="helper-text">Block: {blocks.find((block) => block.id === note.blockId)?.text ?? note.blockId}</p> : null}
                  <div className="topline compact section-gap" style={{ gap: "8px" }}>
                    <button
                      className="button ghost"
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditingContent(note.content ?? "");
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="button ghost"
                      disabled={savingKey === `delete:${note.id}`}
                      onClick={() => void deleteNote(note.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
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
