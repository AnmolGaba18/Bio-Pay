import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { biometricAPI } from "../services/api";

export default function FaceEnrollment() {
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    setError("");
    setMessage("");

    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : "Unable to access camera. Check your camera connection."
      );
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !cameraReady) {
      setError("Please start your camera first.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to capture image. Try again.");
          return;
        }

        setCapturedImage(
          new File([blob], "face-enrollment.jpg", {
            type: "image/jpeg",
          })
        );

        setMessage("Photo captured successfully.");
        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleEnrollment = async () => {
    if (!capturedImage) {
      setError("Please capture your face photo first.");
      return;
    }

    if (!consent) {
      setError("Please provide consent to enroll your face.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await biometricAPI.enrollFace(
        token,
        capturedImage,
        consent
      );

      if (!response.success) {
        throw new Error(response.message || "Face enrollment failed.");
      }

      await refreshUser();

      setMessage("Face enrolled successfully!");
      setCapturedImage(null);
    } catch (err) {
      setError(err.message || "Unable to enroll face.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-enrollment-page">
      <div className="face-enrollment-card">
        <button
          className="back-button"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="face-enrollment-heading">
          <div className="face-enrollment-icon">◎</div>
          <h1>Face Enrollment</h1>
          <p>
            Register your face to authorize simulated BioPay payments.
          </p>
        </div>

        {user?.faceEnrolled && (
          <div className="enrollment-status">
            ✓ Your face is already enrolled.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {message && <div className="enrollment-message">{message}</div>}

        <div className="camera-container">
          {capturedImage ? (
            <img
              src={URL.createObjectURL(capturedImage)}
              alt="Captured face"
              className="captured-face-image"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="face-camera"
            />
          )}

          <canvas ref={canvasRef} hidden />
        </div>

        {!cameraReady && !capturedImage && (
          <button
            className="face-action-button"
            onClick={startCamera}
          >
            Start Camera
          </button>
        )}

        {cameraReady && (
          <button
            className="face-action-button"
            onClick={capturePhoto}
          >
            Capture Photo
          </button>
        )}

        {capturedImage && (
          <div className="face-button-group">
            <button
              className="face-secondary-button"
              onClick={() => {
                setCapturedImage(null);
                setMessage("");
                startCamera();
              }}
            >
              Retake Photo
            </button>

            <button
              className="face-action-button"
              onClick={handleEnrollment}
              disabled={loading || !consent}
            >
              {loading ? "Enrolling..." : "Enroll My Face"}
            </button>
          </div>
        )}

        <label className="face-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I consent to capturing and securely storing my face
            biometric embedding for BioPay authentication.
          </span>
        </label>

        <p className="face-disclaimer">
          Note: This demonstration does not include liveness detection.
          A photograph or replay attack may bypass basic face matching.
        </p>
      </div>
    </div>
  );
}