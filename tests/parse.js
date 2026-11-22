/* Проверка слоя синтаксического разбора на образце tests/parse-sample.conllu: node tests/parse.js
   Образец размечен вручную в метках spaCy (d1-d4, d7) и Universal Dependencies (d5, d6). */
const path = require('path'), fs = require('fs'); global.window = global;
['resources', 'lexicon', 'cefrj', 'parse', 'core', 'engine', 'texts'].forEach(f => require(path.resolve(__dirname, '..', 'js', f + '.js')));
const C = IA_CORE, P = IA_PARSE;
const parsed = P.parseConllu(fs.readFileSync(path.resolve(__dirname, 'parse-sample.conllu'), 'utf-8'));
const store = P.makeStore(parsed, 'parse-sample.conllu');
const lex = C.makeLexicon(null, 'augment', 'cefrj', false);
const TEXTS = {
  d1: 'They read the book yesterday. She lives in a small town.',
  d2: 'Underline the verbs used in the past.',
  d3: 'Read the email Tom wrote to his friend.',
  d4: 'She made her brother repeat the words.\nI was tired because I had worked all day.',
  d5: 'The teacher let the students choose a topic.',
  d6: 'I heard her sing when I was in the garden. The book that you gave me is interesting.',
  d7: 'The students selected will take part.'
};
// что должно получиться: id+ – есть, id- – нет, clauses – число придаточных по дереву
const EXPECT = {
  d1: ['pastsimple+', 'pressimple+'], d2: ['imper+', 'pp2+'], d3: ['imper+', 'pastsimple+', 'relomit+'],
  d4: ['causlet+', 'passive-', 'pastperf+', { clauses: 1 }], d5: ['causlet+', 'pastsimple+'],
  d6: ['percinf+', 'relomit-', 'presbe+', { clauses: 2 }], d7: ['pastsimple-', 'pp2+', 'imper-']
};
let fail = 0;
for (const [id, text] of Object.entries(TEXTS)) {
  const { toks } = C.tokenize(text, lex);
  const info = C.applyParse(toks, text, store);
  const hits = C.grammar(toks, lex);
  const cl = IA_PARSE.clauses(toks);
  console.log(id, '|', text.replace(/\n/g, ' / '));
  console.log('   разбор', info && info.matched ? 'найден, покрытие ' + Math.round(info.coverage * 100) + ' %' : 'не найден');
  console.log('   ', hits.map(h => h.id + (h.by ? '*' : '') + '«' + text.slice(h.start, h.end) + '»').join('  '));
  if (toks.parseLog && toks.parseLog.dropped.length) console.log('    снято', toks.parseLog.dropped.map(d => d.id + '«' + d.text + '» – ' + d.why).join('; '));
  console.log('    придаточные', cl ? cl.map(c => c.w + ' (' + c.dep + ')').join(', ') || 'нет' : '—');
  for (const e of EXPECT[id]) {
    if (typeof e === 'object') { if (!cl || cl.length !== e.clauses) { fail++; console.log('    ОШИБКА – придаточных', cl && cl.length, 'ожидалось', e.clauses); } continue; }
    const want = e.slice(-1) === '+', rid = e.slice(0, -1);
    if (hits.some(h => h.id === rid) !== want) { fail++; console.log('    ОШИБКА –', rid, want ? 'не найдено' : 'не должно быть'); }
  }
}
// без разбора правила работают как прежде
const { toks } = C.tokenize(TEXTS.d1, lex);
if (C.grammar(toks, lex).some(h => h.by)) { fail++; console.log('ОШИБКА – срабатывания разбора без загруженного файла'); }
console.log(fail ? 'Ошибок – ' + fail : 'Все проверки пройдены – ' + parsed.docs.length + ' документов, парсер в файле – ' + parsed.parser);
process.exitCode = fail ? 1 : 0;
