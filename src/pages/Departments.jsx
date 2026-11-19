import { useState } from "react";

function Departments({ departments, onAdd }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [head, setHead] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !head.trim()) return;
    setSaving(true);
    try {
      const saved = await onAdd({ name: name.trim(), head: head.trim() });
      if (saved) {
        setName("");
        setHead("");
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Departments</h1>
          <p>View and manage academic departments.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Cancel" : "+ Add Department"}
        </button>
      </div>

      {showForm && (
        <form className="form-card compact-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Department name
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label>
              Department head
              <input value={head} onChange={(event) => setHead(event.target.value)} required />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? "Saving…" : "Create Department"}
            </button>
          </div>
        </form>
      )}

      <div className="department-grid">
        {departments.map((department) => (
          <article className="department-card" key={department.id}>
            <div className="department-icon">▤</div>
            <h2>{department.name}</h2>
            <p>Department Head</p>
            <strong>{department.head}</strong>
            <div className="department-footer">
              <span>{department.students} Students</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Departments;
