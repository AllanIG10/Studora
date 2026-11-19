function Dashboard({ students, departments, onNavigate }) {
  const cards = [
    { label: "Total Students", value: students.length, icon: "♙", tone: "blue" },
    { label: "Departments", value: departments.length, icon: "▤", tone: "purple" },
    { label: "Active Students", value: students.length, icon: "✓", tone: "green" },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of student management activities.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("Add Student")}>
          + Add Student
        </button>
      </div>

      <section className="stats-grid">
        {cards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div className={`stat-icon ${card.tone}`}>{card.icon}</div>
            <div>
              <p>{card.label}</p>
              <h2>{card.value}</h2>
            </div>
          </div>
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent Students</h2>
            <p>Latest students in the system</p>
          </div>
          <button className="text-btn" onClick={() => onNavigate("Students")}>
            View all →
          </button>
        </div>
        <div className="student-grid">
          {students.slice(-4).reverse().map((student) => (
            <div className="student-card compact-card" key={student.id}>
              <div className="student-card-header">
                <div className="student-avatar">{student.name.charAt(0).toUpperCase()}</div>
                <div className="student-details">
                  <h2>{student.name}</h2>
                  <span className="student-status">Active Student</span>
                </div>
              </div>
              <div className="student-info">
                <div className="student-info-item">
                  <span className="info-label">Department</span>
                  <span className="department-badge">{student.department}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;