import { useEffect, useState } from "react";
import StudentCard from "../components/StudentCard";
import { api } from "../services/api";

const formatDate = (value) => value
  ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
  : "—";

function Students({ students, departments, search, onDelete, onEdit }) {
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [profileDetails, setProfileDetails] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState({ name: "", department: "", email: "" });

  useEffect(() => {
    let active = true;
    if (!viewingStudent) return () => { active = false; };

    const department = departments.find(
      (item) => item.name === viewingStudent.department
    );

    Promise.all([
      api.getStudentAcademicRecords(viewingStudent.id),
      department
        ? api.getDepartmentAcademicRecords(department.id)
        : Promise.resolve({ timetable: [], timetableImage: null }),
    ])
      .then(([academicRecords, departmentRecords]) => {
        if (!active) return;
        setProfileDetails({
          examResults: academicRecords.examResults || [],
          timetable: departmentRecords.timetable || [],
          timetableImage: departmentRecords.timetableImage || null,
        });
      })
      .catch((requestError) => {
        if (active) setProfileError(requestError.message);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [viewingStudent, departments]);

  const filteredStudents = students.filter((student) => {
    const term = search.toLowerCase();
    return (
      student.name.toLowerCase().includes(term) ||
      student.department.toLowerCase().includes(term) ||
      student.email.toLowerCase().includes(term)
    );
  });

  const openEdit = (student) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      department: student.department,
      email: student.email,
    });
  };

  const updateField = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department) return;
    const saved = await onEdit(editingStudent.id, {
      ...editingStudent,
      name: form.name.trim(),
      department: form.department,
      email: form.email.trim(),
    });
    if (saved) setEditingStudent(null);
  };

  const deleteStudent = (student) => {
    if (window.confirm(`Delete ${student.name}?`)) {
      onDelete(student.id);
    }
  };

  const viewProfile = (student) => {
    setProfileDetails(null);
    setProfileError("");
    setProfileLoading(true);
    setViewingStudent(student);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>Manage and view all student information.</p>
        </div>
        <span className="count-badge">{filteredStudents.length} students</span>
      </div>

      {filteredStudents.length > 0 ? (
        <div className="student-grid">
          {filteredStudents.map((student) => (
            <div className="card-wrap" key={student.id}>
              <StudentCard
                name={student.name}
                department={student.department}
                email={student.email}
                onView={() => viewProfile(student)}
                onEdit={() => openEdit(student)}
                onDelete={() => deleteStudent(student)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No students found</h2>
          <p>Try another search or add a new student.</p>
        </div>
      )}

      {editingStudent && (
        <div className="modal-overlay" role="presentation">
          <form className="edit-modal" onSubmit={saveEdit} role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h2>Edit Student</h2>
                <p>Update student information.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setEditingStudent(null)}
              >
                ×
              </button>
            </div>

            <div className="form-grid">
              <label>
                Full name
                <input name="name" value={form.name} onChange={updateField} required />
              </label>
              <label>
                Email address
                <input name="email" type="email" value={form.email} onChange={updateField} required />
              </label>
              <label>
                Department
                <select name="department" value={form.department} onChange={updateField}>
                  {departments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" className="secondary-btn" onClick={() => setEditingStudent(null)}>
                Cancel
              </button>
              <button type="submit" className="primary-btn">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {viewingStudent && (
        <div className="modal-overlay" role="presentation">
          <section
            className="edit-modal student-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-profile-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="student-profile-title">{viewingStudent.name}'s Profile</h2>
                <p>Student details and academic information.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close student profile"
                onClick={() => setViewingStudent(null)}
              >
                ×
              </button>
            </div>

            <dl className="student-profile-details">
              <div>
                <dt>Name</dt>
                <dd>{viewingStudent.name}</dd>
              </div>
              <div>
                <dt>Email address</dt>
                <dd>{viewingStudent.email}</dd>
              </div>
              <div>
                <dt>Department</dt>
                <dd>{viewingStudent.department}</dd>
              </div>
              <div>
                <dt>Added</dt>
                <dd>{formatDate(viewingStudent.createdAt)}</dd>
              </div>
            </dl>

            {profileError && <div className="academic-error" role="alert">{profileError}</div>}
            {profileLoading ? (
              <p className="academic-empty" role="status">Loading {viewingStudent.name}'s profile…</p>
            ) : profileDetails ? (
              <>
                <section className="student-profile-section">
                  <h3>Exam Results</h3>
                  {profileDetails.examResults.length ? (
                    <div className="portal-table-wrap">
                      <table className="portal-data-table">
                        <thead>
                          <tr>
                            <th>Academic year</th>
                            <th>Exam</th>
                            <th>Subject</th>
                            <th>Score</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileDetails.examResults.map((result) => (
                            <tr key={result._id}>
                              <td>{result.academicYear}</td>
                              <td>{result.examName}</td>
                              <td>{result.subject}</td>
                              <td>{result.marksObtained} / {result.maximumMarks}</td>
                              <td>{result.grade || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="academic-empty">No exam results have been recorded.</p>
                  )}
                </section>

                <section className="student-profile-section">
                  <h3>Department Timetable</h3>
                  {profileDetails.timetableImage && (
                    <img
                      className="student-profile-timetable-image"
                      src={profileDetails.timetableImage.dataUrl}
                      alt={`${viewingStudent.department} weekly timetable`}
                    />
                  )}
                  {profileDetails.timetable.length ? (
                    <div className="portal-table-wrap">
                      <table className="portal-data-table">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Class</th>
                            <th>Room / Instructor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profileDetails.timetable.map((entry) => (
                            <tr key={entry._id}>
                              <td>{entry.dayOfWeek}</td>
                              <td>{entry.startTime}–{entry.endTime}</td>
                              <td>{entry.subject}</td>
                              <td>{[entry.room, entry.instructor].filter(Boolean).join(" · ") || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !profileDetails.timetableImage ? (
                    <p className="academic-empty">No timetable has been published for this department.</p>
                  ) : null}
                </section>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}

export default Students;