# Enquiry Purchased Plans — Flow

This module handles the full lifecycle of purchasing enquiry plans for Owner, Broker, and Builder users.

---

## Models Involved

| Model | Collection | Purpose |
|---|---|---|
| `EnquiryPlan` | `enquiryplans` | Admin-managed master plan definitions |
| `EnquiryPurchasedPlan` | `enquirypurchasedplans` | One record per user plan purchase |
| `PaymentTransaction` | `paymenttransactions` | Razorpay online payment records |
| `CoinsTransaction` | `coinstransactions` | Coins debit records |
| `UserCoinsWallet` | `usercoinwallets` | Live coins balance per user |
| `AdminWallet` | `adminwallets` | Admin revenue balance |

---

## API Endpoints

All routes are mounted at `/api/mixed/enquiry-plans` and protected by `userProtect` middleware.

| Method | Path | Handler | Purpose |
|---|---|---|---|
| GET | `/active-plans` | `getActiveEnquiryPlans` | List active plans for user's role |
| POST | `/purchase` | `purchaseEnquiryPlan` | Free or coins purchase (no active plan) |
| POST | `/change-plan` | `upgradeEnquiryPlan` | Free or coins change (has active plan) |
| POST | `/create-order` | `createEnquiryPlanOrder` | Create Razorpay order (no active plan) |
| POST | `/change-plan-order` | `upgradeEnquiryPlanOrder` | Create Razorpay order (has active plan) |
| PATCH | `/cancel/:transactionId` | `cancelEnquiryPlanOrder` | Cancel a pending Razorpay order |

---

## Purchase Scenarios

### 1. Free Plan (new or change)

**Endpoint:** `POST /purchase` or `POST /change-plan`
**Payload:** `{ planId }`

- Backend identifies plan as free (`coins === 0 && amount === 0`)
- Creates `EnquiryPurchasedPlan` with `paymentMethod: "Free"`, `status: "Active"`
- If changing: wraps in Mongoose session — marks old plan `"Cancelled"` + creates new plan atomically
- Returns `201` immediately
- No webhook involved

---

### 2. Coins Payment (new or change)

**Endpoint:** `POST /purchase` or `POST /change-plan`
**Payload:** `{ planId }`

- Backend identifies plan as coins-paid (`plan.coins > 0`)
- Checks `UserCoinsWallet.currentBalance >= plan.coins`
- Mongoose session transaction:
  1. Deducts coins from `UserCoinsWallet`
  2. Creates `EnquiryPurchasedPlan` with `paymentMethod: "Coins"`, `coinsPaid`, `status: "Active"`
  3. Creates `CoinsTransaction` (type `"Debit"`, reason `"EnquiryPlanPurchase"` or `"EnquiryPlanUpgrade"`)
  4. If changing: marks old plan `"Cancelled"` with `changedPlanTo`
- Returns `201` immediately
- No webhook involved

---

### 3. Online Payment via Razorpay (new or change)

#### Step 1 — Create Order

**Endpoint:** `POST /create-order` or `POST /change-plan-order`
**Payload:** `{ planId }`

- Creates Razorpay order with `planId` (and `activePlanId` for change) embedded in `notes`
- Creates `PaymentTransaction` with `status: "Pending"`, reason `"EnquiryPlanPurchase"` or `"EnquiryPlanUpgrade"`
- Returns `{ orderId, amount, currency, transactionId }` to frontend
- Frontend opens Razorpay checkout modal

#### Step 2 — Webhook `POST /api/webhook`

Razorpay fires `payment.captured` → `manageOnlinePayment.js`:
1. Verifies HMAC-SHA256 signature
2. Finds `PaymentTransaction` by `razorpayOrderId`
3. Routes by `txn.reason`:
   - `"EnquiryPlanPurchase"` → `handleEnquiryPlanPurchase.js`
   - `"EnquiryPlanUpgrade"` → `handleEnquiryPlanUpgrade.js`

Each handler (Mongoose session):
- Creates `EnquiryPurchasedPlan` with `paymentMethod: "Online"`, `amountPaid`, `status: "Active"`
- Updates `AdminWallet` (increments `currentBalance` + `totalCredited`)
- Updates `PaymentTransaction` → `status: "Success"`, stores `razorpayPaymentId` + `razorpaySignature`
- Upgrade handler additionally marks old plan `"Cancelled"` with `changedPlanTo`

#### Step 2b — User Dismisses Modal

**Endpoint:** `PATCH /cancel/:transactionId`

- Marks `PaymentTransaction` as `"Failed"` with `failureReason: "Cancelled by user"`

---

## Scenario Summary

| Scenario | Endpoint(s) | Payload | Webhook? |
|---|---|---|---|
| Free (new) | `POST /purchase` | `{ planId }` | No |
| Free (change) | `POST /change-plan` | `{ planId }` | No |
| Coins (new) | `POST /purchase` | `{ planId }` | No |
| Coins (change) | `POST /change-plan` | `{ planId }` | No |
| Online (new) | `POST /create-order` | `{ planId }` | Yes |
| Online (change) | `POST /change-plan-order` | `{ planId }` | Yes |
| Cancel modal | `PATCH /cancel/:transactionId` | none (URL param) | No |

---

## EnquiryPurchasedPlan Schema

```
user               ObjectId → SystemUser
userType           "Owner" | "Broker" | "Builder"
plan.planId        ObjectId → EnquiryPlan
plan.name          String (snapshot)
plan.numberOfEnquiriesGiven  Number (-1 = unlimited)
plan.expiryInDays  Number (-1 = never)
plan.coins         Number
plan.amount        Number
enquiriesUsed      Number (default 0, incremented on each enquiry purchase)
paymentMethod      "Coins" | "Online" | "Free"
transactionId      ObjectId (polymorphic)
transactionModel   "PaymentTransaction" | "CoinsTransaction"
amountPaid         Number
coinsPaid          Number
startDate          Date
expiryDate         Date | null (null = never expires)
expiryDurationDays Number
status             "Active" | "Expired" | "Consumed" | "Cancelled"
changedPlanTo      ObjectId → EnquiryPurchasedPlan
```

---

## Key Design Notes

- **Plan snapshot**: All plan fields are copied into `EnquiryPurchasedPlan.plan` at purchase time. Admin edits to the master plan don't affect historical records.
- **Atomic writes**: All multi-document operations (coins debit + plan creation + coins txn) use Mongoose sessions to prevent partial state.
- **Webhook-driven activation** for online payments: the frontend redirects immediately after Razorpay success; the actual plan is activated only when the webhook fires, ensuring the payment is captured.
- **Idempotent webhook**: `manageOnlinePayment.js` checks `txn.status === "Success"` before processing to safely handle duplicate webhook deliveries.
- **`enquiriesUsed`** is incremented externally (by the enquiry purchase/assignment flow) when a user consumes an enquiry from this plan.
