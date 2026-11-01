const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const apiRequest = async (
  endpoint,
  { method = "GET", token, body, headers = {} } = {}
) => {
  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const isFormData = body instanceof FormData;

  if (body !== undefined && !isFormData) {
    requestHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
      ? await response.json()
      : {};

    if (!response.ok) {
      const error = new Error(
        data.message || `Request failed (${response.status})`
      );
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.status) throw error;

    throw new Error(
      error.name === "TypeError"
        ? "Unable to connect to BioPay server."
        : error.message || "Something went wrong."
    );
  }
};

export const authAPI = {
  register: (userData) =>
    apiRequest("/api/v1/users/register", {
      method: "POST",
      body: userData,
    }),

  login: (credentials) =>
    apiRequest("/api/v1/auth/login", {
      method: "POST",
      body: credentials,
    }),

  getProfile: (token) =>
    apiRequest("/api/v1/users/profile", { token }),
};

export const walletAPI = {
  getBalance: (token) =>
    apiRequest("/api/v1/wallet/balance", { token }),

  demoTopUp: (token, amount) =>
    apiRequest("/api/v1/wallet/demo-topup", {
      method: "POST",
      token,
      body: { amount },
    }),

  getTransactions: (token, page = 1, limit = 10) =>
    apiRequest(
      `/api/v1/wallet/transactions?page=${page}&limit=${limit}`,
      { token }
    ),
};

export const receiverAPI = {
  getDetails: (token, bioPayId) =>
    apiRequest(
      `/api/v1/receivers/${encodeURIComponent(bioPayId)}`,
      { token }
    ),
};

export const biometricAPI = {
  enrollFace: (token, imageFile, consent) => {
    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("consent", String(consent));

    return apiRequest("/api/v1/biometric/enroll", {
      method: "POST",
      token,
      body: formData,
    });
  },

  verifyFace: (token, imageFile) => {
    const formData = new FormData();
    formData.append("file", imageFile);

    return apiRequest("/api/v1/biometric/verify", {
      method: "POST",
      token,
      body: formData,
    });
  },

  deleteEnrollment: (token) =>
    apiRequest("/api/v1/biometric/enrollment", {
      method: "DELETE",
      token,
    }),
};

export const paymentAPI = {
  createIntent: (token, paymentData) =>
    apiRequest("/api/v1/payment-intents/create", {
      method: "POST",
      token,
      body: paymentData,
    }),

  verifyFace: (token, intentId, imageFile) => {
    const formData = new FormData();
    formData.append("file", imageFile);

    return apiRequest(
      `/api/v1/payment-intents/${encodeURIComponent(intentId)}/verify-face`,
      {
        method: "POST",
        token,
        body: formData,
      }
    );
  },

  confirmPayment: (token, intentId) =>
    apiRequest(
      `/api/v1/payment-intents/${encodeURIComponent(intentId)}/confirm`,
      {
        method: "POST",
        token,
      }
    ),
};