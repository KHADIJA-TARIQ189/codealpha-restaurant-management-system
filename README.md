# Restaurant Management System — Backend API

A complete Express.js + Sequelize (SQLite) backend for restaurant operations: menu, orders,
tables, reservations, inventory (with automatic deduction), and sales/stock reporting.

No external database server is required — it runs on SQLite out of the box. Swap the dialect
in `src/config/database.js` for Postgres/MySQL in production if you want.

## 1. Setup

```bash
npm install
cp .env.example .env      # then edit JWT_SECRET to something random
npm run seed               # creates tables, sample menu/inventory, and an admin user
npm run dev                 # starts on http://localhost:5000 (nodemon, auto-restart)
# or: npm start
```

Seeded admin login: `admin@restaurant.com` / `admin123`

> `npm run seed` **wipes and rebuilds** the database — only run it in dev/demo.

## 2. Project structure

```
src/
  config/database.js       Sequelize/SQLite connection
  models/                  MenuItem, InventoryItem, MenuItemIngredient (recipe),
                            Table, Reservation, Order, OrderItem,
                            InventoryTransaction, User — and all associations
  middleware/auth.js        JWT auth (protect) + role guard (restrictTo)
  middleware/errorHandler.js  asyncHandler wrapper + centralized error responses
  controllers/               business logic per resource
  routes/                    Express routers per resource
  utils/seed.js              demo data generator
  app.js                     Express app + route mounting
  server.js                  DB connect/sync + listen
```

## 3. Data model

- **MenuItem** — name, description, category, price, availability.
- **InventoryItem** — name, unit, quantity in stock, reorder threshold, cost/unit.
- **MenuItemIngredient** — join table (the "recipe"): how much of an InventoryItem one unit
  of a MenuItem consumes. This is what drives automatic stock deduction.
- **Table** — number, capacity, location, status (`available` / `occupied` / `reserved`).
- **Reservation** — customer, party size, time window, linked table, status.
- **Order** / **OrderItem** — an order has many line items; each line item snapshots the
  menu price at order time so later price changes don't rewrite history.
- **InventoryTransaction** — audit log of every stock change (restock, order deduction,
  manual adjustment, waste).
- **User** — admin/staff accounts for the admin panel (bcrypt-hashed passwords, JWT auth).

## 4. Core business logic

- **Placing an order** (`POST /api/orders`) runs inside a single DB transaction:
  1. Validates all menu items exist and are marked available.
  2. Aggregates total ingredient consumption across every line item.
  3. Checks *every* ingredient has enough stock **before** deducting anything.
  4. Creates the order + order items, deducts inventory, and logs an
     `InventoryTransaction` per ingredient consumed.
  5. Marks the table `occupied` for dine-in orders.
  If any step fails, the whole transaction rolls back — stock is never deducted without
  a matching order.

- **Table availability** (`GET /api/tables/available?time=...&partySize=...`) filters tables
  by capacity and excludes any table with an overlapping active reservation for the
  requested time window (reservation start/duration vs. requested start/duration).

- **Reservation conflicts** (`POST /api/reservations`) reject a booking with `409` if the
  requested table/time window overlaps an existing confirmed/seated reservation.

- **Low-stock alerts** — any `InventoryItem` at or below its `reorderThreshold` shows up in
  `GET /api/inventory/low-stock` and `GET /api/reports/stock-alerts`.

## 5. API reference

Base URL: `http://localhost:5000/api`

### Auth
| Method | Endpoint | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | `{ name, email, password, role? }` |
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | logged in | current user |

Send `Authorization: Bearer <token>` on protected routes.

### Menu
| Method | Endpoint | Access |
|---|---|---|
| GET | `/menu?category=&available=true` | public |
| GET | `/menu/:id` | public |
| POST | `/menu` | admin — body may include `ingredients: [{inventoryItemId, quantityRequired}]` |
| PUT | `/menu/:id` | admin |
| PUT | `/menu/:id/recipe` | admin — replaces the full ingredient list |
| DELETE | `/menu/:id` | admin |

### Tables
| Method | Endpoint | Access |
|---|---|---|
| GET | `/tables?status=` | public |
| GET | `/tables/available?time=ISO&partySize=&durationMinutes=` | public |
| POST | `/tables` | admin |
| PUT | `/tables/:id` | admin/staff |
| DELETE | `/tables/:id` | admin |

### Reservations
| Method | Endpoint | Access |
|---|---|---|
| GET | `/reservations?date=YYYY-MM-DD&status=` | admin/staff |
| POST | `/reservations` | public — `{ tableId, customerName, customerPhone, partySize, reservationTime, durationMinutes? }` |
| PUT | `/reservations/:id` | admin/staff — update status/details |
| DELETE | `/reservations/:id` | public — cancels |

### Orders
| Method | Endpoint | Access |
|---|---|---|
| GET | `/orders?status=&orderType=` | admin/staff |
| GET | `/orders/:id` | public |
| POST | `/orders` | public — `{ orderType, tableId?, items: [{menuItemId, quantity}], customerName?, customerPhone? }` |
| PUT | `/orders/:id/status` | admin/staff — `{ status }` (`pending→preparing→ready→served→completed`, or `cancelled`) |

### Inventory (admin/staff)
| Method | Endpoint |
|---|---|
| GET | `/inventory` |
| GET | `/inventory/low-stock` |
| POST | `/inventory` *(admin)* |
| PUT | `/inventory/:id` *(admin)* |
| POST | `/inventory/:id/restock` — `{ quantity, note? }` |
| POST | `/inventory/:id/adjust` — `{ quantityChange, type?: "adjustment"|"waste", note? }` |
| GET | `/inventory/:id/transactions` |

### Reports (admin)
| Method | Endpoint |
|---|---|
| GET | `/reports/daily-sales?date=YYYY-MM-DD` |
| GET | `/reports/top-items?date=YYYY-MM-DD&limit=5` |
| GET | `/reports/stock-alerts` |
| GET | `/reports/sales-range?start=YYYY-MM-DD&end=YYYY-MM-DD` |

## 6. Example: place an order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine_in",
    "tableId": 2,
    "items": [{ "menuItemId": 4, "quantity": 2 }]
  }'
```

## 7. Notes on production readiness

- Replace `sequelize.sync()` with real migrations (`sequelize-cli`) before deploying.
- Swap SQLite for Postgres/MySQL by changing `src/config/database.js` and installing the
  relevant driver (`pg`, `mysql2`).
- Set a strong `JWT_SECRET` and appropriate `JWT_EXPIRES_IN`.
- Add rate limiting / input sanitization middleware for public-facing endpoints
  (`POST /orders`, `POST /reservations`) if exposing this beyond a trusted network.
