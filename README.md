# Wholesale ERP / CRM System

A lightweight ERP/CRM system for a wholesale/distribution company, covering customers (CRM), products & inventory, and a sales challan workflow with stock control. Built to demonstrate full-stack development: backend APIs, database design, frontend UI, and deployment practices.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js, TypeScript, Express.js, Prisma ORM |
| Database   | PostgreSQL |
| Auth       | JWT (JSON Web Tokens), bcrypt password hashing |
| Validation | Zod |
| Frontend   | React, TypeScript, Vite, React Router, Axios |
| Deployment | AWS (EC2 + RDS, or Elastic Beanstalk), documented below |

---

## Project Structure

```
erp-crm/
├── backend/                 # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema (source of truth)
│   │   └── seed.ts          # Demo users + sample data
│   ├── src/
│   │   ├── config/          # Prisma client singleton
│   │   ├── middleware/       # auth, validation, error handling
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   └── challans/
│   │   ├── utils/           # ApiError, asyncHandler, pagination
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   └── package.json
└── frontend/                 # React + TypeScript SPA
    ├── src/
    │   ├── api/              # axios client
    │   ├── components/       # Layout, ProtectedRoute
    │   ├── context/          # AuthContext
    │   ├── pages/            # Login, Dashboard, Customers, Products, Challans
    │   ├── types/
    │   └── styles.css
    ├── .env.example
    └── package.json
```

---

## Data Model (Core Entities)

- **User** — id, name, email, passwordHash, role (`ADMIN` / `SALES` / `WAREHOUSE` / `ACCOUNTS`)
- **Customer** — name, mobile, email, businessName, gstNumber, customerType (`RETAIL`/`WHOLESALE`/`DISTRIBUTOR`), address, status (`LEAD`/`ACTIVE`/`INACTIVE`), followUpDate, notes
- **FollowUp** — per-customer CRM notes with timestamps and author
- **Product** — name, sku (unique), category, unitPrice, currentStock, minStockAlert, location
- **StockMovement** — productId, quantity, movementType (`IN`/`OUT`), reason, reference, createdBy, timestamp — a full audit trail of every stock change
- **Challan** — challanNumber (auto-generated, e.g. `CH-20260729-0001`), customerId, totalQuantity, status (`DRAFT`/`CONFIRMED`/`CANCELLED`), createdBy
- **ChallanItem** — stores a **snapshot** of product name/SKU/price at the time of sale (not just a foreign key), so historical challans stay accurate even if the product catalogue changes later

### Key business rules implemented
- A challan can be saved as `DRAFT` (no stock impact) or `CONFIRMED` (stock is reduced immediately, inside a database transaction).
- Stock can **never go negative** — if any line item requests more than what's available, the whole operation is rejected with a `400` and a clear message (no partial stock deduction).
- Cancelling a `CONFIRMED` challan automatically restores the stock it had taken, with its own audit trail entry.
- Only `DRAFT` challans can be edited.
- Every manual stock adjustment (purchase receipt, damage, correction) goes through the stock-movement endpoint so there's always a log of who changed what stock and why.

---

## Roles & Permissions

| Action                         | Admin | Sales | Warehouse | Accounts |
|--------------------------------|:-----:|:-----:|:---------:|:--------:|
| Create/edit customers          | ✅ | ✅ | ❌ | ❌ |
| View customers                 | ✅ | ✅ | ✅ | ✅ |
| Delete customer                | ✅ | ❌ | ❌ | ❌ |
| Create/edit products           | ✅ | ❌ | ✅ | ❌ |
| Record stock movements         | ✅ | ❌ | ✅ | ❌ |
| View products                  | ✅ | ✅ | ✅ | ✅ |
| Create/edit sales challans     | ✅ | ✅ | ❌ | ❌ |
| Confirm challan                | ✅ | ✅ | ✅ | ❌ |
| Cancel challan                 | ✅ | ✅ | ❌ | ❌ |
| Create new employee accounts   | ✅ | ❌ | ❌ | ❌ |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local install, Docker, or a managed instance)

### 1. Clone and install
```bash
git clone <your-repo-url> erp-crm
cd erp-crm

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

**backend/.env** (copy from `backend/.env.example`):
```
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5432/erp_crm_db?schema=public"
JWT_SECRET="replace-this-with-a-long-random-secret"
JWT_EXPIRES_IN="8h"
CORS_ORIGIN="http://localhost:5173"
```

**frontend/.env** (copy from `frontend/.env.example`):
```
VITE_API_BASE_URL=http://localhost:4000
```

### 3. Create the database (if using local Postgres)
```bash
psql -U postgres -c "CREATE DATABASE erp_crm_db;"
psql -U postgres -c "CREATE USER erp_user WITH PASSWORD 'erp_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE erp_crm_db TO erp_user;"
```

Or with Docker:
```bash
docker run --name erp-postgres -e POSTGRES_USER=erp_user -e POSTGRES_PASSWORD=erp_password \
  -e POSTGRES_DB=erp_crm_db -p 5432:5432 -d postgres:16
```

### 4. Run migrations, generate the Prisma client, and seed demo data
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

This creates 4 demo users (all with password `Password123!`):
- `admin@erp.local` — Admin
- `sales@erp.local` — Sales
- `warehouse@erp.local` — Warehouse
- `accounts@erp.local` — Accounts

...plus one sample customer and one sample product.

### 5. Run the app
```bash
# Terminal 1 — backend (http://localhost:4000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open `http://localhost:5173` and log in with any of the seeded accounts.

---

## API Reference (selected endpoints)

All endpoints except `POST /auth/login` require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint         | Access | Description |
|--------|------------------|--------|--------------|
| POST   | `/auth/login`    | Public | Returns `{ token, user }` |
| POST   | `/auth/register` | Admin  | Create a new employee account |
| GET    | `/auth/me`       | Any    | Current user profile |

### Customers
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET    | `/customers?search=&status=&customerType=&page=&pageSize=` | Any | Paginated search/filter |
| GET    | `/customers/:id` | Any | Includes follow-ups and recent challans |
| POST   | `/customers` | Admin, Sales | |
| PUT    | `/customers/:id` | Admin, Sales | |
| DELETE | `/customers/:id` | Admin | |
| POST   | `/customers/:id/follow-ups` | Admin, Sales | Add a CRM note |

### Products
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET    | `/products?search=&category=&lowStock=true&page=&pageSize=` | Any | |
| GET    | `/products/:id` | Any | Includes stock movement history |
| POST   | `/products` | Admin, Warehouse | |
| PUT    | `/products/:id` | Admin, Warehouse | Stock cannot be changed here — see below |
| DELETE | `/products/:id` | Admin | Soft-delete (deactivates) |
| POST   | `/products/:id/stock-movements` | Admin, Warehouse | `{ quantity, movementType: "IN"|"OUT", reason, reference? }` |

### Sales Challans
| Method | Endpoint | Access | Notes |
|--------|----------|--------|-------|
| GET    | `/challans?status=&customerId=&page=&pageSize=` | Any | |
| GET    | `/challans/:id` | Any | Full line items with product snapshots |
| POST   | `/challans` | Admin, Sales | `{ customerId, items: [{productId, quantity}], status?: "DRAFT"|"CONFIRMED" }` |
| PUT    | `/challans/:id` | Admin, Sales | Only while `DRAFT` |
| POST   | `/challans/:id/confirm` | Admin, Sales, Warehouse | Reduces stock atomically; `400` if any line is short |
| POST   | `/challans/:id/cancel` | Admin, Sales | Restores stock if it was `CONFIRMED` |

### Example error response (insufficient stock)
```json
{
  "success": false,
  "message": "Insufficient stock for \"Steel Bucket 15L\". Available: 5, requested: 20"
}
```

### Example validation error
```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    { "path": "body.mobile", "message": "Valid mobile number is required" }
  ]
}
```

---

## Deployment on AWS

This app can be deployed with **EC2 + RDS** (simple, transparent) or **Elastic Beanstalk + RDS** (more managed). Steps below use EC2 + RDS.

### 1. Provision an RDS PostgreSQL instance
1. AWS Console → RDS → Create database → PostgreSQL, `db.t3.micro` for a demo.
2. Set master username/password, DB name `erp_crm_db`.
3. Note the endpoint hostname — this goes into `DATABASE_URL`.
4. Security group: allow inbound Postgres (5432) only from your EC2 instance's security group (not `0.0.0.0/0`).

### 2. Provision an EC2 instance for the backend
1. Launch an EC2 instance (Amazon Linux 2023 or Ubuntu 22.04, `t3.small` or larger).
2. Security group: allow inbound `80`/`443` (via a reverse proxy) and `22` (SSH, restricted to your IP).
3. SSH in and install Node.js 18+, git, and (optionally) `pm2` for process management:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   sudo npm install -g pm2
   ```
4. Clone the repo and set up the backend:
   ```bash
   git clone <your-repo-url> erp-crm
   cd erp-crm/backend
   npm install
   npm run build
   ```
5. Create `/erp-crm/backend/.env` on the server with production values (RDS `DATABASE_URL`, a strong `JWT_SECRET`, `CORS_ORIGIN` set to your frontend's domain, `NODE_ENV=production`). **Never commit `.env` to git.**
6. Run migrations against RDS:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed   # optional, for initial demo users
   ```
7. Start the API with pm2 so it survives reboots/crashes:
   ```bash
   pm2 start dist/server.js --name erp-crm-api
   pm2 save
   pm2 startup   # follow the printed instructions to enable on boot
   ```
8. Put Nginx in front of the Node process to terminate TLS and proxy to port 4000:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       location / {
           proxy_pass http://localhost:4000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
   Use `certbot` (Let's Encrypt) to add HTTPS.

### 3. Deploy the frontend
The simplest path is a static build served from **S3 + CloudFront**:
```bash
cd frontend
# set VITE_API_BASE_URL to your API's public URL in frontend/.env before building
npm install
npm run build
aws s3 sync dist/ s3://your-frontend-bucket --delete
```
Then create a CloudFront distribution pointing at the S3 bucket (with an Origin Access Control), and optionally attach a custom domain via Route 53 + ACM.

Alternatively, the `dist/` folder can be served directly by Nginx on the same EC2 instance as a second `server` block, if a fully separate static host isn't needed for the demo.

### 4. Environment variable summary for production
| Variable | Where | Example |
|----------|-------|---------|
| `DATABASE_URL` | backend | `postgresql://user:pass@your-rds-endpoint:5432/erp_crm_db` |
| `JWT_SECRET` | backend | long random string, e.g. `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | backend | `8h` |
| `CORS_ORIGIN` | backend | `https://app.yourdomain.com` |
| `PORT` | backend | `4000` |
| `VITE_API_BASE_URL` | frontend (build-time) | `https://api.yourdomain.com` |

---

## Scripts Reference

**Backend**
```bash
npm run dev                # start with ts-node + nodemon
npm run build               # compile TypeScript to dist/
npm start                    # run compiled server
npm run prisma:generate      # regenerate Prisma client after schema changes
npm run prisma:migrate       # create/apply a dev migration
npm run prisma:migrate:deploy # apply migrations in production (no prompts)
npm run prisma:seed          # seed demo data
npm run prisma:studio        # open Prisma's DB browser GUI
```

**Frontend**
```bash
npm run dev       # start Vite dev server
npm run build     # type-check + production build
npm run preview   # preview the production build locally
```

---

## Notes & Known Simplifications

This is a compact demonstration system, not a production-hardened ERP. Scope was deliberately kept tight around the four required modules (Auth, Customer CRM, Products/Inventory, Sales Challans). Things intentionally left out or simplified, which would be natural next steps:
- Purchase orders and invoices are modeled in the business context but not yet implemented as separate modules (the schema and module pattern established here — e.g. `challans/`— would extend directly to a `purchase-orders/` or `invoices/` module).
- No refresh-token rotation — JWTs simply expire after `JWT_EXPIRES_IN` and require re-login.
- No file/attachment storage (e.g. signed challan photos) is included.
- Rate limiting and request logging aggregation (e.g. CloudWatch) are not configured; `morgan` logs to stdout only.
