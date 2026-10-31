
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const getEncryptionKey = () => {
    const keyHex = process.env.BIOMETRIC_ENCRYPTION_KEY;

    if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
        throw new Error(
            "BIOMETRIC_ENCRYPTION_KEY must be a 64-character hexadecimal key"
        );
    }

    return Buffer.from(keyHex, "hex");
};

// Encrypt a 512-dimensional face embedding
const encryptEmbedding = (embedding) => {

    if (!Array.isArray(embedding) || embedding.length !== 512) {
        throw new Error("Face embedding must contain exactly 512 values");
    }

    if (
        !embedding.every(
            value => typeof value === "number" && Number.isFinite(value)
        )
    ) {
        throw new Error("Face embedding contains invalid values");
    }

    const key = getEncryptionKey();

    // Generate a unique initialization vector for every encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        key,
        iv
    );

    // Convert embedding into JSON before encryption
    const embeddingData = JSON.stringify(embedding);

    let encrypted = cipher.update(
        embeddingData,
        "utf8",
        "hex"
    );

    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
    };
};

// Decrypt a previously encrypted face embedding
const decryptEmbedding = ({
    encryptedData,
    iv,
    authTag,
}) => {

    if (!encryptedData || !iv || !authTag) {
        throw new Error("Encrypted biometric data is incomplete");
    }

    if (
        !/^[0-9a-fA-F]+$/.test(encryptedData) ||
        encryptedData.length % 2 !== 0
    ) {
        throw new Error("Invalid encrypted biometric data");
    }

    if (!/^[0-9a-fA-F]{24}$/.test(iv)) {
        throw new Error("Invalid encryption initialization vector");
    }

    if (!/^[0-9a-fA-F]{32}$/.test(authTag)) {
        throw new Error("Invalid encryption authentication tag");
    }

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(
        encryptedData,
        "hex",
        "utf8"
    );

    decrypted += decipher.final("utf8");

    const embedding = JSON.parse(decrypted);

    if (
        !Array.isArray(embedding) ||
        embedding.length !== 512 ||
        !embedding.every(
            value => typeof value === "number" && Number.isFinite(value)
        )
    ) {
        throw new Error("Decrypted face embedding is invalid");
    }

    return embedding;
};

export {
    encryptEmbedding,
    decryptEmbedding,
};
