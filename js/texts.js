/* Движок режима «Тексты». Версия texts-0.2 (придаточные для T3 – по дереву зависимостей, если загружен разбор).
   Тексты для чтения, скрипты аудирования, диалоги, языковой материал упражнений.
   Все общие шаги – ядро core.js, то же, что в режиме «Инструкции».
   Работает в браузере и в node. */
(function (g) {
  const _t = g._t || (s => s);
  const R = g.IA_RES, C = g.IA_CORE;
  const VERSION = 'texts-0.2';
  const { LVN, lvNum, lvName, clamp, num, makeLexicon, tokenize, lexicalUnits, grammar, levelUnits, levelGrammar,
    lexProfile, lexLevel, grammarLevel, introduction, readability, mtld, lexDensity, orderRecords, assignIds, labelOf,
    sameUnit, exList, exKey, describe, fmt, pct, plural, list } = C;

  /* Настройки режима. Список лексики, источник уровней грамматики, уровень, A7 и слова вне списка
     берутся из общих настроек (SHARED) – так пары «инструкция – текст» измеряются одной мерой. */
  const SHARED = ['levelMode', 'fixedLevel', 'defaultLevel', 'unknownLevel', 'lexMode', 'lexBase', 'lexFallback', 'grammarSource', 'useVocab', 'useHistory', 'historyMin', 'useParse'];
  const DEFAULTS = {
    covHi: 98, covLo: 95, covFloor: 90, covLevel: 95,
    gramTol: 0.5, gramSat: 4, grammarQ: 0.9,
    useSenses: false,
    weights: { T1: 0.5, T2: 0.25, T3: 0.25, T4: 0 },
    levelWeights: { lex: 0.5, gr: 0.3, syn: 0.2 },
    norms: JSON.parse(JSON.stringify(R.TEXT_NORMS)),
    problemIST: 0.4, problemCrit: 0.5
  };
  const CRIT = ['T1', 'T2', 'T3', 'T4', 'IST'];
  const CLAUSE_IDS = new Set(['relwho', 'relwhich', 'relthat', 'relwhere', 'nondef', 'whose', 'whom', 'indq', 'indqwhether', 'indqif', 'thatcl', 'cond', 'cond2', 'unless', 'although', 'eventh', 'whereas', 'while', 'once', 'time', 'timeas', 'time2', 'sothat']);
  const SUBJ = /^(i|you|he|she|it|we|they|the|a|an|my|your|his|her|our|their|this|that|these|those|there|everyone|someone|people|mum|dad)$/;

  function settingsOf(shared, own) {
    const S = Object.assign({}, DEFAULTS, own || {});
    S.weights = Object.assign({}, DEFAULTS.weights, (own || {}).weights || {});
    S.levelWeights = Object.assign({}, DEFAULTS.levelWeights, (own || {}).levelWeights || {});
    S.norms = Object.assign({}, DEFAULTS.norms, (own || {}).norms || {});
    const E = g.IA_ENGINE ? g.IA_ENGINE.DEFAULTS : {};
    SHARED.forEach(k => { S[k] = shared && shared[k] !== undefined ? shared[k] : E[k]; });
    return S;
  }
  function textType(s) {
    const t = String(s || '').trim(); if (!t) return null;
    const hit = R.TEXT_TYPES.find(x => x.id === t.toLowerCase()) || R.TEXT_TYPES.find(x => x.rx.test(t));
    return hit ? hit.id : null;
  }
  const typeName = id => (R.TEXT_TYPES.find(x => x.id === id) || { name: _t('тип не указан') }).name;

  /* Реплики диалога – «A:», «Tom:», «Student B:», «Interviewer:» в начале строки */
  function speakerSpans(text) {
    const out = []; const rx = /^[ \t]*((?:[A-Z][A-Za-z.'-]*)(?: [A-Z][A-Za-z.'-]*){0,2})[ \t]*:/gm; let m;
    while ((m = rx.exec(text))) { const s = m.index + m[0].indexOf(m[1]); out.push({ start: s, end: s + m[1].length, name: m[1] }); }
    return out;
  }
  /* Абзацы – по пустым строкам; если пустых строк нет, а строк больше одной, абзац – строка (реплика) */
  function paragraphs(text) {
    const out = [];
    const byBlank = /\n[ \t]*\n/.test(text);
    const rx = byBlank ? /\n[ \t]*\n+/g : /\n+/g;
    let start = 0, m;
    const push = (a, b) => { const seg = text.slice(a, b); if (seg.trim()) { const lead = seg.length - seg.replace(/^\s+/, '').length; const trail = seg.length - seg.replace(/\s+$/, '').length; out.push({ start: a + lead, end: b - trail }); } };
    while ((m = rx.exec(text))) { push(start, m.index); start = m.index + m[0].length; }
    push(start, text.length);
    if (!out.length) out.push({ start: 0, end: text.length });
    return out;
  }
  function normFor(S, target) {
    const k0 = LVN[Math.max(1, Math.min(6, Math.floor(target)))], k1 = LVN[Math.max(1, Math.min(6, Math.floor(target) + 1))];
    const N0 = S.norms[k0], N1 = S.norms[k1];
    if (target - Math.floor(target) < 0.5) return N0;
    return { wps: (N0.wps + N1.wps) / 2, sub: (N0.sub + N1.sub) / 2, fk: (N0.fk + N1.fk) / 2 };
  }
  /* T1 – кусочно-линейная шкала покрытия. Не ниже covHi – 0, на пороге covLo – 0,5, на covFloor и ниже – 1 */
  function covScore(cov, S) {
    if (cov == null) return null;
    const hi = S.covHi / 100, lo = Math.min(S.covLo / 100, hi - 0.001), fl = Math.min(S.covFloor / 100, lo - 0.001);
    if (cov >= hi) return 0;
    if (cov >= lo) return 0.5 * (hi - cov) / (hi - lo);
    if (cov >= fl) return 0.5 + 0.5 * (lo - cov) / (lo - fl);
    return 1;
  }
  const exceed = (v, n) => v == null || !n ? null : clamp((v - n) / n);

  /* Придаточные предложения – союзы и союзные слова (R.SUBORD) с отсевом вопросов и предлогов,
     плюс придаточные, которые нашли грамматические правила. Подсчёт приблизительный. */
  function clauseMarkers(toks, sents, hits, text) {
    // при загруженном разборе придаточные определяются по дереву зависимостей
    const byTree = g.IA_PARSE && toks.parse && toks.parse.ok ? g.IA_PARSE.clauses(toks) : null;
    if (byTree) return byTree;
    const W = toks.filter(t => t.kind === 'word' || t.kind === 'name');
    const marks = new Map();
    hits.forEach(h => { if (CLAUSE_IDS.has(h.id)) { const t = W.find(x => x.start === h.start); if (t) marks.set(t.start, { start: t.start, si: t.si, w: t.lw, src: _t('правило') }); } });
    const isQ = si => /\?\s*$/.test(text.slice(sents[si].start, sents[si].end));
    for (let i = 0; i < W.length; i++) {
      const t = W[i], n = W[i + 1], p = W[i - 1];
      if (!R.SUBORD.has(t.lw) || marks.has(t.start)) continue;
      const nextSame = n && n.si === t.si, first = !p || p.si !== t.si;
      let ok = false;
      switch (t.lw) {
        case 'because': ok = !(nextSame && n.lw === 'of'); break;
        case 'although': case 'unless': case 'whereas': case 'whenever': case 'wherever': case 'whether': case 'until': ok = true; break;
        case 'though': ok = !!nextSame; break;
        case 'if': ok = !(p && p.lw === 'as'); break;
        case 'when': case 'where': ok = !(first && isQ(t.si)); break;
        case 'while': case 'since': case 'before': case 'after': case 'once': case 'as': ok = nextSame && (SUBJ.test(n.lw) || n.kind === 'name') && !(t.lw === 'as' && W[i + 2] && /^(as|possible|well)$/.test(W[i + 2].lw)); break;
        case 'who': case 'which': case 'whom': case 'whose': ok = !first && !(isQ(t.si) && p && /^(and|or|but)$/.test(p.lw)); break;
        case 'that': ok = false; break; // that – только по правилам (thatcl, relthat)
      }
      if (ok) marks.set(t.start, { start: t.start, si: t.si, w: t.lw, src: _t('союз') });
    }
    return [...marks.values()].sort((a, b) => a.start - b.start);
  }

  /* Измерения фрагмента текста (весь текст или абзац) */
  function measure(part, S, target, norm) {
    const { units, toks, gh, sents, marks } = part;
    const prof = lexProfile(units, toks);
    const wordToks = toks.filter(t => t.kind === 'word' || t.kind === 'name' || t.kind === 'num');
    const nWords = wordToks.length, nSent = Math.max(1, sents.length);
    const gw = gh.reduce((s, h) => s + (h.tier === 2 ? 1 : h.tier === 1 ? 0.5 : 0), 0);
    const g100 = nWords ? gw / nWords * 100 : 0;
    const gAll100 = nWords ? gh.length / nWords * 100 : 0;
    const wps = nWords / nSent;
    const sub = marks.length / nSent;
    const complex = new Set(marks.map(m => m.si)).size / nSent;
    const rd = readability(wordToks, nSent);
    const T1 = covScore(prof.known, S);
    const T2 = nWords ? clamp((g100 - S.gramTol) / Math.max(0.01, S.gramSat - S.gramTol)) : null;
    const t3 = { wps: exceed(wps, norm.wps), sub: exceed(sub, norm.sub) };
    const T3 = nWords ? (t3.wps + t3.sub) / 2 : null;
    const T4 = nWords ? exceed(rd.fk, norm.fk) : null;
    let ws = 0, vs = 0;
    [['T1', T1], ['T2', T2], ['T3', T3], ['T4', T4]].forEach(([k, v]) => { if (v != null && S.weights[k] > 0) { ws += S.weights[k]; vs += S.weights[k] * v; } });
    return { prof, nWords, nSent: sents.length, gw, g100, gAll100, wps, sub, complex, t3, fk: rd.fk, fre: rd.fre, syl: rd.syl, scores: { T1, T2, T3, T4, IST: ws ? vs / ws : null } };
  }

  /* Оценка уровня текста – явная формула.
     L_lex – самый низкий уровень с покрытием не ниже covLevel; L_gr – уровень, которому принадлежат 90 % найденных конструкций;
     L_syn – самый низкий уровень, нормы которого по длине предложения и числу придаточных не превышены.
     L = Σ w·L / Σ w по имеющимся компонентам, округление до половины уровня (A2+ = 2,5). */
  function levelOf(m, gh, S) {
    const lex = lexLevel(m.prof, S.covLevel / 100);
    const gr = grammarLevel(gh, S.grammarQ);
    let syn = 6;
    for (let k = 1; k <= 6; k++) { const N = S.norms[LVN[k]]; if (m.wps <= N.wps + 1e-9 && m.sub <= N.sub + 1e-9) { syn = k; break; } }
    if (!m.nWords) syn = null;
    const W = S.levelWeights; let ws = 0, vs = 0;
    [['lex', lex], ['gr', gr], ['syn', syn]].forEach(([k, v]) => { if (v != null && W[k] > 0) { ws += W[k]; vs += W[k] * v; } });
    const raw = ws ? vs / ws : null;
    return { lex, gr, syn, raw, est: raw == null ? null : Math.round(raw * 2) / 2 };
  }

  const cleanText = t => String(t || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+$/gm, '').replace(/^\s*\n/, '').replace(/\s+$/, '');

  /* ---------- Анализ одного текста ---------- */
  function analyzeOne(rec, ctx) {
    const S = ctx.settings, lex = ctx.lex;
    const text = rec.text;
    const target = S.levelMode === 'fixed' ? lvNum(S.fixedLevel) : (lvNum(rec.level) || lvNum(S.defaultLevel));
    const { toks, sents } = tokenize(text, lex);
    const parse = C.applyParse(toks, text, ctx.parse);
    const speakers = speakerSpans(text);
    if (speakers.length) toks.forEach(t => { if (speakers.some(sp => t.start >= sp.start && t.end <= sp.end)) t.kind = 'label'; });
    const units = lexicalUnits(toks, lex, { meta: false });
    levelUnits(units, {
      lex, target, unknownLevel: S.unknownLevel,
      senses: S.useSenses ? R.SENSES : null,
      introduced: ctx.introduced ? u => ctx.introduced(rec, u) : null
    });
    const gh = levelGrammar(grammar(toks, lex), target, S.grammarSource);
    if (parse && parse.ok && toks.parseLog) Object.assign(parse, toks.parseLog);
    const marks = clauseMarkers(toks, sents, gh, text);
    const norm = normFor(S, target);
    const whole = measure({ units, toks, gh, sents, marks }, S, target, norm);
    const level = levelOf(whole, gh, S);
    // абзацы
    const paras = paragraphs(text).map((p, k) => {
      const inP = x => x >= p.start && x < p.end;
      const ptoks = toks.filter(t => inP(t.start));
      const punits = units.filter(u => inP(toks[u.tok[0]].start));
      const pgh = gh.filter(h => inP(h.start));
      const psents = sents.filter(s => inP(s.start) || (s.start < p.start && s.end > p.start));
      const pmarks = marks.filter(m => inP(m.start));
      const m = measure({ units: punits, toks: ptoks, gh: pgh, sents: psents, marks: pmarks }, S, target, norm);
      return Object.assign({ n: k + 1, start: p.start, end: p.end, above: punits.filter(u => u.tier && !u.intro).map(u => u.lemma) }, m);
    });
    // разнообразие и плотность
    const lemmas = toks.filter(t => t.kind === 'word').map(t => t.lemma);
    const wordToks = toks.filter(t => t.kind === 'word' || t.kind === 'name' || t.kind === 'num');
    const types = new Set(lemmas).size;
    const div = { mtld: lemmas.length >= 50 ? mtld(lemmas) : null, ttr: lemmas.length ? types / lemmas.length : null, types, density: lexDensity(wordToks), reliable: lemmas.length >= 100 };
    const type = textType(rec.text_type) || textType(rec.aspect);
    const res = {
      rec, id: rec.id, kind: 'text', parse, target, targetName: lvName(target), toks, units, sents, grammar: gh, marks, speakers,
      type, typeName: typeName(type), norm, level, paras, div,
      prof: whole.prof,
      counts: { words: whole.nWords, sentences: whole.nSent, paragraphs: paras.length, wps: whole.wps, sub: whole.sub, complex: whole.complex, g100: whole.g100, gAll100: whole.gAll100, gw: whole.gw, syllables: whole.syl,
        units: units.filter(u => u.lv != null).length, above: units.filter(u => u.tier && !u.intro).length, unknown: units.filter(u => u.unknown).length,
        wShare: (() => { const n = units.filter(u => u.lv != null); return n.length ? n.reduce((s, u) => s + (u.tier && !u.intro ? (u.tier === 2 ? 1 : 0.5) : 0), 0) / n.length : 0; })() },
      t3: whole.t3, fk: whole.fk, fre: whole.fre,
      scores: whole.scores,
      exs: [...exList(rec.ex)]
    };
    return res;
  }

  /* ---------- Корпус текстов ---------- */
  function analyzeTexts(records, shared, own, opts = {}) {
    const S = settingsOf(shared, own);
    const lex = makeLexicon(opts.userLex, S.lexMode, S.lexBase, S.lexFallback);
    records.forEach(r => { r.text = cleanText(r.text); });
    assignIds(records, 't', r => [r.title || '', r.text_type || '']);
    const ordered = orderRecords(records);
    const intro = introduction(ordered, S, lex, opts.vocab);
    const pstore = S.useParse !== false ? opts.parse || null : null;
    const ctx = { settings: S, lex, records, introduced: intro.introduced, parse: pstore };
    const results = [];
    for (const rec of ordered) {
      const res = analyzeOne(rec, ctx);
      results.push(res);
      intro.remember(rec, res.units, labelOf(rec) + (rec.title ? _t(' «') + rec.title + _t('»') : ''));
    }
    results.forEach(r => r.issues = issues(r, S));
    const stats = statistics(results, S);
    const meta = {
      date: new Date().toISOString(), texts: VERSION, core: C.VERSION, resources: R.version, lexicon: lex.id, lexiconSize: lex.size,
      grammarSource: { egp: _t('English Grammar Profile (по CEFR-J Grammar Profile 20180315)'), cefrj: 'CEFR-J Grammar Profile 20180315', working: _t('рабочая таблица') }[S.grammarSource] || S.grammarSource,
      rubric: R.TEXT_RUBRIC_VERSION, settings: S, vocabSize: (opts.vocab || []).length, parse: C.parseSummary(results, pstore)
    };
    return { results, stats, meta, settings: S, conclusions: conclusions(results, stats, S, meta) };
  }

  function issues(r, S) {
    const out = [];
    const ab = aboveList(r);
    if (r.scores.T1 > 0) out.push({ c: 'T1', t: _t('Покрытие лексикой уровня ') + r.targetName + ' – ' + pct1(r.prof.known) + _t(' при пороге ') + S.covLo + ' %' + (r.prof.known >= S.covLo / 100 ? _t(' (порог ') + S.covHi + _t(' % не достигнут)') : '') + _t('. Слова выше уровня – ') + ab.slice(0, 12).map(w => w.lemma + ' (' + w.level + (w.count > 1 ? ', ' + w.count : '') + ')').join(', ') + (ab.length > 12 ? _t(' и ещё ') + (ab.length - 12) : '') + '.' });
    const intro = r.units.filter(u => u.tier && u.intro);
    if (intro.length) out.push({ c: 'A7', t: _t('Флаг снят – ') + [...new Map(intro.map(u => [u.lemma, u])).values()].slice(0, 10).map(u => u.lemma + ' (' + (u.intro.by === _t('словник') ? _t('словник, ') : _t('встречалось в ')) + u.intro.where + ')').join(', ') + '.' });
    const gab = r.grammar.filter(h => h.tier);
    if (gab.length) {
      const by = {}; gab.forEach(h => { const k = h.name + ' (' + lvName(h.lv) + ')'; by[k] = (by[k] || 0) + 1; });
      out.push({ c: 'T2', t: _t('Конструкции выше уровня – ') + Object.entries(by).map(([k, n]) => k.charAt(0).toLowerCase() + k.slice(1) + (n > 1 ? ' ×' + n : '')).join('; ') + ', ' + fmt(r.counts.g100, 1) + _t(' на 100 слов с учётом весов.') });
    }
    if (r.scores.T3 > 0) {
      const p = [];
      if (r.t3.wps > 0) p.push(_t('средняя длина предложения ') + fmt(r.counts.wps, 1) + _t(' слова при норме ') + fmt(r.norm.wps, 0));
      if (r.t3.sub > 0) p.push(fmt(r.counts.sub, 2) + _t(' придаточных на предложение при норме ') + fmt(r.norm.sub, 2));
      out.push({ c: 'T3', t: _t('Синтаксис выше нормы уровня – ') + p.join(', ') + '.' });
    }
    if (r.level.est != null && r.level.est - r.target >= 0.5) out.push({ c: 'L', t: _t('Оценка уровня текста – ') + lvName(r.level.est) + _t(' при заявленном ') + r.targetName + _t(' (лексика ') + lvName(r.level.lex) + _t(', грамматика ') + (r.level.gr ? lvName(r.level.gr) : '—') + _t(', синтаксис ') + (r.level.syn ? lvName(r.level.syn) : '—') + ').' });
    if (r.level.est != null && r.target - r.level.est >= 1) out.push({ c: 'L', t: _t('Текст заметно проще заявленного уровня – оценка ') + lvName(r.level.est) + _t(' при ') + r.targetName + _t('. Для рецептивного задания это допустимо, для языкового материала стоит проверить, достаточно ли в тексте изучаемых явлений.') });
    if (r.counts.words < 50) out.push({ c: 'N', t: _t('Короткий текст (') + r.counts.words + _t(' слов) – доли и плотности на нём неустойчивы, MTLD не рассчитывается.') });
    return out;
  }
  const pct1 = x => x == null ? '—' : fmt(x * 100, 1) + ' %';
  function aboveList(r) {
    const m = new Map();
    r.units.forEach((u, i) => {
      if (!u.tier || u.intro) return;
      const x = m.get(u.lemma) || { lemma: u.lemma, level: lvName(u.lv), lv: u.lv, count: 0, unknown: !!u.unknown, src: u.src, para: null, repl: u.repl || '' };
      x.count++;
      if (x.para == null) { const st = r.toks[u.tok[0]].start; const p = r.paras.find(p => st >= p.start && st < p.end); x.para = p ? p.n : null; }
      m.set(u.lemma, x);
    });
    return [...m.values()].sort((a, b) => b.lv - a.lv || b.count - a.count || a.lemma.localeCompare(b.lemma));
  }

  /* ---------- Статистика ---------- */
  function statistics(results, S) {
    const st = { n: results.length };
    st.books = [...new Set(results.map(r => r.rec.book))];
    st.units = [...new Set(results.map(r => r.rec.book + '|' + r.rec.unit))].length;
    st.crit = {};
    CRIT.forEach(c => { const vals = results.map(r => r.scores[c]); const d = describe(vals); d.thr = c === 'IST' ? S.problemIST : S.problemCrit; d.problem = vals.filter(v => v != null && v >= d.thr).length; st.crit[c] = d; });
    const D = f => describe(results.map(f));
    st.counts = { words: D(r => r.counts.words), wps: D(r => r.counts.wps), sub: D(r => r.counts.sub), complex: D(r => r.counts.complex), g100: D(r => r.counts.g100), gAll100: D(r => r.counts.gAll100), fk: D(r => r.fk), fre: D(r => r.fre), mtld: D(r => r.div.mtld), density: D(r => r.div.density), known: D(r => r.prof.known), est: D(r => r.level.est), delta: D(r => r.level.est == null ? null : r.level.est - r.target) };
    st.wordsTotal = results.reduce((s, r) => s + r.counts.words, 0);
    // профиль лексики корпуса
    const by = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 }; let names = 0, tok = 0, unknown = 0;
    results.forEach(r => { for (const k in by) by[k] += r.prof.byLevel[k]; names += r.prof.names; tok += r.prof.tokens; unknown += r.prof.unknown; });
    st.profile = { byLevel: by, names, tokens: tok, unknown };
    st.coverBands = { hi: results.filter(r => r.prof.known != null && r.prof.known >= S.covHi / 100).length, mid: results.filter(r => r.prof.known != null && r.prof.known < S.covHi / 100 && r.prof.known >= S.covLo / 100).length, lo: results.filter(r => r.prof.known != null && r.prof.known < S.covLo / 100).length };
    // слова выше уровня
    const words = Object.create(null);
    results.forEach(r => aboveList(r).forEach(w => { const x = words[w.lemma] = words[w.lemma] || { lemma: w.lemma, level: w.level, lv: w.lv, count: 0, texts: 0, unknown: w.unknown, src: w.src, repl: w.repl }; x.count += w.count; x.texts++; }));
    st.topWords = Object.values(words).sort((a, b) => b.texts - a.texts || b.count - a.count || b.lv - a.lv);
    const gr = {};
    results.forEach(r => r.grammar.forEach(h => { const x = gr[h.id + h.level] = gr[h.id + h.level] || { name: h.name, level: h.level, total: 0, above: 0, texts: new Set() }; x.total++; if (h.tier) x.above++; x.texts.add(r.id); }));
    st.grammar = Object.values(gr).map(x => Object.assign(x, { texts: x.texts.size })).sort((a, b) => b.above - a.above || b.total - a.total);
    const agg = keyFn => {
      const m = {};
      results.forEach(r => { const k = keyFn(r); const x = m[k] = m[k] || { key: k, label: k === r.rec.book + '|' + r.rec.unit ? (r.rec.unit || '—') : k, book: r.rec.book, unit: r.rec.unit, items: [] }; x.items.push(r); });
      return Object.values(m).map(x => {
        x.n = x.items.length; x.mean = {};
        CRIT.forEach(c => { const d = describe(x.items.map(r => r.scores[c])); x.mean[c] = d.n ? d.mean : null; });
        const e = describe(x.items.map(r => r.level.est)); x.est = e.n ? e.mean : null;
        const k = describe(x.items.map(r => r.prof.known)); x.known = k.n ? k.mean : null;
        x.words = x.items.reduce((s, r) => s + r.counts.words, 0);
        x.problem = x.items.filter(r => r.scores.IST >= S.problemIST).length;
        return x;
      });
    };
    st.unitAgg = agg(r => r.rec.book + '|' + r.rec.unit);
    st.bookAgg = agg(r => r.rec.book).map(x => Object.assign(x, { label: x.book || '—' }));
    st.typeAgg = agg(r => r.typeName).map(x => Object.assign(x, { label: x.key }));
    st.levels = {}; results.forEach(r => st.levels[r.targetName] = (st.levels[r.targetName] || 0) + 1);
    return st;
  }
  function corpusNorms(results) {
    const by = {};
    results.forEach(r => { const k = LVN[Math.floor(r.target)]; (by[k] = by[k] || []).push(r); });
    const out = {};
    for (const k in by) {
      if (by[k].length < 5) continue;
      const q = a => describe(a).p75;
      out[k] = { wps: Math.round(q(by[k].map(r => r.counts.wps)) * 10) / 10, sub: Math.round(q(by[k].map(r => r.counts.sub)) * 100) / 100, fk: Math.round(q(by[k].map(r => r.fk)) * 10) / 10, n: by[k].length };
    }
    return out;
  }

  /* ---------- Пары «инструкция – текст» (поддержка критерия R6) ----------
     Связь – тот же учебник и урок, номер упражнения инструкции входит в поле ex текста.
     Уровни считаются одной формулой для обоих объектов – L_lex (порог покрытия covLevel) и L_gr (P90).
     Отсутствие найденных конструкций принимается за уровень A1 (базовая грамматика, которую правила не выделяют).
     Для короткой инструкции порог покрытия означает уровень самого трудного слова – учащийся должен понять каждое слово.
     Δ = max(ΔL_lex, ΔL_gr) – насколько инструкция сложнее текста.
     Превышение E = min(Δ, L_instr − заявленный уровень) – только та часть, которая выходит и за текст, и за уровень.
     Пара отмечается, если E > 0, значение на карте P = E / 2 (0,5 – на уровень, 1 – на два и более). */
  function pairs(instr, texts, S) {
    S = S || DEFAULTS;
    const thr = (S.covLevel || 95) / 100, q = S.grammarQ || 0.9;
    const out = [];
    if (!instr || !texts) return out;
    for (const t of texts) {
      if (!t.exs.length) continue;
      const set = new Set(t.exs.map(exKey));
      for (const i of instr) {
        if (i.rec.book !== t.rec.book || !sameUnit(i.rec.unit, t.rec.unit) || !set.has(exKey(i.rec.ex))) continue;
        const iLex = lexLevel(i.prof, thr), tLex = lexLevel(t.prof, thr);
        const iGr = grammarLevel(i.grammar, q), tGr = grammarLevel(t.grammar, q);
        const dLex = iLex != null && tLex != null ? iLex - tLex : null;
        const dGr = (iGr || 1) - (tGr || 1);
        const dMax = Math.max(dLex == null ? -9 : dLex, dGr);
        const iMax = Math.max(iLex || 1, iGr || 1);
        const excess = Math.max(0, Math.min(dMax, iMax - i.target));
        const dIdx = i.scores.ISV != null && t.scores.IST != null ? i.scores.ISV - t.scores.IST : null;
        const dAbove = i.counts.wShare - t.counts.wShare;
        out.push({ key: i.id + '|' + t.id, instr: i, text: t, iLex, tLex, iGr, tGr, dLex, dGr, dMax, iMax, excess, dIdx, dAbove, P: clamp(excess / 2), harder: excess > 0 });
      }
    }
    return out;
  }
  /* Сводка по урокам – инструкции и тексты одного урока */
  function unitSummary(instr, texts, prs) {
    const m = new Map();
    const get = (book, unit) => { const k = book + '|' + unit; if (!m.has(k)) m.set(k, { key: k, book, unit, label: unit || '—', I: [], T: [], P: [] }); return m.get(k); };
    const ordered = orderRecords([].concat((instr || []).map(r => Object.assign({}, r.rec, { _r: r, _k: 'I' })), (texts || []).map(r => Object.assign({}, r.rec, { _r: r, _k: 'T' }))));
    ordered.forEach(x => get(x.book, x.unit)[x._k].push(x._r));
    (prs || []).forEach(p => get(p.text.rec.book, p.text.rec.unit).P.push(p));
    return [...m.values()].map(x => {
      const mean = (arr, f) => { const d = describe(arr.map(f)); return d.n ? d.mean : null; };
      x.isv = mean(x.I, r => r.scores.ISV); x.ist = mean(x.T, r => r.scores.IST);
      x.delta = x.isv != null && x.ist != null ? x.isv - x.ist : null;
      x.iLex = mean(x.I, r => r.lvl ? r.lvl.lex95 : null); x.tLex = mean(x.T, r => r.level.lex); x.tEst = mean(x.T, r => r.level.est);
      x.harder = x.P.filter(p => p.harder).length;
      x.pmean = mean(x.P, p => p.P);
      return x;
    });
  }

  /* ---------- Выводы ---------- */
  const TX = [_t('текст'), _t('текста'), _t('текстов')];
  const TX_P = [_t('тексте'), _t('текстах'), _t('текстах')];
  function conclusions(results, st, S, meta) {
    const out = []; const n = results.length; if (!n) return out;
    const C2 = st.crit;
    const lv = Object.entries(st.levels).map(([k, v]) => k + (Object.keys(st.levels).length > 1 ? ' (' + v + ')' : '')).join(', ');
    out.push({ c: 'IST', title: _t('Общая картина'), text: _t('Инструмент обработал ') + n + ' ' + plural(n, TX) + _t(' общим объёмом ') + st.wordsTotal + ' ' + plural(st.wordsTotal, [_t('слово'), _t('слова'), _t('слов')]) + _t(' из ') + st.books.length + ' ' + plural(st.books.length, [_t('учебника'), _t('учебников'), _t('учебников')]) + _t(' (уровень для анализа – ') + lv + _t('). Средний индекс сложности текста составляет ') + fmt(C2.IST.mean) + _t(' при медиане ') + fmt(C2.IST.med) + '. ' +
      (C2.IST.problem ? C2.IST.problem + ' ' + plural(C2.IST.problem, TX) + ' (' + pct(C2.IST.problem, n) + ') ' + plural(C2.IST.problem, [_t('достигает'), _t('достигают'), _t('достигают')]) + _t(' порога ') + fmt(S.problemIST) + _t(' и ') + plural(C2.IST.problem, [_t('требует'), _t('требуют'), _t('требуют')]) + _t(' экспертного взгляда.') : _t('Ни один текст не достигает порога ') + fmt(S.problemIST) + '.') });
    const cb = st.coverBands;
    let t = _t('Средняя доля словоупотреблений, известных учащимся на заявленном уровне, составляет ') + pct1(st.counts.known.mean) + '. ';
    t += _t('Порог ') + S.covHi + _t(' % достигают ') + cb.hi + ' ' + plural(cb.hi, TX) + _t(', между ') + S.covLo + _t(' и ') + S.covHi + _t(' % находятся ') + cb.mid + _t(', ниже ') + S.covLo + ' % – ' + cb.lo + '. ';
    const tw = st.topWords.slice(0, 6);
    if (tw.length) t += _t('Чаще всего покрытие снижают ') + list(tw.map(w => w.lemma + ' (' + w.level + (w.unknown ? _t(', нет в списке') : '') + ')')) + '.';
    out.push({ c: 'T1', title: _t('Лексика'), text: t.trim() });
    const ga = st.grammar.filter(x => x.above);
    if (ga.length) { const t2 = results.filter(r => r.scores.T2 > 0).length, ga1 = results.filter(r => r.grammar.some(h => h.tier)).length; out.push({ c: 'T2', title: _t('Грамматика'), text: _t('Конструкции выше уровня встречаются в ') + ga1 + ' ' + plural(ga1, TX_P) + _t(', плотность выше допуска ') + fmt(S.gramTol, 1) + _t(' на 100 слов – в ') + t2 + _t('. Чаще других это ') + list(ga.slice(0, 3).map(x => x.name.charAt(0).toLowerCase() + x.name.slice(1) + ' (' + x.level + ', ' + x.above + ')')) + '.' }); }
    else out.push({ c: 'T2', title: _t('Грамматика'), text: _t('Грамматические конструкции текстов не превышают заявленный уровень.') });
    const t3n = results.filter(r => r.scores.T3 > 0).length;
    out.push({ c: 'T3', title: _t('Синтаксис'), text: _t('Средняя длина предложения составляет ') + fmt(st.counts.wps.mean, 1) + _t(' слова, на предложение в среднем приходится ') + fmt(st.counts.sub.mean, 2) + _t(' придаточного, доля сложноподчинённых предложений – ') + pct1(st.counts.complex.mean) + '. ' + (t3n ? t3n + ' ' + plural(t3n, TX) + ' ' + plural(t3n, [_t('превышает'), _t('превышают'), _t('превышают')]) + _t(' нормы уровня по длине предложения или числу придаточных.') : _t('Все тексты укладываются в синтаксические нормы уровня.')) });
    const hi = results.filter(r => r.level.est != null && r.level.est - r.target >= 0.5), lo = results.filter(r => r.level.est != null && r.target - r.level.est >= 1);
    out.push({ c: 'L', title: _t('Уровень текстов'), text: _t('Средняя оценка уровня текстов – ') + lvName(Math.round(st.counts.est.mean * 2) / 2) + ' (' + fmt(st.counts.est.mean, 1) + _t(' по шкале A1 = 1 … C2 = 6), среднее отклонение от заявленного уровня ') + (st.counts.delta.mean >= 0 ? '+' : '') + fmt(st.counts.delta.mean, 1) + '. ' + (hi.length ? _t('Оценка выше заявленного уровня у ') + hi.length + ' ' + plural(hi.length, [_t('текста'), _t('текстов'), _t('текстов')]) + (hi.length <= 4 ? ' (' + hi.map(r => _t('«') + (r.rec.title || labelOf(r.rec)) + _t('» – ') + lvName(r.level.est)).join(', ') + ')' : '') + '. ' : _t('Ни один текст не оценён выше заявленного уровня. ')) + (lo.length ? lo.length + ' ' + plural(lo.length, TX) + _t(' на уровень и более проще заявленного, это обычно для языкового материала и опорных текстов.') : '') });
    const dv = st.counts.mtld;
    if (dv.n) out.push({ c: 'T5', title: _t('Лексическое разнообразие'), text: _t('MTLD в среднем ') + fmt(dv.mean, 1) + _t(' (рассчитан для ') + dv.n + ' ' + plural(dv.n, TX) + _t(' от 50 слов), лексическая плотность ') + pct1(st.counts.density.mean) + _t('. Эти показатели приведены справочно и в индекс сложности текста не входят.') });
    const ua = st.unitAgg.filter(u => u.mean.IST != null).sort((a, b) => b.mean.IST - a.mean.IST);
    if (ua.length >= 3) out.push({ c: 'IST', title: _t('Где сгущаются трудности'), text: _t('Самый высокий индекс сложности текста дают ') + list(ua.slice(0, 2).map(u => (st.books.length > 1 ? _t('«') + u.book + _t('», ') : '') + u.label + ' (' + fmt(u.mean.IST) + ')')) + _t(', самый низкий – ') + (st.books.length > 1 ? _t('«') + ua[ua.length - 1].book + _t('», ') : '') + ua[ua.length - 1].label + ' (' + fmt(ua[ua.length - 1].mean.IST) + ').' });
    out.push({ c: 'T4', title: _t('Ограничения'), text: _t('Индекс Флеша-Кинкейда (в среднем ') + fmt(st.counts.fk.mean, 1) + _t(') откалиброван на читателях-носителях языка, поэтому ') + (S.weights.T4 > 0 ? _t('входит в индекс сложности текста с весом ') + fmt(S.weights.T4, 2) + '. ' : _t('в индекс сложности текста не входит. ')) + _t('Уровни слов взяты из списка ') + meta.lexicon + _t(', уровни грамматических конструкций – ') + meta.grammarSource + _t('. Придаточные предложения и конструкции распознаются правилами, без синтаксического парсера. Инструмент не выносит итоговый вердикт, а показывает зоны, которые требуют экспертного взгляда.') });
    return out;
  }
  function pairConclusions(prs, summary) {
    if (!prs.length) return [];
    const h = prs.filter(p => p.harder).sort((a, b) => b.excess - a.excess);
    const books = new Set(prs.map(p => p.text.rec.book)).size;
    const out = [{ c: 'R6', title: _t('Инструкции и тексты'), text: _t('Инструмент сопоставил ') + prs.length + ' ' + plural(prs.length, [_t('пару'), _t('пары'), _t('пар')]) + _t(' «инструкция – текст». ') + (h.length ? _t('В ') + h.length + ' ' + plural(h.length, [_t('паре'), _t('парах'), _t('парах')]) + _t(' инструкция по лексике или грамматике сложнее текста, к которому она относится, – ') + h.slice(0, 4).map(p => (books > 1 ? _t('«') + p.instr.rec.book + _t('», ') : '') + p.instr.rec.unit + ', Ex. ' + p.instr.rec.ex + ' (' + [p.dLex > 0 ? _t('лексика +') + p.dLex : '', p.dGr > 0 ? _t('грамматика +') + p.dGr : ''].filter(Boolean).join(', ') + ')').join('; ') + (h.length > 4 ? _t(' и в других парах') : '') + _t('. Эти пары стоит проверить по критерию R6.') : _t('Ни одна инструкция не сложнее своего текста по уровню лексики и грамматики.')) }];
    const s = summary.filter(x => x.delta != null && x.delta >= 0.1).sort((a, b) => b.delta - a.delta);
    if (s.length) out.push({ c: 'R6', title: _t('Уроки'), text: _t('Средний индекс сложности восприятия инструкций превышает индекс сложности текстов на 0,1 и более в ') + s.length + ' ' + plural(s.length, [_t('уроке'), _t('уроках'), _t('уроках')]) + ' (' + s.slice(0, 4).map(x => (books > 1 ? _t('«') + x.book + _t('», ') : '') + x.label + ' – ' + fmt(x.delta, 2)).join('; ') + _t('). Оба индекса показывают превышение заявленного уровня по шкале 0-1, поэтому их разность сопоставима.') });
    return out;
  }

  /* ---------- Ввод ---------- */
  const FIELDS = {
    text: /^(text|текст|текст для чтения|script|скрипт|transcript|material|материал)$/,
    title: /^(title|заголовок|название текста|название)$/,
    level: /^(level|cefr|уровень|заявленный уровень|уровень учебника)$/,
    book: /^(book|textbook|учебник)$/, publisher: /^(publisher|издательство)$/, year: /^(year|год)$/,
    unit: /^(unit|lesson|урок|раздел учебника|модуль)$/, section: /^(section|раздел|part|часть)$/,
    ex: /^(ex|exercise|exercises|упражнение|упражнения|номер|№|no)$/,
    text_type: /^(text_type|text type|type|тип текста|тип)$/, aspect: /^(aspect|аспект|skill|вид речевой деятельности)$/,
    source: /^(source|источник|authenticity|аутентичность)$/,
    audience: /^(audience|аудитория|целевая аудитория)$/, l1: /^(l1|родной язык|язык-посредник|native language)$/
  };
  function recordsFromCSV(text) { return C.recordsByFields(text, FIELDS, 'text'); }

  g.IA_TEXTS = { VERSION, DEFAULTS, SHARED, CRIT, settingsOf, analyzeTexts, pairs, unitSummary, pairConclusions, corpusNorms, recordsFromCSV, cleanText, textType, typeName, paragraphs, speakerSpans, aboveList, covScore, levelOf };
})(typeof window !== 'undefined' ? window : globalThis);
