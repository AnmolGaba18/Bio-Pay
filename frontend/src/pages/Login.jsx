import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      await login({
        email: formData.email.trim(),
        password: formData.password,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-logo">
          <div className="brand-icon">B</div>
          <span>BioPay</span>
        </div>

        <div className="brand-content">
          <span className="eyebrow">SMARTER PAYMENTS</span>
          <h1>
            Your money.
            <br />
            Your identity.
            <br />
            <span>Your control.</span>
          </h1>
          <p>
            Experience a smarter way to manage your digital wallet
            with biometric face verification.
          </p>
        </div>

        <div className="brand-footer">
          Secure identity-based simulated payments.
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <div className="mobile-brand">
            <div className="brand-icon">B</div>
            <span>BioPay</span>
          </div>

          <div className="auth-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h2>Sign in to BioPay</h2>
            <p>Enter your credentials to access your wallet.</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                className="form-input"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>

              <div className="password-input-wrapper">
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-divider">
            <span>NEW TO BIOPAY?</span>
          </div>

          <p className="auth-switch">
            Don't have an account?
            <Link to="/register"> Create account</Link>
          </p>

          <p className="auth-security-note">
            Your credentials are protected by BioPay authentication.
          </p>
        </div>
      </section>
    </main>
  );
}

export default Login;