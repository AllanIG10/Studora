let authToken = sessionStorage.getItem("studentHubToken");
const apiBaseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function getAuthToken() {
  return authToken;
}

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    sessionStorage.setItem("studentHubToken", token);
  } else {
    sessionStorage.removeItem("studentHubToken");
  }
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  } else {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const publicAuthEndpoint = [
      "/auth/login",
      "/auth/register",
      "/auth/registration-options",
    ].includes(path);
    if (response.status === 401 && !publicAuthEndpoint) {
      setAuthToken(null);
      window.dispatchEvent(new Event("studenthub-session-expired"));
    }
    throw new Error(result.message || `Request failed (${response.status}).`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const jsonOptions = (method, body) => ({
  method,
  body: JSON.stringify(body),
});

export const api = {
  getRegistrationOptions: () => request("/auth/registration-options"),
  registerStudent: (student) => request("/auth/register", jsonOptions("POST", student)),
  login: (credentials) => request("/auth/login", jsonOptions("POST", credentials)),
  getCurrentUser: () => request("/auth/me"),
  getPendingRegistrations: () => request("/registrations/pending"),
  approveRegistration: (id, department) =>
    request(
      `/registrations/${encodeURIComponent(id)}/approve`,
      jsonOptions("POST", department ? { department } : {})
    ),
  rejectRegistration: (id) =>
    request(`/registrations/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getStudentPortal: () => request("/student/portal"),
  updateStudentProfile: (profile) =>
    request("/student/profile", jsonOptions("PUT", profile)),
  getStudentEvents: () => request("/student/events"),
  getStudentEventPoster: (id) =>
    request(`/student/events/${encodeURIComponent(id)}/poster`),
  getEvents: () => request("/events"),
  getEventPoster: (id) => request(`/events/${encodeURIComponent(id)}/poster`),
  createEvent: (event) => request("/events", { method: "POST", body: event }),
  updateEvent: (id, event) =>
    request(`/events/${encodeURIComponent(id)}`, { method: "PUT", body: event }),
  deleteEventPoster: (id) =>
    request(`/events/${encodeURIComponent(id)}/poster`, { method: "DELETE" }),
  deleteEvent: (id) =>
    request(`/events/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getDepartmentAcademicRecords: (id) =>
    request(`/departments/${encodeURIComponent(id)}/academic-records`),
  updateDepartmentAcademicRecords: (id, records) =>
    request(
      `/departments/${encodeURIComponent(id)}/academic-records`,
      jsonOptions("PUT", records)
    ),
  uploadDepartmentTimetableImage: (id, formData) =>
    request(`/departments/${encodeURIComponent(id)}/timetable-image`, {
      method: "PUT",
      body: formData,
    }),
  deleteDepartmentTimetableImage: (id) =>
    request(`/departments/${encodeURIComponent(id)}/timetable-image`, { method: "DELETE" }),
  getStudentAcademicRecords: (id) =>
    request(`/students/${encodeURIComponent(id)}/academic-records`),
  updateStudentAcademicRecords: (id, records) =>
    request(
      `/students/${encodeURIComponent(id)}/academic-records`,
      jsonOptions("PUT", records)
    ),
  getStudents: () => request("/students"),
  createStudent: (student) => request("/students", jsonOptions("POST", student)),
  updateStudent: (id, student) =>
    request(`/students/${encodeURIComponent(id)}`, jsonOptions("PUT", student)),
  deleteStudent: (id) =>
    request(`/students/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getDepartments: () => request("/departments"),
  createDepartment: (department) =>
    request("/departments", jsonOptions("POST", department)),
  getSettings: () => request("/settings"),
  updateSettings: (settings) => request("/settings", jsonOptions("PUT", settings)),
};
