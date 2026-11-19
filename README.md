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
