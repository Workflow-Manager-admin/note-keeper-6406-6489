import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Color palette from requirements
const COLORS = {
  primary: "#1976d2",
  secondary: "#424242",
  accent: "#ffb300"
};

// API endpoint base (assume relative path for local dev, or set REACT_APP_API_URL)
const API_BASE = process.env.REACT_APP_API_URL || "/api";

// Minimal utility to fetch notes API (CRUD, search)
const notesApi = {
  // PUBLIC_INTERFACE
  async getNotes(search = "") {
    let url = `${API_BASE}/notes`;
    if (search) url += `?search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch notes");
    return res.json();
  },
  // PUBLIC_INTERFACE
  async getNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`);
    if (!res.ok) throw new Error("Failed to fetch note");
    return res.json();
  },
  // PUBLIC_INTERFACE
  async createNote(note) {
    const res = await fetch(`${API_BASE}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note)
    });
    if (!res.ok) throw new Error("Failed to create note");
    return res.json();
  },
  // PUBLIC_INTERFACE
  async updateNote(id, note) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note)
    });
    if (!res.ok) throw new Error("Failed to update note");
    return res.json();
  },
  // PUBLIC_INTERFACE
  async deleteNote(id) {
    const res = await fetch(`${API_BASE}/notes/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete note");
    return res.json();
  }
};

// Sidebar
function Sidebar({ notes, selectedId, onSelect, onCreate, search, setSearch }) {
  return (
    <aside className="Sidebar" aria-label="Sidebar navigation">
      <button className="CreateBtn" onClick={onCreate}>+ New Note</button>
      <input
        className="SearchInput"
        placeholder="Search notes..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search notes"
      />
      <nav>
        {notes.map(note => (
          <button
            key={note.id}
            className={`SidebarItem${note.id === selectedId ? " active" : ""}`}
            onClick={() => onSelect(note.id)}
            title={note.title}
          >
            <strong>{note.title || "Untitled"}</strong>
            <div className="SidebarSnippet">
              {note.content ? note.content.slice(0, 30) : ""}
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}

// Main note editor/viewer
function NoteArea({
  note,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onChange
}) {
  if (!note) {
    return <div className="NoteArea empty">Select a note or create a new one.</div>;
  }
  return (
    <div className="NoteArea">
      {isEditing ? (
        <form
          className="NoteForm"
          onSubmit={e => { e.preventDefault(); onSave(); }}
        >
          <input
            className="NoteTitleInput"
            type="text"
            autoFocus
            maxLength={100}
            placeholder="Title"
            value={note.title}
            onChange={e => onChange({ ...note, title: e.target.value })}
            aria-label="Note title"
          />
          <textarea
            className="NoteContentInput"
            rows={12}
            placeholder="Write your note here..."
            value={note.content}
            onChange={e => onChange({ ...note, content: e.target.value })}
            aria-label="Note content"
          />
          <div className="NoteFormActions">
            <button type="submit" className="PrimaryBtn">Save</button>
            <button type="button" className="SecondaryBtn" onClick={onCancel}>Cancel</button>
            {note.id && (
              <button type="button" className="DeleteBtn" onClick={onDelete}>Delete</button>
            )}
          </div>
        </form>
      ) : (
        <div className="NoteViewer">
          <div className="NoteViewer-Title">
            <h2>{note.title || "Untitled"}</h2>
            <div>
              <button className="SecondaryBtn small" onClick={onEdit}>Edit</button>
              <button className="DeleteBtn small" onClick={onDelete}>Delete</button>
            </div>
          </div>
          <div className="NoteViewer-Content">
            {note.content || <em>No content</em>}
          </div>
        </div>
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  // State
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [currentNote, setCurrentNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Fetch all notes (filtered)
  const fetchNotes = useCallback(() => {
    setLoading(true);
    notesApi.getNotes(search)
      .then(data => { setNotes(data); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, [search]);

  // Effect: fetch notes when search changes or on mount
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Effect: select first note automatically
  useEffect(() => {
    if (notes.length && (!selectedId || !notes.find(n => n.id === selectedId))) {
      setSelectedId(notes[0].id);
    }
    if (!notes.length) {
      setSelectedId(null);
      setCurrentNote(null);
    }
  }, [notes, selectedId]);

  // Effect: get selected note from notes[]
  useEffect(() => {
    if (!selectedId) {
      setCurrentNote(null);
      setIsEditing(false);
      return;
    }
    const note = notes.find(n => n.id === selectedId);
    setCurrentNote(note || null);
    setIsEditing(false);
    setIsCreating(false);
  }, [selectedId, notes]);

  // Create new note
  const onCreate = () => {
    setCurrentNote({ title: "", content: "" });
    setIsEditing(true);
    setIsCreating(true);
    setSelectedId(null);
  };

  // Save note (create or update)
  const onSave = () => {
    setErr("");
    setLoading(true);
    const fn = isCreating ? notesApi.createNote : notesApi.updateNote;
    fn(isCreating ? currentNote : currentNote.id, currentNote)
      .then((saved) => {
        setIsEditing(false);
        setIsCreating(false);
        setSelectedId(saved.id);
        fetchNotes();
      })
      .catch(e => { setErr(e.message); setLoading(false); });
  };

  // Delete note
  const onDelete = () => {
    if (isCreating) {
      setCurrentNote(null);
      setIsEditing(false);
      setIsCreating(false);
      return;
    }
    if (!currentNote || !currentNote.id) return;
    setLoading(true);
    notesApi.deleteNote(currentNote.id)
      .then(() => {
        setIsEditing(false);
        setIsCreating(false);
        setCurrentNote(null);
        setSelectedId(null);
        fetchNotes();
      })
      .catch(e => { setErr(e.message); setLoading(false); });
  };

  // Switch to edit mode
  const onEdit = () => setIsEditing(true);

  // Cancel editing/creating
  const onCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
    if (notes.length) setSelectedId(notes[0].id);
    else setCurrentNote(null);
  };

  // Main render
  return (
    <div className="NotesApp" style={{ background: "#fff", color: "#222" }}>
      <Sidebar
        notes={notes}
        selectedId={selectedId}
        onSelect={id => { setSelectedId(id); setErr(""); }}
        onCreate={onCreate}
        search={search}
        setSearch={setSearch}
      />
      <main className="MainContent">
        <header className="Header">
          <span className="AppTitle" style={{ color: COLORS.primary }}>Notes</span>
        </header>
        {loading && <div className="StatusMsg">Loading...</div>}
        {err && <div className="StatusMsg err">{err}</div>}
        <NoteArea
          note={currentNote}
          isEditing={isEditing || isCreating}
          onEdit={onEdit}
          onCancel={onCancel}
          onSave={onSave}
          onDelete={onDelete}
          onChange={setCurrentNote}
        />
      </main>
    </div>
  );
}

export default App;
