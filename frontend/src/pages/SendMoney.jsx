
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { receiverAPI, paymentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

const SendMoney = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [bioPayId, setBioPayId] = useState("");
  const [receiver, setReceiver] = useState(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loadingReceiver, setLoadingReceiver] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFindReceiver = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setReceiver(null);

    if (!bioPayId.trim()) {
      setError("Please enter a BioPay ID.");
      return;
    }

    if (bioPayId.trim() === user?.bioPayId) {
      setError("You cannot send money to yourself.");
      return;
    }

    try {
      setLoadingReceiver(true);

      const response = await receiverAPI.getDetails(
        token,
        bioPayId.trim()
      );

      const receiverData =
        response.receiver ||
        response.user ||
        response.data?.receiver;

      if (!receiverData) {
        throw new Error(response.message || "Receiver not found.");
      }

      setReceiver(receiverData);
      setSuccess("Receiver found successfully.");
    } catch (err) {
      setError(err.message || "Unable to find receiver.");
    } finally {
      setLoadingReceiver(false);
    }
  };

  const handleSendMoney = async (event) => {
    event.preventDefault();

    if (creatingPayment) return;

    setError("");
    setSuccess("");

    const paymentAmount = Number(amount);

    if (!receiver) {
      setError("Please find the receiver first.");
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    try {
      setCreatingPayment(true);

      const response = await paymentAPI.createIntent(token, {
        receiverBioPayId: bioPayId.trim(),
        amount: paymentAmount,
        description: description.trim(),
      });

      console.log("Payment Intent Response:", response);

      const intentId = response.payment?.intentId;

      if (!response.success || !intentId) {
        throw new Error(
          response.message || "Payment intent ID was not returned."
        );
      }

      console.log("Navigating to payment verification:", intentId);

      navigate(`/payment-verification/${intentId}`);
    } catch (err) {
      console.error("Payment creation error:", err);
      setError(err.message || "Unable to initiate payment.");
      setCreatingPayment(false);
    }
  };

  return (
    <div className="send-money-page">
      <header className="send-money-header">
        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
        <h2>Send Money</h2>
      </header>

      <main className="send-money-container">
        <div className="send-money-card">
          <div className="send-money-heading">
            <div className="send-money-icon">↗</div>
            <h1>Transfer Money</h1>
            <p>Send money using a BioPay ID.</p>
          </div>

          {error && (
            <div className="send-money-message error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="send-money-message success-message">
              {success}
            </div>
          )}

          <form onSubmit={handleFindReceiver}>
            <label htmlFor="bioPayId">Receiver BioPay ID</label>

            <div className="receiver-search">
              <input
                id="bioPayId"
                value={bioPayId}
                onChange={(event) => {
                  setBioPayId(event.target.value);
                  setReceiver(null);
                  setError("");
                  setSuccess("");
                }}
                placeholder="Enter receiver BioPay ID"
                required
              />

              <button type="submit" disabled={loadingReceiver}>
                {loadingReceiver ? "Finding..." : "Find"}
              </button>
            </div>
          </form>

          {receiver && (
            <div className="receiver-details">
              <div className="receiver-avatar">
                {receiver.fullName?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <h3>{receiver.fullName}</h3>
                <p>{receiver.bioPayId}</p>
                <span>✓ Receiver found</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMoney}>
            <label htmlFor="amount">Amount (INR)</label>

            <div className="amount-input-wrapper">
              <span>₹</span>
              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>

            <label htmlFor="description">
              Description (Optional)
            </label>

            <textarea
              id="description"
              rows={3}
              maxLength={100}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What's this payment for?"
            />

            <button
              type="submit"
              className="send-money-submit"
              disabled={!receiver || creatingPayment}
            >
              {creatingPayment
                ? "Creating Payment..."
                : "Continue to Face Verification →"}
            </button>
          </form>

          <p className="send-money-security">
            🔒 Face verification is required before payment completion.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SendMoney;
