
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { paymentAPI } from "../services/api";
import FaceVerification from "../components/faceVerification.jsx";

const PaymentVerification = () => {
  const { intentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState("");

  const handleFaceVerified = async () => {
    if (verifyingPayment) return;

    setError("");
    setVerifyingPayment(true);

    try {
      const response = await paymentAPI.confirmPayment(
        token,
        intentId
      );

      if (!response.success) {
        throw new Error(
          response.message || "Payment confirmation failed."
        );
      }

      setPaymentResult(response);
    } catch (err) {
      console.error("Payment confirmation error:", err);
      setError(err.message || "Unable to complete payment.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleCancel = () => {
    if (!verifyingPayment) {
      navigate("/send-money");
    }
  };

  if (paymentResult) {
    const transaction =
      paymentResult.transaction ||
      paymentResult.senderTransaction ||
      {};

    return (
      <div className="payment-verification-page">
        <div className="payment-result-card">
          <div className="payment-success-icon">✓</div>

          <h1>Payment Successful!</h1>

          <p>Your simulated wallet payment is complete.</p>

          <div className="payment-result-details">
            <div>
              <span>Transaction ID</span>
              <strong>
                {transaction._id ||
                  transaction.transactionId ||
                  intentId}
              </strong>
            </div>

            <div>
              <span>Status</span>
              <strong className="payment-status-success">
                COMPLETED
              </strong>
            </div>
          </div>

          <button
            className="payment-primary-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-verification-page">
      <div className="payment-verification-card">
        <button
          className="payment-back-button"
          onClick={handleCancel}
          disabled={verifyingPayment}
        >
          ← Back
        </button>

        <div className="payment-verification-heading">
          <h1>Secure Payment</h1>
          <p>
            Verify your identity to authorize this transaction.
          </p>
        </div>

        {error && (
          <div className="send-money-message error-message">
            {error}
          </div>
        )}

        {verifyingPayment ? (
          <div className="payment-processing">
            <div className="payment-loader" />
            <h3>Processing Payment</h3>
            <p>
              Face verified. Please wait while your transaction completes.
            </p>
          </div>
        ) : (
          <FaceVerification
            intentId={intentId}
            token={token}
            onVerified={handleFaceVerified}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentVerification;
