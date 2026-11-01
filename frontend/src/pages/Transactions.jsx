import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { walletAPI } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

const Transactions = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        const response = await walletAPI.getTransactions(token);

        if (active) {
          setTransactions(response.transactions || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load transactions.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      active = false;
    };
  }, [token]);

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    <div className="transactions-page">
      <header className="transactions-header">
        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
        <h2>Transaction History</h2>
      </header>

      <main className="transactions-container">
        <div className="transactions-title">
          <h1>Your Transactions</h1>
          <p>View your recent wallet activity.</p>
        </div>

        {loading ? (
          <div className="transactions-state">
            Loading transactions...
          </div>
        ) : error ? (
          <div className="transactions-state error-message">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="transactions-empty">
            <div className="transactions-empty-icon">↔</div>
            <h3>No transactions yet</h3>
            <p>Your wallet activity will appear here.</p>
            <button
              className="payment-primary-button"
              onClick={() => navigate("/send-money")}
            >
              Send Money
            </button>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((transaction, index) => {
              const credit = isCredit(transaction);
              const status = String(
                transaction.status || "UNKNOWN"
              ).toUpperCase();

              return (
                <div
                  className="history-transaction-row"
                  key={transaction._id || transaction.transactionId || index}
                >
                  <div className="history-transaction-icon">
                    {credit ? "↓" : "↑"}
                  </div>

                  <div className="history-transaction-info">
                    <h3>
                      {transaction.description ||
                        transaction.type ||
                        "Wallet transaction"}
                    </h3>

                    <p>
                      {formatDate(
                        transaction.createdAt || transaction.date
                      )}
                    </p>

                    <span
                      className={`transaction-status ${
                        status === "COMPLETED"
                          ? "status-completed"
                          : status === "FAILED"
                            ? "status-failed"
                            : "status-pending"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div
                    className={`history-transaction-amount ${
                      credit ? "amount-positive" : "amount-negative"
                    }`}
                  >
                    {credit ? "+" : "-"}
                    {formatAmount(transaction.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Transactions;