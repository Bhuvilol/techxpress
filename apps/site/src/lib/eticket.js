// The souvenir e-ticket: a 1080x1350 PNG drawn on a canvas, styled after an
// Indian Railways electronic reservation slip. The text-layout helpers at the
// top are pure (they take a `measure` function) and unit tested.
import { EVENT, PNR, TICKET } from '../content/station.js';

export const TICKET_SIZE = { width: 1080, height: 1350 };

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ── Pure helpers ──────────────────────────────────────────────────────────

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// Cut `text` so measure(text) fits maxWidth, ending in an ellipsis. Prefers to
// cut at a word boundary when that keeps at least 60 % of the room.
export const truncateToWidth = (text, maxWidth, measure, ellipsis = '…') => {
  const t = clean(text);
  if (measure(t) <= maxWidth) return t;
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(t.slice(0, mid).trimEnd() + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  if (lo === 0) return measure(ellipsis) <= maxWidth ? ellipsis : '';
  const cut = t.slice(0, lo);
  const space = cut.lastIndexOf(' ');
  const base = space >= lo * 0.6 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,.;:–-]+$/, '') + ellipsis;
};

// Largest font size (stepping down from maxSize to minSize) at which `text`
// fits; at minSize it is truncated. measureAt(size, text) -> width.
export const fitText = (text, { maxWidth, maxSize, minSize, step = 2, measureAt }) => {
  const t = clean(text);
  for (let size = maxSize; size >= minSize; size -= step) {
    if (measureAt(size, t) <= maxWidth) return { size, text: t };
  }
  return { size: minSize, text: truncateToWidth(t, maxWidth, (s) => measureAt(minSize, s)) };
};

// '2026-12-04' / '2026-12-04T09:30:00+05:30' -> '04 DEC 2026'. Other strings
// are shown upper-cased as given; empty falls back to the event start.
export const formatJourneyDate = (value, fallback = EVENT.startsAt) => {
  const v = clean(value) || fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v.toUpperCase();
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${m[3]} ${month} ${m[1]}` : v.toUpperCase();
};

// { coach: 'C2', berth: 34, berthType: 'lower' } -> 'C2 / 34 / LOWER'
export const formatBerth = ({ coach, berth, berthType } = {}) =>
  [coach, berth, berthType].map((v) => clean(v).toUpperCase()).filter(Boolean).join(' / ') || '—';

// File-safe name for the download.
export const ticketFileName = (pnr) => {
  const safe = clean(pnr).replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'ticket';
  return `techxpress-ticket-${safe}.png`;
};

// Everything printed on the slip, formatted, from the API ticket.
export const ticketFields = (ticket = {}) => ({
  pnr: clean(ticket.pnr).toUpperCase() || '—',
  name: clean(ticket.name).toUpperCase() || '—',
  institution: clean(ticket.institution) || '—',
  domain: clean(ticket.domain) || '—',
  train: clean(ticket.train).toUpperCase() || `${EVENT.trainNo} ${EVENT.trainName}`,
  date: formatJourneyDate(ticket.date),
  berth: formatBerth(ticket),
  coach: clean(ticket.coach).toUpperCase() || '—',
  seat: clean(ticket.berth).toUpperCase() || '—',
  berthType: clean(ticket.berthType).toUpperCase() || '—',
});

// ── Drawing ───────────────────────────────────────────────────────────────

const C = {
  paper: '#F3E9D2',
  paperDeep: '#E9DAB8',
  ink: '#151320',
  inkSoft: '#4A4458',
  line: 'rgba(21, 19, 32, 0.16)',
  guilloche: 'rgba(142, 91, 208, 0.13)',
  guilloche2: 'rgba(24, 179, 176, 0.12)',
  pink: '#E8508A',
  yellow: '#F5B800',
  teal: '#18B3B0',
  red: '#C8102E',
};
const COND = "'Barlow Condensed', 'Arial Narrow', sans-serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const DEVA = "'Noto Sans Devanagari', sans-serif";

const font = (weight, size, family = COND) => `${weight} ${size}px ${family}`;

function drawSecurityLines(ctx, { width, height }) {
  ctx.save();
  ctx.lineWidth = 1;
  // Two families of interfering sine waves, like the guilloche on a ticket.
  for (let k = 0; k < 46; k += 1) {
    ctx.strokeStyle = k % 2 ? C.guilloche : C.guilloche2;
    ctx.beginPath();
    const y0 = 40 + k * 29;
    for (let x = 0; x <= width; x += 6) {
      const y = y0 + Math.sin(x / 47 + k * 0.6) * 11 + Math.sin(x / 13 + k) * 2.2;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Rosette behind the stamp area.
  ctx.strokeStyle = 'rgba(232, 80, 138, 0.10)';
  const cx = width - 230;
  const cy = height - 430;
  for (let r = 40; r < 190; r += 9) {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
      const rr = r + Math.sin(a * 12) * 6;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawMicrotextBorder(ctx, { width, height }) {
  ctx.save();
  ctx.fillStyle = 'rgba(21, 19, 32, 0.32)';
  ctx.font = font(600, 11);
  const unit = 'TECHXPRESS JN · 12026 · SOA · ';
  const run = unit.repeat(30);
  ctx.textBaseline = 'middle';
  ctx.fillText(run, 28, 22);
  ctx.fillText(run, 28, height - 22);
  ctx.translate(18, height - 28);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(run, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = 'rgba(21, 19, 32, 0.32)';
  ctx.font = font(600, 11);
  ctx.textBaseline = 'middle';
  ctx.translate(width - 18, 28);
  ctx.rotate(Math.PI / 2);
  ctx.fillText(run, 0, 0);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, width - 68, height - 68);
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, width - 80, height - 80);
}

function label(ctx, text, x, y) {
  ctx.fillStyle = C.inkSoft;
  ctx.font = font(700, 22);
  ctx.fillText(text.toUpperCase(), x, y);
}

function value(ctx, text, x, y, { maxWidth, maxSize = 46, minSize = 28, weight = 700, family = COND, color = C.ink }) {
  const fitted = fitText(text, {
    maxWidth,
    maxSize,
    minSize,
    measureAt: (size, s) => {
      ctx.font = font(weight, size, family);
      return ctx.measureText(s).width;
    },
  });
  ctx.font = font(weight, fitted.size, family);
  ctx.fillStyle = color;
  ctx.fillText(fitted.text, x, y);
}

function drawStamp(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.scale(0.86, 0.86);
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = C.red;
  ctx.fillStyle = C.red;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 104, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 134, 89, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(800, 104);
  ctx.fillText('CNF', 0, 4);
  ctx.font = font(700, 20);
  ctx.fillText(TICKET.stampTop, 0, -64);
  ctx.fillText(TICKET.stampBottom, 0, 70);
  // Worn ink: knock small specks out of the stamp.
  ctx.globalCompositeOperation = 'destination-out';
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 160; i += 1) {
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc((rand() - 0.5) * 320, (rand() - 0.5) * 220, rand() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Draws the slip and returns the canvas. Waits for the web fonts first.
export async function drawTicket(ticket, doc = document) {
  try {
    await doc.fonts?.ready;
    await Promise.all([
      doc.fonts?.load?.(font(800, 40)),
      doc.fonts?.load?.(font(700, 40)),
      doc.fonts?.load?.(font(700, 30, DEVA), 'टिकट'),
    ]);
  } catch {
    /* fall back to whatever fonts are available */
  }
  const f = ticketFields(ticket);
  const { width, height } = TICKET_SIZE;
  const canvas = doc.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  // Paper with a soft vignette.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, width, height);
  const vignette = ctx.createRadialGradient(width / 2, height / 2, 300, width / 2, height / 2, 900);
  vignette.addColorStop(0, 'rgba(255,255,255,0)');
  vignette.addColorStop(1, 'rgba(160,120,60,0.18)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  drawSecurityLines(ctx, TICKET_SIZE);
  drawMicrotextBorder(ctx, TICKET_SIZE);

  const L = 84;
  const R = width - 84;
  const W = R - L;

  // Header band.
  ctx.fillStyle = C.ink;
  ctx.fillRect(40, 40, width - 80, 150);
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = [C.pink, C.yellow, C.teal, '#8E5BD0'][i];
    ctx.fillRect(40 + ((width - 80) / 4) * i, 190, (width - 80) / 4, 10);
  }
  ctx.fillStyle = C.yellow;
  ctx.font = font(800, 50);
  ctx.fillText(TICKET.header, L, 118);
  ctx.fillStyle = C.paper;
  ctx.font = font(700, 26, DEVA);
  ctx.fillText(TICKET.headerHindi, L, 162);
  ctx.textAlign = 'right';
  ctx.font = font(700, 22);
  ctx.fillStyle = 'rgba(243,233,210,0.75)';
  ctx.fillText(TICKET.kind, R, 162);
  ctx.textAlign = 'left';

  // Train.
  let y = 280;
  label(ctx, TICKET.labels.train, L, y);
  // Train on the left, PNR right-aligned on the right, each shrunk to fit its
  // own share of the row with a clear gap between them.
  value(ctx, f.train, L, y + 58, { maxWidth: W * 0.54, maxSize: 64, minSize: 30, weight: 800 });
  ctx.textAlign = 'right';
  label(ctx, TICKET.labels.pnr, R, y);
  value(ctx, f.pnr, R, y + 58, { maxWidth: W * 0.38, maxSize: 58, minSize: 28, weight: 800 });
  ctx.textAlign = 'left';

  // FROM -> TO.
  y = 400;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y - 30);
  ctx.lineTo(R, y - 30);
  ctx.stroke();
  label(ctx, TICKET.labels.from, L, y + 10);
  label(ctx, TICKET.labels.to, L + W * 0.56, y + 10);
  ctx.fillStyle = C.ink;
  ctx.font = font(800, 92);
  ctx.fillText(TICKET.from, L, y + 104);
  value(ctx, TICKET.to, L + W * 0.56, y + 104, { maxWidth: W * 0.44, maxSize: 92, minSize: 48, weight: 800 });
  // Track arrow between the stations.
  const ax0 = L + 220;
  const ax1 = L + W * 0.56 - 40;
  const ay = y + 70;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(ax0, ay);
  ctx.lineTo(ax1, ay);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let x = ax0 + 8; x < ax1 - 20; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, ay - 10);
    ctx.lineTo(x, ay + 10);
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(ax1 + 8, ay);
  ctx.lineTo(ax1 - 16, ay - 14);
  ctx.lineTo(ax1 - 16, ay + 14);
  ctx.closePath();
  ctx.fill();

  // Details grid.
  y = 590;
  const rows = [
    [[TICKET.labels.date, f.date], [TICKET.labels.departure, TICKET.departure]],
    [[TICKET.labels.passenger, f.name, true]],
    [[TICKET.labels.institution, f.institution, true]],
    [[TICKET.labels.cls, f.domain, true]],
    [[TICKET.labels.coach, f.coach], [TICKET.labels.berth, f.seat], [TICKET.labels.berthType, f.berthType]],
  ];
  for (const row of rows) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L, y - 34);
    ctx.lineTo(R, y - 34);
    ctx.stroke();
    const colW = W / row.length;
    row.forEach(([lab, val, wide], i) => {
      const x = L + colW * i;
      label(ctx, lab, x, y);
      const mono = lab === TICKET.labels.institution || lab === TICKET.labels.cls;
      value(ctx, val, x, y + 50, {
        maxWidth: (wide ? W * 0.66 : colW) - 24,
        maxSize: wide && !mono ? 50 : 40,
        minSize: 26,
        weight: mono ? 600 : 700,
        family: mono ? SANS : COND,
      });
    });
    y += 112;
  }

  // Over the right of the institution / class rows, clear of the values.
  drawStamp(ctx, width - 215, 872);

  // Perforation and footer.
  y = height - 190;
  ctx.fillStyle = C.paperDeep;
  ctx.fillRect(40, y, width - 80, 150);
  ctx.strokeStyle = C.ink;
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(width - 40, y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Barcode-ish bars from the PNR (decorative).
  let bx = L;
  const code = `${f.pnr}${f.name}`;
  for (let i = 0; i < 64 && bx < L + 300; i += 1) {
    const w = 2 + ((code.charCodeAt(i % code.length) + i) % 4) * 2;
    ctx.fillStyle = C.ink;
    ctx.fillRect(bx, y + 34, w, 70);
    bx += w + 4;
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink;
  const footW = W - 340;
  const foot = fitText(PNR.ticketFooter, {
    maxWidth: footW,
    maxSize: 26,
    minSize: 18,
    measureAt: (size, t) => {
      ctx.font = font(700, size);
      return ctx.measureText(t).width;
    },
  });
  ctx.font = font(700, foot.size);
  ctx.fillText(foot.text, R, y + 64);
  ctx.font = font(600, 22);
  ctx.fillStyle = C.inkSoft;
  ctx.fillText(truncateToWidth(TICKET.footerSmall, footW, (t) => ctx.measureText(t).width), R, y + 100);
  ctx.textAlign = 'left';

  return canvas;
}

const toBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the ticket image.'))), 'image/png');
  });

export async function ticketBlob(ticket) {
  return toBlob(await drawTicket(ticket));
}

export async function downloadTicket(ticket) {
  const blob = await ticketBlob(ticket);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ticketFileName(ticket?.pnr);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const canShareFiles = () => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof File === 'undefined') return false;
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

// Resolves false when the visitor dismissed the share sheet.
export async function shareTicket(ticket) {
  const blob = await ticketBlob(ticket);
  const file = new File([blob], ticketFileName(ticket?.pnr), { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: TICKET.shareTitle, text: TICKET.shareText });
    return true;
  } catch (err) {
    if (err?.name === 'AbortError') return false;
    throw err;
  }
}
