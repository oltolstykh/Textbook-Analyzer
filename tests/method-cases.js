/* Проверочный набор модуля «Методика упражнений» (method.js) – тип упражнения по степени свободы,
   этап работы над материалом, этап работы с текстом и правила последовательности урока.
   node tests/method-cases.js – печатает расхождения, код выхода 1 при ошибке.
   Ожидания записаны по эталонам method-0.1 (Соловова, 2006, с. 32, 59, 115, 136-139, 161-163). */
const path = require('path');
global.window = global;
['resources', 'lexicon', 'cefrj', 'parse', 'core', 'engine', 'method'].forEach(f => require(path.join(__dirname, '..', 'js', f + '.js')));
const E = global.IA_ENGINE, MT = global.IA_METHOD;

// [инструкция, тип (sub, trans, cond, comm), этап (intro, train, apply), этап работы с текстом или '', аспект]
const CASES = [
  ['Listen and repeat the words.', 'sub', 'train', ''],
  ['Match the words with the pictures.', 'sub', 'train', ''],
  ['Fill in the gaps with the words from the box.', 'sub', 'train', ''],
  ['Choose the correct word to complete the sentences.', 'sub', 'train', ''],
  ['Put the words in the correct order.', 'sub', 'train', ''],
  ['Put the verbs in brackets into the past simple.', 'trans', 'train', ''],
  ['Complete the sentences with the correct form of the verbs.', 'trans', 'train', ''],
  ['Rewrite the sentences in the passive.', 'trans', 'train', ''],
  ['Make questions from the sentences.', 'trans', 'train', ''],
  ['Find and correct the mistakes in the sentences.', 'trans', 'train', ''],
  ['Translate the sentences into English.', 'trans', 'train', ''],
  ['Underline the present perfect in the text.', 'sub', 'intro', ''],
  ['Look at the examples and complete the rule.', 'sub', 'intro', ''],
  ['Practise the dialogue with a partner.', 'sub', 'train', ''],
  ['Read the text and decide if the statements are true or false.', 'cond', 'train', 'while'],
  ['Listen to the interview and answer the questions.', 'cond', 'train', 'while'],
  ['Read the article quickly and choose the best title.', 'cond', 'train', 'pre'],
  ['Before you read, look at the photos and predict what the text is about.', 'cond', 'train', 'pre'],
  ['Read the text again and answer the questions.', 'cond', 'train', 'while'],
  ['Retell the story in your own words.', 'cond', 'train', ''],
  ['Talk about your weekend using the past simple.', 'cond', 'train', ''],
  ['Write five sentences about your family following the example.', 'cond', 'train', ''],
  ['Work in pairs. Ask and answer questions about your family.', 'comm', 'apply', ''],
  ['Discuss the questions with a partner.', 'comm', 'apply', ''],
  ['Work in pairs. Student A, look at page 112. Student B, look at page 118. Find six differences.', 'comm', 'apply', ''],
  ['Write an email to a friend about your holiday (80-100 words).', 'comm', 'apply', ''],
  ['In groups, plan a class trip and present your plan to the class.', 'comm', 'apply', ''],
  ['Read the story again. What do you think the main character should do? Discuss.', 'comm', 'apply', 'post']
];

// уроки – профиль типов и ожидаемые отметки (правила по sol06, с. 59, 115; harmer, с. 84)
const LESSONS = [
  { name: 'ознакомление – тренировка – применение', ex: ['Look at the examples and complete the rule.', 'Put the verbs in brackets into the past simple.', 'Talk about your weekend using the past simple.', 'Write an email to a friend about your holiday (80-100 words).'], flags: [] },
  { name: 'скачок', ex: ['Match the words with the pictures.', 'Fill in the gaps with the words from the box.', 'Discuss the questions with a partner.'], flags: ['jump'] },
  { name: 'возврат (boomerang)', ex: ['Discuss the questions with a partner.', 'Put the verbs in brackets into the past simple.'], flags: ['jump', 'return'] },
  { name: 'нет выхода в речь', ex: ['Match the words with the pictures.', 'Put the verbs in brackets into the past simple.', 'Rewrite the sentences in the passive.'], flags: ['noApply'] },
  { name: 'работа с текстом по этапам', ex: ['Before you read, look at the photos and predict what the text is about.', 'Read the text and decide if the statements are true or false.', 'Read the story again. What do you think the main character should do? Discuss.'], flags: [] },
  { name: 'текст без дотекстового этапа', ex: ['Read the text and decide if the statements are true or false.', 'Discuss the questions with a partner.'], flags: ['textOrder'] }
];

let bad = 0;
const csv = ['book;unit;ex;level;text'].concat(CASES.map((c, i) => 'T;Unit 1;' + (i + 1) + ';A2;' + c[0])).join('\n');
const A = E.analyzeCorpus(E.recordsFromCSV(csv), {});
MT.analyze(A, {});
A.results.forEach((r, i) => {
  const [text, type, phase, stage] = CASES[i], m = r.method;
  const got = [m.type, m.phase, m.stage || ''], exp = [type, phase, stage];
  if (got.join('|') !== exp.join('|')) { bad++; console.log('≠ ' + text + '\n   ожидалось ' + exp.join(' · ') + '\n   получено  ' + got.join(' · ') + '   (' + m.why.join('; ') + ')'); }
});
LESSONS.forEach((L, k) => {
  const csvL = ['book;unit;ex;level;text'].concat(L.ex.map((t, i) => 'L;Unit ' + (k + 1) + ';' + (i + 1) + ';A2;' + t)).join('\n');
  const AL = E.analyzeCorpus(E.recordsFromCSV(csvL), {});
  const ML = MT.analyze(AL, {});
  const got = [...new Set(ML.lessons[0].flags.filter(f => f.rule !== 'unitDrop').map(f => f.rule))].sort().join(',');
  const exp = L.flags.slice().sort().join(',');
  if (got !== exp) { bad++; console.log('≠ урок «' + L.name + '» – ожидалось [' + exp + '], получено [' + got + '], профиль ' + ML.lessons[0].profile.join('')); }
  const seq = ML.lessons[0].SEQ;
  if (!L.flags.length && seq !== 0) { bad++; console.log('≠ урок «' + L.name + '» – показатель ' + seq + ' вместо 0'); }
});
// пример «Учебник В» – два урока без отметок и два с нарушениями (js/sample.js)
require(path.join(__dirname, '..', 'js', 'sample.js'));
const AS = E.analyzeCorpus(E.recordsFromCSV(global.IA_SAMPLE_RU.csv), {});
const MS = MT.analyze(AS, {});
const SAMPLE = { 'Unit 1': '', 'Unit 2': '', 'Unit 3': 'jump,return,textOrder', 'Unit 4': 'noApply' };
for (const u in SAMPLE) {
  const L = MS.lessons.find(x => x.book === 'Учебник В (пример)' && x.unit === u);
  const got = L ? [...new Set(L.flags.filter(f => f.rule !== 'unitDrop').map(f => f.rule))].sort().join(',') : 'нет урока';
  if (got !== SAMPLE[u]) { bad++; console.log('≠ пример, Учебник В, ' + u + ' – ожидалось [' + SAMPLE[u] + '], получено [' + got + ']'); }
}
console.log(bad ? 'Расхождений – ' + bad : 'Методика упражнений – все ' + CASES.length + ' инструкций, ' + LESSONS.length + ' уроков и пример «Учебник В» совпадают с ожиданием');
process.exit(bad ? 1 : 0);
