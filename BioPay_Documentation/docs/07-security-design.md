# BioPay — Security and Privacy Design

## 1. Objectives
Protect accounts and biometric data; bind verification to the correct payment; prevent replay, duplicate transfer, overspending, and partial wallet updates; avoid leaking secrets; clearly identify virtual funds.

## 2. Authentication
- Hash passwords with Argon2id or properly configured bcrypt.
- Use secure, HTTP-only, SameSite cookies; `Secure` in HTTPS.
- CSRF protection for state-changing cookie-authenticated endpoints.
- Invalidate sessions at logout and rotate where appropriate.
- Rate-limit login and use generic invalid-credential messages.
- Never store credentials or session secrets in browser storage.

## 3. Authorization
- Derive the user from the validated server-side session.
- Enforce ownership on wallets, intents, templates, and transactions.
- Never rely on a client-supplied user ID for authorization.
- Restrict demo top-up; no real-money integrations.

## 4. Biometric Privacy
- Explain purpose and obtain consent before capture.
- Minimize capture and avoid raw-image retention by default.
- Encrypt templates at rest using reviewed authenticated encryption; manage keys separately.
- Do not return templates/embeddings to the frontend.
- Do not log images, embeddings, or template ciphertext.
- Provide biometric deletion and safe failed-enrollment recovery.
- Define retention for temporary samples and failed attempts.

## 5. Face Verification
- Validate image format, size, decoding, and usable-face conditions.
- Use consistent model/preprocessing versions.
- Choose thresholds through evaluation; do not assume a universal threshold.
- Rate-limit attempts.
- Face match does not prove liveness; evaluate presentation-attack resistance separately.
- Fail closed if the biometric service is unavailable.

## 6. Payment Authorization
- Create a short-lived intent after recipient/amount confirmation.
- Bind authorization to payer, intent ID, recipient, amount, currency, expiry, and one-time use.
- Keep authorization state server-side or use a cryptographically protected, replay-resistant mechanism.
- Ignore client-supplied verification flags.
- Consume authorization in a concurrency-safe transition.
- Reject expired, reused, or mismatched intents.

## 7. Wallet Integrity
- Use integer paise.
- Use MongoDB multi-document transactions on a supported deployment.
- Conditionally debit only if active and sufficient funds remain.
- Credit receiver and insert transaction in the same transaction.
- Use idempotency and unique transaction-per-intent constraints.
- Reconcile uncertain timeouts from persisted state before retrying.
- Return success only after commit.

## 8. Infrastructure and API
- HTTPS in production; restrict CORS to known origins.
- Keep secrets in environment/secrets manager and `.env` out of Git.
- Apply upload/body limits and server-side validation.
- Keep FastAPI private with service authentication.
- Use least-privilege DB credentials and secure connections.
- Avoid stack traces and internal details in public errors.
- Update dependencies and review vulnerabilities.

## 9. Threats and Mitigations
| Threat | Mitigation |
|---|---|
| Credential guessing | Rate limits, strong hashing, monitoring |
| Unauthorized record access | Ownership checks |
| Forged client verification flag | Server-side verification state |
| Replay | Short expiry, intent binding, single use |
| Duplicate confirmation | Idempotency and unique constraints |
| Concurrent overspending | Conditional updates and DB transaction |
| QR tampering | Strict payload parsing and server-side lookup |
| Biometric exposure | Encryption, least privilege, minimal retention |
| Spoofing | Separate liveness evaluation and documented residual risk |
| Service outage | Fail closed for face-dependent payments |
| Secret leakage | Secrets manager, log redaction, `.gitignore` |

## 10. Residual Risk
This is not a certified financial system. Biometric accuracy, spoof resistance, model licensing, key management, privacy compliance, and operational controls require further evaluation before production use.
