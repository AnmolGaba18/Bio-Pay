
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
        setSuccess("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (
            !formData.fullName.trim() ||
            !formData.email.trim() ||
            !formData.phone.trim() ||
            !formData.password
        ) {
            setError("Please complete all required fields.");
            return;
        }

        if (formData.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await register({
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                password: formData.password,
            });

            setSuccess(
                response.message || "Account created successfully!"
            );

            // If registration returned a JWT, AuthContext
            // has already authenticated the user.
            if (response.token && response.user) {
                navigate("/dashboard", { replace: true });
            } else {
                setTimeout(() => {
                    navigate("/login", { replace: true });
                }, 1200);
            }

        } catch (err) {
            setError(
                err.message || "Registration failed. Please try again."
            );
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
                    <span className="eyebrow">GET STARTED</span>

                    <h1>
                        Banking
                        <br />
                        made more
                        <br />
                        <span>personal.</span>
                    </h1>

                    <p>
                        Create your BioPay account and experience
                        convenient wallet management with biometric
                        identity verification.
                    </p>
                </div>

                <div className="brand-footer">
                    Create your account. Take control of your wallet.
                </div>
            </section>

            <section className="auth-form-panel">
                <div className="auth-form-container">
                    <div className="mobile-brand">
                        <div className="brand-icon">B</div>
                        <span>BioPay</span>
                    </div>

                    <div className="auth-heading">
                        <span className="eyebrow">CREATE ACCOUNT</span>
                        <h2>Join BioPay</h2>
                        <p>
                            Enter your details to create your wallet.
                        </p>
                    </div>

                    {error && (
                        <div className="alert alert-error" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success" role="status">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="fullName">
                                Full name
                            </label>

                            <input
                                id="fullName"
                                className="form-input"
                                type="text"
                                name="fullName"
                                placeholder="Enter your full name"
                                value={formData.fullName}
                                onChange={handleChange}
                                maxLength={100}
                                autoComplete="name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                Email address
                            </label>

                            <input
                                id="email"
                                className="form-input"
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="phone">
                                Phone number
                            </label>

                            <input
                                id="phone"
                                className="form-input"
                                type="tel"
                                name="phone"
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={handleChange}
                                autoComplete="tel"
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
                                    name="password"
                                    placeholder="Minimum 8 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword((previous) => !previous)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label
                                className="form-label"
                                htmlFor="confirmPassword"
                            >
                                Confirm password
                            </label>

                            <input
                                id="confirmPassword"
                                className="form-input"
                                type="password"
                                name="confirmPassword"
                                placeholder="Re-enter your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-block auth-submit"
                            disabled={loading}
                        >
                            {loading ? "Creating account..." : "Create account"}
                            {!loading && <span aria-hidden="true">→</span>}
                        </button>
                    </form>

                    <div className="auth-divider">
                        <span>ALREADY A MEMBER?</span>
                    </div>

                    <p className="auth-switch">
                        Already have an account?
                        <Link to="/login"> Sign in</Link>
                    </p>

                    <p className="auth-security-note">
                        Your account is protected by BioPay authentication.
                    </p>
                </div>
            </section>
        </main>
    );
}

export default Register;
