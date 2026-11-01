
import { useEffect, useRef, useState } from "react";

const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const FaceVerification = ({
    intentId,
    token,
    onVerified,
    onCancel,
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const previewUrlRef = useRef(null);

    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [capturedImage, setCapturedImage] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // START CAMERA
    useEffect(() => {
        let mounted = true;

        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error(
                        "Camera access is not supported by this browser or connection."
                    );
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                });

                if (!mounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setCameraReady(true);
                }

            } catch (err) {
                if (mounted) {
                    setCameraError(
                        err.name === "NotAllowedError"
                            ? "Camera permission denied. Please allow camera access."
                            : err.message || "Unable to access camera."
                    );
                }
            }
        };

        startCamera();

        return () => {
            mounted = false;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(
                    (track) => track.stop()
                );
                streamRef.current = null;
            }

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
                previewUrlRef.current = null;
            }
        };
    }, []);

    // CAPTURE FACE IMAGE
    const captureImage = () => {
        setError("");

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas || video.readyState < 2) {
            setError("Camera is not ready. Please try again.");
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        if (!context) {
            setError("Unable to capture image.");
            return;
        }

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setError("Image capture failed. Please try again.");
                    return;
                }

                if (previewUrlRef.current) {
                    URL.revokeObjectURL(previewUrlRef.current);
                }

                const imageUrl = URL.createObjectURL(blob);

                previewUrlRef.current = imageUrl;

                setCapturedBlob(blob);
                setCapturedImage(imageUrl);
            },
            "image/jpeg",
            0.9
        );
    };

    // RETAKE IMAGE
    const retakeImage = () => {
        setCapturedBlob(null);
        setCapturedImage(null);
        setError("");
    };

    // UPLOAD IMAGE AND VERIFY FACE
    const verifyFace = async () => {
        if (!intentId || !token) {
            setError("Payment intent or authentication token is missing.");
            return;
        }

        if (!capturedBlob) {
            setError("Please capture your face image first.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();

            formData.append(
                "file",
                capturedBlob,
                "face-verification.jpg"
            );

            const response = await fetch(
                `${API_URL}/api/v1/payment-intents/${encodeURIComponent(intentId)}/verify-face`,
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
                throw new Error("Face verification was not successful.");
            }

            if (typeof onVerified === "function") {
                onVerified(result);
            }

        } catch (err) {
            setError(
                err.message || "Unable to complete face verification."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="face-verification">
            <h2>Face Verification</h2>

            <p>
                Position your face clearly inside the camera frame.
            </p>

            {cameraError && (
                <div role="alert" className="face-error">
                    {cameraError}
                </div>
            )}

            {error && (
                <div role="alert" className="face-error">
                    {error}
                </div>
            )}

            <div className="face-camera-container">
                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="face-camera"
                    />
                ) : (
                    <img
                        src={capturedImage}
                        alt="Captured face"
                        className="face-preview"
                    />
                )}
            </div>

            <canvas
                ref={canvasRef}
                style={{ display: "none" }}
            />

            <div className="face-actions">
                {!capturedImage ? (
                    <button
                        type="button"
                        onClick={captureImage}
                        disabled={!cameraReady || loading}
                    >
                        Capture Face
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={retakeImage}
                            disabled={loading}
                        >
                            Retake
                        </button>

                        <button
                            type="button"
                            onClick={verifyFace}
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Verify Face"}
                        </button>
                    </>
                )}

                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                )}
            </div>

            <p className="face-disclaimer">
                Face matching does not currently include liveness detection.
                A photograph or replayed image may pass verification.
            </p>
        </div>
    );
};

export default FaceVerification;
