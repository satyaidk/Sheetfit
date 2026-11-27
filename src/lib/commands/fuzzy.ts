/**
 * Fuzzy search for the command palette.
 *
 * Why not plain `includes`: people type fragments ("fill", "a3", "dark"),
 * initials ("fs" for Fill sheet) or a few letters in order ("mrr" for Mirror).
 * Every query word must match; better kinds of match score higher, in the
 * order users expect from VS Code, GitHub and Office search: the whole title,
 * a title prefix, a word prefix, initials, a substring, letters in order.
 * Pure and deterministic, so it is tested in Node.
 */

export interface TextMatch {
  score: number;
  /** Matched character ranges in the original text, [start, end), sorted. */
  ranges: [number, number][];
}

/** Lower case without accents, same length as the input for plain Latin text. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const isWordChar = (c: string | undefined) => !!c && /[a-z0-9]/.test(c);

/** Indices where a word starts (after a space, punctuation, or between a digit and a letter). */
function wordStarts(t: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < t.length; i++) {
    const prev = t[i - 1];
    const c = t[i];
    if (!isWordChar(c)) continue;
    if (i === 0 || !isWordChar(prev) || (/[0-9]/.test(prev!) !== /[0-9]/.test(c))) out.push(i);
  }
  return out;
}

/** Score one query word against one text; null when it does not match at all. */
export function matchWord(word: string, text: string): TextMatch | null {
  const q = normalize(word);
  const t = normalize(text);
  if (!q) return { score: 0, ranges: [] };
  if (t === q) return { score: 100, ranges: [[0, t.length]] };
  if (t.startsWith(q)) return { score: 80, ranges: [[0, q.length]] };
  const starts = wordStarts(t);
  for (const i of starts) if (t.startsWith(q, i)) return { score: 64, ranges: [[i, i + q.length]] };
  // Initials: "fs" -> Fill sheet, "ar" -> Auto Arrange.
  if (q.length >= 2 && /^[a-z0-9]+$/.test(q)) {
    const ranges: [number, number][] = [];
    let k = 0;
    for (const i of starts) {
      if (k < q.length && t[i] === q[k]) {
        ranges.push([i, i + 1]);
        k++;
      }
    }
    if (k === q.length) return { score: 52, ranges };
  }
  const at = t.indexOf(q);
  if (at >= 0) return { score: 40, ranges: [[at, at + q.length]] };
  // Letters in order, with a bonus for runs and word starts; three letters or more.
  if (q.length >= 3) {
    const ranges: [number, number][] = [];
    let k = 0;
    let bonus = 0;
    let last = -2;
    for (let i = 0; i < t.length && k < q.length; i++) {
      if (t[i] !== q[k]) continue;
      if (i === last + 1) {
        bonus += 2;
        ranges[ranges.length - 1][1] = i + 1;
      } else ranges.push([i, i + 1]);
      if (starts.includes(i)) bonus += 3;
      last = i;
      k++;
    }
    if (k === q.length) return { score: 10 + Math.min(20, bonus), ranges };
  }
  return null;
}

export interface Searchable {
  title: string;
  keywords?: string[];
  group?: string;
}

export interface RankedItem<T> {
  item: T;
  score: number;
  /** Ranges to highlight in the title. */
  ranges: [number, number][];
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const r of sorted) {
    const prev = out[out.length - 1];
    if (prev && r[0] <= prev[1]) prev[1] = Math.max(prev[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

/**
 * Rank items for a query. An empty query keeps every item in its given order.
 * Each query word must match the title, a keyword or the group; title matches
 * count fully, keywords at 70 %, the group name at 40 %.
 */
export function rankItems<T extends Searchable>(query: string, items: readonly T[]): RankedItem<T>[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items.map((item) => ({ item, score: 0, ranges: [] }));
  const ranked: (RankedItem<T> & { index: number })[] = [];
  items.forEach((item, index) => {
    let total = 0;
    const ranges: [number, number][] = [];
    for (const w of words) {
      const inTitle = matchWord(w, item.title);
      let best = inTitle ? inTitle.score : 0;
      for (const k of item.keywords ?? []) {
        const m = matchWord(w, k);
        if (m) best = Math.max(best, m.score * 0.7);
      }
      if (item.group) {
        const m = matchWord(w, item.group);
        if (m) best = Math.max(best, m.score * 0.4);
      }
      if (best === 0) return;
      total += best;
      if (inTitle && inTitle.score >= best) ranges.push(...inTitle.ranges);
    }
    // The whole query as typed, at the start of the title, beats scattered words.
    if (words.length > 1 && normalize(item.title).startsWith(normalize(words.join(" ")))) total += 30;
    ranked.push({ item, score: total, ranges: mergeRanges(ranges), index });
  });
  ranked.sort((a, b) => b.score - a.score || a.item.title.length - b.item.title.length || a.index - b.index);
  return ranked.map(({ item, score, ranges }) => ({ item, score, ranges }));
}
