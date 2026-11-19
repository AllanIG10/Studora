
import { useState } from "react";

function Sidebar({
  activePage,
  onNavigate,
  user,
  onLogout,
  pendingCount,
  menuItems: customMenuItems,
  roleLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultMenuItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "Students", icon: "♙" },
    { name: "Add Student", icon: "+" },
    { name: "Departments", icon: "▤" },
    { name: "Academic Records", icon: "▦" },
    { name: "College Events", icon: "◷" },
    { name: "Pending Approvals", icon: "✓" },
    { name: "Reports", icon: "▥" },
    { name: "Settings", icon: "⚙" },
  ];
  const menuItems = customMenuItems || defaultMenuItems;

  const handleMenuClick = (name) => {
    onNavigate(name);
    setIsOpen(false);
  };
  const name = user?.name || "Administrator";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <>
      <button
        className="menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>

        <div className="sidebar-brand">
          <img className="brand-logo" src="/studora-icon.png" alt="" />
          <div>
            <h2>Studora</h2>
            <span>Management System</span>
          </div>
        </div>

        <div className="sidebar-section">
          <p className="section-title">MAIN MENU</p>

          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.name}
                className={`sidebar-link ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => handleMenuClick(item.name)}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.name}</span>
                {item.name === "Pending Approvals" && pendingCount > 0 && (
                  <span className="pending-count">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-avatar">{initials}</div>

          <div className="profile-info">
            <h4>{name}</h4>
            <p>{roleLabel || "Administrator"}</p>
          </div>

          <button
            className="logout-btn"
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={onLogout}
          >
            ↪
          </button>
        </div>

      </aside>
    </>
  );
}

export default Sidebar;
