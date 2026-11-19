import { useState } from "react";
import { api } from "../services/api";

function EventPoster({ eventId, audience, title }) {
  const [poster, setPoster] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPoster = async () => {
    setLoading(true);
    setError("");
    try {
      const image = audience === "student"
        ? await api.getStudentEventPoster(eventId)
        : await api.getEventPoster(eventId);
      setPoster(image);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-poster">
      {poster ? (
        <figure>
          <img src={poster.dataUrl} alt={`Poster for ${title}`} />
          <figcaption>{poster.fileName}</figcaption>
        </figure>
      ) : (
        <button
          type="button"
          className="event-poster-button"
          onClick={loadPoster}
          disabled={loading}
        >
          {loading ? "Loading poster…" : error ? "Try loading poster again" : "View event poster"}
        </button>
      )}
      {error && <p className="event-poster-error" role="alert">{error}</p>}
    </div>
  );
}

export default EventPoster;
