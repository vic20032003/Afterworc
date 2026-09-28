/* All dictionaries merged: English key → [Estonian, Russian]. Server texts win on clashes. */
import ui1 from './ui1.js';
import ui2 from './ui2.js';
import lists from './lists.js';
import server from './server.js';
const all = { ...ui1, ...ui2, ...lists, ...server, 'Online now': ['Võrgus', 'В сети'] };
export const pick = i => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v[i]]));
export default all;
