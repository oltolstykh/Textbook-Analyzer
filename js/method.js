/* Методика упражнений – тип упражнения по степени свободы учащегося, этап работы над материалом,
   этап работы с текстом, единица языкового материала и последовательность упражнений урока. Версия method-0.1.
   Эталоны и ссылки на источники – R.METHOD в resources.js (method-0.1).
   Модуль не меняет показатели режима «Инструкции» (A1-A7, D1, D3, D4, ИСВ) – он дополняет готовый
   результат анализа: analyze(A, settings) возвращает классификацию упражнений, уроки, статистику и выводы.
   Работает в браузере и в node (для проверок). */
(function (g) {
  const _t = g._t || (s => s);
  const R = g.IA_RES;
  const M = R.METHOD;
  const VERSION = 'method-0.1';
  const DEFAULTS = { view: 'ru', problemSEQ: 0.4, wReturn: 0.5, wText: 0.5, countReturn: true };
  const TYPE = {}; M.TYPES.forEach(t => { TYPE[t.id] = t; });
  const BY_N = n => M.TYPES.find(t => t.n === n) || null;
  const UNIT = {}; M.UNITS.forEach(u => { UNIT[u.id] = u; });
  const STAGE = {}; M.TEXT_STAGES.forEach(s => { STAGE[s.id] = s; });
  const PHASE = {}; M.PHASES.forEach(p => { PHASE[p.id] = p; });
  const RULE = {}; M.RULES.forEach(x => { RULE[x.id] = x; });
  const clamp = v => Math.max(0, Math.min(1, v));

  const LANG = new Set(['gap', 'match', 'choose', 'order', 'sort']);
  const TRANS = new Set(['trans', 'transl', 'corr']);
  const RECEPT_VERB = /^(read|listen|listen to|listen again|watch|skim|scan)$/;
  const ASPECT_RX = /чтен|аудир|reading|listening/i;

  /* Совпадение признака с фрагментом – фрагмент нужен для обоснования в карточке */
  function hit(key, low) { const m = low.match(M.CUES[key]); return m ? m[0] : null; }

  /* Единица языкового материала – по тексту упражнения, иначе по словам инструкции */
  function materialUnit(rec, n) {
    const ex = String(rec.exercise_text || '').trim();
    if (ex) {
      const items = ex.split(/\r?\n|\s(?=(?:\d+|[a-h])[.)]\s)|\s(?=\d+\s)|\s*[;|]\s*/).map(s => s.replace(/^\s*(?:\d+|[a-h])[.)]\s*/, '').replace(/_{2,}|\.{3,}|…/g, ' ').trim()).filter(Boolean);
      const words = s => (s.match(/[A-Za-z']+/g) || []).length;
      if (items.length >= 2) {
        const avg = items.reduce((s, x) => s + words(x), 0) / items.length;
        return { id: avg <= 1.6 ? 'word' : avg <= 4 ? 'phrase' : 'sent', by: 'exercise_text' };
      }
      const w = words(ex);
      if (w > 30) return { id: 'text', by: 'exercise_text' };
      if (w > 4) return { id: 'sent', by: 'exercise_text' };
      if (w >= 1) return { id: w <= 1 ? 'word' : 'phrase', by: 'exercise_text' };
    }
    const low = String(rec.text || '').toLowerCase();
    if (/\b(texts?|paragraphs?|story|stories|e-?mails?|letters?|articles?|essays?|dialogues?|conversations?|blog|report|review|postcard|summary)\b/.test(low) || n === 4) return { id: 'text', by: 'text' };
    if (/\b(sentences?|questions?|statements?|answers?)\b/.test(low)) return { id: 'sent', by: 'text' };
    if (/\b(phrases?|collocations?|expressions?|phrasal verbs?|word partners)\b/.test(low)) return { id: 'phrase', by: 'text' };
    if (/\b(words?|vocabulary|nouns?|verbs?|adjectives?|pictures?)\b/.test(low)) return { id: 'word', by: 'text' };
    return null;
  }

  /* ---------- Тип, этап и надёжность для одной инструкции ---------- */
  function classify(r) {
    const rec = r.rec, low = String(rec.text || '').toLowerCase().replace(/[’`]/g, "'");
    const t = r.type;
    const verbs = (r.actions || []).filter(a => !a.org).map(a => a.verb);
    const why = [];
    const c = {
      model: hit('model', low) || (/^\s*(?:0|example|e\.g\.)\s*[.:)]/im.test(rec.exercise_text || '') ? _t('образец в тексте упражнения') : null),
      support: hit('support', low), form: hit('form', low), comm: hit('comm', low), repro: hit('repro', low),
      intro: hit('intro', low), pre: hit('pre', low), post: hit('post', low), again: hit('again', low)
    };
    const recept = verbs.some(v => RECEPT_VERB.test(v)) || ASPECT_RX.test(rec.aspect || '');
    const textRef = /\bthe (?:text|article|story|recording|dialogue|interview|conversation|email|letter|passage|extract|podcast|blog|report|song|poem|advert|programme)\b/.test(low);
    const repro = t === 'repeat' || (c.repro && c.repro !== 'retell');
    const textBound = !repro && ((recept && (textRef || verbs.some(v => /^(read|listen|listen to|listen again|watch|skim|scan)$/.test(v)))) || !!c.pre);
    // задание с информационным разрывом или опросом – речевое при любом глаголе (harmer, с. 85-86)
    const gap = /\b(student a|student b|find someone who|survey|interview (?:your|each|a|other|people|classmates|someone)|don'?t show|without (?:looking|showing)|differences)\b/.exec(low);
    // образец, который регламентирует высказывание (а не перечень идей)
    const strictModel = /\b(follow(?:ing)? the (?:example|model)|as in the example|like (?:in )?the example|use the (?:example|model)|look at the example)\b/.exec(low);
    // беглый просмотр текста для определения темы – дотекстовый этап (sol06, с. 162)
    if (!c.pre && /\bskim\b|\bread (?:\w+ ){0,3}quickly\b/.test(low) && /\b(title|heading|topic|gist|main idea|what (?:it|the \w+) is about)\b/.test(low)) c.pre = (low.match(/\bskim\b|\bread (?:\w+ ){0,3}quickly\b/) || [''])[0];
    // поиск и выделение формы в готовом материале – ознакомление, анализ языка
    if (!c.intro && /^(choose|find)$/.test(t || '') && /\b(underline|circle|highlight|find|identify)\b/.test(low) && c.form) c.intro = (low.match(/\b(underline|circle|highlight|find|identify)\b[^.,;]*/) || [''])[0];
    if (t) why.push(_t('тип задания – ') + (r.typeName || t));
    let n = null, decisive = false, conflict = false;

    if (c.intro && t !== 'speak' && t !== 'write') {
      n = 1; decisive = true; why.push(_t('анализ языкового материала – «') + c.intro + '»');
    } else if (t === 'repeat' || (c.repro && c.repro !== 'retell' && t !== 'write')) {
      n = 1; decisive = true; why.push(_t('воспроизведение по образцу – «') + (c.repro || t) + '»');
    } else if (gap && !textBound && t !== 'write' && !c.form) {
      n = 4; decisive = true; why.push(_t('информационный разрыв или опрос – «') + gap[0] + '»');
    } else if (!t && c.repro === 'retell') {
      n = 3; decisive = true; why.push(_t('пересказ – воспроизведение с перестройкой'));
    } else if (TRANS.has(t)) {
      n = 2; decisive = true;
    } else if (LANG.has(t) && c.form) {
      n = 2; decisive = true; why.push(_t('указание на форму – «') + c.form + '»');
    } else if (textBound && !c.intro && ['choose', 'match', 'order', 'gap', 'find', 'ans', 'read', 'listen', 'write', 'sort'].includes(t) && !(t === 'write' && !verbs.some(v => /^(listen|listen to|read|watch)$/.test(v)) && !/\bnote|\bdown\b/.test(low))) {
      n = 3; decisive = textRef || recept; why.push(_t('задание на понимание текста'));
      if (c.comm && /\b(discuss|what do you think|your opinion|do you agree|why or why not)\b/.test(c.comm)) { n = 4; why.push(_t('собственная оценка содержания – «') + c.comm + '»'); }
    } else if (LANG.has(t)) {
      n = 1; decisive = true;
      if (c.model) why.push(_t('образец – «') + c.model + '»');
    } else if (t === 'ans' && !verbs.includes('ask')) {
      n = 3; decisive = !!c.comm; why.push(_t('ответы на вопросы в учебной ситуации'));
    } else if (t === 'speak' || t === 'write' || t === 'ans') {
      if (c.repro === 'retell') { n = 3; decisive = true; why.push(_t('пересказ – воспроизведение с перестройкой')); }
      else if (c.form) { n = 3; decisive = true; why.push(_t('языковые средства заданы – «') + c.form + '»'); if (c.comm) conflict = true; }
      else if (strictModel || (c.model && !c.comm)) { n = 3; decisive = true; why.push(_t('высказывание по образцу – «') + (strictModel ? strictModel[0] : c.model) + '»'); }
      else {
        n = 4; decisive = !!c.comm;
        why.push(c.comm ? _t('признак речевой ситуации – «') + c.comm + '»' : _t('собственное высказывание без регламентации средств'));
        if (c.support) why.push(_t('с опорами – «') + c.support + '»');
      }
    } else if (t === 'find' || t === 'read' || t === 'listen') {
      n = 3; why.push(_t('работа с текстом'));
    }

    // этап работы над материалом
    let phase = null;
    if (n != null) phase = c.intro ? 'intro' : n === 4 ? 'apply' : 'train';
    // этап работы с текстом
    let stage = null;
    if (textBound && !c.intro) {
      if (c.pre) stage = 'pre';
      else if (c.post || (n === 4 && (textRef || recept))) stage = 'post';
      else stage = 'while';
      if (c.pre) why.push(_t('дотекстовый этап – «') + c.pre + '»');
      if (c.post) why.push(_t('послетекстовый этап – «') + c.post + '»');
    }
    const unit = materialUnit(rec, n);
    // надёжность – известен ли тип задания, есть ли решающий признак, нет ли противоречия
    let conf = n == null ? 0 : 0.4 + (t ? 0.2 : 0) + (decisive ? 0.3 : 0) - (conflict ? 0.3 : 0);
    conf = clamp(Math.round(conf * 100) / 100);
    if (conflict) why.push(_t('противоречивые признаки – речевая ситуация при заданной форме'));
    const T = n ? BY_N(n) : null;
    return {
      n, type: T ? T.id : null, typeName: T ? T.name : _t('не определён'), group: T ? T.group : null,
      groupName: T ? M.GROUPS[T.group].name : _t('не определена'), en: T ? T.en : '',
      phase, phaseName: phase ? PHASE[phase].name : '—', stage, stageName: stage ? STAGE[stage].name : '',
      again: !!c.again, unit: unit ? unit.id : null, unitName: unit ? UNIT[unit.id].name : '—', unitBy: unit ? unit.by : null,
      conf, confLevel: conf >= 0.8 ? 'high' : conf >= 0.55 ? 'mid' : 'low', cues: c, why
    };
  }

  /* ---------- Уроки – профиль и правила последовательности ---------- */
  function lessons(results, S) {
    const map = new Map();
    results.forEach(r => {
      const k = r.rec.book + '|' + (r.rec.unit || '');
      if (!map.has(k)) map.set(k, { id: k, key: k, book: r.rec.book, unit: r.rec.unit || '', items: [] });
      map.get(k).items.push(r);
    });
    const out = [];
    for (const L of map.values()) {
      const flags = [];
      const typed = L.items.filter(r => r.method.n != null);
      const hasNonSpeech = typed.some(r => r.method.n <= 3);
      let max = 0, prev = null, seenWhile = false, seenPre = false, textFlag = false, afterSpeech = false;
      L.items.forEach((r, i) => {
        const m = r.method, n = m.n;
        if (n == null) return;
        if (n === 4 && max <= 2 && hasNonSpeech)
          flags.push({ rule: 'jump', at: i, id: r.id, text: (max ? _t('речевое задание после упражнений типа «') + BY_N(max).name + _t('» без условно-речевых') : _t('урок начинается с речевого задания, тренировка идёт после него')) });
        if (n === 4) afterSpeech = true;
        if (n <= 2 && afterSpeech) { flags.push({ rule: 'return', at: i, id: r.id, text: _t('языковое упражнение после речевого задания') }); afterSpeech = false; }
        if (prev && prev.method.group === 'lang' && m.group === 'lang' && prev.method.unit && m.unit && UNIT[prev.method.unit].n > UNIT[m.unit].n)
          flags.push({ rule: 'unitDrop', at: i, id: r.id, text: _t('единица материала – ') + UNIT[prev.method.unit].name + ', ' + _t('затем ') + UNIT[m.unit].name });
        if (m.stage) {
          if (m.stage === 'post' && !seenWhile && !textFlag && L.items.slice(i + 1).some(x => x.method.stage === 'while')) { flags.push({ rule: 'textOrder', at: i, id: r.id, text: _t('послетекстовое задание стоит до текстового') }); textFlag = true; }
          if (m.stage === 'while' && !seenWhile && !seenPre && !m.again && !textFlag) { flags.push({ rule: 'textOrder', at: i, id: r.id, text: _t('текстовое задание без дотекстового этапа') }); textFlag = true; }
          if (m.stage === 'while') seenWhile = true;
          if (m.stage === 'pre') seenPre = true;
        }
        max = Math.max(max, n); prev = r;
      });
      if (typed.length >= 2 && hasNonSpeech && !typed.some(r => r.method.n === 4))
        flags.push({ rule: 'noApply', at: L.items.length - 1, id: null, text: _t('нет речевого задания – этап применения пропущен') });
      const w = { jump: 1, return: S.countReturn ? S.wReturn : 0, noApply: 1, textOrder: S.wText, unitDrop: 0 };
      const P = flags.reduce((s, f) => s + (w[f.rule] || 0), 0);
      L.n = L.items.length; L.typed = typed.length;
      L.flags = flags; L.points = P;
      L.SEQ = typed.length >= 2 ? clamp(P / Math.max(2, typed.length - 1)) : null;
      L.problem = L.SEQ != null && L.SEQ >= S.problemSEQ;
      L.profile = L.items.map(r => r.method.n);
      L.aim = (L.items.find(r => String(r.rec.aim || '').trim()) || { rec: {} }).rec.aim || '';
      L.groups = { lang: 0, cond: 0, speech: 0, none: 0 };
      L.items.forEach(r => { L.groups[r.method.group || 'none']++; });
      out.push(L);
    }
    return out;
  }

  /* ---------- Статистика ---------- */
  function statistics(results, ls, S) {
    const st = { n: results.length };
    const cnt = (arr, f) => { const o = {}; arr.forEach(x => { const k = f(x); if (k != null) o[k] = (o[k] || 0) + 1; }); return o; };
    st.types = cnt(results, r => r.method.type || 'none');
    st.groups = cnt(results, r => r.method.group || 'none');
    st.phases = cnt(results, r => r.method.phase || 'none');
    st.stages = cnt(results.filter(r => r.method.stage), r => r.method.stage);
    st.units = cnt(results, r => r.method.unit || 'none');
    st.conf = cnt(results, r => r.method.confLevel);
    st.books = [...new Set(results.map(r => r.rec.book))].map(b => {
      const rs = results.filter(r => r.rec.book === b), L = ls.filter(x => x.book === b);
      const seq = L.map(x => x.SEQ).filter(v => v != null);
      return { book: b, n: rs.length, types: cnt(rs, r => r.method.type || 'none'), groups: cnt(rs, r => r.method.group || 'none'),
        lessons: L.length, meanSEQ: seq.length ? seq.reduce((s, v) => s + v, 0) / seq.length : null, problem: L.filter(x => x.problem).length };
    });
    st.rules = M.RULES.map(x => ({ id: x.id, name: x.name, n: ls.reduce((s, L) => s + L.flags.filter(f => f.rule === x.id).length, 0), lessons: ls.filter(L => L.flags.some(f => f.rule === x.id)).length }));
    const seq = ls.map(x => x.SEQ).filter(v => v != null);
    st.lessons = ls.length; st.judged = seq.length;
    st.meanSEQ = seq.length ? seq.reduce((s, v) => s + v, 0) / seq.length : null;
    st.problem = ls.filter(x => x.problem).length;
    return st;
  }

  /* ---------- Выводы ---------- */
  const pct = (a, b) => b ? Math.round(a / b * 100) + ' %' : '—';
  const fmt = (x, d) => x == null || isNaN(x) ? '—' : (g.IA_I18N && g.IA_I18N.lang === 'en' ? x.toFixed(d == null ? 2 : d) : x.toFixed(d == null ? 2 : d).replace('.', ','));
  function conclusions(results, ls, st, S) {
    const out = []; const n = results.length; if (!n) return out;
    const G = st.groups;
    out.push({ c: 'MT', title: _t('Типы упражнений'), text:
      _t('Из ') + n + _t(' упражнений языковых (подстановочных и трансформационных) – ') + (G.lang || 0) + ' (' + pct(G.lang || 0, n) + _t('), условно-речевых – ') + (G.cond || 0) + ' (' + pct(G.cond || 0, n) + _t('), речевых – ') + (G.speech || 0) + ' (' + pct(G.speech || 0, n) + ')' +
      (G.none ? _t(', тип не определён у ') + G.none : '') + '. ' +
      (st.books.length > 1 ? st.books.map(b => _t('«') + b.book + _t('» – речевых ') + pct(b.groups.speech || 0, b.n)).join('; ') + '. ' : '') +
      _t('Тип определён по шкале степени свободы учащегося (Соловова, 2006, с. 32), ему соответствуют controlled, guided и communicative practice зарубежных пособий.') });
    if (st.judged) {
      const top = st.rules.filter(x => x.n && RULE[x.id].weight > 0).sort((a, b) => b.n - a.n);
      const worst = ls.filter(L => L.SEQ != null).sort((a, b) => b.SEQ - a.SEQ).filter(L => L.SEQ > 0).slice(0, 2);
      out.push({ c: 'SEQ', title: _t('Последовательность уроков'), text:
        _t('Показатель последовательности рассчитан для ') + st.judged + _t(' уроков, среднее значение – ') + fmt(st.meanSEQ) + '. ' +
        (st.problem ? st.problem + _t(' уроков достигают порога ') + fmt(S.problemSEQ) + '. ' : _t('Ни один урок не достигает порога ') + fmt(S.problemSEQ) + '. ') +
        (top.length ? _t('Чаще всего отмечено – ') + top.map(x => x.name + ' (' + x.n + ')').join(', ') + '. ' : '') +
        (worst.length ? _t('Больше всего отметок в ') + worst.map(L => (st.books.length > 1 ? _t('«') + L.book + _t('», ') : '') + (L.unit || _t('без урока')) + ' (' + fmt(L.SEQ) + ')').join(_t(' и ')) + '.' : '') });
    }
    const noApply = ls.filter(L => L.flags.some(f => f.rule === 'noApply'));
    if (noApply.length) out.push({ c: 'SEQ', title: _t('Выход в речь'), text: _t('В ') + noApply.length + _t(' уроках нет речевого задания – ') + noApply.slice(0, 4).map(L => (st.books.length > 1 ? L.book + ', ' : '') + (L.unit || '—')).join('; ') + _t('. Этап применения мог быть перенесён в другой урок – это стоит проверить по учебнику.') });
    const ret = st.rules.find(x => x.id === 'return'), jump = st.rules.find(x => x.id === 'jump');
    if ((ret && ret.n) || (jump && jump.n)) out.push({ c: 'SEQ', title: _t('Скачки и возвраты'), text:
      (jump && jump.n ? _t('Скачков – ') + jump.n + _t(' (речевое задание без промежуточной тренировки). ') : '') +
      (ret && ret.n ? _t('Возвратов – ') + ret.n + _t(' (языковое упражнение после речевого задания). ') : '') +
      _t('Обратный порядок допустим, если урок построен от задания к анализу языка (boomerang, test-teach-test) – решение о нарушении принимает эксперт.') });
    const tx = st.rules.find(x => x.id === 'textOrder');
    if (tx && tx.n) out.push({ c: 'SEQ', title: _t('Работа с текстом'), text: _t('Отметок о порядке работы с текстом – ') + tx.n + _t('. Дотекстовый этап формулирует речевую задачу, создаёт мотивацию и снимает трудности (Соловова, 2006, с. 136, 161) – в учебнике его может заменять работа учителя.') });
    const low = results.filter(r => r.method.confLevel === 'low');
    out.push({ c: 'MT', title: _t('Надёжность и ограничения'), text:
      (low.length ? _t('У ') + low.length + _t(' упражнений тип определён с низкой надёжностью – их стоит проверить вручную. ') : _t('Тип всех упражнений определён со средней или высокой надёжностью. ')) +
      _t('Алгоритм опирается на глагол-установку, тип задания, указание на форму, образец, опоры и признаки речевой ситуации. Он не видит цели урока и материала вне данных, поэтому показывает зоны для экспертного взгляда, а уместность задания оценивают эксперт и модель (R7, L1, L2).') });
    return out;
  }

  /* ---------- Точка входа ---------- */
  function analyze(A, settings) {
    if (!A || !A.results) return null;
    const S = Object.assign({}, DEFAULTS, settings || {});
    A.results.forEach(r => { r.method = classify(r); });
    const ls = lessons(A.results, S);
    const st = statistics(A.results, ls, S);
    return { version: VERSION, resources: R.METHOD_VERSION, settings: S, lessons: ls, stats: st, conclusions: conclusions(A.results, ls, st, S) };
  }

  g.IA_METHOD = { VERSION, DEFAULTS, analyze, classify, lessons, TYPE, UNIT, STAGE, PHASE, RULE, BY_N };
})(typeof window !== 'undefined' ? window : globalThis);
