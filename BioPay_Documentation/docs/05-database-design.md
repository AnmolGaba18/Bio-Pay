# BioPay — Database Design

## 1. Collections

### Users
- `_id`: ObjectId
- `name`: required string
- `email`: required normalized unique string
- `passwordHash`: required string; never plaintext
- `bioPayId`: required unique identifier
- `status`: `PENDING`, `ACTIVE`, `DISABLED`, `DELETION_PENDING`
- `createdAt`, `updatedAt`: dates

### Wallets
- `_id`: ObjectId
- `userId`: unique reference to Users
- `balancePaise`: non-negative integer
- `currency`: initially `INR`
- `status`: `ACTIVE`, `FROZEN`, `CLOSED`
- timestamps

### BiometricTemplates
- `_id`: ObjectId
- `userId`: unique for one active template per user
- `encryptedTemplate`: protected embedding; never return/log
- `modelVersion`: model and preprocessing version
- `consentAt`, `createdAt`, `updatedAt`: dates
- Encryption keys must be managed separately from ciphertext.

### PaymentIntents
- `_id`: ObjectId
- `senderUserId`, `receiverUserId`: user references
- `amountPaise`: positive bounded integer
- `currency`: initially `INR`
- `status`: state-machine value
- `idempotencyKey`: unique within payer/operation scope
- `authorizationRef`: opaque server-side reference, never raw face data
- `expiresAt`, timestamps

### Transactions
- `_id`: ObjectId
- `paymentIntentId`: unique reference
- `senderWalletId`, `receiverWalletId`: wallet references
- `amountPaise`: positive integer
- `currency`: initially `INR`
- `status`: `SUCCEEDED` for committed transfers
- `idempotencyKey`, `createdAt`

Only committed transfers appear as successful transactions. Keep failed attempts separately if needed.

### AuditLogs
- `_id`: ObjectId
- `userId`: optional actor reference
- `eventType`, `resourceType`, `resourceId`
- `outcome`: `SUCCESS`, `FAILURE`, `DENIED`
- `createdAt`
- Never store passwords, cookies, raw images, embeddings, or keys.

## 2. Relationships
- One User owns one Wallet.
- One User has zero or one active BiometricTemplate.
- One User can initiate many PaymentIntents.
- Each intent identifies one sender and one receiver.
- Each successful intent maps to at most one Transaction.
- A Wallet can send or receive many Transactions.
- Audit logs can reference a user/resource.

## 3. Indexes and Constraints
- Unique normalized `Users.email`.
- Unique `Users.bioPayId`.
- Unique `Wallets.userId`.
- Unique active-template constraint for `BiometricTemplates.userId`.
- Unique `Transactions.paymentIntentId`.
- Idempotency key uniqueness in the chosen scope.
- Index intents by sender, status, and expiry.
- Index transactions by sender wallet/date and receiver wallet/date.
- Index audit logs by user/date.

TTL deletion must not remove records needed for reconciliation or audit. Check intent expiry in application logic.

## 4. Atomic Transfer
Use a MongoDB deployment that supports multi-document transactions. In one transaction:
1. Conditionally validate and consume the intent authorization.
2. Debit sender only if active and balance is sufficient.
3. Credit receiver if active.
4. Insert the transaction.
5. Mark intent `SUCCEEDED`.
6. Commit.

Abort all changes if any step fails. Use conditional updates, unique constraints, and safe conflict handling to prevent overspending and duplicates.

## 5. Signup Consistency
Generate the template before final activation, then persist user, wallet, and template atomically where supported. Because the biometric service is separate, use recoverable signup state, safe retries, and cleanup. Do not activate incomplete enrollment.

## 6. Lifecycle
Provide biometric deletion. Do not delete transaction records merely because biometric enrollment is removed. Define retention for audit records and failed attempts.
