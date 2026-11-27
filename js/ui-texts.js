/* Интерфейс режима «Тексты». Входит в ui-0.6.
   Вкладки те же, что в режиме «Инструкции». Общие элементы (ячейки тепловой карты, карточка,
   подсказки, рубрика, Groq) приходят из ui.js через объект H. */
window.IA_UI_TEXTS = function (H) {
  const _t = window._t || (s => s);
  const codeLab = (c, lab, sep) => _t(c) === lab ? '<b>' + lab + '</b>' : '<b>' + _t(c) + '</b>' + sep + lab;
  const { $, esc, f2, E, R, X, C, LEVELS, HEAT, store, save, toast, copy, download, stamp, readFile, show, kpi, sel, cellHTML, legend } = H;
  const TS = () => store.texts;
  const TCOL = [['T1', _t('Лексика')], ['T2', _t('Грамм.')], ['T3', _t('Синтакс.')], ['T4', _t('Читаем.')], ['IST', _t('ИСТ')]];
  const RSHORT_T = { TR1: _t('Тема'), TR2: _t('Аутент.'), TR3: _t('Культура'), TR4: _t('Связн.'), TR5: _t('Уровень'), TR6: _t('Аспект') };
  const RUBT = R.TEXT_RUBRIC.map(x => [x.code, RSHORT_T[x.code] || x.name]);
  const pct1 = x => x == null ? '—' : E.fmt(x * 100, 1) + ' %';
  const lvTxt = n => n == null ? '—' : E.lvName(n);
  const words = t => (String(t || '').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
  const heatK = v => v > 0 ? Math.min(4, Math.floor(v * 5 - 1e-9)) : -1;
  const NOUN = [_t('текст'), _t('текста'), _t('текстов')];

  /* ---------- ячейки ---------- */
  function levelCell(est, target, title, id, extra) {
    if (est == null) return '<button class="lvcell nodata" title="' + esc(title + _t(' – нет данных')) + '" data-id="' + esc(id || '') + '"' + (extra || '') + '>—</button>';
    const d = est - target; let style = '', cls = 'lvcell';
    if (d > 0) { const k = heatK(Math.min(1, d / 2)); style = 'background:' + HEAT[k]; if (k >= 3) cls += ' dark'; }
    return '<button class="' + cls + '" style="' + style + '" title="' + esc(title + ' – ' + E.lvName(est) + (target != null ? _t(' при заявленном ') + E.lvName(target) : '')) + '" data-id="' + esc(id || '') + '"' + (extra || '') + '>' + E.lvName(est) + '</button>';
  }
  function plainLv(n, title) { return '<span class="lvcell" style="box-shadow:none;background:none" title="' + esc(title || '') + '">' + lvTxt(n) + '</span>'; }
  function deltaCell(v, title, extra) {
    if (v == null) return cellHTML(null, title, '', extra);
    if (v > 0) return cellHTML(Math.min(1, v), title, '', extra);
    return '<button class="cell neg" title="' + esc(title + ' – ' + E.fmt(v, 2)) + '"' + (extra || '') + '>' + (store.texts.ui.vals ? E.fmt(v, 2) : '') + '</button>';
  }

  /* ---------- строка состояния ---------- */
  function corpusLine() {
    const T = H.T;
    if (!T) return _t('Нет текстов – загрузите тексты во вкладке «Данные»');
    const st = T.stats, P = H.P;
    return st.n + ' ' + E.plural(st.n, NOUN) + ' · ' + st.wordsTotal + ' ' + E.plural(st.wordsTotal, [_t('слово'), _t('слова'), _t('слов')]) + ' · ' + st.books.length + ' ' + E.plural(st.books.length, [_t('учебник'), _t('учебника'), _t('учебников')]) + _t(' · уровень ') + Object.keys(st.levels).join(', ') + _t(' · пар с инструкциями ') + P.length + (P.length ? _t(', инструкция сложнее текста – ') + P.filter(p => p.harder).length : '') + _t(' · список лексики ') + T.meta.lexicon;
  }

  /* ---------- данные ---------- */
  function renderData() {
    const el = $('#dataTexts'), t = TS(), f = t.form, T = H.T;
    const books = [...new Set(t.items.map(x => x.book).concat(H.A ? H.A.stats.books : []).filter(Boolean))];
    const input = (k, lab, ph, list) => '<label class="f">' + lab + '<input data-tf="' + k + '" value="' + esc(f[k] || '') + '" placeholder="' + esc(ph || '') + '"' + (list ? ' list="' + list + '"' : '') + '></label>';
    let h = _t('<h2>Тексты для анализа</h2><p class="mute">Тексты для чтения, скрипты аудирования, диалоги и языковой материал упражнений. Текст связывается с инструкцией через поле «Упражнения» – номера упражнений того же учебника и урока, к которым он относится.</p>');
    h += '<div class="row" style="margin-bottom:12px"><div class="seg" id="tInMode"><button aria-pressed="' + (t.inMode !== 'csv') + _t('" data-m="form">Ввести текст</button><button aria-pressed="') + (t.inMode === 'csv') + _t('" data-m="csv">Таблица CSV</button></div><button class="btn" id="tSample">Загрузить пример текстов</button><button class="btn" id="tClearAll">Удалить все тексты</button></div>');
    if (t.inMode !== 'csv') {
      h += '<div class="grid2" style="margin-bottom:12px">' + input('book', _t('Учебник'), _t('Название, издательство, год'), 'tBooks') + '<datalist id="tBooks">' + books.map(b => '<option value="' + esc(b) + '">').join('') + '</datalist>' +
        _t('<label class="f">Заявленный уровень<select data-tf="level">') + LEVELS.map(l => '<option' + (l === f.level ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
        input('unit', _t('Урок'), 'Unit 2') + input('ex', _t('Упражнения, к которым относится текст'), '1, 2') +
        _t('<label class="f">Тип текста<select data-tf="text_type">') + R.TEXT_TYPES.map(x => '<option value="' + x.id + '"' + (x.id === f.text_type ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' +
        input('title', _t('Заголовок (необязательно)'), 'The History of the Bicycle') + input('source', _t('Источник (необязательно)'), _t('аутентичный, адаптированный, составлен автором'), 'tSrc') + _t('<datalist id="tSrc"><option value="аутентичный"><option value="адаптированный"><option value="составлен автором"></datalist></div>') +
        _t('<textarea data-tf="text" class="form-text" rows="12" placeholder="Текст целиком. Абзацы разделяются пустой строкой, реплики диалога – с новой строки (A: …, Tom: …).">') + esc(f.text || '') + '</textarea>' +
        _t('<p class="note">Имена говорящих с двоеточием в начале реплики, пропуски ___ и номера пропусков в расчёт не входят. Имена собственные считаются известными словами.</p>') +
        '<div class="row" style="margin-top:10px"><button class="btn pri" id="tAdd">' + (t.edit >= 0 ? _t('Сохранить изменения') : _t('Добавить текст')) + '</button>' + (t.edit >= 0 ? _t('<button class="btn" id="tCancel">Отмена</button>') : '') +
        _t('<label class="btn" style="cursor:pointer">Загрузить файл – TXT, DOCX, PDF, HTML<input type="file" id="tFiles" accept=".txt,.docx,.pdf,.html,.htm,text/plain,text/html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden></label><span class="small mute">Каждый файл – отдельный текст с полями из формы, заголовок берётся из первой строки или имени файла. Из PDF и веб-страницы берётся весь текст файла – лишнее (заголовки упражнений, колонтитулы) удалите в поле после загрузки через «Изменить».</span></div>');
    } else {
      h += '<div class="row" style="margin-bottom:8px"><input type="file" id="tCsvFile" accept=".csv,.tsv,.txt" class="inp"></div><textarea id="tCsv" rows="10" placeholder="book;level;unit;ex;text_type;title;source;text">' + esc(t.csv || '') + '</textarea>' +
        _t('<p class="note">Поля – book, level, unit, ex, text_type, title, source, text (допустимы русские названия – учебник, уровень, урок, упражнения, тип текста, заголовок, источник, текст). Текст с переносами строк заключается в кавычки. Тип текста – reading, listening, dialogue, material или русское название.</p>') +
        _t('<div class="row" style="margin-top:8px"><button class="btn pri" id="tCsvAdd">Добавить из CSV</button><button class="btn" id="tCsvReplace">Заменить все тексты</button></div>');
    }
    h += _t('<div class="row" style="margin:18px 0 8px"><button class="btn pri" id="tRun">Анализировать</button><span class="small mute">') + (T ? _t('Проанализировано ') + T.results.length + ' ' + E.plural(T.results.length, NOUN) : '') + '</span></div>';
    h += _t('<h3>Загруженные тексты (') + t.items.length + ')</h3>';
    if (t.items.length) {
      const byIdx = {}; (T ? T.results : []).forEach(r => { byIdx[r.rec._idx] = r; });
      h += _t('<div class="scroll"><table class="tight"><thead><tr><th>Учебник</th><th>Ур.</th><th>Урок</th><th>Упр.</th><th>Тип</th><th>Заголовок</th><th class="n">Слов</th><th class="n">Инструкций</th><th></th></tr></thead><tbody>') +
        t.items.map((x, i) => { const r = byIdx[i]; const np = r ? H.P.filter(p => p.text.id === r.id).length : 0; return '<tr' + (i === t.edit ? ' style="background:var(--teal2)"' : '') + '><td>' + esc(x.book) + '</td><td>' + esc(x.level || '—') + '</td><td>' + esc(x.unit || '') + '</td><td>' + esc(x.ex || '') + '</td><td class="small">' + esc(X.typeName(X.textType(x.text_type))) + '</td><td class="serif">' + (r ? '<a href="#" data-topen="' + r.id + '">' + esc(x.title || x.text.slice(0, 50) + '…') + '</a>' : esc(x.title || '')) + '</td><td class="n">' + words(x.text) + '</td><td class="n">' + (np || (x.ex ? '0' : '—')) + '</td><td style="white-space:nowrap"><button class="btn sm" data-tedit="' + i + _t('">Изменить</button> <button class="btn sm" data-tdel="') + i + _t('">Удалить</button></td></tr>'); }).join('') + '</tbody></table></div>' +
        _t('<p class="note">«Инструкций» – число загруженных инструкций, связанных с текстом. Ноль означает, что в данных нет инструкции с таким учебником, уроком и номером упражнения.</p>');
    } else h += _t('<p class="mute">Пока нет.</p>');
    el.innerHTML = h;
  }
  function recFromForm() {
    const f = TS().form;
    return { book: (f.book || '').trim() || _t('Без названия'), level: f.level, unit: (f.unit || '').trim(), ex: (f.ex || '').trim(), text_type: f.text_type, title: (f.title || '').trim(), source: (f.source || '').trim(), text: X.cleanText(f.text) };
  }
  const dEl = $('#dataTexts');
  dEl.addEventListener('input', e => { const k = e.target.dataset.tf; if (k) { TS().form[k] = e.target.value; save(); } if (e.target.id === 'tCsv') { TS().csv = e.target.value; save(); } });
  dEl.addEventListener('change', e => {
    const t = e.target, S = TS();
    if (t.dataset.tf) { S.form[t.dataset.tf] = t.value; save(); }
    if (t.id === 'tCsvFile') readFile(t.files[0], txt => { S.csv = txt; save(); renderData(); toast(_t('Файл прочитан – нажмите «Добавить из CSV»')); });
    if (t.id === 'tFiles') loadFiles([...t.files]);
  });
  async function loadFiles(files) {
    let n = 0, skip = [];
    for (const f of files) {
      try {
        let txt = '';
        if (/\.docx$/i.test(f.name)) txt = (await window.IA_DOCX.readDocx(await f.arrayBuffer())).text;
        else if (/\.(txt|text|md)$/i.test(f.name) || f.type === 'text/plain') txt = await f.text();
        else if (/\.(pdf|html?)$/i.test(f.name) && window.IA_IMPORT) {
          toast(_t('Читаю «') + f.name + _t('»…'));
          const src = await window.IA_IMPORT.readFile(f);
          if (src.scanned) { skip.push(f.name + _t(' (скан без текстового слоя)')); continue; }
          txt = window.IA_IMPORT.plain(src);
        }
        else { skip.push(f.name); continue; }
        const sp = window.IA_DOCX.splitTitle(txt);
        if (!sp.text.trim()) { skip.push(f.name); continue; }
        const rec = recFromForm(); rec.title = sp.title || f.name.replace(/\.\w+$/, ''); rec.text = X.cleanText(sp.text);
        TS().items.push(rec); n++;
      } catch (err) { skip.push(f.name + ' (' + err.message + ')'); }
    }
    save(); H.run(true);
    toast(_t('Добавлено ') + n + ' ' + E.plural(n, NOUN) + (skip.length ? _t(', пропущено – ') + skip.join(', ') : ''));
  }
  dEl.addEventListener('click', e => {
    const b = e.target.closest('button,a'); if (!b) return; const S = TS();
    if (b.closest('#tInMode') && b.dataset.m) { S.inMode = b.dataset.m; save(); renderData(); return; }
    if (b.id === 'tAdd') {
      const rec = recFromForm(); if (!rec.text) { toast(_t('Вставьте текст')); return; }
      if (S.edit >= 0 && S.items[S.edit]) S.items[S.edit] = rec; else S.items.push(rec);
      S.edit = -1; S.form.text = ''; S.form.title = ''; save(); H.run(true); toast(_t('Текст сохранён')); return;
    }
    if (b.id === 'tCancel') { S.edit = -1; S.form.text = ''; S.form.title = ''; save(); renderData(); return; }
    if (b.dataset.tedit != null) { const x = S.items[+b.dataset.tedit]; if (!x) return; S.edit = +b.dataset.tedit; S.inMode = 'form'; Object.assign(S.form, { book: x.book || '', level: LEVELS.includes(x.level) ? x.level : S.form.level, unit: x.unit || '', ex: x.ex || '', text_type: X.textType(x.text_type) || 'reading', title: x.title || '', source: x.source || '', text: x.text || '' }); save(); renderData(); dEl.scrollIntoView({ block: 'start' }); return; }
    if (b.dataset.tdel != null) { S.items.splice(+b.dataset.tdel, 1); if (S.edit === +b.dataset.tdel) S.edit = -1; save(); H.run(true); return; }
    if (b.dataset.topen) { e.preventDefault(); openCard(b.dataset.topen); return; }
    if (b.id === 'tCsvAdd' || b.id === 'tCsvReplace') {
      const recs = X.recordsFromCSV(($('#tCsv') || {}).value || S.csv).map(r => Object.assign(r, { text: X.cleanText(r.text) }));
      if (!recs.length) { toast(_t('В CSV не найдено ни одного текста – проверьте заголовки и кавычки')); return; }
      S.items = b.id === 'tCsvReplace' ? recs : S.items.concat(recs); save(); H.run(true); toast(_t('Добавлено ') + recs.length + ' ' + E.plural(recs.length, NOUN)); return;
    }
    if (b.id === 'tSample') { S.items = X.recordsFromCSV(window.IA_SAMPLE.texts); S.edit = -1; save(); H.run(true); toast(_t('Загружен пример – ') + S.items.length + ' ' + E.plural(S.items.length, NOUN)); return; }
    if (b.id === 'tClearAll') {
      if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = _t('Нажмите ещё раз, чтобы удалить все'); setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = _t('Удалить все тексты'); } }, 3000); return; }
      S.items = []; S.edit = -1; save(); H.run(true); return;
    }
    if (b.id === 'tRun') { save(); H.run(); if (H.T) show('map'); }
  });

  /* ---------- тепловая карта ---------- */
  function renderMap() {
    const el = $('#v-map'), T = H.T, K = H.rcfg('texts'), u = K.ui;
    if (!T) { el.innerHTML = _t('<div class="empty">Загрузите тексты во вкладке «Данные» или нажмите «Загрузить пример текстов».<div style="margin-top:14px"><button class="btn pri" data-tact="sample">Загрузить пример текстов</button></div></div>'); return; }
    const st = T.stats, P = H.P, S = T.settings;
    const ex = Object.keys(K.slot.experts), md = Object.keys(K.slot.models);
    if (!u.expert && ex.length) u.expert = ex[0];
    if (!u.model && md.length) u.model = md[0];
    if (u.book !== '*' && !st.books.includes(u.book)) u.book = '*';
    const srcBtn = (k, t, dis) => '<button aria-pressed="' + (u.source === k) + '" data-tsrc="' + k + '"' + (dis ? _t(' disabled title="Нет оценок"') : '') + '>' + t + '</button>';
    let h = '<div class="kpis">' + kpi(st.n, _t('текстов')) + kpi(f2(st.crit.IST.mean), _t('средний ИСТ')) + kpi(st.crit.IST.problem, _t('достигают порога ') + E.fmt(S.problemIST, 2)) + kpi(pct1(st.counts.known.mean), _t('покрытие лексикой уровня в среднем')) + kpi(E.fmt(st.counts.words.mean, 0), _t('слов в тексте в среднем')) + kpi(P.length ? P.filter(p => p.harder).length + _t(' из ') + P.length : '—', _t('пар, где инструкция сложнее текста')) + '</div>';
    h += '<div class="mapbar"><div class="seg">' + [['texts', _t('Тексты')], ['units', _t('Уроки')], ['pairs', _t('Пары с инструкциями')]].map(([k, t]) => '<button aria-pressed="' + (u.view === k) + '" data-tview="' + k + '">' + t + '</button>').join('') + '</div>' +
      (u.view === 'texts' ? '<div class="seg">' + srcBtn('algo', _t('Алгоритм')) + srcBtn('expert', _t('Эксперт'), !ex.length) + srcBtn('model', _t('Модель'), !md.length) + srcBtn('diff', _t('Расхождение'), !ex.length || !md.length) + '</div>' + (u.source === 'expert' || u.source === 'diff' ? sel('tmapExpert', ex, u.expert) : '') + (u.source === 'model' || u.source === 'diff' ? sel('tmapModel', md, u.model) : '') : '') +
      (st.books.length > 1 ? sel('tmapBook', ['*'].concat(st.books), u.book, { '*': _t('Все учебники') }) : '') +
      '<label class="chk"><input type="checkbox" id="tmapVals"' + (u.vals ? ' checked' : '') + _t('> значения в ячейках</label>') + legend() + '</div>';
    if (u.view === 'units') h += unitsTable(u);
    else if (u.view === 'pairs') h += pairsTable(u);
    else h += textsTable(u, K);
    el.innerHTML = h;
  }
  const t4ref = () => !(H.T && H.T.settings.weights.T4 > 0);
  function colHead(c) { const d = R.TEXT_CRITERIA[c[0]] || R.TEXT_RUBRIC.find(x => x.code === c[0]) || {}; const ref = c[0] === 'T4' && t4ref(); return '<th class="n" title="' + esc((d.long || d.name || c[1]) + (ref ? _t(' – справочно, вес 0, в ИСТ не входит') : '')) + '"' + (ref ? ' style="opacity:.6"' : '') + '>' + codeLab(c[0], c[1], '<br>') + (ref ? '*' : '') + '</th>'; }
  const t4note = () => t4ref() ? _t(' * T4 приведён справочно и в ИСТ не входит (вес 0, меняется в настройках).') : '';
  function textsTable(u, K) {
    const T = H.T; const showRub = u.source !== 'algo';
    const cols = TCOL.concat([['LV', _t('Оценка')]]).concat(showRub ? [['|']].concat(RUBT) : []);
    let h = '<div class="scroll"><table class="heat"><thead><tr><th></th><th class="cg" colspan="' + (TCOL.length + 1) + _t('">Алгоритмические показатели</th>') + (showRub ? '<th></th><th class="cg" colspan="' + RUBT.length + _t('">Рубрика – ') + esc({ expert: _t('эксперт ') + u.expert, model: _t('модель ') + u.model, diff: _t('расхождение эксперта и модели') }[u.source]) + '</th>' : '') + _t('</tr><tr><th>Текст</th>') +
      cols.map(c => c[0] === '|' ? '<th></th>' : c[0] === 'LV' ? _t('<th class="n" title="Оценка уровня текста по формуле L"><b>L</b><br>Уровень</th>') : colHead(c)).join('') + '</tr></thead><tbody>';
    let lastB = null, lastU = null;
    T.results.filter(r => u.book === '*' || r.rec.book === u.book).forEach(r => {
      if (r.rec.book !== lastB) { h += '<tr class="bk"><td colspan="' + (cols.length + 1) + '">' + esc(r.rec.book) + '</td></tr>'; lastB = r.rec.book; lastU = null; }
      if (r.rec.unit !== lastU) { h += '<tr class="un"><td colspan="' + (cols.length + 1) + '">' + esc(r.rec.unit || _t('Без урока')) + '</td></tr>'; lastU = r.rec.unit; }
      h += '<tr><td class="lab" data-id="' + r.id + '"><div class="t">' + esc(r.rec.title || r.rec.text.slice(0, 90)) + '</div><div class="m">' + esc([r.exs.length ? 'Ex. ' + r.exs.join(', ') : _t('без упражнения'), r.typeName, r.targetName, r.counts.words + _t(' сл.')].join(' · ')) + '</div></td>' +
        cols.map(c => c[0] === '|' ? '<td class="sep"></td>' : c[0] === 'LV' ? '<td>' + levelCell(r.level.est, r.target, _t('Оценка уровня'), r.id) + '</td>' : '<td>' + cellHTML(R.TEXT_CRITERIA[c[0]] ? r.scores[c[0]] : H.rubricVal(K, r.id, c[0]), c[0] + ' ' + c[1], r.id) + '</td>').join('') + '</tr>';
    });
    return h + _t('</tbody></table></div><p class="note">Цвет показывает выраженность трудности от 0 до 1. Столбец L – оценка уровня текста, цвет – насколько она выше заявленного уровня (половина уровня – светлый тон, два уровня и больше – насыщенный). Рубричные баллы 2-1-0 переведены в 0, 0,5 и 1. Клик по строке открывает карточку текста с картой по абзацам.') + t4note() + '</p>';
  }
  function unitsTable(u) {
    const rows = H.U.filter(x => (u.book === '*' || x.book === u.book) && (x.T.length || x.I.length));
    let h = '<div class="scroll"><table class="heat"><thead><tr><th></th><th class="cg" colspan="' + (TCOL.length + 1) + _t('">Тексты урока (средние)</th><th></th><th class="cg" colspan="3">Инструкции и тексты</th></tr><tr><th>Урок</th>') + TCOL.map(colHead).join('') + _t('<th class="n"><b>L</b><br>Уровень</th><th></th><th class="n" title="Средний индекс сложности восприятия инструкций урока"><b>ИСВ</b><br>Инстр.</th><th class="n" title="ИСВ − ИСТ, положительное значение – инструкции сложнее текстов"><b>Δ</b><br>ИСВ − ИСТ</th><th class="n" title="Среднее превышение инструкции над текстом по парам урока"><b>R6</b><br>Пары</th></tr></thead><tbody>');
    let lastB = null;
    rows.forEach(x => {
      if (x.book !== lastB) { h += '<tr class="bk"><td colspan="' + (TCOL.length + 6) + '">' + esc(x.book) + '</td></tr>'; lastB = x.book; }
      const mean = c => { const d = E.describe(x.T.map(r => r.scores[c])); return d.n ? d.mean : null; };
      const tgt = x.T.length ? x.T[0].target : x.I.length ? x.I[0].target : null;
      const first = x.T[0];
      h += '<tr><td class="lab"' + (first ? ' data-id="' + first.id + '"' : '') + '><div class="t">' + esc(x.label) + '</div><div class="m">' + x.T.length + ' ' + E.plural(x.T.length, NOUN) + ', ' + x.I.length + ' ' + E.plural(x.I.length, [_t('инструкция'), _t('инструкции'), _t('инструкций')]) + (x.P.length ? _t(', пар ') + x.P.length + (x.harder ? _t(', инструкция сложнее – ') + x.harder : '') : '') + '</div></td>' +
        TCOL.map(c => '<td>' + cellHTML(mean(c[0]), c[0] + _t(' – среднее по урокам'), '') + '</td>').join('') + '<td>' + levelCell(x.tEst == null ? null : Math.round(x.tEst * 2) / 2, tgt, _t('Средняя оценка уровня текстов')) + '</td><td class="sep"></td>' +
        '<td>' + cellHTML(x.isv, _t('ИСВ инструкций – среднее'), '') + '</td><td>' + deltaCell(x.delta, _t('ИСВ − ИСТ')) + '</td><td>' + cellHTML(x.P.length ? x.pmean : null, _t('Превышение инструкции над текстом – среднее по парам'), '') + '</td></tr>';
    });
    return h + _t('</tbody></table></div><p class="note">Сводная карта урока – слева средние показатели текстов, справа средний индекс сложности восприятия инструкций того же урока, их разность и среднее превышение инструкции над своим текстом (поддержка критерия R6). Оба индекса показывают превышение заявленного уровня по шкале 0-1. Положительная разность значит, что инструкции урока в среднем сложнее текстов.') + t4note() + '</p>';
  }
  function pairsTable(u) {
    const ps = H.P.filter(p => u.book === '*' || p.text.rec.book === u.book);
    if (!ps.length) return _t('<p class="empty">Пар нет. Пара возникает, когда у текста заполнено поле «Упражнения», а среди загруженных инструкций есть упражнение с тем же учебником, уроком и номером.</p>');
    let h = _t('<div class="scroll"><table class="heat"><thead><tr><th>Инструкция и текст</th><th class="cg" colspan="2">Лексика</th><th class="cg" colspan="2">Грамматика</th><th class="cg" colspan="3">Индексы</th><th></th></tr><tr><th></th><th class="n">Инстр.</th><th class="n">Текст</th><th class="n">Инстр.</th><th class="n">Текст</th><th class="n"><b>ИСВ</b></th><th class="n"><b>ИСТ</b></th><th class="n"><b>Δ</b></th><th class="n" title="Превышение инструкции над текстом и над заявленным уровнем"><b>R6</b></th></tr></thead><tbody>');
    let lastB = null, lastU = null;
    ps.forEach(p => {
      const i = p.instr, t = p.text;
      if (t.rec.book !== lastB) { h += '<tr class="bk"><td colspan="9">' + esc(t.rec.book) + '</td></tr>'; lastB = t.rec.book; lastU = null; }
      if (t.rec.unit !== lastU) { h += '<tr class="un"><td colspan="9">' + esc(t.rec.unit || _t('Без урока')) + '</td></tr>'; lastU = t.rec.unit; }
      const ia = ' data-iid="' + i.id + '"';
      h += '<tr><td class="lab"' + ia + '><div class="t">Ex. ' + esc(i.rec.ex) + ' – ' + esc(i.rec.text) + _t('</div><div class="m">текст «') + esc(t.rec.title || _t('без заголовка')) + _t('», ') + esc(t.typeName) + ', ' + i.targetName + '</div></td>' +
        '<td>' + levelCell(p.iLex, i.target, _t('Лексика инструкции'), '', ia) + '</td><td>' + plainLv(p.tLex, _t('Лексика текста')) + '</td><td>' + levelCell(p.iGr || 1, i.target, _t('Грамматика инструкции'), '', ia) + '</td><td>' + plainLv(p.tGr || 1, _t('Грамматика текста')) + '</td>' +
        '<td>' + cellHTML(i.scores.ISV, _t('ИСВ инструкции'), '', ia) + '</td><td>' + cellHTML(t.scores.IST, _t('ИСТ текста'), '', ia) + '</td><td>' + deltaCell(p.dIdx, _t('ИСВ − ИСТ'), ia) + '</td><td>' + cellHTML(p.P, _t('R6 – превышение инструкции над текстом'), '', ia) + '</td></tr>';
    });
    return h + _t('</tbody></table></div><p class="note">Уровни лексики и грамматики считаются одной формулой для инструкции и текста – порог покрытия ') + H.T.settings.covLevel + _t(' % и уровень, которому принадлежат 90 % найденных конструкций. Если конструкций не найдено, принимается уровень A1. Столбец R6 – часть превышения инструкции над текстом, которая выходит и за заявленный уровень (0,5 – на один уровень, 1 – на два и больше). Цвет уровня инструкции показывает превышение заявленного уровня. Клик по строке открывает карточку инструкции.</p>');
  }
  const mEl = $('#v-map');
  mEl.addEventListener('click', e => {
    if (store.mode !== 'texts') return;
    const u = TS().ui;
    const s = e.target.closest('[data-tsrc]'); if (s && !s.disabled) { u.source = s.dataset.tsrc; save(); renderMap(); return; }
    const v = e.target.closest('[data-tview]'); if (v) { u.view = v.dataset.tview; save(); renderMap(); return; }
    if (e.target.closest('[data-tact=sample]')) { TS().items = X.recordsFromCSV(window.IA_SAMPLE.texts); save(); H.run(); return; }
    const ii = e.target.closest('[data-iid]'); if (ii) { H.openInstrCard(ii.dataset.iid); return; }
    const t = e.target.closest('[data-id]'); if (t && t.dataset.id) openCard(t.dataset.id);
  });
  mEl.addEventListener('change', e => {
    if (store.mode !== 'texts') return;
    const u = TS().ui, t = e.target;
    if (t.id === 'tmapVals') u.vals = t.checked;
    if (t.id === 'tmapExpert') u.expert = t.value;
    if (t.id === 'tmapModel') u.model = t.value;
    if (t.id === 'tmapBook') u.book = t.value;
    save(); renderMap();
  });

  /* ---------- карточка текста ---------- */
  function textCloseup(r) {
    const text = r.rec.text, N = text.length;
    const lx = new Array(N).fill(-1), gr = new Array(N).fill(-1), sp = new Array(N).fill(false);
    r.units.forEach((u, ui) => { const a = r.toks[u.tok[0]], b = r.toks[u.tok[u.tok.length - 1]]; for (let i = a.start; i < b.end; i++) lx[i] = ui; });
    r.grammar.slice().sort((a, b) => (b.tier || 0) - (a.tier || 0)).forEach(h => { const gi = r.grammar.indexOf(h); for (let i = h.start; i < h.end; i++) if (gr[i] < 0) gr[i] = gi; });
    r.speakers.forEach(s => { for (let i = s.start; i < s.end; i++) sp[i] = true; });
    const seg = (a, b) => {
      let out = '', i = a;
      while (i < b) {
        let j = i + 1; while (j < b && lx[j] === lx[i] && gr[j] === gr[i] && sp[j] === sp[i] && text[j] !== '\n') j++;
        if (text[i] === '\n') { out += '<br>'; i++; continue; }
        const s = esc(text.slice(i, j)); const u = lx[i] >= 0 ? r.units[lx[i]] : null; const g = gr[i] >= 0 ? r.grammar[gr[i]] : null;
        const cls = [];
        if (sp[i]) cls.push('spk');
        if (u) { if (u.tier && !u.intro) cls.push(u.tier === 2 ? 'lx2' : 'lx1'); else if (u.tier && u.intro) cls.push('lxi'); if (u.unknown) cls.push('unk'); }
        if (g && g.tier) cls.push('gr');
        out += cls.length || u || g ? '<span class="' + cls.join(' ') + '"' + (u ? ' data-u="' + lx[i] + '"' : '') + (g ? ' data-g="' + gr[i] + '"' : '') + '>' + s + '</span>' : s;
        i = j;
      }
      return out;
    };
    return '<div class="paras">' + r.paras.map(p => { const v = p.scores.IST, k = heatK(v); return '<div class="para" style="border-left-color:' + (k >= 0 ? HEAT[k] : 'var(--line)') + _t('" title="Абзац ') + p.n + _t(' – ИСТ ') + E.fmt(v, 2) + '"><span class="pn">¶' + p.n + ' · ' + E.fmt(v, 2) + '</span>' + seg(p.start, p.end) + '</div>'; }).join('') + '</div>';
  }
  function bars(r) {
    const desc = {
      T1: _t('покрытие ') + pct1(r.prof.known) + _t(', выше уровня ') + r.counts.above + _t(' ед.'),
      T2: E.fmt(r.counts.g100, 1) + _t(' взвеш. конструкций выше уровня на 100 слов (всех конструкций ') + E.fmt(r.counts.gAll100, 1) + ')',
      T3: E.fmt(r.counts.wps, 1) + _t(' сл./предл. при норме ') + E.fmt(r.norm.wps, 0) + ', ' + E.fmt(r.counts.sub, 2) + _t(' придат./предл. при норме ') + E.fmt(r.norm.sub, 2),
      T4: _t('Флеш-Кинкейд ') + E.fmt(r.fk, 1) + _t(' при норме ') + E.fmt(r.norm.fk, 1) + (H.T.settings.weights.T4 > 0 ? '' : _t(', в ИСТ не входит')),
      IST: _t('взвешенное среднее T1-T4')
    };
    return '<div class="bars">' + TCOL.map(([c]) => {
      const v = r.scores[c], k = heatK(v);
      return '<span title="' + esc(desc[c]) + '">' + codeLab(c, esc(R.TEXT_CRITERIA[c].name), ' ') + '</span><div><div class="bar' + (v == null ? ' na' : '') + '">' + (v != null ? '<i style="width:' + Math.max(v * 100, 0) + '%;background:' + (k >= 0 ? HEAT[k] : 'transparent') + '"></i>' : '') + '</div><div class="small mute">' + esc(desc[c]) + '</div></div><span class="n">' + (v == null ? '—' : E.fmt(v, 2)) + '</span>';
    }).join('') + '</div>';
  }
  function profileBlock(r, S) {
    const p = r.prof; if (!p.tokens) return '';
    const L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const cols = { A1: '#ffffff', A2: HEAT[0], B1: HEAT[1], B2: HEAT[2], C1: HEAT[3], C2: HEAT[4] };
    let h = '<div class="sbar">' + (p.names ? _t('<i title="имена – ') + p.names + '" style="width:' + (p.names / p.tokens * 100) + '%;background:#e3f0f0"></i>' : '') + L.map(k => p.byLevel[k] ? '<i title="' + k + ' – ' + p.byLevel[k] + '" style="width:' + (p.byLevel[k] / p.tokens * 100) + '%;background:' + cols[k] + '"></i>' : '').join('') + '</div>';
    h += _t('<div class="legend" style="margin-top:6px"><span><i style="background:#e3f0f0"></i> имена ') + p.names + '</span>' + L.map(k => '<span><i style="background:' + cols[k] + '"></i> ' + k + ' ' + p.byLevel[k] + '</span>').join('') + '</div>';
    h += '<div class="covbar">' + L.map(k => { const v = p.cumulative[k]; const ok98 = v >= S.covHi / 100, ok95 = v >= S.covLo / 100; return '<div style="background:' + (ok98 ? 'var(--teal2)' : ok95 ? '#fff' : HEAT[0]) + _t('" title="Покрытие словами уровня ') + k + _t(' и ниже">≤ ') + k + '<br><b>' + pct1(v) + '</b></div>'; }).join('') + '</div>';
    h += _t('<p class="small mute" style="margin-top:6px">Накопленное покрытие – доля словоупотреблений уровня не выше указанного (имена считаются известными). Бирюзовый фон – порог ') + S.covHi + _t(' % достигнут, белый – достигнут порог ') + S.covLo + _t(' %. Покрытие с учётом A7 для уровня ') + r.targetName + ' – ' + pct1(p.known) + (p.introduced ? _t(', из них ') + p.introduced + ' ' + E.plural(p.introduced, [_t('словоупотребление'), _t('словоупотребления'), _t('словоупотреблений')]) + _t(' снято по A7') : '') + '.</p>';
    return h;
  }
  function openCard(id, keep) {
    const T = H.T, r = T && T.results.find(x => x.id === id); if (!r) return;
    const S = T.settings;
    H.setCard(id);
    $('#dTitle').innerHTML = '<div class="small mute">' + esc(r.rec.book) + ' · ' + esc(r.rec.unit || _t('без урока')) + (r.exs.length ? ' · Ex. ' + esc(r.exs.join(', ')) : '') + ' · ' + esc(r.typeName) + (r.rec.source ? ' · ' + esc(r.rec.source) : '') + '</div><div style="font-weight:600;margin-top:2px">' + esc(r.rec.title || _t('Текст без заголовка')) + _t('</div><div class="small" style="margin-top:2px">Уровень ') + r.targetName + _t(' · оценка ') + lvTxt(r.level.est) + ' · ' + r.counts.words + _t(' сл., ') + r.counts.sentences + _t(' предл., ') + r.counts.paragraphs + ' ' + E.plural(r.counts.paragraphs, [_t('абзац'), _t('абзаца'), _t('абзацев')]) + '</div>';
    let h = '<div class="closeup" id="cu" style="font-size:17px;line-height:1.75">' + textCloseup(r) + '</div>' +
      '<div class="keys"><span><i class="sw" style="background:' + HEAT[1] + _t('"></i>на уровень выше</span><span><i class="sw" style="background:') + HEAT[3] + _t('"></i>на два и более</span><span><i class="sw" style="background:linear-gradient(transparent 55%,') + HEAT[0] + _t(' 55%)"></i>снято по A7</span><span style="text-decoration:underline 2px var(--teal);text-underline-offset:4px">грамматика выше уровня</span><span style="box-shadow:inset 0 -2px 0 #b9b2a6">нет в списке</span><span>полоса слева – ИСТ абзаца</span></div>');
    h += _t('<h3>Карта абзацев</h3><div class="scroll"><table class="heat"><thead><tr><th>Абзац</th><th class="n">Слов</th>') + TCOL.map(colHead).join('') + _t('<th>Слова выше уровня</th></tr></thead><tbody>') +
      r.paras.map(p => '<tr><td class="small">¶' + p.n + ' <span class="mute serif">' + esc(r.rec.text.slice(p.start, Math.min(p.end, p.start + 40))) + (p.end - p.start > 40 ? '…' : '') + '</span></td><td class="n small">' + p.nWords + '</td>' + TCOL.map(c => '<td>' + cellHTML(p.scores[c[0]], c[0] + _t(' – абзац ') + p.n, '') + '</td>').join('') + '<td class="small serif">' + esc([...new Set(p.above)].join(', ')) + '</td></tr>').join('') + _t('</tbody></table></div><p class="small mute">На абзацах короче 30-40 слов доли и плотности неустойчивы, одно трудное слово заметно меняет значение.</p>');
    h += _t('<h3>Показатели текста</h3>') + bars(r);
    const Lv = r.level, W = S.levelWeights;
    h += _t('<h3>Оценка уровня текста</h3><table class="tight" style="width:auto"><tbody>') +
      _t('<tr><td>Лексика L<sub>lex</sub></td><td class="n"><b>') + lvTxt(Lv.lex) + _t('</b></td><td class="small mute">самый низкий уровень с покрытием не ниже ') + S.covLevel + _t(' %, вес ') + E.fmt(W.lex, 2) + '</td></tr>' +
      _t('<tr><td>Грамматика L<sub>gr</sub></td><td class="n"><b>') + lvTxt(Lv.gr) + _t('</b></td><td class="small mute">уровень, которому принадлежат ') + Math.round(S.grammarQ * 100) + _t(' % найденных конструкций, вес ') + E.fmt(W.gr, 2) + (Lv.gr == null ? _t(', конструкций не найдено – компонент не учитывается') : '') + '</td></tr>' +
      _t('<tr><td>Синтаксис L<sub>syn</sub></td><td class="n"><b>') + lvTxt(Lv.syn) + _t('</b></td><td class="small mute">самый низкий уровень, нормы которого по длине предложения и числу придаточных не превышены, вес ') + E.fmt(W.syn, 2) + '</td></tr>' +
      '<tr><td><b>L</b></td><td class="n"><b>' + lvTxt(Lv.est) + _t('</b></td><td class="small mute">взвешенное среднее ') + E.fmt(Lv.raw, 2) + _t(', округлено до половины уровня, заявлен ') + r.targetName + '</td></tr></tbody></table>';
    h += _t('<h3>Профиль лексики</h3>') + profileBlock(r, S);
    h += _t('<h3>Замечания</h3>') + (r.issues.length ? '<ul class="issues">' + r.issues.map(x => '<li><span class="tag">' + x.c + '</span>' + esc(x.t) + '</li>').join('') + '</ul>' : _t('<p class="mute">Алгоритмические показатели не выявили трудностей.</p>'));
    if (H.recBlock) h += H.recBlock(r.id);
    // инструкции
    const ps = H.P.filter(p => p.text.id === r.id);
    h += _t('<h3>Инструкции к тексту (R6)</h3>');
    if (ps.length) h += _t('<div class="scroll"><table class="tight"><thead><tr><th>Инструкция</th><th class="n">Лекс. И/Т</th><th class="n">Грамм. И/Т</th><th class="n">ИСВ − ИСТ</th><th class="n">R6</th></tr></thead><tbody>') +
      ps.map(p => '<tr><td class="serif small"><a href="#" data-open="' + p.instr.id + '">Ex. ' + esc(p.instr.rec.ex) + '</a> ' + esc(p.instr.rec.text) + '</td><td class="n">' + lvTxt(p.iLex) + ' / ' + lvTxt(p.tLex) + '</td><td class="n">' + lvTxt(p.iGr || 1) + ' / ' + lvTxt(p.tGr || 1) + '</td><td class="n">' + f2(p.dIdx) + '</td><td>' + cellHTML(p.P, 'R6', '') + '</td></tr>').join('') + '</tbody></table></div><p class="small mute">' + (ps.some(p => p.harder) ? _t('Есть инструкции, которые сложнее текста и выходят за заявленный уровень.') : _t('Инструкции не сложнее текста.')) + '</p>';
    else h += '<p class="small mute">' + (r.exs.length ? _t('Среди загруженных инструкций нет упражнения ') + esc(r.exs.join(', ')) + _t(' в этом учебнике и уроке.') : _t('Не указано, к каким упражнениям относится текст.')) + '</p>';
    // рубрика
    const K = H.rcfg('texts');
    const rs = H.raters(K).map(x => ({ x, s: H.raterScores(K, x.key)[r.id] })).filter(y => y.s);
    h += _t('<h3>Рубричные оценки</h3>');
    if (rs.length) {
      h += _t('<div class="scroll"><table><thead><tr><th>Критерий</th>') + rs.map(y => '<th class="n">' + esc(y.x.label) + '</th>').join('') + '</tr></thead><tbody>' +
        R.TEXT_RUBRIC.map(q => { const vals = rs.map(y => y.s[q.code]); const num = vals.filter(v => v != null && v !== 'na'); const dif = num.length > 1 && new Set(num.map(String)).size > 1; return '<tr><td>' + q.code + ' ' + esc(q.name) + '</td>' + vals.map(v => '<td class="n"><span class="' + (dif ? 'diff' : '') + '">' + (v == null ? '—' : v === 'na' ? _t('н/п') : v) + '</span></td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      Object.entries(K.slot.models).forEach(([name, m]) => {
        const s = m.scores[r.id]; if (!s) return;
        const lines = Object.entries(s).filter(([, v]) => v && v.rationale).map(([c, v]) => '<li><span class="tag">' + c + '</span>' + esc(v.rationale || '') + (v.evidence ? _t(' <span class="mute">«') + esc(v.evidence) + _t('»</span>') : '') + '</li>');
        if (lines.length) h += _t('<p class="small" style="margin-top:10px"><b>Обоснования модели ') + esc(name) + '</b></p><ul class="issues small">' + lines.join('') + '</ul>';
      });
    } else h += _t('<p class="mute small">Оценок пока нет.</p>');
    h += '<button class="btn sm" data-rate="' + r.id + _t('" data-rmode="texts">Оценить по рубрике</button>');
    // подробности
    const ab = X.aboveList(r);
    h += _t('<h3>Слова выше уровня</h3>') + (ab.length ? _t('<div class="scroll"><table class="tight"><thead><tr><th>Единица</th><th>Уровень</th><th class="n">Раз</th><th class="n">Абзац</th><th>Источник уровня</th></tr></thead><tbody>') + ab.map(w => '<tr><td class="serif">' + esc(w.lemma) + '</td><td>' + esc(w.level) + '</td><td class="n">' + w.count + '</td><td class="n">' + (w.para || '') + '</td><td class="small mute">' + esc(w.src || '') + '</td></tr>').join('') + '</tbody></table></div>' : _t('<p class="mute small">Нет.</p>'));
    if (r.grammar.length) h += _t('<h3>Грамматика</h3><ul class="issues small">') + r.grammar.map(g => '<li>' + esc(g.name) + ' – ' + g.level + _t(' <span class="serif mute">«') + esc(r.rec.text.slice(g.start, g.end)) + _t('»</span>') + (g.tier ? _t(' – выше уровня') : '') + ' <span class="mute">(' + esc(g.src || '') + (g.by === 'parse' ? _t(', разбор') : '') + ')</span></li>').join('') + '</ul>';
    h += H.parseNote(r);
    h += _t('<h3>Синтаксис, разнообразие, читаемость</h3><p class="small">Предложений ') + r.counts.sentences + _t(', средняя длина ') + E.fmt(r.counts.wps, 1) + _t(' слова, придаточных ') + r.marks.length + (r.parse && r.parse.ok ? _t(' по дереву зависимостей') : '') + ' (' + E.fmt(r.counts.sub, 2) + _t(' на предложение') + (r.marks.length ? ' – ' + esc(r.marks.map(m => m.w).join(', ')) : '') + _t('), сложноподчинённых предложений ') + pct1(r.counts.complex) + '. ' +
      'MTLD ' + (r.div.mtld == null ? _t('не рассчитан (меньше 50 слов)') : E.fmt(r.div.mtld, 1) + (r.div.reliable ? '' : _t(' (меньше 100 слов, справочно)'))) + ', TTR ' + E.fmt(r.div.ttr, 2) + _t(', лексем ') + r.div.types + _t(', лексическая плотность ') + pct1(r.div.density) + _t('. Флеш-Кинкейд ') + E.fmt(r.fk, 1) + _t(', лёгкость чтения по Флешу ') + E.fmt(r.fre, 0) + '.</p>';
    $('#dBody').innerHTML = h;
    if (!keep) $('#dBody').scrollTop = 0;
    $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
  }

  /* ---------- статистика ---------- */
  function aggTable(arr, title, lab) {
    const st = H.T.stats;
    return '<h3>' + title + '</h3><div class="scroll"><table class="heat"><thead><tr><th>' + lab + '</th><th class="n">n</th>' + TCOL.map(colHead).join('') + _t('<th class="n"><b>L</b><br>Уровень</th><th class="n">Покрытие</th></tr></thead><tbody>') +
      arr.map(x => '<tr><td class="lab" style="cursor:default"><div class="t">' + esc(x.label) + '</div>' + (lab === _t('Урок') && st.books.length > 1 ? '<div class="m">' + esc(x.book) + '</div>' : '') + '</td><td class="n small">' + x.n + '</td>' + TCOL.map(c => '<td>' + cellHTML(x.mean[c[0]], c[0] + _t(' – среднее'), '') + '</td>').join('') + '<td class="n small">' + lvTxt(x.est == null ? null : Math.round(x.est * 2) / 2) + '</td><td class="n small">' + pct1(x.known) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function renderStats() {
    const el = $('#v-stats'), T = H.T;
    if (!T) { el.innerHTML = _t('<div class="empty">Нет данных.</div>'); return; }
    const st = T.stats, S = T.settings, n = st.n, P = H.P;
    let h = _t('<h2>Статистика текстов</h2><div class="kpis">') + kpi(n, _t('текстов')) + kpi(st.wordsTotal, _t('слов всего')) + kpi(st.books.length, _t('учебников')) + kpi(st.units, _t('уроков')) + kpi(f2(st.crit.IST.mean), _t('средний ИСТ (медиана ') + f2(st.crit.IST.med) + ')') + kpi(pct1(st.counts.known.mean), _t('среднее покрытие')) + '</div>';
    h += _t('<div class="row" style="margin-bottom:16px"><button class="btn" data-texp="csv">Скачать результаты CSV</button><button class="btn" data-texp="pairs"') + (P.length ? '' : ' disabled') + _t('>Скачать пары CSV</button><button class="btn" data-texp="json">Скачать протокол JSON</button><span class="small mute">Протокол содержит версии эталонов, настройки, тексты, пары с инструкциями и все оценки.</span></div>');
    const p = st.profile, L = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], cols = { A1: '#ffffff', A2: HEAT[0], B1: HEAT[1], B2: HEAT[2], C1: HEAT[3], C2: HEAT[4] };
    const cb = st.coverBands;
    h += _t('<div class="grid2"><div class="box"><h3 style="margin-top:0">Профиль лексики корпуса</h3><div class="sbar">') + (p.names ? '<i style="width:' + (p.names / p.tokens * 100) + _t('%;background:#e3f0f0" title="имена – ') + p.names + '"></i>' : '') + L.map(k => p.byLevel[k] ? '<i title="' + k + ' – ' + p.byLevel[k] + '" style="width:' + (p.byLevel[k] / p.tokens * 100) + '%;background:' + cols[k] + '"></i>' : '').join('') + _t('</div><div class="legend" style="margin-top:8px"><span><i style="background:#e3f0f0"></i> имена ') + E.pct(p.names, p.tokens) + '</span>' + L.map(k => '<span><i style="background:' + cols[k] + '"></i> ' + k + ' ' + E.pct(p.byLevel[k], p.tokens) + '</span>').join('') + '</div>' +
      _t('<p class="small" style="margin-top:10px">Покрытие лексикой заявленного уровня – ') + S.covHi + _t(' % и выше у ') + cb.hi + ' ' + E.plural(cb.hi, [_t('текста'), _t('текстов'), _t('текстов')]) + ', ' + S.covLo + '-' + S.covHi + _t(' % – у ') + cb.mid + _t(', ниже ') + S.covLo + _t(' % – у ') + cb.lo + _t('.</p><p class="small mute">Единица учёта – словоупотребление. Вне списка – ') + p.unknown + _t(' (им приписан уровень ') + (S.unknownLevel === 'ignore' ? _t('– исключены') : S.unknownLevel) + ').</p></div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Объём, синтаксис, разнообразие</h3><table><tbody>') +
      [[_t('Слов в тексте'), st.counts.words, 0], [_t('Слов в предложении'), st.counts.wps, 1], [_t('Придаточных на предложение'), st.counts.sub, 2], [_t('Доля сложноподчинённых'), st.counts.complex, 2], [_t('Конструкций на 100 слов'), st.counts.gAll100, 1], [_t('Флеш-Кинкейд'), st.counts.fk, 1], [_t('MTLD (от 50 слов)'), st.counts.mtld, 1], [_t('Лексическая плотность'), st.counts.density, 2]].map(([t, x, d]) => '<tr><td>' + t + '</td><td class="n">' + E.fmt(x.mean, d) + _t('</td><td class="n mute small">медиана ') + E.fmt(x.med, d) + (x.n ? ', ' + E.fmt(x.min, d) + '-' + E.fmt(x.max, d) : '') + '</td></tr>').join('') + '</tbody></table></div></div>';
    h += _t('<h3>Показатели по критериям</h3><div class="scroll"><table><thead><tr><th>Код</th><th>Критерий</th><th class="n">n</th><th class="n">Среднее</th><th class="n">Медиана</th><th class="n">SD</th><th class="n">Мин-макс</th><th class="n">≥ порога</th></tr></thead><tbody>') +
      X.CRIT.map(c => { const x = st.crit[c]; return '<tr><td><b>' + c + '</b></td><td>' + esc(R.TEXT_CRITERIA[c].long) + (c === 'T4' && !(S.weights.T4 > 0) ? _t(' <span class="mute small">(в ИСТ не входит)</span>') : '') + '</td><td class="n">' + (x.n || 0) + '</td><td class="n">' + f2(x.mean) + '</td><td class="n">' + f2(x.med) + '</td><td class="n">' + f2(x.sd) + '</td><td class="n">' + (x.n ? E.fmt(x.min, 2) + '-' + E.fmt(x.max, 2) : '—') + '</td><td class="n">' + (x.n ? x.problem + ' (' + E.pct(x.problem, x.n) + ')' : '—') + '</td></tr>'; }).join('') + _t('</tbody></table></div><p class="note">Порог трудности по критерию – ') + E.fmt(S.problemCrit, 2) + _t(', по ИСТ – ') + E.fmt(S.problemIST, 2) + '.</p>';
    h += _t('<h3>Оценка уровня текстов</h3><div class="scroll"><table class="tight"><thead><tr><th>Текст</th><th>Заявлен</th><th class="n">L<sub>lex</sub></th><th class="n">L<sub>gr</sub></th><th class="n">L<sub>syn</sub></th><th class="n">L</th><th class="n">Δ</th></tr></thead><tbody>') +
      H.T.results.map(r => '<tr><td class="serif"><a href="#" data-topen="' + r.id + '">' + esc(r.rec.title || r.rec.text.slice(0, 40)) + '</a> <span class="small mute">' + esc((st.books.length > 1 ? r.rec.book + ', ' : '') + (r.rec.unit || '')) + '</span></td><td>' + r.targetName + '</td><td class="n">' + lvTxt(r.level.lex) + '</td><td class="n">' + lvTxt(r.level.gr) + '</td><td class="n">' + lvTxt(r.level.syn) + '</td><td class="n"><b>' + lvTxt(r.level.est) + '</b></td><td class="n">' + (r.level.est == null ? '—' : (r.level.est - r.target > 0 ? '+' : '') + E.fmt(r.level.est - r.target, 1)) + '</td></tr>').join('') + '</tbody></table></div>';
    if (st.books.length > 1) h += aggTable(st.bookAgg, _t('Сравнительная карта учебников'), _t('Учебник'));
    h += aggTable(st.unitAgg, _t('Карта по урокам'), _t('Урок'));
    h += aggTable(st.typeAgg.slice().sort((a, b) => b.n - a.n), _t('Карта по типам текстов'), _t('Тип текста'));
    if (P.length) {
      h += _t('<h3>Инструкции и тексты по урокам</h3><div class="scroll"><table class="tight"><thead><tr><th>Урок</th><th class="n">Инструкций</th><th class="n">Текстов</th><th class="n">Пар</th><th class="n">Инструкция сложнее</th><th class="n">ИСВ</th><th class="n">ИСТ</th><th class="n">ИСВ − ИСТ</th><th class="n">L<sub>lex</sub> инстр.</th><th class="n">L<sub>lex</sub> текстов</th></tr></thead><tbody>') +
        H.U.map(x => '<tr><td>' + esc((st.books.length > 1 ? x.book + ', ' : '') + x.label) + '</td><td class="n">' + x.I.length + '</td><td class="n">' + x.T.length + '</td><td class="n">' + x.P.length + '</td><td class="n">' + (x.P.length ? x.harder : '—') + '</td><td class="n">' + f2(x.isv) + '</td><td class="n">' + f2(x.ist) + '</td><td class="n">' + f2(x.delta) + '</td><td class="n">' + E.fmt(x.iLex, 1) + '</td><td class="n">' + E.fmt(x.tLex, 1) + '</td></tr>').join('') + _t('</tbody></table></div><p class="note">Уровни в последних столбцах – среднее по шкале A1 = 1 … C2 = 6.</p>');
    }
    h += _t('<h3>Слова и сочетания выше уровня</h3>') + (st.topWords.length ? _t('<div class="scroll"><table><thead><tr><th>Единица</th><th>Уровень</th><th class="n">Текстов</th><th class="n">Употреблений</th><th>Источник уровня</th></tr></thead><tbody>') +
      st.topWords.slice(0, 50).map(w => '<tr><td class="serif">' + esc(w.lemma) + '</td><td>' + esc(w.level) + '</td><td class="n">' + w.texts + '</td><td class="n">' + w.count + '</td><td class="small mute">' + esc(w.src || '') + '</td></tr>').join('') + '</tbody></table></div>' : _t('<p class="mute">Нет.</p>'));
    h += _t('<h3>Грамматические конструкции</h3>') + (st.grammar.length ? _t('<div class="scroll"><table><thead><tr><th>Конструкция</th><th>Уровень</th><th class="n">Всего</th><th class="n">Выше уровня</th><th class="n">Текстов</th></tr></thead><tbody>') + st.grammar.map(g => '<tr><td>' + esc(g.name) + '</td><td>' + g.level + '</td><td class="n">' + g.total + '</td><td class="n">' + g.above + '</td><td class="n">' + g.texts + '</td></tr>').join('') + '</tbody></table></div>' : _t('<p class="mute">Не найдено.</p>'));
    el.innerHTML = h;
  }
  $('#v-stats').addEventListener('click', e => {
    if (store.mode !== 'texts') return;
    const o = e.target.closest('[data-topen]'); if (o) { e.preventDefault(); openCard(o.dataset.topen); return; }
    const b = e.target.closest('[data-texp]'); if (!b) return;
    if (b.dataset.texp === 'csv') exportCSV(); else if (b.dataset.texp === 'pairs') exportPairs(); else exportJSON();
  });
  function exportCSV() {
    const head = ['id', 'book', 'unit', 'ex', 'text_type', 'title', 'source', 'level_declared', 'level_analysed', 'words', 'sentences', 'paragraphs', 'words_per_sentence', 'subordinate_per_sentence', 'complex_share', 'coverage_known', 'coverage_A1', 'coverage_A2', 'coverage_B1', 'coverage_B2', 'coverage_C1', 'grammar_above_per100', 'grammar_all_per100', 'mtld', 'ttr', 'lexical_density', 'FK_grade', 'flesch_ease', 'T1', 'T2', 'T3', 'T4', 'IST', 'L_lex', 'L_gr', 'L_syn', 'L', 'above_list', 'grammar_above', 'linked_instructions'];
    const rows = [head].concat(H.T.results.map(r => [r.id, r.rec.book, r.rec.unit, r.rec.ex, r.typeName, r.rec.title, r.rec.source, r.rec.level, r.targetName, r.counts.words, r.counts.sentences, r.counts.paragraphs, E.fmt(r.counts.wps, 2), E.fmt(r.counts.sub, 3), E.fmt(r.counts.complex, 3), E.fmt(r.prof.known, 4),
      ...['A1', 'A2', 'B1', 'B2', 'C1'].map(k => E.fmt(r.prof.cumulative[k], 4)), E.fmt(r.counts.g100, 3), E.fmt(r.counts.gAll100, 3), r.div.mtld == null ? '' : E.fmt(r.div.mtld, 2), E.fmt(r.div.ttr, 3), E.fmt(r.div.density, 3), E.fmt(r.fk, 2), E.fmt(r.fre, 1),
      ...X.CRIT.map(c => r.scores[c] == null ? '' : E.fmt(r.scores[c], 3)), lvTxt(r.level.lex), lvTxt(r.level.gr), lvTxt(r.level.syn), lvTxt(r.level.est),
      X.aboveList(r).map(w => w.lemma + ' ' + w.level).join(', '), r.grammar.filter(g => g.tier).map(g => g.name + ' ' + g.level).join(', '), H.P.filter(p => p.text.id === r.id).map(p => p.instr.id).join(' ')]));
    download('texts-results-' + stamp() + '.csv', '﻿' + E.toCSV(rows), 'text/csv;charset=utf-8');
  }
  function exportPairs() {
    const head = ['instruction_id', 'text_id', 'book', 'unit', 'ex', 'instruction', 'text_title', 'level_declared', 'L_lex_instruction', 'L_lex_text', 'L_gr_instruction', 'L_gr_text', 'delta_lex', 'delta_gr', 'ISV', 'IST', 'ISV_minus_IST', 'weighted_above_instr_minus_text', 'excess', 'R6_value', 'instruction_harder'];
    const rows = [head].concat(H.P.map(p => [p.instr.id, p.text.id, p.text.rec.book, p.text.rec.unit, p.instr.rec.ex, p.instr.rec.text, p.text.rec.title, p.instr.targetName, lvTxt(p.iLex), lvTxt(p.tLex), lvTxt(p.iGr || 1), lvTxt(p.tGr || 1), p.dLex, p.dGr, E.fmt(p.instr.scores.ISV, 3), E.fmt(p.text.scores.IST, 3), E.fmt(p.dIdx, 3), E.fmt(p.dAbove, 3), p.excess, E.fmt(p.P, 2), p.harder ? 1 : 0]));
    download('pairs-instruction-text-' + stamp() + '.csv', '﻿' + E.toCSV(rows), 'text/csv;charset=utf-8');
  }
  function exportJSON() {
    const T = H.T;
    const out = { tool: _t('Анализатор учебника (Textbook Analyzer) – режим «Тексты»'), mode: 'texts', meta: Object.assign({ ui: H.UI_VERSION, engine: E.VERSION }, T.meta), rubricVersion: R.TEXT_RUBRIC_VERSION, promptVersion: H.TPROMPT_VERSION,
      results: T.results.map(r => ({ id: r.id, record: r.rec, level: r.targetName, type: r.typeName, counts: r.counts, scores: r.scores, levelEstimate: r.level, profile: r.prof, diversity: r.div, fk: r.fk, fre: r.fre,
        paragraphs: r.paras.map(p => ({ n: p.n, words: p.nWords, scores: p.scores, above: p.above })),
        units: r.units.map(u => ({ text: u.text, lemma: u.lemma, level: u.lv == null ? null : E.lvName(u.lv), source: u.src, tier: u.tier || 0, introduced: u.intro || null })),
        grammar: r.grammar.map(g => ({ name: g.name, level: g.level, fragment: r.rec.text.slice(g.start, g.end), above: !!g.tier })), subordinate: r.marks.map(m => m.w), issues: r.issues })),
      pairs: H.P.map(p => ({ instruction: p.instr.id, text: p.text.id, iLex: p.iLex, tLex: p.tLex, iGr: p.iGr, tGr: p.tGr, dLex: p.dLex, dGr: p.dGr, dIdx: p.dIdx, excess: p.excess, R6: p.P, harder: p.harder })),
      units: H.U.map(x => ({ book: x.book, unit: x.unit, instructions: x.I.length, texts: x.T.length, ISV: x.isv, IST: x.ist, delta: x.delta, pairs: x.P.length, harder: x.harder })),
      rubric: store.texts.rubric, conclusions: T.conclusions.concat(X.pairConclusions(H.P, H.U)), recommendations: H.recExport ? H.recExport() : null };
    download('texts-protocol-' + stamp() + '.json', JSON.stringify(out, null, 1), 'application/json');
  }

  /* ---------- выводы ---------- */
  const conclList = () => H.T.conclusions.concat(X.pairConclusions(H.P, H.U));
  const conclText = () => conclList().map(c => c.title + '\n' + c.text).join('\n\n');
  function renderConcl() {
    const el = $('#v-concl'), T = H.T;
    if (!T) { el.innerHTML = _t('<div class="empty">Нет данных.</div>'); return; }
    el.innerHTML = _t('<h2>Выводы по текстам</h2><div class="row" style="margin-bottom:10px"><button class="btn" data-tc="copy">Копировать</button><button class="btn" data-tc="txt">Скачать .txt</button></div>') +
      '<p class="small"><a href="#recommendations">' + _t('Методические рекомендации учителю и автору по этим выводам – во вкладке «Рекомендации».') + '</a></p>' +
      _t('<p class="small mute">Выводы сформированы автоматически по правилам из рассчитанных показателей. Они описывают зоны, которые требуют экспертного взгляда, и не заменяют экспертную оценку.</p><div class="concl">') +
      conclList().map(c => '<h3><span class="tag">' + _t(c.c) + '</span>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>').join('') + '</div>' +
      _t('<p class="note">Протокол – ') + esc(T.meta.texts) + ', ' + esc(T.meta.core) + ', ' + esc(T.meta.resources) + _t(', список лексики ') + esc(T.meta.lexicon) + ' (' + T.meta.lexiconSize + _t(' ед.), ') + new Date(T.meta.date).toLocaleString(window.IA_I18N ? IA_I18N.locale : 'ru-RU') + '.</p>';
  }
  $('#v-concl').addEventListener('click', e => { if (store.mode !== 'texts') return; const b = e.target.closest('[data-tc]'); if (!b) return; b.dataset.tc === 'copy' ? copy(conclText()) : download('texts-conclusions-' + stamp() + '.txt', conclText()); });

  /* ---------- настройки ---------- */
  function cur() { return X.settingsOf(store.settings, TS().settings); }
  function renderSettings() {
    const el = $('#v-settings'), S = cur();
    const num = (id, v, min, max, step, lab, note) => '<label class="f">' + lab + '<input type="number" data-ts="' + id + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>' + (note ? '<div class="note">' + note + '</div>' : '');
    const wsum = Object.values(S.weights).reduce((s, x) => s + x, 0) || 1, lsum = Object.values(S.levelWeights).reduce((s, x) => s + x, 0) || 1;
    let h = _t('<h2>Настройки анализа текстов</h2><p class="mute">Изменения применяются сразу и записываются в протокол JSON. Общие настройки действуют в обоих режимах, поэтому инструкции и тексты измеряются одной мерой.</p>');
    h += _t('<h3>Общие для инструкций и текстов</h3><div class="grid2">') + H.settingsShared() + '</div>';
    h += _t('<h3 style="margin-top:28px">Режим «Тексты»</h3><div class="grid2">');
    h += _t('<div class="box"><h3 style="margin-top:0">Лексика (T1)</h3>') + num('covHi', S.covHi, 80, 100, 0.5, _t('Порог покрытия, при котором T1 = 0, %')) + num('covLo', S.covLo, 70, 100, 0.5, _t('Порог покрытия, при котором T1 = 0,5, %')) + num('covFloor', S.covFloor, 50, 100, 0.5, _t('Покрытие, при котором T1 = 1, %')) +
      _t('<label class="f" style="margin-top:8px">Порог для оценки лексического уровня L<sub>lex</sub><select data-ts="covLevel">') + [95, 98].map(v => '<option value="' + v + '"' + (+S.covLevel === v ? ' selected' : '') + '>' + v + ' %</option>').join('') + '</select></label>' +
      '<label class="chk"><input type="checkbox" data-ts="useSenses"' + (S.useSenses ? ' checked' : '') + _t('><span>Учитывать словарь инструктивных значений (обычно не нужно – в тексте match чаще значит «матч»)</span></label></div>');
    h += _t('<div class="box"><h3 style="margin-top:0">Грамматика (T2)</h3>') + num('gramTol', S.gramTol, 0, 20, 0.1, _t('Допуск – взвешенных конструкций выше уровня на 100 слов')) + num('gramSat', S.gramSat, 0.5, 30, 0.5, _t('Насыщение – значение, при котором T2 = 1'), _t('Конструкция на уровень выше весит 0,5, на два и более – 1.')) + num('grammarQ', S.grammarQ, 0.5, 1, 0.05, _t('Доля конструкций для уровня L<sub>gr</sub> (0,9 – P90)')) + '</div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Индекс сложности текста (ИСТ)</h3><p class="small">Индекс – взвешенное среднее показателей с ненулевым весом.</p>') +
      [['T1', _t('Лексика')], ['T2', _t('Грамматика')], ['T3', _t('Синтаксис')], ['T4', _t('Читаемость')]].map(([k, t]) => '<label class="f">' + k + ' ' + t + ' – ' + E.fmt(S.weights[k], 2) + _t(' (доля ') + E.pct(S.weights[k], wsum) + ')<input type="range" min="0" max="1" step="0.05" data-tw="' + k + '" value="' + S.weights[k] + '"></label>').join('') +
      _t('<div class="note">T4 (Флеш-Кинкейд) по умолчанию имеет вес 0. Формула откалибрована на читателях-носителях языка и повторяет длину предложения из T3.</div>') +
      num('problemIST', S.problemIST, 0, 1, 0.05, _t('Порог трудного текста по ИСТ')) + num('problemCrit', S.problemCrit, 0, 1, 0.05, _t('Порог трудности по отдельному показателю')) + '</div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Оценка уровня текста (L)</h3><p class="small">L – взвешенное среднее уровней лексики, грамматики и синтаксиса, округлённое до половины уровня.</p>') +
      [['lex', _t('Лексика L<sub>lex</sub>')], ['gr', _t('Грамматика L<sub>gr</sub>')], ['syn', _t('Синтаксис L<sub>syn</sub>')]].map(([k, t]) => '<label class="f">' + t + ' – ' + E.fmt(S.levelWeights[k], 2) + _t(' (доля ') + E.pct(S.levelWeights[k], lsum) + ')<input type="range" min="0" max="1" step="0.05" data-tlw="' + k + '" value="' + S.levelWeights[k] + '"></label>').join('') + '</div>';
    h += _t('</div><div class="box" style="margin-top:18px"><h3 style="margin-top:0">Нормы для текстов по уровням (T3, T4, L<sub>syn</sub>)</h3><div class="scroll"><table style="width:auto"><thead><tr><th>Уровень</th><th class="n">Слов в предложении</th><th class="n">Придаточных на предложение</th><th class="n">Флеш-Кинкейд</th></tr></thead><tbody>') +
      ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => '<tr><td>' + l + '</td>' + [['wps', 1], ['sub', 0.05], ['fk', 0.5]].map(([k, st]) => '<td><input class="inp" style="width:100px" type="number" min="0" step="' + st + '" data-tnorm="' + l + '.' + k + '" value="' + S.norms[l][k] + '"></td>').join('') + '</tr>').join('') +
      _t('</tbody></table></div><div class="row" style="margin-top:10px"><button class="btn" id="tnormCorpus">Рассчитать по корпусу (P75)</button><button class="btn" id="tnormReset">Вернуть рабочие нормы</button></div><div class="note">Рабочие нормы – стартовые значения для калибровки. Расчёт по корпусу берёт 75-й процентиль загруженных текстов каждого уровня (нужно не меньше 5 текстов уровня).</div></div>') +
      _t('<div class="row" style="margin-top:18px"><button class="btn" id="tsetReset">Сбросить настройки режима «Тексты»</button></div>');
    el.innerHTML = h;
  }
  function own() { const s = TS().settings; s.weights = Object.assign({}, X.DEFAULTS.weights, s.weights || {}); s.levelWeights = Object.assign({}, X.DEFAULTS.levelWeights, s.levelWeights || {}); s.norms = JSON.parse(JSON.stringify(Object.assign({}, X.DEFAULTS.norms, s.norms || {}))); return s; }
  function settingsChange(t) {
    if (store.mode !== 'texts') return;
    const s = TS().settings;
    if (t.dataset.ts) { const k = t.dataset.ts; s[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' || k === 'covLevel' ? +t.value : t.value; }
    if (t.dataset.tnorm) { const o = own(); const [l, k] = t.dataset.tnorm.split('.'); o.norms[l][k] = Math.max(0, +t.value); }
    if (t.dataset.tw || t.dataset.tlw) renderSettings();
    save();
  }
  function settingsInput(t) {
    if (store.mode !== 'texts') return;
    if (t.dataset.tw) { own().weights[t.dataset.tw] = +t.value; save(); H.rerun(); }
    if (t.dataset.tlw) { own().levelWeights[t.dataset.tlw] = +t.value; save(); H.rerun(); }
  }
  function settingsClick(b) {
    if (store.mode !== 'texts') return;
    if (b.id === 'tnormReset') { delete TS().settings.norms; renderSettings(); H.rerun(); }
    if (b.id === 'tnormCorpus') { if (!H.T) return; const N = X.corpusNorms(H.T.results); const ks = Object.keys(N); if (!ks.length) { toast(_t('Мало данных – нужно не меньше 5 текстов одного уровня')); return; } const o = own(); ks.forEach(k => { o.norms[k] = { wps: N[k].wps, sub: N[k].sub, fk: N[k].fk }; }); renderSettings(); H.rerun(); toast(_t('Нормы рассчитаны для ') + ks.join(', ')); }
    if (b.id === 'tsetReset') { TS().settings = {}; renderSettings(); H.rerun(); }
  }

  /* ---------- методика ---------- */
  function renderMethod() {
    const S = cur(), T = H.T;
    $('#v-method').innerHTML = _t('<h2>Методика расчёта – тексты</h2>') +
      _t('<p>Режим «Тексты» оценивает учебные тексты (тексты для чтения, скрипты аудирования, диалоги, языковой материал упражнений) тем же ядром, что и режим «Инструкции». Токенизация, лемматизация, устойчивые сочетания, уровни лексики по CEFR-J, грамматические правила с уровнями по CEFR-J Grammar Profile и учёт словника (A7) общие для двух режимов. Поэтому инструкцию и текст одного упражнения можно сопоставить одной мерой. Инструмент не выносит итоговый вердикт, а показывает зоны, которые требуют экспертного взгляда.</p>') +
      _t('<h3>Предобработка</h3><p>Абзацы выделяются по пустым строкам, а если их нет – по строкам (реплики диалога). Имена говорящих в начале реплики (A:, Tom:), числа, буквенные метки и пропуски ___ в расчёт не входят. Имена собственные считаются известными словами. Термины метаязыка в текстах не выделяются, а словарь инструктивных значений по умолчанию выключен.</p>') +
      _t('<h3>T1 Лексика – покрытие</h3><p>Единица учёта – словоупотребление. Покрытие <code>K = известные / все</code>, где известные – имена собственные и слова уровня не выше заявленного или введённые по A7. Пороги опираются на исследования понимания текста – около 95 % для минимального и 98 % для самостоятельного понимания (Laufer, 1989; Hu, Nation, 2000; Laufer, Ravenhorst-Kalovski, 2010). Шкала кусочно-линейная – <code>T1 = 0</code> при K ≥ ') + S.covHi + ' %, <code>T1 = 0,5·(' + S.covHi + ' − K)/(' + S.covHi + ' − ' + S.covLo + _t(')</code> между ') + S.covLo + _t(' и ') + S.covHi + ' %, <code>T1 = 0,5 + 0,5·(' + S.covLo + ' − K)/(' + S.covLo + ' − ' + S.covFloor + _t(')</code> между ') + S.covFloor + _t(' и ') + S.covLo + _t(' %, <code>T1 = 1</code> ниже ') + S.covFloor + _t(' %. Профиль лексики показывает долю словоупотреблений каждого уровня и накопленное покрытие.</p>') +
      _t('<h3>T2 Грамматика</h3><p>Те же правила и источники уровней, что для A2. Конструкция на уровень выше заявленного весит 0,5, на два и более – 1. Плотность <code>G = Σ весов / слова · 100</code>, <code>T2 = (G − допуск) / (насыщение − допуск)</code> на отрезке 0-1, сейчас допуск ') + E.fmt(S.gramTol, 1) + _t(', насыщение ') + E.fmt(S.gramSat, 1) + _t('. Справочно приводится плотность всех найденных конструкций на 100 слов.</p>') +
      _t('<h3>T3 Синтаксис</h3><p>Средняя длина предложения в словах (w) и число придаточных на предложение (s). Придаточные определяются по союзам и союзным словам с отсевом вопросов и предлогов и по грамматическим правилам. Превышение нормы <code>e = (значение − норма) / норма</code> на отрезке 0-1, <code>T3 = (e<sub>w</sub> + e<sub>s</sub>) / 2</code>. Справочно – доля сложноподчинённых предложений.</p>') +
      _t('<h3>T4 Читаемость</h3><p>Индекс Флеша-Кинкейда <code>0,39·(слова/предложения) + 11,8·(слоги/слова) − 15,59</code> и лёгкость чтения по Флешу. <code>T4 = (FK − норма) / норма</code> на отрезке 0-1. Сейчас вес T4 в ИСТ – ') + E.fmt(S.weights.T4, 2) + _t('. По умолчанию показатель в индекс не входит – формула откалибрована на читателях-носителях языка и повторяет длину предложения, учтённую в T3.</p>') +
      _t('<h3>Лексическое разнообразие и плотность</h3><p>MTLD (McCarthy, Jarvis, 2010) – средняя длина отрезка текста, на котором отношение лексем к словоупотреблениям не опускается ниже 0,72, среднее прямого и обратного прохода. Показатель устойчив к длине текста и рассчитывается от 50 слов, надёжен от 100. Лексическая плотность (Ure, 1971) – доля знаменательных слов. Оба показателя справочные.</p>') +
      _t('<h3>Оценка уровня текста L</h3><p><code>L<sub>lex</sub></code> – самый низкий уровень, при котором покрытие словами этого уровня и ниже достигает ') + S.covLevel + _t(' %. <code>L<sub>gr</sub></code> – уровень, которому принадлежат ') + Math.round(S.grammarQ * 100) + _t(' % найденных конструкций. <code>L<sub>syn</sub></code> – самый низкий уровень, нормы которого по длине предложения и числу придаточных не превышены. <code>L = (') + E.fmt(S.levelWeights.lex, 2) + '·L<sub>lex</sub> + ' + E.fmt(S.levelWeights.gr, 2) + '·L<sub>gr</sub> + ' + E.fmt(S.levelWeights.syn, 2) + _t('·L<sub>syn</sub>) / Σ весов</code> по имеющимся компонентам, округление до половины уровня (A1 = 1 … C2 = 6, A2+ = 2,5).</p>') +
      _t('<h3>Индекс сложности текста (ИСТ)</h3><p><code>ИСТ = Σ w<sub>i</sub>·T<sub>i</sub> / Σ w<sub>i</sub></code>, сейчас веса ') + ['T1', 'T2', 'T3', 'T4'].map(k => k + ' ' + E.fmt(S.weights[k], 2)).join(', ') + _t('. Индекс показывает, насколько текст выходит за заявленный уровень, по той же шкале 0-1, что и ИСВ инструкций.</p>') +
      _t('<h3>Карта по абзацам</h3><p>Показатели T1-T4 и ИСТ считаются для каждого абзаца теми же формулами. На коротких абзацах значения неустойчивы.</p>') +
      _t('<h3>Пары «инструкция – текст» (R6)</h3><p>Текст связывается с инструкциями того же учебника и урока по полю «Упражнения». Для обоих объектов одной формулой считаются L<sub>lex</sub> и L<sub>gr</sub>, при отсутствии конструкций принимается уровень A1. Для короткой инструкции порог покрытия означает уровень самого трудного слова – учащийся должен понять каждое слово инструкции. <code>Δ = max(L<sub>lex</sub>(И) − L<sub>lex</sub>(Т), L<sub>gr</sub>(И) − L<sub>gr</sub>(Т))</code>, превышение <code>E = max(0, min(Δ, L(И) − заявленный уровень))</code>, на карте <code>R6 = E / 2</code>. Пара отмечается, если E > 0, то есть инструкция сложнее текста и выходит за заявленный уровень. Справочно приводится разность индексов ИСВ − ИСТ. Сводная карта по урокам сопоставляет средние ИСВ инструкций и ИСТ текстов урока.</p>') +
      _t('<h3>Рубрика</h3><p>Рабочая версия ') + R.TEXT_RUBRIC_VERSION + ' – ' + R.TEXT_RUBRIC.map(q => q.code + ' ' + q.name.toLowerCase()).join(', ') + _t('. Шкала 2-1-0 и «неприменимо», баллы переводятся в 0, 0,5 и 1. Эксперт, Groq и ручной промпт работают так же, как в режиме «Инструкции», согласованность – взвешенная каппа Коэна.</p>') +
      _t('<h3>Эталоны и версии</h3><p>Движок текстов ') + X.VERSION + _t(', ядро ') + C.VERSION + _t(', интерфейс ') + H.UI_VERSION + _t(', эталоны ') + R.version + _t(', рубрика ') + R.TEXT_RUBRIC_VERSION + _t(', промпт ') + H.TPROMPT_VERSION + (T ? _t(', список лексики – ') + esc(T.meta.lexicon) + ' (' + T.meta.lexiconSize + _t(' ед.), уровни грамматики – ') + esc(T.meta.grammarSource) : '') + _t('. Нормы для текстов и веса – рабочие значения, подлежат калибровке по корпусу.</p>');
  }

  /* ---------- рубрика – описание объекта и промпт ---------- */
  function rubricBox(r) {
    const ps = H.P.filter(p => p.text.id === r.id);
    return '<div class="box paper"><div class="small mute">' + esc(r.rec.book) + ' · ' + esc(r.rec.unit || '') + (r.exs.length ? ' · Ex. ' + esc(r.exs.join(', ')) : '') + ' · ' + esc(r.typeName) + _t(' · уровень ') + r.targetName + _t(' · оценка ') + lvTxt(r.level.est) + (r.rec.source ? ' · ' + esc(r.rec.source) : '') + '</div><div style="font-weight:600;margin-top:6px">' + esc(r.rec.title || _t('Текст без заголовка')) + '</div><div class="serif txt-prev" style="font-size:16px;line-height:1.55;margin-top:6px">' + esc(r.rec.text) + '</div>' +
      (ps.length ? _t('<p class="small" style="margin-top:8px"><b>Инструкции.</b> ') + ps.map(p => '<span class="serif">Ex. ' + esc(p.instr.rec.ex) + ' ' + esc(p.instr.rec.text) + '</span>').join('; ') + '</p>' : '') + '</div>';
  }
  function prompt(list, K) {
    const crit = R.TEXT_RUBRIC.map(q => q.code + ' ' + q.name + '. ' + q.q + '\n  ' + q.a.slice().reverse().join('\n  ')).join('\n');
    return _t('Ты – эксперт по методике обучения иностранным языкам. Оцени учебные тексты из учебников английского языка (тексты для чтения, скрипты аудирования, диалоги, языковой материал упражнений) по рубрике ') + R.TEXT_RUBRIC_VERSION + '.\n\n' +
      _t('Шкала для каждого критерия – 2 (соответствует), 1 (частично), 0 (не соответствует) или "na" (неприменимо). Учитывай заявленный уровень CEFR, тип текста, тему урока и инструкции упражнений, к которым относится текст. Аутентичность понимай как естественность языка и правдоподобие ситуации общения и содержания (для адаптированных текстов – сохранение этих качеств после адаптации). Культурную доступность оценивай с учётом родного языка и культуры учащихся, если они указаны.\n\n') +
      _t('Критерии\n') + crit + '\n\n' +
      _t('Для каждого критерия верни балл, обоснование в одно-два предложения на русском языке и фрагмент текста, на который опирается оценка.\n\n') +
      _t('Ответ – только JSON-массив без пояснений и без разметки, по схеме\n[{"id": "<id текста>", "scores": {"TR1": {"score": 2, "rationale": "…", "evidence": "…"}, "TR2": {…}, … "TR6": {…}}}]\n\n') +
      _t('Тексты (по одному в строке, JSON)\n') + list.map(r => JSON.stringify({ id: r.id, level: r.targetName, book: r.rec.book, unit: r.rec.unit, exercises: r.exs.join(', ') || undefined, type: r.typeName, title: r.rec.title || undefined, source: r.rec.source || undefined, audience: r.rec.audience || undefined, l1: r.rec.l1 || undefined,
        instructions: H.P.filter(p => p.text.id === r.id).map(p => 'Ex. ' + p.instr.rec.ex + ' ' + p.instr.rec.text), text: r.rec.text })).join('\n');
  }

  return { renderData, renderMap, renderStats, renderConcl, renderSettings, renderMethod, openCard, corpusLine, rubricBox, prompt, settingsChange, settingsInput, settingsClick };
};
