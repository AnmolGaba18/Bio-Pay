const BIOMETRIC_SERVICE_URL =
    process.env.BIOMETRIC_SERVICE_URL || "http://127.0.0.1:8000";

const generateFaceEmbedding = async (
    imageBuffer,
    mimetype,
    filename = "face.jpg"
) => {

    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error("Valid image buffer is required");
    }

    if (!["image/jpeg", "image/png"].includes(mimetype)) {
        throw new Error("Only JPEG and PNG images are supported");
    }

    try {
        // Prepare image for FastAPI
        const formData = new FormData();

        const imageBlob = new Blob(
            [imageBuffer],
            { type: mimetype }
        );

        formData.append("file", imageBlob, filename);

        // Send image to Python biometric service
        const response = await fetch(
            `${BIOMETRIC_SERVICE_URL}/api/v1/biometric/enroll`,
            {
                method: "POST",
                body: formData,
                signal: AbortSignal.timeout(30000),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.detail || "Biometric service request failed"
            );
        }

        // Validate returned embedding
        if (
            !Array.isArray(result.embedding) ||
            result.embedding.length !== 512
        ) {
            throw new Error("Invalid face embedding received");
        }

        if (
            !result.embedding.every(
                value => typeof value === "number" && Number.isFinite(value)
            )
        ) {
            throw new Error("Face embedding contains invalid values");
        }

        return result.embedding;

    } catch (error) {

        console.error("Biometric service error:", error.message);

        throw new Error(
            error.name === "TimeoutError"
                ? "Biometric service request timed out"
                : error.message
        );
    }
};

export { generateFaceEmbedding };
