import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { walletAPI } from "../services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();

  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [balanceResponse, transactionResponse] = await Promise.all([
        walletAPI.getBalance(token),
        walletAPI.getTransactions(token),
      ]);

      const wallet = balanceResponse.wallet || balanceResponse;

      setBalance(wallet.balance ?? wallet.walletBalance ?? null);
      setTransactions(transactionResponse.transactions || []);

      if (refreshUser) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [token, refreshUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const copyBioPayId = async () => {
    if (!user?.bioPayId) return;

    try {
      await navigator.clipboard.writeText(user.bioPayId);
    } catch {
      setError("Unable to copy BioPay ID.");
    }
  };

  const formatAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const isCredit = (transaction) => {
    const type = String(
      transaction.type || transaction.transactionType || ""
    ).toUpperCase();

    return ["CREDIT", "RECEIVED", "DEPOSIT", "TOPUP"].includes(type);
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">BioPay</div>

        <div className="dashboard-header-right">
          <div className="dashboard-user">
            <div className="user-avatar">
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span>{user?.fullName || "BioPay User"}</span>
          </div>

          <button className="text-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="dashboard-welcome">
          <h1>Welcome back, {user?.fullName || "User"}!</h1>
          <p>Here's what's happening with your BioPay wallet.</p>
        </section>

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
            <button className="text-button" onClick={loadDashboard}>
              Retry
            </button>
          </div>
        )}

        <section className="dashboard-overview">
          <div className="wallet-card">
            <div className="wallet-card-top">
              <div>
                <p>Available Wallet Balance</p>
                <h2>
                  {loading ? "Loading..." : formatAmount(balance)}
                </h2>
              </div>
              <div className="wallet-card-symbol">₹</div>
            </div>

            <div className="wallet-card-bottom">
              <span>BioPay ID: {user?.bioPayId || "Not available"}</span>
              <button
                className="wallet-copy-button"
                onClick={copyBioPayId}
              >
                Copy ID
              </button>
            </div>
          </div>

          <div className="dashboard-info-card">
            <div className="info-icon">◉</div>
            <h3>Face Authentication</h3>
            <p>
              {user?.faceEnrolled
                ? "Your face enrollment is active."
                : "Enroll your face to authorize simulated payments."}
            </p>
            <button
              className="text-button"
              onClick={() => navigate("/face-enrollment")}
            >
              {user?.faceEnrolled ? "Manage enrollment" : "Enroll Face"}
            </button>
          </div>
        </section>

        <section className="quick-actions-section">
          <div className="section-heading">
            <h2>Quick Actions</h2>
          </div>

          <div className="quick-actions-grid">
            <button
              className="quick-action-card"
              onClick={() => navigate("/send-money")}
            >
              <div className="quick-action-icon">↗</div>
              <h3>Send Money</h3>
            </button>

            <button
              className="quick-action-card"
              onClick={() => navigate("/transactions")}
            >
              <div className="quick-action-icon">↔</div>
              <h3>Transactions</h3>
            </button>

            <button
              className="quick-action-card"
              onClick={() => navigate("/face-enrollment")}
            >
              <div className="quick-action-icon">◎</div>
              <h3>Enroll Face</h3>
            </button>

            <button
              className="quick-action-card"
              onClick={loadDashboard}
            >
              <div className="quick-action-icon">↻</div>
              <h3>Refresh</h3>
            </button>
          </div>
        </section>

        <section className="recent-transactions-section">
          <div className="section-heading">
            <h2>Recent Transactions</h2>
            <button
              className="text-button"
              onClick={() => navigate("/transactions")}
            >
              View all
            </button>
          </div>

          <div className="transactions-card">
            {loading ? (
              <div className="empty-transactions">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-transactions">
                No transactions yet.
              </div>
            ) : (
              transactions.slice(0, 5).map((transaction, index) => {
                const credit = isCredit(transaction);

                return (
                  <div
                    className="transaction-row"
                    key={transaction._id || index}
                  >
                    <div className="transaction-details">
                      <div className="transaction-icon">
                        {credit ? "↓" : "↑"}
                      </div>
                      <div>
                        <h4>
                          {transaction.description || "Wallet transaction"}
                        </h4>
                        <p>
                          {transaction.status || "Transaction"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`transaction-amount ${
                        credit ? "amount-positive" : "amount-negative"
                      }`}
                    >
                      {credit ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        BioPay — Simulated biometric wallet demonstration
      </footer>
    </div>
  );
};

export default Dashboard;