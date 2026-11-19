import { useEffect, useState } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EventPoster from "../components/EventPoster";
import { api } from "../services/api";

const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const studentMenuItems = [
  { name: "Overview", icon: "⌂" },
  { name: "Profile", icon: "♙" },
  { name: "Timetable", icon: "▦" },
  { name: "Exam Results", icon: "▥" },
  { name: "Attendance", icon: "✓" },
  { name: "Campus Map", icon: "⌖" },
  { name: "Fee", icon: "₹" },
  { name: "Homework", icon: "▤" },
  { name: "Transport", icon: "🚌" },
  { name: "Next Event", icon: "◷" },
];

const studentQuickActions = [
  { name: "Fee", icon: "₹", description: "View fee details" },
  { name: "Timetable", icon: "▦", description: "Class schedule" },
  { name: "Attendance", icon: "✓", description: "Daily attendance" },
  { name: "Exam Results", icon: "▥", description: "Scores and grades" },
  { name: "Homework", icon: "▤", description: "Assignments" },
  { name: "Campus Map", icon: "⌖", description: "Explore campus" },
  { name: "Next Event", icon: "◷", description: "College notices" },
  { name: "Transport", icon: "🚌", description: "Bus routes" },
];

const formatEventDate = (value) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

function StudentPortal({ user, activeSection, onNavigate, onProfileUpdated, onLogout }) {
  const [profile, setProfile] = useState(user.student);
  const [timetable, setTimetable] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [studentServices, setStudentServices] = useState({
    campusMapLocation: "Adithya Institute of Technology, Coimbatore",
    attendance: [],
    campusMap: [],
    fees: [],
    homework: [],
    transport: [],
  });
  const [timetableImage, setTimetableImage] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({ name: "", email: "", department: "" });

  useEffect(() => {
    let active = true;
    api.getStudentPortal()
      .then((portal) => {
        if (!active) return;
        setProfile(portal);
        setTimetable(portal.timetable || []);
        setExamResults(portal.examResults || []);
        setTimetableImage(portal.timetableImage || null);
        setStudentServices({
          campusMapLocation: portal.studentServices?.campusMapLocation ||
            "Adithya Institute of Technology, Coimbatore",
          attendance: portal.studentServices?.attendance || [],
          campusMap: portal.studentServices?.campusMap || [],
          fees: portal.studentServices?.fees || [],
          homework: portal.studentServices?.homework || [],
          transport: portal.studentServices?.transport || [],
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "Next Event") return undefined;
    let active = true;

    api.getStudentEvents()
      .then((upcomingEvents) => {
        if (!active) return;
        setEvents(upcomingEvents);
        setEventsError("");
        setEventsLoaded(true);
      })
      .catch((requestError) => {
        if (!active) return;
        setEventsError(requestError.message);
        setEventsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [activeSection]);

  const student = profile || user.student;
  const profileEditing = profile?.profileEditing;
  const sortedTimetable = [...timetable].sort((first, second) =>
    dayOrder.indexOf(first.dayOfWeek) - dayOrder.indexOf(second.dayOfWeek) ||
    first.startTime.localeCompare(second.startTime)
  );
  const showProfile = activeSection === "Overview" || activeSection === "Profile";
  const showTimetable = activeSection === "Overview" || activeSection === "Timetable";
  const showResults = activeSection === "Overview" || activeSection === "Exam Results";
  const showAttendance = activeSection === "Attendance";
  const showCampusMap = activeSection === "Campus Map";
  const showFee = activeSection === "Fee";
  const showHomework = activeSection === "Homework";
  const showTransport = activeSection === "Transport";
  const showOverviewActions = activeSection === "Overview";
  const showEvents = activeSection === "Next Event";
  const eventsLoading = showEvents && !eventsLoaded;

  const startEditingProfile = () => {
    setProfileForm({
      name: student?.name || "",
      email: student?.email || "",
      department: student?.department || "",
    });
    setProfileError("");
    setEditingProfile(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    try {
      const result = await api.updateStudentProfile(profileForm);
      setProfile((current) => ({
        ...current,
        ...result.profile,
        profileEditing: result.profileEditing,
      }));
      onProfileUpdated(result.profile);
      setEditingProfile(false);
    } catch (requestError) {
      setProfileError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activeSection}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        menuItems={studentMenuItems}
        roleLabel="Student"
      />
      <div className="main-layout">
        <Navbar
          activePage={activeSection}
          search=""
          onSearchChange={() => {}}
          onNavigate={onNavigate}
          user={user}
          onLogout={onLogout}
          showSearch={false}
        />
        <main className="dashboard-content">
          <section className="portal-content">
            <div className="portal-welcome">
              <span className="student-avatar">{student?.name?.charAt(0).toUpperCase() || "S"}</span>
              <div>
                <h1>Welcome, {student?.name || user.name}</h1>
                <p>Your profile, timetable, exam results, and college events.</p>
              </div>
            </div>

            {error && <div className="academic-error" role="alert">{error}</div>}

            {showOverviewActions && (
              <section className="student-quick-actions" aria-label="Frequent activities">
                <div>
                  <h2>Frequent Activities</h2>
                  <p>Quick access to student services.</p>
                </div>
                <div className="student-quick-grid">
                  {studentQuickActions.map((action) => (
                    <button
                      type="button"
                      key={action.name}
                      onClick={() => onNavigate(action.name)}
                      aria-label={action.description}
                    >
                      <span className="student-quick-icon">{action.icon}</span>
                      <strong>{action.name}</strong>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {showAttendance && (
              <article className="portal-record-card student-service-card">
                <div className="portal-record-heading">
                  <div>
                    <h2>Attendance Records</h2>
                    <p>Class attendance summaries published by your institution.</p>
                  </div>
                </div>
                {studentServices.attendance.length ? (
                  <div className="portal-table-wrap">
                    <table className="portal-data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Class / subject</th>
                          <th>Present</th>
                          <th>Total</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentServices.attendance.map((record, index) => (
                          <tr key={`${record.date}-${record.subject}-${index}`}>
                            <td>{new Date(`${record.date}T00:00:00`).toLocaleDateString()}</td>
                            <td className="portal-table-primary">{record.subject}</td>
                            <td>{record.presentCount}</td>
                            <td>{record.totalCount}</td>
                            <td>{Math.round((record.presentCount / record.totalCount) * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="academic-empty">No attendance records have been published yet.</p>
                )}
              </article>
            )}

            {showCampusMap && (
              <article className="portal-record-card student-service-card">
                <div className="portal-record-heading">
                  <div>
                    <h2>Campus Map</h2>
                    <p>Explore important locations across the campus.</p>
                  </div>
                </div>
                <div className="campus-google-map">
                  <iframe
                    title={`Google Maps: ${studentServices.campusMapLocation}`}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(studentServices.campusMapLocation)}&z=16&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <a
                  className="campus-map-directions"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studentServices.campusMapLocation)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
                {studentServices.campusMap.length > 0 && (
                  <ul className="campus-location-list">
                    {studentServices.campusMap.map((location, index) => (
                      <li key={`${location.name}-details-${index}`}>
                        <strong>{location.name}</strong>
                        <span>{location.description}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )}

            {(showFee || showHomework || showTransport) && (
              <article className="portal-record-card student-service-card">
                <div className="portal-record-heading">
                  <div>
                    <h2>{activeSection}</h2>
                    <p>
                      {showFee
                        ? "View your payment status and fee details."
                        : showHomework
                          ? "View assignments and submission deadlines."
                          : "View your campus transport routes."}
                    </p>
                  </div>
                </div>
                {showFee && (studentServices.fees.length ? (
                  <div className="student-published-list">
                    {studentServices.fees.map((fee, index) => (
                      <article key={`${fee.title}-${index}`}>
                        <h3>{fee.title}</h3>
                        <strong>{new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: "INR",
                        }).format(fee.amount)}</strong>
                        <p>Due {new Date(`${fee.dueDate}T00:00:00`).toLocaleDateString()}</p>
                        <p>{fee.details}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="academic-empty">No fee information has been published.</p>)}
                {showHomework && (studentServices.homework.length ? (
                  <div className="student-published-list">
                    {studentServices.homework.map((assignment, index) => (
                      <article key={`${assignment.title}-${index}`}>
                        <h3>{assignment.title}</h3>
                        <strong>{assignment.subject}</strong>
                        <p>Due {new Date(`${assignment.dueDate}T00:00:00`).toLocaleDateString()}</p>
                        <p>{assignment.details}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="academic-empty">No homework or assignments have been published.</p>)}
                {showTransport && (studentServices.transport.length ? (
                  <div className="student-published-list">
                    {studentServices.transport.map((route, index) => (
                      <article key={`${route.route}-${index}`}>
                        <h3>{route.route}</h3>
                        <strong>Pickup: {route.pickupTime}</strong>
                        <p>Stops: {route.stops}</p>
                      </article>
                    ))}
                  </div>
                ) : <p className="academic-empty">No transport routes have been published.</p>)}
              </article>
            )}

            {showProfile && (
              <article className="portal-profile">
                <div className="portal-profile-header">
                  <h2>Student Profile</h2>
                  {!editingProfile && profileEditing && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={startEditingProfile}
                      disabled={profileEditing.isComplete ||
                        profileEditing.changesRemainingThisSemester === 0}
                    >
                      Edit profile
                    </button>
                  )}
                </div>
                {profileEditing ? (
                  <p className="profile-edit-allowance" role="status">
                    Semester {profileEditing.semester} of {profileEditing.semestersTotal}
                    {" · "}{profileEditing.semestersRemaining} semesters remaining after this one
                    {" · "}{profileEditing.changesRemainingThisSemester} of {profileEditing.changesPerSemesterLimit} changes remaining this semester
                    {" · "}{profileEditing.totalChangesRemaining} of {profileEditing.totalChangesLimit} changes remaining overall
                  </p>
                ) : (
                  <p className="profile-edit-allowance" role="status">
                    {loading ? "Loading profile edit allowance…" : "Profile editing is unavailable."}
                  </p>
                )}
                {editingProfile ? (
                  <form className="portal-profile-form" onSubmit={saveProfile}>
                    {profileError && <div className="academic-error" role="alert">{profileError}</div>}
                    <label>
                      Name
                      <input
                        type="text"
                        autoComplete="name"
                        maxLength={100}
                        required
                        value={profileForm.name}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                        value={profileForm.email}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Department
                      <select
                        required
                        value={profileForm.department}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, department: event.target.value }))
                        }
                      >
                        {(student?.availableDepartments || []).map((department) => (
                          <option key={department} value={department}>{department}</option>
                        ))}
                      </select>
                    </label>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setEditingProfile(false)}
                        disabled={savingProfile}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="primary-btn" disabled={savingProfile}>
                        {savingProfile ? "Saving…" : "Save profile"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>{student?.name || user.name}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{student?.email || user.email}</dd>
                    </div>
                    <div>
                      <dt>Department</dt>
                      <dd>{student?.department || "Not assigned"}</dd>
                    </div>
                  </dl>
                )}
              </article>
            )}

            <div className="portal-academic-grid">
              {showTimetable && (
                <article className="portal-record-card">
                  <div className="portal-record-heading">
                    <div>
                      <h2>Weekly Timetable</h2>
                      <p>Your recurring classes by day and time.</p>
                    </div>
                  </div>
                  {timetableImage && (
                    <div className="portal-timetable-image">
                      <img src={timetableImage.dataUrl} alt="Weekly timetable" />
                      <span>{timetableImage.fileName}</span>
                    </div>
                  )}
                  {loading ? (
                    <p className="academic-empty" role="status">Loading timetable…</p>
                  ) : sortedTimetable.length ? (
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
                          {sortedTimetable.map((entry) => (
                            <tr key={entry._id}>
                              <td className="portal-table-primary">{entry.dayOfWeek}</td>
                              <td>{entry.startTime}–{entry.endTime}</td>
                              <td>{entry.subject}</td>
                              <td>
                                {[entry.room, entry.instructor].filter(Boolean).join(" · ") || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="academic-empty">
                      {error
                        ? "Timetable could not be loaded."
                        : timetableImage
                          ? "No class entries have been published."
                          : "No timetable has been published yet."}
                    </p>
                  )}
                </article>
              )}

              {showResults && (
                <article className="portal-record-card">
                  <div className="portal-record-heading">
                    <div>
                      <h2>Exam Results</h2>
                      <p>Your recorded scores and grades.</p>
                    </div>
                  </div>
                  {loading ? (
                    <p className="academic-empty" role="status">Loading results…</p>
                  ) : examResults.length ? (
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
                          {examResults.map((result) => (
                            <tr key={result._id}>
                              <td>{result.academicYear}</td>
                              <td>{result.examName}</td>
                              <td className="portal-table-primary">{result.subject}</td>
                              <td>{result.marksObtained} / {result.maximumMarks}</td>
                              <td>{result.grade || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="academic-empty">
                      {error ? "Exam results could not be loaded." : "No exam results have been published yet."}
                    </p>
                  )}
                </article>
              )}
            </div>

            {showEvents && (
              <article className="portal-record-card portal-events-card">
                <div className="portal-record-heading">
                  <div>
                    <h2>Upcoming College Events</h2>
                    <p>Important dates and activities from your college.</p>
                  </div>
                </div>
                {eventsError && <div className="academic-error" role="alert">{eventsError}</div>}
                {eventsLoading ? (
                  <p className="academic-empty" role="status">Loading upcoming events…</p>
                ) : events.length ? (
                  <div className="portal-event-list">
                    {events.map((event, index) => (
                      <article className="portal-event-card" key={event.id}>
                        <div className="portal-event-heading">
                          <h3>{event.title}</h3>
                          {index === 0 && <span className="event-status">Next event</span>}
                        </div>
                        <p className="portal-event-time">
                          {formatEventDate(event.startsAt)} – {formatEventDate(event.endsAt)}
                        </p>
                        {event.location && <p className="portal-event-location">{event.location}</p>}
                        {event.description && <p className="portal-event-description">{event.description}</p>}
                        {event.poster && (
                          <EventPoster
                            eventId={event.id}
                            audience="student"
                            title={event.title}
                          />
                        )}
                      </article>
                    ))}
                  </div>
                ) : !eventsError ? (
                  <p className="academic-empty">No upcoming events have been published.</p>
                ) : null}
              </article>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default StudentPortal;
