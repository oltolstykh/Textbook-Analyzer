/* Интерфейс импорта инструкций из учебника (вкладка «Данные», режим «Инструкции»). Входит в ui-0.6.
   Чтение источников и поиск инструкций – import.js, здесь – просмотр, правка и добавление в таблицу CSV. */
window.IA_UI_IMPORT = function (H) {
  const _t = window._t || (s => s);
  const { $, esc, E, store, save, toast, copy, download, stamp, LEVELS } = H;
  const I = window.IA_IMPORT;
  const CONF = { high: [_t('уверенно'), '#e3f0f0'], mid: [_t('вероятно'), '#fdebd3'], llm: [_t('модель'), '#e3f0f0'], low: [_t('сомнительно'), '#f3e1d6'] };
  /* Черновик импорта хранится вместе с данными инструмента; прочитанный источник – только в памяти */
  const D = () => { store.importDraft = Object.assign({ book: '', level: store.input.level || 'A2', aspect: '', from: '', to: '', url: '', source: '', kind: '', items: [], filter: 'all', replace: false }, store.importDraft || {}); return store.importDraft; };
  let SRC = null, busy = false;
  const el = $('#impBox');

  function status(t, err) { const s = $('#impStatus'); if (s) { s.textContent = t || ''; s.style.color = err ? '#a8460f' : ''; } }
  function render() {
    const d = D(), it = d.items;
    const cnt = k => it.filter(c => c.conf === k).length;
    const books = [...new Set((H.A ? H.A.stats.books : []).filter(Boolean))];
    let h = _t('<h3 style="margin-top:0">Импорт из учебника – PDF, Word, веб-страница</h3>') +
      _t('<p class="small">Выберите файл учебника или вставьте содержимое веб-страницы. Инструмент сам найдёт уроки, номера упражнений и инструкции, а вы просмотрите найденное, поправите и добавите в таблицу для анализа. Готовить JSON или CSV вручную не нужно.</p>') +
      '<div class="grid2" style="margin:10px 0">' +
      _t('<label class="f">Учебник<input data-ik="book" list="impBooks" value="') + esc(d.book) + _t('" placeholder="Название, издательство, год"><datalist id="impBooks">') + books.map(b => '<option value="' + esc(b) + '">').join('') + '</datalist></label>' +
      _t('<label class="f">Заявленный уровень<select data-ik="level">') + LEVELS.map(l => '<option' + (l === d.level ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
      _t('<label class="f">Аспект (необязательно)<input data-ik="aspect" value="') + esc(d.aspect) + _t('" placeholder="грамматика, чтение…"></label>') +
      _t('<div class="row" style="align-items:flex-end;gap:8px"><label class="f" style="flex:1">Страницы PDF – с<input data-ik="from" type="number" min="1" value="') + esc(d.from) + _t('" placeholder="1"></label><label class="f" style="flex:1">по<input data-ik="to" type="number" min="1" value="') + esc(d.to) + _t('" placeholder="все"></label></div>') +
      '</div>' +
      _t('<div class="row" style="margin-bottom:10px"><label class="btn pri" style="cursor:pointer">Выбрать файл – PDF, DOCX, HTML, TXT<input type="file" id="impFile" accept=".pdf,.docx,.html,.htm,.txt,application/pdf,text/html,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden></label><span class="small mute">Можно выбрать несколько файлов сразу, например отдельные уроки.</span></div>') +
      '<details style="margin-bottom:10px"' + (d.kind === 'paste' || d.kind === 'url' ? ' open' : '') + _t('><summary style="cursor:pointer;font-weight:500">Учебник выложен как веб-страница</summary>') +
      _t('<p class="small" style="margin-top:8px">Откройте страницу учебника в браузере, выделите всё (Cmd+A на Mac, Ctrl+A в Windows), скопируйте (Cmd+C) и вставьте в поле ниже (Cmd+V). Так работает и со страницами, которые требуют входа, например в Moodle или электронной библиотеке. Для нескольких страниц повторите вставку – найденное добавится к списку.</p>') +
      _t('<div id="impPaste" contenteditable="true" role="textbox" aria-label="Вставить со страницы" style="min-height:90px;max-height:220px;overflow:auto;border:1px dashed var(--line2);border-radius:6px;padding:10px 12px;background:#fff;font-size:14px"></div>') +
      _t('<div class="row" style="margin-top:8px"><button class="btn" id="impPasteGo">Найти инструкции во вставленном</button><label class="chk" style="padding:0"><input type="checkbox" id="impAppend" checked><span>Добавлять к уже найденному</span></label></div>') +
      _t('<div class="row" style="margin-top:10px"><label class="f" style="flex:1 1 320px">Или адрес страницы<input data-ik="url" value="') + esc(d.url) + _t('" placeholder="https://…"></label><button class="btn" id="impUrlGo" style="align-self:flex-end">Загрузить по адресу</button></div>') +
      _t('<p class="note">Большинство сайтов не разрешает читать свои страницы из другого места, поэтому надёжнее вставка или сохранённый файл (в браузере «Файл – Сохранить страницу как», формат «Веб-страница, только HTML»).</p></details>') +
      '<p class="small" id="impStatus" aria-live="polite"></p>';
    if (it.length) {
      const on = it.filter(c => c.on).length;
      const units = [...new Set(it.map(c => c.unit).filter(Boolean))];
      h += _t('<h3>Найдено – ') + it.length + ' ' + E.plural(it.length, [_t('инструкция'), _t('инструкции'), _t('инструкций')]) + (units.length ? _t(' в ') + units.length + ' ' + E.plural(units.length, [_t('уроке'), _t('уроках'), _t('уроках')]) : '') + (d.source ? ' <span class="mute small" style="font-weight:400">· ' + esc(d.source) + '</span>' : '') + '</h3>' +
        '<p class="small">' + [['high', _t('уверенно')], ['mid', _t('вероятно')], ['llm', _t('найдено моделью')], ['low', _t('сомнительно')]].filter(([k]) => cnt(k)).map(([k, t]) => t + ' – ' + cnt(k)).join(', ') + '. ' + (cnt('low') ? _t('Сомнительные не отмечены, проверьте их. ') : '') + _t('Урок, номер и текст инструкции можно исправить прямо в таблице, галочка решает, войдёт ли строка в анализ.</p>') +
        '<div class="row" style="margin-bottom:8px"><div class="seg" id="impFilter">' + [['all', _t('Все')], ['on', _t('Отмеченные')], ['low', _t('Сомнительные')]].map(([k, t]) => '<button data-f="' + k + '" aria-pressed="' + (d.filter === k) + '">' + t + '</button>').join('') + '</div>' +
        _t('<button class="btn sm" id="impAll">Отметить все</button><button class="btn sm" id="impNone">Снять все</button></div>');
      const vis = it.filter(c => d.filter === 'on' ? c.on : d.filter === 'low' ? c.conf === 'low' : true);
      h += _t('<div class="scroll" style="max-height:560px;overflow:auto;border:1px solid var(--line);border-radius:6px"><table class="tight"><thead><tr><th></th><th>Урок</th><th>Упр.</th><th>Инструкция</th><th>Оценка</th></tr></thead><tbody>') +
        vis.map(c => '<tr data-ci="' + c.id + '"' + (c.on ? '' : ' style="opacity:.6"') + '><td><input type="checkbox" data-ion' + (c.on ? ' checked' : '') + _t(' aria-label="Взять в анализ" style="width:18px;height:18px;accent-color:var(--teal)"></td>') +
          '<td><input class="inp" data-ic="unit" value="' + esc(c.unit) + '" style="width:92px;min-height:32px;padding:4px 6px;font-size:13px"></td>' +
          '<td><input class="inp" data-ic="ex" value="' + esc(c.ex) + '" style="width:52px;min-height:32px;padding:4px 6px;font-size:13px"></td>' +
          '<td style="min-width:280px"><textarea data-ic="text" rows="' + Math.min(4, Math.max(1, Math.ceil(c.text.length / 70))) + '" style="font-size:14px;padding:4px 8px">' + esc(c.text) + '</textarea>' +
          (c.exercise_text ? _t('<details><summary class="small mute" style="cursor:pointer">материал упражнения</summary><textarea data-ic="exercise_text" rows="3" style="font-size:13px;padding:4px 8px;margin-top:4px">') + esc(c.exercise_text) + '</textarea></details>' : '') + '</td>' +
          '<td class="small"><span class="tag" style="background:' + CONF[c.conf][1] + '">' + CONF[c.conf][0] + '</span>' + (c.page ? _t('<div class="mute">стр. ') + c.page + '</div>' : '') + '<div class="mute" style="max-width:150px">' + esc(c.why || '') + '</div></td></tr>').join('') +
        '</tbody></table></div>';
      h += _t('<div class="row" style="margin-top:12px"><button class="btn pri" id="impAdd">Добавить отмеченные в таблицу (') + on + ')</button><label class="chk" style="padding:0"><input type="checkbox" id="impReplace"' + (d.replace ? ' checked' : '') + _t('><span>Заменить загруженные инструкции</span></label><button class="btn" id="impCsv">Скачать CSV</button><button class="btn" id="impClear">Очистить найденное</button></div>');
      h += _t('<details style="margin-top:14px"><summary style="cursor:pointer;font-weight:500">Если найдено не всё – уточнить языковой моделью</summary><div class="grid2" style="margin-top:10px">') +
        _t('<div class="box"><h3 style="margin-top:0">Через Groq</h3><p class="small">Модель заново просматривает текст источника и возвращает список инструкций. Каждая инструкция сверяется с источником – то, чего в учебнике нет дословно, помечается как сомнительное. Ключ Groq и модель задаются во вкладке «Настройки».</p>') +
        '<div class="row"><button class="btn" id="impGroq"' + (SRC ? '' : ' disabled') + _t('>Найти инструкции через Groq</button><button class="btn" id="impGroqStop" hidden>Остановить</button></div>') + (SRC ? '' : _t('<p class="note">Нужен прочитанный источник – выберите файл или вставьте страницу ещё раз (сам источник не сохраняется после перезагрузки).</p>')) + '</div>' +
        _t('<div class="box"><h3 style="margin-top:0">Через любой чат</h3><p class="small">Промпт с текстом источника копируется в чат с моделью (Claude, ChatGPT, GigaChat и др.), ответ модели вставляется ниже как есть.</p>') +
        '<div class="row"><button class="btn sm" id="impPrompt"' + (SRC ? '' : ' disabled') + _t('>Скопировать промпт</button><span class="small mute" id="impPromptInfo"></span></div>') +
        _t('<textarea id="impLlm" rows="3" placeholder="Ответ модели" style="margin-top:8px;font-size:13px"></textarea><div class="row" style="margin-top:6px"><button class="btn sm" id="impLlmGo">Разобрать ответ</button></div></div>') +
        '</div></details>';
    }
    el.innerHTML = h;
  }

  /* ---------- чтение источников ---------- */
  function apply(src, name, kind, append) {
    const d = D();
    const r = I.extract(src.lines);
    let items = r.candidates;
    if (!d.book && src.title) d.book = src.title.slice(0, 80);
    if (append && d.items.length) { const n0 = d.items.length; items.forEach((c, i) => { c.id = 'c' + (n0 + i + 1) + '-' + Date.now().toString(36); }); d.items = d.items.concat(items); }
    else d.items = items;
    d.source = append && d.source && d.source !== name ? d.source + ', ' + name : name; d.kind = kind;
    SRC = append && SRC ? { lines: SRC.lines.concat(src.lines), kind: SRC.kind } : { lines: src.lines, kind };
    save(); render();
    if (!items.length) status(_t('В «') + name + _t('» инструкции не найдены. Проверьте, что это страницы с упражнениями, или попробуйте уточнить языковой моделью ниже.'), true);
    else status(_t('«') + name + _t('» – найдено ') + items.length + (src.pages ? _t(', прочитано страниц ') + src.pages + (src.total ? _t(' из ') + src.total : '') : '') + '.');
  }
  async function readFiles(files) {
    if (busy || !files.length) return; busy = true;
    const d = D(); let first = true;
    try {
      for (const f of files) {
        status(_t('Читаю «') + f.name + _t('»…'));
        const src = await I.readFile(f, { from: d.from, to: d.to, progress: (i, n) => status(_t('Читаю «') + f.name + _t('» – страница ') + i + _t(' из ') + n + '…') });
        if (src.kind === 'pdf' && src.scanned) { status(_t('В «') + f.name + _t('» почти нет текстового слоя – похоже, это скан. Распознайте текст (Adobe Acrobat – «Распознать текст», ABBYY FineReader или «Просмотр» на Mac при экспорте) и загрузите файл снова.'), true); continue; }
        apply(src, f.name, src.kind, !first);
        first = false;
      }
    } catch (e) { status(e.message || String(e), true); }
    busy = false;
  }
  function pasteGo() {
    const box = $('#impPaste'); const html = box.innerHTML.trim();
    if (!box.textContent.trim()) { toast(_t('Вставьте содержимое страницы в поле')); box.focus(); return; }
    const src = I.readHtml(html);
    apply(src, _t('вставка со страницы'), 'paste', $('#impAppend').checked && D().items.length > 0);
    box.innerHTML = '';
  }
  async function urlGo() {
    const d = D(), url = (d.url || '').trim();
    if (!/^https?:\/\//i.test(url)) { toast(_t('Введите адрес, начинающийся с http:// или https://')); return; }
    status(_t('Загружаю страницу…'));
    try { const src = await I.readUrl(url); apply(src, url.replace(/^https?:\/\//, '').slice(0, 60), 'url', false); }
    catch (e) { status(e.message, true); }
  }

  /* ---------- языковая модель ---------- */
  const gs = { stop: false };
  async function groqGo() {
    if (!SRC) return; const key = H.groqKey(); if (!key) { toast(_t('Введите ключ Groq во вкладке «Настройки»')); return; }
    const d = D(), model = H.groqDefaultModel(), text = I.sourceText(SRC), parts = I.chunks(text, 7000);
    const btn = $('#impGroq'), stop = $('#impGroqStop'); btn.disabled = true; stop.hidden = false; gs.stop = false;
    let found = [], fail = '';
    for (let i = 0; i < parts.length; i++) {
      if (gs.stop) { fail = _t('Остановлено.'); break; }
      status(_t('Groq, модель ') + model + _t(' – часть ') + (i + 1) + _t(' из ') + parts.length + '…');
      try { const ans = await H.groqCall(key, model, I.llmPrompt(parts[i], { book: d.book, level: d.level, kind: SRC.kind })); found = found.concat(I.parseLlm(ans, parts[i])); }
      catch (e) { if (e.status === 429) { status(_t('Лимит запросов Groq – пауза…')); await new Promise(r => setTimeout(r, Math.max(e.retry || 0, 20) * 1000)); i--; continue; } fail = e.kind || e.status ? H.groqError(e) : e.message; break; }
    }
    btn.disabled = false; stop.hidden = true;
    if (found.length) { found.forEach((c, k) => { c.id = 'g' + (k + 1) + '-' + Date.now().toString(36); }); d.items = found; d.source = (d.source || '') + ' · Groq ' + model; save(); render(); }
    status((fail ? fail + ' ' : '') + _t('Модель нашла ') + found.length + ' ' + E.plural(found.length, [_t('инструкцию'), _t('инструкции'), _t('инструкций')]) + '.', !!fail);
  }
  function llmGo() {
    const d = D(), ans = ($('#impLlm').value || '').trim(); if (!ans) { toast(_t('Вставьте ответ модели')); return; }
    try { const arr = I.parseLlm(ans, SRC ? I.sourceText(SRC) : null); arr.forEach((c, k) => { c.id = 'm' + (k + 1) + '-' + Date.now().toString(36); }); d.items = arr; d.source = (d.source || '') + _t(' · ответ модели из чата'); save(); render(); status(_t('Разобрано ') + arr.length + '.'); }
    catch (e) { status(e.message, true); }
  }

  /* ---------- добавление в таблицу ---------- */
  const COLS = ['book', 'level', 'unit', 'ex', 'aspect', 'text', 'exercise_text'];
  function rowsOf(list) { const d = D(); return list.map(c => ({ book: d.book || _t('Без названия'), level: d.level, unit: c.unit, ex: c.ex, aspect: d.aspect, text: c.text.replace(/\s+/g, ' ').trim(), exercise_text: (c.exercise_text || '').replace(/\s*\n\s*/g, ' / ').trim() })); }
  function addToTable() {
    const d = D(), list = d.items.filter(c => c.on && c.text.trim());
    if (!list.length) { toast(_t('Не отмечено ни одной инструкции')); return; }
    if (!d.book.trim()) { toast(_t('Укажите название учебника')); const b = el.querySelector('[data-ik=book]'); if (b) b.focus(); return; }
    const isSample = store.input.csv === window.IA_SAMPLE.csv || window.IA_SAMPLE_ANY('csv', store.input.csv);
    /* Уже загруженные инструкции приводятся к общим полям, новые добавляются в конец без повторов */
    const FULL = ['book', 'publisher', 'year', 'level', 'unit', 'section', 'ex', 'aspect', 'audience', 'l1', 'text', 'exercise_text'];
    let old = [];
    if (!d.replace && !isSample) {
      if (store.input.mode === 'csv' && store.input.csv.trim()) old = E.recordsFromCSV(store.input.csv);
      else if (store.input.mode === 'text' && store.input.text.trim()) { const aud = (store.input.aud || '').split(','); old = E.recordsFromText(store.input.text, { book: store.input.book || _t('Без названия'), level: store.input.level, aspect: store.input.aspect, audience: (aud[0] || '').trim(), l1: (aud[1] || '').trim() }); }
    }
    const key = r => [r.book, r.unit, r.ex, r.text].map(x => String(x || '').trim().toLowerCase()).join('|');
    const seen = new Set(old.map(key));
    const add = rowsOf(list).filter(r => { const k = key(r); if (seen.has(k)) return false; seen.add(k); return true; });
    const all = old.concat(add);
    const head = FULL.filter(k => all.some(r => r[k]) || COLS.includes(k));
    store.input.csv = E.toCSV([head].concat(all.map(r => head.map(k => r[k] || ''))));
    store.input.mode = 'csv';
    save(); H.initData(); H.run(true);
    toast(_t('Добавлено ') + add.length + (list.length > add.length ? _t(', повторы пропущены') : '') + (isSample && !d.replace ? _t(' – пример заменён вашими данными') : '') + _t('. Всего ') + all.length + '.');
    status(_t('В таблице ') + all.length + ' ' + E.plural(all.length, [_t('инструкция'), _t('инструкции'), _t('инструкций')]) + _t('. Нажмите «Анализировать» или откройте «Тепловую карту».'));
  }

  /* ---------- события ---------- */
  el.addEventListener('input', e => {
    const t = e.target, d = D();
    if (t.dataset.ik) { d[t.dataset.ik] = t.value; save(); return; }
    const tr = t.closest('tr[data-ci]'); if (tr && t.dataset.ic) { const c = d.items.find(x => x.id === tr.dataset.ci); if (c) { c[t.dataset.ic] = t.value; save(); } }
  });
  el.addEventListener('change', e => {
    const t = e.target, d = D();
    if (t.dataset.ik === 'level') { d.level = t.value; save(); }
    if (t.id === 'impFile') { readFiles([...t.files]); t.value = ''; }
    if (t.id === 'impReplace') { d.replace = t.checked; save(); }
    if (t.hasAttribute('data-ion')) { const tr = t.closest('tr'); const c = d.items.find(x => x.id === tr.dataset.ci); if (c) { c.on = t.checked; tr.style.opacity = c.on ? '' : '.6'; save(); const b = $('#impAdd'); if (b) b.textContent = _t('Добавить отмеченные в таблицу (') + d.items.filter(x => x.on).length + ')'; } }
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const d = D();
    if (b.closest('#impFilter') && b.dataset.f) { d.filter = b.dataset.f; save(); render(); }
    if (b.id === 'impAll') { d.items.forEach(c => { c.on = true; }); save(); render(); }
    if (b.id === 'impNone') { d.items.forEach(c => { c.on = false; }); save(); render(); }
    if (b.id === 'impAdd') addToTable();
    if (b.id === 'impClear') { d.items = []; d.source = ''; SRC = null; save(); render(); }
    if (b.id === 'impCsv') { const list = d.items.filter(c => c.on); download('instructions-import-' + stamp() + '.csv', '﻿' + E.toCSV([COLS].concat(rowsOf(list).map(r => COLS.map(k => r[k])))), 'text/csv;charset=utf-8'); }
    if (b.id === 'impPasteGo') pasteGo();
    if (b.id === 'impUrlGo') urlGo();
    if (b.id === 'impGroq') groqGo();
    if (b.id === 'impGroqStop') gs.stop = true;
    if (b.id === 'impPrompt') { const parts = I.chunks(I.sourceText(SRC), 12000); copy(I.llmPrompt(parts[0], { book: d.book, level: d.level, kind: SRC.kind })); $('#impPromptInfo').textContent = parts.length > 1 ? _t('Источник длинный – в промпт вошла часть 1 из ') + parts.length + _t('. Для остальных частей выберите в настройках импорта меньший диапазон страниц.') : ''; }
    if (b.id === 'impLlmGo') llmGo();
  });
  /* Вставка – оставляем разметку страницы (жирный шрифт, списки, заголовки), убираем картинки */
  el.addEventListener('paste', e => {
    if (e.target.id !== 'impPaste' && !e.target.closest('#impPaste')) return;
    const html = e.clipboardData && e.clipboardData.getData('text/html'), txt = e.clipboardData && e.clipboardData.getData('text/plain');
    e.preventDefault();
    const box = $('#impPaste');
    if (html) { const doc = new DOMParser().parseFromString(html, 'text/html'); doc.querySelectorAll('img,script,style,svg,iframe,video,audio').forEach(x => x.remove()); box.innerHTML += doc.body.innerHTML; }
    else if (txt) box.innerHTML += txt.split(/\r?\n/).map(l => '<div>' + esc(l) + '</div>').join('');
    status(_t('Вставлено. Нажмите «Найти инструкции во вставленном».'));
  });

  return { render };
};
