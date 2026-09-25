// Stripe calls this after a successful payment. It looks up the piece by the Stripe
// Payment Link ID stored on the record, sets Status to "Sold", then triggers a Netlify rebuild.
// Requires env vars: STRIPE_WEBHOOK_SECRET, AIRTABLE_TOKEN, AIRTABLE_BASE_ID, NETLIFY_BUILD_HOOK_URL
// You'll also need the "stripe" package: add it to package.json dependencies.

import Stripe from 'stripe';

export async function handler(event) {
  const sig = event.headers['stripe-signature'];
  const { STRIPE_WEBHOOK_SECRET, AIRTABLE_TOKEN, AIRTABLE_BASE_ID, NETLIFY_BUILD_HOOK_URL } = process.env;

  let stripeEvent;
  try {
    // constructEvent needs the raw body; Netlify provides it as event.body (string).
    stripeEvent = Stripe.webhooks.constructEvent(event.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature check failed: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'ignored' };
  }

  const session = stripeEvent.data.object;
  const paymentLinkId = session.payment_link;
  if (!paymentLinkId) return { statusCode: 200, body: 'no payment link on session' };

  // Find the Airtable record whose "Stripe Link ID" field matches this payment link.
  const findUrl = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Pieces`);
  findUrl.searchParams.set('filterByFormula', `{Stripe Link ID} = "${paymentLinkId}"`);
  const findRes = await fetch(findUrl, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
  const found = await findRes.json();
  const record = found.records && found.records[0];
  if (!record) return { statusCode: 200, body: 'no matching piece found' };

  await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Pieces/${record.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { Status: 'Sold' } }),
  });

  if (NETLIFY_BUILD_HOOK_URL) {
    await fetch(NETLIFY_BUILD_HOOK_URL, { method: 'POST' });
  }

  return { statusCode: 200, body: 'ok' };
}
