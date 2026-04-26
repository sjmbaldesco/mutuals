# Mutuals

Mutuals is a two-user shared availability and financial feasibility web application. It allows you and a friend/partner to securely manage your schedules and personal budgets to quickly determine if proposed events (like dinners, trips, or concerts) fit your mutual free time and individual budgets.

## Features
- **Account Pairing:** Securely link accounts with a single friend using email lookups.
- **Shared Calendar:** Discover overlapping free time in a mobile-optimized weekly view.
- **Private Budget Ledger:** Track personal income and expenses. Your financial data is strictly protected by Row-Level Security and is never revealed to your friend.
- **Event Proposals:** Propose activities with estimated costs. The engine computes personal feasibility independently, displaying a private "Affordable" or "Out of budget" verdict.

## Local Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/sjmbaldesco/mutuals.git
   cd mutuals
   npm install
   ```

2. **Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   *Note: Never commit this file. It is safely ignored in `.gitignore`.*

3. **Supabase Schema Setup:**
   Run the contents of `supabase/schema.sql` in your Supabase SQL Editor. This will set up the necessary tables (`users`, `availability`, `budget_entries`, `proposed_events`) and apply strictly scoped Row-Level Security (RLS) policies to protect personal financial data.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the application.

## Deployment Notes
- This project is configured to run smoothly on Vercel using the Next.js App Router.
- Ensure you add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Vercel Environment Variables before deploying.
- The root URL `/` automatically redirects to `/login` to enforce the authentication flow.
