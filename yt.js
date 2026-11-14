#!/usr/bin/env node
// YouTube outreach list builder. No dependencies (Node 18+).
//
//   node yt.js search "indie game review" --niche gaming --region US --pages 2 --min 5000 --max 500000 [--more true]
//   node yt.js export            -> data/channels.csv
//   node yt.js serve [port]      -> sortable table at http://localhost:3550

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
// When compiled to an .exe (Deno), keep data and settings next to the exe, not inside it.
const COMPILED = typeof Deno !== 'undefined' && !/(^|[\\/])deno(\.exe)?$/i.test(process.execPath);
const APP_DIR = COMPILED ? path.dirname(process.execPath) : ROOT;
const ENV_FILE = path.join(APP_DIR, '.env');
const DATA_DIR = path.join(APP_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'channels.json');
const CSV_FILE = path.join(DATA_DIR, 'channels.csv');
const API = 'https://www.googleapis.com/youtube/v3';

// ---------- env ----------
function loadEnv() {
  const f = ENV_FILE;
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

// ---------- db ----------
function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { return {}; }
}
function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 1));
}

// ---------- api ----------
let unitsUsed = 0;
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const DAILY_LIMIT = 10000;
const pacificDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
function getUsage() {
  try {
    const u = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    if (u.date === pacificDay()) return u;
  } catch {}
  return { date: pacificDay(), units: 0 };
}
function addUsage(n) {
  const u = getUsage(); u.units += n;
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(USAGE_FILE, JSON.stringify(u)); } catch {}
}
async function api(endpoint, params, cost) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('Please add your YouTube API key first (click "API key" at the top right).');
  const url = `${API}/${endpoint}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    const reason = json.error?.errors?.[0]?.reason || res.status;
    if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || /quota/i.test(json.error?.message || '')) { addUsage(Math.max(0, DAILY_LIMIT - getUsage().units)); throw new Error('Google\'s daily allowance for this API key is used up. It resets at midnight Pacific time (about 3 am Eastern). Everything found so far is saved.'); }
    if (reason === 'keyInvalid' || reason === 'badRequest' && /API key/i.test(json.error?.message || '')) throw new Error('Google rejected the API key. Open "API key" at the top right and paste it again.');
    throw new Error(`API error (${reason}): ${json.error?.message}`);
  }
  unitsUsed += cost;
  addUsage(cost);
  return json;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Pull contact-ish links (website, socials) out of a channel description.
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const BARE_RE = /(?:^|[\s(])((?:www\.)?(?:instagram\.com|twitter\.com|x\.com|tiktok\.com|twitch\.tv|discord\.gg|facebook\.com|linktr\.ee|patreon\.com)\/[^\s<>"')\]]+)/gi;
function extractLinks(desc) {
  const out = new Set();
  for (const m of desc.matchAll(URL_RE)) out.add(m[0].replace(/[.,;:!?]+$/, ''));
  for (const m of desc.matchAll(BARE_RE)) out.add('https://' + m[1].replace(/[.,;:!?]+$/, ''));
  return [...out].filter((u) => { try { const h = new URL(u).hostname; return !/(^|\.)(youtube\.com|youtu\.be)$/.test(h); } catch { return false; } }).slice(0, 8);
}

// Find the creator's X / Twitter handle from their links, or from text like "Twitter: @name".
const TW_SKIP = new Set(['intent', 'share', 'home', 'i', 'hashtag', 'search', 'login', 'explore', 'settings', 'privacy', 'tos', 'about']);
function extractTwitter(desc, links) {
  for (const u of links || []) {
    try {
      const x = new URL(u);
      if (!/^(www\.|mobile\.)?(twitter|x)\.com$/i.test(x.hostname)) continue;
      const h = x.pathname.split('/').filter(Boolean)[0];
      if (h && /^[A-Za-z0-9_]{1,15}$/.test(h) && !TW_SKIP.has(h.toLowerCase())) return h;
    } catch {}
  }
  const m = (desc || '').match(/(?:twitter|𝕏|\bx)\s*(?:\/\s*twitter)?\s*[:\-–|]\s*@([A-Za-z0-9_]{1,15})\b/i);
  return m ? m[1] : '';
}

function topicNames(topicDetails) {
  return (topicDetails?.topicCategories || [])
    .map((u) => decodeURIComponent(u.split('/').pop()).replace(/_/g, ' '));
}

async function fetchChannels(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const json = await api('channels', {
      part: 'snippet,statistics,topicDetails,brandingSettings,contentDetails',
      id: batch.join(','),
      maxResults: 50,
    }, 1);
    out.push(...(json.items || []));
  }
  return out;
}

async function lastUploadDates(items) {
  // playlistItems costs 1 unit per channel; gives last upload date for activity filtering
  const map = {};
  for (const ch of items) {
    const pl = ch.contentDetails?.relatedPlaylists?.uploads;
    if (!pl) continue;
    try {
      const j = await api('playlistItems', { part: 'contentDetails', playlistId: pl, maxResults: 1 }, 1);
      map[ch.id] = j.items?.[0]?.contentDetails?.videoPublishedAt || '';
    } catch { map[ch.id] = ''; }
  }
  return map;
}

function toRecord(ch, niche, keyword, lastUpload) {
  const s = ch.snippet || {};
  const st = ch.statistics || {};
  const desc = s.description || '';
  const emails = [...new Set((desc.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))];
  return {
    id: ch.id,
    name: s.title || '',
    url: s.customUrl ? `https://www.youtube.com/${s.customUrl}` : `https://www.youtube.com/channel/${ch.id}`,
    subscribers: st.hiddenSubscriberCount ? null : Number(st.subscriberCount || 0),
    videos: Number(st.videoCount || 0),
    views: Number(st.viewCount || 0),
    handle: s.customUrl || '',
    thumb: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '',
    links: extractLinks(desc),
    twitter: extractTwitter(desc, extractLinks(desc)),
    country: s.country || '',
    niche: niche || '',
    keyword: keyword || '',
    topics: topicNames(ch.topicDetails).join('; '),
    email: emails.join('; '),
    lastUpload: lastUpload || '',
    created: (s.publishedAt || '').slice(0, 10),
    description: desc.replace(/\s+/g, ' ').slice(0, 300),
    status: 'new', // new | contacted | replied | skip  (edit in data/channels.json)
    addedAt: new Date().toISOString().slice(0, 10),
  };
}

// ---------- commands ----------
function parseArgs(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, flags };
}

async function cmdSearch(pos, flags) {
  const keyword = pos.join(' ');
  if (!keyword) throw new Error('Usage: node yt.js search "<keyword>" [--niche x] [--region US] [--lang en] [--min N] [--max N] [--target 60]');
  const r = await runSearch({ keyword, ...flags });
  console.log(`Added ${r.added} new, refreshed ${r.updated} (looked at ${r.examined} channels). Total in db: ${r.total}`);
  if (r.exhausted) console.log('No more channels available for this search.');
  console.log(`Quota used this run: ~${r.units} / 10000 units`);
  cmdExport();
}

// ---------- resumable search ----------
// A search "session" remembers where it stopped, so each "Find more" continues
// instead of repeating work. Strategies are tried in order, one page (50) at a time.
const STRATEGIES = [
  ['channel', 'relevance'], ['video', 'relevance'],
  ['channel', 'viewCount'], ['video', 'viewCount'],
  ['channel', 'date'], ['video', 'date'],
];
const FIRST_TARGET = 60;      // first search: at least this many matching channels
const MORE_TARGET = 50;       // each "Find more": this many additional ones
const MAX_PAGES_PER_CLICK = 15; // safety cap (~1500 quota units) per click
let session = null;

function newSession(opts, keyword) {
  return {
    key: JSON.stringify([keyword.toLowerCase(), opts.region || '', opts.lang || '', opts.min || '', opts.max || '']),
    strategies: STRATEGIES.map(([type, order]) => ({ type, order, token: null, done: false })),
    examined: new Set(),
    exhausted: false,
  };
}

// Shared by the CLI and the web UI.
// opts.more=true continues the current search; otherwise a new search starts
// (unless it is identical to the current one, in which case it simply continues).
async function runSearch(opts) {
  // "Find more" always continues the last search with its original settings.
  if ((opts.more === true || opts.more === "true") && session) opts = { ...session.opts, more: true, target: opts.target };
  const keyword = String(opts.keyword || '').trim();
  if (!keyword) throw new Error('Please type what kind of channels you are looking for.');
  const startUnits = unitsUsed;
  const min = Number(opts.min || 0);
  const max = Number(opts.max || Infinity);
  const more = opts.more === true || opts.more === 'true';
  const db = loadDb();

  const fresh = newSession(opts, keyword);
  let continuing = false;
  if (more) {
    if (!session) throw new Error('Run a search first, then use Find more.');
    continuing = true;
  } else if (session && session.key === fresh.key) {
    continuing = true; // same search again: don't waste quota repeating pages
  } else {
    session = fresh;
    session.opts = { keyword, niche: opts.niche, region: opts.region, lang: opts.lang, min: opts.min, max: opts.max };
  }
  const s = session;
  const target = Number(opts.target) || (more ? MORE_TARGET : FIRST_TARGET);
  // For a repeated identical search, make sure the user gets another full batch.
  const wanted = target;

  let added = 0, updated = 0, gained = 0, pagesUsed = 0, partial = '';

  while (gained < wanted && pagesUsed < MAX_PAGES_PER_CLICK) {
    const strat = s.strategies.find((x) => !x.done);
    if (!strat) { s.exhausted = true; break; }

    const params = { part: 'snippet', type: strat.type, q: keyword, maxResults: 50, order: strat.order };
    if (opts.region) params.regionCode = opts.region;
    if (opts.lang) params.relevanceLanguage = opts.lang;
    if (strat.token) params.pageToken = strat.token;

    let json;
    try {
      json = await api('search', params, 100);
    } catch (e) {
      if (gained === 0 && added === 0 && updated === 0) throw e;
      partial = e.message;
      break;
    }
    pagesUsed++;
    strat.token = json.nextPageToken || null;
    if (!strat.token) strat.done = true;

    const ids = [...new Set((json.items || []).map((it) => it.snippet?.channelId || it.id?.channelId))]
      .filter((id) => id && !s.examined.has(id));
    ids.forEach((id) => s.examined.add(id));
    if (!ids.length) continue;

    let channels;
    try {
      channels = await fetchChannels(ids);
    } catch (e) { partial = e.message; break; }
    channels = channels.filter((c) => {
      const n = c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount || 0);
      return n !== null && n >= min && n <= max;
    });
    const lastUp = await lastUploadDates(channels);

    for (const ch of channels) {
      const rec = toRecord(ch, opts.niche || keyword, keyword, lastUp[ch.id]);
      if (db[ch.id]) {
        // refresh stats but keep outreach status
        rec.status = db[ch.id].status || 'new';
        rec.addedAt = db[ch.id].addedAt || rec.addedAt;
        rec.niche = db[ch.id].niche || rec.niche;
        updated++;
      } else added++;
      db[ch.id] = rec;
      if (!sessionIds.has(ch.id)) { sessionIds.add(ch.id); gained++; }
    }
    saveDb(db); // save as we go so nothing is lost if a later page fails
  }

  if (!s.strategies.some((x) => !x.done)) s.exhausted = true;
  return {
    added, updated, gained, examined: s.examined.size,
    total: Object.keys(db).length, units: unitsUsed - startUnits,
    exhausted: s.exhausted, partial,
    reachedLimit: !s.exhausted && !partial && gained < wanted, // hit the per-click cap
  };
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function cmdExport() {
  const rows = Object.values(loadDb()).sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));
  const cols = ['name', 'url', 'subscribers', 'niche', 'country', 'email', 'twitter', 'links', 'videos', 'views', 'lastUpload', 'created', 'topics', 'status', 'description', 'id'];
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CSV_FILE, [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(Array.isArray(r[c]) ? r[c].join(' | ') : r[c])).join(','))].join('\n'));
  console.log(`Exported ${rows.length} rows -> ${CSV_FILE}`);
}

const APP_VERSION = '1.0.0';

// Older saved channels lack a picture / contact links: fetch them (1 quota unit per 50 channels).
let backfilling = false;
async function backfill() {
  if (backfilling || !process.env.YOUTUBE_API_KEY) return;
  backfilling = true;
  try {
    const db = loadDb();
    const missing = Object.values(db).filter((r) => r.thumb === undefined).map((r) => r.id);
    for (let i = 0; i < missing.length; i += 50) {
      const items = await fetchChannels(missing.slice(i, i + 50));
      const fresh = loadDb();
      for (const ch of items) {
        const old = fresh[ch.id]; if (!old) continue;
        const rec = toRecord(ch, old.niche, old.keyword, old.lastUpload);
        fresh[ch.id] = { ...rec, status: old.status, addedAt: old.addedAt, niche: old.niche, lastUpload: old.lastUpload };
      }
      for (const id of missing.slice(i, i + 50)) if (fresh[id] && fresh[id].thumb === undefined) fresh[id].thumb = ''; // gone/private: don't retry forever
      saveDb(fresh);
    }
  } catch (e) { console.log('Could not refresh saved channels yet: ' + e.message); }
  backfilling = false;
}

let searching = false;
const sessionIds = new Set(); // channels found since the server started (page opens empty)
function cmdServe(port = 3550, openBrowser = false) {
  http.createServer((req, res) => {
    if (req.url.startsWith('/api/channels')) {
      const all = new URL(req.url, 'http://x').searchParams.get('all') === '1';
      const db = loadDb();
      const list = (all ? Object.values(db) : [...sessionIds].map((id) => db[id]).filter(Boolean))
        .map((r) => (r.twitter === undefined ? { ...r, twitter: extractTwitter(r.description, r.links) } : r));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ rows: list, saved: Object.keys(db).length, canMore: !!session && !session.exhausted, hasKey: !!process.env.YOUTUBE_API_KEY, usage: getUsage().units, limit: DAILY_LIMIT }));
    }
    if (req.url === '/api/settings') {
      const k = process.env.YOUTUBE_API_KEY || '';
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ hasKey: !!k, keyHint: k ? k.slice(0, 4) + '••••••••' + k.slice(-4) : '', usage: getUsage().units, limit: DAILY_LIMIT, version: APP_VERSION }));
    }
    if (req.method === 'POST' && req.url === '/api/key') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', async () => {
        const key = String(JSON.parse(body || '{}').key || '').trim();
        const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
        if (key === '') { // remove the saved key
          try { fs.rmSync(ENV_FILE, { force: true }); } catch {}
          delete process.env.YOUTUBE_API_KEY;
          return send(200, { ok: true, removed: true });
        }
        if (!/^[A-Za-z0-9_-]{20,}$/.test(key)) return send(400, { error: 'That does not look like a valid API key. Copy it again from Google Cloud.' });
        // verify the key with a cheap call (1 unit) before saving
        try {
          const r = await fetch(`${API}/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${key}`);
          if (!r.ok) throw new Error((await r.json()).error?.message || 'rejected');
        } catch (e) { return send(400, { error: 'Google rejected this key: ' + e.message }); }
        fs.writeFileSync(ENV_FILE, `YOUTUBE_API_KEY=${key}\n`);
        process.env.YOUTUBE_API_KEY = key;
        send(200, { ok: true });
        backfill();
      });
      return;
    }
    if (req.url === '/api/export.csv') {
      cmdExport();
      res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="youtubers.csv"' });
      return res.end(fs.readFileSync(CSV_FILE));
    }
    if (req.method === 'POST' && req.url === '/api/search') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', async () => {
        const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
        if (searching) return send(409, { error: 'A search is already running. Please wait a moment.' });
        searching = true;
        try {
          send(200, await runSearch(JSON.parse(body || '{}')));
        } catch (e) {
          send(400, { error: e.message });
        } finally { searching = false; }
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/api/status') {
      let body = '';
      req.on('data', (d) => (body += d));
      req.on('end', () => {
        const { id, status } = JSON.parse(body || '{}');
        const db = loadDb();
        if (db[id] && ['new', 'contacted', 'replied', 'skip'].includes(status)) { db[id].status = status; saveDb(db); }
        res.writeHead(204); res.end();
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(ROOT, 'index.html')));
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') { console.log(`Already running, opening http://localhost:${port}`); if (openBrowser) openUrl(`http://localhost:${port}`); }
    else console.error(e.message);
  }).listen(port, '127.0.0.1', () => {
    backfill();
    console.log(`YouTuber Finder is running at http://localhost:${port}`);
    console.log('Leave this window open while you use it. Close it to stop the app.');
    if (openBrowser) openUrl(`http://localhost:${port}`);
  });
}

async function openUrl(url) {
  const { spawn } = await import('node:child_process');
  const [c, a] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(c, a, { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); } catch {}
}

// ---------- main ----------
const [cmd, ...rest] = process.argv.slice(2);
const { pos, flags } = parseArgs(rest);
try {
  if (cmd === 'search') await cmdSearch(pos, flags);
  else if (cmd === 'export') cmdExport();
  else if (cmd === 'serve') cmdServe(Number(pos[0]) || 3550, COMPILED);
  else if (!cmd) cmdServe(3550, true);   // double-clicked: start the app and open the browser
  else console.log('Commands: search | export | serve');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
