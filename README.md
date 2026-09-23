# FlairMantra

Full-stack fashion commerce platform built with React, Node.js, Express and Postgres (Neon).

## Run locally

1. `npm install`
2. `npm run install:all`
3. Copy `server/.env.example` to `server/.env`
4. Set `DATABASE_URL` (a Neon connection string) and `ADMIN_PASSWORD` in `server/.env`
5. `npm run dev`

Storefront: http://localhost:5180  
Admin: http://localhost:5180/admin  
Admin sign-in: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the server environment

The client port is fixed to 5180. `scripts/FlairMantra-AutoStart.vbs` can be
placed in the Windows Startup folder to launch the local website automatically
after sign-in.
