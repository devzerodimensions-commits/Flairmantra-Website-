# FlairMantra

Full-stack fashion commerce platform built with React, Node.js, Express and MongoDB.

## Run locally

1. `npm install`
2. `npm run install:all`
3. Copy `server/.env.example` to `server/.env`
4. Start MongoDB locally or set `MONGODB_URI`
5. `npm run dev`

Storefront: http://localhost:5180  
Admin: http://localhost:5180/admin  
Demo admin: `admin@flairmantra.in` / `Flair@123`

The client port is fixed to 5180. `scripts/FlairMantra-AutoStart.vbs` can be
placed in the Windows Startup folder to launch the local website automatically
after sign-in.
