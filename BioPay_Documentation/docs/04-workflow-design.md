# BioPay — Workflow Design and UML

## 1. Use Case Diagram
```mermaid
flowchart LR
  U([BioPay User])
  subgraph B[BioPay Web Application]
    A([Register and Enroll Face])
    L([Log In / Log Out])
    W([View Wallet])
    Q([Display Receive QR])
    S([Scan or Upload QR])
    I([Pay to BioPay ID])
    C([Review and Confirm Payment])
    F([Authorize Payment with Face])
    H([View Transaction History])
    R([View Receipt])
    D([Delete Biometric Enrollment])
  end
  U --- A
  U --- L
  U --- W
  U --- Q
  U --- S
  U --- I
  U --- C
  U --- F
  U --- H
  U --- R
  U --- D
```

## 2. Signup and Face Enrollment
```mermaid
flowchart TD
  A([Start]) --> B[Enter name, email, password]
  B --> C[Validate details]
  C --> D{Valid?}
  D -- No --> E[Show errors] --> B
  D -- Yes --> F[Explain biometric use and request consent]
  F --> G{Consent given?}
  G -- No --> H[Do not capture face] --> Z([End])
  G -- Yes --> I[Request camera permission]
  I --> J{Camera available?}
  J -- No --> K[Explain requirement and offer retry] --> Z
  J -- Yes --> L[Capture face sample]
  L --> M[Send sample securely to backend]
  M --> N[Python detects face and creates embedding]
  N --> O{Usable sample?}
  O -- No --> P[Show capture guidance] --> L
  O -- Yes --> Q[Protect template]
  Q --> R[Create user, wallet and template records]
  R --> S{All operations succeed?}
  S -- No --> T[Recover/clean up incomplete signup] --> Z
  S -- Yes --> U[Mark enrollment complete] --> V[Open dashboard] --> Z
```
Signup spans multiple components; use recoverable state and idempotent retries. A database transaction cannot roll back a separate service.

## 3. Payment Activity
```mermaid
flowchart TD
  A([Start]) --> B[Open Pay]
  B --> C{Method}
  C -- Scan QR --> D[Scan or upload QR]
  C -- BioPay ID --> E[Enter BioPay ID]
  D --> F[Resolve recipient]
  E --> F
  F --> G{Recipient active?}
  G -- No --> H[Show error] --> Z([End])
  G -- Yes --> I[Show recipient identity]
  I --> J[Enter amount]
  J --> K[Review recipient and amount]
  K --> L{Confirm?}
  L -- No --> Z
  L -- Yes --> M[Create short-lived intent]
  M --> N[Capture fresh face sample]
  N --> O[Verify face through private service]
  O --> P{Face verified?}
  P -- No --> Q[Reject or limited retry] --> Z
  P -- Yes --> R[Validate intent, expiry, one-time authorization]
  R --> S{Authorization valid?}
  S -- No --> Z
  S -- Yes --> T[Check wallet status and balance]
  T --> U{Sufficient funds?}
  U -- No --> Z
  U -- Yes --> V[Atomic debit, credit and transaction insert]
  V --> W{Commit?}
  W -- No --> X[Report failure safely] --> Z
  W -- Yes --> Y[Display receipt] --> Z
```

## 4. Receive QR
1. Receiver opens Receive Money.
2. Frontend requests the current user's QR payload.
3. Backend returns a recipient identifier.
4. Frontend renders the QR.
5. Payer scans or uploads the image.
6. Backend validates the payload and resolves recipient.
7. Payer confirms recipient before entering amount.

QR identifies the recipient; it does not authorize payment.

## 5. Class Diagram
```mermaid
classDiagram
  class User {
    +ObjectId id
    +String name
    +String email
    +String passwordHash
    +String bioPayId
    +String status
  }
  class Wallet {
    +ObjectId id
    +ObjectId userId
    +Long balancePaise
    +String currency
    +String status
  }
  class BiometricTemplate {
    +ObjectId id
    +ObjectId userId
    +String encryptedTemplate
    +String modelVersion
    +Date consentAt
  }
  class PaymentIntent {
    +ObjectId id
    +ObjectId senderUserId
    +ObjectId receiverUserId
    +Long amountPaise
    +String status
    +Date expiresAt
  }
  class Transaction {
    +ObjectId id
    +ObjectId senderWalletId
    +ObjectId receiverWalletId
    +Long amountPaise
    +String status
  }
  class AuditLog {
    +ObjectId id
    +ObjectId userId
    +String eventType
  }
  User "1" --> "1" Wallet : owns
  User "1" --> "0..1" BiometricTemplate : enrolls
  User "1" --> "0..*" PaymentIntent : initiates
  PaymentIntent "0..*" --> "1" User : recipient
  Wallet "1" --> "0..*" Transaction : sends or receives
  User "1" --> "0..*" AuditLog : generates
```

## 6. Payment Intent States
Successful path: `CREATED → PENDING_VERIFICATION → VERIFIED → PROCESSING → SUCCEEDED`.
Exception states: `FAILED`, `REJECTED`, `EXPIRED`. Enforce valid server-side transitions.

## 7. Failure Handling
- Invalid QR/ID: reject lookup.
- Invalid amount or inactive wallet: reject before transfer.
- Face mismatch: reject authorization; limit retries.
- Expired intent: require a new intent.
- Insufficient balance: neither wallet changes.
- Database failure: no success receipt.
- Duplicate confirmation: never transfer twice.
- Biometric service outage: fail closed for face-dependent payments.
