
import { useState } from "react";

function StudentCard({ name, department, email, onView, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="student-card">

      {/* Student Header */}
      <div className="student-card-header">
        <div className="student-avatar">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="student-details">
          <h2>{name}</h2>
          <span className="student-status">
            Active Student
          </span>
        </div>

        <div className="student-menu-wrapper">
          <button
            className="student-menu"
            type="button"
            aria-label={`Options for ${name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋮
          </button>

          {menuOpen && (
            <div className="student-action-menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <span aria-hidden="true">✎</span> Edit
              </button>
              <button
                type="button"
                className="delete-action"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <span aria-hidden="true">⌫</span> Delete
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Student Information */}
      <div className="student-info">

        <div className="student-info-item">
          <span className="info-label">Department</span>
          <span className="department-badge">
            {department}
          </span>
        </div>

        <div className="student-info-item">
          <span className="info-label">Email Address</span>
          <p>{email}</p>
        </div>

      </div>

      {/* Footer */}
      <div className="student-card-footer">
        <button
          className="view-btn"
          type="button"
          aria-label={`View profile for ${name}`}
          onClick={onView}
        >
          View Profile →
        </button>
      </div>

    </div>
  );
}

export default StudentCard;
