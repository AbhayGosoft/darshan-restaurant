# Restaurant Food Ordering — Integration Guide for the Darshan App

This guide explains how restaurant food ordering works after the move from **time slots** to
**same-day orders with an arrival time**, and how the Darshan app should call the Restaurant
Backend to support it end to end.

- **Darshan app developers:** read sections 1–9 and 12.
- **Restaurant admin panel and operations:** read sections 3, 10 and 11.

Live, always-current API reference (Swagger): `GET {BASE_URL}/api/docs`

---

## 1. What changed

| Before (slots) | Now (arrival time) |
| --- | --- |
| Customer picked a fixed slot (12:00, 12:30 …) up to 7 days ahead | Customer picks an **arrival time for today only** |
| `GET /api/restaurants/:id/slots` | **Removed.** Use `GET /api/restaurants/:id/arrival-window` |
| Per-slot booking limits, seating-capacity checks | **No capacity limit.** The restaurant controls load by accepting or rejecting orders |
| Statuses: `upcoming`, `past`, `cancelled` | Statuses: `upcoming`, `acknowledged`, `preparing`, `ready`, `completed`, `cancelled`, `rejected` |
| Cancel allowed until 60 min before the slot | Cancel allowed until the restaurant **starts preparing** the food |
| `?filter=upcoming\|past` on My Bookings | `?filter=active\|past` (`upcoming` still works as an alias of `active`) |
| Restaurant settings → Slots page | Removed. Restaurant settings → General now has **Opens at / Closes at** |

---

## 2. End-to-end flow

```
 Darshan app                         Restaurant Backend                    Restaurant admin panel
 ───────────                         ──────────────────                    ──────────────────────
 1. Login (central auth bridge) ───▶ POST /api/restaurant/auth
                                     ◀── access_token, refresh_token
 2. Browse restaurants          ───▶ GET  /api/restaurants
                                     GET  /api/restaurants/:id
                                     GET  /api/restaurants/:id/menu
 3. Pick arrival time           ───▶ GET  /api/restaurants/:id/arrival-window
 4. Pay                         ───▶ POST /api/payments/initiate   (items → server-priced amount)
    Razorpay Checkout (SDK)          …customer pays…
                                ───▶ POST /api/payments/verify     (signature check)
 5. Place order                 ───▶ POST /api/restaurants/:id/bookings
                                     status = "upcoming"  ─────────────▶ appears in Bookings + bell
                                                                         [Acknowledge]
                                     status = "acknowledged" ◀───────────
 6. Track order (push + socket) ◀─── "Order accepted"
                                                                         [Start preparing]
                                     status = "preparing"   ◀───────────
                                ◀─── "Your food is being prepared"       (customer can no longer cancel)
                                                                         [Mark ready]
                                     status = "ready"       ◀───────────
                                ◀─── "Your food is ready"
                                                                         [Complete]
                                     status = "completed"   ◀───────────
                                ◀─── "Order completed"
```

At any point before `preparing`, the customer can cancel. At any point before `completed`, the
restaurant can cancel. While the order is still `upcoming`, the restaurant can also reject it.

---

## 3. Order statuses

| Status | Meaning | Who moves it here | Customer can cancel? | Customer can modify? | Push sent to customer |
| --- | --- | --- | --- | --- | --- |
| `upcoming` | Order placed and paid, waiting for the restaurant | Customer (by placing the order) | ✅ | ✅ | "Order placed" (`BOOKING_CONFIRMED`) |
| `acknowledged` | Restaurant accepted the order | Restaurant | ✅ | ❌ | "Order accepted" (`BOOKING_ACKNOWLEDGED`) |
| `preparing` | Kitchen started cooking | Restaurant | ❌ | ❌ | "Your food is being prepared" (`BOOKING_PREPARING`) |
| `ready` | Food is ready | Restaurant | ❌ | ❌ | "Your food is ready" (`BOOKING_READY`) |
| `completed` | Customer collected the food or finished eating | Restaurant | ❌ | ❌ | "Order completed" (`BOOKING_COMPLETED`) |
| `cancelled` | Cancelled by the customer or by the restaurant | Customer (before `preparing`) or restaurant (before `completed`) | — | — | "Order cancelled" (`BOOKING_CANCELLED`) |
| `rejected` | Restaurant declined a new order | Restaurant (only from `upcoming`) | — | — | "Order rejected" (`BOOKING_REJECTED`) |

Rules enforced by the backend:

- The restaurant moves an order forward **one step at a time**:
  `upcoming → acknowledged → preparing → ready → completed`. It can't skip a step or go back.
- `completed`, `cancelled` and `rejected` are final.
- If the customer cancels at the same moment the restaurant presses "Start preparing", only one
  of the two succeeds. The other gets a `409`. The app should then re-fetch the booking.
- Every booking response includes `canCancel` and `canModify`. **Use these flags to show or hide
  the Cancel and Change buttons** instead of hard-coding the rules in the app.

---

## 4. Conventions

### 4.1 Base URL and headers

| Header | When | Value |
| --- | --- | --- |
| `x-client-key` | Every `/api/*` call **except** `/api/restaurant/auth` (only enforced when the server has `APP_CLIENT_KEY` set) | The shared client key |
| `Authorization` | Customer endpoints (marked 🔒 below) | `Bearer <access_token>` |
| `Content-Type` | Requests with a body | `application/json` |

### 4.2 Response envelope

Every response uses the same shape:

```json
{ "status": true,  "message": "Order placed", "data": { … } }
{ "status": false, "message": "Your food is already being prepared, so this order can't be cancelled now." }
```

`message` on errors is written for end users and is safe to show in the app as-is.

### 4.3 Formats

- **Dates:** `YYYY-MM-DD`
- **Times on the customer API:** 12-hour `h:mm AM/PM`, e.g. `"1:30 PM"`
- **Timezone:** all times are restaurant wall-clock time in **IST (Asia/Kolkata)**
- **Money:** INR, as numbers, e.g. `420` or `99.5`

---

## 5. Authentication

### 5.1 Login (server-to-server bridge)

After OTP login on the Darshan side, call the bridge with the **Restaurant app API key** (not
`x-client-key`):

```http
POST /api/restaurant/auth
Authorization: Bearer <RESTAURANT_APP_API_KEY>
Content-Type: application/json

{
  "phone": "+919876543210",
  "central_token": "<JWT issued by Darshan central auth>",
  "central_user_id": 12345,
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "player_id": "<OneSignal player id, for push notifications>"
}
```

```json
{
  "status": true,
  "message": "Authenticated.",
  "data": {
    "user": { "id": "…", "name": "Rahul Sharma", "phone": "+919876543210", "email": "rahul@example.com" },
    "access_token": "…",
    "refresh_token": "…",
    "expires_in": 900
  }
}
```

The phone number and `central_user_id` must match the claims inside `central_token`; otherwise
the call returns `401`. **Send `player_id`**, because order status pushes go to that OneSignal
device.

### 5.2 Refresh and logout

```http
POST /api/auth/refresh   { "refresh_token": "…" }   → { access_token, refresh_token }
POST /api/auth/logout    { "refresh_token": "…" }
```

Access tokens are short-lived (15 min by default). On a `401`, refresh once and retry. Refresh
tokens rotate, so always store the new `refresh_token` from the response.

---

## 6. Browsing restaurants and the menu

### 6.1 List restaurants

```http
GET /api/restaurants?city=Ahmedabad&category=pure_veg&q=shyam&latitude=23.02&longitude=72.57&page=1&limit=20
```

### 6.2 Restaurant detail

```http
GET /api/restaurants/:id?latitude=23.02&longitude=72.57
```

Relevant fields for ordering:

```json
{
  "id": "…", "name": "Shree Shyam Restaurant",
  "prepTimeMin": 20, "prepTimeMax": 30,
  "opensAt": "9:00 AM", "closesAt": "11:00 PM",
  "maxPartySize": 12,
  "distanceKm": 1.8
}
```

### 6.3 Menu

```http
GET /api/restaurants/:id/menu
```

This returns the active categories with their active items (`id`, `name`, `price`, `isVeg`, …).
Keep the `menuItemId` and `quantity` of everything the customer adds to the cart. The same
list is sent to payment and to booking.

---

## 7. Placing an order

### 7.1 Get today's arrival window

```http
GET /api/restaurants/:id/arrival-window
```

```json
{
  "status": true,
  "message": "OK",
  "data": {
    "date": "2026-10-08",
    "isOpen": true,
    "opensAt": "9:00 AM",
    "closesAt": "11:00 PM",
    "prepTimeMinutes": 30,
    "earliest": "12:45 PM",
    "latest": "11:00 PM",
    "stepMinutes": 15,
    "suggestedTimes": ["12:45 PM", "1:00 PM", "1:15 PM", "…", "11:00 PM"]
  }
}
```

How the window is calculated:

- **earliest** = now + `prepTimeMax`, rounded **up** to the next 15 minutes, and never before
  opening time. For example, at 12:10 PM with a 30-minute prep time the earliest arrival is
  12:40, rounded up to **12:45 PM**.
- **latest** = closing time.
- **isOpen = false** means no time is left today (for example, late evening, or the prep time
  runs past closing). In that case `earliest`, `latest` and `suggestedTimes` are empty. Show
  "Not accepting orders today" and disable ordering.

App guidance:

- Show `suggestedTimes` as the picker options. Any minute between `earliest` and `latest` is
  also accepted.
- **Re-fetch the window right before payment**, because it moves forward as time passes.
- Orders are **today only**. Don't offer a date picker.

### 7.2 Create the payment order

```http
POST /api/payments/initiate                         🔒
{
  "restaurantId": "…",
  "items": [ { "menuItemId": "…", "quantity": 2 }, { "menuItemId": "…", "quantity": 1 } ]
}
```

```json
{
  "status": true,
  "message": "Payment order created",
  "data": { "payment_id": "…", "order_id": "order_Nx…", "amount": 420, "currency": "INR", "key_id": "rzp_live_…", "mock": false }
}
```

The **amount is calculated by the server** from database prices. Open Razorpay Checkout with
`key_id`, `order_id` and `amount`. `mock: true` only appears on servers without Razorpay keys
(local or dev).

### 7.3 Verify the payment

After Razorpay Checkout succeeds:

```http
POST /api/payments/verify                           🔒
{
  "razorpay_order_id": "order_Nx…",
  "razorpay_payment_id": "pay_Ny…",
  "razorpay_signature": "…"
}
```

A wrong signature returns `400` and marks the payment order as failed. Start again from 7.2.

### 7.4 Place the order

```http
POST /api/restaurants/:id/bookings                  🔒
{
  "time": "1:30 PM",
  "people": 2,
  "fullName": "Rahul Sharma",
  "mobileNumber": "+919876543210",
  "email": "rahul@example.com",
  "specialRequest": "Less spicy please",
  "latitude": 23.02,
  "longitude": 72.57,
  "preorderItems": [
    { "menuItemId": "…", "quantity": 2, "note": "No onion" },
    { "menuItemId": "…", "quantity": 1 }
  ],
  "payment": { "razorpay_order_id": "order_Nx…", "razorpay_payment_id": "pay_Ny…" }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `time` | ✅ | Arrival time, `h:mm AM/PM`, inside today's window |
| `people` | ✅ | 1 to the restaurant's `maxPartySize` |
| `fullName`, `mobileNumber` | ✅ | |
| `preorderItems` | ✅ | **Same items and quantities as `/payments/initiate`.** If the total differs, the call returns `409` |
| `payment` | ✅ | From the verified payment |
| `date` | ❌ | Optional, kept for older builds. If sent, it must be today |
| `email`, `specialRequest`, `latitude`, `longitude` | ❌ | |
| `tablePreference` | ❌ | Deprecated (table booking is disabled) |

On success the response is `201` with `"Order placed"` and the booking object (section 8.1),
with `status: "upcoming"`.

**Grace period:** because the customer has already paid, the backend accepts an arrival time up
to **5 minutes** sooner than the normal earliest time. So a customer who picked 12:45 PM and
took a while to pay still gets their order.

**Every payment can be used for one order only.** Reusing it returns `409`.

---

## 8. After the order is placed

### 8.1 Booking object

Every booking endpoint returns this shape:

```json
{
  "id": "6f1c…",
  "humanBookingId": "#SSR2610081234",
  "restaurantId": "…",
  "restaurantName": "Shree Shyam Restaurant",
  "restaurantImage": "https://…/banner.jpg",
  "rating": 4.6,
  "cuisineLabel": "Pure Veg • North Indian",
  "distanceKm": 1.8,
  "date": "2026-10-08",
  "time": "1:30 PM",
  "people": 2,
  "specialRequest": "Less spicy please",
  "fullName": "Rahul Sharma",
  "mobileNumber": "+919876543210",
  "email": "rahul@example.com",
  "status": "acknowledged",
  "canCancel": true,
  "canModify": false,
  "cancellationReason": null,
  "cancelledBy": null,
  "rejectionReason": null,
  "statusTimestamps": {
    "createdAt": "2026-10-08T07:40:12.000Z",
    "acknowledgedAt": "2026-10-08T07:42:03.000Z",
    "preparingAt": null,
    "readyAt": null,
    "completedAt": null,
    "cancelledAt": null,
    "rejectedAt": null
  },
  "advancePaid": 420,
  "preorder": {
    "id": "…", "subtotal": 420, "total": 420,
    "items": [ { "id": "…", "menuItemId": "…", "name": "Paneer Tikka", "unitPrice": 180, "quantity": 2, "note": "No onion", "lineTotal": 360 } ]
  },
  "refund": undefined
}
```

- `date` and `time` are the **arrival** date and time.
- `statusTimestamps` can drive an order-tracking timeline.
- `cancelledBy` is `"customer"` or `"restaurant"` (only on cancelled orders).
- `refund` is present only on `cancelled` and `rejected` orders: `{ "eligible": true, "amount": 420 }`.
- `advancePaid` is the full amount the customer paid for the items.

### 8.2 My orders

```http
GET /api/my-restaurant-bookings?filter=active        🔒   upcoming / acknowledged / preparing / ready
GET /api/my-restaurant-bookings?filter=past          🔒   completed / cancelled / rejected
GET /api/my-restaurant-bookings                      🔒   everything
```

Results are sorted newest first. `filter=upcoming` still works as an alias of `active`.

### 8.3 One order

```http
GET /api/restaurant-bookings/:id                     🔒
GET /api/restaurant-bookings/:id/preorder            🔒   just the ordered items
```

### 8.4 Change arrival time or party size (only while `upcoming`)

```http
PATCH /api/restaurant-bookings/:id                   🔒
{ "time": "2:00 PM", "people": 3 }
```

- At least one of `time` or `people` is required.
- The new `time` must be inside today's window. Unlike order creation, there is no 5-minute grace.
- Once the restaurant acknowledges the order, this returns `409` ("…restaurant has already
  accepted it"). Show the Change button only when `canModify` is `true`.
- Ordered items can't be changed after payment.

### 8.5 Cancel (only while `upcoming` or `acknowledged`)

```http
POST /api/restaurant-bookings/:id/cancel             🔒
{ "reason": "Change of plans" }
```

`reason` must be exactly one of:
`"Change of plans"`, `"Booked by mistake"`, `"Found a better option"`, `"Restaurant not responding"`, `"Other"`.

```json
{
  "status": true,
  "message": "Booking cancelled",
  "data": { "booking": { "status": "cancelled", "cancelledBy": "customer" }, "refund": { "eligible": true, "amount": 420 } }
}
```

Once the order is `preparing` or `ready`, this returns `409`: "Your food is already being
prepared, so this order can't be cancelled now." Show the Cancel button only when `canCancel`
is `true`.

---

## 9. Real-time updates and push notifications

### 9.1 Push (OneSignal)

A push is sent on every status change (see the table in section 3) to the `player_id` given at
login. The push `data` payload is:

```json
{ "type": "BOOKING_READY", "bookingId": "6f1c…" }
```

When the user taps it, open the order screen and fetch `GET /api/restaurant-bookings/:bookingId`.

| `type` | When |
| --- | --- |
| `BOOKING_CONFIRMED` | Order placed (status `upcoming`) |
| `BOOKING_MODIFIED` | Customer changed time or party size |
| `BOOKING_ACKNOWLEDGED` | Restaurant accepted |
| `BOOKING_PREPARING` | Cooking started |
| `BOOKING_READY` | Food ready |
| `BOOKING_COMPLETED` | Order completed |
| `BOOKING_CANCELLED` | Cancelled (by the customer or the restaurant) |
| `BOOKING_REJECTED` | Restaurant rejected the order |
| `BOOKING_REMINDER` | Reminder before arrival (`BOOKING_REMINDER_MINUTES_BEFORE`, default 120 min). Skipped when the order is placed closer than that to its arrival time |

### 9.2 Socket.IO (optional, for live order tracking)

Connect to the same host with the customer's access token:

```js
import { io } from "socket.io-client";
const socket = io(BASE_URL, { auth: { token: accessToken } });

socket.on("customer:booking:updated", (booking) => {
  // Full booking object (section 8.1) after any status change — update the screen directly.
});
socket.on("restaurant:notification:new", (notification) => {
  // { id, type, bookingId, title, body, createdAt, … } — same content as the push.
});
```

If the socket is down, the app can fall back to re-fetching the order whenever it comes to the
foreground.

---

## 10. Restaurant side (admin panel)

### 10.1 One-time setup per restaurant

**Settings → General:**

- **Prep time max (mins):** decides the earliest arrival time customers can pick.
- **Opens at / Closes at:** arrival times must fall inside these hours. Closing time must be after
  opening time.
- **Every existing restaurant got 9:00 AM – 11:00 PM by default.** Set the real hours.

### 10.2 Handling orders (Bookings page)

- The page opens on **today's** orders, soonest arrival first. Use the From/To date pickers,
  the status filter (including "Active (not finished)") and the search box (name, mobile or
  booking ID) to find others.
- Each row has a **Next step** button: **Acknowledge → Start preparing → Mark ready → Complete**.
- Click a row to open its details:
  - **Reject order** (with an optional reason): only for new (`upcoming`) orders.
  - **Cancel booking** (with a reason): any order that isn't completed.
- New orders and status changes arrive live: the table refreshes and the header bell shows new
  orders.

---

## 11. Refunds

- Every **cancellation** (by the customer or the restaurant) and every **rejection** marks the
  **full amount paid** as refundable. The booking shows `refund: { eligible: true, amount }`, and
  the customer's push says the payment "is eligible for a full refund".
- **The refund is not sent to Razorpay automatically.** Operations must issue it from the
  Razorpay dashboard. Use the booking's `humanBookingId` and amount to find it.

---

## 12. Errors the app should handle

| HTTP | Typical `message` | What the app should do |
| --- | --- | --- |
| `401` | Invalid or expired token | Refresh the token (5.2) and retry once; if that fails, log in again |
| `402` | Payment has not been verified. | Call `/payments/verify` first |
| `404` | Restaurant not found / Booking not found | Restaurant inactive or wrong id: go back |
| `409` | Selected menu items do not match the paid amount. Please pay again. | Cart changed after payment; start payment again |
| `409` | This payment has already been used for a booking. | Don't retry with the same payment |
| `409` | …already being prepared, so this order can't be cancelled now. | Re-fetch the order; hide Cancel |
| `409` | …restaurant has already accepted it. | Re-fetch the order; hide Change |
| `422` | Your food needs about 30 minutes to prepare. Please choose an arrival time of 12:45 PM or later. | Re-fetch the arrival window and let the user pick again |
| `422` | Arrival time must be between 9:00 AM and 11:00 PM. | Same as above |
| `422` | The restaurant isn't taking more orders today. | Disable ordering for this restaurant today |
| `422` | Orders can only be placed for today. | Don't send `date`, or send today's date |
| `422` | Invalid time format. Use e.g. "12:00 PM". | Fix the time format |

**If payment succeeded but order creation failed with a 422 on time:** the customer has already
paid. Let them pick a new time from a fresh arrival window and retry **the same
`POST /bookings` call with the same `payment`**. The payment stays valid until it is used for an
order. Don't start a new payment.

---

## 13. Migration checklist for the Darshan app

- [ ] Remove all calls to `GET /api/restaurants/:id/slots` and the slot or date picker.
- [ ] Add the arrival-time picker backed by `GET /api/restaurants/:id/arrival-window`, and handle `isOpen: false`.
- [ ] Stop sending `date` in `POST /bookings` (or send today only).
- [ ] Support all 7 statuses in UI labels, colors and the order timeline (`statusTimestamps`).
- [ ] Use `canCancel` and `canModify` to show the Cancel and Change buttons.
- [ ] Switch My Orders tabs to `?filter=active` and `?filter=past`.
- [ ] Handle the new push `type` values and open the order on tap.
- [ ] (Optional) Listen to `customer:booking:updated` for live tracking.
- [ ] Show `rejectionReason` and the refund info on rejected or cancelled orders.

---

## 14. Known limitations

- **No automatic refunds.** See section 11.
- **No auto-expiry.** An order the restaurant never acknowledges stays `upcoming` (it is not
  auto-rejected at closing time). The restaurant should reject or cancel such orders.
- **No capacity limit.** Any number of orders can be placed for the same arrival time. The
  restaurant manages load through acknowledge and reject.
- **Same-day only.** Pre-ordering for a future day is not supported.
- **Opening hours are a single daily range** (no split lunch and dinner hours, no weekly days off,
  no closing after midnight).

---

## 15. Deployment notes

- Database migration `20261003000000_order_status_flow` adds the new statuses, the opening-hour
  columns and the per-status timestamps, drops the old slot table, and marks old uncancelled
  bookings from previous days as `completed`. It runs automatically on deploy
  (`npx prisma migrate deploy` in the backend CI/CD workflow).
- `BOOKING_MODIFICATION_CUTOFF_MINUTES` is no longer used and can be removed from server `.env`
  files.
- The Darshan app changes in section 13 must ship **together with or right after** the backend
  deploy, because `/slots` stops working as soon as the new backend is live.
