# Kiln & Table — setup guide

## 1. Airtable base

Create a base called **Kiln & Table** with two tables.

### Table: `Pieces`
| Field name       | Type              | Notes |
|-------------------|-------------------|-------|
| Name              | Single line text  | |
| Type              | Single line text  | e.g. Mug, Bowl, Vase |
| Glaze             | Single line text  | |
| Dimensions        | Single line text  | e.g. `4" x 6"` |
| Description       | Long text         | |
| Photos            | Attachment        | the artist's intake form writes here |
| Price             | Currency          | |
| Status            | Single select     | options: `New`, `Available`, `Sold` |
| Stripe Link       | URL               | paste the full Payment Link URL |
| Stripe Link ID    | Single line text  | paste just the ID from the link (starts `plink_`) |

Only rows with Status `Available` or `Sold` get built into the site — `New` rows the artist submits stay hidden until you review and price them.

### Table: `Commissions`
| Field name | Type             |
|------------|------------------|
| Name       | Single line text |
| Email      | Email            |
| Details    | Long text        |
| Status     | Single select (`New`, `In progress`, `Done`) |
| Submitted  | Date             |

### Artist's intake form
In Airtable, open the `Pieces` table → **Share view** → **Create form**. Include Name, Type, Glaze, Dimensions, Description and Photos. Leave Status off the form (it defaults to blank/`New`). Bookmark the form link on the artist's phone — they fill it in right after a photo shoot.

## 2. Stripe

For each piece you price and mark `Available`:
1. Stripe Dashboard → Payment Links → **New**.
2. Add the product, price, and **limit to 1 payment** so it can't sell twice.
3. Under shipping, enable **Ship to** the countries you support, add your flat shipping rate, and also add a **$0 "Local pickup"** shipping option.
4. Save, then paste the full link into **Stripe Link**, and the `plink_...` ID into **Stripe Link ID**.

For automatic Sold-marking, add a webhook (Stripe Dashboard → Developers → Webhooks) pointing to:
`https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
Listen for `checkout.session.completed`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 3. Deploy to Netlify

1. Push this folder to a new GitHub repo.
2. Netlify → **Add new site** → import that repo. Build command and publish directory are already set in `netlify.toml`.
3. Site settings → Environment variables, add:
   - `AIRTABLE_TOKEN` — a personal access token from airtable.com/create/tokens, scoped to this base with read (and write, for the webhook) access
   - `AIRTABLE_BASE_ID` — starts with `app...`, found in the base's API docs
   - `STRIPE_WEBHOOK_SECRET` — from step 2 above
   - `NETLIFY_BUILD_HOOK_URL` — create one at Site settings → Build & deploy → Build hooks, then paste it here
4. Deploy. Your site is live at the Netlify URL (add a custom domain any time under Domain settings).

## 4. Keep it in sync

In Airtable, add an **Automation**: trigger "When a record is updated" on `Pieces`, watching the Status field → action "Send a webhook" → the same Build Hook URL from step 3. Now changing a piece's status in Airtable rebuilds the live site within a minute or two.

## 5. Local preview

```
npm install
AIRTABLE_TOKEN=xxx AIRTABLE_BASE_ID=appXXXX npm run build
npx serve dist
```
