import { useState } from "react";

function PendingApprovals({ registrations, departments, onApprove, onReject }) {
  const [busyId, setBusyId] = useState("");
  const [approvingAll, setApprovingAll] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");

  const departmentNames = departments.map((department) => department.name);
  const filteredRegistrations = departmentFilter === "All Departments"
    ? registrations
    : registrations.filter(
        (registration) => registration.department === departmentFilter
      );

  const handleAction = async (registration, action) => {
    if (
      action === "reject" &&
      !window.confirm(`Reject the registration request from ${registration.name}?`)
    ) {
      return;
    }

    setBusyId(registration.id);
    try {
      await (action === "approve"
        ? onApprove(registration.id, registration.department)
        : onReject(registration.id));
    } finally {
      setBusyId("");
    }
  };

  const handleApproveAll = async () => {
    if (!window.confirm(`Approve all ${filteredRegistrations.length} pending registrations in ${departmentFilter}?`)) {
      return;
    }

    setApprovingAll(true);
    try {
      for (const registration of filteredRegistrations) {
        await onApprove(
          registration.id,
          registration.department
        );
      }
    } finally {
      setApprovingAll(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Pending Approvals</h1>
          <p>Review student registrations before they can sign in.</p>
        </div>
        <div className="approval-header-actions">
          {registrations.length > 0 && (
            <button
              className="approve-all-btn"
              type="button"
              disabled={approvingAll || Boolean(busyId) || !filteredRegistrations.length}
              onClick={handleApproveAll}
            >
              {approvingAll ? "Approving…" : "Approve All"}
            </button>
          )}
          <span className="count-badge">
            {filteredRegistrations.length} pending
          </span>
        </div>
      </div>

      {registrations.length ? (
        <>
          <div className="approval-category-filter" aria-label="Filter by department">
            <button
              type="button"
              className={departmentFilter === "All Departments" ? "active" : ""}
              aria-pressed={departmentFilter === "All Departments"}
              onClick={() => setDepartmentFilter("All Departments")}
            >
              All Departments
            </button>
            {departmentNames.map((department) => (
              <button
                type="button"
                key={department}
                className={departmentFilter === department ? "active" : ""}
                aria-pressed={departmentFilter === department}
                onClick={() => setDepartmentFilter(department)}
              >
                {department}
              </button>
            ))}
          </div>

          <div className="approval-table-wrap">
            <table className="approval-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Department</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((registration) => (
                <tr key={registration.id}>
                  <td className="approval-student">{registration.name}</td>
                  <td>{registration.email}</td>
                  <td>{registration.department}</td>
                  <td>
                    {registration.createdAt
                      ? new Date(registration.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <div className="approval-actions">
                      <button
                        className="approve-btn"
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => handleAction(registration, "approve")}
                      >
                        {busyId === registration.id ? "Working…" : "Approve"}
                      </button>
                      <button
                        className="reject-btn"
                        type="button"
                        disabled={Boolean(busyId)}
                        onClick={() => handleAction(registration, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2>No pending registrations</h2>
          <p>New student registration requests will appear here.</p>
        </div>
      )}
    </div>
  );
}

export default PendingApprovals;
