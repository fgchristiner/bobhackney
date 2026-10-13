// build.js — generates the Your Studio Sidekick static site into /dist.
// Netlify runs this automatically (see netlify.toml). To try it yourself: node build.js
// No API keys or environment variables are needed.

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = 'dist';
const SITE = 'Your Studio Sidekick';
const DESCRIPTION = 'Practical, friendly, as-needed help with websites, organization, and behind-the-scenes business tasks for artists, makers, and independent creatives.';

// --- Edit your services here: they appear on the home page and the Services page ---
const services = [
  { name: 'Studio & workflow organization', short: 'Systems for your space, supplies, and inventory.',
    long: 'Systems for your space, supplies, inventory, and workflow, so you can find what you need and spend more time making.' },
  { name: 'Website creation and maintenance', short: 'A site that shows your work well and stays current.',
    long: 'A site that shows your work well and is easy to keep current, built for you and updated as your work grows.' },
  { name: 'Portfolio creation and maintenance', short: 'Your best work, organized for galleries and buyers.',
    long: 'Your best work, organized and presented clearly for galleries, buyers, and applications, and kept up to date as new pieces come out.' },
  { name: 'Social media', short: 'Planning and posting without taking over your week.',
    long: 'Help planning, scheduling, and posting, so your audience keeps seeing your work without it taking over your week.' },
  { name: 'Studio tech on call', short: 'A helping hand for pinch points, when you need it.',
    long: 'A helping hand for the pinch points: software, equipment setup, photographing work, listing items for sale, or whatever is slowing you down.' },
  { name: 'Show and display prep', short: 'Inventory, price sheets, labels, and timelines.',
    long: 'I can help with inventory lists, price sheets, labels and signage, artist statements, display layouts, and packing and transport, plus a timeline that works backward from your show date.' },
];

const nav = [
  ['services', '/services.html', 'Services'],
  ['about', '/about.html', 'About'],
  ['portfolio', '/portfolio.html', 'Portfolio'],
  ['contact', '/contact.html', 'Get in touch'],
];

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function layout({ title, description, body, active, wide = false }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description || DESCRIPTION)}">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="/css/style.css">
<link rel="icon" href="/favicon.png">
</head>
<body>
<header class="site-head">
  <a class="wordmark" href="/"><img src="/logo.png" alt="" class="site-logo"><span>${SITE}</span></a>
  <nav>
    ${nav.map(([key, href, label]) => `<a href="${href}" class="${active === key ? 'is-active' : ''}">${label}</a>`).join('\n    ')}
  </nav>
</header>
<main${wide ? ' class="main-wide"' : ''}>${body}</main>
<footer class="site-foot">
  <p>${SITE} &mdash; practical, friendly help for artists and makers.</p>
  <p>YourStudioSidekick.com</p>
</footer>
</body>
</html>`;
}

function serviceCards() {
  return services.map((s) => `<div class="service-card"><h3>${esc(s.name)}</h3><p>${esc(s.short)}</p></div>`).join('\n    ');
}

function homePage() {
  const body = `
  <section class="hero">
    <h1>Make the art. Skip the busywork.</h1>
    <p class="hero-lead">Practical, friendly, as-needed help with websites, organization, and behind-the-scenes business tasks, so you can focus on your work.</p>
    <p class="hero-actions"><a class="btn btn-buy" href="/services.html">See services</a><a class="btn btn-ghost" href="/contact.html">Get in touch</a></p>
  </section>
  <h2 class="section-title">Custom offerings, just like your art</h2>
  <section class="service-grid">
    ${serviceCards()}
  </section>
  <section class="cta-band">
    <h2>Not sure where to start?</h2>
    <p>Tell me what's on your plate and we'll build a package that fits.</p>
    <a class="btn btn-gold" href="/contact.html">Get in touch</a>
  </section>`;
  return layout({ title: `${SITE} — help for artists, makers & creatives`, body, active: '' });
}

function servicesPage() {
  const body = `
  <section class="hero hero-wide">
    <h1>Custom offerings, just like your art</h1>
    <p>Your Studio Sidekick knows that every artist works differently, so my services do too. Choose one, combine a few, or bring me in when a deadline is closing in.</p>
  </section>
  <ul class="service-bullets">
    ${services.map((s) => `<li><strong>${esc(s.name)}.</strong> ${esc(s.long)}</li>`).join('')}
  </ul>
  <section class="cta-band">
    <h2>Not sure where to start?</h2>
    <p>Tell me what's on your plate and we'll build a package that fits.</p>
    <a class="btn btn-gold" href="/contact.html">Get in touch</a>
  </section>`;
  return layout({ title: `Services — ${SITE}`, description: 'Studio organization, websites, portfolios, social media, show prep, and on-call studio tech for artists.', body, active: 'services' });
}

function aboutPage() {
  const body = `
  <div class="about-layout">
    <img class="about-photo" src="/christine.jpg" alt="Christine steadying a kiln strapped into the back of a pickup truck">
    <div class="about-text">
    <h1>Hi, I’m Christine, I’m the person in your corner.</h1>
    <p>I’m a creative’s biggest fan, a natural problem-solver, and the person who actually enjoys getting things organized.</p>
    <p>Through Your Studio Sidekick, I help artists and creative small-business owners with the behind-the-scenes work that makes it easier to share their talents with the world&mdash;and earn a better living doing what they love.</p>
    <p>I know firsthand that being good at your craft is only part of running a creative business. Between managing a website, keeping track of projects, communicating with clients, and handling all the little tasks that somehow multiply overnight, it’s easy to spend more time running your business than doing the work you started it for.</p>
    <p>That’s where I come in.</p>
    <p>My strengths aren’t in making the art itself, though I do love to dabble (current obsession is pottery). They’re in helping artists do more with theirs. I love organizing the messy middle, figuring out how things work, building useful systems, creating websites, and finding practical solutions to the things that keep people stuck. I’m a researcher, a planner, a creative thinker, and a natural cheerleader who genuinely enjoys helping other people succeed.</p>
    <p>Whether you need a website that finally reflects the quality of your work, a little help getting organized, or an extra set of hands to tackle the projects you keep putting off, I’m here to make things easier.</p>
    <p>No judgment about the unfinished to-do list. No expectation that you should magically know how to do everything yourself. Just thoughtful, practical support that meets you where you are.</p>
    <p><strong>You bring the creativity. I’ll help with the rest.</strong></p>
    <p class="signoff">Let’s get you back to doing more of what you love.</p>
    </div>
  </div>`;
  return layout({ title: `About — ${SITE}`, description: `Meet Christine, the person behind ${SITE}.`, body, active: 'about', wide: true });
}

function portfolioPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Portfolio</h1>
    <p>Projects I've worked on with artists will be shown here.</p>
  </section>`;
  return layout({ title: `Portfolio — ${SITE}`, description: `Projects from ${SITE}.`, body, active: 'portfolio' });
}

function contactPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Get in touch</h1>
    <p>Tell me what's on your plate &mdash; a project, a deadline, or just a pinch point &mdash; and I'll follow up by email.</p>
  </section>
  <form class="commission-form" name="contact" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="contact">
    <p class="visually-hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
    <label>Your name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>What do you need help with?<textarea name="details" rows="6" required placeholder="Studio organization, a website, a show coming up, something slowing you down..."></textarea></label>
    <label>Any deadline or show date? (optional)<input name="deadline"></label>
    <button class="btn btn-buy" type="submit">Send</button>
  </form>`;
  return layout({ title: `Get in touch — ${SITE}`, description: 'Tell me what you need help with.', body, active: 'contact' });
}

function thanksPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Thank you!</h1>
    <p>Your message is on its way. I'll be in touch by email.</p>
    <p class="hero-actions"><a class="btn btn-ghost" href="/">Back to home</a></p>
  </section>`;
  return layout({ title: `Thank you — ${SITE}`, body, active: 'contact' });
}

function notFoundPage() {
  const body = `
  <section class="hero hero-narrow">
    <h1>Page not found</h1>
    <p>That page doesn't exist. <a href="/">Head back home.</a></p>
  </section>`;
  return layout({ title: `Not found — ${SITE}`, body, active: '' });
}

async function main() {
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.cp('public', OUT, { recursive: true });

  const pages = {
    'index.html': homePage(),
    'services.html': servicesPage(),
    'about.html': aboutPage(),
    'portfolio.html': portfolioPage(),
    'contact.html': contactPage(),
    'thanks.html': thanksPage(),
    '404.html': notFoundPage(),
  };
  for (const [file, html] of Object.entries(pages)) {
    await fs.writeFile(path.join(OUT, file), html);
  }
  console.log(`Built ${Object.keys(pages).length} pages into ${OUT}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
