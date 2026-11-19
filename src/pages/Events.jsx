import { useState } from "react";
import EventPoster from "../components/EventPoster";

const emptyEvent = {
  title: "",
  description: "",
  location: "",
  startsAt: "",
  endsAt: "",
};

const toDateTimeInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

function Events({ events, onSave, onDelete, onRemovePoster }) {
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [posterFile, setPosterFile] = useState(null);
  const [currentPoster, setCurrentPoster] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedEvents = [...events].sort(
    (first, second) => new Date(first.startsAt) - new Date(second.startsAt)
  );

  const resetForm = () => {
    setEventForm(emptyEvent);
    setPosterFile(null);
    setCurrentPoster(null);
    setEditingId("");
    setFormError("");
    setFormVisible(false);
  };

  const startEditing = (event) => {
    setEventForm({
      title: event.title,
      description: event.description || "",
      location: event.location || "",
      startsAt: toDateTimeInputValue(event.startsAt),
      endsAt: toDateTimeInputValue(event.endsAt),
    });
    setPosterFile(null);
    setCurrentPoster(event.poster || null);
    setEditingId(event.id);
    setFormError("");
    setFormVisible(true);
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    const startsAt = new Date(eventForm.startsAt);
    const endsAt = new Date(eventForm.endsAt);
    if (
      Number.isNaN(startsAt.getTime()) ||
      Number.isNaN(endsAt.getTime()) ||
      endsAt <= startsAt
    ) {
      setFormError("Enter a valid start and end time; the end must be after the start.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const eventData = new FormData();
      eventData.append("title", eventForm.title);
      eventData.append("description", eventForm.description);
      eventData.append("location", eventForm.location);
      eventData.append("startsAt", startsAt.toISOString());
      eventData.append("endsAt", endsAt.toISOString());
      if (posterFile) eventData.append("eventPoster", posterFile);
      const saved = await onSave(editingId, eventData);
      if (saved) resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? Students will no longer see this event.`)) {
      return;
    }
    await onDelete(event.id);
  };

  const handleRemovePoster = async (event) => {
    if (!window.confirm(`Remove the poster for "${event.title}"?`)) return;
    await onRemovePoster(event.id);
  };

  const handlePosterChange = (changeEvent) => {
    const file = changeEvent.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPosterFile(null);
      setFormError("Choose a poster image that is 2 MB or smaller.");
      changeEvent.target.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPosterFile(null);
      setFormError("Choose a JPEG, PNG, or WebP poster image.");
      changeEvent.target.value = "";
      return;
    }
    setPosterFile(file);
    setFormError("");
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>College Events</h1>
          <p>Publish upcoming college events for students.</p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (formVisible && !editingId) {
              resetForm();
            } else {
              setEventForm(emptyEvent);
              setPosterFile(null);
              setCurrentPoster(null);
              setEditingId("");
              setFormError("");
              setFormVisible(true);
            }
          }}
        >
          {formVisible && !editingId ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {formVisible && (
        <form className="form-card compact-form event-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit event" : "New college event"}</h2>
          {formError && <div className="academic-error" role="alert">{formError}</div>}
          <div className="event-form-grid">
            <label>
              Event title
              <input
                value={eventForm.title}
                onChange={(event) => setEventForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))}
                maxLength={100}
                required
                disabled={saving}
              />
            </label>
            <label>
              Location
              <input
                value={eventForm.location}
                onChange={(event) => setEventForm((current) => ({
                  ...current,
                  location: event.target.value,
                }))}
                maxLength={150}
                disabled={saving}
              />
            </label>
            <label>
              Starts
              <input
                type="datetime-local"
                value={eventForm.startsAt}
                onChange={(event) => setEventForm((current) => ({
                  ...current,
                  startsAt: event.target.value,
                }))}
                required
                disabled={saving}
              />
            </label>
            <label>
              Ends
              <input
                type="datetime-local"
                value={eventForm.endsAt}
                min={eventForm.startsAt || undefined}
                onChange={(event) => setEventForm((current) => ({
                  ...current,
                  endsAt: event.target.value,
                }))}
                required
                disabled={saving}
              />
            </label>
            <label className="event-description-field">
              Details
              <textarea
                value={eventForm.description}
                onChange={(event) => setEventForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))}
                maxLength={2000}
                rows={4}
                disabled={saving}
              />
            </label>
            <label className="event-poster-field">
              Poster or invitation image
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePosterChange}
                disabled={saving}
              />
              <small>JPEG, PNG, or WebP · maximum 2 MB. A new image replaces the current poster.</small>
              {posterFile && <span>Selected: {posterFile.name}</span>}
              {!posterFile && currentPoster && <span>Current poster: {currentPoster.fileName}</span>}
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Publish Event"}
            </button>
          </div>
        </form>
      )}

      {sortedEvents.length ? (
        <div className="event-management-list">
          {sortedEvents.map((event) => (
            <article className="event-management-card" key={event.id}>
              <div className="event-management-copy">
                <div className="event-management-title">
                  <h2>{event.title}</h2>
                </div>
                <p className="event-management-time">
                  {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
                </p>
                {event.location && <p className="event-management-location">{event.location}</p>}
                {event.description && <p className="event-management-description">{event.description}</p>}
                {event.poster && (
                  <EventPoster eventId={event.id} audience="admin" title={event.title} />
                )}
              </div>
              <div className="event-management-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => startEditing(event)}
                >
                  Edit
                </button>
                {event.poster && (
                  <button
                    type="button"
                    className="event-delete-btn"
                    onClick={() => handleRemovePoster(event)}
                  >
                    Remove poster
                  </button>
                )}
                <button
                  type="button"
                  className="event-delete-btn"
                  onClick={() => handleDelete(event)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No college events yet</h2>
          <p>Add an event to share it with students.</p>
        </div>
      )}
    </div>
  );
}

export default Events;
