#!/usr/bin/env node
/**
 * update-usage.mjs
 *
 * Fetches current competitive usage rankings from Limitless VGC and writes
 * an updated public/data/pokemon_usage.json.
 *
 * Usage:
 *   node scripts/update-usage.mjs                  # fetch all pages, write file
 *   node scripts/update-usage.mjs --pages 3        # fetch only 3 pages
 *   node scripts/update-usage.mjs --dry-run        # print JSON to stdout, no write
 *
 * Data source: https://limitlessvgc.com/pokemon?time=all&type=all&format=all&region=all
 *
 * How it works:
 *   Each <tr> row contains an <img class="pokemon" alt="IDENTIFIER"> whose alt
 *   attribute is already a PokeAPI-style kebab-case identifier. A small correction
 *   map handles the handful of cases where Limitless identifiers differ from the
 *   ones in the app's pokemon.csv (e.g. Limitless "urshifu" → app "urshifu-single-strike").
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../public/data/pokemon_usage.json');
const BASE_URL = 'https://limitlessvgc.com/pokemon?time=all&type=all&format=all&region=all';

// ── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const pageFlag = args.indexOf('--pages');
const MAX_PAGES = pageFlag !== -1 ? Number(args[pageFlag + 1]) : 21;
const DRY_RUN = args.includes('--dry-run');

// ── Identifier correction map ─────────────────────────────────────────────────
//
// Limitless uses simpler identifiers for a handful of Pokémon that have form
// suffixes in the app's pokemon.csv (derived from PokeAPI).
// Add entries here if future scrapes surface new mismatches.
//
// Format: "limitless-alt-value": "app-pokemon-csv-identifier"

const LIMITLESS_TO_APP_ID = {
  // Incarnate Formes — app suffixes these; Limitless uses the bare name
  'tornadus':                  'tornadus-incarnate',
  'thundurus':                 'thundurus-incarnate',
  'landorus':                  'landorus-incarnate',
  'enamorus':                  'enamorus-incarnate',

  // Single Strike Urshifu — Limitless omits the form suffix
  'urshifu':                   'urshifu-single-strike',

  // Default Indeedee / Maushold / Basculegion / Tatsugiri
  // — app includes the gender/form suffix on the default entry
  'indeedee':                  'indeedee-male',
  'maushold':                  'maushold-family-of-four',
  'basculegion':               'basculegion-male',
  'tatsugiri':                 'tatsugiri-curly',

  // Lycanroc — app identifier for midday (default) form
  'lycanroc':                  'lycanroc-midday',

  // Darmanitan — Galarian standard form
  'darmanitan-galar':          'darmanitan-galar-standard',
};

// ── HTML parsing ─────────────────────────────────────────────────────────────
//
// The Limitless table structure (note: <tr> tags are NOT self-closed):
//
//   <tr>
//     <td>1</td>
//     <td><img class="pokemon" src="..." alt="incineroar"></td>
//     <td><a href="/pokemon/incineroar">Incineroar</a></td>
//     <td>31305</td>
//     <td>33.65%</td>
//   <tr>
//     ...
//
// Strategy: extract (rank, identifier) pairs by scanning for
// <img class="pokemon" alt="..."> and the rank in the preceding <td>.

function parseRankings(html) {
  const results = [];

  // Match all pokemon image tags: captures the alt (= identifier)
  const imgRe = /<img\s[^>]*class="pokemon"[^>]*alt="([^"]+)"[^>]*>/gi;
  // Match all <td>...</td> to find rank numbers
  const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  // Build a flat list of all <td> text values and img alt values, in document order
  // by scanning the HTML once.
  const tokens = []; // { type: 'td' | 'img', value: string, pos: number }

  let m;
  const tdReCopy = new RegExp(tdRe.source, tdRe.flags);
  while ((m = tdReCopy.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    tokens.push({ type: 'td', value: text, pos: m.index });
  }

  const imgReCopy = new RegExp(imgRe.source, imgRe.flags);
  while ((m = imgReCopy.exec(html)) !== null) {
    tokens.push({ type: 'img', value: m[1], pos: m.index });
  }

  tokens.sort((a, b) => a.pos - b.pos);

  // Scan tokens: when we see an img, the most recent numeric td is the rank
  let currentRank = null;
  for (const tok of tokens) {
    if (tok.type === 'td') {
      const n = Number(tok.value);
      if (!Number.isNaN(n) && n > 0 && n < 10000) currentRank = n;
    } else if (tok.type === 'img' && currentRank !== null) {
      results.push({ rank: currentRank, identifier: tok.value });
    }
  }

  return results;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchPage(page) {
  const url = `${BASE_URL}&page=${page}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'pokemon-counter usage-updater (https://github.com/kameelyan/pokemon-ohko-finder)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for page ${page}`);
  return res.text();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching up to ${MAX_PAGES} page(s) from Limitless VGC…`);
  console.log(`URL: ${BASE_URL}\n`);

  const rankings = {}; // app-identifier → rank number

  for (let page = 1; page <= MAX_PAGES; page++) {
    process.stdout.write(`  Page ${page}/${MAX_PAGES}… `);

    let html;
    try {
      html = await fetchPage(page);
    } catch (e) {
      console.log(`✗ ${e.message}`);
      break;
    }

    const rows = parseRankings(html);

    if (rows.length === 0) {
      console.log('no entries found — done.');
      break;
    }

    let added = 0;
    for (const { rank, identifier } of rows) {
      const appId = LIMITLESS_TO_APP_ID[identifier] ?? identifier;
      if (!(appId in rankings)) {          // first occurrence wins (handles ties)
        rankings[appId] = rank;
        added++;
      }
    }

    const lastRank = rows.at(-1)?.rank ?? '?';
    console.log(`${added} entries (last rank: ${lastRank})`);

    // Polite delay between requests
    if (page < MAX_PAGES) await new Promise(r => setTimeout(r, 350));
  }

  const total = Object.keys(rankings).length;
  console.log(`\nTotal: ${total} Pokémon mapped.`);

  const output = {
    source: 'Limitless VGC',
    url: BASE_URL,
    updated: new Date().toISOString().slice(0, 10),
    rankings,
  };

  if (DRY_RUN) {
    console.log('\n--- DRY RUN (stdout only, file not written) ---\n');
    console.log(JSON.stringify(output, null, 2));
  } else {
    writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n');
    console.log(`\n✓ Written to ${OUTPUT_PATH}`);
    console.log('  Commit the updated file and deploy to refresh usage rankings.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
