
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// GET ENCRYPTION KEY
const getEncryptionKey = () => {
    const keyHex = process.env.BIOMETRIC_ENCRYPTION_KEY;

    if (
        typeof keyHex !== "string" ||
        !/^[0-9a-fA-F]{64}$/.test(keyHex)
    ) {
        throw new Error(
            "BIOMETRIC_ENCRYPTION_KEY must be a valid 64-character hexadecimal key"
        );
    }

    const key = Buffer.from(keyHex, "hex");

    if (key.length !== KEY_LENGTH) {
        throw new Error("Invalid biometric encryption key length");
    }

    return key;
};


// VALIDATE FACE EMBEDDING
const validateEmbedding = (embedding) => {
    if (
        !Array.isArray(embedding) ||
        embedding.length !== 512
    ) {
        throw new Error(
            "Face embedding must contain exactly 512 values"
        );
    }

    const isValid = embedding.every(
        (value) =>
            typeof value === "number" &&
            Number.isFinite(value)
    );

    if (!isValid) {
        throw new Error(
            "Face embedding contains invalid numerical values"
        );
    }
};


// ENCRYPT FACE EMBEDDING
const encryptEmbedding = (embedding) => {
    validateEmbedding(embedding);

    const key = getEncryptionKey();

    // Generate a fresh random IV for every encryption.
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        key,
        iv
    );

    const embeddingData = JSON.stringify(embedding);

    let encryptedData = cipher.update(
        embeddingData,
        "utf8",
        "hex"
    );

    encryptedData += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
        encryptedData,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
    };
};


// DECRYPT FACE EMBEDDING
const decryptEmbedding = ({
    encryptedData,
    iv,
    authTag,
}) => {
    if (
        typeof encryptedData !== "string" ||
        !encryptedData ||
        encryptedData.length % 2 !== 0 ||
        !/^[0-9a-fA-F]+$/.test(encryptedData)
    ) {
        throw new Error("Invalid encrypted biometric data");
    }

    if (
        typeof iv !== "string" ||
        !new RegExp(`^[0-9a-fA-F]{${IV_LENGTH * 2}}$`).test(iv)
    ) {
        throw new Error("Invalid encryption initialization vector");
    }

    if (
        typeof authTag !== "string" ||
        !new RegExp(`^[0-9a-fA-F]{${AUTH_TAG_LENGTH * 2}}$`).test(authTag)
    ) {
        throw new Error("Invalid encryption authentication tag");
    }

    const key = getEncryptionKey();

    try {
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(iv, "hex")
        );

        decipher.setAuthTag(
            Buffer.from(authTag, "hex")
        );

        let decryptedData = decipher.update(
            encryptedData,
            "hex",
            "utf8"
        );

        decryptedData += decipher.final("utf8");

        const embedding = JSON.parse(decryptedData);

        validateEmbedding(embedding);

        return embedding;

    } catch (error) {
        throw new Error(
            "Unable to decrypt biometric data: authentication or data validation failed"
        );
    }
};


export {
    encryptEmbedding,
    decryptEmbedding,
};
