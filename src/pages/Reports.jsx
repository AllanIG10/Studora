function Reports({ students, departments }) {
  const departmentTotals = departments.map((department) => ({
    ...department,
    students: students.filter((student) => student.department === department.name).length,
  }));
  const maximum = Math.max(1, ...departmentTotals.map((department) => department.students));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Student distribution and system summaries.</p>
        </div>
        <button className="secondary-btn" onClick={() => window.print()}>Print Report</button>
      </div>

      <div className="report-grid">
        <section className="dashboard-panel report-panel">
          <div className="panel-heading">
            <div>
              <h2>Students by Department</h2>
              <p>Current enrollment distribution</p>
            </div>
          </div>
          <div className="bar-chart">
            {departmentTotals.map((department) => (
              <div className="bar-row" key={department.id}>
                <span>{department.name}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${(department.students / maximum) * 100}%` }}
                  />
                </div>
                <strong>{department.students}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel summary-panel">
          <h2>Summary</h2>
          <dl>
            <div><dt>Total Students</dt><dd>{students.length}</dd></div>
            <div><dt>Total Departments</dt><dd>{departments.length}</dd></div>
            <div><dt>Active Students</dt><dd>{students.length}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}

export default Reports;
