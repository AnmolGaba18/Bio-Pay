# BioPay — Software Requirements Specification

## 1. Purpose and Scope
BioPay is a web-based academic prototype for simulated wallet transfers. It supports signup-time facial enrollment, login, virtual balances, QR and BioPay ID recipient identification, face verification, transfers, receipts, and history. No real funds are moved.

## 2. Actors and Components
- Registered user/payer and recipient.
- React frontend.
- Express application backend.
- Private Python/FastAPI biometric service.
- MongoDB data store.

## 3. Functional Requirements
### Accounts
- FR-01: Register with name, email, password.
- FR-02: Normalize email and enforce uniqueness.
- FR-03: Hash passwords; never store plaintext.
- FR-04: Obtain explicit biometric consent before capture.
- FR-05: Enroll face during signup.
- FR-06: Safely recover incomplete signup without duplicate accounts/wallets.
- FR-07: Support login, logout, and authenticated profile.
- FR-08: Restrict profile data to safe fields.
### Wallet
- FR-09: Create one wallet per user.
- FR-10: Store balances as integer paise.
- FR-11: Display only the current user's balance.
- FR-12: Allow limited demo-only top-ups; never process real funds.
### Recipient
- FR-13: Assign unique BioPay ID.
- FR-14: Generate a QR payload for the current user.
- FR-15: Support QR scan and QR image upload where supported.
- FR-16: Validate QR payloads server-side.
- FR-17: Resolve BioPay IDs and show recipient identity before payment.
### Biometrics
- FR-18: Validate face image format and size.
- FR-19: Detect usable face and generate embedding.
- FR-20: Protect stored template and restrict access.
- FR-21: Verify a fresh sample against the enrolled template.
- FR-22: Never trust a client-supplied verification flag.
- FR-23: Rate-limit verification and evaluate liveness separately.
### Payments
- FR-24: Create short-lived payment intent bound to payer, recipient, amount, currency, expiry.
- FR-25: Require explicit review and confirmation.
- FR-26: Bind face authorization to the exact intent and consume it once.
- FR-27: Check wallet status and sufficient funds.
- FR-28: Atomically debit sender, credit receiver, and insert transaction.
- FR-29: Prevent duplicate transfers, replay, and concurrent overspending.
- FR-30: Return success only after commit; reconcile uncertain timeouts.
- FR-31: Display receipt and paginated history.
- FR-32: Restrict transaction detail to authorized participants.
### Privacy
- FR-33: Provide biometric deletion workflow.
- FR-34: Avoid raw face image retention by default.
- FR-35: Keep secrets and biometric data out of logs.

## 4. Non-Functional Requirements
- Security: server-side validation and authorization.
- Privacy: minimize biometric collection and retention.
- Integrity: atomic transfers.
- Reliability: idempotent retries.
- Usability: responsive laptop/mobile browser UI.
- Maintainability: separated frontend, backend, biometric service.
- Testability: documented API contracts and automated tests.
- Accessibility: clear labels, errors, keyboard support, camera guidance.
- Availability: service failures must not result in false payment success.

## 5. Interfaces
Frontend to Express: REST over HTTPS, JSON; multipart for images. Express to FastAPI: private authenticated service call. Express to MongoDB: server-side connection with restricted credentials.

## 6. Business Rules
1. One wallet and at most one active facial template per user initially.
2. Amounts are positive integer paise within configured limits.
3. QR identifies a recipient; it does not authorize payment.
4. Self-transfer is rejected in the initial design.
5. Payment authorization is short-lived, intent-bound, and single-use.
6. Only Express can execute wallet transfers.
7. A successful transfer requires a committed database transaction.
8. Demo top-ups create virtual funds only.

## 7. Acceptance Criteria
- Valid signup creates user, wallet, and template once.
- Invalid signup or face sample is safely rejected.
- QR and BioPay ID resolve the intended recipient.
- Face verification applies only to its bound intent.
- Insufficient balance, expired intent, and invalid authorization cause no transfer.
- Duplicate/concurrent confirmations do not duplicate transfers or overspend.
- History is access-controlled.
- Logs contain no secrets or biometric material.
- UI clearly states funds are simulated.

## 8. Limitations
The model, threshold, licensing, compatibility, and performance require evaluation. Face matching alone does not prove liveness. This is not a production financial system.
