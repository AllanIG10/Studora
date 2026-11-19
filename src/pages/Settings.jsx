import { useState } from "react";

const studentServiceSections = [
  {
    key: "attendance",
    title: "Attendance records",
    description: "Publish shared class attendance summaries for students.",
    fields: [
      { name: "date", label: "Date", type: "date" },
      { name: "subject", label: "Class / subject", maxLength: 100 },
      { name: "presentCount", label: "Present", type: "number", min: 0 },
      { name: "totalCount", label: "Total students", type: "number", min: 1 },
    ],
  },
  {
    key: "campusMap",
    title: "Campus map locations",
    description: "Add building names and directions to show below the Google Map.",
    fields: [
      { name: "name", label: "Location name", maxLength: 100 },
      { name: "description", label: "Description", maxLength: 300 },
    ],
  },
  {
    key: "fees",
    title: "Fee information",
    description: "Publish fee items and due dates.",
    fields: [
      { name: "title", label: "Fee title", maxLength: 100 },
      { name: "amount", label: "Amount", type: "number", min: 0, step: "0.01" },
      { name: "dueDate", label: "Due date", type: "date" },
      { name: "details", label: "Details", maxLength: 300 },
    ],
  },
  {
    key: "homework",
    title: "Homework and assignments",
    description: "Publish assignments and submission deadlines.",
    fields: [
      { name: "title", label: "Assignment title", maxLength: 100 },
      { name: "subject", label: "Subject", maxLength: 100 },
      { name: "dueDate", label: "Due date", type: "date" },
      { name: "details", label: "Instructions", maxLength: 300 },
    ],
  },
  {
    key: "transport",
    title: "Transport routes",
    description: "Publish routes, pickup times, and stops.",
    fields: [
      { name: "route", label: "Route name", maxLength: 100 },
      { name: "pickupTime", label: "Pickup time", maxLength: 30 },
      { name: "stops", label: "Stops (in order)", maxLength: 500 },
    ],
  },
];

const createEmptyEntry = (fields) =>
  Object.fromEntries(fields.map(({ name }) => [name, ""]));

const getStudentServices = (settings) => ({
  campusMapLocation: settings?.studentServices?.campusMapLocation ||
    "Adithya Institute of Technology, Coimbatore",
  attendance: settings?.studentServices?.attendance || [],
  campusMap: settings?.studentServices?.campusMap || [],
  fees: settings?.studentServices?.fees || [],
  homework: settings?.studentServices?.homework || [],
  transport: settings?.studentServices?.transport || [],
});

function Settings({ settings: savedSettings, onSave }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(savedSettings || {
    institution: "Studora",
    emailNotifications: true,
    weeklyReports: false,
    studentServices: getStudentServices(null),
  });

  const updateSetting = (event) => {
    const { name, type, checked, value } = event.target;
    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setSaved(false);
  };

  const updateServiceEntry = (section, index, field, value) => {
    setSettings((current) => ({
      ...current,
      studentServices: {
        ...getStudentServices(current),
        [section]: getStudentServices(current)[section].map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        ),
      },
    }));
    setSaved(false);
  };

  const updateCampusMapLocation = (value) => {
    setSettings((current) => ({
      ...current,
      studentServices: {
        ...getStudentServices(current),
        campusMapLocation: value,
      },
    }));
    setSaved(false);
  };

  const addServiceEntry = (section) => {
    const config = studentServiceSections.find((item) => item.key === section);
    setSettings((current) => ({
      ...current,
      studentServices: {
        ...getStudentServices(current),
        [section]: [
          ...getStudentServices(current)[section],
          createEmptyEntry(config.fields),
        ],
      },
    }));
    setSaved(false);
  };

  const removeServiceEntry = (section, index) => {
    setSettings((current) => ({
      ...current,
      studentServices: {
        ...getStudentServices(current),
        [section]: getStudentServices(current)[section].filter(
          (_entry, entryIndex) => entryIndex !== index
        ),
      },
    }));
    setSaved(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaved(false);
    setSaving(true);
    try {
      const studentServices = Object.fromEntries(
        studentServiceSections.map(({ key, fields }) => [
          key,
          getStudentServices(settings)[key].map((entry) =>
            Object.fromEntries(fields.map(({ name }) => [name, entry[name]]))
          ),
        ])
      );
      studentServices.campusMapLocation = getStudentServices(settings).campusMapLocation;
      setSaved(await onSave({ ...settings, studentServices }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your institution preferences.</p>
        </div>
      </div>

      <form className="form-card settings-card" onSubmit={handleSubmit}>
        <h2>General</h2>
        <label>
          Institution name
          <input
            name="institution"
            value={settings.institution}
            onChange={updateSetting}
          />
        </label>

        <div className="settings-section">
          <h2>Notifications</h2>
          <label className="toggle-row">
            <span>
              <strong>Email notifications</strong>
              <small>Receive important account updates by email.</small>
            </span>
            <input
              name="emailNotifications"
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={updateSetting}
            />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Weekly reports</strong>
              <small>Receive a weekly enrollment summary.</small>
            </span>
            <input
              name="weeklyReports"
              type="checkbox"
              checked={settings.weeklyReports}
              onChange={updateSetting}
            />
          </label>
        </div>

        <div className="settings-section student-content-settings">
          <h2>Student Portal Content</h2>
          <p>Publish shared content that appears in the student app.</p>
          <label className="student-map-location-field">
            Google Maps campus location
            <input
              type="text"
              maxLength={200}
              required
              value={getStudentServices(settings).campusMapLocation}
              onChange={(event) => updateCampusMapLocation(event.target.value)}
            />
            <small>
              Defaults to Adithya Institute of Technology, Coimbatore. Change this to your campus or
              paste a place name/address.
            </small>
          </label>
          {studentServiceSections.map((section) => {
            const entries = getStudentServices(settings)[section.key];
            return (
              <section className="student-content-section" key={section.key}>
                <div className="student-content-heading">
                  <div>
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                  </div>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => addServiceEntry(section.key)}
                    disabled={saving || entries.length >= 200}
                  >
                    Add
                  </button>
                </div>
                {entries.length ? (
                  <div className="student-content-entry-list">
                    {entries.map((entry, index) => (
                      <div className="student-content-entry" key={`${section.key}-${index}`}>
                        <div className="student-content-fields">
                          {section.fields.map((field) => (
                            <label key={field.name}>
                              {field.label}
                              <input
                                type={field.type || "text"}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                maxLength={field.maxLength}
                                required
                                value={entry[field.name] ?? ""}
                                onChange={(event) =>
                                  updateServiceEntry(
                                    section.key,
                                    index,
                                    field.name,
                                    event.target.value
                                  )
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <button
                          className="reject-btn student-content-remove"
                          type="button"
                          onClick={() => removeServiceEntry(section.key, index)}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="academic-empty">Nothing has been published in this section.</p>
                )}
              </section>
            );
          })}
        </div>

        <div className="form-actions">
          {saved && <span className="saved-message">Student content published to the student app.</span>}
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
