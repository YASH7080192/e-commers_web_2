# Pandit Ji Poster Wali

An in-progress online storefront and shop management app for Pandit Ji Poster Wali in Connaught Place, Delhi. It is built with React and TypeScript, a Vite frontend, an Express API, and MongoDB through Mongoose. This repository contains ongoing development work and is not a finished or production-ready store.

## Current features

- Responsive customer storefront with product catalogue, size and price variants, cart, checkout, account pages, order tracking, reviews, and wishlist support.
- COD checkout and optional Razorpay integration, with server-side price and stock validation.
- Admin pages and APIs for products, categories, orders, customers, reviews, settings, and offline sales.
- Custom poster request flow: customer brief and reference photo upload, private original-image storage, admin review and quotation, customer approval or change request, and conversion to an order.
- Optional email and WhatsApp notifications when the relevant service credentials are configured.

Some customer and operational flows remain incomplete. See the delivery boundary section before planning a public launch.

## Technology

- React 19, TypeScript, React Router, Vite, Tailwind CSS
- Node.js, Express 5, Mongoose, MongoDB
- JWT authentication, Multer uploads, optional Cloudinary, Razorpay, SMTP, and WhatsApp Cloud API

## Local setup

Requirements: Node.js 20.19+ (or 22.12+) and npm, plus a MongoDB database (local or Atlas).

1. Clone the repository and enter its folder.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, a random `JWT_SECRET` (32+ characters), `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD`. Keep `.env` private; it is ignored by Git.
3. Install dependencies with `npm install`.
4. Create an administrator with `npm run seed:admin` if the database does not already have one. This command writes to the configured database.
5. Start frontend and API with `npm run dev`.
6. Open `http://localhost:5173`; the API health endpoint is `http://localhost:4000/api/health`.

The optional `npm run seed:catalog` command inserts starter catalogue data into the configured database. Run it only if you want that sample data and have checked which database `.env` points to. Do not run seed commands against a production database without a backup and an explicit plan.

## Environment and file storage

- `.env.example` documents configuration names; fill actual credentials only in the ignored `.env` file or deployment environment.
- Product uploads under `uploads/` are ignored. Back them up and deploy them separately if the shop uses local image storage.
- Customer reference photos and design previews are stored privately outside the repository by default, in the sibling `.panditji-private-custom-requests` directory. `CUSTOM_REQUEST_UPLOAD_DIR` can point to a protected persistent directory. Do not publish or commit these files.
- Cloudinary, Razorpay, SMTP, and WhatsApp integrations are optional. A notification is not reported as sent unless its integration is configured and succeeds.

## Build and tests

```sh
npm run build
npm test
```

`npm test` runs the default Node test suite. Database integration tests require explicit opt-in and a disposable QA database:

```sh
RUN_ORDER_INTEGRATION=true npm run test:integration
RUN_PRODUCT_INTEGRATION=true npm run test:products:integration
RUN_CUSTOM_INTEGRATION=true npm run test:custom:integration
```

Point `MONGODB_URI` at a dedicated QA database before running integration tests. Never use the shop's production database for tests. Verify each integration test's required environment flag in its test file before running it.

## Delivery boundary

This is an active project, not a production-ready service. Work still needed includes completing and reviewing customer account flows, email verification and password recovery, payment failure and stock handling, provider-backed delivery, real product imagery and prices, policy text, security review, monitoring, backups, and mobile-device QA. Before launch, configure production services and credentials, review data handling and payment behavior, and test the full order lifecycle in a safe environment.

## Security and GitHub

Never commit `.env`, credentials, database exports, customer uploads, or private design files. `.gitignore` excludes environment files, build output, dependency folders, uploads, private custom-request files, and QA screenshots. Review `git status` and staged changes before committing or pushing.
