This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## VÉRANE V1 setup

Copy `.env.example` to `.env` and fill in the values for the services you use.

### Local development

```bash
npm ci
npm run db:init
npm run dev
```

### Production environment

Set these in your deployment environment:

- `DATABASE_URL=file:./prisma/dev.db`: Prisma schema/build-time SQLite URL. Do not use the old PostgreSQL URL.
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`: production Turso/libSQL database; runtime queries use this connection.
- `ADMIN_AUTH_SECRET` and `CUSTOMER_AUTH_SECRET`: long random authentication secrets.
- `PAYSTACK_SECRET_KEY`: Paystack server-side verification/initialization key.
- `SHIPBUBBLE_API_KEY`: required for live courier rates and waybill creation.
- `RESEND_API_KEY`: optional; order/welcome email delivery is disabled without it.
- `R2_*`: optional Cloudflare R2 upload configuration.
- `GEOAPIFY_API_KEY` and/or `LOKATE_API_KEY`: optional address autocomplete providers.

For a newly created Turso database, run `npm run db:init` once with the production Turso URL and token configured. The initializer applies the SQLite/libSQL migration files and verifies the schema; it does not import records from the old PostgreSQL database.

`SHIPBUBBLE_CATEGORY_ID` defaults to the Fashion Wears category (`98246239`). `SHIPBUBBLE_MOCK_MODE` is for tests/local development only and must remain disabled in production.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Deploy on Cloudflare Workers (additional deployment target)

Cloudflare support is additive: the existing Next.js/Vercel scripts and deployment path remain unchanged. The Cloudflare target uses the OpenNext adapter so the existing App Router, route handlers, Edge middleware, and server-rendered storefront can be retained. The admin request gate deliberately uses the supported Edge `middleware.ts` convention instead of Next.js 16 `proxy.ts`, whose Node.js middleware runtime remains experimental in the Cloudflare adapter.

### Build and preview

Use Node.js 24 and npm:

```bash
npm ci
npm run db:init
npm run cf:build
npm run cf:smoke
npm run cf:preview
```

The Cloudflare scripts install pinned versions of the OpenNext adapter and Wrangler into the local working tree without changing the committed dependency manifest or lockfile. This deliberately keeps the current Vercel dependency graph untouched while the Workers compatibility work is validated. The `cf:smoke` command starts the built Worker in the local workerd runtime and checks the admin login page, Edge middleware security headers, admin-page redirects, and unauthenticated admin API rejection.

### Required Worker configuration

The committed `wrangler.jsonc` enables `nodejs_compat`, points Wrangler at the OpenNext Worker entry point, and serves the generated static assets. Do not replace the existing `next` build or `start` scripts; Vercel continues using them.

Set these as Cloudflare Worker **secrets** (not committed to Git):

- `TURSO_AUTH_TOKEN`.
- `ADMIN_AUTH_SECRET` and `CUSTOMER_AUTH_SECRET`.
- `ADMIN_UTHY_PASSWORD`, `ADMIN_ALOMZIEE_PASSWORD`, and `ADMIN_SUPERADMIN_PASSWORD` for the three admin login roles.
- `PAYSTACK_SECRET_KEY` and `SHIPBUBBLE_API_KEY`.
- `RESEND_API_KEY` if transactional email delivery is required.
- `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` for image uploads.

Set these as Worker **variables**:

- `TURSO_DATABASE_URL`: the existing production Turso URL. Do not create a second database just for Cloudflare unless intentionally migrating.
- `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, and `R2_PUBLIC_URL` for the existing S3-compatible R2 upload route.
- `RESEND_FROM_EMAIL`, and optional `RESEND_REPLY_TO` / `SUPPORT_EMAIL` if email is enabled.
- `SHIPBUBBLE_MOCK_MODE=false`; optionally set `SHIPBUBBLE_CATEGORY_ID` if using a non-default courier category.
- `GEOAPIFY_API_KEY` and/or `LOKATE_API_KEY` if address autocomplete should be enabled.

Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to the Cloudflare production hostname in the environment that runs `npm run cf:build`. Next.js embeds `NEXT_PUBLIC_*` values into the build, so setting them only as runtime dashboard variables will not update the already-built client bundle.

Set `DATABASE_URL=file:./prisma/dev.db` for Prisma's SQLite schema/generation configuration. Runtime production queries must use `TURSO_DATABASE_URL`; never point production at the local SQLite file. Keep `SHIPBUBBLE_MOCK_MODE` disabled in production.

### Before the first production deployment

1. Run `npm run cf:preview` and exercise the storefront, login, admin APIs, product CRUD, image upload, checkout, Paystack verification/webhook, PDF receipt generation, Resend email, Shipbubble rates, and waybill flow in the Workers runtime.
2. Verify Turso reads and writes against a staging database first. The existing Vercel production database is not to be reset or re-initialized.
3. Configure Cloudflare secrets and verify the Worker preview. Only then run `npm run cf:deploy`.
4. Configure the custom domain and Paystack webhook URL for the Cloudflare hostname only after the deployed Worker passes the end-to-end checks.

**Important:** a successful Next.js/Vercel build is not proof of Workers runtime compatibility. The S3-compatible upload client, Prisma/libSQL adapter, and PDF generation path still require runtime validation under Workers. Do not switch production traffic or disable the Vercel deployment until those checks pass.
