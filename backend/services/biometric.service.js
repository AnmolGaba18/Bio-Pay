
const getBiometricServiceURL = () => {
    return (
        process.env.BIOMETRIC_SERVICE_URL ||
        "http://127.0.0.1:8000"
    ).replace(/\/+$/, "");
};


const generateFaceEmbedding = async (
    imageBuffer,
    mimetype,
    filename = "face.jpg"
) => {
    if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
        throw new Error("Valid image buffer is required");
    }

    if (imageBuffer.length > 5 * 1024 * 1024) {
        throw new Error("Image size must not exceed 5 MB");
    }

    if (!["image/jpeg", "image/png"].includes(mimetype)) {
        throw new Error("Only JPEG and PNG images are supported");
    }

    if (
        typeof filename !== "string" ||
        !filename.trim()
    ) {
        filename = "face.jpg";
    }

    try {
        const formData = new FormData();

        const imageBlob = new Blob(
            [imageBuffer],
            { type: mimetype }
        );

        formData.append(
            "file",
            imageBlob,
            filename.replace(/[^a-zA-Z0-9._-]/g, "_")
        );

        const serviceURL = getBiometricServiceURL();

        const response = await fetch(
            `${serviceURL}/api/v1/biometric/enroll`,
            {
                method: "POST",
                body: formData,
                signal: AbortSignal.timeout(30000),
            }
        );

        let result;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "Biometric service returned an invalid response"
            );
        }

        if (!response.ok) {
            const serviceMessage =
                typeof result.detail === "string"
                    ? result.detail
                    : "Biometric service request failed";

            throw new Error(serviceMessage);
        }

        const embedding = result.embedding;

        if (
            !Array.isArray(embedding) ||
            embedding.length !== 512
        ) {
            throw new Error(
                "Invalid face embedding received from biometric service"
            );
        }

        const validEmbedding = embedding.every(
            (value) =>
                typeof value === "number" &&
                Number.isFinite(value)
        );

        if (!validEmbedding) {
            throw new Error(
                "Face embedding contains invalid values"
            );
        }

        return embedding;

    } catch (error) {
        console.error(
            "Biometric service error:",
            error.message
        );

        if (error.name === "TimeoutError") {
            throw new Error(
                "Biometric service request timed out"
            );
        }

        if (error.name === "AbortError") {
            throw new Error(
                "Biometric service request was interrupted"
            );
        }

        throw error;
    }
};


export {
    generateFaceEmbedding,
};
