/* Методические рекомендации по результатам анализа – учителю и автору учебника, на уровне упражнения,
   урока и учебника. Версия recommend-0.1, эталоны правил – R.REC в resources.js (rec-0.1).
   Модуль не меняет показатели режимов «Инструкции» и «Тексты» и модуля методики – он читает готовые
   результаты (analyzeCorpus, IA_METHOD.analyze, analyzeTexts, пары «инструкция – текст») и переводит
   найденные признаки в рекомендации со ссылкой на правило и источник.
   Работает в браузере и в node (для проверок). */
(function (g) {
  const _t = g._t || (s => s);
  const R = g.IA_RES;
  const C = g.IA_CORE;
  const VERSION = 'recommend-0.1';
  const RULE = {}; R.REC.RULES.forEach(x => { RULE[x.id] = x; });
  const lvName = n => n == null ? '—' : (C && C.lvName ? C.lvName(n) : String(n));
  const uniq = a => [...new Set(a)];
  const fmt = (x, d) => x == null || isNaN(x) ? '—' : (g.IA_I18N && g.IA_I18N.lang === 'en' ? x.toFixed(d == null ? 2 : d) : x.toFixed(d == null ? 2 : d).replace('.', ','));
  const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
  const PRODUCTIVE = new Set(['speak', 'write', 'ans']);

  /* Подстановка значений в шаблон правила */
  function fill(tpl, o) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => o && o[k] != null ? String(o[k]) : ''); }
  /* Ссылка на источник для показа – ключи заменяются фамилиями */
  function cite(src) {
    return String(src || '').replace(/sol06/g, _t('Соловова, 2006')).replace(/gez82/g, _t('Гез и др., 1982')).replace(/harmer/g, 'Harmer')
      .replace(/scriv/g, 'Scrivener').replace(/celta/g, 'Thornbury, Watkins').replace(/tkt/g, 'Spratt et al., 2011').replace(/с\./g, _t('с.'));
  }
  const exOf = r => r && r.rec && r.rec.ex ? String(r.rec.ex) : '';
  const lessonKey = (book, unit) => book + '|' + (unit || '');
  const listFirst = (arr, n) => arr.slice(0, n).join(', ') + (arr.length > n ? _t(' и др.') : '');

  /* Одна рекомендация – две записи (учителю и автору), если у правила есть оба текста */
  function push(out, id, who, base, o) {
    const x = RULE[id]; if (!x || !x[who]) return;
    out.push(Object.assign({ rule: id, basis: x.basis, scope: x.scope, who, prio: base.prio || 2, text: fill(x[who], o), src: x.src, alt: x.alt || '' }, base,
      { draft: who === 'author' && base.draft ? base.draft : undefined }));
  }
  function make(out, id, base, o) { push(out, id, 'teacher', base, o); push(out, id, 'author', base, o); }

  /* ---------- Упражнение – инструкция ---------- */
  function instrRecs(r, ctx) {
    const out = [], S = ctx.S, m = r.method || {};
    const base = { book: r.rec.book, unit: r.rec.unit || '', lesson: lessonKey(r.rec.book, r.rec.unit), item: r.id, kind: 'instr', ex: exOf(r) };
    const ab = uniq(r.units.filter(u => u.tier && !u.intro && !u.metaTerm).map(u => u.lemma));
    if (r.scores.A1 > 0 && ab.length) {
      const rp = uniq(r.units.filter(u => u.tier && !u.intro && u.repl && !/—/.test(u.repl)).map(u => u.lemma + ' – ' + u.repl.split(',')[0].trim()));
      make(out, 'lex', Object.assign({}, base, { prio: r.scores.A1 >= 0.5 ? 1 : 2 }), { words: listFirst(ab, 6), repl: rp.length ? _t(' (например, ') + rp.slice(0, 3).join('; ') + ')' : '' });
    }
    const gab = uniq(r.grammar.filter(h => h.tier).map(h => h.name.charAt(0).toLowerCase() + h.name.slice(1)));
    if (r.scores.A2 > 0 && gab.length) make(out, 'gram', Object.assign({}, base, { prio: r.scores.A2 >= 0.5 ? 2 : 3 }), { gr: listFirst(gab, 3) });
    if (r.scores.A3 > 0) {
      const steps = r.rewrite ? (r.rewrite.match(/(?:^|\s)\d+\. /g) || []).length : 0;
      // инструкция уже разбита на предложения по одному действию – шаги ничего не дадут
      const already = steps > 1 && r.counts.sentences >= steps;
      if (r.a3parts && r.a3parts.actions > 0 && !already) make(out, 'split', Object.assign({}, base, { prio: 2, draft: r.rewrite || undefined }), {});
      else if (r.scores.A3 >= 0.34 && !already) make(out, 'short', Object.assign({}, base, { prio: 3, draft: r.rewrite || undefined }), {});
    }
    const terms = uniq((r.meta || []).filter(x => x.tier).map(x => x.term));
    if (terms.length) make(out, 'meta', Object.assign({}, base, { prio: 2 }), { terms: listFirst(terms, 4) });
    if (r.scores.D1 === 1) make(out, 'params', Object.assign({}, base, { prio: 3 }), {});
    if (r.scores.D3 === 1) make(out, 'ref', Object.assign({}, base, { prio: 2 }), { refs: r.d3.refs.filter(x => x.kind === 'ex' && !x.ok).map(x => x.text).join(', ') });
    if (r.d4 && r.d4.notes.length) make(out, 'ambig', Object.assign({}, base, { prio: r.scores.D4 >= 1 ? 1 : 2 }), { notes: r.d4.notes.join('; ') });
    if (r.scores.ISV != null && r.scores.ISV >= S.problemISV) make(out, 'check', Object.assign({}, base, { prio: 2 }), { isv: fmt(r.scores.ISV) });
    // пары «инструкция – текст»
    (ctx.pairs || []).filter(p => p.instr === r && p.harder).forEach(p => make(out, 'pair', Object.assign({}, base, { prio: 2, text2: p.text.id }), { title: p.text.rec.title ? _t('«') + p.text.rec.title + _t('»') : _t('текст без заголовка') }));
    // методическая сторона – речевое задание без ситуации, высказывание без опор на начальных уровнях
    if (m.n === 4 && PRODUCTIVE.has(r.type) && !(m.cues && m.cues.comm) && !/student a|student b|find someone|survey|interview/i.test(r.rec.text))
      make(out, 'situation', Object.assign({}, base, { prio: 2 }), {});
    if ((m.n === 4 || (m.n === 3 && (r.type === 'speak' || r.type === 'write'))) && r.target <= 2 && m.cues && !m.cues.support && !m.cues.model && !m.cues.form && m.cues.repro !== 'retell')
      make(out, 'support', Object.assign({}, base, { prio: 2 }), {});
    return out;
  }

  /* ---------- Упражнение – текст ---------- */
  function textRecs(t) {
    const out = [];
    const base = { book: t.rec.book, unit: t.rec.unit || '', lesson: lessonKey(t.rec.book, t.rec.unit), item: t.id, kind: 'text', ex: (t.exs || []).join(', '), title: t.rec.title || '' };
    const counts = {};
    t.units.filter(u => u.tier && !u.intro).forEach(u => { counts[u.lemma] = (counts[u.lemma] || 0) + 1; });
    const ab = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    if (t.scores.T1 > 0 && ab.length) make(out, 'tLex', Object.assign({}, base, { prio: t.scores.T1 >= 0.5 ? 1 : 2 }), { words: listFirst(ab, 8) });
    const est = t.level ? t.level.est : null;
    if (est != null && est - t.target >= 0.5) make(out, 'tLevel', Object.assign({}, base, { prio: est - t.target >= 1 ? 1 : 2 }), { est: lvName(est), lv: t.targetName });
    const gab = uniq(t.grammar.filter(h => h.tier).map(h => h.name.charAt(0).toLowerCase() + h.name.slice(1)));
    if (t.scores.T2 > 0 || t.scores.T3 > 0) {
      const gr = listFirst(gab, 3), b2 = Object.assign({}, base, { prio: 3 });
      if (gab.length) make(out, 'tSyn', b2, { gr });
      else push(out, 'tSyn', 'author', b2, {});
      out.forEach(x => { if (x.rule === 'tSyn' && x.who === 'author') x.text = fill(RULE.tSyn.author, { gr: gab.length ? _t(' и конструкций выше уровня (') + gr + ')' : '' }); });
    }
    if (est != null && t.target - est >= 1 && t.type === 'material') make(out, 'tSimple', Object.assign({}, base, { prio: 3 }), { est: lvName(est), lv: t.targetName });
    return out;
  }

  /* ---------- Урок ---------- */
  function lessonRecs(L, ctx) {
    const out = [], S = ctx.S;
    const base = { book: L.book, unit: L.unit || '', lesson: L.key, kind: 'lesson' };
    const byId = id => L.items.find(x => x.id === id);
    (L.flags || []).forEach(f => {
      const r = byId(f.id), i = r ? L.items.indexOf(r) : -1;
      const prevTyped = i > 0 ? L.items.slice(0, i).reverse().find(x => x.method && x.method.n != null) : null;
      const o = { ex: exOf(r) || String(i + 1), prev: prevTyped ? exOf(prevTyped) || String(L.items.indexOf(prevTyped) + 1) : '' };
      const b = Object.assign({}, base, { item: f.id || null, ex: o.ex, flag: f.rule });
      if (f.rule === 'jump') make(out, prevTyped ? 'jump' : 'jumpStart', Object.assign(b, { prio: 1 }), o);
      else if (f.rule === 'return') { if (S.countReturn !== false) make(out, 'return', Object.assign(b, { prio: 2 }), o); }
      else if (f.rule === 'noApply') make(out, 'noApply', Object.assign(b, { prio: 1, ex: '' }), o);
      else if (f.rule === 'textOrder') {
        if (r && r.method.stage === 'post') {
          const nx = L.items.slice(i + 1).find(x => x.method && x.method.stage === 'while');
          make(out, 'postOrder', Object.assign(b, { prio: 2 }), { ex: o.ex, next: nx ? exOf(nx) : '' });
        } else make(out, 'prePhase', Object.assign(b, { prio: 2 }), o);
      } else if (f.rule === 'unitDrop') make(out, 'unitDrop', Object.assign(b, { prio: 3 }), o);
    });
    const hard = L.items.filter(r => r.scores && r.scores.ISV != null && r.scores.ISV >= S.problemISV);
    if (hard.length >= 2) make(out, 'lessonInstr', Object.assign({}, base, { prio: 2 }), { n: hard.length, list: hard.map(r => 'Ex. ' + (exOf(r) || L.items.indexOf(r) + 1)).join(', ') });
    return out;
  }

  /* ---------- Учебник ---------- */
  function bookRecs(book, ctx) {
    const out = [], S = ctx.S;
    const base = { book, unit: '', lesson: null, kind: 'book' };
    const ls = (ctx.lessons || []).filter(L => L.book === book);
    const judged = ls.filter(L => L.typed >= 2);
    const lab = L => L.unit || _t('без урока');
    const flagged = rule => ls.filter(L => L.flags.some(f => f.rule === rule));
    const na = flagged('noApply');
    if (na.length) make(out, 'bNoApply', Object.assign({}, base, { prio: na.length / Math.max(1, judged.length) >= 0.34 ? 1 : 2, count: na.length }), { n: na.length, m: judged.length, list: listFirst(na.map(lab), 4) });
    const jp = flagged('jump');
    if (jp.length >= 2) make(out, 'bJump', Object.assign({}, base, { prio: 1, count: jp.length }), { n: jp.length, list: listFirst(jp.map(lab), 4) });
    const pre = ls.filter(L => L.flags.some(f => f.rule === 'textOrder' && (L.items.find(x => x.id === f.id) || { method: {} }).method.stage !== 'post'));
    if (pre.length >= 2) make(out, 'bPre', Object.assign({}, base, { prio: 2, count: pre.length }), { n: pre.length, list: listFirst(pre.map(lab), 4) });
    const rs = (ctx.instr || []).filter(r => r.rec.book === book);
    const hard = rs.filter(r => r.scores.ISV != null && r.scores.ISV >= S.problemISV);
    if (rs.length && hard.length / rs.length >= 0.2) {
      const fr = {};
      rs.forEach(r => uniq(r.units.filter(u => u.tier && !u.intro && !u.metaTerm).map(u => u.lemma)).forEach(w => { fr[w] = (fr[w] || 0) + 1; }));
      const top = Object.entries(fr).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w, n]) => w + (n > 1 ? ' ×' + n : ''));
      make(out, 'bInstr', Object.assign({}, base, { prio: hard.length / rs.length >= 0.4 ? 1 : 2, count: hard.length }), { n: hard.length, m: rs.length, p: pct(hard.length, rs.length), words: top.length ? top.join(', ') : '—' });
    }
    const terms = {};
    rs.forEach(r => (r.meta || []).filter(x => x.tier).forEach(x => { terms[x.term] = (terms[x.term] || 0) + 1; }));
    const tl = Object.entries(terms).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    if (tl.length >= 2) make(out, 'bMeta', Object.assign({}, base, { prio: 3, count: tl.length }), { terms: listFirst(tl, 5) });
    (ctx.variability || []).filter(v => v.book === book && v.k > 1 && v.n >= 3).sort((a, b) => b.k - a.k).slice(0, 2)
      .forEach(v => make(out, 'bUniform', Object.assign({}, base, { prio: 3, count: v.k }), { type: v.typeName, k: v.k, keys: v.keys.slice(0, 4).map(k => k[0]).join(', ') }));
    const d1 = rs.filter(r => r.scores.D1 === 1);
    if (d1.length >= 2) make(out, 'bParams', Object.assign({}, base, { prio: 3, count: d1.length }), { n: d1.length });
    const sit = (ctx.items || []).filter(x => x.book === book && x.rule === 'situation' && x.who === 'author');
    if (sit.length >= 2) make(out, 'bSituation', Object.assign({}, base, { prio: 2, count: sit.length }), { n: sit.length });
    const ts = (ctx.texts || []).filter(t => t.rec.book === book);
    const above = ts.filter(t => t.level && t.level.est != null && t.level.est - t.target >= 0.5);
    if (above.length) make(out, 'bTexts', Object.assign({}, base, { prio: above.length / ts.length >= 0.34 ? 1 : 2, count: above.length }), { n: above.length, m: ts.length });
    const ph = (ctx.pairs || []).filter(p => p.harder && p.instr.rec.book === book);
    if (ph.length >= 2) make(out, 'bPairs', Object.assign({}, base, { prio: 2, count: ph.length }), { n: ph.length });
    return out;
  }

  const exNum = ex => { const m = String(ex || '').match(/\d+/); return m ? +m[0] : 999; };
  const SORT = (a, b) => a.prio - b.prio || (b.count || 0) - (a.count || 0);

  /* ---------- Точка входа ----------
     A – результат analyzeCorpus, MA – IA_METHOD.analyze, T – analyzeTexts, P – пары «инструкция – текст» */
  function analyze(A, MA, T, P, opts) {
    opts = opts || {};
    const S = { problemISV: A && A.meta ? A.meta.settings.problemISV : 0.4, countReturn: MA && MA.settings ? MA.settings.countReturn : true };
    const instr = A ? A.results : [], texts = T ? T.results : [], pairs = P || [], lessons = MA ? MA.lessons : [];
    const ctx = { S, instr, texts, pairs, lessons, variability: A ? A.variability : [] };
    const items = [];
    instr.forEach(r => instrRecs(r, ctx).forEach(x => items.push(x)));
    texts.forEach(t => textRecs(t).forEach(x => items.push(x)));
    ctx.items = items;
    const les = [];
    lessons.forEach(L => lessonRecs(L, ctx).forEach(x => les.push(x)));
    const books = uniq(instr.map(r => r.rec.book).concat(texts.map(t => t.rec.book)));
    const bk = [];
    books.forEach(b => bookRecs(b, ctx).forEach(x => bk.push(x)));
    const all = bk.concat(les, items);
    all.forEach((x, i) => { x.id = 'rc' + (i + 1); });
    // уроки – из модуля методики и из текстов (урок, в котором есть только тексты)
    const lmap = new Map();
    const getL = (book, unit) => { const k = lessonKey(book, unit); if (!lmap.has(k)) lmap.set(k, { key: k, book, unit: unit || '', lesson: lessons.find(L => L.key === k) || null, recs: [], items: new Map() }); return lmap.get(k); };
    lessons.forEach(L => getL(L.book, L.unit));
    texts.forEach(t => getL(t.rec.book, t.rec.unit));
    les.forEach(x => getL(x.book, x.unit).recs.push(x));
    items.forEach(x => { const L = getL(x.book, x.unit); if (!L.items.has(x.item)) L.items.set(x.item, []); L.items.get(x.item).push(x); });
    const byLesson = [...lmap.values()].map(L => ({ key: L.key, book: L.book, unit: L.unit, aim: L.lesson ? L.lesson.aim : '', SEQ: L.lesson ? L.lesson.SEQ : null,
      recs: L.recs.sort(SORT), items: [...L.items.entries()].map(([id, recs]) => ({ id, kind: recs[0].kind, ex: recs[0].ex, recs: recs.sort(SORT) }))
        .sort((a, b) => exNum(a.ex) - exNum(b.ex) || (a.kind === 'text' ? -1 : 0) - (b.kind === 'text' ? -1 : 0)) }));
    const stats = {
      total: all.length, teacher: all.filter(x => x.who === 'teacher').length, author: all.filter(x => x.who === 'author').length,
      prio: { 1: all.filter(x => x.prio === 1).length, 2: all.filter(x => x.prio === 2).length, 3: all.filter(x => x.prio === 3).length },
      rules: R.REC.RULES.map(x => ({ id: x.id, n: all.filter(y => y.rule === x.id && y.who === (x.author ? 'author' : 'teacher')).length })).filter(x => x.n),
      lessons: byLesson.filter(L => L.recs.length || L.items.length).length
    };
    return { version: VERSION, resources: R.REC_VERSION, all, book: bk.sort(SORT), lessons: byLesson, books, stats, item: id => items.filter(x => x.item === id).sort(SORT) };
  }

  g.IA_REC = { VERSION, analyze, fill, cite, RULE, instrRecs, textRecs, lessonRecs, bookRecs };
})(typeof window !== 'undefined' ? window : globalThis);
