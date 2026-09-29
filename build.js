// build.js — pulls the "Pieces" table from Airtable and generates the static site in /dist.
// Run with: node build/build.js
// Requires env vars: AIRTABLE_TOKEN, AIRTABLE_BASE_ID

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';

const pieces = "Pieces";
const url = new URL(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${pieces}`);

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const tableName = 'Pieces';
const TABLE = 'Pieces';
const OUT = 'dist';
const IMG_DIR = path.join(OUT, 'photos');
const PORTFOLIO_TABLE = 'Portfolio';
const PORTFOLIO_IMG_DIR = path.join(OUT, 'portfolio-photos');

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

// --- fetch every record from the separate Portfolio table (builds its own URL, unrelated to the Pieces one above) ---
async function fetchPortfolioRecords() {
  let records = [];
  let offset;
  do {
    const purl = new URL(`https://api.airtable.com/v0/${BASE_ID}/${PORTFOLIO_TABLE}`);
    purl.searchParams.set('pageSize', '100');
    if (offset) purl.searchParams.set('offset', offset);
    const res = await fetch(purl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (!res.ok) throw new Error(`Airtable Portfolio fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records;
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
<link rel="icon" href="/favicon.png">
</head>
<body>
<header class="site-head">
  <a class="wordmark" href="/"><img src="/logo.png" alt="" class="site-logo"><span>Bob Hackney Pottery</span></a>
  <nav>
    <a href="/" class="${active === 'shop' ? 'is-active' : ''}">Shop</a>
    <a href="/about.html" class="${active === 'about' ? 'is-active' : ''}">About</a>
    <a href="/portfolio.html" class="${active === 'portfolio' ? 'is-active' : ''}">Portfolio</a>
    <a href="/learn.html" class="${active === 'learn' ? 'is-active' : ''}">Learn with me</a>
    <a href="/commission.html" class="${active === 'commission' ? 'is-active' : ''}">Request a commission</a>
  </nav>
</header>
<main>${body}</main>
<footer class="site-foot">
  <p>Handmade in my studio in Forest Grove, Oregon.</p>
  <div class="social-links">
    <a href="https://www.instagram.com/badgerpdx/" aria-label="Instagram" title="Instagram">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>
    </a>
    <a href="#" aria-label="YouTube" title="YouTube">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/></svg>
    </a>
  </div>
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
      ${p.makingNote ? `<div class="making-note"><strong>How this was made.</strong> ${esc(p.makingNote)}</div>` : ''}
      ${p.status === 'Available'
        ? `<p class="piece-price piece-price-lg">$${Number(p.price).toFixed(2)}</p>
           ${p.stripeLink
             ? `<a class="btn btn-buy" href="${esc(p.stripeLink)}">Buy &mdash; ship or pick up locally</a>`
             : '<p class="mut">Purchase link coming soon.</p>'}`
        : '<p class="mut">This piece has sold. Interested in something similar? Request a custom commission.</p>'}
      <a class="btn btn-ghost" href="/commission.html">Request a similar piece</a>
    </div>
  </div>`;
  return layout({ title: `${p.name} — Bob Hackney`, description: p.description, body, active: 'shop' });
}

// --- category filter row + per-category pages, built from the Airtable "Type" field ---
function categoryNav(pieces, activeSlug = '') {
  const groups = new Map();
  for (const p of pieces) {
    if (p.status !== 'Available' || !p.type) continue;
    const key = slugify(p.type);
    if (!groups.has(key)) groups.set(key, { label: p.type, n: 0 });
    groups.get(key).n++;
  }
  if (groups.size < 2) return '';
  const links = [...groups.entries()]
    .sort((a, b) => a[1].label.localeCompare(b[1].label))
    .map(([slug, g]) => `<a class="category-pill${slug === activeSlug ? ' is-active' : ''}" href="/category/${slug}.html">${esc(g.label)} <span>${g.n}</span></a>`)
    .join('');
  return `<nav class="category-nav" aria-label="Browse by type"><a class="category-pill${activeSlug === '' ? ' is-active' : ''}" href="/">All</a>${links}</nav>`;
}

function categoryPage(slug, label, pieces) {
  const items = pieces.filter((p) => p.status === 'Available' && slugify(p.type) === slug);
  const body = `
  <section class="hero">
    <h1>${esc(label)}</h1>
    <p>Handmade ${esc(label.toLowerCase())} by Bob Hackney &mdash; each one thrown and glazed by hand.</p>
  </section>
  ${categoryNav(pieces, slug)}
  <section class="grid">
    ${items.map(pieceCard).join('\n')}
  </section>`;
  return layout({ title: `${label} — Bob Hackney`, description: `Handmade ${label.toLowerCase()} by Bob Hackney, thrown and glazed by hand in Forest Grove, Oregon.`, body, active: 'shop' });
}

function shopPage(pieces) {
  const available = pieces.filter((p) => p.status === 'Available');
  const body = `
  <section class="hero">
    <h1>Small-batch stoneware, thrown and glazed by hand.</h1>
    <p>Every piece here is one of a kind &mdash; once it's gone, it's gone. Don't see what you're after? <a href="/commission.html">Request a commission.</a></p>
  </section>
  ${categoryNav(pieces)}
  <section class="grid">
    ${available.length ? available.map(pieceCard).join('\n') : '<p class="mut">Nothing in the shop right now &mdash; check back soon.</p>'}
  </section>`;
  return layout({ title: 'Bob Hackney — handmade pottery', description: 'Handmade stoneware and horsehair raku pottery by clay artist Bob Hackney in Forest Grove, Oregon.', body, active: 'shop' });
}

function portfolioCard(item) {
  return `<article class="portfolio-card">
    <div class="piece-photo"><img src="/portfolio-photos/${item.photoFile}" alt="${esc(item.name)}" loading="lazy"></div>
    <h3>${esc(item.name)}</h3>
    <p class="piece-meta">${item.year ? esc(item.year) + ' &middot; ' : ''}${esc(item.type)}${item.dimensions ? ' &middot; ' + esc(item.dimensions) : ''}</p>
    ${item.description ? `<p class="piece-desc">${esc(item.description)}</p>` : ''}
  </article>`;
}

function yearNav(items, activeYear = '') {
  const years = [...new Set(items.map((i) => i.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  if (years.length < 2) return '';
  const links = years
    .map((y) => `<a class="category-pill${y === activeYear ? ' is-active' : ''}" href="/portfolio/${y}.html">${esc(y)}</a>`)
    .join('');
  return `<nav class="category-nav" aria-label="Browse by year"><a class="category-pill${activeYear === '' ? ' is-active' : ''}" href="/portfolio.html">All years</a>${links}</nav>`;
}

function portfolioPage(items) {
  const sorted = [...items].sort((a, b) => (b.year || '').localeCompare(a.year || ''));
  const body = `
  <section class="hero">
    <h1>Portfolio</h1>
    <p>A record of work made over the years &mdash; some pieces here are available, most are simply part of the archive.</p>
  </section>
  ${yearNav(items)}
  <section class="grid">
    ${sorted.length ? sorted.map(portfolioCard).join('\n') : '<p class="mut">Nothing to show yet.</p>'}
  </section>`;
  return layout({ title: 'Portfolio — Bob Hackney', description: 'A portfolio of pottery made by Bob Hackney over the years.', body, active: 'portfolio' });
}

function portfolioYearPage(year, items) {
  const sorted = items.filter((i) => i.year === year);
  const body = `
  <section class="hero">
    <h1>Portfolio &mdash; ${esc(year)}</h1>
  </section>
  ${yearNav(items, year)}
  <section class="grid">
    ${sorted.map(portfolioCard).join('\n')}
  </section>`;
  return layout({ title: `${year} Portfolio — Bob Hackney`, description: `Pottery made by Bob Hackney in ${year}.`, body, active: 'portfolio' });
}

function aboutPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>About Bob</h1>
  </section>
  <div class="prose">
    <p>I've spent most of my life working with clay, though it often feels more accurate to say that clay has spent most of my life teaching me.</p>
    <div class="about-photos">
      <img src="/bob-1.png" alt="Bob in the garden">
    </div>
    <p>After decades of making, teaching, apprenticing, and experimenting, I remain fascinated by the transformation of simple materials from the earth into objects that become part of everyday life. My work is shaped by the rhythms of Forest Grove, Oregon, where gardens bloom with the seasons, beauty reveals itself slowly, and patience is still considered a virtue.</p>
    <p>I am drawn to traditional crafts and materials that reward careful attention&mdash;clay, fire, fiber, plants, and soil. Whether throwing a pot, tending a garden, or exploring horsehair raku, I find myself returning to the same idea: meaningful things take time.</p>
    <p>In a world increasingly defined by speed and automation, handmade pottery offers something different. Every piece carries evidence of the human hand and the quiet, unpredictable process of making. The subtle variations and imperfections are reminders that a real person shaped this object, fired it, and waited to see what the kiln would reveal.</p>
    <p>For me, pottery is ultimately about attention&mdash;slowing down long enough to appreciate texture, form, color, and the small rituals that enrich daily life.</p>
    <p class="signoff">Thank you for sharing a small part of this ongoing muddy journey.</p>
  </div>`;
  return layout({ title: 'About — Bob Hackney', description: 'About Bob Hackney, potter.', body, active: 'about' });
}

function learnPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Learn with me</h1>
    <p>Two ways to work with clay alongside me, depending on what fits.</p>
  </section>
  <div class="learn-options">
    <a class="learn-card" href="https://valleyart.org/classes/">
      <h3>Classes at Valley Art</h3>
      <p>Group classes on a regular schedule, open to all levels.</p>
    </a>
    <a class="learn-card" href="/private-lessons.html">
      <h3>Private lessons</h3>
      <p>One-on-one time at the wheel, tailored to where you're at.</p>
    </a>
  </div>`;
  return layout({ title: 'Learn with me — Bob Hackney', description: 'Classes and private pottery lessons.', body, active: 'learn' });
}

function privateLessonsPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Private lessons</h1>
    <p>One-on-one time at the wheel, tailored to where you're at and what you want to learn.</p>
  </section>
  <form class="commission-form" name="private-lessons" method="POST" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="private-lessons">
    <p class="visually-hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
    <label>Your name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>Phone (optional)<input name="phone" type="tel"></label>
    <label>Tell me about your experience with clay, and what you'd like to work toward<textarea name="details" rows="6" required placeholder="Total beginner, a few classes in, years of experience... and what you're hoping to learn or make"></textarea></label>
    <button class="btn btn-buy" type="submit">Send request</button>
  </form>`;
  return layout({ title: 'Private lessons — Bob Hackney', description: 'Request private pottery lessons.', body, active: 'learn' });
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
  return layout({ title: 'Request a commission — Bob Hackney', description: 'Request a custom pottery commission.', body, active: 'commission' });
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
      makingNote: f['Making Note'] || '',
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

  // one page per Type that has at least one Available piece
  await fs.mkdir(path.join(OUT, 'category'), { recursive: true });
  const categories = new Map();
  for (const p of pieces) {
    if (p.status === 'Available' && p.type && !categories.has(slugify(p.type))) categories.set(slugify(p.type), p.type);
  }
  for (const [slug, label] of categories) {
    await fs.writeFile(path.join(OUT, 'category', `${slug}.html`), categoryPage(slug, label, pieces));
  }

  await fs.writeFile(path.join(OUT, 'about.html'), aboutPage());

  // --- Portfolio table: separate from Pieces, no Stripe/Status logic, just a browsable archive ---
  await fs.mkdir(PORTFOLIO_IMG_DIR, { recursive: true });
  await fs.mkdir(path.join(OUT, 'portfolio'), { recursive: true });
  const portfolioRecords = await fetchPortfolioRecords();
  const portfolioItems = [];
  for (const rec of portfolioRecords) {
    const f = rec.fields;
    if (!f.Name) continue;
    const slug = `${slugify(f.Name)}-${rec.id.slice(-5)}`;
    const photo = Array.isArray(f.Image) && f.Image[0];
    let photoFile = 'placeholder.svg';
    if (photo) {
      const ext = (photo.type && photo.type.split('/')[1]) || 'jpg';
      photoFile = `${slug}.${ext}`;
      const dest = path.join(PORTFOLIO_IMG_DIR, photoFile);
      if (!existsSync(dest)) {
        const res = await fetch(photo.url);
        if (res.ok) await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
      }
    }
    portfolioItems.push({
      name: f.Name,
      year: f.Year ? String(f.Year) : '',
      type: f.Type || '',
      dimensions: f.Dimensions || '',
      description: f.Description || '',
      photoFile,
    });
  }
  await fs.writeFile(path.join(OUT, 'portfolio.html'), portfolioPage(portfolioItems));
  for (const year of new Set(portfolioItems.map((i) => i.year).filter(Boolean))) {
    await fs.writeFile(path.join(OUT, 'portfolio', `${year}.html`), portfolioYearPage(year, portfolioItems));
  }

  await fs.writeFile(path.join(OUT, 'learn.html'), learnPage());
  await fs.writeFile(path.join(OUT, 'private-lessons.html'), privateLessonsPage());
  await fs.writeFile(path.join(OUT, 'commission.html'), commissionPage());

  console.log(`Built ${pieces.length} piece page(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
