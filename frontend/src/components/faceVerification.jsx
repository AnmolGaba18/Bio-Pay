
import { useCallback, useEffect, useRef, useState } from "react";

const FaceVerification = ({
  intentId,
  token,
  onVerified,
  onCancel,
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const submittingRef = useRef(false);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraReady(false);
  }, []);

  const startCamera = async () => {
    setError("");
    setCapturedImage(null);
    setCameraLoading(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Camera is not supported. Please use localhost or HTTPS."
        );
      }

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
      }

      setCameraReady(true);
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access."
          : err.message || "Unable to access camera."
      );
    } finally {
      setCameraLoading(false);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("Camera is not ready. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture image.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to capture image.");
          return;
        }

        const imageUrl = URL.createObjectURL(blob);

        setCapturedImage({
          blob,
          url: imageUrl,
        });

        setError("");
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  const retakePhoto = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }

    setCapturedImage(null);
    startCamera();
  };

  const handleVerify = async () => {
    if (!capturedImage?.blob || !token || !intentId) {
      setError("Missing image or authentication information.");
      return;
    }

    if (submittingRef.current) return;

    submittingRef.current = true;
    setVerifying(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append(
        "file",
        capturedImage.blob,
        "face-verification.jpg"
      );

      const response = await fetch(
        `http://localhost:5000/api/v1/payment-intents/${encodeURIComponent(
          intentId
        )}/verify-face`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Face verification failed."
        );
      }

      if (result.biometric?.verified !== true) {
        throw new Error("Face verification was unsuccessful.");
      }

      stopCamera();

      onVerified?.(result);
    } catch (err) {
      console.error("Face verification error:", err);
      setError(err.message || "Unable to verify face.");
    } finally {
      setVerifying(false);
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url);
      }
    };
  }, [capturedImage]);

  return (
    <div className="face-verification-component">
      <div className="face-verification-heading">
        <h3>Face Verification</h3>
        <p>Look directly at the camera to verify your identity.</p>
      </div>

      {error && (
        <div className="send-money-message error-message">
          {error}
        </div>
      )}

      <div className="camera-container">
        {capturedImage ? (
          <img
            src={capturedImage.url}
            alt="Captured face"
            className="captured-face-image"
          />
        ) : (
          <video
            ref={videoRef}
            className="face-camera"
            autoPlay
            muted
            playsInline
          />
        )}

        {!cameraReady && !capturedImage && !cameraLoading && (
          <p className="camera-placeholder">
            Camera preview will appear here.
          </p>
        )}

        {cameraLoading && (
          <p className="camera-placeholder">
            Starting camera...
          </p>
        )}
      </div>

      {!capturedImage ? (
        <div className="face-button-group">
          <button
            type="button"
            className="face-action-button"
            onClick={startCamera}
            disabled={cameraLoading || verifying}
          >
            {cameraLoading ? "Starting Camera..." : "Start Camera"}
          </button>

          <button
            type="button"
            className="face-secondary-button"
            onClick={capturePhoto}
            disabled={!cameraReady || verifying}
          >
            Capture Photo
          </button>
        </div>
      ) : (
        <div className="face-button-group">
          <button
            type="button"
            className="face-secondary-button"
            onClick={retakePhoto}
            disabled={verifying}
          >
            Retake Photo
          </button>

          <button
            type="button"
            className="face-action-button"
            onClick={handleVerify}
            disabled={verifying}
          >
            {verifying ? "Verifying..." : "Verify My Face"}
          </button>
        </div>
      )}

      <p className="face-disclaimer">
        Face verification is required to authorize this simulated
        payment. This implementation does not include liveness
        detection, so a photograph or replay attack may bypass it.
      </p>

      {onCancel && (
        <button
          type="button"
          className="face-secondary-button"
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          disabled={verifying}
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default FaceVerification;
