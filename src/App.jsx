import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import AddStudent from "./pages/AddStudent";
import Departments from "./pages/Departments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import StudentPortal from "./pages/StudentPortal";
import PendingApprovals from "./pages/PendingApprovals";
import AcademicRecords from "./pages/AcademicRecords";
import Events from "./pages/Events";
import { api, getAuthToken, setAuthToken } from "./services/api";

const pageRoutes = {
  Dashboard: "/home",
  Students: "/home/students",
  "Add Student": "/home/add-student",
  Departments: "/home/departments",
  "Academic Records": "/home/academic-records",
  "College Events": "/home/events",
  "Pending Approvals": "/home/pending-approvals",
  Reports: "/home/reports",
  Settings: "/home/settings",
};

const pageByPath = Object.fromEntries(
  Object.entries(pageRoutes).map(([page, path]) => [path, page])
);
pageByPath["/home/dashboard"] = "Dashboard";

const studentSections = {
  "/student/home": "Overview",
  "/student/profile": "Profile",
  "/student/timetable": "Timetable",
  "/student/results": "Exam Results",
  "/student/attendance": "Attendance",
  "/student/campus-map": "Campus Map",
  "/student/fee": "Fee",
  "/student/homework": "Homework",
  "/student/transport": "Transport",
  "/student/events": "Next Event",
};
const studentPaths = {
  Overview: "/student/home",
  Profile: "/student/profile",
  Timetable: "/student/timetable",
  "Exam Results": "/student/results",
  Attendance: "/student/attendance",
  "Campus Map": "/student/campus-map",
  Fee: "/student/fee",
  Homework: "/student/homework",
  Transport: "/student/transport",
  "Next Event": "/student/events",
};

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [settings, setSettings] = useState(null);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [apiError, setApiError] = useState("");
  const [authError, setAuthError] = useState("");
  const activePage = pageByPath[pathname] || "Dashboard";
  const navigateToPage = (page) => navigate(pageRoutes[page] || pageRoutes.Dashboard);

  const loadAdminData = async () => {
    const [loadedStudents, loadedDepartments, loadedSettings, loadedRegistrations, loadedEvents] = await Promise.all([
      api.getStudents(),
      api.getDepartments(),
      api.getSettings(),
      api.getPendingRegistrations(),
      api.getEvents(),
    ]);
    setStudents(loadedStudents);
    setDepartments(loadedDepartments);
    setSettings(loadedSettings);
    setPendingRegistrations(loadedRegistrations);
    setEvents(loadedEvents);
  };

  useEffect(() => {
    let active = true;
    const token = getAuthToken();

    if (!token) {
      return () => {
        active = false;
      };
    }

    api.getCurrentUser()
      .then(async (currentUser) => {
        if (currentUser.role === "admin") await loadAdminData();
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        setAuthToken(null);
        if (active) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (pathname !== "/login") navigate("/login", { replace: true });
      return;
    }

    if (user.role === "student") {
      if (!studentSections[pathname]) {
        navigate("/student/home", { replace: true });
      }
      return;
    }

    if (!pageByPath[pathname]) {
      navigate("/home", { replace: true });
    }
  }, [loading, user, pathname, navigate]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setAuthToken(null);
      setUser(null);
      setAuthError("Your session has expired. Please sign in again.");
    };

    window.addEventListener("studenthub-session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("studenthub-session-expired", handleExpiredSession);
  }, []);

  const establishSession = async (session) => {
    setAuthToken(session.token);
    try {
      if (session.user.role === "admin") await loadAdminData();
      setAuthError("");
      setApiError("");
      setUser(session.user);
    } catch (error) {
      setAuthToken(null);
      throw error;
    }
  };

  const login = async (credentials) => {
    await establishSession(await api.login(credentials));
  };

  const register = (details) => api.registerStudent(details);

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setStudents([]);
    setDepartments([]);
    setSettings(null);
    setPendingRegistrations([]);
    setEvents([]);
    setApiError("");
    navigate("/login", { replace: true });
  };

  const runMutation = async (operation, onSuccess) => {
    setApiError("");
    try {
      const result = await operation();
      if (onSuccess) await onSuccess(result);
      return true;
    } catch (error) {
      setApiError(error.message);
      return false;
    }
  };

  const addStudent = (student) =>
    runMutation(
      () => api.createStudent(student),
      (createdStudent) => {
        setStudents((current) => [...current, createdStudent]);
        navigateToPage("Students");
      }
    );

  const addDepartment = (department) =>
    runMutation(
      () => api.createDepartment(department),
      (createdDepartment) =>
        setDepartments((current) => [...current, createdDepartment])
    );

  const deleteStudent = (id) =>
    runMutation(
      () => api.deleteStudent(id),
      () => setStudents((current) => current.filter((student) => student.id !== id))
    );

  const editStudent = (id, updatedStudent) =>
    runMutation(
      () => api.updateStudent(id, updatedStudent),
      (savedStudent) =>
        setStudents((current) =>
          current.map((student) => (student.id === id ? savedStudent : student))
        )
    );

  const saveSettings = (updatedSettings) =>
    runMutation(
      () => api.updateSettings(updatedSettings),
      (savedSettings) => setSettings(savedSettings)
    );

  const approveRegistration = (id, department) =>
    runMutation(
      () => api.approveRegistration(id, department),
      ({ student }) => {
        setPendingRegistrations((current) =>
          current.filter((registration) => registration.id !== id)
        );
        setStudents((current) =>
          current.some((existing) => existing.id === student.id)
            ? current
            : [...current, student]
        );
      }
    );

  const rejectRegistration = (id) =>
    runMutation(
      () => api.rejectRegistration(id),
      () => setPendingRegistrations((current) =>
        current.filter((registration) => registration.id !== id)
      )
    );

  const saveEvent = (id, eventData) =>
    id
      ? runMutation(
          () => api.updateEvent(id, eventData),
          (savedEvent) => setEvents((current) =>
            current.map((event) => event.id === id ? savedEvent : event)
          )
        )
      : runMutation(
          () => api.createEvent(eventData),
          (createdEvent) => setEvents((current) => [...current, createdEvent])
        );

  const deleteEvent = (id) =>
    runMutation(
      () => api.deleteEvent(id),
      () => setEvents((current) => current.filter((event) => event.id !== id))
    );

  const removeEventPoster = (id) =>
    runMutation(
      () => api.deleteEventPoster(id),
      () => setEvents((current) =>
        current.map((event) => event.id === id ? { ...event, poster: null } : event)
      )
    );

  if (loading) {
    return (
      <main className="auth-loading" role="status">
        <img className="loading-logo" src="/studora-icon.png" alt="" />
        <span>Checking your session…</span>
      </main>
    );
  }
  if (!user) {
    return <Login onLogin={login} onRegister={register} initialError={authError} />;
  }
  if (user.role === "student") {
    return (
      <StudentPortal
        user={user}
        activeSection={studentSections[pathname]}
        onNavigate={(section) => navigate(studentPaths[section] || studentPaths.Overview)}
        onProfileUpdated={(profile) => setUser((current) => ({
          ...current,
          name: profile.name,
          email: profile.email,
          student: {
            ...current.student,
            name: profile.name,
            email: profile.email,
            department: profile.department,
          },
        }))}
        onLogout={logout}
      />
    );
  }

  const departmentsWithCounts = departments.map((department) => ({
    ...department,
    students: students.filter((student) => student.department === department.name).length,
  }));

  const renderPage = () => {
    switch (activePage) {
      case "Students":
        return (
          <Students
            students={students}
            departments={departmentsWithCounts}
            search={search}
            onDelete={deleteStudent}
            onEdit={editStudent}
          />
        );
      case "Add Student":
        return <AddStudent departments={departmentsWithCounts} onAdd={addStudent} />;
      case "Departments":
        return <Departments departments={departmentsWithCounts} onAdd={addDepartment} />;
      case "Reports":
        return <Reports students={students} departments={departmentsWithCounts} />;
      case "Settings":
        return <Settings settings={settings} onSave={saveSettings} />;
      case "Pending Approvals":
        return (
          <PendingApprovals
            registrations={pendingRegistrations}
            departments={departments}
            onApprove={approveRegistration}
            onReject={rejectRegistration}
          />
        );
      case "Academic Records":
        return <AcademicRecords students={students} departments={departmentsWithCounts} />;
      case "College Events":
        return (
          <Events
            events={events}
            onSave={saveEvent}
            onDelete={deleteEvent}
            onRemovePoster={removeEventPoster}
          />
        );
      default:
        return <Dashboard students={students} departments={departmentsWithCounts} onNavigate={navigateToPage} />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onNavigate={navigateToPage}
        user={user}
        onLogout={logout}
        pendingCount={pendingRegistrations.length}
      />
      <div className="main-layout">
        <Navbar
          activePage={activePage}
          search={search}
          onSearchChange={setSearch}
          onNavigate={navigateToPage}
          user={user}
          onLogout={logout}
        />
        <main className="dashboard-content">
          {apiError && (
            <div className="api-error" role="alert">
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
          {renderPage()}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
