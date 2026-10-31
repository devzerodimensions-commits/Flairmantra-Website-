# Deploying FlairMantra (flairmantra.com, Zero Dimensions server 157.66.191.36)

The site is one Node.js app: `server/` serves the API and the built storefront in `client/dist`.

## 1. Get the code

Use the `main` branch of this repository (git pull, or download the ZIP and replace the old folder).

## 2. Environment variables

Create `server/.env` (never commit it) with:

```
NODE_ENV=production
PORT=5000                       # whatever port nginx / the proxy forwards to
SITE_URL=https://flairmantra.com

# Database — Postgres (the app no longer uses MongoDB / MONGODB_URI)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

# Admin panel sign-in (/admin). Change the password to reset it; restart afterwards.
ADMIN_EMAIL=admin@flairmantra.com
ADMIN_PASSWORD=choose-a-strong-password
JWT_SECRET=any-long-random-string-of-40-plus-characters

# Card payments (Stripe). Leave empty to offer Cash on Delivery only.
STRIPE_SECRET_KEY=sk_live_...
# Optional: Stripe → Developers → Webhooks → endpoint https://flairmantra.com/api/stripe/webhook
STRIPE_WEBHOOK_SECRET=whsec_...
```

`DATABASE_URL` can be a free Neon database (neon.tech → project → Connect) or a Postgres
installed on the server (`sudo apt install postgresql`, then create a database and user).
Tables are created automatically on first start.

## 3. Build and start

```bash
npm run install:all        # installs client and server packages
npm run build              # builds the storefront into client/dist
npm start                  # starts server/src/index.js
```

Keep it running with pm2 (or the existing process manager):

```bash
pm2 restart flairmantra || pm2 start server/src/index.js --name flairmantra --cwd .
pm2 save
```

## 4. Check

- `https://flairmantra.com/api/health` → `{"ok":true,"database":true}`
- `https://flairmantra.com/api/store` → includes `"payments":{"card":true}` when Stripe is set
- `/admin` → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` (the old `Flair@123` no longer works)

The first admin sign-in from the owner's usual browser copies the products and settings already
saved in that browser into the database.
