/* Проверочный набор модуля «Методические рекомендации» (recommend.js, эталоны rec-0.1).
   node tests/rec-cases.js – печатает расхождения, код выхода 1 при ошибке.
   Проверяет, что правила срабатывают на ожидаемых признаках, не срабатывают без них, что шаблоны
   заполнены, у правил есть источники из списка R.REC.SOURCES и модуль не меняет результаты анализа. */
const path = require('path');
global.window = global;
['resources', 'lexicon', 'cefrj', 'parse', 'core', 'engine', 'method', 'texts', 'recommend'].forEach(f => require(path.join(__dirname, '..', 'js', f + '.js')));
const E = global.IA_ENGINE, MT = global.IA_METHOD, X = global.IA_TEXTS, RC = global.IA_REC, R = global.IA_RES;
let bad = 0;
const fail = t => { bad++; console.log('≠ ' + t); };

/* 1. Эталоны – у каждого правила есть текст хотя бы для одного адресата, источники известны, шаблоны без лишних скобок */
const KEYS = Object.keys(R.REC.SOURCES);
R.REC.RULES.forEach(x => {
  if (!x.teacher && !x.author) fail('правило ' + x.id + ' без текста');
  String(x.src || '').split(';').map(s => s.trim()).filter(Boolean).forEach(s => { const k = s.split(',')[0].trim(); if (!KEYS.includes(k)) fail('правило ' + x.id + ' – неизвестный источник ' + k); });
  ['teacher', 'author'].forEach(w => { const t = x[w] || ''; if ((t.match(/\{/g) || []).length !== (t.match(/\}/g) || []).length) fail('правило ' + x.id + ' – непарные скобки в шаблоне'); });
  if (!['item', 'lesson', 'book'].includes(x.scope)) fail('правило ' + x.id + ' – неизвестный уровень ' + x.scope);
});

/* 2. Упражнения – [инструкция, уровень, ожидаемые правила (через запятую), правила, которых быть не должно] */
const ITEMS = [
  ['Match the words with the pictures.', 'A2', '', 'lex,gram,split,situation,support,ambig'],
  ['Identify the paragraph which corresponds to each heading.', 'A2', 'lex', ''],
  ['Underline the gerund in each sentence.', 'A2', 'meta', ''],
  ['Talk about your holidays.', 'A2', 'situation,support', ''],
  ['Tell your partner about your weekend and find out what they did.', 'A2', '', 'situation'],
  ['Talk about holidays.', 'A2', 'situation,support', ''],
  ['Write a short email to a new friend.', 'A2', 'params', ''],
  ['Write an email to a friend about your holiday (80-100 words).', 'A2', '', 'params'],
  ['Match.', 'A2', 'ambig', ''],
  ['Work in pairs. Student A, look at page 112. Student B, look at page 118. Find six differences.', 'A2', '', 'situation']
];
const csv = ['book;unit;ex;level;text'].concat(ITEMS.map((c, i) => 'T;Unit ' + (i + 1) + ';1;' + c[1] + ';' + c[0])).join('\n');
const A = E.analyzeCorpus(E.recordsFromCSV(csv), {});
const MA = MT.analyze(A, {});
const before = JSON.stringify(A.results.map(r => [r.id, r.scores, r.method.type, r.method.n]));
const RS = RC.analyze(A, MA, null, []);
if (JSON.stringify(A.results.map(r => [r.id, r.scores, r.method.type, r.method.n])) !== before) fail('модуль изменил результаты анализа');
A.results.forEach((r, i) => {
  const [text, , want, deny] = ITEMS[i];
  const got = new Set(RS.item(r.id).map(x => x.rule));
  want.split(',').filter(Boolean).forEach(k => { if (!got.has(k)) fail('«' + text + '» – нет правила ' + k + ' (получено ' + [...got].join(', ') + ')'); });
  deny.split(',').filter(Boolean).forEach(k => { if (got.has(k)) fail('«' + text + '» – лишнее правило ' + k); });
});
RS.all.forEach(x => { if (/\{\w+\}/.test(x.text)) fail('незаполненная подстановка – ' + x.text); });

/* 3. Уроки – отметки последовательности переходят в рекомендации учителю и автору */
const LESSONS = [
  { ex: ['Match the words with the pictures.', 'Fill in the gaps with the words from the box.', 'Discuss the questions with a partner.'], rules: ['jump'] },
  { ex: ['Discuss the questions with a partner.', 'Put the verbs in brackets into the past simple.'], rules: ['jumpStart', 'return'] },
  { ex: ['Match the words with the pictures.', 'Put the verbs in brackets into the past simple.', 'Rewrite the sentences in the passive.'], rules: ['noApply'] },
  { ex: ['Read the text and decide if the statements are true or false.', 'Discuss the questions with a partner.'], rules: ['prePhase'] },
  { ex: ['Before you read, look at the photos and predict what the text is about.', 'Read the text and decide if the statements are true or false.', 'Read the story again. What do you think the main character should do? Discuss.'], rules: [] }
];
LESSONS.forEach((L, k) => {
  const c = ['book;unit;ex;level;text'].concat(L.ex.map((t, i) => 'L;Unit ' + (k + 1) + ';' + (i + 1) + ';A2;' + t)).join('\n');
  const AL = E.analyzeCorpus(E.recordsFromCSV(c), {}), ML = MT.analyze(AL, {});
  const RL = RC.analyze(AL, ML, null, []);
  const got = [...new Set(RL.lessons[0].recs.filter(x => x.rule !== 'unitDrop' && x.rule !== 'lessonInstr').map(x => x.rule))].sort().join(',');
  if (got !== L.rules.slice().sort().join(',')) fail('урок ' + (k + 1) + ' – ожидалось [' + L.rules.join(',') + '], получено [' + got + ']');
  RL.lessons[0].recs.filter(x => x.rule !== 'unitDrop').forEach(x => { if (!RL.lessons[0].recs.some(y => y.rule === x.rule && y.who !== x.who) && RC.RULE[x.rule].teacher && RC.RULE[x.rule].author) fail('урок ' + (k + 1) + ' – правило ' + x.rule + ' без пары учитель – автор'); });
  // возврат не учитывается, если он выключен в настройках методики
  if (L.rules.includes('return')) { const R2 = RC.analyze(AL, MT.analyze(AL, { countReturn: false }), null, []); if (R2.lessons[0].recs.some(x => x.rule === 'return')) fail('урок ' + (k + 1) + ' – возврат при выключенном учёте'); }
});

/* 4. Пример – учебник В (последовательность) и тексты (уровень и лексика) */
require(path.join(__dirname, '..', 'js', 'sample.js'));
const AS = E.analyzeCorpus(E.recordsFromCSV(global.IA_SAMPLE_RU.csv), {});
const MS = MT.analyze(AS, {});
const TS = X.analyzeTexts(X.recordsFromCSV(global.IA_SAMPLE_RU.texts), {}, {}, {});
const PS = X.pairs(AS.results, TS.results, TS.settings);
const RSm = RC.analyze(AS, MS, TS, PS);
const lesson = u => RSm.lessons.find(L => L.book === 'Учебник В (пример)' && L.unit === u);
const has = (L, rule) => L && L.recs.some(x => x.rule === rule);
if (!has(lesson('Unit 3'), 'jump') && !has(lesson('Unit 3'), 'jumpStart')) fail('пример, Учебник В, Unit 3 – нет рекомендации о скачке');
if (!has(lesson('Unit 3'), 'prePhase')) fail('пример, Учебник В, Unit 3 – нет рекомендации о дотекстовом этапе');
if (!has(lesson('Unit 4'), 'noApply')) fail('пример, Учебник В, Unit 4 – нет рекомендации о выходе в речь');
if (lesson('Unit 1') && lesson('Unit 1').recs.some(x => ['jump', 'jumpStart', 'return', 'noApply', 'prePhase'].includes(x.rule))) fail('пример, Учебник В, Unit 1 – лишняя рекомендация о последовательности');
if (!RSm.book.some(x => x.book === 'Учебник В (пример)' && x.rule === 'bNoApply')) fail('пример, Учебник В – нет рекомендации по учебнику о выходе в речь');
if (!RSm.all.some(x => x.kind === 'text' && x.rule === 'tLevel')) fail('пример – нет рекомендации об уровне текста');
if (!RSm.all.some(x => x.kind === 'text' && x.rule === 'tLex')) fail('пример – нет рекомендации о лексике текста');
if (!RSm.all.some(x => x.rule === 'pair')) fail('пример – нет рекомендации по паре «инструкция – текст»');
const ids = new Set(RSm.all.map(x => x.id)); if (ids.size !== RSm.all.length) fail('повторяющиеся id рекомендаций');

if (bad) { console.log('\nРасхождений – ' + bad); process.exit(1); }
console.log('Методические рекомендации совпадают с ожиданием – правил ' + R.REC.RULES.length + ', инструкций ' + ITEMS.length + ', уроков ' + LESSONS.length + ', рекомендаций по примеру ' + RSm.all.length);
