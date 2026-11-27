/* Интерфейс методических рекомендаций (recommend.js) – вкладка «Рекомендации», блок карточки инструкции
   и текста, конкретизация рекомендаций языковой моделью (Groq или ручной промпт), экспорт и описание
   во вкладке «Методика». Версия ui-r-0.1. Подключается из ui.js как фабрика – получает общие функции и состояние. */
window.IA_UI_REC = function (H) {
  const _t = window._t || (s => s);
  const { $, esc, E, R, store, save, toast, copy, download, stamp } = H;
  const RC = window.IA_REC;
  const VERSION = 'ui-r-0.1';
  const PROMPT_VERSION = 'prompt-rec-0.1';
  const GROQ_BATCH = 2;
  const WHO = R.REC.WHO, PRIO = R.REC.PRIO;
  const RULE = RC.RULE;
  const st = () => {
    store.recs = store.recs || {};
    store.recs.models = store.recs.models || {};
    store.recs.ui = Object.assign({ who: 'both', book: '*', prio: 'all', cur: '', scope: 'cur', model: '' }, store.recs.ui || {});
    return store.recs;
  };
  let RS = null;
  const busy = { on: false, stop: false };

  /* ---------- расчёт ---------- */
  function compute() { RS = RC.analyze(H.A, H.MA, H.T, H.P); return RS; }
  const get = () => RS;

  /* ---------- фильтры ---------- */
  function pass(x) {
    const u = st().ui;
    if (u.who !== 'both' && x.who !== u.who) return false;
    if (u.book !== '*' && x.book !== u.book) return false;
    if (u.prio === '1' && x.prio > 1) return false;
    if (u.prio === '12' && x.prio > 2) return false;
    return true;
  }
  const basisLab = x => (x.basis === 'SEQ' ? _t('ПСУ') : x.basis === 'MT' ? _t('методика') : _t(x.basis));
  function srcLine(x) {
    const r = RULE[x.rule];
    return '<span class="mute small">' + esc(r.name) + ' · ' + esc(basisLab(x)) + (x.src ? ' · ' + esc(RC.cite(x.src)) : '') + '</span>';
  }
  function li(x, showWho, noDraft) {
    return '<li><span class="tag rc-p' + x.prio + '" title="' + esc(PRIO[x.prio]) + '">' + x.prio + '</span>' + (showWho ? '<span class="tag rc-w">' + esc(WHO[x.who]) + '</span>' : '') + esc(x.text) +
      (x.draft && !noDraft ? '<div class="rw small" style="margin:6px 0 2px">' + esc(x.draft) + '</div><span class="small mute">' + _t('Автоматический черновик – требует проверки.') + '</span> ' : '') +
      (x.alt ? ' <span class="mute small">' + esc(x.alt) + '</span>' : '') + '<br>' + srcLine(x) + '</li>';
  }
  function twoCols(list) {
    const u = st().ui;
    const T = list.filter(x => x.who === 'teacher'), A = list.filter(x => x.who === 'author');
    const col = (arr, who) => '<div><h4 class="rc-h">' + (who === 'teacher' ? _t('Учителю') : _t('Автору')) + '</h4>' + (arr.length ? '<ul class="issues">' + arr.map(x => li(x)).join('') + '</ul>' : '<p class="small mute">' + _t('Рекомендаций нет.') + '</p>') + '</div>';
    if (u.who === 'teacher') return col(T, 'teacher');
    if (u.who === 'author') return col(A, 'author');
    return '<div class="grid2">' + col(T, 'teacher') + col(A, 'author') + '</div>';
  }

  /* ---------- модель – предложения по уроку ---------- */
  function modelFor(key, ex) {
    const out = [];
    Object.entries(st().models).forEach(([label, m]) => {
      const it = m.items && m.items[key]; if (!it) return;
      const pick = arr => (arr || []).filter(y => ex == null || String(y.ex || '') === String(ex));
      const t = pick(it.teacher), a = pick(it.author);
      if (t.length || a.length || (ex == null && it.aim)) out.push({ label, aim: it.aim, teacher: t, author: a });
    });
    return out;
  }
  function modelHTML(key, ex) {
    const u = st().ui;
    return modelFor(key, ex).map(m => {
      const row = (y, who) => '<li><span class="tag rc-w">' + esc(WHO[who]) + '</span>' + (y.ex && ex == null ? '<b>Ex. ' + esc(y.ex) + '</b> – ' : '') + esc(y.text || '') + (y.extra ? ' <span class="tag">' + _t('дополнительно') + '</span>' : '') +
        (y.example ? '<div class="rw small" style="margin-top:6px">' + esc(y.example) + '</div>' : '') + (y.draft ? '<div class="rw small" style="margin-top:6px;white-space:pre-wrap">' + esc(y.draft) + '</div>' : '') + '</li>';
      const items = (u.who !== 'author' ? m.teacher.map(y => row(y, 'teacher')) : []).concat(u.who !== 'teacher' ? m.author.map(y => row(y, 'author')) : []);
      if (!items.length && !(ex == null && m.aim)) return '';
      return '<div class="box rc-model"><div class="small"><b>' + _t('Предложения модели ') + esc(m.label) + '</b>' + (ex == null && m.aim ? '<span class="mute">' + _t(' · цель урока по оценке модели – ') + esc(m.aim) + '</span>' : '') + '</div>' +
        (items.length ? '<ul class="issues small" style="margin-top:6px">' + items.join('') + '</ul>' : '') + '<div class="note">' + _t('Предложения модели требуют проверки методистом.') + '</div></div>';
    }).join('');
  }

  /* ---------- вкладка ---------- */
  function lessonTitle(L) { return (L.unit || _t('Без урока')); }
  function itemHead(it) {
    if (it.kind === 'text') {
      const t = H.T && H.T.results.find(x => x.id === it.id);
      return '<a href="#" data-topen="' + esc(it.id) + '">' + _t('Текст') + ' «' + esc(t ? t.rec.title || _t('без заголовка') : it.id) + '»</a>' + (it.ex ? ' <span class="mute">(Ex. ' + esc(it.ex) + ')</span>' : '');
    }
    const r = H.A && H.A.results.find(x => x.id === it.id);
    return (r && r.method && H.UM ? H.UM.chip(r.method) + ' ' : '') + '<a href="#" data-open="' + esc(it.id) + '">Ex. ' + esc(it.ex || '—') + '</a> <span class="serif">' + esc(r ? r.rec.text.slice(0, 120) + (r.rec.text.length > 120 ? '…' : '') : '') + '</span>';
  }
  function lessonBox(L) {
    const u = st().ui;
    const lr = L.recs.filter(pass);
    const items = L.items.map(it => ({ it, recs: it.recs.filter(pass) })).filter(x => x.recs.length);
    const mh = modelHTML(L.key);
    if (!lr.length && !items.length && !mh) return '';
    const p1 = lr.concat(...items.map(x => x.recs)).some(x => x.prio === 1);
    const ML = H.MA && H.MA.lessons.find(x => x.key === L.key);
    const n = lr.length + items.reduce((s, x) => s + x.recs.length, 0);
    let h = '<details class="box rc-lesson' + (p1 ? ' rc-hot' : '') + '"' + (p1 || u.cur === L.key ? ' open' : '') + ' data-lkey="' + esc(L.key) + '"><summary><b>' + esc(lessonTitle(L)) + '</b> <span class="small mute">' + (u.book === '*' && (RS.books.length > 1) ? esc(L.book) + ' · ' : '') + n + ' ' + E.plural(n, [_t('рекомендация'), _t('рекомендации'), _t('рекомендаций')]) + (L.SEQ != null ? _t(' · ПСУ ') + E.fmt(L.SEQ, 2) : '') + '</span>' +
      (ML && H.UM ? ' <span class="mx-prof">' + ML.items.map(r => H.UM.chip(r.method, r.id)).join('') + '</span>' : '') + '</summary>';
    if (L.aim) h += '<div class="small mute">' + _t('Цель урока – ') + esc(L.aim) + '</div>';
    if (lr.length) h += '<h4 class="rc-h">' + _t('Урок – последовательность и этапы') + '</h4><ul class="issues">' + lr.map(x => li(x, u.who === 'both')).join('') + '</ul>';
    if (items.length) h += '<h4 class="rc-h">' + _t('Упражнения и тексты') + '</h4>' + items.map(x => '<div class="rc-item"><div class="small">' + itemHead(x.it) + '</div><ul class="issues">' + x.recs.map(y => li(y, u.who === 'both')).join('') + '</ul></div>').join('');
    h += mh;
    h += '<div class="row" style="margin-top:8px"><button class="btn sm" data-rcl="' + esc(L.key) + '">' + _t('Конкретизировать моделью') + '</button></div>';
    return h + '</details>';
  }
  function bookBox(b) {
    const list = RS.book.filter(x => x.book === b && pass(x));
    return '<div class="box" style="margin-bottom:14px"><h3 style="margin-top:0">' + esc(b) + '</h3>' + (list.length ? twoCols(list) : '<p class="small mute">' + _t('Рекомендаций по учебнику в целом нет – смотрите уроки.') + '</p>') + '</div>';
  }
  function render() {
    const el = $('#v-rec'); if (!el) return;
    if (!RS || (!H.A && !H.T)) { el.innerHTML = '<div class="empty">' + _t('Нет данных – загрузите инструкции или тексты во вкладке «Данные».') + '</div>'; return; }
    const u = st().ui;
    if (u.book !== '*' && !RS.books.includes(u.book)) u.book = '*';
    const vis = RS.all.filter(pass);
    const seg = (k, opts) => '<div class="seg" data-rcseg="' + k + '">' + opts.map(([v, l]) => '<button data-v="' + v + '" aria-pressed="' + (u[k] === v) + '">' + esc(l) + '</button>').join('') + '</div>';
    let h = '<h2>' + _t('Методические рекомендации') + '</h2>' +
      '<div class="row" style="margin-bottom:10px;gap:10px;flex-wrap:wrap">' + seg('who', [['both', _t('Обоим')], ['teacher', _t('Учителю')], ['author', _t('Автору')]]) +
      seg('prio', [['all', _t('Все')], ['12', _t('Приоритет 1-2')], ['1', _t('Приоритет 1')]]) +
      (RS.books.length > 1 ? '<select class="inp" id="rcBook"><option value="*">' + _t('Все учебники') + '</option>' + RS.books.map(b => '<option' + (u.book === b ? ' selected' : '') + '>' + esc(b) + '</option>').join('') + '</select>' : '') +
      '<button class="btn" data-rc="copy">' + _t('Копировать') + '</button><button class="btn" data-rc="md">' + _t('Скачать .md') + '</button><button class="btn" data-rc="csv">' + _t('Скачать CSV') + '</button></div>' +
      '<p class="small mute">' + _t('Рекомендации сформированы по правилам из рассчитанных показателей – лексики, грамматики и объёма инструкций, типа упражнений, последовательности урока, трудности текстов. Учителю – как работать с учебником на занятии, автору – что изменить в учебнике. У каждой рекомендации указаны признак, на котором она основана, и источник. Приоритет 1 – признак мешает выполнить задание, 2 – затрудняет выполнение, 3 – справочно. Рекомендации не заменяют суждения методиста – часть признаков найдена эвристически.') + '</p>' +
      '<div class="kpis">' + H.kpi(vis.length, _t('рекомендаций')) + H.kpi(vis.filter(x => x.who === 'teacher').length, _t('учителю')) + H.kpi(vis.filter(x => x.who === 'author').length, _t('автору')) +
      H.kpi(vis.filter(x => x.prio === 1).length, _t('с приоритетом 1')) + H.kpi(RS.lessons.filter(L => L.recs.some(pass) || L.items.some(it => it.recs.some(pass))).length, _t('уроков с рекомендациями')) + '</div>';
    const books = u.book === '*' ? RS.books : [u.book];
    h += '<h2 style="margin-top:26px">' + _t('По учебнику') + '</h2>' + books.map(bookBox).join('');
    h += '<h2 style="margin-top:26px">' + _t('По урокам и упражнениям') + '</h2><p class="small mute">' + _t('Уроки с рекомендацией первого приоритета раскрыты. Клик по номеру упражнения открывает карточку.') + '</p>';
    let lastB = null, body = '';
    RS.lessons.filter(L => u.book === '*' || L.book === u.book).forEach(L => {
      const box = lessonBox(L); if (!box) return;
      if (RS.books.length > 1 && u.book === '*' && L.book !== lastB) { body += '<h3 class="mx-book">' + esc(L.book) + '</h3>'; lastB = L.book; }
      body += box;
    });
    h += body || '<p class="mute">' + _t('Нет рекомендаций при выбранных фильтрах.') + '</p>';
    h += modelPanel();
    h += '<p class="note">' + _t('Протокол – ') + esc(RS.version) + ', ' + esc(RS.resources) + ', ' + VERSION + ', ' + PROMPT_VERSION + '.</p>';
    el.innerHTML = h;
  }

  /* ---------- модель – панель ---------- */
  function lessonsForScope(scope) {
    const u = st().ui;
    let ls = RS.lessons.filter(L => u.book === '*' || L.book === u.book);
    if (scope === 'cur') ls = ls.filter(L => L.key === u.cur);
    if (scope === 'recs') ls = ls.filter(L => L.recs.length || L.items.length);
    if (scope === 'unrated') { const done = new Set(Object.values(st().models).flatMap(m => Object.keys(m.items || {}))); ls = ls.filter(L => (L.recs.length || L.items.length) && !done.has(L.key)); }
    return ls;
  }
  function modelPanel() {
    const u = st().ui;
    const opts = RS.lessons.filter(L => u.book === '*' || L.book === u.book);
    if (!u.cur && opts.length) u.cur = (opts.find(L => L.recs.length || L.items.length) || opts[0]).key;
    const key = H.groqKey ? H.groqKey() : '';
    return '<h2 style="margin-top:30px" id="rcModel">' + _t('Конкретизация языковой моделью') + '</h2>' +
      '<p class="small">' + _t('Модель получает упражнения урока, найденные признаки и рекомендации по правилам и предлагает конкретные варианты – что сделать учителю на занятии (приём и устная инструкция для учащихся) и как изменить учебник автору (новая формулировка инструкции, черновик недостающего упражнения).') + '</p>' +
      '<div class="box"><div class="grid2"><label class="f">' + _t('Урок') + '<select id="rcCur">' + opts.map(L => '<option value="' + esc(L.key) + '"' + (L.key === u.cur ? ' selected' : '') + '>' + esc((RS.books.length > 1 ? L.book + ' · ' : '') + lessonTitle(L)) + '</option>').join('') + '</select></label>' +
      '<label class="f">' + _t('Что отправить') + '<select id="rcScope"><option value="cur"' + (u.scope === 'cur' ? ' selected' : '') + '>' + _t('Текущий урок') + '</option><option value="recs"' + (u.scope === 'recs' ? ' selected' : '') + '>' + _t('Уроки с рекомендациями') + '</option><option value="unrated"' + (u.scope === 'unrated' ? ' selected' : '') + '>' + _t('Без предложений модели') + '</option></select></label></div>' +
      '<h4 class="rc-h">Groq</h4><div class="row"><button class="btn pri" id="rcGroq"' + (busy.on ? ' disabled' : '') + '>' + _t('Отправить в Groq') + '</button><button class="btn" id="rcStop"' + (busy.on ? '' : ' hidden') + '>' + _t('Остановить') + '</button><span class="small mute" id="rcStatus">' + (key ? _t('Ключ Groq и модель берутся из вкладки «Настройки» – ') + esc(H.groqDefaultModel ? H.groqDefaultModel() : '') + '.' : _t('Ключ Groq не задан – введите его во вкладке «Настройки» или используйте ручной способ.')) + '</span></div>' +
      '<h4 class="rc-h">' + _t('Вручную (без Groq)') + '</h4><div class="row"><button class="btn" id="rcPrompt">' + _t('Копировать промпт') + '</button><span class="small mute">' + _t('Вставьте промпт в любой чат с языковой моделью, затем вставьте ответ ниже.') + '</span></div>' +
      '<div class="grid2" style="margin-top:8px"><label class="f">' + _t('Модель и версия') + '<input id="rcName" placeholder="GPT-5, Claude, GigaChat…"></label><label class="f">' + _t('Прогон (необязательно)') + '<input id="rcRun"></label></div>' +
      '<label class="f" style="margin-top:8px">' + _t('Ответ модели (JSON)') + '<textarea id="rcJson" rows="5"></textarea></label><div class="row" style="margin-top:6px"><button class="btn" id="rcImport">' + _t('Импортировать ответ') + '</button>' +
      (Object.keys(st().models).length ? '<select class="inp" id="rcDel"><option value="">' + _t('Удалить предложения модели…') + '</option>' + Object.keys(st().models).map(k => '<option>' + esc(k) + '</option>').join('') + '</select>' : '') + '</div></div>';
  }
  function prompt(list) {
    const rules = R.REC.RULES.map(x => x.id + ' – ' + x.name).join('; ');
    return _t('Ты – эксперт по методике обучения иностранным языкам. Для каждого урока учебника английского языка даны упражнения по порядку, признаки, найденные анализатором учебника, и методические рекомендации, сформированные по правилам ') + R.REC_VERSION + '.\n\n' +
      _t('Конкретизируй рекомендации. Для учителя предложи, что именно сделать на занятии с этим учебником, – приём или дополнительное упражнение на материале урока и устную инструкцию для учащихся на английском языке (поле example). Для автора предложи исправленную формулировку инструкции на английском языке или черновик недостающего упражнения – инструкция и 3-5 пунктов на лексике и грамматике урока (поле draft). Опирайся на отечественную методику – ознакомление, тренировка, применение; языковые, условно-речевые и речевые упражнения; три этапа работы с текстом; речевая ситуация (место, роли, цель общения, информационный разрыв) и опоры. Учитывай заявленный уровень CEFR. Если цель урока не указана, сформулируй её по заголовку и упражнениям (поле aim). Не добавляй новых замечаний, кроме явных методических ошибок, – их отметь полем "extra": true.\n\n') +
      _t('Коды правил – ') + rules + '.\n\n' +
      _t('Пояснения (поле text) пиши на русском языке, инструкции и упражнения (поля example и draft) – на английском.\n\n') +
      _t('Ответ – только JSON-массив без пояснений и без разметки, по схеме\n[{"id": "<id урока>", "aim": "…", "teacher": [{"ex": "3", "rule": "jump", "text": "…", "example": "…"}], "author": [{"ex": "3", "rule": "jump", "text": "…", "draft": "…"}]}]\n\n') +
      _t('Уроки (по одному в строке, JSON)\n') + list.map(lessonJSON).join('\n');
  }
  function lessonJSON(L) {
    const ML = H.MA && H.MA.lessons.find(x => x.key === L.key);
    const ex = ML ? ML.items.map(r => ({ ex: r.rec.ex || undefined, text: r.rec.text, exercise_text: r.rec.exercise_text ? String(r.rec.exercise_text).slice(0, 300) : undefined,
      type: r.method && r.method.type ? (H.UM ? H.UM.typeLabel(r.method) : r.method.type) : undefined, text_stage: r.method && r.method.stage || undefined })) : [];
    const ts = H.T ? H.T.results.filter(t => t.rec.book === L.book && E.CORE.sameUnit(t.rec.unit, L.unit)).map(t => ({ title: t.rec.title || undefined, ex: t.exs.join(', ') || undefined, level_estimate: t.level ? E.lvName(t.level.est) : undefined, text: String(t.rec.text).slice(0, 600) })) : [];
    const level = ML && ML.items[0] ? ML.items[0].targetName : (H.T && H.T.results.find(t => t.rec.book === L.book) || {}).targetName;
    const recs = L.recs.concat(...L.items.map(it => it.recs)).map(x => ({ who: x.who, ex: x.ex || undefined, rule: x.rule, text: x.text }));
    return JSON.stringify({ id: L.key, book: L.book, unit: L.unit, level, aim: L.aim || undefined, exercises: ex, texts: ts.length ? ts : undefined, recommendations: recs });
  }
  function clean(arr) {
    return (Array.isArray(arr) ? arr : []).filter(y => y && (y.text || y.draft || y.example)).slice(0, 20).map(y => ({ ex: y.ex == null ? '' : String(y.ex).replace(/^ex\.?\s*/i, ''), rule: String(y.rule || ''), text: String(y.text || ''), example: String(y.example || ''), draft: String(y.draft || ''), extra: !!y.extra }));
  }
  function ingest(label, meta, arr) {
    const keys = new Set(RS.lessons.map(L => L.key));
    const m = st().models[label] = st().models[label] || Object.assign({ prompt: PROMPT_VERSION, rules: R.REC_VERSION, date: new Date().toISOString(), items: {} }, meta);
    let n = 0, bad = 0;
    (Array.isArray(arr) ? arr : []).forEach(x => {
      if (!x || !keys.has(x.id)) { bad++; return; }
      m.items[x.id] = { aim: String(x.aim || ''), teacher: clean(x.teacher), author: clean(x.author) }; n++;
    });
    return { n, bad };
  }
  async function runGroq() {
    if (busy.on) return;
    const key = H.groqKey(); if (!key) { toast(_t('Введите ключ API Groq во вкладке «Настройки»')); return; }
    const model = H.groqDefaultModel();
    const list = lessonsForScope(st().ui.scope); if (!list.length) { toast(_t('Нечего отправлять')); return; }
    busy.on = true; busy.stop = false; render(); scrollModel();
    const label = model + ' (Groq, ' + new Date().toISOString().slice(0, 10) + ')';
    let done = 0, bad = 0, fail = '';
    const status = t => { const s = $('#rcStatus'); if (s) s.textContent = t; };
    for (let i = 0; i < list.length; i += GROQ_BATCH) {
      if (busy.stop) { fail = _t('Остановлено.'); break; }
      const part = list.slice(i, i + GROQ_BATCH);
      status(_t('Обработано уроков – ') + done + _t(' из ') + list.length + '…');
      let tries = 0;
      while (true) {
        try {
          const arr = H.parseModelJSON(await H.groqCall(key, model, prompt(part)));
          if (!arr) { bad += part.length; break; }
          const r = ingest(label, { model, run: _t('Groq, температура 0, пакет ') + GROQ_BATCH, via: 'Groq API' }, arr);
          done += r.n; bad += Math.max(0, part.length - r.n); save(); break;
        } catch (e) {
          if (e.status === 429 && tries < 2) { tries++; status(_t('Лимит запросов – пауза…')); await new Promise(res => setTimeout(res, Math.max(e.retry || 0, 20) * 1000)); continue; }
          fail = H.groqError(e); break;
        }
      }
      if (fail) break;
    }
    busy.on = false; save(); render(); scrollModel();
    status((fail ? fail + ' ' : '') + _t('Обработано уроков – ') + done + _t(' из ') + list.length + (bad ? _t(', не удалось разобрать ответ для ') + bad : '') + '.');
  }
  function scrollModel() { const m = $('#rcModel'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'start' }); }

  /* ---------- события ---------- */
  function bind() {
    const el = $('#v-rec'); if (!el) return;
    el.addEventListener('click', e => {
      const s = e.target.closest('[data-rcseg] button'); if (s) { st().ui[s.parentElement.dataset.rcseg] = s.dataset.v; save(); render(); return; }
      const o = e.target.closest('[data-open]'); if (o) { e.preventDefault(); H.openInstrCard(o.dataset.open); return; }
      const t = e.target.closest('[data-topen]'); if (t) { e.preventDefault(); H.openTextCard(t.dataset.topen); return; }
      const ch = e.target.closest('.mx-chip[data-id]'); if (ch) { e.preventDefault(); H.openInstrCard(ch.dataset.id); return; }
      const lb = e.target.closest('[data-rcl]'); if (lb) { st().ui.cur = lb.dataset.rcl; st().ui.scope = 'cur'; save(); render(); scrollModel(); return; }
      const b = e.target.closest('[data-rc]');
      if (b) { const k = b.dataset.rc; if (k === 'copy') copy(mdText()); else if (k === 'md') download('recommendations-' + stamp() + '.md', mdText(), 'text/markdown;charset=utf-8'); else download('recommendations-' + stamp() + '.csv', '﻿' + E.toCSV(csvRows()), 'text/csv;charset=utf-8'); return; }
      if (e.target.id === 'rcGroq') runGroq();
      if (e.target.id === 'rcStop') { busy.stop = true; }
      if (e.target.id === 'rcPrompt') { const list = lessonsForScope(st().ui.scope); if (!list.length) { toast(_t('Нечего отправлять')); return; } copy(prompt(list)); }
      if (e.target.id === 'rcImport') {
        const name = ($('#rcName').value || '').trim(); if (!name) { toast(_t('Укажите модель и версию')); $('#rcName').focus(); return; }
        const arr = H.parseModelJSON($('#rcJson').value); if (!arr) { toast(_t('Ответ не читается как JSON-массив')); return; }
        const run = ($('#rcRun').value || '').trim();
        const r = ingest(name + (run ? ' (' + run + ')' : ''), { model: name, run, via: _t('вручную') }, arr);
        save(); render(); toast(_t('Импортировано уроков – ') + r.n + (r.bad ? _t(', пропущено ') + r.bad + _t(' (неизвестный id)') : ''));
      }
    });
    el.addEventListener('change', e => {
      if (e.target.id === 'rcBook') { st().ui.book = e.target.value; save(); render(); }
      if (e.target.id === 'rcCur') { st().ui.cur = e.target.value; save(); }
      if (e.target.id === 'rcScope') { st().ui.scope = e.target.value; save(); }
      if (e.target.id === 'rcDel' && e.target.value) { delete st().models[e.target.value]; save(); render(); toast(_t('Предложения модели удалены')); }
    });
  }

  /* ---------- карточка ---------- */
  function cardBlock(id) {
    if (!RS) return '';
    const it = RS.item(id);
    const L = RS.lessons.find(x => x.items.some(y => y.id === id));
    const lr = L ? L.recs.filter(x => x.item === id) : [];
    const all = lr.concat(it);
    let h = '<h3>' + _t('Методические рекомендации') + '</h3>';
    if (!all.length) h += '<p class="small mute">' + _t('Правила не дали рекомендаций для этого упражнения.') + '</p>';
    else h += '<div class="grid2">' + ['teacher', 'author'].map(w => { const a = all.filter(x => x.who === w); return '<div><h4 class="rc-h">' + (w === 'teacher' ? _t('Учителю') : _t('Автору')) + '</h4>' + (a.length ? '<ul class="issues small">' + a.map(x => li(x, false, true)).join('') + '</ul>' : '<p class="small mute">—</p>') + '</div>'; }).join('') + '</div>';
    if (L) {
      const ex = (it[0] || lr[0] || {}).ex;
      if (ex) h += modelHTML(L.key, ex);
      h += '<p class="small"><a href="#recommendations" data-rcgo="' + esc(L.key) + '">' + _t('Все рекомендации урока') + '</a></p>';
    }
    return h;
  }
  function goLesson(key) { st().ui.cur = key; save(); H.show('rec'); render(); const d = document.querySelector('details[data-lkey="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]'); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } }

  /* ---------- экспорт ---------- */
  function mdText() {
    const u = st().ui;
    const line = x => '- [' + x.prio + '] ' + (u.who === 'both' ? (x.who === 'teacher' ? _t('Учителю') : _t('Автору')) + ' – ' : '') + (x.ex && x.scope !== 'book' ? 'Ex. ' + x.ex + ' – ' : '') + x.text + (x.draft ? '\n  ' + _t('Черновик – ') + x.draft : '') + (x.src ? ' (' + RC.cite(x.src) + ')' : '');
    let t = '# ' + _t('Методические рекомендации') + '\n\n' + _t('Правила ') + RS.resources + ', ' + RS.version + '. ' + _t('Приоритет 1 – мешает выполнить задание, 2 – затрудняет выполнение, 3 – справочно.') + '\n';
    (u.book === '*' ? RS.books : [u.book]).forEach(b => {
      t += '\n## ' + b + '\n';
      const bl = RS.book.filter(x => x.book === b && pass(x));
      if (bl.length) t += '\n### ' + _t('По учебнику') + '\n' + bl.map(line).join('\n') + '\n';
      RS.lessons.filter(L => L.book === b).forEach(L => {
        const arr = L.recs.filter(pass).concat(...L.items.map(it => it.recs.filter(pass)));
        if (!arr.length) return;
        t += '\n### ' + lessonTitle(L) + (L.aim ? ' – ' + L.aim : '') + '\n' + arr.map(line).join('\n') + '\n';
        modelFor(L.key).forEach(m => {
          const rows = (u.who !== 'author' ? m.teacher.map(y => ['teacher', y]) : []).concat(u.who !== 'teacher' ? m.author.map(y => ['author', y]) : []);
          if (rows.length) t += '\n' + _t('Предложения модели ') + m.label + '\n' + rows.map(([w, y]) => '- ' + (w === 'teacher' ? _t('Учителю') : _t('Автору')) + (y.ex ? ' – Ex. ' + y.ex : '') + ' – ' + y.text + (y.example ? '\n  ' + y.example : '') + (y.draft ? '\n  ' + y.draft.replace(/\n/g, '\n  ') : '')).join('\n') + '\n';
        });
      });
    });
    return t;
  }
  function csvRows() {
    return [['id', 'book', 'unit', 'scope', 'who', 'priority', 'rule', 'basis', 'ex', 'item', 'text', 'draft', 'source']]
      .concat(RS.all.filter(pass).map(x => [x.id, x.book, x.unit, x.scope, x.who, x.prio, x.rule, x.basis, x.ex || '', x.item || '', x.text, x.draft || '', RC.cite(x.src)]));
  }
  function exportPart() {
    if (!RS) return null;
    return { version: RS.version, rules: RS.resources, ui: VERSION, prompt: PROMPT_VERSION, stats: RS.stats,
      recommendations: RS.all.map(x => ({ id: x.id, book: x.book, unit: x.unit, scope: x.scope, who: x.who, priority: x.prio, rule: x.rule, basis: x.basis, ex: x.ex || '', item: x.item || null, text: x.text, draft: x.draft || null, source: x.src })),
      models: st().models };
  }

  /* ---------- вкладка «Методика» ---------- */
  function docHTML() {
    const scope = { item: _t('упражнение'), lesson: _t('урок'), book: _t('учебник') };
    return '<h3>' + _t('Методические рекомендации (rec-0.1)') + '</h3><p>' + _t('Модуль рекомендаций переводит найденные признаки в рекомендации двум адресатам. Учителю он подсказывает, как работать с учебником на занятии – что пояснить, какое упражнение добавить, как изменить порядок или речевую установку. Автору он указывает, что изменить в самом учебнике. Е.Н. Соловова называет эти пути прямо – учитель может предложить альтернативное использование заданий учебника, изменив речевую установку, последовательность упражнений или форму общения (Соловова, 2006, с. 63). Те же стратегии – дополнить, сократить, изменить уровень или порядок материала – описывает пособие TKT (Spratt et al., 2011, с. 156-158).') + '</p>' +
      '<p>' + _t('Рекомендации строятся на трёх уровнях. На уровне упражнения правила опираются на критерии инструкции (A1-A4, D1, D3, D4, ИСВ, R6), на тип упражнения и на показатели текста (T1-T3, оценка уровня). На уровне урока – на отметки последовательности (скачок, возврат, нет выхода в речь, этапы работы с текстом). На уровне учебника правила обобщают повторяющиеся признаки и задают приоритеты переработки. Приоритет 1 получает признак, который мешает выполнить задание, 2 – признак, который затрудняет выполнение, 3 – справочное замечание. Языковая модель по желанию конкретизирует рекомендации урока – предлагает приём и устную инструкцию для учителя, новую формулировку инструкции или черновик упражнения для автора (промпт ') + PROMPT_VERSION + ').</p>' +
      '<div class="scroll"><table class="small"><thead><tr><th>' + _t('Правило') + '</th><th>' + _t('Уровень') + '</th><th>' + _t('Признак') + '</th><th>' + _t('Учителю') + '</th><th>' + _t('Автору') + '</th><th>' + _t('Источник') + '</th></tr></thead><tbody>' +
      R.REC.RULES.map(x => '<tr><td><b>' + esc(x.name) + '</b></td><td>' + esc(scope[x.scope]) + '</td><td>' + esc(x.basis === 'SEQ' ? _t('ПСУ') : x.basis === 'MT' ? _t('методика') : _t(x.basis)) + '</td><td>' + esc(x.teacher || '—') + '</td><td>' + esc(x.author || '—') + '</td><td class="mute">' + esc(RC.cite(x.src) || '—') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<h3>' + _t('Источники рекомендаций') + '</h3><ol class="small">' + Object.values(R.REC.SOURCES).map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      '<p class="note">' + _t('Модуль ') + RC.VERSION + _t(', эталоны ') + R.REC_VERSION + _t(', интерфейс модуля ') + VERSION + _t(', промпт ') + PROMPT_VERSION + '.</p>';
  }

  bind();
  return { VERSION, PROMPT_VERSION, compute, get, render, cardBlock, goLesson, exportPart, docHTML, mdText, csvRows, prompt };
};
