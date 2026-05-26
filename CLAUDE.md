# SubRFQ — Claude Code Context

## What This Product Is

A single-sided productivity tool for specialty trade subcontractors in BC (Lower Mainland) who need to hire other subcontractors for work outside their own trade. A painting sub needs scaffolding. An electrician needs a boom lift. Currently they spend 3-5 hours googling, calling, emailing job info as PDFs, chasing quotes, comparing in spreadsheets. This product collapses that to 30 minutes.

**The core flow:** Describe the job → AI generates clean RFP → send to recipients → suppliers reply via public form (no account needed) → compare normalized quotes → award → agreement generated.

This is NOT a marketplace. Suppliers do not sign up to be discovered. They receive an email and fill out a public form. The directory layer comes later.

Full PRD is in `PRD.md` at the root of this repo. Read it before building any feature. The PRD is the source of truth for product decisions. This file is the source of truth for technical decisions.

-----

## Tech Stack

```
Framework:    Next.js 15 (App Router, TypeScript strict)
Database:     Supabase (PostgreSQL + Auth + Storage + Realtime + RLS)
Styling:      Tailwind CSS + shadcn/ui
AI:           Anthropic API (claude-sonnet-4-20250514)
Email:        Resend + react-email templates
PDF:          @react-pdf/renderer
Billing:      Stripe (Checkout + Billing Portal + Webhooks)
Deployment:   Vercel
```

**Package manager:** pnpm

**Node version:** 20+

-----

## Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm type-check       # tsc --noEmit (run this before declaring any feature done)
pnpm lint             # ESLint
pnpm db:types         # Generate Supabase TypeScript types -> types/database.ts

# Supabase local dev
supabase start        # Start local Supabase
supabase db push      # Push migrations to remote
supabase migration new [name]   # Create new migration
supabase gen types typescript --local > types/database.ts
```

-----

## Project Structure

```
/app
  /(auth)                        # Auth routes, no dashboard layout
    /login/page.tsx
    /signup/page.tsx
    /onboarding/page.tsx
  /(dashboard)                   # Protected routes, uses dashboard layout
    /layout.tsx                  # Auth guard + sidebar/nav
    /dashboard/page.tsx
    /jobs/
      /new/
        /page.tsx                # Step 1: Describe
      /[id]/
        /page.tsx                # Job detail (quote tracking)
        /review/page.tsx         # Step 2: Review RFP
        /recipients/page.tsx     # Step 3: Select recipients
        /sent/page.tsx           # Confirmation
        /compare/page.tsx        # Side-by-side quote comparison
    /address-book/page.tsx
    /settings/page.tsx
    /billing/page.tsx
  /reply/
    /[token]/page.tsx            # PUBLIC - supplier quote submission, NO AUTH
  /api/
    /webhooks/
      /stripe/route.ts           # Stripe webhook handler
      /resend/route.ts           # Resend webhook (bounces, delivery)
    /jobs/
      /[id]/generate/route.ts    # AI RFP generation (long-running, needs streaming)
    /reply/
      /[token]/route.ts          # Alternative: handle public form POST here

/actions                         # ALL Server Actions live here
  /jobs.ts                       # createJob, updateJob, sendRFQs, awardJob
  /address-book.ts               # createContact, updateContact, deleteContact
  /auth.ts                       # signUp, signIn, signOut, updateProfile
  /billing.ts                    # createCheckoutSession, createPortalSession
  /ai.ts                         # generateRFP (wraps Anthropic API)
  /email.ts                      # sendRFQEmail, sendAwardEmail, sendDeclineEmail

/components
  /ui/                           # shadcn/ui components (do not edit directly)
  /forms/                        # Form components using react-hook-form + zod
  /layouts/                      # Layout components (DashboardLayout, AuthLayout)
  /jobs/                         # Job-specific components (JobCard, QuoteCard, etc.)
  /pdf/                          # @react-pdf/renderer components (RFP PDF template)
  /email/                        # react-email templates

/lib
  /supabase/
    /server.ts                   # createServerClient (for Server Components + Actions)
    /browser.ts                  # createBrowserClient (for Client Components ONLY)
    /middleware.ts               # createMiddlewareClient
  /ai/
    /client.ts                   # Anthropic client singleton
    /generate-rfp.ts             # RFP generation function + prompt
    /extract-files.ts            # File content extraction (PDF, images)
  /email/
    /resend.ts                   # Resend client + send helpers
  /pdf/
    /generate-rfp-pdf.ts         # PDF buffer generation from RFPData
  /stripe/
    /client.ts                   # Stripe client singleton
  /utils/
    /tokens.ts                   # Reply token generation/validation
    /dates.ts                    # Date formatting helpers
    /currency.ts                 # CAD currency formatting

/types
  /database.ts                   # Supabase generated types (auto-generated, do not edit)
  /app.ts                        # App-level types (RFPData, etc.)

/supabase
  /migrations/                   # SQL migration files
  /seed.sql                      # Dev seed data

CLAUDE.md                        # This file
PRD.md                           # Full product requirements
.env.local                       # Local env vars (never commit)
.env.example                     # Template for env vars (commit this)
middleware.ts                    # Next.js middleware (auth guard)
```

-----

## Supabase Rules — Read Carefully

These are the most common source of bugs. Follow them exactly.

### Rule 1: Always use the right client for the context

```typescript
// SERVER COMPONENT, SERVER ACTION, ROUTE HANDLER → use server client
import { createServerClient } from '@/lib/supabase/server'
const supabase = await createServerClient()

// CLIENT COMPONENT → use browser client
import { createBrowserClient } from '@/lib/supabase/browser'
const supabase = createBrowserClient()

// MIDDLEWARE → use middleware client
import { createMiddlewareClient } from '@/lib/supabase/middleware'
```

Never import the server client in a client component. Never import the browser client in a server action. The ESLint rule enforces this — if you see a lint error about this, do not suppress it, fix it.

### Rule 2: RLS is always on

Every table has Row Level Security enabled. Write policies before testing queries. If a query returns empty unexpectedly, check RLS first. The pattern for user-owned data:

```sql
CREATE POLICY "users_own_[table]" ON [table]
  FOR ALL USING (auth.uid() = user_id);
```

### Rule 3: Public writes go through security definer RPCs

The supplier reply page is fully public (no auth). It writes to the `quotes` table. This MUST go through a `security definer` function, never a direct table write. See `supabase/migrations/` for the `submit_quote_response` function.

```typescript
// CORRECT - public form submission
const { data, error } = await supabase.rpc('submit_quote_response', {
  p_reply_token: token,
  p_total_price: formData.price,
  // ...
})

// WRONG - never do this from a public page
const { error } = await supabase.from('quotes').update({ ... })
```

### Rule 4: Never use service role key in client code

`SUPABASE_SERVICE_ROLE_KEY` is only used in: Stripe webhook handler, seed scripts, admin functions. Never in Server Actions that run on behalf of a user. Use the server client (which respects RLS) instead.

### Rule 5: Use typed Supabase client everywhere

Run `pnpm db:types` after any migration. Use the generated types:

```typescript
import type { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'
const supabase = createClient<Database>(url, key)

// Now all queries are typed:
const { data } = await supabase.from('jobs').select('*')
// data is Database['public']['Tables']['jobs']['Row'][]
```

-----

## TypeScript Rules

Strict mode is on. These rules are non-negotiable:

```typescript
// tsconfig.json has:
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}
```

**Never use `any`.** If you don’t know the type, use `unknown` and narrow it. If a library type forces `any`, wrap it in a typed function.

**Prefer type over interface** for object shapes. Use interface only when you need declaration merging (rare).

**All Server Actions return `ActionResult<T>`:**

```typescript
// types/app.ts
export type ActionResult<T = void> = 
  | { data: T; error: null }
  | { data: null; error: string }

// Every action:
export async function createJob(input: CreateJobInput): Promise<ActionResult<Job>> {
  try {
    // ...
    return { data: job, error: null }
  } catch (err) {
    return { data: null, error: 'Failed to create job' }
  }
}
```

Never throw from a Server Action. Return the error.

-----

## Server Actions vs Route Handlers

**Use Server Actions for:**

- All database mutations (create, update, delete)
- Anything that requires user authentication
- Stripe checkout + portal session creation
- Email sending triggered by user action

**Use Route Handlers for:**

- Stripe webhook (`/api/webhooks/stripe`) — must be raw body
- Resend webhook (`/api/webhooks/resend`) — must be raw body
- AI generation if you need streaming response (`/api/jobs/[id]/generate`)
- Public reply form submission if Server Action can’t handle unauthenticated POST

-----

## Auth Pattern

Middleware protects all `/(dashboard)` routes. The `/reply/[token]` route is explicitly excluded.

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|reply|api/webhooks).*)',
  ],
}
```

In Server Actions, always get the current user first:

```typescript
export async function someAction() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { data: null, error: 'Unauthorized' }
  }
  
  // Proceed with user.id
}
```

Never trust `user.id` from the client. Always get it server-side.

-----

## AI Integration

All Anthropic API calls happen in `/lib/ai/` and `/actions/ai.ts`. Never in client components. Never expose `ANTHROPIC_API_KEY` to the browser.

```typescript
// lib/ai/client.ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// lib/ai/generate-rfp.ts
export async function generateRFP(input: RFPInput): Promise<RFPData | null> {
  try {
    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: RFP_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(input) }],
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 20000)
      )
    ])
    
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return validateRFPData(JSON.parse(text))
  } catch {
    return null  // Caller handles null with blank form fallback
  }
}
```

The AI prompt lives in `/lib/ai/generate-rfp.ts` as `RFP_SYSTEM_PROMPT`. Do not inline prompts in actions or components.

-----

## Email Pattern

All emails use react-email templates in `/components/email/`. Send via Resend in server actions.

```typescript
// lib/email/resend.ts
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY)

// Usage in action:
import { RFQEmail } from '@/components/email/rfq-email'
import { render } from '@react-email/render'

await resend.emails.send({
  from: 'SubRFQ <rfq@subrfq.com>',
  replyTo: user.email,
  to: recipient.email,
  subject: rfpData.email_subject,
  html: await render(<RFQEmail rfpData={rfpData} replyUrl={replyUrl} />),
  attachments: [{
    filename: `RFQ_${job.id}.pdf`,
    content: pdfBuffer,
  }]
})
```

Emails are fire-and-forget — do not await them in the critical path. Use `void resend.emails.send(...)` or queue via Supabase Edge Function for retry logic.

-----

## PDF Generation

PDFs are generated server-side only using `@react-pdf/renderer`. The React component lives in `/components/pdf/rfp-document.tsx`.

```typescript
// lib/pdf/generate-rfp-pdf.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { RFPDocument } from '@/components/pdf/rfp-document'

export async function generateRFPPdf(rfpData: RFPData, job: Job): Promise<Buffer> {
  return renderToBuffer(<RFPDocument rfpData={rfpData} job={job} />)
}
```

Store generated PDFs in Supabase Storage under `rfp-pdfs/{job_id}/rfp.pdf`. Get a signed URL for download (do not use public buckets for user documents).

-----

## File Upload Pattern

User uploads go to Supabase Storage. Temp uploads (before job is saved) go to `job-files/temp/{user_id}/{filename}`. On job save, move to `job-files/{job_id}/{filename}`.

```typescript
// Client component (file upload)
const supabase = createBrowserClient()
const { data, error } = await supabase.storage
  .from('job-files')
  .upload(`temp/${userId}/${file.name}`, file)

// Server action (after job created, move temp files)
await supabase.storage
  .from('job-files')
  .move(`temp/${userId}/${filename}`, `${jobId}/${filename}`)
```

Max file size: 25MB. Accepted types: PDF, PNG, JPG. Enforce on client (input accept) AND server (mime type check before upload).

-----

## Reply Token Pattern

Each `quotes` row gets a unique `reply_token` (UUID) when created. This is the only authentication mechanism for the supplier reply page.

```typescript
// lib/utils/tokens.ts
import { randomUUID } from 'crypto'

export function generateReplyToken(): string {
  return randomUUID()
}

// Token expiry: quote_deadline + 48 hours
export function getTokenExpiry(quoteDeadline: Date): Date {
  return new Date(quoteDeadline.getTime() + 48 * 60 * 60 * 1000)
}
```

The reply page (`/reply/[token]`) validates the token against `quotes.reply_token`, checks `reply_token_expires_at > NOW()`, and checks `status = 'pending'` before rendering the form.

-----

## Realtime Pattern

Job Detail page subscribes to quote status changes so the sub sees replies without refreshing.

```typescript
// Client component on /jobs/[id]
useEffect(() => {
  const supabase = createBrowserClient()
  const channel = supabase
    .channel(`job-${jobId}-quotes`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'quotes',
      filter: `job_id=eq.${jobId}`,
    }, (payload) => {
      // Update UI with new quote status
      setQuotes(prev => prev.map(q => q.id === payload.new.id ? payload.new : q))
      // Show toast if status changed to 'replied'
      if (payload.new.status === 'replied' && payload.old.status === 'pending') {
        toast(`${payload.new.supplier_name} just submitted their quote`)
      }
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [jobId])
```

-----

## Stripe Pattern

```typescript
// actions/billing.ts
export async function createCheckoutSession(): Promise<ActionResult<{ url: string }>> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const session = await stripe.checkout.sessions.create({
    customer: profile?.stripe_customer_id ?? undefined,
    customer_creation: profile?.stripe_customer_id ? undefined : 'always',
    mode: 'subscription',
    payment_method_types: ['card'],
    currency: 'cad',                    // Always CAD
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/billing?success=true`,
    cancel_url: `${APP_URL}/billing`,
    metadata: { user_id: user.id },
  })

  return { data: { url: session.url! }, error: null }
}
```

Webhook handler at `/api/webhooks/stripe/route.ts` updates `users.subscription_status` on these events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

-----

## Environment Variables

```bash
# .env.example — commit this
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # NEVER expose to client
ANTHROPIC_API_KEY=                   # NEVER expose to client
RESEND_API_KEY=                      # NEVER expose to client
STRIPE_SECRET_KEY=                   # NEVER expose to client
STRIPE_WEBHOOK_SECRET=               # NEVER expose to client
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=  # Safe for client
NEXT_PUBLIC_APP_URL=                 # e.g. http://localhost:3000
```

Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. All others are server-only. Never put secret keys in `NEXT_PUBLIC_` variables. If you see a secret in a client component, that is a critical bug.

-----

## Component Rules

**Server Component by default.** Add `'use client'` only when you need:

- `useState` / `useEffect` / other React hooks
- Browser APIs
- Event handlers that can’t be Server Actions
- Supabase Realtime subscriptions

**Forms:** Use `react-hook-form` + `zod` for all forms. Schema in `/lib/schemas/`. Validate on client AND in the Server Action.

```typescript
// lib/schemas/job.ts
import { z } from 'zod'

export const createJobSchema = z.object({
  trade_needed: z.string().min(1, 'Required'),
  project_address: z.string().min(5, 'Enter a valid address'),
  quote_deadline: z.date().min(new Date(), 'Deadline must be in the future'),
  raw_description: z.string().min(20, 'Please describe the work in more detail'),
  gc_name: z.string().optional(),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
})

export type CreateJobInput = z.infer<typeof createJobSchema>
```

**shadcn/ui:** Add components via `pnpm dlx shadcn@latest add [component]`. Do not manually edit files in `/components/ui/`.

-----

## Billing Gate

Users on expired trial or cancelled subscription cannot create new jobs. Check in the `createJob` action and show upgrade prompt in the UI.

```typescript
// In any mutation action that is gated:
const { data: profile } = await supabase
  .from('users')
  .select('subscription_status, trial_ends_at, subscription_tier')
  .eq('id', user.id)
  .single()

const isActive = 
  profile.subscription_status === 'active' || 
  (profile.subscription_status === 'trial' && new Date(profile.trial_ends_at) > new Date())

if (!isActive) {
  return { data: null, error: 'SUBSCRIPTION_REQUIRED' }
}
```

The client checks for `error === 'SUBSCRIPTION_REQUIRED'` and shows the upgrade modal instead of a generic error.

-----

## What NOT To Do

**Never:**

- Use `any` in TypeScript
- Write direct SQL in app code (SQL goes in migrations only)
- Use the service role key in Server Actions
- Make Anthropic API calls from client components
- Mix server and browser Supabase clients
- Throw from Server Actions (return `{ data: null, error: string }`)
- Put secret env vars in `NEXT_PUBLIC_` variables
- Allow the `/reply/[token]` route to require authentication
- Use `useEffect` to fetch data that could be fetched in a Server Component
- Make the supplier reply page write to Supabase tables directly (must use RPC)

**Always:**

- Run `pnpm type-check` before marking a feature complete
- Add a new migration file for every schema change (never edit existing migrations)
- Validate user input with zod on both client and server
- Handle the `null` return from `generateRFP` with the blank form fallback
- Ensure every email has a plain text fallback (react-email handles this)
- Check subscription status before gated mutations

-----

## Key Business Logic (Do Not Get Wrong)

1. **Reply token expiry:** `quote_deadline + 48 hours`. Supplier can still submit after the buyer’s deadline — the 48h buffer handles timezones and last-minute replies. Buyer sees “overdue” but supplier can still submit. After token expires, the form shows “link expired.”
1. **Award flow:** Awarding a job sets: winning `quote.status = 'awarded'`, all other replied quotes `status = 'declined_by_buyer'`, `job.status = 'awarded'`, `job.awarded_quote_id`. Pending quotes that haven’t replied get `status = 'declined_by_buyer'` too. Send emails to ALL of them.
1. **Address book auto-save:** When a user adds a new recipient in Step 3 (not from address book), auto-save them to `address_book` for future use. Update `last_used_at` and increment `times_used` when a contact is selected for an RFQ.
1. **AI fallback:** If `generateRFP` returns `null`, show the RFP review step with an empty editable form and the message: “We couldn’t generate this automatically — fill in the details below and we’ll send it for you.” The send flow works the same either way.
1. **PDF attachment:** The RFP PDF is generated when the user completes Step 2 (review). It’s stored in Supabase Storage and attached to all outgoing RFQ emails. It is the same PDF for all recipients — no per-recipient customization.
1. **CAD currency everywhere:** All prices in the app are in Canadian dollars. Stripe is configured with `currency: 'cad'`. Display formatting: `$1,234.56 CAD` or `$1,234.56` (context-dependent). Never show USD amounts.

-----

## Build Order

Follow this exactly. Do not skip ahead.

```
Phase 1: Foundation
  □ Supabase project (tables, RLS, RPC functions from PRD Section 3)
  □ Next.js project with TypeScript strict, Tailwind, shadcn/ui
  □ Supabase auth flow (sign up, sign in, onboarding)
  □ Middleware (protect dashboard routes, exclude /reply)
  □ Dashboard shell (empty state)
  □ Generate Supabase types

Phase 2: Job Creation
  □ Step 1: Describe (form + file upload)
  □ AI service (generateRFP function + prompt)
  □ Step 2: Review (editable preview + PDF preview)
  □ PDF generation (@react-pdf/renderer)
  □ Step 3: Recipients (address book + add new)

Phase 3: Send + Track
  □ Quote creation + reply token generation
  □ RFQ email (react-email template + Resend + PDF attachment)
  □ Supplier reply page (/reply/[token], fully public)
  □ Public form submission (via submit_quote_response RPC)
  □ Job detail page + Realtime subscription

Phase 4: Compare + Award
  □ Comparison view (side-by-side table)
  □ Award modal + downstream status updates
  □ Award + decline emails

Phase 5: Billing + Polish
  □ Stripe checkout + billing portal
  □ Stripe webhook handler
  □ Trial enforcement in gated actions
  □ Error states, loading states
  □ Mobile responsive pass
  □ End-to-end test: create account → send RFQ → supplier replies → award
  □ Deploy to Vercel + configure Supabase prod
```

Do not start Phase 2 until Phase 1 is fully working including auth.
Do not start Phase 3 until AI generation produces valid RFPData end-to-end.
Do not start Phase 5 until a complete RFQ round-trip works with a real email.
