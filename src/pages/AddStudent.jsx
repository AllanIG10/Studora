import { useState } from "react";

function AddStudent({ departments, onAdd }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    department: departments[0]?.name || "",
  });

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department) return;
    setSaving(true);
    try {
      const saved = await onAdd({
        name: form.name.trim(),
        email: form.email.trim(),
        department: form.department,
      });
      if (saved) {
        setForm({ name: "", email: "", department: departments[0]?.name || "" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Add Student</h1>
          <p>Register a new student in the system.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Full name
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Enter student name"
              required
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="student@example.com"
              required
            />
          </label>
          <label>
            Department
            <select
              name="department"
              value={form.department}
              onChange={updateField}
              required
              disabled={departments.length === 0}
            >
              {departments.map((department) => (
                <option key={department.id} value={department.name}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {departments.length === 0 && (
          <p className="form-hint">Create a department before adding students.</p>
        )}
        <div className="form-actions">
          <button type="reset" className="secondary-btn" onClick={() => setForm({ name: "", email: "", department: departments[0]?.name || "" })}>
            Clear
          </button>
          <button type="submit" className="primary-btn" disabled={saving || departments.length === 0}>
            {saving ? "Saving…" : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddStudent;
