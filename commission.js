// Handles POSTs from the commission form and creates a record in Airtable's "Commissions" table.
// Requires env vars: AIRTABLE_TOKEN, AIRTABLE_BASE_ID

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return { statusCode: 500, body: 'Server not configured' };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Bad request' };
  }
  const { name, email, details } = data;
  if (!name || !email || !details) {
    return { statusCode: 400, body: 'Missing fields' };
  }

  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Commissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        Name: name,
        Email: email,
        Details: details,
        Status: 'New',
        Submitted: new Date().toISOString(),
      },
    }),
  });

  if (!res.ok) {
    return { statusCode: 502, body: 'Could not save request' };
  }
  return { statusCode: 200, body: 'ok' };
}
