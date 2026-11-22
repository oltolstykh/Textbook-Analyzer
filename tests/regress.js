/* Проверка воспроизводимости чисел на примере – оба режима.
   node tests/regress.js           – сравнить с tests/snapshot.json
   node tests/regress.js --update  – записать новый снимок (после намеренного изменения эталонов или ядра)
   Любое расхождение печатается с путём к значению – так видно, что изменило улучшение лемматизатора или эталонов. */
const path = require('path'), fs = require('fs');
const root = path.resolve(__dirname, '..');
global.window = global;
['resources', 'lexicon', 'cefrj', 'parse', 'core', 'engine', 'texts', 'sample'].forEach(f => require(path.join(root, 'js', f + '.js')));
const E = global.IA_ENGINE, X = global.IA_TEXTS;
const vocab = E.parseCSV(IA_SAMPLE.vocab).slice(1).map(r => ({ book: r[0], unit: r[1], word: r[2] }));
const r9 = x => typeof x === 'number' ? Math.round(x * 1e9) / 1e9 : x;
const round = o => JSON.parse(JSON.stringify(o, (k, v) => r9(v)));
const variants = { default: {}, builtin: { lexBase: 'builtin' }, cefrj: { grammarSource: 'cefrj' }, working: { grammarSource: 'working' }, strict: E.applyProfile(E.DEFAULTS, 'strict'), fixedB1: { levelMode: 'fixed', fixedLevel: 'B1', unknownLevel: 'ignore', useSenses: false } };
const snap = {};
for (const [k, s] of Object.entries(variants)) {
  const A = E.analyzeCorpus(E.recordsFromCSV(IA_SAMPLE.csv), JSON.parse(JSON.stringify(s)), { vocab });
  const T = X.analyzeTexts(X.recordsFromCSV(IA_SAMPLE.texts), A.meta.settings, {}, { vocab });
  const P = X.pairs(A.results, T.results, T.settings);
  snap[k] = round({
    instructions: A.results.map(r => ({ id: r.id, scores: r.scores, counts: r.counts, units: r.units.map(u => u.lemma + ':' + u.lv + ':' + (u.tier || 0)), grammar: r.grammar.map(g => g.id + ':' + g.level) })),
    instrStats: A.stats.crit, instrConclusions: A.conclusions.map(c => c.text),
    texts: T.results.map(r => ({ id: r.id, scores: r.scores, level: r.level, known: r.prof.known, words: r.counts.words, wps: r.counts.wps, sub: r.counts.sub, mtld: r.div.mtld })),
    pairs: P.map(p => [p.instr.id, p.text.id, p.iLex, p.tLex, p.iGr, p.tGr, p.excess]),
    textConclusions: T.conclusions.map(c => c.text)
  });
}
const file = path.join(__dirname, 'snapshot.json');
if (process.argv.includes('--update') || !fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(snap)); console.log('Снимок записан – ' + file); process.exit(0); }
const old = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0;
(function cmp(a, b, p) {
  if (n > 40) return;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') { if (JSON.stringify(a) !== JSON.stringify(b)) { n++; console.log('≠ ' + p + '\n   было  ' + JSON.stringify(a) + '\n   стало ' + JSON.stringify(b)); } return; }
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => cmp(a[k], b[k], p + '.' + k));
})(old, snap, '');
console.log(n ? 'Расхождений – ' + n + (n > 40 ? '+' : '') : 'Числа совпадают со снимком – оба режима, 6 вариантов настроек');
process.exit(n ? 1 : 0);
