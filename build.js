// build.js — pulls the "Pieces" table from Airtable and generates the static site in /dist.
// Run with: node build/build.js
// Requires env vars: AIRTABLE_TOKEN, AIRTABLE_BASE_ID

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Pieces';
const OUT = 'dist';
const IMG_DIR = path.join(OUT, 'photos');

if (!TOKEN || !BASE_ID) {
  console.error('Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID env vars.');
  process.exit(1);
}

// --- fetch every record from the Pieces table (only ones marked Available or Sold get built) ---
async function fetchRecords() {
  let records = [];
  let offset;
  do {
    const token = process.env.AIRTABLE_TOKEN;
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

// --- download each photo attachment locally, since Airtable's URLs expire ---
async function downloadPhoto(url, destName) {
  const dest = path.join(IMG_DIR, destName);
  if (existsSync(dest)) return; // skip if already downloaded this run isn't needed across runs, but cheap check
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photo download failed: ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'piece';
}

function layout({ title, description, body, active }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || '')}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="/css/style.css">
</head>
<body>
<header class="site-head">
  <a class="wordmark" href="/">Kiln &amp; Table</a>
  <nav>
    <a href="/" class="${active === 'shop' ? 'is-active' : ''}">Shop</a>
    <a href="/commission.html" class="${active === 'commission' ? 'is-active' : ''}">Request a commission</a>
  </nav>
</header>
<main>${body}</main>
<footer class="site-foot">
  <p>Handmade in small batches &mdash; each piece is one of a kind.</p>
</footer>
</body>
</html>`;
}

function pieceCard(p) {
  const soldOut = p.status !== 'Available';
  return `<article class="piece-card${soldOut ? ' is-sold' : ''}">
    <a href="/pieces/${p.slug}.html" class="piece-photo">
      <img src="/photos/${p.photoFile}" alt="${esc(p.name)}" loading="lazy">
      ${soldOut ? '<span class="sold-flag">Sold</span>' : ''}
    </a>
    <h3><a href="/pieces/${p.slug}.html">${esc(p.name)}</a></h3>
    <p class="piece-meta">${esc(p.type)}${p.glaze ? ' &middot; ' + esc(p.glaze) : ''}</p>
    <p class="piece-price">${soldOut ? '' : '$' + Number(p.price).toFixed(2)}</p>
  </article>`;
}

function piecePage(p) {
  const body = `
  <div class="piece-detail">
    <div class="piece-detail-photo">
      <img src="/photos/${p.photoFile}" alt="${esc(p.name)}">
      ${p.status !== 'Available' ? '<span class="sold-flag">Sold</span>' : ''}
    </div>
    <div class="piece-detail-info">
      <h1>${esc(p.name)}</h1>
      <p class="piece-meta">${esc(p.type)}${p.glaze ? ' &middot; ' + esc(p.glaze) : ''}${p.dimensions ? ' &middot; ' + esc(p.dimensions) : ''}</p>
      ${p.description ? `<p class="piece-desc">${esc(p.description)}</p>` : ''}
      ${p.status === 'Available'
        ? `<p class="piece-price piece-price-lg">$${Number(p.price).toFixed(2)}</p>
           ${p.stripeLink
             ? `<a class="btn btn-buy" href="${esc(p.stripeLink)}">Buy &mdash; ship or pick up locally</a>`
             : '<p class="mut">Purchase link coming soon.</p>'}`
        : '<p class="mut">This piece has sold. Interested in something similar? Request a custom commission.</p>'}
      <a class="btn btn-ghost" href="/commission.html">Request a similar piece</a>
    </div>
  </div>`;
  return layout({ title: `${p.name} — Kiln & Table`, description: p.description, body, active: 'shop' });
}

function shopPage(pieces) {
  const available = pieces.filter((p) => p.status === 'Available');
  const body = `
  <section class="hero">
    <h1>Small-batch stoneware, thrown and glazed by hand.</h1>
    <p>Every piece here is one of a kind &mdash; once it's gone, it's gone. Don't see what you're after? <a href="/commission.html">Request a commission.</a></p>
  </section>
  <section class="grid">
    ${available.length ? available.map(pieceCard).join('\n') : '<p class="mut">Nothing in the shop right now &mdash; check back soon.</p>'}
  </section>`;
  return layout({ title: 'Kiln & Table — handmade pottery', description: 'Small-batch handmade stoneware.', body, active: 'shop' });
}

function commissionPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Request a custom piece</h1>
    <p>Tell us what you're picturing and we'll follow up by email with pricing and timeline.</p>
  </section>
  <form class="commission-form" id="commission-form">
    <label>Your name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>What are you picturing?<textarea name="details" rows="5" required placeholder="Type of piece, size, glaze color, quantity, timeline..."></textarea></label>
    <button class="btn btn-buy" type="submit">Send request</button>
    <p class="form-note" id="form-note"></p>
  </form>
  <script>
  document.getElementById('commission-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = document.getElementById('form-note');
    const data = Object.fromEntries(new FormData(e.target));
    note.textContent = 'Sending...';
    try {
      const res = await fetch('/.netlify/functions/commission', { method: 'POST', body: JSON.stringify(data) });
      if (!res.ok) throw new Error('failed');
      e.target.reset();
      note.textContent = "Sent! We'll be in touch by email.";
    } catch (err) {
      note.textContent = "Something went wrong — please email us directly instead.";
    }
  });
  </script>`;
  return layout({ title: 'Request a commission — Kiln & Table', description: 'Request a custom pottery commission.', body, active: 'commission' });
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(IMG_DIR, { recursive: true });
  await fs.mkdir(path.join(OUT, 'pieces'), { recursive: true });
  await fs.cp('public', OUT, { recursive: true });

  const records = await fetchRecords();
  const pieces = [];

  for (const rec of records) {
    const f = rec.fields;
    if (!f.Name || !f.Status) continue; // skip incomplete/unreviewed rows
    if (f.Status !== 'Available' && f.Status !== 'Sold') continue; // "New" rows stay unpublished

    const slug = `${slugify(f.Name)}-${rec.id.slice(-5)}`;
    const photo = Array.isArray(f.Photos) && f.Photos[0];
    let photoFile = 'placeholder.svg';
    if (photo) {
      const ext = (photo.type && photo.type.split('/')[1]) || 'jpg';
      photoFile = `${slug}.${ext}`;
      await downloadPhoto(photo.url, photoFile);
    }

    pieces.push({
      slug,
      name: f.Name,
      type: f.Type || '',
      glaze: f.Glaze || '',
      dimensions: f.Dimensions || '',
      description: f.Description || '',
      price: f.Price || 0,
      status: f.Status,
      stripeLink: f['Stripe Link'] || '',
      photoFile,
    });
  }

  for (const p of pieces) {
    await fs.writeFile(path.join(OUT, 'pieces', `${p.slug}.html`), piecePage(p));
  }
  await fs.writeFile(path.join(OUT, 'index.html'), shopPage(pieces));
  await fs.writeFile(path.join(OUT, 'commission.html'), commissionPage());

  console.log(`Built ${pieces.length} piece page(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
