/* Общее ядро анализатора – режимы «Инструкции» и «Тексты».
   Версия core-0.2. Лексикон, лемматизация, токенизация, устойчивые сочетания,
   грамматические правила и их уровни, профиль лексики по уровням CEFR,
   введённость лексики (A7), читаемость, описательная статистика, каппа, CSV.
   Любое улучшение здесь сразу действует в обоих режимах.
   Работает в браузере и в node. */
(function (g) {
  const _t = g._t || (s => s);
  const EN = () => !!(g.IA_I18N && g.IA_I18N.lang === 'en');
  const R = g.IA_RES;
  const VERSION = 'core-0.4';
  const LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const LVN = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
  /* Словари эталонов без прототипа – слова constructor, valueOf и подобные
     не должны совпадать со служебными свойствами объекта */
  const bare = o => o && Object.getPrototypeOf(o) !== null ? Object.assign(Object.create(null), o) : o;
  ['SENSES', 'MWE', 'META', 'REPLACE', 'IRREGULAR', 'GMAP'].forEach(k => { if (R[k]) R[k] = bare(R[k]); });
  if (g.IA_LEXICON) g.IA_LEXICON.map = bare(g.IA_LEXICON.map);
  if (g.IA_CEFRJ) { g.IA_CEFRJ.verb = bare(g.IA_CEFRJ.verb); g.IA_CEFRJ.grammar = bare(g.IA_CEFRJ.grammar); }

  function lvNum(s) {
    if (s == null) return null;
    const m = String(s).toUpperCase().replace(/\s/g, '').match(/(A1|A2|B1|B2|C1|C2)(\+)?/);
    return m ? LV[m[1]] + (m[2] ? 0.5 : 0) : null;
  }
  function lvName(n) {
    if (n == null || isNaN(n)) return '—';
    const b = Math.max(1, Math.min(6, Math.floor(n)));
    return LVN[b] + (n - b >= 0.5 ? '+' : '');
  }
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const num = s => { const m = String(s == null ? '' : s).match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };

  /* ---------- Лексикон ---------- */
  function makeLexicon(userLex, mode, baseId, fallback) {
    const CJ = g.IA_CEFRJ;
    const useCJ = baseId !== 'builtin' && CJ;
    const base = useCJ ? CJ.map : g.IA_LEXICON.map;
    const baseName = useCJ ? CJ.id : g.IA_LEXICON.id;
    const baseSrc = useCJ ? 'CEFR-J' : _t('встроенный список');
    const fb = useCJ && fallback ? g.IA_LEXICON.map : null;
    const user = userLex && userLex.map ? userLex.map : null;
    const useBase = mode !== 'replace' || !user;
    const has = w => (user && user[w] != null) || useBase && (base[w] != null || (fb && fb[w] != null));
    const get = (w, asVerb) => {
      if (user && user[w] != null) return { lv: user[w], src: _t('пользовательский список') };
      if (useBase && base[w] != null) {
        if (asVerb && useCJ && CJ.verb[w]) return { lv: CJ.verb[w], src: _t('CEFR-J, глагол') };
        return { lv: base[w], src: baseSrc };
      }
      if (useBase && fb && fb[w] != null) return { lv: fb[w], src: _t('встроенный список (нет в CEFR-J)') };
      return null;
    };
    let id = baseName + (fb ? _t(' + встроенный для пропусков') : '');
    if (user) id = mode === 'replace' ? userLex.id : id + ' + ' + userLex.id;
    return { has, get, id, size: user && mode === 'replace' ? userLex.size : Object.keys(base).length };
  }
  function parseUserLexicon(text, id) {
    const rows = parseCSV(text);
    if (!rows.length) return null;
    const head = rows[0].map(h => h.toLowerCase().trim());
    let wi = head.findIndex(h => /^(headword|word|lemma|слово|лемма|base)$/.test(h));
    let li = head.findIndex(h => /^(cefr|level|уровень|cefr level|cefr-j)$/.test(h));
    let start = 1;
    if (wi < 0 || li < 0) { wi = 0; li = rows[0].findIndex((c, i) => i > 0 && lvNum(c)); start = 0; if (li < 0) return null; }
    const map = Object.create(null); let n = 0;
    for (let i = start; i < rows.length; i++) {
      const r = rows[i]; const lv = lvNum(r[li]); if (!lv) continue;
      for (let w of String(r[wi] || '').split('/')) {
        w = w.toLowerCase().trim().replace(/\s+/g, ' ');
        if (!w) continue;
        const name = LVN[Math.floor(lv)];
        if (!map[w] || LV[map[w]] > LV[name]) { map[w] = name; n++; }
      }
    }
    return { id: id || 'user-list', map, size: Object.keys(map).length };
  }

  /* ---------- Лемматизация ---------- */
  function contractBase(w) {
    const m = { cannot: 'can', "don't": 'do', "doesn't": 'do', "didn't": 'do', "can't": 'can', "won't": 'will', "let's": 'let', "isn't": 'be', "aren't": 'be' };
    if (own(m, w)) return m[w];
    return w.replace(/'(s|ll|re|ve|d|m)$/, '').replace(/n't$/, '');
  }
  function candidates(w) {
    const c = [w];
    if (R.IRREGULAR[w]) c.push(R.IRREGULAR[w]);
    const add = (...x) => x.forEach(v => v && v.length > 1 && c.push(v));
    if (w.endsWith('ies') && w.length > 4) add(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) add(w.slice(0, -2), w.slice(0, -1));
    if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
    if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ed')) {
      const b = w.slice(0, -2);
      if (b.length <= 3) add(b + 'e', b); else add(b, b + 'e');
      if (/([b-df-hj-np-tv-z])\1$/.test(b)) add(b.slice(0, -1));
    }
    if (w.endsWith('ing')) {
      const b = w.slice(0, -3);
      if (w.endsWith('ying')) add(w.slice(0, -4) + 'ie');
      if (b.length <= 3) add(b + 'e', b); else add(b, b + 'e');
      if (/([b-df-hj-np-tv-z])\1$/.test(b)) add(b.slice(0, -1));
    }
    if (w.endsWith('ier')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('iest')) add(w.slice(0, -4) + 'y');
    if (w.endsWith('er')) { const b = w.slice(0, -2); add(b, b + 'e'); if (/(.)\1$/.test(b)) add(b.slice(0, -1)); }
    if (w.endsWith('est')) { const b = w.slice(0, -3); add(b, b + 'e'); if (/(.)\1$/.test(b)) add(b.slice(0, -1)); }
    if (w.endsWith('ily')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ly')) add(w.slice(0, -2));
    return [...new Set(c)];
  }
  /* Неправильная форма, которая сама есть в списке как другое слово (found «основать», given),
     сводится к глаголу, если у глагола уровень ниже, – тот же принцип самого низкого уровня,
     что и для частей речи. get – уровень по списку, необязателен. */
  function lemmatize(w, has, get) {
    w = contractBase(w.toLowerCase().replace(/’/g, "'"));
    if (get && own(R.IRREGULAR, w) && R.IRREGULAR[w] !== w && has(w) && has(R.IRREGULAR[w])) {
      const a = get(w), b = get(R.IRREGULAR[w]);
      if (a && b && lvNum(b.lv) < lvNum(a.lv)) return R.IRREGULAR[w];
    }
    const c = candidates(w);
    for (const x of c) if (has(x)) return x;
    return R.IRREGULAR[w] || w;
  }

  /* ---------- Токенизация ---------- */
  function sentences(text) {
    const t = text.replace(/\b(Exs?|e\.g|i\.e|etc|pp?|No|Fig|vs|Mr|Mrs|Ms|Dr)\./gi, m => m.replace(/\./g, '․'))
      .replace(/(^|\n)([ \t]*\d{1,3})\.(?=[ \t])/g, '$1$2․');
    const out = []; let start = 0; const re = /[.!?;]+(?=\s|$)|\n+/g; let m;
    while ((m = re.exec(t))) { const end = m.index + m[0].length; if (t.slice(start, end).replace(/[\s.!?;]/g, '')) out.push({ start, end }); start = end; }
    if (t.slice(start).replace(/[\s.!?;]/g, '')) out.push({ start, end: t.length });
    if (!out.length) out.push({ start: 0, end: t.length });
    return out;
  }
  const NAME_PART = new Set(['de', 'da', 'di', 'du', 'del', 'van', 'von', 'der', 'la', 'le', 'al', 'bin']);
  const SKIP_ABBR = new Set(['ex', 'exs', 'p', 'pp', 'no', 'fig', 'etc', 'e.g', 'i.e']);
  function tokenize(text, lex) {
    tokenize._text = text;
    const sents = sentences(text);
    const re = /[A-Za-z]+(?:['’][A-Za-z]+)?(?:-[A-Za-z]+)*|\d+(?:\s?[-–]\s?\d+)?[a-z]?/g;
    const toks = []; let m;
    while ((m = re.exec(text))) {
      const w = m[0]; const start = m.index, end = start + w.length;
      const si = sents.findIndex(s => start >= s.start && start < s.end);
      const lw = w.toLowerCase().replace(/’/g, "'");
      const t = { w, lw, start, end, si: si < 0 ? sents.length - 1 : si, kind: 'word' };
      if (/^\d/.test(w)) t.kind = 'num';
      else if (/^[a-h](-[a-h])?$/i.test(w) && w.toLowerCase() !== 'a' || /^[a-h]-[a-h]$/i.test(w)) t.kind = 'label';
      else if (SKIP_ABBR.has(lw) && /^\s*[.․]?\s*\d/.test(text.slice(end, end + 4))) t.kind = 'abbr';
      toks.push(t);
    }
    // первые слова предложений
    const firstOf = new Set(); let lastSi = -1;
    for (let i = 0; i < toks.length; i++) if (toks[i].si !== lastSi) { firstOf.add(i); lastSi = toks[i].si; }
    toks.forEach((t, i) => {
      if (t.kind !== 'word') { t.lemma = t.lw; return; }
      t.lemma = lemmatize(t.lw, w => lex.has(w) || !!R.META[w] || !!R.SENSES[w], lex.get);
      t.first = firstOf.has(i);
      if (/^[A-Z]/.test(t.w) && !t.first && t.w !== 'I' && !lex.has(t.lemma) && !R.SENSES[t.lemma]) t.kind = 'name';
      if (/^[A-Z]{2,}$/.test(t.w) && !lex.has(t.lw)) t.kind = 'name';
    });
    // имена в начале предложения – если то же слово уже встретилось как имя или за ним идёт слово с прописной (Riverside College, Wang Lei)
    const nameSet = new Set(toks.filter(t => t.kind === 'name').map(t => t.lw));
    const unknownCap = t => t.kind === 'word' && /^[A-Z]/.test(t.w) && t.w !== 'I' && !lex.has(t.lemma) && !R.SENSES[t.lemma] && !R.META[t.lemma];
    toks.forEach((t, i) => {
      if (!unknownCap(t)) return;
      const n = toks[i + 1];
      if (nameSet.has(t.lw) || (n && n.si === t.si && /^[A-Z]/.test(n.w) && /^\s+$/.test(text.slice(t.end, n.start)))) t.kind = 'name';
    });
    // частицы внутри имён (Tour de France, van Gogh)
    toks.forEach((t, i) => {
      const p = toks[i - 1], n = toks[i + 1];
      if (t.kind === 'word' && NAME_PART.has(t.lw) && p && n && p.si === t.si && n.si === t.si && /^[A-Z]/.test(p.w) && !p.first && /^[A-Z]/.test(n.w)) { p.kind = 'name'; t.kind = 'name'; n.kind = 'name'; }
    });
    toks._sents = sents;
    return { toks, sents };
  }

  /* Объединение устойчивых сочетаний */
  const MWE_MAX = 4;
  const META_SOFT = new Set(['word', 'sentence', 'letter', 'question', 'answer', 'text', 'dialogue', 'sound', 'summary', 'headline', 'opposite', 'negative', 'future', 'active', 'register', 'stress', 'linking', 'prompt', 'article', 'phrase', 'paragraph']);
  /* opts.meta === false – без терминов метаязыка (для текстов: stress, register, genre – обычные слова) */
  function lexicalUnits(toks, lex, opts) {
    const useMeta = !opts || opts.meta !== false;
    const units = []; const words = toks.map((t, i) => ({ t, i })).filter(x => x.t.kind === 'word');
    for (let k = 0; k < words.length; k++) {
      let hit = null;
      for (let L = Math.min(MWE_MAX, words.length - k); L >= 2; L--) {
        const seq = words.slice(k, k + L);
        if (seq.some((x, j) => j && (x.t.si !== seq[0].t.si || x.i !== seq[j - 1].i + 1))) continue;
        const key = seq.map(x => x.t.lemma).join(' ');
        const key2 = seq.map(x => x.t.lw).join(' ');
        const mk = R.MWE[key] ? key : R.MWE[key2] ? key2 : null;
        if (mk) { hit = { key: mk, seq }; break; }
        const mt = !useMeta ? null : R.META[key] ? key : R.META[key2] ? key2 : null;
        if (mt) { hit = { key: mt, seq, meta: true }; break; }
        const lk = lex && (lex.get(key) ? key : lex.get(key2) ? key2 : null);
        if (lk) { hit = { key: lk, seq, lexmw: true }; break; }
      }
      if (hit) {
        units.push({ lemma: hit.key, text: hit.seq.map(x => x.t.w).join(' '), tok: hit.seq.map(x => x.i), mwe: hit.meta ? [R.META[hit.key], _t('термин метаязыка (учтён в A4)')] : hit.lexmw ? null : R.MWE[hit.key], metaTerm: !!hit.meta });
        k += hit.seq.length - 1;
      } else {
        const t = words[k].t;
        const mt = useMeta && R.META[t.lemma] && !META_SOFT.has(t.lemma);
        units.push({ lemma: t.lemma, text: t.w, tok: [words[k].i], mwe: R.MWE[t.lemma] || (mt ? [R.META[t.lemma], _t('термин метаязыка (учтён в A4)')] : null), metaTerm: !!mt });
      }
    }
    return units;
  }

  /* ---------- Грамматика (A2) ---------- */
  const BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', "'s", "'re"]);
  const HAVE = new Set(['have', 'has', 'had']);
  const PREP_G = new Set(['by', 'without', 'before', 'after', 'of', 'for', 'about', 'in', 'on', 'instead', 'when', 'while']);
  const VERB_ING = bare({ like: 'A2', love: 'A2', enjoy: 'A2', hate: 'A2', try: 'B1', avoid: 'B1', practise: 'B1', practice: 'B1', finish: 'B1', start: 'B1', stop: 'B1', keep: 'B1', imagine: 'B1', suggest: 'B1', consider: 'B2', begin: 'B1', continue: 'B1', mind: 'B1' });
  const FINITE = new Set(['is', 'are', 'was', 'were', 'has', 'have', 'had', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'makes', 'helps', 'takes', 'gives', 'means', 'becomes', 'seems', 'requires', "isn't", "can't"]);
  const WH = new Set(['what', 'how', 'why', 'where', 'when', 'who', 'which', 'whether']);
  const POSTMOD = new Set(['given', 'provided', 'underlined', 'highlighted', 'listed', 'shown', 'mentioned', 'marked', 'printed', 'supplied', 'indicated', 'suggested', 'described', 'included', 'required', 'used']);
  const DET = new Set(['the', 'a', 'an', 'this', 'these', 'those', 'that', 'your', 'his', 'her', 'their', 'our', 'my', 'its', 'each', 'every', 'all', 'some', 'any', 'one', 'two', 'three', 'four', 'five', 'six', 'correct', 'right', 'missing', 'following', 'best', 'new', 'other', 'same', 'different', 'appropriate', 'suitable', 'short', 'own', 'more', 'most', 'main', 'key', 'true', 'false', 'false', 'useful', 'possible', 'remaining', 'formal', 'informal', 'long', 'little', 'few', 'several', 'underlined', 'highlighted', 'bold', 'blue', 'red']);
  const NOT_NOUN = new Set(['and', 'or', 'then', 'with', 'from', 'to', 'in', 'on', 'at', 'for', 'by', 'of', 'you', 'it', 'them', 'they', 'we', 'i', 'he', 'she', 'not', "don't", 'do', 'can', 'will', 'should', 'must', 'if', 'as', 'than', 'so']);

  /* ---------- Грамматика (A2, T2) ----------
     core-0.3 – к правилам для инструкций добавлены конструкции повествовательного текста и диалога:
     времена и виды, будущее, модальные глаголы и их эквиваленты, разновидности страдательного залога,
     степени сравнения, инфинитивные и герундиальные конструкции, каузатив, косвенная речь,
     условные предложения III типа, wish, инверсия, разделительный вопрос и др. */
  const PRON_S = /^(i|you|he|she|it|we|they)$/;
  const PRON_O = /^(me|you|him|her|it|us|them|everyone|everybody|someone|somebody|people|students|children|others)$/;
  const ADVM = new Set(['always', 'often', 'never', 'usually', 'sometimes', 'also', 'just', 'then', 'finally', 'first', 'soon', 'later', 'suddenly', 'already', 'really', 'only', 'even', 'still', 'ever', 'not', 'recently', 'actually', 'probably', 'certainly', 'quickly', 'slowly', 'immediately', 'again', 'all', 'both', 'definitely', 'hardly', 'nearly', 'almost', 'rarely', 'seldom', 'once', 'yet']);
  const MODALS = new Set(['can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must']);
  const POSS = /^(the|my|your|his|her|its|our|their)$/;
  const NOT_SUPERL = new Set(['rest', 'west', 'test', 'interest', 'nest', 'chest', 'guest', 'forest', 'harvest', 'request', 'contest', 'protest', 'honest', 'modest', 'arrest', 'invest', 'suggest', 'digest', 'quest', 'vest', 'pest', 'east', 'least', 'most', 'past', 'last', 'fast']);
  const NOT_COMPAR = new Set(['rather', 'other', 'either', 'neither', 'whether', 'never', 'ever', 'over', 'under', 'after', 'later', 'water', 'number', 'paper', 'teacher', 'mother', 'father', 'brother', 'sister', 'together']);
  const GET_PP = new Set(['married', 'dressed', 'lost', 'hurt', 'injured', 'killed', 'caught', 'stuck', 'paid', 'fired', 'promoted', 'elected', 'arrested', 'invited', 'divorced', 'engaged', 'involved', 'accepted', 'stolen', 'broken', 'damaged', 'chosen', 'dressed', 'changed', 'washed', 'done', 'finished', 'sacked', 'robbed']);
  const V_OBJ_TO = new Set(['want', 'ask', 'tell', 'allow', 'encourage', 'expect', 'invite', 'advise', 'remind', 'teach', 'persuade', 'need', 'help', 'force', 'cause', 'enable', 'require', 'warn', 'order', 'beg', 'like', 'prefer', 'get', 'would']);
  const BASE_V = new Set(['feel', 'think', 'laugh', 'cry', 'go', 'come', 'do', 'stay', 'play', 'see', 'know', 'wait', 'use', 'try', 'work', 'leave', 'sleep', 'eat', 'drink', 'have', 'take', 'make', 'buy', 'read', 'watch', 'listen', 'speak', 'talk', 'help', 'win', 'lose', 'look', 'sit', 'stand', 'run', 'walk', 'sing', 'dance', 'smile', 'stop', 'start', 'wear', 'pay', 'clean', 'cook', 'drive', 'move', 'change', 'decide', 'choose', 'live', 'die', 'grow', 'fall', 'happen', 'be']);
  const REPORT_THAT = new Set(['think', 'know', 'hope', 'believe', 'guess', 'suppose', 'feel', 'say', 'expect', 'realise', 'realize', 'imagine', 'remember', 'promise']);
  const PERC = new Set(['see', 'hear', 'watch', 'feel', 'notice']);
  const TAG_AUX = /^(is|isn't|are|aren't|was|wasn't|were|weren't|do|don't|does|doesn't|did|didn't|have|haven't|has|hasn't|had|hadn't|will|won't|would|wouldn't|can|can't|could|couldn't|should|shouldn't|shall|must|mustn't)$/;
  /* Вспомогательный глагол в слитной форме – I'm, she's, they'll, I've, I'd, can't, won't */
  function auxBase(x) {
    if (!x) return null;
    let w = x.lw.replace(/’/g, "'");
    if (/'ll$/.test(w)) return 'will';
    if (/'ve$/.test(w)) return 'have';
    if (/'d$/.test(w)) return "'d";
    if (/'m$|'re$/.test(w)) return 'be';
    if (/'s$/.test(w)) return "'s";
    if (/n't$/.test(w)) { w = w.slice(0, -3); w = { ca: 'can', wo: 'will', sha: 'shall' }[w] || w; }
    if (w === 'cannot') return 'can';
    return w;
  }
  const NOT_SUBJ = /^(to|get|got|gets|getting|be|been|being|was|were|by|with|of|for|in|on|at|from|very|so|too|more|most|less|not|and|or|but|then|than|as|is|are|a|an|into|about|after|before|over|through|up|down|out|off|around|because|when|if|that|which|who|where|while|until|since|without|under|during|across|behind|near|like|unlike|per|via|within|upon|onto|toward|towards|against|between|among|beyond|please|let)$/;
  /* неправильные глаголы с совпадающими формами прошедшего времени и причастия II */
  const PAST_PP_SAME = new Set('made found said told bought left felt kept held heard meant met paid led lost brought sent spent built taught thought caught sold sat stood slept won put cut set let hit read had understood got lent burnt learnt dreamt fed fought hung laid lit shot shut spread stuck swept'.split(' '));
  const ADJ_ING = /^(interesting|boring|exciting|amazing|surprising|tiring|relaxing|annoying|confusing|disappointing|embarrassing|frightening|shocking|worrying|charming|missing|following|outstanding|living|willing)$/;
  /* формы, совпадающие с настоящим временем (read, put) – прошедшее только после he / she / it / имени */
  const SAME_PRES = new Set('read put cut set let hit shut spread cost hurt quit bet burst'.split(' '));
  /* конструкции, в которые входит to, – инфинитив цели в них не выделяется */
  const COVER_TO = new Set(['vobjto', 'asktell', 'fornpto', 'itadjto', 'whto', 'notto', 'tooto', 'inorder', 'soasto', 'haveto', 'needto', 'usedto', 'oughtto', 'beable', 'beabout', 'goingto', 'hasgotto']);
  const EXTRA_PP = new Set(['become', 'had', 'run', 'overcome', 'put', 'cut', 'set', 'let', 'hit', 'read', 'shut', 'spread', 'cost', 'hurt']);
  const NONVERB_IRR = new Set(['man', 'woman', 'child', 'foot', 'tooth', 'mouse', 'bad', 'good', 'far', 'person']);
  const IRR_BASES = new Set(Object.values(R.IRREGULAR).filter(b => !NONVERB_IRR.has(b)));
  const BE_PRES = new Set(['am', 'is', 'are', 'be', "'s"]);
  const BE_PAST = new Set(['was', 'were']);

  function grammar(toks, lex) {
    const hits = []; const W = toks.filter(t => t.kind === 'word' || t.kind === 'name');
    const push = (id, name, level, a, b, note) => hits.push({ id, name, level, lv: lvNum(level), start: W[a].start, end: W[b].end, note });
    const isVing = x => x && /ing$/.test(x.lw) && x.lw.length > 4 && !R.NOT_ING.has(x.lw) && !lexNoun(x.lw);
    // после be -ing почти всегда глагол (was reading), кроме прилагательных на -ing
    const isVingAfterBe = x => x && /ing$/.test(x.lw) && x.lw.length > 4 && !R.NOT_ING.has(x.lw) && !ADJ_ING.test(x.lw);
    const isVerbLemma = b => !!b && !NONVERB_IRR.has(b) && (R.ACTION_VERBS.has(b) || BASE_V.has(b) || IRR_BASES.has(b) || !!(g.IA_CEFRJ && own(g.IA_CEFRJ.verb, b)));
    // -ed после снятия окончания даёт слово из списка (pushed – push, closed – close)
    const edBase = w => [w.slice(0, -2), w.slice(0, -1), w.slice(0, -3), w.slice(0, -3) + 'y'].find(b => b.length > 1 && (isVerbLemma(b) || lex.has(b)));
    const isEd = x => x && /ed$/.test(x.lw) && x.lw.length > 3 && !R.ADJ_ED.has(x.lw) && x.lw !== 'need' && !!edBase(x.lw);
    const isPP = x => x && (isEd(x) || R.IRREGULAR_PP.has(x.lw));
    const vlem = x => !x ? '' : own(R.IRREGULAR, x.lw) && isVerbLemma(R.IRREGULAR[x.lw]) ? R.IRREGULAR[x.lw] : x.lemma;
    const isVerbBase = x => x && (R.ACTION_VERBS.has(x.lw) || BASE_V.has(x.lw) || (x.lemma === x.lw && lex.has(x.lw) && !DET.has(x.lw) && !NOT_NOUN.has(x.lw) && !PRON_S.test(x.lw) && !/(ly|ed|ing|s)$/.test(x.lw)));
    const objAt = j => { const x = W[j]; if (!x) return 0; if (PRON_O.test(x.lw) || x.kind === 'name') return 1; if (POSS.test(x.lw) || DET.has(x.lw)) { const y = W[j + 1]; if (y && y.si === x.si && !DET.has(y.lw)) { const z = W[j + 2]; return z && z.si === x.si && !DET.has(z.lw) && z.lw !== 'to' && lex.has(z.lemma) && !isVerbBase(z) && !isPP(z) && !isVing(z) ? 3 : 2; } } return 0; };
    const skipAdvArr = (arr, j) => { let k = j; while (k - j < 2 && arr[k] && ADVM.has(arr[k].lw)) k++; return k; };
    const skipAdv = (j, max) => { let k = j; while (k - j < (max || 2) && W[k] && ADVM.has(W[k].lw)) k++; return k; };
    const strictV = x => x && (R.ACTION_VERBS.has(x.lw) || BASE_V.has(x.lw) || (x.lemma === x.lw && !!(g.IA_CEFRJ && own(g.IA_CEFRJ.verb, x.lw)) && !/(ly|ed|ing)$/.test(x.lw)));
    const pastHits = new Set();
    for (let i = 0; i < W.length; i++) {
      const t = W[i], p = W[i - 1], n = W[i + 1], n2 = W[i + 2];
      const same = x => x && x.si === t.si;
      const a = auxBase(t), pa = auxBase(p);
      // страдательный залог и его разновидности
      if (BE.has(t.lw) && t.lw !== 'being') {
        let skipped = [];
        for (let j = 1; j <= 3; j++) {
          const x = W[i + j]; if (!same(x)) break;
          if (/^(not|already|also|then|correctly|usually|often|always|never|being)$/.test(x.lw)) { skipped.push(x.lw); continue; }
          if ((/ed$/.test(x.lw) && !R.ADJ_ED.has(x.lw)) || R.IRREGULAR_PP.has(x.lw)) {
            const pp = p && same(p) ? auxBase(p) : null;
            if (p && same(p) && p.lw === 'to') push('passinf', _t('Пассивный инфинитив'), 'B2', i, i + j);
            else if (t.lw === 'be' && pp === 'will') push('passfut', _t('Страдательный залог (будущее)'), 'B1', i - 1, i + j);
            else if (t.lw === 'be' && pp && MODALS.has(pp)) push('passmod', _t('Страдательный залог с модальным глаголом'), 'B1', i - 1, i + j);
            else if (t.lw === 'been' && pp && (pp === 'have' || pp === 'has' || pp === 'had' || pp === "'d" || pp === "'s")) push('passperf', _t('Страдательный залог (перфект)'), 'B1', i - 1, i + j);
            else if (skipped.includes('being')) push('passcont', _t('Страдательный залог (длительный)'), 'B1', i, i + j);
            else if (BE_PAST.has(t.lw)) push('passpast', _t('Страдательный залог (прошедшее)'), 'B1', i, i + j);
            else push('passive', _t('Страдательный залог'), 'B1', i, i + j);
          }
          break;
        }
      }
      // перфект, в том числе I've, she's gone, have never seen, Have you ever …
      {
        let hv = null;
        if (HAVE.has(t.lw) || a === 'have' || a === 'has' || a === 'had' || a === "'d" || a === "'s") hv = a === "'s" ? 'has' : (a === "'d" ? 'had' : a);
        if (hv) {
          let k = i + 1;
          if (W[k] && same(W[k]) && PRON_S.test(W[k].lw) && (t.first || (p && /\?/.test(tokenize._text.slice(t.start, (W[k + 3] || W[k]).end))))) k++;
          k = skipAdv(k);
          const x = W[k];
          const okPP = x && same(x) && (R.IRREGULAR_PP.has(x.lw) || EXTRA_PP.has(x.lw) || isEd(x)) && !(x.lw === 'got' && !(W[k + 1] && same(W[k + 1]) && /^(to|better|worse|used|married|lost|up|back|home|ready)$/.test(W[k + 1].lw)));
          const okS = a !== "'s" || (x && /^(been|gone|got|done|seen|had|made|taken|given|told|written)$/.test(x.lw) && !(x.lw !== 'been' && W[k + 1] && same(W[k + 1]) && /^(by|of|from|in)$/.test(W[k + 1].lw)));
          const okD = a !== "'d" || okPP;
          if (okPP && okS && okD) {
            const y = W[k + 1];
            const modal = p && same(p) && /^(should|could|might|must|would|may|can't|couldn't|shouldn't|wouldn't|mightn't|mustn't)$/.test(p.lw);
            if (x.lw === 'been' && isPP(y)) { /* перфектный пассив – правило выше */ }
            else if (x.lw === 'been' && isVing(y)) push(hv === 'had' ? 'pastperfcont' : 'presperfcont', hv === 'had' ? _t('Прошедшее совершённое длительное (Past Perfect Continuous)') : _t('Настоящее совершённое длительное (Present Perfect Continuous)'), hv === 'had' ? 'B2' : 'B1', i, k + 1);
            else if (modal) push('modperf', _t('Модальный глагол + перфектный инфинитив'), 'B2', i - 1, k);
            else if (p && same(p) && auxBase(p) === 'will') push('futperf', _t('Будущее совершённое (Future Perfect)'), 'B2', i - 1, k);
            else if (HAVE.has(t.lw) || a === 'have' || a === 'had' || a === "'d" || a === "'s" || a === 'has') push(hv === 'had' ? 'pastperf' : 'presperf', hv === 'had' ? _t('Прошедшее совершённое (Past Perfect)') : _t('Настоящее совершённое (Present Perfect)'), hv === 'had' ? 'B1' : 'A2', i, k);
          }
        }
      }
      // длительные времена и be going to
      if ((BE_PRES.has(a) || BE_PAST.has(a) || BE_PAST.has(t.lw)) && t.lw !== 'be' && t.lw !== 'being') {
        const k = skipAdv(i + 1), x = W[k];
        if (same(x) && isVingAfterBe(x)) {
          const past = BE_PAST.has(a) || BE_PAST.has(t.lw);
          if (x.lw === 'going' && W[k + 1] && W[k + 1].lw === 'to') push('goingto', _t('Конструкция be going to'), 'A2', i, k + 1);
          else if (x.lw === 'being') { /* длительный пассив – правило выше */ }
          else if (past) push('pastcont', _t('Прошедшее длительное (Past Continuous)'), 'A2', i, k);
          else push('prescont', _t('Настоящее длительное (Present Continuous)'), 'A1', i, k);
        } else if (same(x) && x.lw === 'able' && W[k + 1] && W[k + 1].lw === 'to') push('beable', _t('Конструкция be able to'), 'B1', i, k + 1);
        else if (same(x) && x.lw === 'about' && W[k + 1] && W[k + 1].lw === 'to' && isVerbBase(W[k + 2])) push('beabout', _t('Конструкция be about to'), 'B2', i, k + 1);
        else if (BE_PAST.has(t.lw) && !(same(x) && (isPP(x) || x.lw === 'used' || x.lw === 'supposed')) && !(p && same(p) && p.lw === 'there')) { push('pastbe', _t('Глагол be в прошедшем времени'), 'A1', i, i); pastHits.add(t.si); }
      }
      // будущее и модальные глаголы
      if (a === 'will' && !(p && same(p) && DET.has(p.lw))) {
        const k = skipAdv(i + 1), x = W[k];
        if (same(x) && x.lw === 'be' && isVing(W[k + 1])) push('futcont', _t('Будущее длительное (Future Continuous)'), 'B1', i, k + 1);
        else if (same(x) && x.lw === 'have' && isPP(W[k + 1])) { /* Future Perfect – правило перфекта */ }
        else if (same(x) && (isVerbBase(x) || x.lw === 'be') || (x && PRON_S.test(x.lw))) push('will', _t('Будущее время с will'), 'A2', i, i);
      }
      if ((a === 'would' || (a === "'d" && isVerbBase(W[skipAdv(i + 1)])))) push('would', _t('Модальный глагол would'), 'A2', i, i);
      if (a === 'can' && !(p && same(p) && DET.has(p.lw)) && n && same(n)) push('can', _t('Модальный глагол can'), 'A1', i, i);
      if (a === 'could') push('could', _t('Модальный глагол could'), 'A2', i, i);
      if (a === 'shall') push('shall', _t('Модальный глагол shall'), 'A2', i, i);
      if ((a === 'should' || a === 'must') && !(t.lw === 'should' || t.lw === 'must')) push('modal2', _t('Модальные should / must'), 'A2', i, i);
      if (/^(have|has|had|having)$/.test(t.lw) && n && n.lw === 'to' && same(n) && isVerbBase(n2)) push('haveto', _t('Конструкция have to'), 'A2', i, i + 1);
      if ((HAVE.has(t.lw) || a === 'have' || a === "'s") && n && n.lw === 'got' && n2 && n2.lw === 'to') push('hasgotto', _t('Конструкция have got to'), 'A2', i, i + 2);
      else if ((/^(have|has)$/.test(t.lw) || a === 'have' || (a === "'s" && !BE.has(t.lw))) && n && same(n) && n.lw === 'got' && !(n2 && same(n2) && /^(better|worse|used|married|lost|up|back|ready)$/.test(n2.lw))) push('havegot', _t('Конструкция have got (обладание)'), 'A1', i, i + 1);
      if (/^(need|needs|needed)$/.test(t.lw) && n && n.lw === 'to' && isVerbBase(n2) && !(p && same(p) && DET.has(p.lw))) push('needto', _t('Конструкция need to'), 'A2', i, i + 1);
      if (t.lw === 'used' && n && n.lw === 'to' && isVerbBase(n2) && !(p && same(p) && (BE.has(p.lw) || /^(get|got|getting|be)$/.test(p.lw) || BE_PRES.has(auxBase(p))))) push('usedto', _t('Конструкция used to'), 'B1', i, i + 1);
      if (t.lw === 'ought' && n && n.lw === 'to') push('oughtto', _t('Модальный глагол ought to'), 'B1', i, i + 1);
      if ((t.lw === 'had' || a === "'d") && n && n.lw === 'better' && same(n)) push('hadbetter', _t('Конструкция had better'), 'B2', i, i + 1);
      if (t.lw === "let's" || (t.lw === 'let' && n && n.lw === "'s")) push('lets', _t('Побуждение let\'s'), 'A1', i, i);
      // прошедшее простое
      if (a === 'did') {
        const aux = /n't$/.test(t.lw) || (n && same(n) && (n.lw === 'not' || ((PRON_S.test(n.lw) || n.kind === 'name' || DET.has(n.lw) || POSS.test(n.lw)) && (t.first || (p && /^(why|what|where|when|how|who|which)$/.test(p.lw))))));
        if (aux) push('pastdid', _t('Прошедшее простое (вопрос и отрицание с did)'), 'A2', i, i);
        else if (p && same(p) && (PRON_S.test(p.lw) || p.kind === 'name')) { push('pastsimple', _t('Прошедшее простое (Past Simple)'), 'A1', i, i); pastHits.add(t.si); }
      }
      if (t.lw !== 'did' && !BE.has(t.lw) && !HAVE.has(t.lw) || t.lw === 'had') {
        const base = own(R.IRREGULAR, t.lw) ? R.IRREGULAR[t.lw] : null;
        const sameP = SAME_PRES.has(t.lw) && p && (/^(he|she|it)$/.test(p.lw) || p.kind === 'name');
        const irr = t.lw !== 'had' && base && base !== t.lw && isVerbLemma(base) && !/ing$|s$/.test(t.lw) && (!R.IRREGULAR_PP.has(t.lw) || PAST_PP_SAME.has(t.lw)) && (!SAME_PRES.has(t.lw) || sameP) || sameP;
        const reg = isEd(t);
        const hadMain = t.lw === 'had' && !(n && same(n) && (isPP(n) || n.lw === 'to' || n.lw === 'better' || n.lw === 'been' || ADVM.has(n.lw)));
        const afterAux = p && /'(ve|d|s|ll|m|re)$/.test(p.lw) && p.lw !== "let's";
        if ((irr || reg || hadMain) && p && same(p) && !t.first && !afterAux && !(t.lw === 'got' && p && /^(have|has|had)$/.test(auxBase(p) || ''))) {
          const subj = PRON_S.test(p.lw) || p.kind === 'name' || ((p.lw === 'who' || p.lw === 'which') && !p.first) || (!DET.has(p.lw) && !POSS.test(p.lw) && !BE.has(p.lw) && !HAVE.has(p.lw) && !MODALS.has(auxBase(p)) && !NOT_SUBJ.test(p.lw) && !/(ly|ing)$/.test(p.lw) && !(POSTMOD.has(t.lw) && /s$/.test(p.lw)) && lex.has(p.lemma) && !R.ACTION_VERBS.has(p.lw) && !BASE_V.has(p.lw) && !isPP(p) && !/^(me|him|us|them)$/.test(p.lw));
          const adv = ADVM.has(p.lw) && p.lw !== 'not' && W[i - 2] && W[i - 2].si === t.si && (PRON_S.test(W[i - 2].lw) || W[i - 2].kind === 'name');
          const coord = /^(and|but|then|or)$/.test(p.lw) && pastHits.has(t.si);
          // причастие после существительного (the information required to …, the dates mentioned) – не прошедшее время
          const objNext = n && same(n) && (PRON_O.test(n.lw) || POSS.test(n.lw) || DET.has(n.lw) || n.kind === 'name');
          const agent = (n && same(n) && n.lw === 'by') || (!PRON_S.test(p.lw) && p.kind !== 'name' && !objNext && (POSTMOD.has(t.lw) || /^(required|needed|mentioned|shown|described|listed|offered|provided|included|written|based|located|called|named|known|made|found|given|left|sent)$/.test(t.lw) || (n && same(n) && n.lw === 'to')) && !coord && !adv);
          if ((subj || adv || coord) && !agent && !(t.lw === 'used' && n && n.lw === 'to')) { push('pastsimple', _t('Прошедшее простое (Past Simple)'), 'A1', i, i); pastHits.add(t.si); }
        }
      }
      // there is / there are
      if (t.lw === 'there' || t.lw === "there's") {
        const x = t.lw === "there's" ? t : n;
        if (t.lw === "there's" || (same(n) && (BE_PRES.has(auxBase(n)) || BE_PAST.has(auxBase(n))))) push('therebe', _t('Оборот there is / there are'), 'A1', i, t.lw === "there's" ? i : i + 1);
        else if (same(n) && MODALS.has(auxBase(n)) && n2 && n2.lw === 'be') push('theremod', _t('Оборот there + модальный глагол + be'), 'B1', i, i + 2);
        else if (same(n) && HAVE.has(n.lw) && n2 && n2.lw === 'been') push('thereperf', _t('Оборот there has / have been'), 'B1', i, i + 2);
      }
      // степени сравнения
      if (n && same(n) && n.lw === 'than' && (/[^e]er$|ier$/.test(t.lw) || /^(better|worse|further|farther|elder)$/.test(t.lw)) && !NOT_COMPAR.has(t.lw) && t.lw !== 'more' && t.lw !== 'less') push('comper', _t('Сравнительная степень на -er'), 'A1', i, i + 1);
      if (p && same(p) && POSS.test(p.lw) && (/^(best|worst)$/.test(t.lw) || (/est$/.test(t.lw) && !NOT_SUPERL.has(t.lw) && t.lw.length > 5 && (lex.has(t.lw.replace(/iest$/, 'y').replace(/est$/, '')) || lex.has(t.lw.replace(/est$/, 'e')) || lex.has(t.lw.replace(/(.)\1est$/, '$1')))))) push('superlest', _t('Превосходная степень на -est'), 'A1', i - 1, i);
      if (t.lw === 'as' && n && same(n) && n2 && n2.lw === 'as' && !/^(well|soon|long|far|much|many|if|though|a|an|the|to|for|i|you|he|she|they|we|it|such|follows)$/.test(n.lw)) push('asas', _t('Сравнение as … as'), 'A2', i, i + 2);
      if (t.lw === 'too' && n && same(n) && n2 && n2.lw === 'to' && lex.has(n.lemma) && !DET.has(n.lw)) push('tooto', _t('Конструкция too … to'), 'B1', i, i + 2);
      if (t.lw === 'so' && n && same(n) && n2 && n2.lw === 'that' && n.lw !== 'that' && lex.has(n.lemma)) push('soadjthat', _t('Конструкция so … that'), 'B1', i, i + 2);
      if (t.lw === 'such' && n && same(n) && n.lw !== 'as' && (n.lw === 'a' || n.lw === 'an' || (n2 && same(n2) && lex.has(n.lemma)))) push('such', _t('Конструкция such (a) …'), 'B1', i, i + 1);
      if (t.lw === 'enough' && p && same(p) && !DET.has(p.lw) && !/^(not|have|has|had|is|are|was|were|be|get|got|eat|sleep|do|did)$/.test(p.lw) && n && same(n) && (n.lw === 'to' || n.lw === 'for')) push('enough', _t('Прилагательное + enough'), 'B1', i - 1, i);
      if (/^(much|far|even|still|slightly|lot|bit)$/.test(t.lw) && n && same(n) && (/^(more|less|better|worse)$/.test(n.lw) || (/[^e]er$|ier$/.test(n.lw) && !NOT_COMPAR.has(n.lw) && n2 && n2.lw === 'than'))) push('intcomp', _t('Усиленная сравнительная степень (much / far / even …)'), 'B1', i, i + 1);
      if (n && same(n) && n.lw === 'and' && n2 && n2.lw === t.lw && (/^(more|less|better|worse)$/.test(t.lw) || /[^e]er$/.test(t.lw))) push('compand', _t('Сравнительная степень and сравнительная степень'), 'B2', i, i + 2);
      if (t.lw === 'the' && t.first && n && (/^(more|less|better|worse)$/.test(n.lw) || /[^e]er$/.test(n.lw)) && W.slice(i + 2).some(x => x.si === t.si && x.lw === 'the' && W[W.indexOf(x) + 1] && /^(more|less|better|worse)$|[^e]er$/.test(W[W.indexOf(x) + 1].lw))) push('thethe', _t('Конструкция the more …, the more …'), 'B2', i, i + 1);
      // инфинитивные конструкции
      if (t.lw === 'it' && n && same(n) && (BE_PRES.has(auxBase(n)) || BE_PAST.has(n.lw))) {
        const k = skipAdv(i + 2, 1), x = W[k], y = W[k + 1];
        if (x && same(x) && lex.has(x.lemma) && !DET.has(x.lw) && !isPP(x) && !isVing(x) && y && same(y) && (y.lw === 'to' || (y.lw === 'for' && W.slice(k + 2, k + 6).some(z => z.si === t.si && z.lw === 'to')))) push('itadjto', _t('Конструкция it is + прилагательное + to'), 'A2', i, k + 1);
      }
      if (t.lw === 'for' && n && same(n)) { const o = objAt(i + 1); const x = o ? W[i + 1 + o] : null; if (o && x && same(x) && x.lw === 'to' && isVerbBase(W[i + 2 + o])) push('fornpto', _t('Конструкция for + дополнение + инфинитив'), 'B1', i, i + 1 + o); }
      if (t.lw === 'in' && n && n.lw === 'order' && n2 && n2.lw === 'to') push('inorder', _t('Инфинитив цели с in order to'), 'B1', i, i + 2);
      if (t.lw === 'so' && n && n.lw === 'as' && n2 && n2.lw === 'to') push('soasto', _t('Инфинитив цели с so as to'), 'B2', i, i + 2);
      if (t.lw === 'not' && n && n.lw === 'to' && same(n) && isVerbBase(n2)) push('notto', _t('Отрицательный инфинитив (not to)'), 'B1', i, i + 1);
      if (/^(how|what|where|when|which|who|whether)$/.test(t.lw) && n && n.lw === 'to' && same(n) && isVerbBase(n2) && !t.first) push('whto', _t('Вопросительное слово + инфинитив (how to …)'), 'A2', i, i + 1);
      if (V_OBJ_TO.has(vlem(t)) && vlem(t) !== 'would' && n && same(n)) {
        const o = objAt(i + 1); const x = o ? W[i + 1 + o] : null;
        if (o && x && same(x) && x.lw === 'to' && isVerbBase(W[i + 2 + o])) {
          if (vlem(t) === 'ask' || vlem(t) === 'tell') push('asktell', _t('Конструкция ask / tell + дополнение + инфинитив'), 'B1', i, i + 2 + o);
          else push('vobjto', _t('Глагол + дополнение + инфинитив (want somebody to …)'), 'A2', i, i + 2 + o);
        }
      }
      if (t.lw === 'would' && n && /^(like|love|prefer)$/.test(n.lw) && n2) { const o = objAt(i + 2); const x = o ? W[i + 2 + o] : null; if (o && x && x.lw === 'to') push('vobjto', _t('Глагол + дополнение + инфинитив (want somebody to …)'), 'A2', i, i + 2 + o); }
      // каузатив и глаголы восприятия
      if (/^(make|makes|made|making|let|lets|letting)$/.test(t.lw) && n && same(n) && PRON_O.test(n.lw) && n2 && same(n2) && strictV(n2)) push('causlet', _t('Каузатив make / let + дополнение + инфинитив'), 'A2', i, i + 2);
      if ((HAVE.has(t.lw) || vlem(t) === 'get') && n && same(n) && POSS.test(n.lw) && n2 && same(n2) && W[i + 3] && same(W[i + 3]) && isPP(W[i + 3]) && t.lemma !== 'be') push('havesth', _t('Каузатив have / get something done'), 'B2', i, i + 3);
      if (PERC.has(vlem(t)) && n && same(n) && (PRON_O.test(n.lw) || n.kind === 'name') && n.lw !== 'it' && n2 && same(n2)) {
        if (isVing(n2)) push('percing', _t('Глагол восприятия + дополнение + -ing (saw him running)'), 'B1', i, i + 2);
        else if (strictV(n2) && !/^(be|have)$/.test(n2.lw)) push('percinf', _t('Глагол восприятия + дополнение + инфинитив (saw him run)'), 'B1', i, i + 2);
      }
      if (vlem(t) === 'get' && n && same(n) && (isPP(n) || GET_PP.has(n.lw)) && n.lw !== 'used') push('getpp', _t('Конструкция get + причастие II (get married)'), 'B1', i, i + 1);
      if (t.lw === 'having' && isPP(n) && same(n)) push('havingpp', _t('Перфектное причастие (having done)'), 'B2', i, i + 1);
      if (t.lw === 'being' && isPP(n) && same(n) && !(p && same(p) && (BE.has(p.lw) || BE_PRES.has(auxBase(p))))) push('beingpp', _t('Пассивная форма being done'), 'B2', i, i + 1);
      // придаточные и косвенная речь
      if (t.lw === 'because' && !(n && n.lw === 'of')) push('because', _t('Придаточное причины (because)'), 'A2', i, i);
      if (t.lw === 'as' && n && n.lw === 'soon' && n2 && n2.lw === 'as') push('assoonas', _t('Придаточное времени (as soon as)'), 'B1', i, i + 2);
      if (t.lw === 'as' && n && (n.lw === 'if' || n.lw === 'though') && same(n)) push('asif', _t('Придаточное сравнения (as if / as though)'), 'B1', i, i + 1);
      if (t.lw === 'in' && n && n.lw === 'case' && same(n)) push('incase', _t('Придаточное с in case'), 'B1', i, i + 1);
      if (t.lw === 'despite' || (t.lw === 'in' && n && n.lw === 'spite' && n2 && n2.lw === 'of')) push('despite', _t('Предлог уступки (despite / in spite of)'), 'B2', i, t.lw === 'despite' ? i : i + 2);
      if (/^(whenever|wherever|whatever|whoever|whichever)$/.test(t.lw)) push('whever', _t('Придаточное с wh-ever'), 'B2', i, i);
      if (t.lw === 'neither' && W.slice(i + 1).some(x => x.si === t.si && x.lw === 'nor')) push('neithernor', _t('Парный союз neither … nor'), 'B1', i, i);
      if (t.lw === 'not' && n && n.lw === 'only' && !t.first && W.slice(i + 2).some(x => x.si === t.si && x.lw === 'but')) push('notonly', _t('Парный союз not only … but also'), 'B2', i, i + 1);
      if (/^(tell|tells|told|telling)$/.test(t.lw) && n && same(n) && (PRON_O.test(n.lw) || n.kind === 'name') && n2 && same(n2) && (n2.lw === 'that' || PRON_S.test(n2.lw))) push('tellthat', _t('Косвенная речь с tell (told me that …)'), 'B1', i, i + 2);
      if (REPORT_THAT.has(vlem(t)) && !t.first && p && same(p) && (PRON_S.test(p.lw) || p.kind === 'name' || /^(don't|didn't|do|also|really|just)$/.test(p.lw)) && n && same(n) && /^(i|he|she|we|they)$/.test(n.lw) && n2 && same(n2) && /^\s+$/.test(textBetween(t, n))) push('thatomit', _t('Придаточное дополнительное без that (I think he …)'), 'A2', i, i + 1);
      if (vlem(t) === 'wish' && n && same(n) && PRON_S.test(n.lw.replace(/'.*$/, ''))) {
        const rest = W.slice(i + 1, i + 6).filter(same);
        const third = rest.some((x, j) => (x.lw === 'had' || /'d$/.test(x.lw)) && isPP(rest[j + 1]));
        push(third ? 'wish3' : 'wish', third ? 'Wish + Past Perfect (I wish I had done)' : _t('Wish + прошедшее время (I wish I were)'), third ? 'B2' : 'B1', i, i + 1);
      }
      if ((t.lw === 'each' && n && n.lw === 'other') || (t.lw === 'one' && n && n.lw === 'another')) push('recip', _t('Взаимное местоимение (each other)'), 'B1', i, i + 1);
      if (/^(myself|yourself|himself|herself|itself|ourselves|yourselves|themselves)$/.test(t.lw)) push('refl', _t('Возвратное местоимение'), 'A2', i, i);
      // разделительный вопрос, инверсия, выделение
      if (n && same(n) && !W[i + 2] || (n && same(n) && W[i + 2] && W[i + 2].si !== t.si)) {
        const txt = tokenize._text || '';
        if (TAG_AUX.test(t.lw) && /^(i|you|he|she|it|we|they|there)$/.test(n.lw) && p && same(p) && /,\s*$/.test(txt.slice(p.end, t.start)) && /^\s*\?/.test(txt.slice(n.end, n.end + 3))) push('tag', _t('Разделительный вопрос'), 'B1', i, i + 1);
      }
      if (t.first && /^(so|neither|nor)$/.test(t.lw) && n && same(n) && TAG_AUX.test(n.lw) && n2 && same(n2) && PRON_S.test(n2.lw) && !W[i + 3] || (t.first && /^(so|neither|nor)$/.test(t.lw) && n && TAG_AUX.test(n.lw) && n2 && PRON_S.test(n2.lw) && W[i + 3] && W[i + 3].si !== t.si)) push('soinv', _t('Инверсия so / neither + вспомогательный глагол (So do I)'), 'B2', i, i + 2);
      if (t.first && (/^(never|hardly|seldom|rarely|scarcely|little)$/.test(t.lw) || (t.lw === 'not' && n && n.lw === 'only') || (t.lw === 'no' && n && n.lw === 'sooner'))) {
        const k = t.lw === 'not' || t.lw === 'no' ? i + 2 : i + 1; const x = W[k], y = W[k + 1];
        if (x && same(x) && /^(have|has|had|did|do|does|was|were|is|are|will|can|could|would|should)$/.test(x.lw) && y && same(y) && (PRON_S.test(y.lw) || DET.has(y.lw) || y.kind === 'name')) push('neginv', _t('Инверсия после отрицательного наречия (Never have I …)'), 'C1', i, k);
      }
      if (t.first && t.lw === 'what' && n && same(n) && PRON_S.test(n.lw)) {
        const rest = W.slice(i + 2, i + 8).filter(same);
        const txt = tokenize._text || '';
        const q = W.filter(same).pop();
        if (rest.some(x => x.lw === 'is' || x.lw === 'was') && !/\?/.test(txt.slice(t.start, q ? q.end + 2 : t.end))) push('whatcleft', _t('Выделительная конструкция what … is'), 'B2', i, i);
      }
      // причастный оборот в постпозиции (the words given)
      if (POSTMOD.has(t.lw) && p && same(p) && !BE.has(p.lw) && !HAVE.has(p.lw) && !DET.has(p.lw) && !t.first && /s$/.test(p.lw) && !R.ACTION_VERBS.has(p.lw)) {
        push('pp2', _t('Причастие II в постпозиции (the words given)'), 'B2', i - 1, i);
      }
      // -ing формы
      if (/ing$/.test(t.lw) && t.lw.length > 4 && !R.NOT_ING.has(t.lw) && !lexNoun(t.lw)) {
        if (p && same(p) && PREP_G.has(p.lw)) push('gerprep', _t('Герундий после предлога'), 'B1', i - 1, i);
        else if (p && same(p) && VERB_ING[p.lemma]) push('verbger', _t('Глагол + герундий'), VERB_ING[p.lemma], i - 1, i);
        else if (t.lw === 'using' && p) push('using', _t('Оборот с using (Complete … using …)'), 'B1', i, i);
        else if (t.first && gerundSubject(i)) push('gersubj', _t('Герундий в роли подлежащего'), 'B1', i, i);
        else if ((t.first || (p && /,\s*$/.test(textBetween(p, t)))) && !(t.lw === 'having' && isPP(n))) push('ingcl', _t('Причастный оборот с -ing'), 'B2', i, i);
        else if (p && same(p) && !DET.has(p.lw) && /s$/.test(p.lw) && !BE.has(p.lw) && !gapBetween(p, t)) push('ingpost', _t('Причастие I в постпозиции (words describing …)'), 'B2', i - 1, i);
      }
      // придаточные определительные
      if ((t.lw === 'who' || t.lw === 'which' || t.lw === 'whose' || t.lw === 'whom' || t.lw === 'where') && p && same(p) && !t.first) {
        const comma = /,\s*$/.test(textBetween(p, t));
        if (R.REPORT_VERBS.has(p.lemma) || /^(out|about|and|or|of)$/.test(p.lw)) push('indq', _t('Косвенный вопрос / придаточное дополнительное'), 'B1', i, i);
        else if (comma && t.lw !== 'where') push('nondef', _t('Неопределительное придаточное'), 'B2', i, i);
        else if (t.lw === 'whom') push('whom', _t('Придаточное с whom'), 'C1', i, i);
        else if (t.lw === 'whose') push('whose', _t('Придаточное с whose'), 'B1', i, i);
        else push('rel' + t.lw, _t('Определительное придаточное с ') + t.lw, t.lw === 'where' ? 'B1' : 'B1', i, i);
      }
      if (t.lw === 'that' && p && same(p) && n && same(n) && !t.first) {
        if (R.REPORT_VERBS.has(p.lemma)) push('thatcl', _t('Придаточное дополнительное с that'), 'B1', i, i);
        else if (/s$/.test(p.lw) && !DET.has(n.lw) && (lex.has(n.lemma) || R.ACTION_VERBS.has(n.lemma))) push('relthat', _t('Определительное придаточное с that'), 'B1', i, i);
      }
      // косвенные вопросы
      if (WH.has(t.lw) && t.lw !== 'which' && t.lw !== 'who' && t.lw !== 'where' && p && same(p) && (R.REPORT_VERBS.has(p.lemma) || p.lw === 'out' || p.lw === 'about')) {
        push(t.lw === 'whether' ? 'indqwhether' : 'indq', t.lw === 'whether' ? _t('Придаточное дополнительное с whether') : _t('Косвенный вопрос / придаточное дополнительное'), t.lw === 'whether' ? 'B2' : 'B1', i, i);
      }
      // условия и уступки
      if (t.lw === 'if' && !(p && same(p) && (p.lw === 'as' || p.lw === 'only'))) {
        if (p && same(p) && R.REPORT_VERBS.has(p.lemma)) push('indqif', _t('Косвенный вопрос с if'), 'B1', i, i);
        else {
          const restW = W.slice(i + 1).filter(same), rest = restW.map(x => x.lw);
          // придаточное с if – до запятой или then; главное предложение – после него
          let e = 0; while (e < restW.length && !(e && /,/.test(textBetween(restW[e - 1], restW[e]))) && restW[e].lw !== 'then') e++;
          const ifW = restW.slice(0, e), ifL = ifW.map(x => x.lw), mainL = rest.slice(e);
          const pastInIf = ifW.some(x => /^(were|was|had|could|did|didn't|wasn't|weren't|knew|went|won|had)$/.test(x.lw) || /'d$/.test(x.lw) || (isEd(x) && !BE.has(ifL[ifW.indexOf(x) - 1] || '')));
          const third = ifW.some((x, j) => (x.lw === 'had' || /'d$/.test(x.lw)) && isPP(ifW[skipAdvArr(ifW, j + 1)])) || rest.some((x, j) => (x === 'would' || x === 'could' || x === 'might') && rest[j + 1] === 'have');
          const presInIf = ifW.length && !pastInIf;
          if (third) push('cond3', _t('Нереальное условие в прошлом (III тип)'), 'B2', i, i);
          else if (pastInIf || (!presInIf && rest.some(x => /^(would|were|had|could)$/.test(x))) || (e === restW.length && t.first && rest.some(x => /^(were)$/.test(x)))) push('cond2', _t('Нереальное условие'), 'B1', i, i);
          else push('cond', _t('Условное придаточное (if)'), 'A2', i, i);
        }
      }
      if (t.lw === 'unless') push('unless', _t('Условное придаточное с unless'), 'B2', i, i);
      if (t.lw === 'although' || t.lw === 'though') push('although', _t('Уступительное придаточное'), 'B1', i, i);
      if (t.lw === 'even' && n && (n.lw === 'though' || n.lw === 'if')) push('eventh', _t('Уступительное придаточное (even though / if)'), 'B2', i, i + 1);
      if (t.lw === 'whereas') push('whereas', _t('Противительное придаточное (whereas)'), 'C1', i, i);
      if (t.lw === 'while' && !t.first) push('while', _t('Придаточное времени (while)'), 'B1', i, i);
      if (t.lw === 'once' && n && /^(you|they|we|everyone|all)$/.test(n.lw)) push('once', _t('Придаточное времени (once)'), 'B2', i, i);
      if ((t.lw === 'when' || t.lw === 'before' || t.lw === 'after' || t.lw === 'until' || t.lw === 'as') && n && same(n) && /^(you|they|we|he|she|it|everyone|your)$/.test(n.lw) && !(t.first && t.lw === 'when' && n2 && /\?/.test(n2.w))) {
        if (!(t.lw === 'as' && W[i + 2] && W[i + 2].lw === 'possible') && !(t.lw === 'as' && p && p.lw === 'soon')) push(t.lw === 'when' ? 'time' : t.lw === 'as' ? 'timeas' : 'time2', _t('Придаточное времени с ') + t.lw, t.lw === 'as' ? 'B2' : 'A2', i, i);
      }
      if (t.lw === 'so' && n && n.lw === 'that') push('sothat', _t('Придаточное цели (so that)'), 'B1', i, i + 1);
      // инфинитив цели
      if (t.lw === 'to' && n && same(n) && R.ACTION_VERBS.has(n.lw) && p && same(p) && !/^(want|need|try|have|going|able|how|what|ought|order|like|love|used|according|next|listen|talk)$/.test(p.lw) && !R.ACTION_VERBS.has(p.lw) && !hits.some(h => COVER_TO.has(h.id) && h.start <= t.start && h.end >= t.start)) {
        push('purp', _t('Инфинитив цели'), 'A2', i, i + 1);
      }
      // модальность
      if (/^(may|might)$/.test(t.lw) && !t.first) push('may', _t('Модальные may / might'), 'B1', i, i);
      if (t.lw === 'should' || t.lw === 'must') push('modal2', _t('Модальные should / must'), 'A2', i, i);
      // сравнения
      if ((t.lw === 'more' || t.lw === 'less') && n && same(n) && n2 && W.slice(i, i + 5).some(x => x.lw === 'than')) push('compar', _t('Сравнительная конструкция'), 'A2', i, i + 1);
      if (t.lw === 'the' && n && (n.lw === 'most' || n.lw === 'least') && n2) push('superl', _t('Превосходная степень'), 'A2', i, i + 2);
    }
    // одна конструкция – одна позиция
    const seen = new Set();
    const out = hits.filter(h => { const k = h.id + ':' + h.start; if (seen.has(k)) return false; seen.add(k); return true; });
    // синтаксический разбор (parse.js), если он загружен и привязан к токенам
    if (toks.parse && toks.parse.ok && g.IA_PARSE) {
      const make = (id, name, level, ta, tb) => ({ id, name, level, lv: lvNum(level), start: ta.start, end: tb.end });
      toks.parseLog = g.IA_PARSE.refine(out, toks, toks._sents || [], tokenize._text || '', make);
    }
    return out;
    function textBetween(a, b) { return b._src ? '' : (tokenize._text || '').slice(a.end, b.start); }
    // между словами пропуск или номер пропуска (Experts ___ (4) taking) – слова не соседние
    function gapBetween(a, b) { return /[_…(\d]|\.\.\./.test(textBetween(a, b)); }
    // -ing в начале предложения, за которым до запятой идёт личная форма – подлежащее (Working from home has become …)
    function gerundSubject(i) {
      const t = W[i]; const txt = tokenize._text || '';
      for (let j = i + 1; j < W.length && W[j].si === t.si && j < i + 8; j++) {
        if (/,/.test(txt.slice(W[j - 1].end, W[j].start))) return false;
        if (FINITE.has(W[j].lw)) return true;
      }
      return false;
    }
    function lexNoun(w) { return /^(meaning|spelling|reading|writing|listening|speaking|beginning|building|evening|morning|recording|ending|heading|painting|drawing|feeling|meeting|wedding|clothing|setting|warning|training|shopping|swimming|cooking|missing|following|interesting|boring|exciting|amazing|surprising|matching)$/.test(w); }
  }


  /* Нижняя граница уровня в ячейке профиля – самый низкий уровень из указанных (A2-B2, C2 – A2; B2-B1 – B1) */
  function firstLv(s) { const m = String(s || '').match(/(A1|A2|B1|B2|C1|C2)/g); return m ? m.sort((x, y) => LV[x] - LV[y])[0] : null; }
  function resolveGrammar(h, src) {
    h.workLevel = h.level; h.src = _t('рабочая таблица');
    const pid = R.GMAP[h.id], G = g.IA_CEFRJ && g.IA_CEFRJ.grammar[pid];
    if (!G || src === 'working') return;
    h.profile = pid;
    let lv = null;
    if (src === 'cefrj') { lv = firstLv(G.cj) || firstLv(G.fd); if (lv) h.src = 'CEFR-J GP №' + pid + ' (' + G.code + _t('), уровень CEFR-J'); }
    else { lv = firstLv(G.egp); if (lv) h.src = 'CEFR-J GP №' + pid + ' (' + G.code + _t('), столбец EGP'); }
    if (lv) { h.level = lv; h.lv = lvNum(lv); }
  }

  /* ---------- Читаемость ---------- */
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, ''); if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1);
  }
  /* ---------- Уровни лексических единиц ----------
     Общий шаг для A1 (инструкции) и T1 (тексты). Порядок проверок сохранён из engine-0.1:
     устойчивое сочетание – список лексики (у глагола-установки уровень глагола) – учебное значение –
     слово вне списка. o – { lex, target, senses, unknownLevel, isVerb(u), introduced(u) } */
  function levelUnits(units, o) {
    let nUnits = 0, wsum = 0, nAbove = 0, nUnknown = 0;
    const unknownLv = o.unknownLevel === 'ignore' ? null : lvNum(o.unknownLevel);
    const senses = o.senses || null;
    for (const u of units) {
      let lv = null, src = '';
      const sense = senses && own(senses, u.lemma) ? senses[u.lemma] : null;
      if (u.mwe) { lv = lvNum(u.mwe[0]); src = u.mwe[1]; }
      else { const g2 = o.lex.get(u.lemma, o.isVerb ? o.isVerb(u) : false); if (g2) { lv = lvNum(g2.lv); src = g2.src; } }
      if (lv == null && /-/.test(u.lemma) && !/\s/.test(u.lemma)) {
        // сложное слово через дефис (well-paid, part-time) – уровень самой трудной части
        const parts = u.lemma.split('-').filter(Boolean).map(x => o.lex.get(lemmatize(x, o.lex.has, o.lex.get)));
        if (parts.length > 1 && parts.every(Boolean)) { lv = Math.max(...parts.map(x => lvNum(x.lv))); src = _t('по частям сложного слова'); }
      }
      if (sense && (lv == null || lvNum(sense[0]) < lv)) { lv = lvNum(sense[0]); src = sense[1]; }
      if (lv == null) { u.unknown = true; nUnknown++; if (unknownLv == null) { u.lv = null; continue; } lv = unknownLv; src = _t('нет в списке (принято ') + o.unknownLevel + ')'; }
      u.lv = lv; u.src = src; nUnits++;
      u.diff = lv - o.target;
      u.tier = u.diff > 0 ? (u.diff >= 1.5 ? 2 : 1) : 0;
      u.repl = u.tier ? (own(R.REPLACE, u.lemma) ? R.REPLACE[u.lemma] : null) : null;
      u.intro = o.introduced ? o.introduced(u) : null;
      if (u.metaTerm) { u.tier = 0; u.repl = null; }
      if (u.tier && !u.intro) { nAbove++; wsum += u.tier === 2 ? 1 : 0.5; }
    }
    return { nUnits, nAbove, nUnknown, wsum };
  }
  /* Уровни грамматических конструкций относительно целевого */
  function levelGrammar(hits, target, src) {
    hits.forEach(h => resolveGrammar(h, src));
    hits.forEach(h => { h.diff = h.lv - target; h.tier = h.diff > 0 ? (h.diff >= 1.5 ? 2 : 1) : 0; });
    return hits;
  }

  /* ---------- Профиль лексики и покрытие ----------
     Единица учёта – словоупотребление (сочетание из двух слов – два словоупотребления).
     Имена собственные считаются известными, числа и буквенные метки не учитываются.
     coverage(L) – доля словоупотреблений уровня L и ниже, known – доля известных учащемуся
     относительно целевого уровня (в пределах уровня или введено по A7). */
  function lexProfile(units, toks) {
    const by = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    let names = 0, unknown = 0, total = 0, known = 0, aboveTok = 0, introTok = 0;
    toks.forEach(t => { if (t.kind === 'name') names++; });
    for (const u of units) {
      if (u.lv == null) continue;
      const n = u.tok.length;
      total += n;
      if (u.unknown) unknown += n;
      by[LVN[Math.max(1, Math.min(6, Math.floor(u.lv)))]] += n;
      if (!u.tier) known += n; else if (u.intro) { known += n; introTok += n; } else aboveTok += n;
    }
    total += names; known += names;
    const cov = {}; let acc = names;
    for (let k = 1; k <= 6; k++) { acc += by[LVN[k]]; cov[LVN[k]] = total ? acc / total : null; }
    return { tokens: total, names, unknown, byLevel: by, cumulative: cov, known: total ? known / total : null, above: total ? aboveTok / total : null, introduced: introTok };
  }
  /* Лексический порог – самый низкий уровень, при котором покрытие достигает thr */
  function lexLevel(prof, thr) {
    if (!prof.tokens) return null;
    for (let k = 1; k <= 6; k++) if (prof.cumulative[LVN[k]] >= thr - 1e-9) return k;
    return 6;
  }
  /* Грамматический уровень – самый низкий уровень, которому принадлежит доля q найденных конструкций (P90) */
  function grammarLevel(hits, q) {
    const v = hits.map(h => h.lv).filter(x => x != null).sort((a, b) => a - b);
    if (!v.length) return null;
    const need = Math.ceil(v.length * (q == null ? 0.9 : q) - 1e-9);
    return Math.floor(v[Math.max(0, need - 1)]);
  }

  /* ---------- Введённость лексики (A7) ----------
     Словник учебника и история предыдущих объектов того же учебника. */
  function introduction(ordered, S, lex, vocabList) {
    const ranks = {}; ordered.forEach((r, i) => { const k = r.book + '|' + r.unit; if (!(k in ranks)) ranks[k] = i; });
    const vocab = {};
    (vocabList || []).forEach(v => {
      const lem = String(v.word || '').toLowerCase().trim().split(/\s+/).map(x => lemmatize(x, lex.has, lex.get)).join(' ');
      if (!lem) return;
      const k = (v.book || '*') + '|' + lem;
      const rank = v.unit ? unitRank(v.book || '', v.unit, ranks) : -Infinity;
      if (!vocab[k] || vocab[k].rank > rank) vocab[k] = { rank, unit: v.unit };
    });
    const hist = Object.create(null);
    return {
      ranks,
      introduced(rec, u) {
        if (S.useVocab) {
          const v = vocab[rec.book + '|' + u.lemma] || vocab['*|' + u.lemma];
          if (v && v.rank <= unitRank(rec.book, rec.unit, ranks)) return { by: _t('словник'), where: v.unit ? 'Unit ' + String(v.unit).replace(/^unit\s*/i, '') : _t('словник учебника') };
        }
        if (S.useHistory) {
          const h = hist[rec.book + '|' + u.lemma];
          if (h && h.count >= S.historyMin) return { by: _t('инструкции'), where: h.where, count: h.count };
        }
        return null;
      },
      remember(rec, units, where) {
        for (const u of units) {
          const k = rec.book + '|' + u.lemma;
          if (!hist[k]) hist[k] = { count: 0, where: where || labelOf(rec) };
          hist[k].count++;
        }
      }
    };
  }

  /* ---------- Читаемость ---------- */
  function readability(wordToks, nSent) {
    const ws = wordToks.filter(t => t.kind !== 'num');
    const syl = ws.reduce((s, t) => s + syllables(t.w), 0);
    const nw = Math.max(1, ws.length);
    return {
      syl, nw,
      fk: 0.39 * (nw / Math.max(1, nSent)) + 11.8 * (syl / nw) - 15.59,
      fre: 206.835 - 1.015 * (nw / Math.max(1, nSent)) - 84.6 * (syl / nw)
    };
  }

  /* ---------- Лексическое разнообразие и плотность ----------
     MTLD (McCarthy, Jarvis, 2010) – средняя длина отрезка, на котором TTR не опускается ниже 0,72,
     среднее прямого и обратного прохода. Устойчив к длине текста начиная примерно со 100 слов. */
  function mtldPass(words, thr) {
    let factors = 0, types = new Set(), n = 0;
    for (const w of words) {
      n++; types.add(w);
      if (types.size / n <= thr) { factors++; types = new Set(); n = 0; }
    }
    if (n > 0) { const ttr = types.size / n; factors += (1 - ttr) / (1 - thr); }
    return factors > 0 ? words.length / factors : null;
  }
  function mtld(words, thr) {
    thr = thr || 0.72;
    if (words.length < 10) return null;
    const a = mtldPass(words, thr), b = mtldPass(words.slice().reverse(), thr);
    return a != null && b != null ? (a + b) / 2 : (a || b);
  }
  /* Лексическая плотность (Ure, 1971) – доля знаменательных слов среди всех словоупотреблений */
  function lexDensity(wordToks) {
    const ws = wordToks.filter(t => t.kind === 'word' || t.kind === 'name');
    if (!ws.length) return null;
    const content = ws.filter(t => !R.FUNCTION_WORDS || !R.FUNCTION_WORDS.has(t.lw)).length;
    return content / ws.length;
  }

  /* ---------- Порядок и идентификаторы ---------- */
  function orderRecords(records) {
    const firstUnit = {}, firstBook = {};
    records.forEach((r, i) => { const k = r.book + '|' + r.unit; if (!(k in firstUnit)) firstUnit[k] = i; if (!(r.book in firstBook)) firstBook[r.book] = i; });
    return records.map((r, i) => ({ r, i })).sort((x, y) => {
      if (x.r.book !== y.r.book) return firstBook[x.r.book] - firstBook[y.r.book];
      const ux = num(x.r.unit), uy = num(y.r.unit);
      if (ux != null && uy != null && ux !== uy) return ux - uy;
      if (ux == null || uy == null) { const fx = firstUnit[x.r.book + '|' + x.r.unit], fy = firstUnit[y.r.book + '|' + y.r.unit]; if (fx !== fy) return fx - fy; }
      const ex = num(x.r.ex), ey = num(y.r.ex);
      if (ex != null && ey != null && ex !== ey) return ex - ey;
      return x.i - y.i;
    }).map(x => x.r);
  }
  function unitRank(book, unit, ranks) { const n = num(unit); return n != null ? n : (ranks[book + '|' + unit] != null ? ranks[book + '|' + unit] : 0); }
  function hash(s) { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function makeId(r, prefix, extra) { return (prefix || 'i') + hash([r.book, r.unit, r.ex].concat(extra || []).concat([String(r.text || '').trim()]).join('|')); }
  function assignIds(records, prefix, extraFn) {
    const seen = {};
    records.forEach(r => { const base = makeId(r, prefix, extraFn ? extraFn(r) : null); seen[base] = (seen[base] || 0) + 1; r.id = seen[base] > 1 ? base + '-' + seen[base] : base; });
  }
  function labelOf(rec) { return [rec.unit, rec.ex ? (/^\d/.test(rec.ex) ? 'Ex. ' + rec.ex : rec.ex) : ''].filter(Boolean).join(', ') || '—'; }
  function sameUnit(a, b) { if (a == null || b == null) return String(a || '') === String(b || ''); const na = num(a), nb = num(b); return na != null && nb != null ? na === nb : String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
  /* Номера упражнений – «2», «2, 3», «1-3», «Ex. 4a» */
  function exList(s) {
    const out = new Set();
    String(s == null ? '' : s).toLowerCase().replace(/ex(ercise)?s?\.?/g, ' ').split(/[,;/ ]+|\s+и\s+/).forEach(p => {
      p = p.trim(); if (!p) return;
      const m = p.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m && +m[2] >= +m[1] && +m[2] - +m[1] < 50) { for (let k = +m[1]; k <= +m[2]; k++) out.add(String(k)); }
      else out.add(p.replace(/\s/g, ''));
    });
    return out;
  }
  function exKey(s) { return String(s == null ? '' : s).toLowerCase().replace(/^ex(ercise)?\.?\s*/i, '').replace(/\s/g, ''); }

  /* ---------- Статистика ---------- */
  function describe(arr) {
    const v = arr.filter(x => x != null && !isNaN(x)).sort((a, b) => a - b);
    if (!v.length) return { n: 0 };
    const n = v.length, mean = v.reduce((s, x) => s + x, 0) / n;
    const med = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
    const sd = n > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
    const q = p => { const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return v[lo] + (v[hi] - v[lo]) * (i - lo); };
    return { n, mean, med, sd, min: v[0], max: v[n - 1], p25: q(0.25), p75: q(0.75) };
  }
  function weightedKappa(pairs, k = 3) {
    const n = pairs.length; if (n < 2) return null;
    const O = Array.from({ length: k }, () => Array(k).fill(0));
    pairs.forEach(([a, b]) => O[a][b]++);
    const ra = O.map(r => r.reduce((s, x) => s + x, 0)), cb = O[0].map((_, j) => O.reduce((s, r) => s + r[j], 0));
    let num_ = 0, den = 0;
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
      const w = ((i - j) ** 2) / ((k - 1) ** 2);
      num_ += w * O[i][j]; den += w * ra[i] * cb[j] / n;
    }
    return den === 0 ? (num_ === 0 ? 1 : null) : 1 - num_ / den;
  }
  function agreement(scoresA, scoresB, codes) {
    return codes.map(code => {
      const pairs = [];
      for (const id in scoresA) {
        const a = scoresA[id] && scoresA[id][code], b = scoresB[id] && scoresB[id][code];
        if (a == null || b == null || a === 'na' || b === 'na') continue;
        const x = +((a.score != null) ? a.score : a), y = +((b.score != null) ? b.score : b);
        if (isNaN(x) || isNaN(y)) continue;
        pairs.push([x, y]);
      }
      const exact = pairs.length ? pairs.filter(([a, b]) => a === b).length / pairs.length : null;
      return { code, n: pairs.length, exact, kappa: weightedKappa(pairs) };
    });
  }

  /* ---------- Форматирование ---------- */
  function fmt(x, d = 2) { if (x == null || isNaN(x)) return '—'; const s = Number(x).toFixed(d); return EN() ? s : s.replace('.', ','); }
  function pct(a, b) { return b ? Math.round(a / b * 100) + (EN() ? '%' : ' %') : '—'; }
  function plural(n, f) { if (EN()) return Math.abs(n) === 1 ? f[0] : f[2]; n = Math.abs(n) % 100; const n1 = n % 10; if (n > 10 && n < 20) return f[2]; if (n1 > 1 && n1 < 5) return f[1]; if (n1 === 1) return f[0]; return f[2]; }
  function list(arr) { return arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + _t(' и ') + arr[arr.length - 1]; }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    text = String(text || '').replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '';
    const delim = [['\t', (first.match(/\t/g) || []).length], [';', (first.match(/;/g) || []).length], [',', (first.match(/,/g) || []).length]].sort((a, b) => b[1] - a[1])[0];
    const d = delim[1] ? delim[0] : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); if (row.some(c => c.trim())) rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    row.push(cell); if (row.some(c => c.trim())) rows.push(row);
    return rows;
  }
  /* Записи из CSV по словарю полей { поле: регулярное выражение заголовка } */
  function recordsByFields(text, FIELDS, textField) {
    const rows = parseCSV(text); if (rows.length < 2) return [];
    const head = rows[0].map(h => h.toLowerCase().trim());
    const idx = {}; for (const f in FIELDS) idx[f] = head.findIndex(h => FIELDS[f].test(h));
    if (idx[textField] < 0) idx[textField] = 0;
    return rows.slice(1).map(r => { const o = {}; for (const f in FIELDS) if (idx[f] >= 0) o[f] = (r[idx[f]] || '').trim(); return o; }).filter(o => o[textField]);
  }
  function toCSV(rows) { return rows.map(r => r.map(c => { c = c == null ? '' : String(c); return /[",;\n\t]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\n'); }

  /* ---------- Синтаксический разбор (parse.js) ---------- */
  /* store – набор разборов из CoNLL-U (IA_PARSE.makeStore) или null. Вызывается после tokenize и до grammar. */
  function applyParse(toks, text, store) {
    if (!store || !g.IA_PARSE) return null;
    const d = store.find(text);
    if (!d) return { matched: false };
    const p = g.IA_PARSE.attach(toks, text, d);
    return { matched: true, ok: p.ok, coverage: p.coverage, parser: p.parser };
  }
  function parseSummary(results, store) {
    if (!store) return null;
    const rs = results.filter(r => r.parse);
    const used = rs.filter(r => r.parse.ok);
    return { parser: store.parser, file: store.name, module: g.IA_PARSE ? g.IA_PARSE.VERSION : null, records: results.length,
      matched: rs.filter(r => r.parse.matched).length, used: used.length, lowCoverage: rs.filter(r => r.parse.matched && !r.parse.ok).length,
      added: used.reduce((s, r) => s + (r.parse.added || []).length, 0), dropped: used.reduce((s, r) => s + (r.parse.dropped || []).length, 0) };
  }

  g.IA_CORE = {
    VERSION, LV, LVN, R, lvNum, lvName, clamp, num, own, applyParse, parseSummary,
    makeLexicon, parseUserLexicon, lemmatize, sentences, tokenize, lexicalUnits, grammar, resolveGrammar, firstLv,
    levelUnits, levelGrammar, lexProfile, lexLevel, grammarLevel, introduction, readability, syllables, mtld, lexDensity,
    orderRecords, unitRank, hash, makeId, assignIds, labelOf, sameUnit, exList, exKey,
    describe, weightedKappa, agreement, fmt, pct, plural, list, parseCSV, recordsByFields, toCSV,
    BE, HAVE, DET, NOT_NOUN, WH
  };
})(typeof window !== 'undefined' ? window : globalThis);
