# BioPay — Test Plan

## 1. Purpose
Validate functional behaviour, authorization boundaries, biometric failure handling, wallet integrity, and API contracts for the simulated prototype.

## 2. Environment
React + Vite frontend, Express API, development MongoDB, private FastAPI service, Postman, and automated tests. Use synthetic users and appropriately consented test images. Never use real financial accounts or funds.

## 3. Functional Test Cases
| ID | Test | Expected result |
|---|---|---|
| TC-01 | Valid signup with consent and usable face | User, wallet, template created once |
| TC-02 | Duplicate email | `409`; no duplicate account |
| TC-03 | Missing consent | No face capture/enrollment |
| TC-04 | Unusable image | Safe error; no active incomplete account |
| TC-05 | Valid login | Session established |
| TC-06 | Invalid credentials | Generic `401`; no session |
| TC-07 | Logout | Session invalidated |
| TC-08 | Authenticated wallet request | Own balance only |
| TC-09 | Wallet request without session | `401` |
| TC-10 | Valid BioPay ID | Safe recipient returned |
| TC-11 | Unknown BioPay ID | `404` |
| TC-12 | Valid QR payload | Correct recipient resolved |
| TC-13 | Malformed QR payload | Rejected |
| TC-14 | Valid payment intent | Intent saved with expiry |
| TC-15 | Zero/negative amount | Rejected |
| TC-16 | Face matches for intent | Intent-bound authorization created |
| TC-17 | Face mismatch | No authorization or transfer |
| TC-18 | Insufficient balance | Rejected; neither wallet changes |
| TC-19 | Valid transfer | One debit, one credit, one transaction |
| TC-20 | Repeated confirmation | At most one transfer |
| TC-21 | Expired intent | Rejected; no transfer |
| TC-22 | Own history | Correct authorized entries |
| TC-23 | Another user's transaction | Access denied |
| TC-24 | Biometric service unavailable | Fail safely; no bypass |
| TC-25 | Top-up over limit | Rejected |
| TC-26 | Delete biometric enrollment | Template removed by policy; face payment unavailable until re-enrollment |

## 4. Security Tests
- Alter recipient or amount after intent creation; backend rejects mismatch.
- Submit client `verified:true`; it has no effect.
- Attempt to access another user's wallet, intent, template, or transaction.
- Reuse authorization after successful payment.
- Exceed login/verification rate limits.
- Upload oversized, malformed, or unsupported image.
- Check logs/errors for secrets or biometric data.
- Confirm FastAPI is not publicly accessible.
- Confirm secure cookie attributes, CSRF controls, and allowed CORS origins.

## 5. Concurrency and Integrity
- Concurrent transfers whose combined total exceeds balance: only affordable transfers may succeed.
- Concurrent confirmations of one intent: only one transfer commits.
- Database failure during transfer: no partial debit or credit.
- Timeout after commit: retry finds existing result and does not duplicate transfer.
- Unique constraints prevent duplicate transaction per intent.

## 6. Acceptance Criteria
- Critical authentication, authorization, and payment-integrity tests pass.
- No duplicate or partial transfers under retry/concurrency tests.
- Failed/expired verification never transfers funds.
- History is access-controlled.
- Logs contain no secrets or biometric material.
- UI identifies funds as simulated.
- Face matching/liveness limitations are documented.

## 7. Test Evidence
Record test ID, date, build/commit, redacted request/response, expected/actual result, pass/fail, defect and retest. Never attach passwords, session cookies, face images, embeddings, or keys to reports.
