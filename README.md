# Overview Teams

A web app for tracking project work: teams, issues, projects and progress.

## Folders

- `client` is the website people use (React and Vite).
- `server` is the backend (Node.js, Express and Prisma on Neon Postgres).

## First-time setup

You need Node.js 22.18 or newer.

1. In `server`, copy `.env.example` to `.env` and `.env.test.example` to `.env.test`, and fill in the Neon connection details and the Neon Auth URL. `.env` uses the `pm_app` database and `.env.test` uses `pm_app_test`.
2. In `server`, run `npm install`, then `npm run db:migrate`, `npm run db:seed` and `npm run test:db:setup`.
3. In `client`, copy `.env.example` to `.env`, fill in the same Neon Auth URL, then run `npm install`.

## Accounts and admins

- Anyone can create an account on the sign-in page. A new account is a Member and is in no teams.
- To make someone an admin, they sign in once, then you run this in `server`: `npm run make-admin -- their@email.com`.
- Login, password reset and blocking repeated wrong passwords are handled by Neon Auth.

## Cycles, views and inbox

- Cycles: an admin turns them on per team in Settings → Teams (1 or 2 weeks, plus a start date). The app keeps the current and next cycle ready, and unfinished issues move to the current cycle when theirs ends. Dates follow UTC.
- Views: anyone can save the filters on a team's issues with Save view, or start one on the Views page. Views are private to the person who saved them.
- Inbox: you get a notification when someone else assigns an issue to you. The sidebar shows how many are unread.

## Run the app

Open two terminals.

1. In `server`, run `npm run dev`. The server starts on http://localhost:4000.
2. In `client`, run `npm run dev`, then open http://localhost:5173.

## Put it online

- Website (Vercel or Netlify): set the project folder to `client`, the build command to `npm run build` and the output folder to `dist`. Add two environment variables: `VITE_NEON_AUTH_URL` (the Neon Auth URL) and `VITE_API_URL` (the server's address). Redeploy after changing them, because they are built into the site. `client/vercel.json` and `client/public/_redirects` make every page address open the app.
- Server (Vercel, free): create a second Vercel project from this repository with the project folder set to `server`; `server/api/index.js` and `server/vercel.json` run the Express app as a Vercel function. Add `DATABASE_URL`, `DIRECT_URL`, `NEON_AUTH_URL` and `CLIENT_ORIGIN` (every website address that may call the server, separated by commas).
- Neon Auth: every website address must be in the allowed domains (`neon neon-auth domain add https://your-site`).

## Database commands (in `server`)

- `npm run db:migrate` after changing `prisma/schema.prisma`.
- `npm run db:seed` adds sample data to an empty database.
- `npm run db:reset` wipes the database and rebuilds the tables. Run `npm run db:seed` after it.

## Checks

- In `server`: `npm test` and `npm run lint`. Tests run on the `pm_app_test` database only.
- In `client`: `npm run build` and `npm run lint`.

## Keyboard shortcuts

- `C` creates an issue.
- `Ctrl K` opens the command menu.
- `Escape` closes panels, menus and dialogs.
- Arrow keys move through issue lists.
