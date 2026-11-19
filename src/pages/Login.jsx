import { useEffect, useState } from "react";
import { api } from "../services/api";

function Login({ onLogin, onRegister, initialError = "" }) {
  const [mode, setMode] = useState("login");
  const [accountType, setAccountType] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departments, setDepartments] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    api.getRegistrationOptions()
      .then((options) => {
        if (active) {
          setDepartments(options);
          setDepartment(options[0]?.name || "");
        }
      })
      .catch((requestError) => {
        if (active) setOptionsError(requestError.message);
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await onLogin({
          email,
          password,
          role: accountType === "staff" ? "admin" : "student",
        });
      } else {
        const result = await onRegister({ name, email, password, department });
        setMode("login");
        setAccountType("student");
        setPassword("");
        setConfirmPassword("");
        setSuccess(result.message);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const showRegister = () => {
    setError("");
    setSuccess("");
    setAccountType("student");
    setMode("register");
  };

  const showAdminLogin = () => {
    setError("");
    setSuccess("");
    setMode("login");
    setAccountType("staff");
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img
            className="auth-brand-image"
            src="/studora-logo.png"
            alt="Studora — Your Campus. Your World."
          />
        </div>

        <div className="auth-heading">
          <h1>{mode === "login" ? "Welcome back" : "Create your student account"}</h1>
          <p>
            {mode === "login"
              ? `Sign in to your ${accountType} account.`
              : "Register your student details to get started."}
          </p>
        </div>

        <div className="account-type-switch" role="group" aria-label="Sign in as">
          <button
            type="button"
            className={accountType === "student" ? "selected" : ""}
            aria-pressed={accountType === "student"}
            onClick={() => {
              setAccountType("student");
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Student
          </button>
          <button
            type="button"
            className={accountType === "staff" ? "selected" : ""}
            aria-pressed={accountType === "staff"}
            onClick={() => {
              setAccountType("staff");
              setMode("login");
              setError("");
              setSuccess("");
            }}
          >
            Staff
          </button>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span>{error}</span>
            {mode === "login" &&
              accountType === "student" &&
              error.toLowerCase().includes("not registered") && (
              <button type="button" onClick={showRegister}>
                Register as a student
              </button>
            )}
          </div>
        )}

        {success && <div className="auth-success" role="status">{success}</div>}

        {optionsError && mode === "register" && (
          <div className="auth-error" role="alert">{optionsError}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label>
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                Department
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  required
                  disabled={!departments.length}
                >
                  {departments.map((item) => (
                    <option key={item._id || item.id || item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {!departments.length && !optionsError && (
                  <small>
                    {optionsLoading
                      ? "Loading departments…"
                      : "No departments are available. Please contact the administrator."}
                  </small>
                )}
              </label>
            </>
          )}

          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              maxLength={72}
              required
            />
            {mode === "register" && <small>Use at least 8 characters.</small>}
          </label>

          {mode === "register" && (
            <label>
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </label>
          )}

          <button
            className="primary-btn auth-submit"
            type="submit"
            disabled={
              submitting ||
              (mode === "register" &&
                (!departments.length || optionsLoading || Boolean(optionsError)))
            }
          >
            {submitting
              ? "Please wait…"
              : mode === "login"
                ? "Sign In"
                : "Register"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" && accountType === "student" ? (
            <>
              <span>New student?</span>
              <button type="button" onClick={showRegister}>Create an account</button>
            </>
          ) : mode === "register" ? (
            <>
              <span>Already registered?</span>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("login");
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <span>Staff accounts are created by the administrator.</span>
          )}
        </div>

        <p className="auth-admin-note">
          Administrator?{" "}
          <button type="button" className="auth-admin-link" onClick={showAdminLogin}>
            Sign in here
          </button>
        </p>
      </section>
    </main>
  );
}

export default Login;
