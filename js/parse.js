/* Синтаксический разбор из внешнего анализатора – версия parse-0.1.
   Инструмент не разбирает текст сам. Разбор готовит spaCy, Stanza или UDPipe (скрипт tools/parse_texts.py),
   результат в формате CoNLL-U загружается во вкладке «Данные». Модуль
   – читает CoNLL-U и сопоставляет его с записями корпуса по тексту (пробелы и вид кавычек не учитываются);
   – привязывает слова разбора к токенам анализатора по смещениям в тексте;
   – уточняет срабатывания грамматических правил (снимает ложные, добавляет пропущенные) – refine;
   – находит придаточные предложения по дереву зависимостей для T3 – clauses.
   Метки зависимостей spaCy (dobj, relcl, auxpass, ROOT …) приводятся к Universal Dependencies. */
(function (g) {
  const _t = g._t || (s => s);
  const VERSION = 'parse-0.1';
  const MIN_COVER = 0.8;

  const DEP_MAP = { ROOT: 'root', dobj: 'obj', relcl: 'acl:relcl', auxpass: 'aux:pass', nsubjpass: 'nsubj:pass', csubjpass: 'csubj:pass', poss: 'nmod:poss', neg: 'advmod', dative: 'iobj', npadvmod: 'obl:npmod', prt: 'compound:prt', agent: 'obl:agent', oprd: 'xcomp', 'acl:relcl': 'acl:relcl' };
  const normDep = d => { const x = String(d || '').trim(); return DEP_MAP[x] || x.toLowerCase(); };
  const normQ = s => String(s == null ? '' : s).replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"');
  /* Ключ сопоставления – текст без пробелов, с прямыми кавычками */
  const keyOf = s => normQ(s).replace(/\s+/g, '');

  /* ---------- чтение CoNLL-U ---------- */
  function parseConllu(src) {
    const lines = String(src || '').replace(/^﻿/, '').split(/\r?\n/);
    const docs = []; let doc = null, sent = null; let parser = '';
    const newDoc = id => { doc = { id: id || ('doc' + (docs.length + 1)), text: null, parser: parser, sents: [], words: [] }; docs.push(doc); };
    const closeSent = () => { if (sent && sent.words.length) doc.sents.push(sent); sent = null; };
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      if (!line) { closeSent(); continue; }
      if (line[0] === '#') {
        const m = line.match(/^#\s*([^=]+?)\s*=\s?(.*)$/);
        const k = m ? m[1].toLowerCase() : '', v = m ? m[2] : '';
        if (/^newdoc( id)?$/.test(k) || /^#\s*newdoc\b/.test(line)) { closeSent(); newDoc(v || null); continue; }
        if (!doc) newDoc(null);
        if (k === 'doc_text') { try { doc.text = JSON.parse(v); } catch (e) { doc.text = v; } }
        else if (k === 'parser') { doc.parser = v; parser = parser || v; }
        else if (k === 'text') { if (!sent) sent = { text: v, words: [] }; else sent.text = v; }
        continue;
      }
      const c = line.split('\t');
      if (c.length < 8 || /[-.]/.test(c[0])) continue;
      if (!doc) newDoc(null);
      if (!sent) sent = { text: null, words: [] };
      const misc = c[9] || '_';
      const tr = misc.match(/TokenRange=(\d+):(\d+)/);
      sent.words.push({ id: +c[0], form: c[1], lemma: c[2] === '_' && c[1] !== '_' ? c[1].toLowerCase() : c[2], upos: c[3], xpos: c[4], feats: c[5], headId: +c[6] || 0, dep: normDep(c[7]), tr: tr ? [+tr[1], +tr[2]] : null, kids: [] });
    }
    closeSent();
    docs.forEach(d => {
      d.sents.forEach((s, si) => {
        s.words.forEach(w => { w.s = si; w.head = w.headId ? s.words.find(x => x.id === w.headId) || null : null; });
        s.words.forEach(w => { if (w.head) w.head.kids.push(w); });
        d.words.push(...s.words);
      });
      d.words.forEach((w, i) => { w.i = i; });
      const t = d.text != null ? d.text : d.sents.map(s => s.text != null ? s.text : s.words.map(w => w.form).join(' ')).join(' ');
      d.key = keyOf(t);
      d.nWords = d.words.length;
    });
    return { version: VERSION, parser: parser || (docs.find(d => d.parser) || {}).parser || _t('не указан'), docs: docs.filter(d => d.words.length) };
  }

  /* Набор разборов – поиск по тексту записи */
  function makeStore(parsed, name) {
    const map = new Map();
    parsed.docs.forEach(d => { if (!map.has(d.key)) map.set(d.key, d); });
    return { name: name || '', parser: parsed.parser, nDocs: parsed.docs.length, find: text => map.get(keyOf(text)) || null, docs: parsed.docs };
  }

  /* ---------- привязка к токенам ---------- */
  /* Слова разбора ищутся в тексте записи по порядку, поэтому смещения в файле не обязательны */
  function align(doc, text) {
    const T = normQ(text); let pos = 0, miss = 0;
    const out = doc.words.map(w => {
      const f = normQ(w.form);
      if (!f || /^\s+$/.test(f)) return null;
      while (pos < T.length && /\s/.test(T[pos])) pos++;
      let at = T.startsWith(f, pos) ? pos : -1;
      if (at < 0) { const k = T.indexOf(f, pos); if (k >= 0 && k - pos <= 40) at = k; }
      if (at < 0 && f.length > 1) { const k = T.toLowerCase().indexOf(f.toLowerCase(), pos); if (k >= 0 && k - pos <= 40) at = k; }
      if (at < 0) { miss++; return null; }
      pos = at + f.length;
      return [at, at + f.length];
    });
    return { spans: out, miss };
  }
  const isVerbTag = w => /^(VB|MD)/.test(w.xpos || '') || /^(VERB|AUX)$/.test(w.upos || '');
  function attach(toks, text, doc) {
    const { spans } = align(doc, text);
    const words = doc.words.map((w, i) => spans[i] ? Object.assign(w, { start: spans[i][0], end: spans[i][1] }) : null).filter(Boolean);
    let k = 0, nW = 0, nHit = 0;
    toks.forEach(t => {
      t.pw = null; t.pws = null;
      while (k < words.length && words[k].end <= t.start) k++;
      const ov = [];
      for (let j = k; j < words.length && words[j].start < t.end; j++) if (words[j].end > t.start) ov.push(words[j]);
      if (ov.length) { t.pws = ov; t.pw = ov.length === 1 ? ov[0] : (ov.find(isVerbTag) || ov[0]); ov.forEach(w => { w.tok = w.tok || t; }); }
      if (t.kind === 'word' || t.kind === 'name') { nW++; if (t.pw) nHit++; }
    });
    const coverage = nW ? nHit / nW : 0;
    const ok = coverage >= MIN_COVER;
    if (!ok) toks.forEach(t => { t.pw = null; t.pws = null; });
    toks.parse = { ok, coverage, parser: doc.parser, doc };
    return toks.parse;
  }

  /* ---------- запросы к дереву ---------- */
  const SUBJ = /^(nsubj|nsubj:pass|csubj|csubj:pass|expl)$/;
  const kidsOf = (w, re) => w.kids.filter(x => re.test(x.dep));
  const hasKid = (w, re) => w.kids.some(x => re.test(x.dep));
  const FIN = /^(VBD|VBZ|VBP|MD)$/;
  const finite = w => FIN.test(w.xpos) || w.kids.some(x => /^(aux|aux:pass|cop)$/.test(x.dep) && FIN.test(x.xpos)) || /VerbForm=Fin/.test(w.feats || '');
  function subtree(w, acc) { acc = acc || []; acc.push(w); w.kids.forEach(x => subtree(x, acc)); return acc; }
  const leftmost = w => subtree(w).filter(x => x.tok).sort((a, b) => a.start - b.start)[0] || null;
  const isQuestion = (text, sents, si) => !!sents[si] && /\?\s*$/.test(text.slice(sents[si].start, sents[si].end));

  /* ---------- уточнение грамматических правил ---------- */
  const PASSIVE = new Set(['passive', 'passpast', 'passmod', 'passfut', 'passperf', 'passcont', 'passinf']);
  const PAST_COVER = new Set(['pastsimple', 'pastbe', 'pastdid', 'passpast', 'pastcont', 'pastperf', 'pastperfcont', 'haveto', 'hadbetter', 'usedto', 'wish', 'wish3', 'cond2', 'cond3', 'havegot', 'hasgotto', 'would', 'could', 'passcont', 'passperf']);
  const CAUS = /^(make|let)$/, PERC = /^(see|hear|watch|feel|notice)$/;
  /* make(id, name, level, tokA, tokB) – создаёт срабатывание в формате ядра */
  function refine(hits, toks, sents, text, make) {
    const P = toks.parse; if (!P || !P.ok) return { added: [], dropped: [] };
    const W = toks.filter(t => (t.kind === 'word' || t.kind === 'name') && t.pw);
    const atStart = s => toks.find(t => t.start === s), atEnd = e => toks.find(t => t.end === e);
    const added = [], dropped = [];
    const cover = (t, ids) => hits.some(h => h.start <= t.start && h.end >= t.end && (!ids || ids.has(h.id)));
    const add = (id, name, level, a, b, why) => { const h = make(id, name, level, a, b); h.by = 'parse'; h.note = why; hits.push(h); added.push({ id, text: text.slice(h.start, h.end), why }); };
    // 1. снять срабатывания, которые разбор опровергает
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i]; const ta = atStart(h.start), tb = atEnd(h.end);
      const wa = ta && ta.pw, wb = tb && tb.pw;
      let why = '';
      if ((h.id === 'pastsimple' || h.id === 'pastbe') && wa && wa.xpos && wa.xpos !== 'VBD') why = _t('тег ') + wa.xpos + _t(', а не VBD');
      else if (PASSIVE.has(h.id) && wb && wb.xpos && wb.xpos !== 'VBN' && !hasKid(wb, /^aux:pass$/)) why = _t('тег ') + wb.xpos + _t(', связки страдательного залога нет');
      else if (h.id === 'pp2' && wb && wb.xpos === 'VBD' && hasKid(wb, SUBJ)) why = _t('глагол в прошедшем времени с подлежащим');
      if (why) { dropped.push({ id: h.id, text: text.slice(h.start, h.end), why }); hits.splice(i, 1); }
    }
    // 2. добавить конструкции, которые правила пропустили
    W.forEach(t => {
      const w = t.pw, x = w.xpos || '', d = w.dep, lem = String(w.lemma || '').toLowerCase();
      if (t.kind === 'label') return;
      if (x === 'VBD' && !/^aux/.test(d) && !cover(t, PAST_COVER)) {
        if (lem === 'be') add('pastbe', _t('Глагол be в прошедшем времени'), 'A1', t, t, _t('разбор – VBD'));
        else add('pastsimple', _t('Прошедшее простое (Past Simple)'), 'A1', t, t, _t('разбор – VBD'));
      }
      if ((x === 'VBZ' || x === 'VBP') && !/^aux/.test(d) && !hasKid(w, /^expl$/) && !cover(t)) {
        if (lem === 'be') add('presbe', _t('Глагол be в настоящем времени'), 'A1', t, t, _t('разбор – ') + x);
        else add('pressimple', _t('Настоящее простое (Present Simple)'), 'A1', t, t, _t('разбор – ') + x);
      }
      if (x === 'VB' && (d === 'root' || (d === 'conj' && w.head && w.head.dep === 'root' && w.head.xpos === 'VB' && !hasKid(w.head, SUBJ))) && !hasKid(w, SUBJ) && !hasKid(w, /^(aux|aux:pass|mark)$/) && !isQuestion(text, sents, t.si) && !cover(t, new Set(['lets', 'imper'])) && !(lem === 'let' && w.kids.some(k => /^'?s$|^us$/i.test(k.form))))
        add('imper', _t('Повелительное наклонение'), 'A1', t, t, _t('разбор – VB без подлежащего'));
      if (CAUS.test(lem) && /^VB/.test(x)) {
        const c = kidsOf(w, /^(ccomp|xcomp)$/).find(k => k.xpos === 'VB' && (hasKid(k, /^nsubj$/) || hasKid(w, /^obj$/)));
        if (c && c.tok && !cover(t, new Set(['causlet']))) add('causlet', _t('Каузатив make / let + дополнение + инфинитив'), 'A2', t, c.tok.end > t.end ? c.tok : t, _t('разбор – ') + lem + ' + ' + c.dep);
      }
      if (PERC.test(lem) && /^VB/.test(x) && !cover(t, new Set(['percinf', 'percing']))) {
        const obj = kidsOf(w, /^obj$/)[0];
        const c = kidsOf(w, /^(ccomp|xcomp)$/).find(k => (k.xpos === 'VB' || k.xpos === 'VBG') && (hasKid(k, /^nsubj$/) || obj)) || (obj && kidsOf(obj, /^acl$/).find(k => k.xpos === 'VBG'));
        if (c && c.tok && c.tok.end > t.end) { if (c.xpos === 'VBG') add('percing', _t('Глагол восприятия + дополнение + -ing (saw him running)'), 'B1', t, c.tok, _t('разбор')); else add('percinf', _t('Глагол восприятия + дополнение + инфинитив (saw him run)'), 'B1', t, c.tok, _t('разбор')); }
      }
      if (x === 'VBN' && d === 'acl' && w.head && w.head.tok && !cover(t, new Set(['pp2'].concat([...PASSIVE]))))
        add('pp2', _t('Причастие II в постпозиции (the words given)'), 'B2', w.head.tok.start < t.start ? w.head.tok : t, t, _t('разбор – acl'));
      if (x === 'VBG' && d === 'acl' && w.head && w.head.tok && w.head.tok.start < t.start && !/^VB/.test(w.head.xpos) && !cover(t, new Set(['ingpost', 'ingcl', 'using', 'percing'])))
        add('ingpost', _t('Причастие I в постпозиции (words describing …)'), 'B2', w.head.tok, t, _t('разбор – acl'));
      if (d === 'acl:relcl' && w.head && w.head.tok && !subtree(w).some(k => /^(WDT|WP|WP\$|WRB)$/.test(k.xpos) || (/^that$/i.test(k.form) && /^(nsubj|obj|mark|nsubj:pass|obl)$/.test(k.dep)))) {
        const L = leftmost(w);
        if (L && L.tok && !cover(L.tok, new Set(['relomit', 'thatomit']))) add('relomit', _t('Определительное придаточное без союзного слова (the book I read)'), 'A2', L.tok, t.end > L.tok.end ? t : L.tok, _t('разбор – acl:relcl без относительного местоимения'));
      }
    });
    hits.sort((a, b) => a.start - b.start);
    return { added, dropped };
  }

  /* ---------- придаточные предложения по дереву ---------- */
  /* Придаточное – финитная клауза, подчинённая другой: advcl, ccomp, csubj, acl:relcl и финитный acl.
     Инфинитивные и причастные обороты (xcomp, нефинитные advcl и acl) не считаются придаточными. */
  const CLAUSE_DEP = /^(advcl|ccomp|csubj|csubj:pass|acl:relcl|acl)$/;
  function clauses(toks) {
    const P = toks.parse; if (!P || !P.ok) return null;
    const out = [], seen = new Set();
    P.doc.words.forEach(w => {
      if (!w.tok || !CLAUSE_DEP.test(w.dep) || !finite(w)) return;
      const mk = w.kids.find(k => k.dep === 'mark' && k.tok) || subtree(w).find(k => /^(WDT|WP|WP\$|WRB)$/.test(k.xpos) && k.tok) || leftmost(w);
      const t = mk && mk.tok; if (!t || seen.has(t.start)) return;
      seen.add(t.start);
      out.push({ start: t.start, si: t.si, w: t.lw, src: _t('разбор'), dep: w.dep });
    });
    return out.sort((a, b) => a.start - b.start);
  }

  g.IA_PARSE = { VERSION, MIN_COVER, parseConllu, makeStore, keyOf, align, attach, refine, clauses, normDep };
})(typeof window !== 'undefined' ? window : globalThis);
