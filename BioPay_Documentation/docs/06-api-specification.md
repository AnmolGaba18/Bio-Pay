# BioPay — API Specification

**Version:** 1.0 (initial design) | **Backend:** Express | **Format:** REST/JSON, multipart for images | **Currency:** INR in integer paise

## 1. Base URLs
- Development: `http://localhost:5000/api`
- Private biometric service example: `http://biometric-service:8000/internal`
- Use HTTPS in production. FastAPI must not be public.

## 2. Conventions
Protected endpoints require a valid server-side session. Use secure HTTP-only cookies and CSRF protection for state-changing cookie-authenticated requests. JSON uses `application/json`; face uploads use `multipart/form-data`. Standard success: `{"success":true,"data":{}}`; standard error: `{"success":false,"message":"...","error":{"code":"..."}}`. Never expose stack traces, password hashes, biometric templates, or secrets. Validate all inputs server-side.

## 3. Authentication
### POST `/api/auth/register`
No existing authentication. Multipart fields: `name`, `email`, `password`, `biometricConsent=true`, `faceImage`. Validates fields/consent, processes face through private service, protects template, creates user/wallet/template. Success `201`; errors `400`, `409`, `413`, `422`, `429`, `503`. Use recoverable signup and safe retries; do not activate incomplete enrollment.

### POST `/api/auth/login`
JSON `{ "email":"user@example.com", "password":"..." }`. Success `200`, establishes session. Invalid credentials `401`, invalid fields `400`, disabled account `403`, rate limit `429`. Hash passwords with Argon2id or appropriately configured bcrypt.

### POST `/api/auth/logout`
Protected; invalidates session and clears cookie. Success `200`.

### GET `/api/auth/me`
Protected; returns current user's safe profile and enrollment status.

## 4. Wallet
### GET `/api/wallet`
Protected; returns current user's `balancePaise`, `currency`, and safe wallet status.

### POST `/api/wallet/demo-topup`
Protected, demo-only. JSON `{ "amountPaise":100000 }`. Applies configured limits and audit logging. Never connected to real funds; restrict/disable in production.

## 5. Recipient and QR
### GET `/api/recipients/:bioPayId`
Protected; returns safe recipient details such as `bioPayId` and `displayName`. Errors `400`, `404`, `403`.

### GET `/api/qr/me`
Protected; returns current user's BioPay ID and payload, e.g. `biopay://pay?recipient=BP12345678`, for frontend QR rendering.

### POST `/api/recipients/resolve-qr`
Protected. JSON `{ "qrPayload":"biopay://pay?recipient=BP12345678" }`. Validates supported scheme and resolves recipient. Never trust arbitrary decoded QR content.

## 6. Biometric
### POST `/api/payments/intents/:id/verify`
Protected, multipart `faceImage`. Validates intent ownership/eligibility and sample, calls private service, creates short-lived server-side authorization bound to exact intent. Errors may include `400`, `403`, `409`, `422`, `429`, `503`. Client cannot submit `verified:true` to authorize payment.

### POST `/internal/verify-face`
Private FastAPI endpoint called only by Express with service-to-service authentication. Performs biometric processing/matching only and never executes or approves a transfer. Final internal schema is defined during service implementation.

## 7. Payments
### POST `/api/payments/intents`
Protected. JSON:
```json
{ "recipientBioPayId":"BP12345678", "amountPaise":50000, "currency":"INR" }
```
Header: `Idempotency-Key: <unique-key>`. Validates recipient, amount, currency, wallet eligibility, and business rules. Success `201`, returning intent ID, recipient, amount, status, and expiry.

### POST `/api/payments/intents/:id/confirm`
Protected. Do not accept amount, recipient, or balance from client; read these from stored intent. Validate ownership, expiry, state, one-time authorization, wallet state, and funds. Atomically debit sender, credit receiver, insert transaction, and mark intent successful. Return success only after commit. Duplicate requests must not transfer twice. Errors may include `401`, `403`, `409`, `422`, `503`.

### GET `/api/transactions`
Protected. Optional `page` and bounded `limit`. Returns paginated transactions involving current user's wallet.

### GET `/api/transactions/:id`
Protected; returns details only to an authorized participant.

## 8. Intent States
Successful path: `CREATED → PENDING_VERIFICATION → VERIFIED → PROCESSING → SUCCEEDED`. Exception states: `FAILED`, `REJECTED`, `EXPIRED`. Enforce transitions server-side.

## 9. HTTP Codes
`200` success; `201` created; `400` invalid request; `401` authentication required; `403` forbidden; `404` not found; `409` conflict/state; `413` upload too large; `422` validation/business rule; `429` rate limit; `500` unexpected error; `503` dependency unavailable.

## 10. Security
Hash passwords; secure sessions and CSRF; validate image type/size; keep FastAPI private; encrypt templates with separately managed keys; avoid raw-image retention and sensitive logging; rate-limit login/enrollment/verification; bind authorization to payer and exact intent; enforce expiry, one-time use, idempotency, concurrency safety; use HTTPS; provide biometric deletion. Evaluate liveness separately.

## 11. Assumptions
Simulated money only. FaceNet via `facenet-pytorch` remains provisional pending compatibility, licensing, and performance checks.
