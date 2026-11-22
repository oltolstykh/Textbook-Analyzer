/* Движок режима «Инструкции». Версия engine-0.3 (необязательный синтаксический разбор, повелительное наклонение не входит в A2).
   Общие шаги (лексикон, лемматизация, токенизация, грамматика, A7, статистика, CSV)
   выполняет ядро core.js – режим «Тексты» использует тот же код.
   Работает в браузере и в node (для проверок). */
(function (g) {
  const _t = g._t || (s => s);
  const R = g.IA_RES, C = g.IA_CORE;
  const VERSION = 'engine-0.3';
  const { LV, LVN, lvNum, lvName, clamp, num, makeLexicon, parseUserLexicon, tokenize, lexicalUnits, grammar,
    levelUnits, levelGrammar, lexProfile, lexLevel, grammarLevel, introduction, readability,
    orderRecords, assignIds, labelOf, sameUnit, describe, agreement, weightedKappa, fmt, pct, plural, list, parseCSV, toCSV,
    DET, NOT_NOUN } = C;

  const DEFAULTS = {
    levelMode: 'data', fixedLevel: 'A2', defaultLevel: 'A2',
    tolerance: 5, saturation: 15, unknownLevel: 'B2',
    useSenses: true, senses: null, useVocab: true, useHistory: true, historyMin: 1, useParse: true,
    lexMode: 'augment', lexBase: 'cefrj', lexFallback: false, grammarSource: 'egp',
    norms: JSON.parse(JSON.stringify(R.NORMS)),
    weights: { A1: 0.35, A2: 0.25, A3: 0.25, A4: 0.15 },
    problemISV: 0.4, problemCrit: 0.5, profile: 'standard'
  };
  const PROFILES = {
    strict:   { tolerance: 3, saturation: 10, problemISV: 0.3, normK: 0.8 },
    standard: { tolerance: 5, saturation: 15, problemISV: 0.4, normK: 1 },
    soft:     { tolerance: 8, saturation: 20, problemISV: 0.5, normK: 1.25 }
  };
  function applyProfile(s, id) {
    const p = PROFILES[id]; if (!p) return s;
    const out = JSON.parse(JSON.stringify(s));
    out.profile = id; out.tolerance = p.tolerance; out.saturation = p.saturation; out.problemISV = p.problemISV;
    out.norms = {};
    for (const k in R.NORMS) out.norms[k] = {
      words: Math.round(R.NORMS[k].words * p.normK), wps: Math.round(R.NORMS[k].wps * p.normK),
      actions: Math.max(1, Math.round(R.NORMS[k].actions * (p.normK < 1 ? 1 : p.normK > 1 ? 1.34 : 1)))
    };
    return out;
  }

  /* ---------- Действия и тип задания ---------- */
  const SKIP_START = new Set(['now', 'then', 'first', 'next', 'finally', 'please', 'also', 'afterwards', 'again', 'together', 'quickly', 'carefully', 'second', 'last']);
  function actions(toks, units) {
    const W = toks.filter(t => t.kind === 'word');
    const acts = [];
    for (let i = 0; i < W.length; i++) {
      const t = W[i], p = W[i - 1];
      let start = !p || p.si !== t.si;
      if (!start && p && /^(and|then|or)$/.test(p.lw)) start = true;
      if (!start && p && /[,;:]\s*$/.test((C.tokenize._text || '').slice(p.end, t.start))) start = true;
      if (!start && p && (p.lw === "don't" || p.lw === "let's")) start = true;
      if (!start) continue;
      if (SKIP_START.has(t.lw) || t.lw === "don't" || t.lw === "let's") {
        // слово-вводитель – действие ищем дальше
        const n = W[i + 1]; if (n && n.si === t.si && R.ACTION_VERBS.has(n.lw)) { pushAct(n, i + 1); i++; }
        continue;
      }
      if (R.ACTION_VERBS.has(t.lw) && t.lw === t.lemma) pushAct(t, i);
    }
    function pushAct(t, i) {
      const u = units.find(u => u.tok.includes(toks.indexOf(t)));
      const verb = u && u.mwe && /глагол|устойчивое/.test(u.mwe[1]) ? u.lemma : t.lemma;
      if (acts.some(a => a.tok === t)) return;
      acts.push({ verb, tok: t, wi: i, org: t.lemma === 'work' && W[i + 1] && W[i + 1].lw === 'in' });
    }
    return acts;
  }
  const PRIORITY = ['gap', 'match', 'choose', 'order', 'trans', 'corr', 'find', 'sort', 'transl', 'ans', 'write', 'speak', 'listen', 'read', 'repeat'];
  const VERB2TYPE = {};
  R.TASK_TYPES.forEach(tt => tt.verbs.forEach(v => { if (!VERB2TYPE[v]) VERB2TYPE[v] = tt.id; }));
  function taskType(acts, low) {
    const types = acts.filter(a => !a.org).map(a => {
      let t = VERB2TYPE[a.verb] || VERB2TYPE[a.tok.lemma];
      if (a.verb === 'put') t = /\border\b/.test(low) ? 'order' : /\bform\b|\bgroup|\bcolumn|\bcategor/.test(low) ? (/\bform\b/.test(low) ? 'gap' : 'sort') : 'gap';
      if (a.verb === 'make' || a.verb === 'turn' || a.verb === 'change') t = /question|negative|sentence|plural|passive|form/.test(low) ? 'trans' : 'write';
      if (a.verb === 'check') t = /mistake|error/.test(low) ? 'corr' : 'read';
      if (a.verb === 'find' && /mistake|error/.test(low)) t = 'corr';
      if (a.verb === 'number') t = 'order';
      if (a.verb === 'use') t = null;
      return { a, t };
    }).filter(x => x.t);
    if (!types.length) return null;
    types.sort((x, y) => PRIORITY.indexOf(x.t) - PRIORITY.indexOf(y.t));
    return types[0];
  }
  function formulationKey(main, toks) {
    if (!main) return null;
    const W = toks.filter(t => t.kind === 'word');
    const vi = W.indexOf(main.a.tok);
    const vparts = main.a.verb.split(' ').length;
    let obj = null;
    for (let j = vi + vparts; j < W.length && j < vi + vparts + 5; j++) {
      const x = W[j]; if (x.si !== main.a.tok.si) break;
      if (NOT_NOUN.has(x.lw) && !DET.has(x.lw)) { if (/^(in|with|from|to|using|and)$/.test(x.lw)) break; continue; }
      if (DET.has(x.lw)) continue;
      obj = x.lemma; break;
    }
    return main.a.verb + (obj ? ' ' + obj : '');
  }

  /* ---------- Прочие критерии ---------- */
  const NUMW = '(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty)';
  function paramsD1(low, type) {
    if (type !== 'write' && type !== 'speak') return { score: null, found: [] };
    const found = [];
    if (new RegExp('\\b\\d+\\s*(?:[-–]\\s*\\d+\\s*)?words?\\b').test(low)) found.push(_t('объём в словах'));
    if (new RegExp('\\b' + NUMW + '\\s*(?:[-–]\\s*' + NUMW + '\\s*)?(?:sentences|lines|paragraphs)\\b').test(low)) found.push(_t('объём в предложениях'));
    if (new RegExp('\\b' + NUMW + '\\s*(?:[-–]\\s*' + NUMW + '\\s*)?(?:minutes?|mins?|seconds?)\\b').test(low)) found.push(_t('время'));
    if (new RegExp('\\b' + NUMW + '\\s+(?:questions|ideas|things|reasons|examples|points|facts|tips|sentences|words)\\b').test(low)) found.push(_t('число ответов'));
    return { score: found.length ? 0 : 1, found };
  }
  function refsD3(text, rec, index) {
    const refs = []; const re = /\b(?:ex(?:ercise)?s?|activity|task)[\s.․]*(\d+[a-z]?)\b/gi; let m;
    while ((m = re.exec(text))) {
      const u = (text.slice(Math.max(0, m.index - 14), m.index).match(/unit\s*(\d+)/i) || [])[1];
      const exNo = m[1].toLowerCase();
      const unitNo = u || rec.unit;
      const found = index.some(r => r.book === rec.book && sameUnit(r.unit, unitNo) && String(r.ex || '').toLowerCase().replace(/^ex\.?\s*/i, '').replace(/\s/g, '') === exNo && r !== rec);
      refs.push({ text: m[0], ok: found, kind: 'ex' });
    }
    const loose = text.match(/\bthe (box|text|table|chart|list|picture|pictures|photo|photos|recording|audio|dialogue|article|email|map|diagram)\b|\bpage \d+|\btrack \d+(?:\.\d+)?/gi) || [];
    loose.forEach(x => refs.push({ text: x, ok: null, kind: 'loose' }));
    const ex = refs.filter(r => r.kind === 'ex');
    return { refs, score: ex.length ? (ex.some(r => !r.ok) ? 1 : 0) : null };
  }
  function ambiguityD4(low, type) {
    const notes = [];
    if (/\bmatch\b/.test(low) && !/\bmatch\b[^.]*\b(with|to|and)\b|[a-h]\s*[-–]\s*[a-h]|\d\s*[-–]\s*\d/.test(low)) notes.push(_t('не указано, с чем соотнести'));
    if (type === 'gap' && /\b(gaps?|blanks?|spaces?)\b/.test(low) && !/\b(with|using|from|by|in brackets|own words|yourself|use)\b/.test(low)) notes.push(_t('не указан источник слов для пропусков'));
    if (/^\s*(?:\d+[.)]?\s*)?[a-z]+(?:\s+[a-z]+)?\s+(them|it|these|those)\b/.test(low) && !/\b(text|words?|sentences?|questions?)\b[^.]*\b(them|it)\b/.test(low.split(/[.!?]/)[0])) notes.push(_t('местоимение без антецедента в начале инструкции'));
    if (/\b(choose|circle|select)\b/.test(low) && !/\b(correct|right|best|word|answer|option|one|picture|phrase|form|alternative|letter|number|sentence|verb)\b/.test(low)) notes.push(_t('не указано, что выбрать'));
    return { score: notes.length ? (notes.length > 1 ? 1 : 0.5) : 0, notes };
  }

  /* ---------- Анализ одной инструкции ---------- */
  function analyzeOne(rec, ctx) {
    const S = ctx.settings, lex = ctx.lex;
    const text = String(rec.text || '').trim();
    const target = S.levelMode === 'fixed' ? lvNum(S.fixedLevel) : (lvNum(rec.level) || lvNum(S.defaultLevel));
    const { toks, sents } = tokenize(text, lex);
    const parse = C.applyParse(toks, text, ctx.parse);
    const units = lexicalUnits(toks, lex);
    const acts = actions(toks, units);
    const low = text.toLowerCase();
    // A1 лексика
    const lu = levelUnits(units, {
      lex, target, unknownLevel: S.unknownLevel,
      senses: S.useSenses ? (S.senses || R.SENSES) : null,
      isVerb: u => acts.some(a => u.tok.includes(toks.indexOf(a.tok))),
      introduced: ctx.introduced ? u => ctx.introduced(rec, u) : null
    });
    const { nUnits, wsum, nAbove, nUnknown } = lu;
    const wShare = nUnits ? wsum / nUnits : 0;
    const tol = S.tolerance / 100, sat = Math.max(S.saturation / 100, tol + 0.01);
    const A1 = nUnits ? clamp((wShare - tol) / (sat - tol)) : null;
    // A2 грамматика
    // повелительное наклонение – жанровая форма инструкции, в A2 не учитывается (выделяется только по разбору)
    const gh = levelGrammar(grammar(toks, lex).filter(h => h.id !== 'imper'), target, S.grammarSource);
    if (parse && parse.ok && toks.parseLog) Object.assign(parse, toks.parseLog);
    const A2 = clamp(gh.reduce((s, h) => s + (h.tier === 2 ? 1 : h.tier === 1 ? 0.5 : 0), 0));
    // A3 объём
    const wordToks = toks.filter(t => t.kind === 'word' || t.kind === 'name' || t.kind === 'num');
    const nWords = wordToks.length;
    const nSent = sents.length;
    const nAct = Math.max(1, acts.length);
    const normKey = LVN[Math.max(1, Math.min(6, Math.floor(target)))];
    const nextKey = LVN[Math.max(1, Math.min(6, Math.floor(target) + 1))];
    const N0 = S.norms[normKey], N1 = S.norms[nextKey];
    const plus = target - Math.floor(target) >= 0.5;
    const norm = plus ? { words: (N0.words + N1.words) / 2, wps: (N0.wps + N1.wps) / 2, actions: (N0.actions + N1.actions) / 2 } : N0;
    const wps = nWords / Math.max(1, nSent);
    const e = (v, n) => clamp((v - n) / n);
    const a3parts = { words: e(nWords, norm.words), wps: e(wps, norm.wps), actions: e(acts.length, norm.actions) };
    const A3 = nWords ? (a3parts.words + a3parts.wps + a3parts.actions) / 3 : null;
    // A4 метаязык
    const meta = [];
    const lemSeq = ' ' + toks.filter(t => t.kind === 'word').map(t => t.lemma).join(' ') + ' ';
    const metaSkip = new Set(['word', 'sentence', 'letter', 'question', 'answer', 'text', 'dialogue', 'sound', 'summary', 'headline', 'opposite', 'negative', 'future', 'active', 'register', 'stress', 'linking', 'prompt', 'article', 'phrase', 'paragraph', 'key word']);
    const terms = Object.keys(R.META).sort((a, b) => b.length - a.length);
    let metaTxt = lemSeq;
    for (const term of terms) {
      const rx = new RegExp(' ' + term.replace(/[-]/g, '[- ]') + '(?=[ ])', 'g');
      let mm; let found = 0;
      while ((mm = rx.exec(metaTxt))) found++;
      if (!found) continue;
      metaTxt = metaTxt.replace(rx, ' ' + '_'.repeat(term.length));
      const lv = lvNum(R.META[term]);
      meta.push({ term, level: R.META[term], lv, count: found, diff: lv - target, core: !metaSkip.has(term) });
    }
    meta.forEach(m => { m.tier = m.diff > 0 ? (m.diff >= 1.5 ? 2 : 1) : 0; });
    const metaCount = meta.filter(m => m.core).reduce((s, m) => s + m.count, 0);
    const metaShare = nWords ? metaCount / nWords : 0;
    const A4 = clamp(meta.reduce((s, m) => s + (m.tier === 2 ? 1 : m.tier === 1 ? 0.5 : 0) * m.count, 0) + (metaShare > 0.15 ? 0.25 : 0));
    // тип задания
    const main = taskType(acts, low);
    const type = main ? main.t : null;
    const key = formulationKey(main, toks);
    // D1, D3, D4
    const d1 = paramsD1(low, type);
    const d3 = refsD3(text, rec, ctx.records);
    const d4 = ambiguityD4(low, type);
    // A6 читаемость
    const { syl, fk, fre } = readability(wordToks, nSent);
    // профиль лексики и оценка уровня – общая мера для сопоставления с текстами (R6)
    const prof = lexProfile(units, toks);
    const lvl = { lex95: lexLevel(prof, 0.95), lex98: lexLevel(prof, 0.98), gr: grammarLevel(gh, 0.9) };
    // ИСВ
    const w = S.weights; let ws = 0, vs = 0;
    [['A1', A1], ['A2', A2], ['A3', A3], ['A4', A4]].forEach(([k, v]) => { if (v != null && w[k] > 0) { ws += w[k]; vs += w[k] * v; } });
    const ISV = ws ? vs / ws : null;
    // замечания и черновик переформулирования
    const res = {
      rec, id: rec.id, target, targetName: lvName(target), toks, units, sents, grammar: gh, meta, actions: acts, parse,
      type, typeName: type ? R.TASK_TYPES.find(t => t.id === type).name : _t('не определён'), key,
      counts: { words: nWords, sentences: nSent, actions: acts.length, wps, wpa: nWords / nAct, units: nUnits, above: nAbove, unknown: nUnknown, wShare, metaCount, metaShare, syllables: syl },
      norm, a3parts, fk, fre, d1, d3, d4, prof, lvl,
      scores: { A1, A2, A3, A4, A5: null, D1: d1.score, D3: d3.score, D4: d4.score, ISV }
    };
    res.rewrite = rewrite(res, text);
    return res;
  }

  function rewrite(res, text) {
    const acts = res.actions;
    const repls = res.units.filter(u => u.tier && u.repl && !u.intro && u.text.toLowerCase() === u.lemma && !/\s|—/.test(u.repl.split(',')[0].trim()));
    const split = acts.length > 1 && (acts.length > res.norm.actions || res.counts.wps > res.norm.wps);
    if (!split && !repls.length) return null;
    let t = text;
    if (split) {
      // шаги: одиночный глагол сливается со следующим (Ask and answer …)
      const groups = [];
      acts.forEach((a, i) => {
        const next = acts[i + 1];
        const between = next ? text.slice(a.tok.end, next.tok.start) : '';
        if (next && /^\s*(and|or)\s*$/i.test(between) && next.tok.si === a.tok.si) { (groups.pending = groups.pending || []).push(a); return; }
        groups.push({ first: (groups.pending || [a])[0], last: a }); groups.pending = null;
      });
      const steps = []; let prefixStart = 0;
      groups.forEach((gr, i) => {
        const nx = groups[i + 1];
        const sEnd = res.sents[gr.last.tok.si].end;
        const end = nx ? Math.min(nx.first.tok.start, sEnd) : text.length;
        let seg = text.slice(prefixStart, end).replace(/^[\s.,;]+/, '');
        prefixStart = end;
        seg = seg.replace(/[\s,;]*\b(and|then|or)\s*$/i, '').replace(/[.!?;,\s]+$/, '').trim();
        seg = seg.replace(/^(now|then|first|next|finally)\s*,?\s*/i, '');
        if (/^\d+[.)]?$/.test(seg) || !seg) return;
        steps.push(seg.charAt(0).toUpperCase() + seg.slice(1) + '.');
      });
      if (steps.length > 1) t = steps.map((s, i) => (i + 1) + '. ' + s).join(' ');
    }
    for (const u of repls) {
      const first = u.repl.split(',')[0].trim();
      const rx = new RegExp('\\b' + u.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      t = t.replace(rx, m => /^[A-Z]/.test(m) ? first.charAt(0).toUpperCase() + first.slice(1) : first);
    }
    return t === text ? null : t;
  }


  /* ---------- Корпус ---------- */
  function analyzeCorpus(records, settings, opts = {}) {
    const S = Object.assign({}, DEFAULTS, settings || {});
    S.norms = Object.assign({}, DEFAULTS.norms, (settings || {}).norms || {});
    S.weights = Object.assign({}, DEFAULTS.weights, (settings || {}).weights || {});
    const lex = makeLexicon(opts.userLex, S.lexMode, S.lexBase, S.lexFallback);
    assignIds(records, 'i');
    const ordered = orderRecords(records);
    const intro = introduction(ordered, S, lex, opts.vocab);
    const pstore = S.useParse !== false ? opts.parse || null : null;
    const ctx = { settings: S, lex, records, introduced: intro.introduced, parse: pstore };
    const results = [];
    for (const rec of ordered) {
      const res = analyzeOne(rec, ctx);
      results.push(res);
      intro.remember(rec, res.units);
    }
    // A5 единообразие
    const groups = {};
    results.forEach(r => { if (!r.type || !r.key) return; const k = r.rec.book + '|' + r.type; (groups[k] = groups[k] || []).push(r); });
    const variability = [];
    for (const k in groups) {
      const arr = groups[k]; const counts = {};
      arr.forEach(r => counts[r.key] = (counts[r.key] || 0) + 1);
      const keys = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const n = arr.length, kk = keys.length;
      const V = n > 1 ? (kk - 1) / (n - 1) : 0;
      variability.push({ book: arr[0].rec.book, type: arr[0].type, typeName: arr[0].typeName, n, k: kk, V, keys });
      arr.forEach(r => { r.scores.A5 = n >= 3 ? clamp(1 - counts[r.key] / n) : null; r.a5 = { n, k: kk, keys, mine: counts[r.key] }; });
    }
    results.forEach(r => r.issues = issues(r, S));
    const stats = statistics(results, S, variability);
    const meta = {
      date: new Date().toISOString(), engine: VERSION, core: C.VERSION, resources: R.version, lexicon: lex.id,
      lexiconSize: lex.size, grammarSource: { egp: _t('English Grammar Profile (по CEFR-J Grammar Profile 20180315)'), cefrj: 'CEFR-J Grammar Profile 20180315', working: _t('рабочая таблица') }[S.grammarSource] || S.grammarSource, rubric: R.RUBRIC_VERSION, settings: S,
      vocabSize: (opts.vocab || []).length, parse: C.parseSummary(results, pstore)
    };
    return { results, stats, variability, meta, conclusions: conclusions(results, stats, S, meta) };
  }

  function issues(r, S) {
    const out = [];
    const ab = r.units.filter(u => u.tier && !u.intro);
    if (r.scores.A1 > 0) out.push({ c: 'A1', t: _t('Слова выше уровня ') + r.targetName + ' – ' + ab.map(u => u.text + ' (' + lvName(u.lv) + ')').join(', ') + '.' });
    const intro = r.units.filter(u => u.tier && u.intro);
    if (intro.length) out.push({ c: 'A7', t: _t('Флаг снят – ') + intro.map(u => u.text + ' (' + (u.intro.by === _t('словник') ? _t('словник, ') : _t('встречалось в ')) + u.intro.where + ')').join(', ') + '.' });
    const gab = r.grammar.filter(h => h.tier);
    if (gab.length) out.push({ c: 'A2', t: _t('Конструкции выше уровня – ') + gab.map(h => h.name.charAt(0).toLowerCase() + h.name.slice(1) + ' (' + lvName(h.lv) + ')').join('; ') + '.' });
    if (r.scores.A3 > 0) {
      const p = [];
      if (r.a3parts.words > 0) p.push(r.counts.words + _t(' слов при норме ') + fmt(r.norm.words, 0));
      if (r.a3parts.wps > 0) p.push(fmt(r.counts.wps, 1) + _t(' слов в предложении при норме ') + fmt(r.norm.wps, 0));
      if (r.a3parts.actions > 0) p.push(r.counts.actions + _t(' действий при норме ') + fmt(r.norm.actions, 0));
      out.push({ c: 'A3', t: _t('Объём выше нормы уровня – ') + p.join(', ') + '.' });
    }
    const mab = r.meta.filter(m => m.tier);
    if (mab.length) out.push({ c: 'A4', t: _t('Термины метаязыка выше уровня – ') + mab.map(m => m.term + ' (' + m.level + ')').join(', ') + '.' });
    if (r.scores.A5 > 0) out.push({ c: 'A5', t: _t('Формулировка «') + r.key + _t('» – одна из ') + r.a5.k + _t(' для типа «') + r.typeName + _t('» в этом учебнике (основная – «') + r.a5.keys[0][0] + _t('»).') });
    if (r.scores.D1 === 1) out.push({ c: 'D1', t: _t('Для продуктивного задания не указаны объём, время или число ответов.') });
    if (r.scores.D3 === 1) out.push({ c: 'D3', t: _t('Отсылка не найдена среди загруженных упражнений – ') + r.d3.refs.filter(x => x.kind === 'ex' && !x.ok).map(x => x.text).join(', ') + '.' });
    if (r.d4.notes.length) out.push({ c: 'D4', t: _t('Возможная неоднозначность – ') + r.d4.notes.join('; ') + '.' });
    return out;
  }


  /* ---------- Статистика ---------- */
  const CRIT = ['A1', 'A2', 'A3', 'A4', 'A5', 'D1', 'D3', 'D4', 'ISV'];
  function statistics(results, S, variability) {
    const st = { n: results.length };
    st.books = [...new Set(results.map(r => r.rec.book))];
    st.units = [...new Set(results.map(r => r.rec.book + '|' + r.rec.unit))].length;
    st.crit = {};
    CRIT.forEach(c => {
      const vals = results.map(r => r.scores[c]);
      const d = describe(vals);
      const thr = c === 'ISV' ? S.problemISV : S.problemCrit;
      d.problem = vals.filter(v => v != null && v >= thr).length;
      d.thr = thr;
      st.crit[c] = d;
    });
    st.counts = { words: describe(results.map(r => r.counts.words)), wps: describe(results.map(r => r.counts.wps)), actions: describe(results.map(r => r.counts.actions)), fk: describe(results.map(r => r.fk)), fre: describe(results.map(r => r.fre)) };
    // распределение лексики
    const dist = { at: 0, t1: 0, t2: 0, intro: 0, unknown: 0 }; const byLv = {};
    const words = Object.create(null);
    results.forEach(r => r.units.forEach(u => {
      if (u.lv == null) { dist.unknown++; return; }
      const name = u.unknown ? _t('вне списка') : LVN[Math.floor(u.lv)];
      byLv[name] = (byLv[name] || 0) + 1;
      if (u.tier && u.intro) dist.intro++; else if (u.tier === 2) dist.t2++; else if (u.tier === 1) dist.t1++; else dist.at++;
      if (u.tier) {
        const w = words[u.lemma] = words[u.lemma] || { lemma: u.lemma, level: lvName(u.lv), count: 0, inst: new Set(), intro: 0, repl: R.REPLACE[u.lemma] || '', src: u.src, unknown: !!u.unknown };
        w.count++; w.inst.add(r.id); if (u.intro) w.intro++;
      }
    }));
    st.dist = dist; st.byLevel = byLv;
    st.topWords = Object.values(words).map(w => Object.assign(w, { inst: w.inst.size })).sort((a, b) => b.inst - a.inst || b.count - a.count);
    const gr = {};
    results.forEach(r => r.grammar.forEach(h => { const x = gr[h.id + h.level] = gr[h.id + h.level] || { name: h.name, level: h.level, total: 0, above: 0 }; x.total++; if (h.tier) x.above++; }));
    st.grammar = Object.values(gr).sort((a, b) => b.above - a.above || b.total - a.total);
    const mt = {};
    results.forEach(r => r.meta.forEach(m => { const x = mt[m.term] = mt[m.term] || { term: m.term, level: m.level, total: 0, above: 0, core: m.core }; x.total += m.count; if (m.tier) x.above += m.count; }));
    st.meta = Object.values(mt).filter(m => m.core || m.above).sort((a, b) => b.above - a.above || b.total - a.total);
    st.variability = variability.slice().sort((a, b) => b.k - a.k || b.n - a.n);
    // уроки и учебники
    const agg = (keyFn, label) => {
      const m = {};
      results.forEach(r => { const k = keyFn(r); const x = m[k] = m[k] || { key: k, label: label(r), book: r.rec.book, unit: r.rec.unit, items: [] }; x.items.push(r); });
      return Object.values(m).map(x => { x.n = x.items.length; x.mean = {}; CRIT.forEach(c => { const d = describe(x.items.map(r => r.scores[c])); x.mean[c] = d.n ? d.mean : null; }); x.problem = x.items.filter(r => r.scores.ISV >= S.problemISV).length; return x; });
    };
    st.unitAgg = agg(r => r.rec.book + '|' + r.rec.unit, r => r.rec.unit || '—');
    st.bookAgg = agg(r => r.rec.book, r => r.rec.book || '—');
    st.typeAgg = agg(r => r.typeName, r => r.typeName);
    st.d3missing = results.filter(r => r.scores.D3 === 1);
    st.d1missing = results.filter(r => r.scores.D1 === 1);
    st.d1n = results.filter(r => r.scores.D1 != null).length;
    st.d4flag = results.filter(r => r.scores.D4 > 0);
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
      out[k] = { words: Math.round(q(by[k].map(r => r.counts.words))), wps: Math.round(q(by[k].map(r => r.counts.wps))), actions: Math.max(1, Math.round(q(by[k].map(r => r.counts.actions)))), n: by[k].length };
    }
    return out;
  }


  /* ---------- Выводы ---------- */
  const INS = [_t('инструкция'), _t('инструкции'), _t('инструкций')];
  const INS_G = [_t('инструкции'), _t('инструкциях'), _t('инструкциях')];

  function conclusions(results, st, S, meta) {
    const out = []; const n = results.length; if (!n) return out;
    const C = st.crit;
    const lv = Object.entries(st.levels).map(([k, v]) => k + (Object.keys(st.levels).length > 1 ? ' (' + v + ')' : '')).join(', ');
    out.push({ c: 'ISV', title: _t('Общая картина'), text:
      _t('Инструмент обработал ') + n + ' ' + plural(n, [_t('инструкцию'), _t('инструкции'), _t('инструкций')]) + _t(' из ') + st.books.length + ' ' + plural(st.books.length, [_t('учебника'), _t('учебников'), _t('учебников')]) + _t(' (уровень для анализа – ') + lv + '). ' +
      _t('Средний индекс сложности восприятия составляет ') + fmt(C.ISV.mean) + _t(' при медиане ') + fmt(C.ISV.med) + '. ' +
      (C.ISV.problem ? C.ISV.problem + ' ' + plural(C.ISV.problem, INS) + ' (' + pct(C.ISV.problem, n) + ') ' + plural(C.ISV.problem, [_t('достигает'), _t('достигают'), _t('достигают')]) + _t(' порога ') + fmt(S.problemISV) + _t(' и ') + plural(C.ISV.problem, [_t('требует'), _t('требуют'), _t('требуют')]) + _t(' экспертного взгляда.') : _t('Ни одна инструкция не достигает порога ') + fmt(S.problemISV) + '.') });
    // лексика
    const a1p = C.A1.problem, a1any = results.filter(r => r.scores.A1 > 0).length;
    const tw = st.topWords.filter(w => w.inst > w.intro).slice(0, 6);
    if (a1any) {
      let t = _t('В ') + a1any + ' ' + plural(a1any, INS_G) + ' (' + pct(a1any, n) + _t(') взвешенная доля слов выше заявленного уровня превышает допустимые ') + S.tolerance + ' %';
      t += a1p ? _t(', в ') + a1p + _t(' из них превышение выражено сильно. ') : '. ';
      if (tw.length) t += _t('Чаще всего превышение дают ') + list(tw.map(w => w.lemma + ' (' + w.level + (w.unknown ? _t(', нет в списке') : '') + ')')) + '. ';
      const rp = tw.filter(w => w.repl && !/—/.test(w.repl)).slice(0, 3);
      if (rp.length) t += _t('Для части слов есть более простые замены, например ') + list(rp.map(w => w.lemma + ' – ' + w.repl.split(',')[0])) + '.';
      out.push({ c: 'A1', title: _t('Лексика'), text: t.trim() });
    } else out.push({ c: 'A1', title: _t('Лексика'), text: _t('Лексика инструкций укладывается в заявленный уровень с допуском ') + S.tolerance + ' %.' });
    if (st.dist.intro) out.push({ c: 'A7', title: _t('Введённость лексики'), text: _t('Учёт словника и предыдущих инструкций снял ') + st.dist.intro + ' ' + plural(st.dist.intro, [_t('флаг'), _t('флага'), _t('флагов')]) + _t(' из ') + (st.dist.intro + st.dist.t1 + st.dist.t2) + ' ' + plural(st.dist.intro + st.dist.t1 + st.dist.t2, [_t('случая'), _t('случаев'), _t('случаев')]) + _t(' превышения. Эти слова учащиеся уже встречали в учебнике.') });
    if (st.dist.unknown || results.some(r => r.counts.unknown)) {
      const unk = results.reduce((s, r) => s + r.counts.unknown, 0);
      if (unk) out.push({ c: 'A1', title: _t('Слова вне списка'), text: unk + ' ' + plural(unk, [_t('словоупотребление'), _t('словоупотребления'), _t('словоупотреблений')]) + _t(' не нашлось в списке лексики (') + meta.lexicon + '). ' + (S.unknownLevel === 'ignore' ? (unk === 1 ? _t('Оно исключено') : _t('Они исключены')) + _t(' из расчёта.') : (unk === 1 ? _t('Ему') : _t('Им')) + _t(' приписан уровень ') + S.unknownLevel + _t(', поэтому ') + (unk === 1 ? _t('его') : _t('их')) + _t(' стоит проверить вручную.')) });
    }
    // грамматика
    const ga = st.grammar.filter(x => x.above);
    if (ga.length) {
      const a2n = results.filter(r => r.scores.A2 > 0).length;
      out.push({ c: 'A2', title: _t('Грамматика'), text: _t('Конструкции выше уровня встречаются в ') + a2n + ' ' + plural(a2n, INS_G) + ' (' + pct(a2n, n) + _t('). Чаще других это ') + list(ga.slice(0, 3).map(x => x.name.charAt(0).toLowerCase() + x.name.slice(1) + ' (' + x.level + ', ' + x.above + ')')) + '.' });
    } else out.push({ c: 'A2', title: _t('Грамматика'), text: _t('Грамматические конструкции инструкций не превышают заявленный уровень.') });
    // объём
    const a3n = results.filter(r => r.scores.A3 > 0).length;
    const overAct = results.filter(r => r.a3parts.actions > 0).length;
    out.push({ c: 'A3', title: _t('Объём и плотность'), text: _t('Средняя длина инструкции составляет ') + fmt(st.counts.words.mean, 1) + _t(' слова, в среднем ') + fmt(st.counts.actions.mean, 1) + _t(' действия на инструкцию. ') +
      (a3n ? a3n + ' ' + plural(a3n, INS) + ' (' + pct(a3n, n) + _t(') выходят за нормы объёма уровня') + (overAct ? _t(', из них ') + overAct + _t(' объединяют больше действий, чем допускает норма. Такие инструкции удобнее разбить на шаги.') : '.') : _t('Все инструкции укладываются в нормы объёма уровня.')) });
    // метаязык
    const ma = st.meta.filter(m => m.above);
    if (ma.length) out.push({ c: 'A4', title: _t('Метаязык'), text: _t('Термины выше уровня – ') + list(ma.slice(0, 5).map(m => m.term + ' (' + m.level + ')')) + _t('. Их стоит пояснить образцом или заменить описанием действия.') });
    // единообразие
    const vv = st.variability.filter(v => v.k > 1 && v.n >= 3).slice(0, 3);
    if (vv.length) out.push({ c: 'A5', title: _t('Единообразие формулировок'), text: vv.map(v => _t('Для действия «') + v.typeName + _t('» учебник «') + v.book + _t('» использует ') + v.k + ' ' + plural(v.k, [_t('формулировку'), _t('формулировки'), _t('формулировок')]) + _t(' на ') + v.n + ' ' + plural(v.n, INS_G.map((x, i) => [_t('инструкцию'), _t('инструкции'), _t('инструкций')][i])) + ' (' + v.keys.slice(0, 4).map(k => k[0]).join(', ') + ').').join(' ') + _t(' Единая формулировка для одного действия облегчает узнавание задания.') });
    // сгущение
    const ua = st.unitAgg.filter(u => u.n >= 2 && u.mean.ISV != null).sort((a, b) => b.mean.ISV - a.mean.ISV);
    if (ua.length >= 3) {
      const top = ua.slice(0, 2);
      out.push({ c: 'ISV', title: _t('Где сгущаются проблемы'), text: _t('Самый высокий индекс сложности восприятия дают ') + list(top.map(u => (st.books.length > 1 ? _t('«') + u.book + _t('», ') : '') + u.label + ' (' + fmt(u.mean.ISV) + ')')) + _t(', самый низкий – ') + (st.books.length > 1 ? _t('«') + ua[ua.length - 1].book + _t('», ') : '') + ua[ua.length - 1].label + ' (' + fmt(ua[ua.length - 1].mean.ISV) + ').' });
    }
    if (st.bookAgg.length > 1) {
      const b = st.bookAgg.slice().sort((x, y) => y.mean.ISV - x.mean.ISV);
      out.push({ c: 'ISV', title: _t('Сравнение учебников'), text: b.map(x => _t('«') + x.label + _t('» – ИСВ ') + fmt(x.mean.ISV) + _t(', проблемных ') + x.problem + _t(' из ') + x.n).join('; ') + '.' });
    }
    // D-критерии
    const dd = [];
    if (st.d1n && !st.d1missing.length) dd.push(_t('во всех продуктивных заданиях указаны объём, время или число ответов'));
    else if (st.d1n) dd.push(_t('в ') + st.d1missing.length + _t(' из ') + st.d1n + ' ' + plural(st.d1n, [_t('продуктивного задания'), _t('продуктивных заданий'), _t('продуктивных заданий')]) + _t(' не указаны объём, время или число ответов'));
    if (st.d3missing.length) dd.push(st.d3missing.length + ' ' + plural(st.d3missing.length, [_t('отсылка не находит'), _t('отсылки не находят'), _t('отсылок не находят')]) + _t(' упражнения среди загруженных данных'));
    if (st.d4flag.length) dd.push(st.d4flag.length + ' ' + plural(st.d4flag.length, INS) + ' ' + plural(st.d4flag.length, [_t('допускает'), _t('допускают'), _t('допускают')]) + _t(' возможную неоднозначность'));
    if (dd.length) out.push({ c: 'D1', title: _t('Параметры, отсылки, однозначность'), text: dd.join('; ').replace(/^./, s => s.toUpperCase()) + _t('. Эти признаки найдены эвристически и требуют проверки.') });
    out.push({ c: 'A6', title: _t('Ограничения'), text: _t('Индекс Флеша-Кинкейда (в среднем ') + fmt(st.counts.fk.mean, 1) + _t(') приведён справочно, на коротких текстах он ненадёжен и в индекс сложности восприятия не входит. ') +
      (meta.lexicon.indexOf('builtin') === 0 && meta.lexicon.indexOf('+') < 0 ? _t('Уровни слов взяты из встроенного рабочего списка, для исследования его следует заменить эталонным списком (CEFR-J, Oxford 3000/5000). ') : _t('Уровни слов взяты из списка ') + meta.lexicon + _t(', уровни грамматических конструкций – ') + meta.grammarSource + '. ') +
      _t('Инструмент не выносит итоговый вердикт, а показывает зоны, которые требуют экспертного взгляда.') });
    return out;
  }


  /* ---------- Ввод ---------- */
  const FIELDS = {
    text: /^(text|instruction|инструкция|текст инструкции|текст)$/,
    level: /^(level|cefr|уровень|заявленный уровень|уровень учебника)$/,
    book: /^(book|textbook|учебник|title)$/, publisher: /^(publisher|издательство)$/, year: /^(year|год)$/,
    unit: /^(unit|lesson|урок|раздел учебника|модуль)$/, section: /^(section|раздел|part|часть)$/,
    ex: /^(ex|exercise|упражнение|номер|№|no)$/, aspect: /^(aspect|аспект|skill|вид речевой деятельности)$/,
    audience: /^(audience|аудитория|целевая аудитория)$/, l1: /^(l1|родной язык|язык-посредник|native language)$/,
    exercise_text: /^(exercise_text|exercise text|текст упражнения|материал)$/
  };
  function recordsFromCSV(text) { return C.recordsByFields(text, FIELDS, 'text'); }
  function recordsFromText(text, defaults) {
    const out = []; let unit = defaults.unit || '', section = defaults.section || '';
    String(text || '').split(/\r?\n/).forEach(line => {
      const l = line.trim(); if (!l) return;
      const mu = l.match(/^#*\s*(unit|lesson|урок|module|модуль)\s*([\w.]+)\s*[:.–-]?\s*(.*)$/i);
      if (mu && !/\b(read|write|complete|listen|match)\b/i.test(mu[3])) { unit = mu[1].charAt(0).toUpperCase() + mu[1].slice(1).toLowerCase() + ' ' + mu[2]; section = mu[3] || ''; return; }
      if (/^#/.test(l)) { section = l.replace(/^#+\s*/, ''); return; }
      const me = l.match(/^(?:ex(?:ercise)?\.?\s*)?(\d+[a-z]?)\s*[.)]\s+(.*)$/i);
      out.push(Object.assign({}, defaults, { unit, section, ex: me ? me[1] : '', text: me ? me[2] : l }));
    });
    return out;
  }

  g.IA_ENGINE = { VERSION, CORE: C, DEFAULTS, PROFILES, applyProfile, analyzeCorpus, corpusNorms, agreement, weightedKappa, parseCSV, recordsFromCSV, recordsFromText, parseUserLexicon, toCSV, lvNum, lvName, fmt, pct, plural, describe, labelOf, CRIT };
})(typeof window !== 'undefined' ? window : globalThis);
