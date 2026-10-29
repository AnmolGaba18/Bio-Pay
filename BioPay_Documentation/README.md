# BioPay Documentation Pack

BioPay is an academic web application prototype for simulated wallet transfers with facial verification as an additional authorization factor. No real money, UPI, bank, or card payments are processed.

## Stack
- Frontend: React + Vite
- Application backend: Node.js + Express
- Database: MongoDB
- Biometric service: Python + FastAPI
- Provisional face model: FaceNet via `facenet-pytorch`, subject to compatibility, licensing, and performance checks
- Testing: Postman and automated tests
- Version control: Git/GitHub
- Packaging: Docker

## Documents
1. `docs/01-project-proposal.md`
2. `docs/02-srs.md`
3. `docs/03-system-architecture.md`
4. `docs/04-workflow-design.md`
5. `docs/05-database-design.md`
6. `docs/06-api-specification.md`
7. `docs/07-security-design.md`
8. `docs/08-test-plan.md`

This is a design baseline, not a claim that the system has been implemented or security-tested. Express owns payment decisions and wallet transfers; Python performs biometric computation only. The frontend never connects directly to MongoDB. Amounts use integer paise. Face matching alone does not establish liveness.
