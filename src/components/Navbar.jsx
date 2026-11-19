
import { useEffect, useState } from "react";

function Navbar({
  activePage,
  search,
  onSearchChange,
  onNavigate,
  user,
  onLogout,
  showSearch = true,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const userName = user?.name || "Admin User";
  const userRole = user?.role === "admin" ? "Administrator" : "Student";
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  useEffect(() => {
    if (!showProfileDialog) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowProfileDialog(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showProfileDialog]);

  return (
    <header className="navbar">

      {/* Left Section */}
      <div className="navbar-left">
        <div className="page-heading">
          <h2>{activePage}</h2>
          <p>Home / {activePage}</p>
        </div>
      </div>

      {showSearch && (
        <div className="navbar-search">
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />

          {search && (
            <button onClick={() => onSearchChange("")}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Right Section */}
      <div className="navbar-right">

        {/* Notification */}
        <div className="navbar-dropdown-wrapper">
          <button
            className="navbar-icon-btn"
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
          >
            ♧
            <span className="notification-dot"></span>
          </button>

          {showNotifications && (
            <div className="navbar-dropdown notification-dropdown">
              <h4>Notifications</h4>
              <p>Welcome to Studora!</p>
              <p>No new notifications.</p>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="navbar-dropdown-wrapper">
          <button
            className="navbar-profile"
            type="button"
            aria-haspopup="menu"
            aria-expanded={showProfile}
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="navbar-avatar">{initials}</div>

            <div className="navbar-user-info">
              <h4>{userName}</h4>
              <p>{userRole}</p>
            </div>

            <span className="dropdown-arrow">⌄</span>
          </button>

          {showProfile && (
            <div className="navbar-dropdown profile-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfile(false);
                  setShowProfileDialog(true);
                }}
              >
                My Profile
              </button>
              {user?.role === "admin" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowProfile(false);
                    onNavigate("Settings");
                  }}
                >
                  Account Settings
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfile(false);
                  onLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>

      </div>

      {showProfileDialog && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setShowProfileDialog(false)}
        >
          <section
            className="profile-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-dialog-header">
              <div className="profile-dialog-avatar">{initials}</div>
              <button
                className="modal-close"
                type="button"
                aria-label="Close dialog"
                onClick={() => setShowProfileDialog(false)}
              >
                ×
              </button>
            </div>

            <h2 id="profile-dialog-title">My Profile</h2>
            <p className="profile-dialog-description">
              Your Studora account details.
            </p>
            <div className="profile-detail-list">
              <div>
                <span>Name</span>
                <strong>{userName}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{user?.email}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{userRole}</strong>
              </div>
            </div>

            <div className="profile-dialog-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => setShowProfileDialog(false)}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </header>
  );
}

export default Navbar;
