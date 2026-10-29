# BioPay — Project Proposal

**Title:** BioPay: Biometric-Based User Authentication for Secure Digital Transactions  
**Submitted by:** Anmol Gaba  
**Programme:** B.Tech — Computer Science and Engineering  
**Institution:** University of Petroleum and Energy Studies (UPES), Dehradun  
**Guide:** [Guide Name]  
**Academic year:** 2026–2027  
**Status:** Initial proposal

## Abstract
BioPay is a web-based academic prototype exploring facial verification as an additional authorization factor for digital wallet transactions. Users create an account, enroll a facial template with explicit consent, and transfer simulated funds through QR scanning or a unique BioPay ID. The system combines React, Node.js/Express, MongoDB, and a private Python/FastAPI biometric service. It emphasizes privacy-conscious biometric handling, atomic wallet transfers, replay prevention, and clear failure states. It does not process real money or connect to banking, UPI, or card networks.

## Problem Statement
A useful payment prototype must do more than match a face. It must bind verification to the authenticated payer and exact recipient/amount, prevent repeated confirmations, and ensure failed transfers do not leave inconsistent balances.

## Aim and Objectives
Aim: design and implement a web-based simulated wallet using facial verification as an additional payment authorization factor.
- Account registration and login.
- Signup-time facial enrollment with consent.
- Virtual wallets and demo-only funds.
- Two payment methods: Scan QR and Pay to BioPay ID.
- Short-lived payment intents and face verification.
- Atomic wallet transfers, receipts, and history.
- Tests for invalid inputs, expired intents, duplicate requests, and concurrency.
- Docker packaging and project documentation.

## Scope
**In scope:** responsive browser app, signup/login, face enrollment, virtual wallet, QR generation/scanning/upload, BioPay ID lookup, face-verified transfer, receipts, history, security tests, and deployment preparation.

**Out of scope:** real money movement, UPI, bank accounts, card processing, and claims that face matching alone proves liveness.

## Technology Stack
| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite | UI, camera, QR, wallet, history |
| Backend | Node.js + Express | Authentication, API validation, payment logic |
| Database | MongoDB | Users, wallets, templates, intents, transactions |
| Biometrics | Python + FastAPI | Face detection, embeddings, matching |
| Model | FaceNet / `facenet-pytorch` (provisional) | Embedding generation, pending checks |
| Testing | Postman + automated tests | API and failure-case testing |
| Packaging | Docker | Reproducible service environments |

## Methodology
1. Requirements, SRS, UML, workflows.
2. Database, API, security, and test design.
3. Repository and environment setup.
4. Authentication and wallet APIs.
5. Biometric service and evaluation.
6. Payment intents and atomic transfer.
7. Frontend integration.
8. Integration/security testing.
9. Docker, deployment, and final report.

## Security and Privacy
Obtain consent before capture; protect templates; avoid raw-image retention by default; restrict biometric-service access; never log biometric content; bind authorization to one payment intent; and execute wallet changes atomically. Evaluate liveness and presentation-attack resistance separately.

## Expected Outcomes
A documented prototype supporting virtual transfers, QR and BioPay ID recipient identification, signup-time enrollment, payment-time verification, receipts, transaction history, and reproducible tests.

## Limitations
Face matching may be affected by lighting, pose, image quality, and model limitations. Liveness is a separate problem. Model licensing, dependency compatibility, and performance must be checked before final selection.

## Indicative Timeline
Requirements/docs → database/API/security design → setup/authentication → wallet/recipient APIs → biometric service → payment integration → frontend → testing/deployment/report.

## References
1. Schroff, F., Kalenichenko, D., and Philbin, J. “FaceNet: A Unified Embedding for Face Recognition and Clustering.” CVPR, 2015. https://doi.org/10.1109/CVPR.2015.7298682
2. React: https://react.dev/
3. Vite: https://vite.dev/
4. Express: https://expressjs.com/
5. FastAPI: https://fastapi.tiangolo.com/
6. MongoDB: https://www.mongodb.com/docs/
7. OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/
