/* Translations for the account and the staff console: English is the key, Estonian and Russian dictionaries map it.
   t()  translates interface text, with {placeholders}.
   tr() translates text that comes from the server (statuses, notifications, toasts), including patterns and dates.
   The same dictionaries can be shipped to the mobile app. */
import ET from './dict.et.js';
import RU from './dict.ru.js';

export const LANGS = [['en', 'EN', 'English'], ['et', 'ET', 'Eesti'], ['ru', 'RU', 'Русский']];
const DICTS = { et: ET, ru: RU };
const LOCALE = { en: 'en-GB', et: 'et-EE', ru: 'ru-RU' };
let lang = 'en';
let patterns = {};

function compile(d) {
  // Entries with {placeholders} become patterns to match server text like "Terms sent to Mart Kask".
  return Object.keys(d).filter(k => k.includes('{')).map(k => {
    const names = [];
    const src = k.split(/(\{\w+\})/).map(part => {
      const m = /^\{(\w+)\}$/.exec(part);
      if (m) { names.push(m[1]); return '(.+?)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return { re: new RegExp('^' + src + '$', 's'), names, to: d[k] };
  }).sort((a, b) => b.re.source.length - a.re.source.length);
}

export function detectLang() {
  let l = null;
  try { l = localStorage.getItem('aw-lang'); } catch { /* storage blocked */ }
  if (!l) { const n = (navigator.language || 'en').slice(0, 2); l = n === 'et' || n === 'ru' ? n : 'en'; }
  return DICTS[l] || l === 'en' ? l : 'en';
}
export function setLang(l) {
  lang = DICTS[l] ? l : 'en';
  if (lang !== 'en' && !patterns[lang]) patterns[lang] = compile(DICTS[lang]);
  try { localStorage.setItem('aw-lang', lang); } catch { /* storage blocked */ }
  document.documentElement.lang = lang === 'et' ? 'et-EE' : lang;
}
export const getLang = () => lang;
export const locale = () => LOCALE[lang];

const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;

/** Interface text. */
export function t(s, vars) {
  if (lang === 'en') return fill(s, vars);
  const hit = DICTS[lang][s];
  return fill(hit || s, vars);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON_L = {
  et: ['jaan', 'veebr', 'märts', 'apr', 'mai', 'juuni', 'juuli', 'aug', 'sept', 'okt', 'nov', 'dets'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
};
const WD_L = { et: ['E', 'T', 'K', 'N', 'R', 'L', 'P'], ru: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] };
/** "Thu 24 Sep" → "N 24. sept" / "чт 24 сен". */
function dates(s) {
  if (lang === 'en') return s;
  return s
    .replace(/\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, (m, d, mo) => lang === 'et' ? `${d}. ${MON_L.et[MON.indexOf(mo)]}` : `${d} ${MON_L.ru[MON.indexOf(mo)]}`)
    .replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, w => WD_L[lang][WD.indexOf(w)])
    .replace(/\bin (\d+) days\b/g, (m, n) => lang === 'et' ? `${n} päeva pärast` : `через ${n} дн.`)
    .replace(/\btomorrow\b/g, lang === 'et' ? 'homme' : 'завтра')
    .replace(/\btoday\b/g, lang === 'et' ? 'täna' : 'сегодня')
    .replace(/^now$/, lang === 'et' ? 'praegu' : 'сейчас')
    .replace(/^(\d+) min$/, (m, n) => lang === 'et' ? `${n} min` : `${n} мин`);
}

/** Server text: exact match, then patterns (placeholders are translated too when they are known phrases), then dates. */
export function tr(s) {
  if (s == null) return '';
  s = String(s);
  if (lang === 'en' || !s) return s;
  const d = DICTS[lang];
  if (d[s]) return d[s];
  for (const p of patterns[lang] || []) {
    const m = p.re.exec(s);
    if (m) {
      const vars = {}; p.names.forEach((k, i) => { vars[k] = tr(m[i + 1]); });
      return dates(fill(p.to, vars));
    }
  }
  // Composite strings joined with " · ": translate each part.
  if (s.includes(' · ')) return s.split(' · ').map(tr).join(' · ');
  return dates(s);
}

/** Money: €1,200 in English, 1 200 € in Estonian and Russian. */
export function eur(n) {
  const v = Number(n || 0);
  const num = v.toLocaleString(LOCALE[lang], { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return lang === 'en' ? '€' + num : num + ' €';
}
export function fmtTime(ms) { return new Date(ms).toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit' }); }
export function fmtDayLong(ms) {
  const d = new Date(ms), today = new Date();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t('Today');
  if (d.toDateString() === y.toDateString()) return t('Yesterday');
  return d.toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}
export function fmtSlot(d) { return d.toLocaleString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
