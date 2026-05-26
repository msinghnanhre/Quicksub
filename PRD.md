# SubRFQ — Product Requirements Document

## Versioned Build Plan for Claude Code

**Document purpose:** Full product specification to be used as Claude Code build context. Every section is written with sufficient depth for implementation, not just design intent. Where a decision is genuinely open, it is flagged as [DECISION NEEDED].

-----

## 1. Product Context

### 1.1 What This Is

A **single-sided productivity tool** for specialty trade subcontractors in British Columbia (initial market: Lower Mainland) who need to hire other subcontractors for work outside their own trade. The product compresses a 3–5 hour manual workflow (Google, cold call, email PDFs, chase for quotes, compare in spreadsheets, confirm by text) into a 30-minute structured workflow.

This is NOT a marketplace. Suppliers do not sign up to be discovered. Buyers (subs) bring their own recipient list. The directory and discovery layer is a V3 addition after the buyer-side product has proven value.

### 1.2 The Exact Pain Being Solved

When a specialty sub (e.g., painting contractor) needs to hire another sub (e.g., scaffolding, swing stage, boom lift, cleanup, demolition, concrete cutting), their current workflow is:

|Step                    |Current State                                                                  |Time Wasted                         |
|------------------------|-------------------------------------------------------------------------------|------------------------------------|
|1. Scope the need       |Re-read drawings, determine specs manually                                     |15–30 min                           |
|2. Find candidates      |Google, scroll websites, Facebook groups, ask colleagues                       |30–60 min                           |
|3. Write & send outreach|Call each, leave voicemail, email job info as PDF to each separately           |45–90 min                           |
|4. Collect quotes       |Chase laggards, parse replies in different formats                             |30–60 min                           |
|5. Compare quotes       |Try to normalize hourly vs. fixed, delivery included/excluded, insurance status|30–60 min                           |
|6. Contract + COI       |Confirm in writing, request COI, send agreement via text or email              |30–60 min                           |
|**Total**               |                                                                               |**3–5 hours, over 2–7 elapsed days**|

The product’s job is to collapse this to:

- Describe the job once (5 min)
- Review AI-generated RFP and send to selected recipients (5 min)
- Review normalized quotes when they arrive (5 min)
- Click award, auto-generate agreement (5 min)
- **~30 minutes of active effort, 24–48 hours elapsed**

### 1.3 Primary Buyer Persona

**Name:** The Lower Mainland Specialty Sub

**Trade examples:** Painting, roofing, drywall, electrical, plumbing, HVAC, glazing, flooring, insulation, fire protection, mechanical

**Company size:** 5–30 employees (revenue $500K–$5M/yr)

**Role:** Owner, estimator, or project manager who also handles procurement

**Current tools:** Email (Gmail most common), phone, Excel for quoting, QuickBooks for invoicing, maybe Jobber or Tradify for scheduling. Does NOT use Procore or BuildingConnected — too expensive, built for GCs.

**Frequency of pain:** Sub-subbing happens 2–8 times per month for an active shop. Each instance triggers the 3–5 hour workflow.

**Willingness to pay:** $79–129/month if the product demonstrably saves 3+ hours per instance. They are cost-sensitive but not irrational — a $99/mo tool that saves 4 hours at $150/hr labour equivalent ($600/mo) is an obvious buy.

**Geography:** Lower Mainland BC initially (Vancouver, Burnaby, Surrey, Richmond, Coquitlam, North Vancouver, Delta, Langley, New Westminster). Large Punjabi-Canadian construction community in Surrey — bilingual support is a V3 moat.

**Distribution channel:**

- VRCA (Vancouver Regional Construction Association) — 1,000 members, 20+ events/year
- BC trade associations (Painting Contractors, Roofing Contractors, Mechanical Contractors)
- Word of mouth from design partners

### 1.4 Secondary Persona (V3 and beyond)

**The Supplier Sub** — the scaffolding company, lift rental, cleanup crew, concrete cutter that receives the RFQ. In V1-V2, they are NOT a paying user. They receive an email and fill out a public reply form with no account required. In V3, we offer them a paid verified-listing subscription.

### 1.5 Hard Non-Goals (across all versions unless explicitly revisited)

These are not scope creep risks — they are active redirects from which Claude Code should never drift:

- ❌ Not a GC-to-sub bidding platform (there are 10 of those already)
- ❌ Not a project management tool (no Gantt, no drawings management, no RFIs, no submittals)
- ❌ No payments or escrow (money moves directly between parties as it does today)
- ❌ No two-sided marketplace with supplier discovery before V3
- ❌ No scheduling or dispatch for the awarded work
- ❌ No invoicing or accounts payable
- ❌ No consumer-side (B2C homeowner) features ever
- ❌ No national Canadian or US expansion logic in V1-V2 codebase (design for it, don’t ship it)

-----

## 2. Technology Stack

### 2.1 Core Stack

```
Frontend:     Next.js 15 (App Router), TypeScript, TailwindCSS
Backend:      Next.js API Routes (Route Handlers) + Server Actions
Database:     Supabase (PostgreSQL + Auth + Storage + RLS)
AI:           Anthropic API — claude-sonnet-4-20250514
Email:        Resend (transactional), with react-email for templates
File Storage: Supabase Storage (drawings, photos, COI documents)
PDF:          @react-pdf/renderer for RFP PDF generation
Billing:      Stripe (subscriptions)
```

### 2.2 V2 Additions

```
E-signature:  Dropbox Sign API (HelloSign) — [DECISION NEEDED: could also use DocuSeal self-hosted]
OCR:          Anthropic vision API for drawing/photo extraction (already in core stack)
WorkSafeBC:  Public clearance letter lookup (see Section 9 for integration spec)
```

### 2.3 V3 Additions

```
i18n:         next-intl (English + Punjabi)
Maps:         Mapbox or Google Maps Places API (supplier geographic radius)
```

### 2.4 Key Technical Principles for This Codebase

1. **Public pages have no auth requirement.** The supplier reply page is fully public — no Supabase session, no cookie required. It is accessed via a signed token in the URL.
1. **Every AI call is wrapped in a try/catch with a graceful fallback.** If AI fails, the user gets a blank editable form instead of an error page.
1. **Email is fire-and-forget at the API route level.** Queue outbound emails; don’t await them synchronously in the request lifecycle.
1. **No mutations on public pages.** The supplier reply form writes to a public-accessible RPC function that validates the token before writing. Never expose direct Supabase table access from public pages.
1. **RLS on every table.** Users can only see their own jobs, quotes, and address book entries. Supplier replies are associated with a quote row which is associated with a job owned by the buyer.

-----

## 3. Data Model

### 3.1 Core Entities

```sql
-- The buying user (specialty sub contractor)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  trade TEXT NOT NULL,                    -- e.g. "painting", "roofing", "electrical"
  phone TEXT,
  worksafebc_account TEXT,               -- their own WCB account number (optional, for profile)
  province TEXT DEFAULT 'BC',
  subscription_status TEXT DEFAULT 'trial', -- trial | active | cancelled | past_due
  subscription_tier TEXT DEFAULT 'starter', -- starter | pro (V2+)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- A job is one sub-hiring event. One RFQ sent to multiple recipients.
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- User-provided raw input
  raw_description TEXT,                   -- what the user typed/pasted
  trade_needed TEXT NOT NULL,             -- e.g. "scaffolding", "scissor lift rental"
  project_address TEXT NOT NULL,
  project_name TEXT,                      -- optional project name/number
  gc_name TEXT,                           -- general contractor on the prime contract
  start_date DATE,
  end_date DATE,
  quote_deadline TIMESTAMPTZ NOT NULL,    -- when quotes are due from suppliers
  
  -- AI-generated structured output (stored as JSONB, see Section 7.3)
  rfp_data JSONB,                         -- generated RFP content (see RFPData schema below)
  rfp_pdf_path TEXT,                      -- path in Supabase Storage
  rfp_generated_at TIMESTAMPTZ,
  
  -- Status
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft', 'rfp_ready', 'sent', 'quotes_received', 'awarded', 'cancelled')),
  
  -- Award
  awarded_quote_id UUID,                  -- FK set after award (self-referential, set after quotes table created)
  awarded_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded files attached to a job (drawings, photos, specs)
CREATE TABLE job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,                -- Supabase Storage path
  file_type TEXT NOT NULL,               -- 'drawing' | 'photo' | 'spec' | 'other'
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER,
  extracted_text TEXT,                   -- OCR/vision-extracted text from AI
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- The buyer's saved address book of suppliers
CREATE TABLE address_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  supplier_name TEXT NOT NULL,            -- company name
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  trade TEXT NOT NULL,                    -- what they do: "scaffolding", "cleanup", etc.
  notes TEXT,                             -- "reliable, need 2 weeks notice", etc.
  worksafebc_account TEXT,               -- their WCB account (V2: used for verification)
  worksafebc_status TEXT DEFAULT 'unknown', -- unknown | valid | expired | not_found (V2)
  worksafebc_checked_at TIMESTAMPTZ,     -- last time we checked their status (V2)
  last_used_at TIMESTAMPTZ,
  times_used INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2),               -- 0-5, populated from reviews in V3
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)
);

-- Each recipient the RFQ was sent to, and their response
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  
  -- Recipient info (copied from address book or entered ad-hoc)
  address_book_id UUID REFERENCES address_book(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_email TEXT NOT NULL,
  supplier_phone TEXT,
  contact_name TEXT,
  
  -- Reply tracking
  reply_token TEXT UNIQUE NOT NULL,       -- UUID-based token in public reply URL
  reply_token_expires_at TIMESTAMPTZ,     -- set to quote_deadline + 48h
  email_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,           -- tracked via pixel (optional, V2)
  nudge_1_sent_at TIMESTAMPTZ,           -- T+24h nudge (V2)
  nudge_2_sent_at TIMESTAMPTZ,           -- T+48h nudge (V2)
  
  -- Quote response (filled by supplier via public form)
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'replied', 'declined_by_supplier', 'shortlisted', 'awarded', 'declined_by_buyer')),
  
  -- Supplier-filled fields
  total_price NUMERIC(12,2),
  price_type TEXT CHECK (price_type IN ('fixed', 'hourly', 'daily', 'per_unit')),
  price_unit TEXT,                        -- e.g. "per day", "per sqft" if not fixed
  inclusions TEXT[],                      -- array of what is included
  exclusions TEXT[],                      -- array of what is NOT included
  timeline_start DATE,                    -- when they can start
  timeline_end DATE,                      -- when they'll be done
  quote_valid_until DATE,
  notes TEXT,                             -- free text from supplier
  
  -- Documents (V2)
  coi_file_path TEXT,                     -- Certificate of Insurance
  worksafebc_clearance_path TEXT,         -- WorkSafeBC clearance letter
  
  -- Timestamps
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-sub agreement generated after award (V2)
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  template_version TEXT DEFAULT 'BC_SUBCONTRACT_V1',
  agreement_data JSONB,                   -- all fields merged into template
  pdf_path TEXT,                          -- generated agreement PDF
  
  -- Signing status
  buyer_signature_status TEXT DEFAULT 'pending', -- pending | signed
  supplier_signature_status TEXT DEFAULT 'pending',
  buyer_signed_at TIMESTAMPTZ,
  supplier_signed_at TIMESTAMPTZ,
  
  -- Dropbox Sign (V2)
  dropbox_sign_request_id TEXT,
  dropbox_sign_status TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 JSONB Schema: `rfp_data`

This is what the AI returns and what is stored in `jobs.rfp_data`. Claude Code must validate this structure before storing.

```typescript
interface RFPData {
  job_summary: string;           // 2–3 sentence professional description
  trade_needed: string;          // normalized trade name
  scope_items: string[];         // bulleted scope of work
  site_details: {
    address: string;
    access_notes: string;        // parking, site access hours, gate codes if any
    site_conditions: string[];   // height, indoor/outdoor, hazards, special equipment
  };
  dates: {
    project_start: string;       // ISO date string
    project_end: string;
    quote_deadline: string;      // ISO datetime string
  };
  provided_by_requester: string[];  // what the buyer will provide on site
  required_from_supplier: string[]; // what the supplier must bring/do
  safety_requirements: string[];    // WorkSafeBC compliance, PPE, site-specific
  quote_requirements: string[];     // how to structure the quote (fixed/hourly, what to include, COI required)
  email_subject: string;            // pre-written email subject line
  email_body: string;               // full professional email body (markdown)
  gc_name: string | null;           // GC on the project if any
  notes_for_buyer: string[];        // things AI noticed that buyer should confirm
}
```

### 3.3 Status Flow

```
Job: draft → rfp_ready → sent → quotes_received → awarded | cancelled

Quote: pending → replied | declined_by_supplier
              ↓
         shortlisted → awarded | declined_by_buyer
```

### 3.4 Row Level Security

Every table requires RLS policies. The key rule: a user can only SELECT, INSERT, UPDATE, DELETE rows where `user_id = auth.uid()`.

Exception: `quotes` and `job_files` are accessible via `job_id`, which must be owned by the authenticated user. Use a security definer function for public quote submission.

```sql
-- Example RLS for jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_jobs" ON jobs
  FOR ALL USING (auth.uid() = user_id);

-- Public quote submission via RPC (security definer, validates token)
CREATE OR REPLACE FUNCTION submit_quote_response(
  p_reply_token TEXT,
  p_total_price NUMERIC,
  p_price_type TEXT,
  p_inclusions TEXT[],
  p_exclusions TEXT[],
  p_timeline_start DATE,
  p_timeline_end DATE,
  p_quote_valid_until DATE,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quote_id UUID;
  v_job_id UUID;
BEGIN
  -- Validate token exists, not expired, status is pending
  SELECT id, job_id INTO v_quote_id, v_job_id
  FROM quotes
  WHERE reply_token = p_reply_token
    AND reply_token_expires_at > NOW()
    AND status = 'pending';
    
  IF v_quote_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired token');
  END IF;
  
  -- Update quote
  UPDATE quotes SET
    status = 'replied',
    total_price = p_total_price,
    price_type = p_price_type,
    inclusions = p_inclusions,
    exclusions = p_exclusions,
    timeline_start = p_timeline_start,
    timeline_end = p_timeline_end,
    quote_valid_until = p_quote_valid_until,
    notes = p_notes,
    replied_at = NOW()
  WHERE id = v_quote_id;
  
  -- Update job status if first reply
  UPDATE jobs SET status = 'quotes_received'
  WHERE id = v_job_id AND status = 'sent';
  
  RETURN jsonb_build_object('success', true, 'quote_id', v_quote_id);
END;
$$;
```

-----

## 4. Version Roadmap Overview

|Version|Theme                                           |Target                                |Gate to next                        |
|-------|------------------------------------------------|--------------------------------------|------------------------------------|
|V1     |Core workflow: describe → send → compare → award|10 paying design partners             |10 customers using it for real RFQs |
|V2     |Trust + workflow polish                         |50 paying customers                   |NPS > 40, churn < 5%/mo             |
|V3     |Supplier directory + two-sided revenue          |200 customers + supplier subscriptions|Supplier-side ARR > 20% of total ARR|
|V4     |Team features + expansion                       |500+ customers                        |Raise or sustain profitability      |

-----

## 5. V1 — MVP / Launch

### 5.1 V1 Scope Statement

V1 delivers exactly one workflow end-to-end with no detours. A sub can: create an account → create a job → describe what they need → get an AI-generated RFP → select recipients from their address book or add new → send RFQs by email → view incoming quotes as they arrive → compare them side-by-side → award one → see a confirmation. That is the entire product. Nothing else ships in V1.

### 5.2 V1 User Flow — Happy Path

```
1. Sign up / log in (Supabase Auth, email+password, no OAuth required in V1)
2. Onboarding (company name, trade, phone) — one-time, 60 seconds
3. Dashboard — list of jobs (empty state on first visit)
4. "New RFQ" button → Job Creation Flow (3 steps)
   Step 1: Describe
     - Trade needed (dropdown + custom)
     - Project address
     - Dates (start, end, quote deadline)
     - Description text area
     - File upload (drawings, photos, specs) — optional
     - "Generate RFP" button
   Step 2: Review RFP (AI output)
     - Editable preview of generated email subject, body, scope items
     - Preview of PDF attachment
     - "Looks good" → proceed | "Edit" → manual edit mode
   Step 3: Select Recipients
     - Search/select from address book (by trade filter)
     - Add new recipient ad-hoc (name, email, trade) → auto-saves to address book
     - Min 1, max 10 recipients in V1
     - "Send RFQs" button
5. Confirmation screen — "X RFQs sent. Suppliers have until [deadline] to respond."
6. Job Detail page (polled or realtime via Supabase subscription)
   - Status bar
   - List of recipients with status (pending / replied / declined)
   - Click recipient → see their quote detail
7. When 2+ quotes received → "Compare Quotes" button enabled
8. Comparison View
   - Side-by-side table: price, type, inclusions, exclusions, timeline, notes
   - "Award" button on each column
9. Award Modal
   - "You're awarding this job to [Supplier]. This will decline all others."
   - Confirm → updates all quote statuses → sends acceptance email to winner, decline emails to others
10. Job marked as Awarded. Done.
```

### 5.3 Screen Specifications

-----

#### Screen 1: Sign Up / Log In

**Purpose:** Create an account or log in. V1 uses email + password only.

**Components:**

- Email input
- Password input (sign up: confirm password)
- “Sign Up” / “Log In” toggle
- Supabase Auth handles session management
- Redirect to `/onboarding` if `users` profile row does not exist after auth
- Redirect to `/dashboard` if profile exists

**Error states:**

- Invalid email format
- Password < 8 characters
- Email already registered (sign up)
- Wrong password (login)

**Notes:** No Google OAuth in V1 — adds complexity without meaningful conversion lift at this stage.

-----

#### Screen 2: Onboarding

**Purpose:** Collect the minimum profile data needed to personalize the experience. One screen, not a wizard.

**Route:** `/onboarding`

**Fields:**

```
Full Name            [text input]             Required
Company Name         [text input]             Required
Your Trade           [dropdown + "other"]     Required
  Options: Painting | Roofing | Drywall | Electrical | Plumbing | HVAC | Glazing | Flooring | Mechanical | Insulation | Other
Phone Number         [text input, tel]        Optional
```

**On Submit:**

- Upsert `users` row with profile data
- Redirect to `/dashboard`

**UX Notes:**

- No logo/brand marketing. Just a clean form.
- Label above each input. No placeholders as labels.
- Single CTA: “Get Started”

-----

#### Screen 3: Dashboard

**Purpose:** Overview of all jobs. Entry point to create a new RFQ.

**Route:** `/dashboard`

**Components:**

Top bar:

- “SubRFQ” logo (left)
- User avatar + company name (right)
- Subscription badge (Trial / Active)

Primary CTA:

- Large “New RFQ” button (top right, high contrast)

Jobs list:

```
Each job card shows:
- Trade needed (e.g., "Scaffolding")
- Project address (truncated)
- Status badge (Draft | Sent | X Quotes In | Awarded | Cancelled)
- Quote deadline (relative: "Due in 2 days" or "Overdue")
- # replies / # recipients (e.g., "2 of 4 replied")
- Click → Job Detail
```

Empty state (first-time user):

```
Illustration (simple, not stock photo)
"You haven't sent any RFQs yet."
"Start by describing what you need — we'll do the rest."
[New RFQ] button
```

Filter bar (V1 minimal):

- All | Active | Awarded | Draft

**Data:**

- `SELECT * FROM jobs WHERE user_id = auth.uid() ORDER BY created_at DESC`
- Include aggregate: `COUNT(quotes WHERE status = 'replied')` per job

-----

#### Screen 4: Job Creation — Step 1: Describe

**Purpose:** Capture the raw information needed to generate the RFP. Designed to be fast — a sub should be able to fill this in during the 3-minute coffee break.

**Route:** `/jobs/new` (Step 1 of 3, progress indicator shown)

**Fields:**

```
Trade Needed*        [searchable dropdown]
  Popular: Scaffolding | Swing Stage | Boom Lift / Scissor Lift | 
           Demo / Concrete Cutting | Site Cleanup | Crane / Hoisting | 
           Asbestos Abatement | Temp Power | Other (free text)

Project Name         [text input, optional]
  Placeholder: "Richmond Condo Exterior Repaint" or job number

Project Address*     [text input with Google Places or just free text in V1]

Your GC              [text input, optional]
  Label: "General Contractor on this job (if any)"
  Tooltip: "Some prime contracts require GC approval before you sub work out"

Start Date*          [date picker]
End Date             [date picker, optional but prompted]
Quote Deadline*      [datetime picker]
  Default suggestion: NOW() + 3 business days, shown as "[Day], [Date] at 5:00 PM"

Describe what you need*  [textarea, min 3 rows, auto-expands]
  Placeholder multi-line:
  "Describe the work in plain language. Include:
   - What you need (e.g. tube-and-clamp scaffold, 3 lifts of 10ft)
   - How high / how long / how wide
   - Site conditions (indoor, outdoor, tight access, etc.)
   - Anything the supplier needs to know"
  
  Helper text below: "Don't worry about being formal — our AI will clean it up."

Upload Files          [drag + drop, or click to upload]
  Label: "Drawings, photos, specs (optional but recommended)"
  Accepts: PDF, PNG, JPG, DWG (V2)
  Max: 10 files, 25MB each in V1
  Each file shows name, size, remove button
  On upload: store to Supabase Storage at jobs/{user_id}/temp/{filename}
```

**Primary CTA:** “Generate RFP →”

**On click:**

1. Validate required fields
1. Save job row with status = ‘draft’
1. Trigger AI generation (show loading state — spinner with copy: “Reading your description and building your RFP…”)
1. Navigate to Step 2 when AI returns

**Error states:**

- AI timeout (> 15s): show editable blank RFP form with message “Generation took too long — we’ve pre-filled what we can. Edit below.”
- Missing required fields: inline validation, don’t wait for submit

-----

#### Screen 5: Job Creation — Step 2: Review RFP

**Purpose:** Show the AI-generated RFP, let the user edit it before sending. This is where trust in the product is built — if the AI output looks professional and accurate, they’re hooked.

**Route:** `/jobs/[id]/review` (Step 2 of 3)

**Layout:** Two-column on desktop (email preview left, PDF preview right). Single column on mobile (tabs: Email | PDF).

**Left panel — Email Preview:**

```
Subject:    [editable text field, pre-filled by AI]
---
From:       [User's name] @ [Company name]
To:         [Recipients — shown after Step 3, greyed out here]

[Editable rich text area, pre-filled by AI email_body]

Attached:   RFQ_[ProjectName]_[Date].pdf
```

**Right panel — PDF Preview:**

```
Rendered preview of the generated PDF, showing:
- Header: Company name, job title, date
- Project details (address, dates, GC)
- Scope of Work (bulleted)
- What's Included (by requester)
- What's Required (from supplier)
- Site Details & Access
- Safety Requirements
- Quote Requirements
- Contact info + deadline

[Download Preview PDF] button
```

**Bottom action bar:**

- “← Back” (go back to Step 1, keep data)
- “Looks Good — Choose Recipients →” (proceed to Step 3)

**Edit mode:**

- Any field in the email body is directly editable (contenteditable div)
- Scope items are editable as a list (add/remove bullets)
- PDF preview updates in real-time (debounced 500ms) when email body changes
- “AI Notes” section — collapsible, shows `rfp_data.notes_for_buyer` (things AI flagged for review)

**Notes for implementation:**

- AI output must be parsed and validated against `RFPData` schema before rendering
- If `rfp_data` is malformed, fall back to displaying raw AI text in an editable textarea with a warning
- PDF is generated client-side using `@react-pdf/renderer` from the `rfp_data` JSON
- Store final `rfp_data` to `jobs.rfp_data` when user proceeds to Step 3 (the edited version, not just the AI output)

-----

#### Screen 6: Job Creation — Step 3: Select Recipients

**Purpose:** Choose who gets the RFQ. The address book persists over time, making each subsequent job faster.

**Route:** `/jobs/[id]/recipients` (Step 3 of 3)

**Layout:**

Top section: Address Book Search

```
[Search box: "Search your contacts or add a new supplier"]

Filter by trade: All | [trades based on what's in address book]

Results list:
Each contact card:
- Company name (bold)
- Contact name
- Trade badge
- Email (small)
- "Last used: X days ago" or "Never used"
- [Add to RFQ] button (or "Added ✓" if already selected)
```

Selected recipients section (shown as it grows):

```
"Sending to (3):"
- Acme Scaffolding — acme@gmail.com [Remove]
- Fraser Valley Lifts — info@fvlifts.ca [Remove]
- Burnaby Scaffold Co — hello@bscaffold.com [Remove]
```

“Can’t find them?” section:

```
[+ Add new supplier]
  → Inline form: Company Name*, Contact Name, Email*, Trade*, Phone
  → "Save & Add to RFQ" — saves to address_book AND adds to current RFQ
```

**Bottom action bar:**

- Recipient count: “X suppliers selected”
- “← Back”
- “Send [X] RFQs →” (disabled if 0 selected, enabled when ≥ 1)

**On “Send RFQs” click:**

1. Create `quotes` rows for each recipient (generate `reply_token` per quote)
1. Set `jobs.status = 'sent'`
1. Queue outbound emails via Resend (one per recipient)
1. Navigate to confirmation screen

-----

#### Screen 7: Confirmation

**Purpose:** Reassure the user the RFQs are out. Give them something to do while they wait.

**Route:** `/jobs/[id]/sent`

**Content:**

```
✅ [X] RFQs sent

Suppliers have until [formatted deadline] to respond.

Your RFQ included:
- [Trade needed]
- [Project address]
- [Scope summary — first 2 bullet points from rfp_data.scope_items]

What happens next:
1. Suppliers receive your RFQ by email
2. They click a link to fill in their quote — no account needed
3. You'll see quotes here as they arrive
4. Compare and award when you're ready

[View Job Status →]   [Send Another RFQ]
```

-----

#### Screen 8: Job Detail

**Purpose:** Real-time status of a job. The sub checks this to see who’s replied.

**Route:** `/jobs/[id]`

**Components:**

Header:

```
← Back to Dashboard
[Trade Needed] RFQ — [Project Name or Address]
Status: [badge]
Deadline: [formatted datetime, shows "2 hours left" / "Overdue" countdown]
```

Quote status list:

```
Each row shows one recipient:
[Supplier Name] — [email]
[Status badge: Pending | Replied | Declined]
[Time since sent / time since replied]
[View Quote] button — enabled when status = replied
```

Comparison CTA (shown when ≥ 2 quotes in ‘replied’ status):

```
"You have [X] quotes ready to compare."
[Compare Quotes →] — primary CTA, high visibility
```

Job actions (bottom):

```
[Cancel Job] — sets job status to cancelled, sends cancellation emails to all pending suppliers
[Download RFP PDF] — downloads the original RFP
```

**Realtime:**

- Use Supabase Realtime to subscribe to `quotes` rows for this job
- When a `quote.status` changes to `replied`, update the UI without page refresh
- Show a toast: “[Supplier name] just submitted their quote”

-----

#### Screen 9: Individual Quote Detail

**Purpose:** See the full quote from one supplier. Accessed from Job Detail.

**Route:** `/jobs/[id]/quotes/[quote_id]` (modal or slide-over in V1)

**Content:**

```
[Supplier Name]
[Email] [Phone if provided]

Total Price:    $[amount] ([price_type])
Quote Valid:    Until [date]

Inclusions:
✓ [item]
✓ [item]

Exclusions:
✗ [item]
✗ [item]

Timeline:
Start: [date]
Complete: [date]

Notes:
[supplier notes]

[View Full Comparison ←]
[Award This Quote] — secondary CTA
```

-----

#### Screen 10: Comparison View

**Purpose:** Side-by-side normalized comparison of all replied quotes. This is the highest-value screen in the product.

**Route:** `/jobs/[id]/compare`

**Layout:** Horizontal scrollable table on mobile, fixed columns on desktop.

```
Row labels (left column):
- Total Price
- Price Type
- Inclusions (each item as its own row)
- Exclusions
- Start Date
- Completion Date
- Quote Valid Until
- Documents (COI, WCB) — V2
- Notes

Column per supplier (with header: company name, "Replied X hours ago"):
- Each data point shown clearly
- Inclusions: ✓ if included, ✗ if excluded, — if not mentioned
- Lowest price: highlighted in subtle green
- Earliest start: highlighted in subtle blue
```

**Award row (bottom of each column):**

```
[Award to [Name]] — button per supplier column
```

**On Award click:**

- Award Modal (see Screen 11)

-----

#### Screen 11: Award Modal

**Purpose:** Confirm the award, set expectations for what happens next.

**Content:**

```
Award to [Supplier Name]?

"You're awarding this RFQ to [Supplier Name] at [price]. 
This will send a confirmation to [Supplier] and decline all others."

Job: [address]
Trade: [trade needed]
Price: $[amount] ([price_type])
Timeline: [start] – [end]

[Cancel]   [Confirm Award →]
```

**On Confirm:**

1. Set `quotes.status = 'awarded'` for winning quote
1. Set `quotes.status = 'declined_by_buyer'` for all other replied quotes
1. Set `jobs.status = 'awarded'`, `jobs.awarded_quote_id = winning quote id`
1. Send acceptance email to winner (see Email Specs)
1. Send decline emails to others (see Email Specs)
1. Navigate to Job Detail (now showing awarded state)

-----

#### Screen 12: Supplier Reply Page (PUBLIC — No Auth Required)

**Purpose:** The page a supplier opens when they click the link in the RFQ email. This must work perfectly on mobile — suppliers often check email on their phone.

**Route:** `/reply/[reply_token]` — fully public, no auth middleware

**Security:**

- Validate `reply_token` against `quotes.reply_token` on page load
- Check `reply_token_expires_at > NOW()`
- Check `status = 'pending'` (if already replied, show “Already submitted” state)
- All data submission goes through `submit_quote_response` RPC function (SECURITY DEFINER)

**Page states:**

**State A: Token valid, awaiting reply**

```
Header:
  [SubRFQ logo — minimal]
  "You've received an RFQ from [Buyer Company Name]"

RFQ Summary (read-only):
  Trade: Scaffolding
  Project: [address]
  Dates: [start] – [end]
  
  Scope of Work:
  • [scope item 1]
  • [scope item 2]
  • [scope item 3]
  
  They need from you:
  • [required_from_supplier items]
  
  Quote Deadline: [formatted datetime with time zone]

  [Download Full RFP PDF]  ← downloads the attached PDF

Your Quote:

  Total Price *
  [$____.__]  [dropdown: Fixed | Per Hour | Per Day | Per Unit]
  
  What's included in your price? *
  [Checkboxes pre-generated from rfp_data.required_from_supplier]
  [+ Add custom item]
  
  What's NOT included? (exclusions, conditions)
  [textarea]
  
  When can you start? *
  [date picker]
  
  Estimated completion date
  [date picker]
  
  This quote is valid until
  [date picker, default: quote_deadline + 14 days]
  
  Notes or questions (optional)
  [textarea]
  
  [Submit My Quote]

Footer:
  "Powered by SubRFQ · No account needed to submit"
  "Questions? Reply to the email you received."
```

**State B: Already submitted**

```
"✅ You already submitted a quote for this job."
"[Buyer Company Name] will be in touch if they'd like to proceed."
"Questions? Reply to the original email."
```

**State C: Expired or invalid token**

```
"This RFQ link has expired or is no longer active."
"If you believe this is an error, reply to the original email."
```

**State D: Declined or awarded (quote no longer pending)**

```
"This RFQ has been filled. Thank you for your interest."
```

**Mobile requirements:**

- All inputs must be large tap targets (min 44px height)
- Price input should trigger numeric keyboard on mobile
- Date pickers must use native mobile date input where possible
- Progress is saved to localStorage on every field change (in case they close app mid-fill)

-----

### 5.4 Email Specifications

All emails sent via Resend. Templates built with `react-email`.

#### Email 1: RFQ to Supplier

**From:** `[Buyer Name] via SubRFQ <rfq@subrfq.com>`
**Reply-to:** Buyer’s email address
**Subject:** (AI-generated, from `rfp_data.email_subject`)

**Body:**

```
[Buyer's company name] is requesting a quote for the following work:

[rfp_data.email_body — rendered from AI output]

To submit your quote, click the button below. No account needed.

[Submit Quote →]  (links to /reply/[token])

Quote deadline: [formatted datetime]

---
Attached: RFQ_[ProjectName]_[Date].pdf

This RFQ was sent via SubRFQ. Questions? Reply directly to this email.
```

**Attachment:** PDF generated from `rfp_data`, stored in Supabase Storage

-----

#### Email 2: Award Notification to Winner

**From:** `noreply@subrfq.com`
**Reply-to:** Buyer’s email
**Subject:** `You've been awarded the job: [trade] at [address]`

```
Good news — [Buyer Company] has awarded you the [Trade] work at [Address].

Job details:
- Start: [date]
- Completion: [date]
- Agreed price: $[amount] ([price_type])

[Buyer Name] will be in touch to confirm next steps.
Their contact: [buyer email] | [buyer phone]

---
Powered by SubRFQ
```

-----

#### Email 3: Decline Notification (to non-winners)

**From:** `noreply@subrfq.com`
**Subject:** `Update on RFQ: [trade] at [address]`

```
Hi [Contact Name or "there"],

Thank you for your quote on the [Trade] work at [Address].

[Buyer Company] has decided to proceed with another supplier for this job.

We hope to work with you on future opportunities.

[Buyer Company Name]
[Buyer email] | [Buyer phone]

---
Powered by SubRFQ
```

-----

### 5.5 AI Service Specification

**When called:** After Step 1 submission, before Step 2.

**Model:** `claude-sonnet-4-20250514`

**System prompt:**

```
You are a construction RFQ writer helping a specialty subcontractor in British Columbia create a professional Request for Quotation to send to other trades.

Your job is to take the user's raw description and any extracted file content, and produce a structured, professional RFQ package.

Rules:
- Be specific and technical. Use real construction terminology.
- Never invent measurements or specs not given by the user. If something is unclear, note it in notes_for_buyer.
- Safety requirements must always include WorkSafeBC compliance and appropriate PPE.
- Quote requirements must always include: Certificate of Insurance, WorkSafeBC clearance letter, and quote validity date.
- The email body should be direct and professional — not salesy, not overly formal. A contractor writing to a colleague.
- The scope items should be specific enough that a supplier can price without calling back.

Output ONLY valid JSON matching the RFPData schema. No markdown, no preamble.
```

**User message construction:**

```typescript
const userMessage = `
Trade needed: ${job.trade_needed}
Project address: ${job.project_address}
GC on project: ${job.gc_name || 'None / not applicable'}
Project start: ${job.start_date}
Project end: ${job.end_date}
Quote deadline: ${job.quote_deadline}

User's description:
${job.raw_description}

${extractedFileText ? `Content extracted from uploaded files:\n${extractedFileText}` : ''}

Buyer's own trade: ${user.trade}
Buyer's company: ${user.company_name}
`;
```

**File handling:**

- For uploaded PDFs: extract text via Anthropic `document` content type
- For images: pass as `image` content type with vision prompt: “Extract all text, dimensions, measurements, and relevant construction details from this image or drawing.”
- Combine all extracted text into `extractedFileText`
- Store extracted text in `job_files.extracted_text`

**Response validation:**

```typescript
function validateRFPData(raw: unknown): RFPData {
  // Validate required fields exist and are correct types
  // If validation fails, throw with details
  // Caller handles fallback to blank editable form
}
```

**Timeout:** 20 seconds. On timeout, return `null` and let the UI show the blank editable form.

**Rate limiting:** Max 5 AI generation calls per user per hour (enforced via Supabase edge function or in-memory cache).

-----

### 5.6 V1 API Routes

All routes under `/api/`. Use Next.js Route Handlers.

```
POST   /api/jobs                        Create job (draft)
GET    /api/jobs                        List jobs for authenticated user
GET    /api/jobs/[id]                   Get single job with quotes
PATCH  /api/jobs/[id]                   Update job (rfp_data, status)
DELETE /api/jobs/[id]                   Cancel job

POST   /api/jobs/[id]/generate          Trigger AI RFP generation
POST   /api/jobs/[id]/send              Send RFQs to recipients (creates quotes, sends emails)
POST   /api/jobs/[id]/award             Award job to a quote

GET    /api/jobs/[id]/quotes            List quotes for a job
GET    /api/jobs/[id]/quotes/[quote_id] Get single quote detail

POST   /api/reply/[token]               Submit quote response (PUBLIC, validates token)
GET    /api/reply/[token]               Get job summary for reply page (PUBLIC)

GET    /api/address-book                List address book entries
POST   /api/address-book                Create entry
PATCH  /api/address-book/[id]           Update entry
DELETE /api/address-book/[id]           Delete entry

GET    /api/user/profile                Get user profile
PATCH  /api/user/profile                Update profile

POST   /api/billing/create-checkout     Create Stripe checkout session
POST   /api/billing/portal              Create Stripe billing portal session
POST   /api/webhooks/stripe             Stripe webhook handler
```

-----

### 5.7 V1 Billing

**Trial:** 14 days, unlimited usage, no credit card required to start.

**Plans (V1, single tier to start):**

```
Starter — $89/month CAD
- Unlimited RFQs
- Up to 10 recipients per RFQ
- Address book (unlimited contacts)
- AI RFP generation
- PDF generation
- All emails included
```

**Implementation:**

- Stripe Checkout for sign-up (collect card at trial end or on upgrade prompt)
- Stripe Customer Portal for cancellation/plan changes
- Webhook handler updates `users.subscription_status`
- Block new job creation (not access to existing jobs) when `subscription_status = 'past_due'` or `'cancelled'` and trial expired

-----

### 5.8 V1 Non-Goals (Explicit)

These must not be implemented even if they seem small:

- ❌ No WorkSafeBC account verification — V2
- ❌ No email open tracking — V2
- ❌ No auto-nudge emails — V2
- ❌ No e-signature on agreements — V2
- ❌ No agreement PDF generation — V2
- ❌ No supplier-side accounts or profiles — V3
- ❌ No suggested suppliers / discovery — V3
- ❌ No Punjabi language support — V3
- ❌ No team/multi-user accounts — V4
- ❌ No mobile app (native) — ever unless validated
- ❌ No public listing of projects for suppliers to browse — never (this is not a marketplace)
- ❌ No GC-side features — never
- ❌ No payments/escrow — never
- ❌ No integration with Procore, BuildingConnected, Jobber — V4 at earliest

-----

## 6. V2 — Verification + Workflow Polish

**Gate:** 10 paying customers using V1 for real RFQs, with qualitative feedback from at least 5 of them on what’s missing.

### 6.1 WorkSafeBC Clearance Verification

**What it does:** Allows the buyer to quickly check if a supplier has a valid WorkSafeBC clearance before sending them an RFQ.

**How WorkSafeBC clearance works:**

- In BC, any contractor hiring another contractor should verify the other party has valid WorkSafeBC coverage
- A clearance letter can be requested online at worksafebc.com using the firm’s registration number
- The letter is valid for 90 days
- WorkSafeBC does NOT have a public API — this requires either scraping the public-facing clearance check tool or asking the supplier to upload their own letter

**V2 Implementation (conservative, no scraping):**

```
Address book: Add field "WorkSafeBC Registration #"
When user enters a WCB registration # for a contact:
  - Show "Check Status" button
  - On click: direct user to worksafebc.com/clearance with pre-filled firm number
    (opens in new tab — we can't automate this in V2 without legal risk)
  - After checking: user manually marks status as "Verified" with date
  - Show badge on recipient in Step 3: ✅ WCB Verified [date] | ⚠️ Not Verified
```

**V2.1 Implementation (if scraping is legally cleared):**

- POST to WorkSafeBC public clearance check endpoint
- Parse response HTML for clearance status
- Cache result for 7 days
- Flag: [DECISION NEEDED: confirm legal clearance with a construction lawyer before automating]

### 6.2 Auto-Nudge

**What it does:** Automatically reminds suppliers who haven’t responded.

**Trigger:** Scheduled Supabase Edge Function running every 6 hours

**Logic:**

```
For each quote WHERE:
  status = 'pending'
  AND email_sent_at < NOW() - INTERVAL '24 hours'
  AND nudge_1_sent_at IS NULL
  AND quote_deadline > NOW()
→ Send Nudge 1, update nudge_1_sent_at

For each quote WHERE:
  status = 'pending'
  AND nudge_1_sent_at < NOW() - INTERVAL '24 hours'
  AND nudge_2_sent_at IS NULL
  AND quote_deadline > NOW()
→ Send Nudge 2, update nudge_2_sent_at
```

**Nudge email content:**

```
Subject: Reminder: RFQ from [Buyer] — Quote due [deadline]

Hi [contact name],

Just a quick reminder about the RFQ we sent from [Buyer Company] 
for [trade] at [address].

Your quote is due by [deadline].

[Submit Your Quote →]

If you're unable to quote this one, no problem — just reply to let us know.
```

### 6.3 Agreement Generation

**What it does:** After award, auto-generate a simple sub-sub agreement pre-filled with job and quote data.

**Template: BC_SUBCONTRACT_V1**

Standard BC subcontract template covering:

- Parties (buyer company + supplier company)
- Scope of work (from `rfp_data.scope_items`)
- Contract price (from winning quote)
- Payment terms (net 30, or as agreed — editable)
- Project dates
- Insurance requirements (min $2M general liability, WorkSafeBC compliance)
- Change order process (buyer must approve in writing)
- Termination clause (7 days written notice)
- Governing law: British Columbia

**Implementation:**

- Agreement data merged into template as JSONB stored in `agreements.agreement_data`
- PDF rendered via `@react-pdf/renderer`
- Stored in Supabase Storage
- Shown on Job Detail after award

**[DECISION NEEDED]:** Have a BC construction lawyer review the template before launching this feature. Do not represent it as legal advice.

### 6.4 E-Signature (Dropbox Sign)

**What it does:** Enables both parties to sign the agreement digitally.

**Flow:**

1. After award + agreement PDF generated
1. Buyer clicks “Send for Signature”
1. System creates Dropbox Sign signature request with two signers (buyer + supplier)
1. Each party gets an email with signing link
1. On completion, signed PDF stored to Supabase Storage
1. `agreements` row updated with signed status

**Integration:**

```typescript
// POST to Dropbox Sign API
const signatureRequest = await dropboxSign.signatureRequestSend({
  title: `Subcontract Agreement — ${job.trade_needed} at ${job.project_address}`,
  subject: `Please sign: Subcontract Agreement`,
  signers: [
    { name: user.full_name, email_address: user.email, order: 0 },
    { name: quote.contact_name, email_address: quote.supplier_email, order: 1 }
  ],
  files: [agreementPdfBuffer],
  metadata: { job_id: job.id, agreement_id: agreement.id }
});
```

### 6.5 V2 Pricing Update

```
Starter  — $89/month CAD    (same, now includes V2 features)
Pro      — $149/month CAD
  Adds: Unlimited recipients per RFQ (V1 cap was 10)
        WorkSafeBC verification badges
        Auto-nudge
        Agreement generation + e-signature (10 agreements/month)
        Priority email support
```

-----

## 7. V3 — Supplier Directory + Two-Sided Revenue

**Gate:** 50 paying buyer subscribers, NPS > 40, at least 10 buyers asking “can I find new suppliers I haven’t worked with before?”

### 7.1 Supplier Profile (Free Tier)

When a supplier submits a quote via the public reply form, they are offered (not required) to create a free profile:

```
"Want to get found by more contractors like [Buyer Company]?
Create a free SubRFQ profile in 2 minutes."
[Create Profile]  [No thanks]
```

Free profile includes:

- Company name, trade(s), service area (regions in BC)
- Email, phone, website
- Self-declared: WorkSafeBC registration #, insurance expiry

### 7.2 Verified Supplier Status (Paid Tier)

**Pricing:** $149–299/month CAD per supplier company (higher price for more trades/regions)

**What “Verified” means:**

- WorkSafeBC clearance confirmed (automated check + manual review)
- COI on file and not expired (uploaded + reviewed)
- Phone number verified (SMS)
- At least 1 completed job on the platform (or manual review)

**What it gets them:**

- ✅ Verified badge in buyer’s recipient search
- Higher position in suggested suppliers list (Step 3 of job creation)
- Shown to buyers searching for that trade in their region
- Ability to receive auto-matched RFQ notifications: “A painter in Surrey needs scaffolding — interested?”

### 7.3 Suggested Suppliers in Step 3

**When:** Buyer is on the recipient selection step, looking for a trade they don’t have contacts for.

```
"Don't have [scaffolding] contacts? 
Here are verified suppliers in your area:"

[Supplier Card]
  Acme Scaffolding — Burnaby
  ✅ Verified WCB | ✅ Insurance Current
  Last used by: 4 contractors this month
  [Add to RFQ]
```

**Algorithm V3:** Simple — filter `supplier_profiles` by trade + geographic proximity to job address + verified status. No ML required until V4.

### 7.4 Punjabi Language Support

**Why:** Surrey, Delta, and parts of Burnaby have a large Punjabi-speaking construction community running specialty trade businesses. Many owner-operators are more comfortable in Punjabi than English for business communication.

**Implementation:**

- `next-intl` for all UI strings
- English (en) + Punjabi (pa) locales
- Language toggle in account settings + header
- Supplier reply page auto-detects browser language and defaults to Punjabi if PA
- RFP email subject line + body NOT translated (professional construction communication stays in English by industry norm — suppliers confirmed this in discovery)
- UI strings, buttons, labels, help text translated

**Priority translation: supplier reply page first.** This is the public-facing page where language barrier most affects conversion.

### 7.5 Rating System

**Triggered:** 7 days after job awarded, buyer receives email: “How was [Supplier Name] to work with?”

**Rating fields (simple):**

- Overall: 1–5 stars
- “Would you hire them again?” Yes / No
- Optional comment (shown on supplier profile with buyer’s company name)

**Display:** Rating average shown on address book entries and supplier profiles. Minimum 3 ratings required to display publicly.

-----

## 8. V4 — Team Features + Platform Maturity

**Gate:** 200 paying subscribers, at least 20% requesting team access or integrations.

### 8.1 Multi-User / Team Seats

**Roles:**

- Owner (full access, billing)
- Admin (all features, no billing)
- Estimator (create and send RFQs, view all jobs)
- Viewer (read-only on all jobs)

**Pricing:**

```
Pro Team — $249/month
  Includes: 3 seats
  Additional seats: $49/seat/month
```

### 8.2 GC Approval Workflow

**What it is:** When a buyer creates a job and names a GC, the system flags that sub-subbing may require GC approval, and offers to generate a one-line approval request email to the GC.

```
⚠️ Heads up: Your prime contract with [GC Name] may require approval
before subcontracting this work.

Would you like us to generate an approval request email to [GC Name]?
[Yes, generate request]  [I already have approval]  [My contract allows this]
```

This does not block the RFQ flow — it’s informational and optional.

### 8.3 Analytics Dashboard

```
Metrics shown:
- Total spend on sub-hired work (by trade, by month)
- Average quote-to-award time
- Most-used suppliers
- Quote response rate by supplier
- Savings vs. first quote (if they got multiple quotes)
```

### 8.4 Lightweight API / Webhooks

**Webhooks (outbound):**

- `job.quote_received` — new quote submitted
- `job.awarded` — job awarded
- `job.cancelled` — job cancelled

**Inbound API:**

- `POST /api/v1/jobs` — create job programmatically (for integrations with Jobber, Buildertrend, etc.)
- Authentication: API key per user, managed in settings

-----

## 9. WorkSafeBC Integration — Technical Notes

**Public clearance check URL:**

```
https://www.worksafebc.com/en/firms/check-clearance-letter
```

**Input:** Firm registration number (7-digit BC account number)
**Output:** Clearance status (Valid / Not valid / Not found), valid-from and valid-to dates

**V2 approach (recommended):** Direct user to check manually, then mark in address book. No scraping.

**V2.1 approach (requires legal review):** Automate via headless browser / playwright. Cache for 7 days. Store cached status in `address_book.worksafebc_status`.

**Flag for legal team:** The WorkSafeBC site has Terms of Use that may prohibit automated scraping. Confirm before implementing automation. If blocked, build an “upload your clearance letter” flow instead (supplier self-uploads their letter PDF).

-----

## 10. Success Metrics by Version

### V1 Metrics

|Metric                             |Target                            |How measured                                                                                 |
|-----------------------------------|----------------------------------|---------------------------------------------------------------------------------------------|
|Jobs created per user per month    |≥ 3                               |`COUNT(jobs) GROUP BY user_id`                                                               |
|AI RFP accepted without major edits|≥ 70% of generations              |Track time on Step 2; flag if user spends >5 min editing                                     |
|Supplier reply rate                |≥ 50% within deadline             |`COUNT(quotes WHERE status='replied') / COUNT(quotes)`                                       |
|Job-to-award rate                  |≥ 60% of sent jobs result in award|`COUNT(jobs WHERE status='awarded') / COUNT(jobs WHERE status IN ('sent','quotes_received'))`|
|Trial-to-paid conversion           |≥ 25%                             |Stripe events                                                                                |
|Monthly churn                      |< 8%                              |Stripe events                                                                                |

### V2 Metrics

|Metric                    |Target                         |
|--------------------------|-------------------------------|
|NPS                       |> 40                           |
|Monthly churn             |< 5%                           |
|Agreement generation used |> 50% of awarded jobs          |
|Auto-nudge response uplift|≥ 15% improvement in reply rate|

### V3 Metrics

|Metric                                                      |Target                   |
|------------------------------------------------------------|-------------------------|
|Verified supplier subscriptions                             |≥ 50 by end of V3 quarter|
|Buyer jobs using suggested suppliers (not just address book)|≥ 20% of sent jobs       |
|Supplier-side ARR as % of total ARR                         |≥ 20%                    |

-----

## 11. Open Questions / Decisions Needed

These are flagged throughout the document. Consolidated here:

1. **[DECISION NEEDED] Product name:** “SubRFQ” is a working name only. Choose a real name before any public-facing work (domain, emails, branding).
1. **[DECISION NEEDED] E-signature vendor:** Dropbox Sign (Hellosign) vs. DocuSeal (self-hosted, cheaper, more control). DocuSeal is open-source and can be self-hosted on Supabase or Railway. Dropbox Sign is $20/month for 5 templates + $0.10/envelope above 3/month free. For early stage, DocuSeal self-hosted may be better economics.
1. **[DECISION NEEDED] WorkSafeBC automation legality:** Confirm with BC construction lawyer before automating clearance checks. If not feasible, build manual workflow + COI upload instead.
1. **[DECISION NEEDED] Agreement template legal review:** BC subcontract agreement template must be reviewed by a BC construction lawyer before shipping to users. Cost: approximately $500–1,500 for a standard review.
1. **[DECISION NEEDED] BC vs. National scope from Day 1:** The codebase should be designed for multi-province eventually (Alberta WCB vs. BC WorkSafeBC, different trade associations, different regulatory contexts) — but V1-V2 should hardcode BC as the only province and add province selection in V3.
1. **[DECISION NEEDED] File upload size limits:** Current spec says 25MB per file. Confirm with Supabase storage pricing at scale. Large drawing sets can be 50-100MB.
1. **[DECISION NEEDED] Pricing in CAD vs. USD:** Given BC-first market, CAD is correct. Stripe supports CAD natively. All prices in this document are CAD.

-----

## 12. Build Order for Claude Code

Start here. Do not start elsewhere.

```
Phase 1 (Week 1-2): Foundation
  - Supabase project setup, all tables from Section 3.1
  - RLS policies
  - Next.js project scaffold, Tailwind, TypeScript strict mode
  - Auth flow (sign up, log in, onboarding)
  - Dashboard shell (empty state)

Phase 2 (Week 2-3): Job Creation Flow
  - Step 1: Describe (form + file upload to Supabase Storage)
  - AI service (Section 5.5) — generate RFP from description + files
  - Step 2: Review RFP (editable preview, PDF preview)
  - Step 3: Recipients (address book, add new)

Phase 3 (Week 3-4): Send + Track
  - Quote creation + reply token generation
  - Resend email integration (RFQ email with PDF attachment)
  - Job Detail page with realtime quote status
  - Supplier Reply Page (public, /reply/[token])

Phase 4 (Week 4-5): Compare + Award
  - Comparison view
  - Award modal + downstream quote status updates
  - Award/decline emails

Phase 5 (Week 5-6): Billing + Polish
  - Stripe integration (checkout, webhook, portal)
  - Trial enforcement
  - Error states, loading states, mobile responsive pass
  - Basic analytics (Supabase queries for admin view)
  - Deploy to Vercel, configure Supabase prod environment

Do not start Phase 2 without Phase 1 complete.
Do not start Phase 3 without AI service tested end-to-end with real construction descriptions.
Do not start Phase 5 without at least one full end-to-end test with a real RFQ sent and replied to.
```
