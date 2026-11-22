/* Интерфейс анализатора инструкций и текстов. Версия ui-0.8 (методика упражнений – ui-method.js: тип и этап упражнения, вид «Последовательность урока», рубрика урока L1-L2, критерий R7).
   ui-0.7 – английская версия через i18n.js; импорт – ui-import.js; ключ Groq в «Настройках».
   Режим «Инструкции» – этот файл, режим «Тексты» – ui-texts.js (вкладки те же, содержимое зависит от режима).
   Рубрика, Groq и ручной промпт – общий модуль для обоих режимов. */
{
  const _t = window._t || (s => s);
  /* Код критерия и подпись; у индексов (ISV – PCI) в английской версии код и подпись совпадают, поэтому код не повторяется */
  const codeLab = (c, lab, sep) => _t(c) === lab ? '<b>' + lab + '</b>' : '<b>' + _t(c) + '</b>' + sep + lab;
  const UI_VERSION = 'ui-0.8';
  const E = window.IA_ENGINE, R = window.IA_RES, X = window.IA_TEXTS, C = window.IA_CORE;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f2 = x => x == null || isNaN(x) ? '—' : E.fmt(x, 2);
  const LEVELS = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2'];
  const HEAT = ['#fdebd3', '#fbcf9f', '#f5a35f', '#e0712f', '#a8460f'];
  const ALG = [['A1', _t('Лексика')], ['A2', _t('Грамм.')], ['A3', _t('Объём')], ['A4', _t('Метаяз.')], ['A5', _t('Единообр.')], ['D1', _t('Парам.')], ['D3', _t('Отсылки')], ['D4', _t('Неодн.')], ['ISV', _t('ИСВ')]];
  const RSHORT = { R1: _t('Понятн.'), R2: _t('Глагол'), R3: _t('Тип упр.'), R4: _t('Ситуация'), R5: _t('Образец'), R6: _t('Уровень'), R7: _t('Уместн.'), D1: _t('Парам.'), D2: _t('Форма'), D4: _t('Однозн.'), D5: _t('Язык') };
  const RUB = R.RUBRIC.map(x => [x.code, RSHORT[x.code] || x.name]);
  const PROMPT_VERSION = 'prompt-0.2', TPROMPT_VERSION = 'prompt-t-0.1';
  const LS = 'textbook-analyzer-v1';

  /* ---------- состояние ---------- */
  const store = Object.assign({
    settings: JSON.parse(JSON.stringify(E.DEFAULTS)),
    input: { mode: 'text', text: '', csv: '', book: '', level: 'A2', aspect: '', aud: '' },
    vocab: [], vocabName: '', userLex: null,
    rubric: { experts: {}, models: {} },
    ui: { tab: 'map', source: 'algo', group: 'ex', vals: true, book: '*', expert: '', model: '', raterA: '', raterB: '', cur: null },
    mode: 'instr'
  }, load() || {});
  function textsDefault() {
    return { items: [], csv: '', inMode: 'form', edit: -1, sampleLoaded: false,
      form: { book: '', level: 'A2', unit: '', ex: '', text_type: 'reading', title: '', source: '', text: '' },
      settings: {}, rubric: { experts: {}, models: {} },
      ui: { source: 'algo', view: 'texts', vals: true, book: '*', expert: '', model: '', raterA: '', raterB: '', cur: null, groqModel: '' } };
  }
  (() => { const d = textsDefault(), t = store.texts || {}; store.texts = Object.assign(d, t); ['form', 'ui', 'rubric'].forEach(k => { store.texts[k] = Object.assign(textsDefault()[k], t[k] || {}); }); store.mode = store.mode === 'texts' ? 'texts' : 'instr'; })();
  let A = null, T = null, P = [], U = [], curCard = null, MA = null;
  /* Синтаксический разбор хранится отдельно от остальных данных – файл CoNLL-U бывает большим */
  const PARSE_LS = 'textbook-analyzer-parse-v1';
  let PS = null, parseSaved = false;
  (() => { try { const raw = localStorage.getItem(PARSE_LS); if (raw) { const o = JSON.parse(raw); PS = window.IA_PARSE.makeStore(window.IA_PARSE.parseConllu(o.text), o.name); parseSaved = true; } } catch (e) { PS = null; } })();
  function load() { try { return JSON.parse(localStorage.getItem(LS)); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) { toast(_t('Браузер не сохранил данные – слишком большой объём или запрет хранилища')); } }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 2600); }
  function copy(text) {
    const done = () => toast(_t('Скопировано'));
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast(_t('Не удалось скопировать')); } ta.remove(); }
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');

  /* ---------- данные и запуск ---------- */
  function records() {
    const I = store.input;
    if (I.mode === 'csv') return E.recordsFromCSV(I.csv);
    const aud = I.aud.split(',');
    return E.recordsFromText(I.text, { book: I.book || _t('Без названия'), level: I.level, aspect: I.aspect, audience: (aud[0] || '').trim(), l1: (aud[1] || '').trim() });
  }
  function textRecords() { return (store.texts.items || []).map((x, i) => Object.assign({}, x, { _idx: i })); }
  /* Оба режима считаются при каждом запуске – общие настройки и пары «инструкция – текст» всегда согласованы */
  function run(quiet) {
    const recs = records(), trecs = textRecords();
    A = recs.length ? E.analyzeCorpus(recs, store.settings, { userLex: store.userLex, vocab: store.vocab, parse: PS }) : null;
    MA = A && window.IA_METHOD ? window.IA_METHOD.analyze(A, store.settings.method) : null;
    T = trecs.length ? X.analyzeTexts(trecs, store.settings, store.texts.settings, { userLex: store.userLex, vocab: store.vocab, parse: PS }) : null;
    P = A && T ? X.pairs(A.results, T.results, T.settings) : [];
    U = X.unitSummary(A ? A.results : [], T ? T.results : [], P);
    renderAll();
    const cur = store.mode === 'texts' ? T : A;
    if (!cur && !quiet) toast(store.mode === 'texts' ? _t('Нет текстов для анализа') : _t('Нет инструкций для анализа'));
    $('#runInfo').textContent = A ? _t('Проанализировано ') + A.results.length + ' – ' + new Date().toLocaleTimeString(window.IA_I18N ? IA_I18N.locale : 'ru-RU') : '';
  }
  let rt; const rerun = () => { clearTimeout(rt); rt = setTimeout(() => { save(); run(true); }, 250); };

  /* ---------- вкладки ---------- */
  const TABS = { map: 'map', stats: 'stats', conclusions: 'concl', data: 'data', setup: 'settings', rubric: 'rubric', method: 'method' };
  const V2H = Object.fromEntries(Object.entries(TABS).map(([h, v]) => [v, h]));
  function show(v) {
    document.querySelectorAll('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
    document.querySelectorAll('section.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
    store.ui.tab = v; save();
    if (location.hash.slice(1) !== V2H[v]) history.replaceState(null, '', '#' + V2H[v]);
  }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) show(b.dataset.v); });
  window.addEventListener('hashchange', () => { const v = TABS[location.hash.slice(1)]; if (v) show(v); });

  function renderAll() {
    renderMode(); renderCorpusLine(); renderMap(); renderStats(); renderConcl(); renderPreview(); TX.renderData(); renderParse(); renderRubric(); renderMethod();
    if (curCard && findResult(curCard)) reopenCard(curCard); else closeCard();
  }
  function findResult(id) { return (A && A.results.find(r => r.id === id)) || (T && T.results.find(r => r.id === id)) || null; }
  function reopenCard(id) { if (A && A.results.find(r => r.id === id)) openCard(id, true); else TX.openCard(id, true); }
  function renderMode() {
    const m = store.mode;
    document.querySelectorAll('#modeSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
    $('#dataInstr').hidden = m !== 'instr'; $('#dataTexts').hidden = m !== 'texts';
    document.title = m === 'texts' ? _t('Анализатор учебника – тексты') : _t('Анализатор учебника – инструкции');
  }
  function setModeUI(m) { if (m === store.mode) return; store.mode = m; save(); closeCard(); renderAll(); renderSettings(); }
  $('#modeSeg').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setModeUI(b.dataset.mode); });
  function renderCorpusLine() {
    if (store.mode === 'texts') { $('#corpusLine').textContent = TX.corpusLine(); return; }
    if (!A) { $('#corpusLine').textContent = _t('Нет данных – загрузите инструкции во вкладке «Данные»'); return; }
    const st = A.stats;
    $('#corpusLine').textContent = st.n + ' ' + E.plural(st.n, [_t('инструкция'), _t('инструкции'), _t('инструкций')]) + ' · ' + st.books.length + ' ' + E.plural(st.books.length, [_t('учебник'), _t('учебника'), _t('учебников')]) + _t(' · уровень ') + Object.keys(st.levels).join(', ') + (store.settings.levelMode === 'fixed' ? _t(' (задан вручную)') : '') + _t(' · список лексики ') + A.meta.lexicon;
  }

  /* ---------- цвета ---------- */
  function cellHTML(v, title, id, extra) {
    let cls = 'cell', style = '', txt = '';
    if (v === 'na') { cls += ' hatch'; title += _t(' – неприменимо'); }
    else if (v == null) { cls += ' nodata'; title += _t(' – нет данных'); }
    else {
      if (v > 0) { const k = Math.min(4, Math.floor(v * 5 - 1e-9)); style = 'background:' + HEAT[k]; if (k >= 3) cls += ' dark'; }
      txt = store.ui.vals ? E.fmt(v, 2) : '';
      title += ' – ' + E.fmt(v, 2);
    }
    return '<button class="' + cls + '" style="' + style + '" title="' + esc(title) + '" data-id="' + esc(id || '') + '"' + (extra || '') + '>' + txt + '</button>';
  }
  function legend() {
    return '<div class="legend">0<i style="background:#fff"></i>' + HEAT.map(c => '<i style="background:' + c + '"></i>').join('') + _t('1 <span style="margin-left:10px"><i class="hatch"></i> неприменимо</span><span><i class="nodata"></i> нет данных</span></div>');
  }

  /* ---------- рубричные оценки ---------- */
  function raters(K) {
    const out = []; K = K || rcfg();
    Object.keys(K.slot.experts).forEach(n => out.push({ key: 'e:' + n, label: _t('Эксперт – ') + n }));
    Object.keys(K.slot.models).forEach(n => out.push({ key: 'm:' + n, label: _t('Модель – ') + n }));
    return out;
  }
  function raterScores(K, key) {
    if (!key) return {};
    if (key.startsWith('e:')) return K.slot.experts[key.slice(2)] || {};
    const m = K.slot.models[key.slice(2)]; if (!m) return {};
    const o = {}; for (const id in m.scores) { o[id] = {}; for (const c in m.scores[id]) o[id][c] = m.scores[id][c] && m.scores[id][c].score; }
    return o;
  }
  const norm3 = v => v === 'na' ? 'na' : v == null || v === '' ? null : (2 - +v) / 2;
  function rubricVal(K, id, code) {
    const u = K.ui;
    if (u.source === 'expert') { const s = raterScores(K, 'e:' + u.expert)[id]; return norm3(s && s[code]); }
    if (u.source === 'model') { const s = raterScores(K, 'm:' + u.model)[id]; return norm3(s && s[code]); }
    if (u.source === 'diff') {
      const a = raterScores(K, 'e:' + u.expert)[id], b = raterScores(K, 'm:' + u.model)[id];
      const x = a && a[code], y = b && b[code];
      if (x === 'na' && y === 'na') return 'na';
      if (x == null || y == null || x === 'na' || y === 'na') return null;
      return Math.abs(+x - +y) / 2;
    }
    return null;
  }

  /* ---------- тепловая карта ---------- */
  function renderMap() {
    if (store.mode === 'texts') { TX.renderMap(); return; }
    const el = $('#v-map'), K = rcfg('instr');
    if (!A) { el.innerHTML = _t('<div class="empty">Загрузите инструкции во вкладке «Данные» или нажмите «Загрузить пример».<div style="margin-top:14px"><button class="btn pri" data-act="sample">Загрузить пример</button></div></div>'); return; }
    const u = store.ui, st = A.stats;
    const ex = Object.keys(store.rubric.experts), md = Object.keys(store.rubric.models);
    if (!u.expert && ex.length) u.expert = ex[0];
    if (!u.model && md.length) u.model = md[0];
    const srcBtn = (k, t, dis) => '<button aria-pressed="' + (u.source === k) + '" data-src="' + k + '"' + (dis ? _t(' disabled title="Нет оценок"') : '') + '>' + t + '</button>';
    let h = '<div class="kpis">' +
      kpi(st.n, _t('инструкций')) + kpi(f2(st.crit.ISV.mean), _t('средний ИСВ')) + kpi(st.crit.ISV.problem, _t('достигают порога ') + E.fmt(store.settings.problemISV, 2)) +
      kpi(E.pct(st.dist.t1 + st.dist.t2, st.dist.at + st.dist.t1 + st.dist.t2 + st.dist.intro), _t('лексических единиц выше уровня')) + kpi(E.fmt(st.counts.words.mean, 1), _t('слов в инструкции в среднем')) + '</div>';
    h += '<div class="mapbar"><div class="seg" id="srcSeg">' + srcBtn('algo', _t('Алгоритм')) + srcBtn('expert', _t('Эксперт'), !ex.length) + srcBtn('model', _t('Модель'), !md.length) + srcBtn('diff', _t('Расхождение'), !ex.length || !md.length) + '</div>' +
      (u.source === 'expert' || u.source === 'diff' ? sel('mapExpert', ex, u.expert) : '') + (u.source === 'model' || u.source === 'diff' ? sel('mapModel', md, u.model) : '') +
      '<div class="seg" id="grpSeg"><button aria-pressed="' + (u.group === 'ex') + _t('" data-g="ex">Упражнения</button><button aria-pressed="') + (u.group === 'unit') + _t('" data-g="unit">Уроки</button><button aria-pressed="') + (u.group === 'seq') + _t('" data-g="seq">Последовательность</button></div>') +
      (st.books.length > 1 ? sel('mapBook', ['*'].concat(st.books), u.book, { '*': _t('Все учебники') }) : '') +
      '<label class="chk"><input type="checkbox" id="mapVals"' + (u.vals ? ' checked' : '') + _t('> значения в ячейках</label>') + legend() + '</div>';
    if (u.group === 'seq') { el.innerHTML = h + UM.seqView(MA, u.book, lessonRated); return; }
    const showRub = u.source !== 'algo';
    const cols = ALG.concat(showRub ? [['|']].concat(RUB) : []);
    h += '<div class="scroll"><table class="heat"><thead><tr><th></th><th class="cg" colspan="' + ALG.length + _t('">Алгоритмические показатели</th>') + (showRub ? '<th></th><th class="cg" colspan="' + RUB.length + _t('">Рубрика – ') + esc({ expert: _t('эксперт ') + u.expert, model: _t('модель ') + u.model, diff: _t('расхождение эксперта и модели') }[u.source]) + '</th>' : '') + (MA ? '<th></th><th class="cg" colspan="2">' + _t('Методика') + '</th>' : '') + '</tr><tr><th>' + (u.group === 'ex' ? _t('Инструкция') : _t('Урок')) + '</th>' +
      cols.map(c => c[0] === '|' ? '<th></th>' : '<th class="n" title="' + esc((R.CRITERIA[c[0]] || R.RUBRIC.find(x => x.code === c[0]) || { long: c[1] }).long || c[1]) + '">' + codeLab(c[0], c[1], '<br>') + '</th>').join('') + (MA ? (u.group === 'ex' ? UM.exHead() : UM.unitHead()) : '') + '</tr></thead><tbody>';
    const rows = A.results.filter(r => u.book === '*' || r.rec.book === u.book);
    let lastB = null, lastU = null;
    if (u.group === 'ex') {
      for (const r of rows) {
        if (r.rec.book !== lastB) { h += '<tr class="bk"><td colspan="' + (cols.length + 1) + '">' + esc(r.rec.book) + '</td></tr>'; lastB = r.rec.book; lastU = null; }
        if (r.rec.unit !== lastU) { h += '<tr class="un"><td colspan="' + (cols.length + 1) + '">' + esc(r.rec.unit || _t('Без урока')) + '</td></tr>'; lastU = r.rec.unit; }
        h += '<tr><td class="lab" data-id="' + r.id + '"><div class="t">' + esc(r.rec.text) + '</div><div class="m">' + esc([r.rec.ex ? 'Ex. ' + r.rec.ex : '', r.rec.section, r.targetName, r.typeName].filter(Boolean).join(' · ')) + '</div></td>' +
          cols.map(c => c[0] === '|' ? '<td class="sep"></td>' : '<td>' + cellHTML(R.CRITERIA[c[0]] ? r.scores[c[0]] : rubricVal(K, r.id, c[0]), c[0] + ' ' + c[1], r.id) + '</td>').join('') + (MA ? UM.exCells(MA, r) : '') + '</tr>';
      }
    } else {
      const units = st.unitAgg.filter(x => u.book === '*' || x.book === u.book);
      for (const x of units) {
        if (x.book !== lastB) { h += '<tr class="bk"><td colspan="' + (cols.length + 1) + '">' + esc(x.book) + '</td></tr>'; lastB = x.book; }
        h += '<tr><td class="lab" data-unit="' + esc(x.key) + '"><div class="t">' + esc(x.label) + '</div><div class="m">' + x.n + ' ' + E.plural(x.n, [_t('инструкция'), _t('инструкции'), _t('инструкций')]) + _t(', проблемных ') + x.problem + '</div></td>' +
          cols.map(c => {
            if (c[0] === '|') return '<td class="sep"></td>';
            let v;
            if (R.CRITERIA[c[0]]) v = x.mean[c[0]];
            else { const vals = x.items.map(r => rubricVal(K, r.id, c[0])).filter(v => v != null && v !== 'na'); v = vals.length ? vals.reduce((s, y) => s + y, 0) / vals.length : null; }
            return '<td>' + cellHTML(v, c[0] + ' ' + c[1] + _t(' (среднее по уроку)'), '', ' data-unit="' + esc(x.key) + '"') + '</td>';
          }).join('') + (MA ? UM.unitCells(MA, x.key, cellHTML) : '') + '</tr>';
      }
    }
    h += _t('</tbody></table></div><p class="note">Цвет показывает выраженность проблемы от 0 до 1. Рубричные баллы 2-1-0 переведены в 0, 0,5 и 1. Клик по строке или ячейке открывает карточку инструкции') + (u.group === 'unit' ? _t(', в режиме уроков – список инструкций урока') : '') + '.</p>';
    el.innerHTML = h;
  }
  function kpi(v, t) { return '<div class="kpi"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>'; }
  function sel(id, arr, val, labels) { return '<select class="inp" id="' + id + '">' + arr.map(x => '<option value="' + esc(x) + '"' + (x === val ? ' selected' : '') + '>' + esc((labels && labels[x]) || x) + '</option>').join('') + '</select>'; }
  $('#v-map').addEventListener('click', e => {
    if (store.mode === 'texts') return;
    const s = e.target.closest('[data-src]'); if (s && !s.disabled) { store.ui.source = s.dataset.src; save(); renderMap(); return; }
    const gq = e.target.closest('[data-g]'); if (gq) { store.ui.group = gq.dataset.g; save(); renderMap(); return; }
    if (e.target.closest('[data-act=sample]')) { loadSample(); return; }
    const t = e.target.closest('[data-id]'); if (t && t.dataset.id) { openCard(t.dataset.id); return; }
    const un = e.target.closest('[data-unit]'); if (un) { store.ui.group = 'ex'; const x = A.stats.unitAgg.find(z => z.key === un.dataset.unit); store.ui.book = st1(x); save(); renderMap(); const first = x && x.items[0]; if (first) { const row = document.querySelector('#v-map td.lab[data-id="' + first.id + '"]'); if (row) row.scrollIntoView({ block: 'center' }); } }
  });
  const st1 = x => x ? x.book : '*';
  $('#v-map').addEventListener('change', e => {
    if (store.mode === 'texts') return;
    if (e.target.id === 'mapVals') store.ui.vals = e.target.checked;
    if (e.target.id === 'mapExpert') store.ui.expert = e.target.value;
    if (e.target.id === 'mapModel') store.ui.model = e.target.value;
    if (e.target.id === 'mapBook') store.ui.book = e.target.value;
    save(); renderMap();
  });

  /* ---------- карточка инструкции ---------- */
  function closeup(r) {
    const text = r.rec.text, N = text.length;
    const lx = new Array(N).fill(-1), gr = new Array(N).fill(-1);
    r.units.forEach((u, ui) => { const a = r.toks[u.tok[0]], b = r.toks[u.tok[u.tok.length - 1]]; for (let i = a.start; i < b.end; i++) lx[i] = ui; });
    r.grammar.slice().sort((a, b) => (b.tier || 0) - (a.tier || 0)).forEach(h => { const gi = r.grammar.indexOf(h); for (let i = h.start; i < h.end; i++) if (gr[i] < 0) gr[i] = gi; });
    let out = '', i = 0;
    while (i < N) {
      let j = i + 1; while (j < N && lx[j] === lx[i] && gr[j] === gr[i]) j++;
      const seg = esc(text.slice(i, j)); const u = lx[i] >= 0 ? r.units[lx[i]] : null; const g = gr[i] >= 0 ? r.grammar[gr[i]] : null;
      const cls = [];
      if (u) { if (u.tier && !u.intro) cls.push(u.tier === 2 ? 'lx2' : 'lx1'); else if (u.tier && u.intro) cls.push('lxi'); if (u.unknown) cls.push('unk'); if (u.metaTerm) cls.push('mt'); }
      if (g && g.tier) cls.push('gr');
      if (cls.length || u || g) out += '<span class="' + cls.join(' ') + '"' + (u ? ' data-u="' + lx[i] + '"' : '') + (g ? ' data-g="' + gr[i] + '"' : '') + '>' + seg + '</span>';
      else out += seg;
      i = j;
    }
    return out;
  }
  function tipFor(r, ui, gi) {
    let h = '';
    if (ui != null && ui !== '') {
      const u = r.units[ui];
      h += '<b>' + esc(u.text) + '</b>' + (u.lemma !== u.text.toLowerCase() ? ' (' + esc(u.lemma) + ')' : '') + ' – ' + (u.lv != null ? E.lvName(u.lv) : _t('уровень не определён')) + '<br><span style="opacity:.8">' + esc(u.src || '') + '</span>';
      if (u.tier) h += '<br>' + (u.tier === 2 ? _t('На два и более уровня выше ') : _t('На уровень выше ')) + r.targetName;
      if (u.intro) h += _t('<br>Флаг снят – ') + (u.intro.by === _t('словник') ? _t('есть в словнике (') : _t('встречалось в инструкциях (')) + esc(u.intro.where) + ')';
      if (u.tier && R.REPLACE[u.lemma]) h += _t('<br>Замена – ') + esc(R.REPLACE[u.lemma]);
    }
    if (gi != null && gi !== '') { const g = r.grammar[gi]; h += (h ? '<hr style="border:0;border-top:1px solid #555;margin:6px 0">' : '') + '<b>' + esc(g.name) + '</b> – ' + g.level + (g.tier ? _t(', выше уровня ') + r.targetName : _t(', в пределах уровня')) + '<br><span style="opacity:.8">' + esc(g.src || '') + '</span>'; }
    return h;
  }
  function bars(r) {
    const desc = {
      A1: r.counts.above + _t(' из ') + r.counts.units + _t(' ед. выше уровня'),
      A2: (n => n + ' ' + E.plural(n, [_t('конструкция'), _t('конструкции'), _t('конструкций')]) + _t(' выше уровня'))(r.grammar.filter(g => g.tier).length),
      A3: r.counts.words + _t(' сл., ') + r.counts.actions + _t(' действ., ') + E.fmt(r.counts.wps, 1) + _t(' сл./предл.'),
      A4: r.meta.filter(m => m.core).length + _t(' терм., выше уровня ') + r.meta.filter(m => m.tier).length,
      A5: r.a5 ? r.a5.k + ' ' + E.plural(r.a5.k, [_t('формулировка'), _t('формулировки'), _t('формулировок')]) + _t(' на ') + r.a5.n + ' ' + E.plural(r.a5.n, [_t('инструкцию'), _t('инструкции'), _t('инструкций')]) + _t(' типа') : _t('тип не определён'),
      D1: r.d1.score == null ? _t('не продуктивное задание') : r.d1.found.length ? r.d1.found.join(', ') : _t('параметры не указаны'),
      D3: r.d3.refs.filter(x => x.kind === 'ex').map(x => x.text + (x.ok ? ' ✓' : _t(' – не найдено'))).join(', ') || _t('нет отсылок к упражнениям'),
      D4: r.d4.notes.join('; ') || _t('признаков не найдено'),
      ISV: _t('взвешенное среднее A1-A4')
    };
    return '<div class="bars">' + ALG.map(([c]) => {
      const v = r.scores[c];
      const k = v > 0 ? Math.min(4, Math.floor(v * 5 - 1e-9)) : -1;
      return '<span title="' + esc(desc[c]) + '">' + codeLab(c, esc(R.CRITERIA[c].name), ' ') + '</span><div><div class="bar' + (v == null ? ' na' : '') + '">' + (v != null ? '<i style="width:' + Math.max(v * 100, 0) + '%;background:' + (k >= 0 ? HEAT[k] : 'transparent') + '"></i>' : '') + '</div><div class="small mute">' + esc(desc[c]) + '</div></div><span class="n">' + (v == null ? '—' : E.fmt(v, 2)) + '</span>';
    }).join('') + '</div>';
  }
  function openCard(id, keep) {
    const r = A && A.results.find(x => x.id === id); if (!r) return;
    curCard = id;
    $('#dTitle').innerHTML = '<div class="small mute">' + esc(r.rec.book) + ' · ' + esc(E.labelOf(r.rec)) + (r.rec.section ? ' · ' + esc(r.rec.section) : '') + _t('</div><div style="font-weight:600;margin-top:2px">Уровень ') + r.targetName + ' · ' + esc(r.typeName) + (r.key ? _t(' · «') + esc(r.key) + _t('»') : '') + '</div>';
    let h = '<div class="closeup" id="cu">' + closeup(r) + '</div>' +
      '<div class="keys"><span><i class="sw" style="background:' + HEAT[1] + _t('"></i>на уровень выше</span><span><i class="sw" style="background:') + HEAT[3] + _t('"></i>на два и более</span><span><i class="sw" style="background:linear-gradient(transparent 55%,') + HEAT[0] + _t(' 55%)"></i>снято по A7</span><span style="text-decoration:underline 2px var(--teal);text-underline-offset:4px">грамматика выше уровня</span><span style="border-bottom:2px dotted var(--ink)">метаязык</span><span style="box-shadow:inset 0 -2px 0 #b9b2a6">нет в списке</span></div>');
    if (r.rec.exercise_text) h += _t('<p class="small"><b>Текст упражнения.</b> <span class="serif">') + esc(r.rec.exercise_text) + '</span></p>';
    h += _t('<h3>Показатели</h3>') + bars(r);
    if (MA) h += UM.cardBlock(MA, r);
    h += _t('<h3>Замечания</h3>') + (r.issues.length ? '<ul class="issues">' + r.issues.map(x => '<li><span class="tag">' + x.c + '</span>' + esc(x.t) + '</li>').join('') + '</ul>' : _t('<p class="mute">Алгоритмические критерии не выявили проблем.</p>'));
    if (r.rewrite) h += _t('<h3>Черновик переформулирования</h3><div class="rw">') + esc(r.rewrite) + _t('</div><div class="row" style="margin-top:6px"><button class="btn sm" data-copy="rw">Копировать</button><span class="small mute">Автоматический черновик – разбивка на шаги и простые замены, требует проверки.</span></div>');
    // рубрика
    h += pairBlock(r);
    const K = rcfg('instr');
    const rs = raters(K).map(x => ({ x, s: raterScores(K, x.key)[r.id] })).filter(y => y.s);
    h += _t('<h3>Рубричные оценки</h3>');
    if (rs.length) {
      h += _t('<div class="scroll"><table><thead><tr><th>Критерий</th>') + rs.map(y => '<th class="n">' + esc(y.x.label) + '</th>').join('') + '</tr></thead><tbody>' +
        R.RUBRIC.map(q => { const vals = rs.map(y => y.s[q.code]); const num = vals.filter(v => v != null && v !== 'na'); const dif = num.length > 1 && new Set(num.map(String)).size > 1; return '<tr><td>' + q.code + ' ' + esc(q.name) + '</td>' + vals.map(v => '<td class="n"><span class="' + (dif ? 'diff' : '') + '">' + (v == null ? '—' : v === 'na' ? _t('н/п') : v) + '</span></td>').join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      Object.entries(store.rubric.models).forEach(([name, m]) => {
        const s = m.scores[r.id]; if (!s) return;
        const lines = Object.entries(s).filter(([, v]) => v && (v.rationale || v.rewrite)).map(([c, v]) => '<li><span class="tag">' + c + '</span>' + esc(v.rationale || '') + (v.evidence ? _t(' <span class="mute">«') + esc(v.evidence) + _t('»</span>') : '') + (v.rewrite ? '<br><span class="serif">' + esc(v.rewrite) + '</span>' : '') + '</li>');
        if (lines.length) h += _t('<p class="small" style="margin-top:10px"><b>Обоснования модели ') + esc(name) + '</b></p><ul class="issues small">' + lines.join('') + '</ul>';
      });
    } else h += _t('<p class="mute small">Оценок пока нет.</p>');
    h += '<button class="btn sm" data-rate="' + r.id + _t('" data-rmode="instr">Оценить по рубрике</button>');
    // подробности
    h += _t('<h3>Лексика</h3><div class="scroll"><table><thead><tr><th>Единица</th><th>Уровень</th><th>Источник</th><th>Статус</th><th>Замена</th></tr></thead><tbody>') +
      r.units.filter(u => u.tier || u.unknown || u.mwe).map(u => '<tr><td class="serif">' + esc(u.text) + (u.lemma !== u.text.toLowerCase() ? ' <span class="mute small">(' + esc(u.lemma) + ')</span>' : '') + '</td><td>' + (u.lv != null ? E.lvName(u.lv) : '—') + '</td><td class="small">' + esc(u.src || '') + '</td><td class="small">' + (u.intro ? _t('снято – ') + esc(u.intro.where) : u.tier === 2 ? _t('+2 и выше') : u.tier === 1 ? '+1' : u.metaTerm ? _t('см. A4') : _t('в пределах уровня')) + '</td><td class="small">' + esc(u.tier ? R.REPLACE[u.lemma] || '' : '') + '</td></tr>').join('') + '</tbody></table></div>';
    h += _t('<p class="small mute">Все лексические единицы – ') + r.units.map(u => esc(u.lemma) + ' ' + (u.lv != null ? E.lvName(u.lv) : '?')).join(', ') + '.</p>';
    if (r.grammar.length) h += _t('<h3>Грамматика</h3><ul class="issues small">') + r.grammar.map(g => '<li>' + esc(g.name) + ' – ' + g.level + _t(' <span class="serif mute">«') + esc(r.rec.text.slice(g.start, g.end)) + _t('»</span>') + (g.tier ? _t(' – выше уровня') : '') + ' <span class="mute">(' + esc(g.src || '') + (g.by === 'parse' ? _t(', разбор') : '') + ')</span></li>').join('') + '</ul>';
    h += parseNote(r);
    h += _t('<h3>Объём</h3><p class="small">Слов ') + r.counts.words + _t(' (норма ') + E.fmt(r.norm.words, 0) + _t('), предложений ') + r.counts.sentences + _t(', слов в предложении ') + E.fmt(r.counts.wps, 1) + _t(' (норма ') + E.fmt(r.norm.wps, 0) + _t('), действий ') + r.counts.actions + _t(' (норма ') + E.fmt(r.norm.actions, 0) + ') – ' + esc(r.actions.map(a => a.verb + (a.org ? _t(' (форма работы)') : '')).join(', ') || '—') + _t(', слов на действие ') + E.fmt(r.counts.wpa, 1) + '.</p>';
    if (r.a5) h += _t('<h3>Единообразие</h3><p class="small">Формулировки типа «') + esc(r.typeName) + _t('» в учебнике – ') + r.a5.keys.map(k => _t('«') + esc(k[0]) + _t('» ') + k[1]).join(', ') + '.</p>';
    if (r.d3.refs.length) h += _t('<p class="small"><b>Отсылки.</b> ') + r.d3.refs.map(x => esc(x.text) + (x.ok === true ? _t(' – найдено') : x.ok === false ? _t(' – не найдено в данных') : _t(' – проверить вручную'))).join('; ') + '.</p>';
    h += _t('<p class="small mute">Справочно – индекс Флеша-Кинкейда ') + E.fmt(r.fk, 1) + _t(', лёгкость чтения по Флешу ') + E.fmt(r.fre, 0) + _t('. На коротких текстах эти индексы ненадёжны.</p>');
    $('#dBody').innerHTML = h;
    if (!keep) $('#dBody').scrollTop = 0;
    $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
  }
  /* Тексты, к которым относится инструкция, – сопоставление для R6 */
  function pairBlock(r) {
    const ps = P.filter(p => p.instr.id === r.id); if (!ps.length) return '';
    return _t('<h3>Текст упражнения и критерий R6</h3><div class="scroll"><table class="tight"><thead><tr><th>Текст</th><th class="n">Лексика инстр.</th><th class="n">Лексика текста</th><th class="n">Грамм. инстр.</th><th class="n">Грамм. текста</th><th class="n">ИСВ − ИСТ</th><th class="n">R6</th></tr></thead><tbody>') +
      ps.map(p => '<tr><td><a href="#" data-open="' + p.text.id + '">' + esc(p.text.rec.title || _t('текст без заголовка')) + '</a></td><td class="n">' + E.lvName(p.iLex) + '</td><td class="n">' + E.lvName(p.tLex) + '</td><td class="n">' + (p.iGr ? E.lvName(p.iGr) : '—') + '</td><td class="n">' + (p.tGr ? E.lvName(p.tGr) : '—') + '</td><td class="n">' + f2(p.dIdx) + '</td><td>' + cellHTML(p.P, _t('Превышение инструкции над текстом'), '') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p class="small mute">' + (ps.some(p => p.harder) ? _t('Инструкция сложнее текста и выходит за заявленный уровень – стоит проверить по R6.') : _t('Инструкция не сложнее своего текста.')) + _t(' Уровни – порог покрытия ') + T.settings.covLevel + _t(' % для лексики и P90 для грамматики, одна формула для инструкции и текста.</p>');
  }
  function parseNote(r) {
    const p = r.parse; if (!p || !p.matched) return '';
    if (!p.ok) return _t('<p class="note">Разбор найден, но не привязан – совпало ') + Math.round(p.coverage * 100) + _t(' % слов. Грамматика определена правилами.</p>');
    return _t('<p class="note">Грамматика уточнена по синтаксическому разбору (') + esc(p.parser || _t('анализатор не указан')) + ').' + (p.dropped && p.dropped.length ? _t(' Сняты – ') + esc(p.dropped.map(d => d.id + _t(' «') + d.text + _t('» (') + d.why + ')').join('; ')) + '.' : '') + '</p>';
  }
  function closeCard() { curCard = null; $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); hideTip(); }
  $('#dClose').onclick = closeCard; $('#scrim').onclick = closeCard;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
  $('#dBody').addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'); if (c) { const r = A.results.find(x => x.id === curCard); copy(r.rewrite); return; }
    const op = e.target.closest('[data-open]'); if (op) { e.preventDefault(); const id = op.dataset.open; if (A && A.results.find(x => x.id === id)) openCard(id); else TX.openCard(id); return; }
    const rt = e.target.closest('[data-rate]'); if (rt) { const m = rt.dataset.rmode || 'instr'; rcfg(m).ui.cur = rt.dataset.rate; closeCard(); if (m !== store.mode) { store.mode = m; save(); renderAll(); renderSettings(); } renderRubric(); show('rubric'); return; }
    const sp = e.target.closest('#cu span[data-u],#cu span[data-g]'); if (sp) showTip(sp, true);
  });
  $('#dBody').addEventListener('mouseover', e => { const sp = e.target.closest('#cu span[data-u],#cu span[data-g]'); if (sp) showTip(sp); });
  $('#dBody').addEventListener('mouseout', e => { if (e.target.closest('#cu span')) hideTip(); });
  function showTip(sp) {
    const r = findResult(curCard); if (!r) return;
    const h = tipFor(r, sp.dataset.u, sp.dataset.g); if (!h) return;
    const t = $('#tip'); t.innerHTML = h; t.style.display = 'block';
    const b = sp.getBoundingClientRect(); const tw = t.offsetWidth, th = t.offsetHeight;
    let x = Math.min(window.innerWidth - tw - 8, Math.max(8, b.left)); let y = b.bottom + 8; if (y + th > window.innerHeight - 8) y = b.top - th - 8;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { $('#tip').style.display = 'none'; }
  $('#dBody').addEventListener('scroll', hideTip);

  /* ---------- статистика ---------- */
  function renderStats() {
    if (store.mode === 'texts') { TX.renderStats(); return; }
    const el = $('#v-stats');
    if (!A) { el.innerHTML = _t('<div class="empty">Нет данных.</div>'); return; }
    const st = A.stats, S = store.settings, n = st.n;
    const d = st.dist, tot = d.at + d.t1 + d.t2 + d.intro;
    let h = _t('<h2>Статистика корпуса</h2><div class="kpis">') + kpi(n, _t('инструкций')) + kpi(st.books.length, _t('учебников')) + kpi(st.units, _t('уроков')) + kpi(f2(st.crit.ISV.mean), _t('средний ИСВ (медиана ') + f2(st.crit.ISV.med) + ')') + kpi(E.pct(st.crit.ISV.problem, n), _t('инструкций с ИСВ ≥ ') + E.fmt(S.problemISV, 2)) + '</div>';
    h += _t('<div class="row" style="margin-bottom:16px"><button class="btn" data-exp="csv">Скачать результаты CSV</button><button class="btn" data-exp="json">Скачать протокол JSON</button><span class="small mute">Протокол содержит версии эталонов, настройки и все исходные оценки для воспроизведения результата.</span></div>');
    const parts = [[_t('на уровне и ниже'), d.at, '#ffffff'], [_t('снято по A7'), d.intro, HEAT[0]], [_t('на уровень выше'), d.t1, HEAT[1]], [_t('на два и более'), d.t2, HEAT[3]]];
    h += _t('<div class="grid2"><div class="box"><h3 style="margin-top:0">Лексика инструкций относительно уровня</h3><div class="sbar">') + parts.map(p => p[1] ? '<i title="' + esc(p[0] + ' – ' + p[1]) + '" style="width:' + (p[1] / tot * 100) + '%;background:' + p[2] + '"></i>' : '').join('') + '</div><div class="legend" style="margin-top:8px">' + parts.map(p => '<span><i style="background:' + p[2] + '"></i> ' + p[0] + ' – ' + p[1] + ' (' + E.pct(p[1], tot) + ')</span>').join('') + '</div>' +
      _t('<p class="small mute" style="margin-top:8px">По уровням списка – ') + ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', _t('вне списка')].filter(k => st.byLevel[k]).map(k => k + ' ' + st.byLevel[k]).join(', ') + _t('. Единицы – слова, устойчивые сочетания и фразовые глаголы.</p></div>');
    h += _t('<div class="box"><h3 style="margin-top:0">Объём</h3><table><tbody>') +
      [[_t('Слов в инструкции'), st.counts.words], [_t('Слов в предложении'), st.counts.wps], [_t('Действий в инструкции'), st.counts.actions], [_t('Флеш-Кинкейд (справочно)'), st.counts.fk]].map(([t, x]) => '<tr><td>' + t + '</td><td class="n">' + E.fmt(x.mean, 1) + _t('</td><td class="n mute small">медиана ') + E.fmt(x.med, 1) + ', ' + E.fmt(x.min, 0) + '-' + E.fmt(x.max, 0) + '</td></tr>').join('') + '</tbody></table></div></div>';
    h += _t('<h3>Показатели по критериям</h3><div class="scroll"><table><thead><tr><th>Код</th><th>Критерий</th><th class="n">n</th><th class="n">Среднее</th><th class="n">Медиана</th><th class="n">SD</th><th class="n">Мин-макс</th><th class="n">≥ порога</th></tr></thead><tbody>') +
      E.CRIT.map(c => { const x = st.crit[c]; return '<tr><td><b>' + c + '</b></td><td>' + esc(R.CRITERIA[c].long) + '</td><td class="n">' + (x.n || 0) + '</td><td class="n">' + f2(x.mean) + '</td><td class="n">' + f2(x.med) + '</td><td class="n">' + f2(x.sd) + '</td><td class="n">' + (x.n ? E.fmt(x.min, 2) + '-' + E.fmt(x.max, 2) : '—') + '</td><td class="n">' + (x.n ? x.problem + ' (' + E.pct(x.problem, x.n) + ')' : '—') + '</td></tr>'; }).join('') +
      _t('</tbody></table></div><p class="note">Порог проблемы по критерию – ') + E.fmt(S.problemCrit, 2) + _t(', по ИСВ – ') + E.fmt(S.problemISV, 2) + _t('. Для D1 n – число продуктивных заданий, для D3 – инструкций с отсылками к упражнениям, для A5 – инструкций типов, встречающихся в учебнике не меньше трёх раз.</p>');
    // карта учебников и уроков
    const crit = ALG;
    const aggTable = (arr, title, lab) => '<h3>' + title + '</h3><div class="scroll"><table class="heat"><thead><tr><th>' + lab + '</th><th class="n">n</th>' + crit.map(c => '<th class="n">' + codeLab(c[0], c[1], '<br>') + '</th>').join('') + '</tr></thead><tbody>' +
      arr.map(x => '<tr><td class="lab" style="cursor:default"><div class="t">' + esc(x.label) + '</div>' + (lab === _t('Урок') && st.books.length > 1 ? '<div class="m">' + esc(x.book) + '</div>' : '') + '</td><td class="n small">' + x.n + '</td>' + crit.map(c => '<td>' + cellHTML(x.mean[c[0]], c[0] + ' ' + c[1] + _t(' – среднее'), '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    if (st.books.length > 1) h += aggTable(st.bookAgg, _t('Сравнительная карта учебников'), _t('Учебник'));
    h += aggTable(st.unitAgg, _t('Карта по урокам'), _t('Урок'));
    h += aggTable(st.typeAgg.sort((a, b) => b.n - a.n), _t('Карта по типам заданий'), _t('Тип задания'));
    // слова
    h += _t('<h3>Слова и сочетания выше уровня</h3>') + (st.topWords.length ? _t('<div class="scroll"><table><thead><tr><th>Единица</th><th>Уровень</th><th class="n">Инструкций</th><th class="n">Употреблений</th><th class="n">Снято A7</th><th>Возможная замена</th><th>Источник уровня</th></tr></thead><tbody>') +
      st.topWords.slice(0, 40).map(w => '<tr><td class="serif">' + esc(w.lemma) + '</td><td>' + esc(w.level) + '</td><td class="n">' + w.inst + '</td><td class="n">' + w.count + '</td><td class="n">' + (w.intro || '') + '</td><td>' + esc(w.repl) + '</td><td class="small mute">' + esc(w.src) + '</td></tr>').join('') + '</tbody></table></div>' : _t('<p class="mute">Нет.</p>'));
    h += _t('<div class="grid2"><div><h3>Грамматические конструкции</h3>') + (st.grammar.length ? _t('<table><thead><tr><th>Конструкция</th><th>Уровень</th><th class="n">Всего</th><th class="n">Выше уровня</th></tr></thead><tbody>') + st.grammar.map(g => '<tr><td>' + esc(g.name) + '</td><td>' + g.level + '</td><td class="n">' + g.total + '</td><td class="n">' + g.above + '</td></tr>').join('') + '</tbody></table>' : _t('<p class="mute">Не найдено.</p>')) + '</div>' +
      _t('<div><h3>Метаязык</h3>') + (st.meta.length ? _t('<table><thead><tr><th>Термин</th><th>Допустим с</th><th class="n">Всего</th><th class="n">Выше уровня</th></tr></thead><tbody>') + st.meta.map(m => '<tr><td class="serif">' + esc(m.term) + '</td><td>' + m.level + '</td><td class="n">' + m.total + '</td><td class="n">' + m.above + '</td></tr>').join('') + '</tbody></table>' : _t('<p class="mute">Терминов не найдено.</p>')) + '</div></div>';
    h += _t('<h3>Единообразие формулировок (A5)</h3>') + (st.variability.length ? _t('<div class="scroll"><table><thead><tr><th>Учебник</th><th>Тип задания</th><th class="n">Инструкций</th><th class="n">Формулировок</th><th class="n">Индекс V</th><th>Формулировки</th></tr></thead><tbody>') +
      st.variability.map(v => '<tr><td>' + esc(v.book) + '</td><td>' + esc(v.typeName) + '</td><td class="n">' + v.n + '</td><td class="n">' + v.k + '</td><td class="n">' + f2(v.V) + '</td><td class="serif small">' + v.keys.map(k => esc(k[0]) + ' (' + k[1] + ')').join(', ') + '</td></tr>').join('') + _t('</tbody></table></div><p class="note">Индекс вариативности V = (k − 1) / (n − 1), где k – число формулировок, n – число инструкций типа. 0 – одна формулировка для всех инструкций, 1 – у каждой инструкции своя.</p>') : _t('<p class="mute">Тип заданий не определён.</p>'));
    if (MA) h += UM.statsBlock(MA, cellHTML, kpi);
    el.innerHTML = h;
  }
  $('#v-stats').addEventListener('click', e => { if (store.mode === 'texts') return; const b = e.target.closest('[data-exp]'); if (!b) return; b.dataset.exp === 'csv' ? exportCSV() : exportJSON(); });
  function exportCSV() {
    const head = ['id', 'book', 'unit', 'section', 'ex', 'level_declared', 'level_analysed', 'text', 'task_type', 'formulation', 'words', 'sentences', 'actions', 'words_per_sentence', 'units', 'units_above', 'above_list', 'introduced_list', 'grammar_above', 'meta_terms', 'A1', 'A2', 'A3', 'A4', 'A5', 'D1', 'D3', 'D4', 'ISV', 'FK_grade', 'rewrite_draft'].concat(MA ? UM.CSV_HEAD : []);
    const rows = [head].concat(A.results.map(r => [r.id, r.rec.book, r.rec.unit, r.rec.section, r.rec.ex, r.rec.level, r.targetName, r.rec.text, r.typeName, r.key, r.counts.words, r.counts.sentences, r.counts.actions, E.fmt(r.counts.wps, 2), r.counts.units, r.counts.above,
      r.units.filter(u => u.tier && !u.intro).map(u => u.lemma + ' ' + E.lvName(u.lv)).join(', '), r.units.filter(u => u.tier && u.intro).map(u => u.lemma).join(', '),
      r.grammar.filter(g => g.tier).map(g => g.name + ' ' + g.level).join(', '), r.meta.filter(m => m.core).map(m => m.term).join(', '),
      ...['A1', 'A2', 'A3', 'A4', 'A5', 'D1', 'D3', 'D4', 'ISV'].map(c => r.scores[c] == null ? '' : E.fmt(r.scores[c], 3)), E.fmt(r.fk, 2), r.rewrite || ''].concat(MA ? UM.csvCells(MA, r) : [])));
    download('instructions-results-' + stamp() + '.csv', '﻿' + E.toCSV(rows), 'text/csv;charset=utf-8');
  }
  function exportJSON() {
    const out = { tool: _t('Анализатор учебника (Textbook Analyzer)'), mode: 'instructions', meta: Object.assign({ ui: UI_VERSION }, A.meta), rubricVersion: R.RUBRIC_VERSION, promptVersion: PROMPT_VERSION,
      results: A.results.map(r => ({ id: r.id, record: r.rec, level: r.targetName, type: r.typeName, formulation: r.key, counts: r.counts, scores: r.scores,
        units: r.units.map(u => ({ text: u.text, lemma: u.lemma, level: u.lv == null ? null : E.lvName(u.lv), source: u.src, tier: u.tier || 0, introduced: u.intro || null, meta: !!u.metaTerm })),
        grammar: r.grammar.map(g => ({ name: g.name, level: g.level, fragment: r.rec.text.slice(g.start, g.end), above: !!g.tier })), meta: r.meta, issues: r.issues, rewrite: r.rewrite })),
      rubric: store.rubric, conclusions: A.conclusions, method: UM.exportPart(MA) };
    download('instructions-protocol-' + stamp() + '.json', JSON.stringify(out, null, 1), 'application/json');
  }

  /* ---------- выводы ---------- */
  function conclText() { return A.conclusions.concat(MA ? MA.conclusions : [], T ? X.pairConclusions(P, U) : []).map(c => c.title + '\n' + c.text).join('\n\n'); }
  function renderConcl() {
    if (store.mode === 'texts') { TX.renderConcl(); return; }
    const el = $('#v-concl');
    if (!A) { el.innerHTML = _t('<div class="empty">Нет данных.</div>'); return; }
    el.innerHTML = _t('<h2>Выводы</h2><div class="row" style="margin-bottom:10px"><button class="btn" data-c="copy">Копировать</button><button class="btn" data-c="txt">Скачать .txt</button></div>') +
      _t('<p class="small mute">Выводы сформированы автоматически по правилам из рассчитанных показателей. Они описывают зоны, которые требуют экспертного взгляда, и не заменяют экспертную оценку.</p><div class="concl">') +
      A.conclusions.concat(MA ? MA.conclusions : [], T ? X.pairConclusions(P, U) : []).map(c => '<h3><span class="tag">' + _t(c.c) + '</span>' + esc(c.title) + '</h3><p>' + esc(c.text) + '</p>').join('') + '</div>' +
      _t('<p class="note">Протокол – ') + esc(A.meta.engine) + ', ' + esc(A.meta.core) + ', ' + esc(A.meta.resources) + (MA ? ', ' + esc(MA.version) : '') + _t(', список лексики ') + esc(A.meta.lexicon) + ' (' + A.meta.lexiconSize + _t(' ед.), ') + new Date(A.meta.date).toLocaleString(window.IA_I18N ? IA_I18N.locale : 'ru-RU') + '.</p>';
  }
  $('#v-concl').addEventListener('click', e => { if (store.mode === 'texts') return; const b = e.target.closest('[data-c]'); if (!b) return; b.dataset.c === 'copy' ? copy(conclText()) : download('instructions-conclusions-' + stamp() + '.txt', conclText()); });

  /* ---------- данные ---------- */
  function initData() {
    const I = store.input;
    $('#tLevel').innerHTML = LEVELS.map(l => '<option' + (l === I.level ? ' selected' : '') + '>' + l + '</option>').join('');
    $('#txtIn').value = I.text; $('#csvIn').value = I.csv; $('#tBook').value = I.book; $('#tAspect').value = I.aspect; $('#tAud').value = I.aud;
    setMode(I.mode);
    vocInfo();
  }
  function setMode(m) { store.input.mode = m; document.querySelectorAll('#inMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); $('#inText').hidden = m !== 'text'; $('#inCsv').hidden = m !== 'csv'; }
  $('#inMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { setMode(b.dataset.m); save(); } });
  [['#txtIn', 'text'], ['#csvIn', 'csv'], ['#tBook', 'book'], ['#tLevel', 'level'], ['#tAspect', 'aspect'], ['#tAud', 'aud']].forEach(([s, k]) => $(s).addEventListener('input', e => { store.input[k] = e.target.value; save(); }));
  $('#tLevel').addEventListener('change', e => { store.input.level = e.target.value; save(); });
  $('#btnRun').onclick = () => { save(); run(); if (A) show('map'); };
  $('#btnSample').onclick = loadSample;
  $('#btnClear').onclick = () => { store.input.text = ''; store.input.csv = ''; initData(); save(); run(true); };
  $('#csvFile').addEventListener('change', e => readFile(e.target.files[0], t => { store.input.csv = t; $('#csvIn').value = t; setMode('csv'); save(); run(); }));
  function readFile(f, cb) { if (!f) return; const fr = new FileReader(); fr.onload = () => cb(String(fr.result)); fr.readAsText(f, 'utf-8'); }
  function loadSample() {
    store.input.csv = window.IA_SAMPLE.csv; store.input.mode = 'csv';
    store.vocab = parseVocab(window.IA_SAMPLE.vocab); store.vocabName = _t('пример словника');
    initData(); save(); run(); show('map');
  }
  function parseVocab(text) {
    const rows = E.parseCSV(text); if (!rows.length) return [];
    const head = rows[0].map(h => h.toLowerCase().trim());
    let bi = head.findIndex(h => /^(book|учебник)$/.test(h)), ui = head.findIndex(h => /^(unit|урок|lesson)$/.test(h)), wi = head.findIndex(h => /^(word|слово|lemma|headword)$/.test(h));
    let start = 1;
    if (wi < 0) { start = 0; if (rows[0].length >= 3) { bi = 0; ui = 1; wi = 2; } else if (rows[0].length === 2) { ui = 0; wi = 1; } else wi = 0; }
    return rows.slice(start).map(r => ({ book: bi >= 0 ? (r[bi] || '').trim() : '', unit: ui >= 0 ? (r[ui] || '').trim() : '', word: (r[wi] || '').trim() })).filter(v => v.word);
  }
  function vocInfo() { $('#vocInfo').textContent = store.vocab.length ? _t('Словник – ') + store.vocab.length + _t(' слов') + (store.vocabName ? ' (' + store.vocabName + ')' : '') : _t('Словник не загружен'); }
  $('#vocFile').addEventListener('change', e => { const f = e.target.files[0]; readFile(f, t => { store.vocab = parseVocab(t); store.vocabName = f.name; vocInfo(); save(); run(true); toast(_t('Словник загружен – ') + store.vocab.length + _t(' слов')); }); });
  $('#vocSample').onclick = () => { store.vocab = parseVocab(window.IA_SAMPLE.vocab); store.vocabName = _t('пример словника'); vocInfo(); save(); run(true); };
  $('#vocClear').onclick = () => { store.vocab = []; store.vocabName = ''; vocInfo(); save(); run(true); };
  /* ---------- синтаксический разбор ---------- */
  function parseLine(R0, what) {
    const m = R0 && R0.meta.parse; if (!m) return '';
    return what + _t(' – разбор найден для ') + m.matched + _t(' из ') + m.records + (m.lowCoverage ? _t(', не привязан из-за расхождения токенов ') + m.lowCoverage : '') + _t('; добавлено конструкций ') + m.added + _t(', снято ') + m.dropped + '.';
  }
  function renderParse() {
    const el = $('#parseBox'); if (!el) return;
    const S = store.settings;
    let h = _t('<h3 style="margin-top:0">Синтаксический разбор (по желанию, общий для инструкций и текстов)</h3>') +
      _t('<p class="small mute">Без разбора грамматика и придаточные определяются правилами анализатора. Разбор готовит внешний анализатор (spaCy, Stanza или UDPipe) в формате CoNLL-U. С разбором правила уточняются по частям речи и зависимостям, повелительное наклонение и настоящее простое время выделяются отдельно, а придаточные для T3 считаются по дереву.</p>') +
      _t('<ol class="small" style="margin:6px 0 10px 18px;padding:0"><li>Скачайте тексты для разбора.</li><li>Запустите на своём компьютере <code>python3 tools/parse_texts.py texts-for-parsing.jsonl -o parsed.conllu</code> (установка spaCy описана в начале скрипта и в руководстве).</li><li>Загрузите parsed.conllu.</li></ol>') +
      _t('<div class="row"><button class="btn sm" id="parseExport">Скачать тексты для разбора (.jsonl)</button><label class="btn sm" style="cursor:pointer">Загрузить разбор (.conllu)<input type="file" id="parseFile" accept=".conllu,.conll,.txt" hidden></label>') + (PS ? _t('<button class="btn sm" id="parseClear">Убрать разбор</button>') : '') + '</div>';
    if (PS) {
      h += _t('<p class="small" style="margin-top:10px">Загружен – <b>') + esc(PS.name || _t('файл без названия')) + '</b>, ' + PS.nDocs + ' ' + E.plural(PS.nDocs, [_t('документ'), _t('документа'), _t('документов')]) + _t(', анализатор – ') + esc(PS.parser) + (parseSaved ? '' : _t('. Файл слишком большой для хранилища браузера – после перезагрузки страницы его нужно загрузить снова')) + '.</p>' +
        '<label class="chk"><input type="checkbox" id="useParse"' + (S.useParse !== false ? ' checked' : '') + _t('><span>Учитывать разбор при анализе (без отметки – только правила, для сравнения)</span></label>') +
        '<p class="small">' + [parseLine(A, _t('Инструкции')), parseLine(T, _t('Тексты'))].filter(Boolean).map(esc).join('<br>') + '</p>' +
        _t('<p class="note">Разбор сопоставляется с записью по тексту – если текст изменился после разбора, запись анализируется без него. Срабатывания по разбору отмечены в карточке пометкой «разбор».</p>');
    }
    el.innerHTML = h;
  }
  function parseExport() {
    const seen = new Set(), lines = [];
    [[A, 'instruction'], [T, 'text']].forEach(([R0, kind]) => (R0 ? R0.results : []).forEach(r => {
      const k = window.IA_PARSE.keyOf(r.rec.text); if (!k || seen.has(k)) return; seen.add(k);
      lines.push(JSON.stringify({ id: r.id, kind, text: kind === 'instruction' ? String(r.rec.text).trim() : r.rec.text }));
    }));
    if (!lines.length) { toast(_t('Нет данных – сначала загрузите инструкции или тексты')); return; }
    download('texts-for-parsing.jsonl', lines.join('\n') + '\n', 'application/x-ndjson;charset=utf-8');
    toast(_t('Записей для разбора – ') + lines.length);
  }
  $('#v-data').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'parseExport') parseExport();
    if (b.id === 'parseClear') { PS = null; parseSaved = false; try { localStorage.removeItem(PARSE_LS); } catch (x) { } save(); run(true); toast(_t('Разбор убран')); }
  });
  $('#v-data').addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'useParse') { store.settings.useParse = t.checked; save(); run(true); return; }
    if (t.id !== 'parseFile') return;
    const f = t.files[0];
    readFile(f, txt => {
      const parsed = window.IA_PARSE.parseConllu(txt);
      if (!parsed.docs.length) { toast(_t('В файле не найдено ни одного предложения в формате CoNLL-U')); return; }
      PS = window.IA_PARSE.makeStore(parsed, f.name);
      try { localStorage.setItem(PARSE_LS, JSON.stringify({ name: f.name, text: txt })); parseSaved = true; } catch (x) { parseSaved = false; }
      if (store.settings.useParse === false) store.settings.useParse = true;
      save(); run(true); toast(_t('Разбор загружен – ') + parsed.docs.length + _t(' документов'));
    });
  });
  function renderPreview() {
    const el = $('#preview');
    if (!A) { el.innerHTML = _t('<p class="mute">Пока нет.</p>'); return; }
    el.innerHTML = _t('<table><thead><tr><th>Учебник</th><th>Уровень</th><th>Урок</th><th>Упр.</th><th>Аспект</th><th>Инструкция</th></tr></thead><tbody>') +
      A.results.slice(0, 200).map(r => '<tr><td>' + esc(r.rec.book) + '</td><td>' + esc(r.rec.level || '—') + '</td><td>' + esc(r.rec.unit || '') + '</td><td>' + esc(r.rec.ex || '') + '</td><td>' + esc(r.rec.aspect || '') + '</td><td class="serif">' + esc(r.rec.text) + '</td></tr>').join('') + '</tbody></table>' + (A.results.length > 200 ? _t('<p class="note">Показаны первые 200.</p>') : '');
  }

  /* ---------- настройки ---------- */
  function renderSettings() {
    if (store.mode === 'texts') TX.renderSettings(); else renderSettingsInstr();
    const el = $('#v-settings'), g = el.querySelector('.grid2');
    if (g) g.insertAdjacentHTML('beforebegin', groqSettingsHTML()); else el.insertAdjacentHTML('beforeend', groqSettingsHTML());
  }
  /* Ключ Groq – общий для оценки по рубрике и для поиска инструкций при импорте */
  function groqSettingsHTML() {
    const gk = groqKey(), gm = groqDefaultModel();
    return _t('<div class="box" id="groqBox" style="margin-bottom:18px"><h3 style="margin-top:0">Языковая модель – ключ Groq</h3>') +
      _t('<p class="small">Ключ нужен для двух вещей – оценки инструкций и текстов по рубрике (вкладка «Рубрика») и поиска инструкций в учебнике при импорте (вкладка «Данные»). Без ключа всё остальное работает, а модель можно заменить ручным способом – промпт копируется в любой чат.</p>') +
      _t('<div class="grid2" style="gap:10px 18px"><label class="f">Ключ API Groq<input id="sgKey" type="password" autocomplete="off" placeholder="gsk_…" value="') + esc(gk) + '"></label>' +
      _t('<label class="f">Модель по умолчанию<select id="sgModel">') + GROQ_MODELS.map(m => '<option' + (m === gm ? ' selected' : '') + '>' + m + '</option>').join('') + (GROQ_MODELS.includes(gm) ? '' : '<option selected>' + esc(gm) + '</option>') + '</select></label></div>' +
      '<label class="chk"><input type="checkbox" id="sgRemember"' + (localGet(GROQ_LS) ? ' checked' : '') + _t('><span>Запомнить ключ в этом браузере</span></label>') +
      _t('<div class="row"><button class="btn sm" id="sgTest">Проверить ключ</button><span class="small" id="sgStatus"></span></div>') +
      _t('<p class="note">Ключ создаётся бесплатно на console.groq.com – раздел API Keys, кнопка Create API Key. Ключ хранится только в этом браузере и не попадает в экспорт, протокол и файлы инструмента, поэтому его не будет и на GitHub.</p></div>');
  }
  function renderSettingsInstr() {
    const S = store.settings, el = $('#v-settings');
    const lvOpts = (v, extra) => (extra || []).concat(LEVELS).map(l => '<option value="' + l + '"' + (l === v ? ' selected' : '') + '>' + ({ ignore: _t('не учитывать') }[l] || l) + '</option>').join('');
    const num = (id, v, min, max, step, lab, note) => '<label class="f">' + lab + '<input type="number" data-s="' + id + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>' + (note ? '<div class="note">' + note + '</div>' : '');
    const chk = (id, v, lab) => '<label class="chk"><input type="checkbox" data-s="' + id + '"' + (v ? ' checked' : '') + '><span>' + lab + '</span></label>';
    const wsum = Object.values(S.weights).reduce((s, x) => s + x, 0) || 1;
    let h = _t('<h2>Настройки анализа</h2><p class="mute">Изменения применяются сразу. Все значения записываются в протокол JSON вместе с результатами.</p><div class="grid2">');
    h += _t('<div class="box"><h3 style="margin-top:0">Уровень</h3><div class="seg" style="margin-bottom:10px"><button data-lm="data" aria-pressed="') + (S.levelMode === 'data') + _t('">Из данных</button><button data-lm="fixed" aria-pressed="') + (S.levelMode === 'fixed') + _t('">Задать для всех</button></div>') +
      (S.levelMode === 'fixed' ? _t('<label class="f">Уровень группы для анализа<select data-s="fixedLevel">') + lvOpts(S.fixedLevel) + _t('</select></label><div class="note">Режим преподавателя – инструкции любого учебника оцениваются относительно уровня конкретной группы.</div>') :
        _t('<label class="f">Уровень, если в данных он не указан<select data-s="defaultLevel">') + lvOpts(S.defaultLevel) + '</select></label>') +
      _t('<h3>Профиль строгости</h3><div class="seg">') + [['strict', _t('Строгий')], ['standard', _t('Стандартный')], ['soft', _t('Мягкий')]].map(([k, t]) => '<button data-prof="' + k + '" aria-pressed="' + (S.profile === k) + '">' + t + '</button>').join('') + _t('</div><div class="note">Профиль задаёт допуск по лексике, насыщение шкалы, порог ИСВ и нормы объёма. Строгий подходит для младших школьников и начальных уровней, мягкий – для взрослых с опытом изучения языка. После выбора профиля значения можно уточнить вручную.</div></div>');
    h += _t('<div class="box"><h3 style="margin-top:0">Лексика (A1)</h3>') + num('tolerance', S.tolerance, 0, 50, 1, _t('Допустимая взвешенная доля слов выше уровня, %')) + num('saturation', S.saturation, 1, 100, 1, _t('Доля, при которой шкала достигает 1, %'), _t('Слово на уровень выше весит 0,5, на два и более – 1.')) +
      _t('<label class="f" style="margin-top:8px">Слова, которых нет в списке<select data-s="unknownLevel">') + lvOpts(S.unknownLevel, ['ignore']) + '</select></label>' + chk('useSenses', S.useSenses, _t('Учитывать инструктивные значения многозначных слов (match – «соотнести», box – «рамка»)')) +
      _t('<h3>Список лексики</h3><label class="f">Основной список<select data-s="lexBase"><option value="cefrj"') + (S.lexBase !== 'builtin' ? ' selected' : '') + '>CEFR-J 1.5 + Octanove C1/C2 (' + (window.IA_CEFRJ ? window.IA_CEFRJ.size : 0) + _t(' ед.)</option><option value="builtin"') + (S.lexBase === 'builtin' ? ' selected' : '') + _t('>Встроенный рабочий (') + window.IA_LEXICON.size + _t(' ед., уровни приблизительные)</option></select></label>') + (S.lexBase !== 'builtin' ? chk('lexFallback', S.lexFallback, _t('Для слов, которых нет в CEFR-J, брать уровень из встроенного рабочего списка')) : '') + _t('<div class="note">У слов с разными уровнями для разных частей речи берётся самый низкий, для глаголов-установок (Match, Complete, Underline) – уровень глагола.</div>') +
      _t('<h3>Дополнительный список</h3><p class="small">') + (store.userLex ? _t('Загружен – <b>') + esc(store.userLex.id) + '</b>, ' + store.userLex.size + _t(' ед.') : _t('Не загружен. Можно добавить свой список, например Oxford 3000/5000.')) + '</p>' +
      _t('<label class="f">Название и версия списка<input id="lexName" placeholder="Oxford 3000, 2023" value="') + esc(store.userLex ? store.userLex.id : '') + '"></label><div class="row" style="margin-top:8px"><input type="file" id="lexFile" accept=".csv,.tsv,.txt" class="inp">' + (store.userLex ? _t('<button class="btn sm" id="lexDel">Убрать</button>') : '') + '</div>' +
      '<div class="seg" style="margin-top:8px"><button data-lex="augment" aria-pressed="' + (S.lexMode !== 'replace') + _t('">Дополнить основной</button><button data-lex="replace" aria-pressed="') + (S.lexMode === 'replace') + _t('">Заменить основной</button></div><div class="note">CSV со столбцами headword (или word) и CEFR (или level). Подходит формат CEFR-J Wordlist – варианты через «/» разбираются.</div></div>');
    h += _t('<div class="box"><h3 style="margin-top:0">Введённость лексики (A7)</h3>') + chk('useVocab', S.useVocab, _t('Снимать флаг, если слово есть в словнике учебника в этом или более раннем уроке')) + chk('useHistory', S.useHistory, _t('Снимать флаг, если слово уже встречалось в предыдущих инструкциях учебника')) + num('historyMin', S.historyMin, 1, 10, 1, _t('Сколько раз слово должно встретиться раньше')) + _t('<div class="note">Словник загружается во вкладке «Данные».</div></div>');
    const SN = S.senses || R.SENSES;
    h += _t('<div class="box"><h3 style="margin-top:0">Грамматика (A2)</h3><label class="f">Уровни конструкций<select data-s="grammarSource">') + [['egp', _t('English Grammar Profile (столбец EGP в CEFR-J Grammar Profile)')], ['cefrj', _t('CEFR-J Grammar Profile (уровень CEFR-J)')], ['working', _t('Рабочая таблица анализатора')]].map(([k, t]) => '<option value="' + k + '"' + (S.grammarSource === k ? ' selected' : '') + '>' + t + '</option>').join('') + _t('</select></label><div class="note">Для EGP берётся нижняя граница диапазона (A2-B2 – A2), то есть уровень, с которого конструкция появляется в речи учащихся. Уровни CEFR-J выведены из частотности в учебниках и часто ниже. Конструкции, которых нет в профиле (нереальное условие, unless, although, while), получают рабочий уровень.</div>') +
      _t('<h3>Словарь инструктивных значений</h3><p class="small">Уровень, который получает слово в учебном значении, если он ниже уровня по списку. Строка – слово; уровень; пояснение.</p><textarea id="sensesEd" rows="8" style="font-family:ui-monospace,Menlo,monospace;font-size:13px">') + esc(Object.entries(SN).map(([w, v]) => w + '; ' + v[0] + '; ' + (v[1] || '')).join('\n')) + _t('</textarea><div class="row" style="margin-top:8px"><button class="btn sm" id="sensesSave">Применить</button><button class="btn sm" id="sensesReset">Вернуть исходный</button><span class="small mute">') + (S.senses ? _t('изменён вручную') : _t('исходная версия ') + R.version) + '</span></div></div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Сложность восприятия (ИСВ)</h3><p class="small">Индекс – взвешенное среднее четырёх показателей. Веса нормируются к сумме 1.</p>') +
      [['A1', _t('Лексика')], ['A2', _t('Грамматика')], ['A3', _t('Объём')], ['A4', _t('Метаязык')]].map(([k, t]) => '<label class="f">' + k + ' ' + t + ' – ' + E.fmt(S.weights[k], 2) + _t(' (доля ') + E.pct(S.weights[k], wsum) + ')<input type="range" min="0" max="1" step="0.05" data-w="' + k + '" value="' + S.weights[k] + '"></label>').join('') +
      num('problemISV', S.problemISV, 0, 1, 0.05, _t('Порог проблемной инструкции по ИСВ')) + num('problemCrit', S.problemCrit, 0, 1, 0.05, _t('Порог проблемы по отдельному критерию')) + '</div>';
    h += _t('</div><div class="box" style="margin-top:18px"><h3 style="margin-top:0">Нормы объёма по уровням (A3)</h3><div class="scroll"><table style="width:auto"><thead><tr><th>Уровень</th><th class="n">Слов в инструкции</th><th class="n">Слов в предложении</th><th class="n">Действий</th></tr></thead><tbody>') +
      ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => '<tr><td>' + l + '</td>' + ['words', 'wps', 'actions'].map(k => '<td><input class="inp" style="width:90px" type="number" min="1" step="1" data-norm="' + l + '.' + k + '" value="' + S.norms[l][k] + '"></td>').join('') + '</tr>').join('') +
      _t('</tbody></table></div><div class="row" style="margin-top:10px"><button class="btn" id="normCorpus">Рассчитать по корпусу (P75)</button><button class="btn" id="normReset">Вернуть рабочие нормы</button></div><div class="note">Рабочие нормы – стартовые значения. Расчёт по корпусу берёт 75-й процентиль загруженных инструкций каждого уровня (нужно не меньше 5 инструкций уровня). Для уровня с плюсом берётся среднее соседних норм.</div></div>') +
      _t('<div class="row" style="margin-top:18px"><button class="btn" id="setReset">Сбросить все настройки</button></div>');
    if (MA || window.IA_METHOD) h += UM.settingsHTML();
    el.innerHTML = h;
  }
  /* Общие настройки обоих режимов – уровень, список лексики, A7, источник уровней грамматики */
  function sharedSettingsHTML() {
    const S = store.settings;
    const lvOpts = (v, extra) => (extra || []).concat(LEVELS).map(l => '<option value="' + l + '"' + (l === v ? ' selected' : '') + '>' + ({ ignore: _t('не учитывать') }[l] || l) + '</option>').join('');
    const num = (id, v, min, max, step, lab) => '<label class="f">' + lab + '<input type="number" data-s="' + id + '" value="' + v + '" min="' + min + '" max="' + max + '" step="' + step + '"></label>';
    const chk = (id, v, lab) => '<label class="chk"><input type="checkbox" data-s="' + id + '"' + (v ? ' checked' : '') + '><span>' + lab + '</span></label>';
    let h = _t('<div class="box"><h3 style="margin-top:0">Уровень</h3><div class="seg" style="margin-bottom:10px"><button data-lm="data" aria-pressed="') + (S.levelMode === 'data') + _t('">Из данных</button><button data-lm="fixed" aria-pressed="') + (S.levelMode === 'fixed') + _t('">Задать для всех</button></div>') +
      (S.levelMode === 'fixed' ? _t('<label class="f">Уровень группы для анализа<select data-s="fixedLevel">') + lvOpts(S.fixedLevel) + '</select></label>' : _t('<label class="f">Уровень, если в данных он не указан<select data-s="defaultLevel">') + lvOpts(S.defaultLevel) + '</select></label>') +
      _t('<label class="f" style="margin-top:8px">Слова, которых нет в списке<select data-s="unknownLevel">') + lvOpts(S.unknownLevel, ['ignore']) + '</select></label></div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Список лексики</h3><label class="f">Основной список<select data-s="lexBase"><option value="cefrj"') + (S.lexBase !== 'builtin' ? ' selected' : '') + '>CEFR-J 1.5 + Octanove C1/C2 (' + (window.IA_CEFRJ ? window.IA_CEFRJ.size : 0) + _t(' ед.)</option><option value="builtin"') + (S.lexBase === 'builtin' ? ' selected' : '') + _t('>Встроенный рабочий (') + window.IA_LEXICON.size + _t(' ед., уровни приблизительные)</option></select></label>') + (S.lexBase !== 'builtin' ? chk('lexFallback', S.lexFallback, _t('Для слов, которых нет в CEFR-J, брать уровень из встроенного рабочего списка')) : '') +
      _t('<p class="small" style="margin-top:10px">Дополнительный список – ') + (store.userLex ? '<b>' + esc(store.userLex.id) + '</b>, ' + store.userLex.size + _t(' ед.') : _t('не загружен')) + '.</p>' +
      _t('<label class="f">Название и версия списка<input id="lexName" placeholder="Oxford 3000, 2023" value="') + esc(store.userLex ? store.userLex.id : '') + '"></label><div class="row" style="margin-top:8px"><input type="file" id="lexFile" accept=".csv,.tsv,.txt" class="inp">' + (store.userLex ? _t('<button class="btn sm" id="lexDel">Убрать</button>') : '') + '</div>' +
      '<div class="seg" style="margin-top:8px"><button data-lex="augment" aria-pressed="' + (S.lexMode !== 'replace') + _t('">Дополнить основной</button><button data-lex="replace" aria-pressed="') + (S.lexMode === 'replace') + _t('">Заменить основной</button></div></div>');
    h += _t('<div class="box"><h3 style="margin-top:0">Введённость лексики (A7)</h3>') + chk('useVocab', S.useVocab, _t('Снимать флаг, если слово есть в словнике учебника в этом или более раннем уроке')) + chk('useHistory', S.useHistory, _t('Снимать флаг, если слово уже встречалось в предыдущих объектах того же учебника (в режиме «Тексты» – в предыдущих текстах)')) + num('historyMin', S.historyMin, 1, 10, 1, _t('Сколько раз слово должно встретиться раньше')) + '</div>';
    h += _t('<div class="box"><h3 style="margin-top:0">Уровни грамматики</h3><label class="f">Источник уровней конструкций<select data-s="grammarSource">') + [['egp', _t('English Grammar Profile (столбец EGP в CEFR-J Grammar Profile)')], ['cefrj', _t('CEFR-J Grammar Profile (уровень CEFR-J)')], ['working', _t('Рабочая таблица анализатора')]].map(([k, t]) => '<option value="' + k + '"' + (S.grammarSource === k ? ' selected' : '') + '>' + t + '</option>').join('') + _t('</select></label><div class="note">Для EGP берётся нижняя граница диапазона, то есть уровень, с которого конструкция появляется в речи учащихся.</div></div>');
    return h;
  }
  const sEl = $('#v-settings');
  sEl.addEventListener('input', e => { if (e.target.id === 'sgKey') { groqState.key = e.target.value.trim(); if ($('#sgRemember').checked) try { localStorage.setItem(GROQ_LS, groqState.key); } catch (err) { /* нет хранилища */ } } });
  sEl.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'sgRemember') { try { if (t.checked) localStorage.setItem(GROQ_LS, ($('#sgKey').value || '').trim()); else localStorage.removeItem(GROQ_LS); } catch (err) { /* нет хранилища */ } }
    if (t.id === 'sgModel') { store.groqModel = t.value; save(); }
  }, true);
  sEl.addEventListener('click', async e => {
    const b = e.target.closest('#sgTest'); if (!b) return;
    const key = ($('#sgKey').value || '').trim(), st = $('#sgStatus');
    if (!key) { st.textContent = _t('Введите ключ.'); return; }
    groqState.key = key; st.textContent = _t('Проверка…');
    try { await groqCall(key, groqDefaultModel(), _t('Ответь одним словом – ok')); st.textContent = _t('Ключ работает, модель ') + groqDefaultModel() + _t(' отвечает.'); }
    catch (err) { st.textContent = groqError(err); }
  });
  sEl.addEventListener('change', e => {
    const t = e.target, S = store.settings;
    if (t.dataset.s) { const k = t.dataset.s; S[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value; if (k === 'lexBase') renderSettings(); }
    if (t.dataset.norm) { const [l, k] = t.dataset.norm.split('.'); S.norms[l][k] = Math.max(1, +t.value); }
    if (t.dataset.w) { S.weights[t.dataset.w] = +t.value; renderSettings(); }
    TX.settingsChange(t);
    if (t.id === 'lexFile') {
      const f = t.files[0]; const name = ($('#lexName').value || '').trim() || (f && f.name.replace(/\.\w+$/, ''));
      readFile(f, txt => { const L = E.parseUserLexicon(txt, name); if (!L || !L.size) { toast(_t('Не удалось найти столбцы слова и уровня')); return; } store.userLex = L; save(); renderSettings(); run(true); toast(_t('Список загружен – ') + L.size + _t(' ед.')); });
      return;
    }
    rerun();
  });
  sEl.addEventListener('input', e => { if (e.target.dataset.w) { store.settings.weights[e.target.dataset.w] = +e.target.value; rerun(); } TX.settingsInput(e.target); });
  sEl.addEventListener('click', e => {
    const S = store.settings, b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lm) { S.levelMode = b.dataset.lm; renderSettings(); rerun(); }
    if (b.dataset.prof) { store.settings = Object.assign(E.applyProfile(S, b.dataset.prof), { weights: S.weights }); renderSettings(); rerun(); }
    if (b.dataset.lex) { S.lexMode = b.dataset.lex; renderSettings(); rerun(); }
    if (b.id === 'lexDel') { store.userLex = null; renderSettings(); rerun(); }
    if (b.id === 'normReset') { S.norms = JSON.parse(JSON.stringify(R.NORMS)); renderSettings(); rerun(); }
    if (b.id === 'normCorpus') { if (!A) return; const N = E.corpusNorms(A.results); const ks = Object.keys(N); if (!ks.length) { toast(_t('Мало данных – нужно не меньше 5 инструкций одного уровня')); return; } ks.forEach(k => { S.norms[k] = { words: N[k].words, wps: N[k].wps, actions: N[k].actions }; }); renderSettings(); rerun(); toast(_t('Нормы рассчитаны для ') + ks.join(', ')); }
    if (b.id === 'sensesSave') { const o = {}; ($('#sensesEd').value || '').split(/\n/).forEach(l => { const p = l.split(';').map(x => x.trim()); if (p[0] && E.lvNum(p[1])) o[p[0].toLowerCase()] = [p[1].toUpperCase(), p[2] || '']; }); S.senses = o; renderSettings(); rerun(); toast(_t('Словарь применён – ') + Object.keys(o).length + _t(' слов')); }
    if (b.id === 'sensesReset') { S.senses = null; renderSettings(); rerun(); }
    if (b.id === 'setReset') { store.settings = JSON.parse(JSON.stringify(E.DEFAULTS)); renderSettings(); rerun(); }
    TX.settingsClick(b);
  });

  /* ---------- рубрика – общий модуль для инструкций и текстов ----------
     K – описание текущего режима (рубрика, хранилище оценок, список объектов, промпт). */
  function rcfg(mode) {
    mode = mode || (store.mode === 'instr' && store.ui.rscope === 'lessons' ? 'lessons' : store.mode);
    if (mode === 'lessons') return UM.rcfgLessons(MA);
    if (mode === 'texts') return {
      mode, list: R.TEXT_RUBRIC, version: R.TEXT_RUBRIC_VERSION, pv: TPROMPT_VERSION, slot: store.texts.rubric, ui: store.texts.ui,
      items: T ? T.results : [], file: 'texts', noun: [_t('текст'), _t('текста'), _t('текстов')], what: _t('Текст'), whatAll: _t('Все тексты'), whatCur: _t('Текущий текст'),
      label: (x, i) => (i + 1) + '. ' + (x.rec.unit || '') + (x.exs.length ? ' Ex. ' + x.exs.join(', ') : '') + ' – ' + (x.rec.title || x.rec.text.slice(0, 60)),
      head: x => TX.rubricBox(x), prompt: list => TX.prompt(list, rcfg('texts'))
    };
    return {
      mode: 'instr', list: R.RUBRIC, version: R.RUBRIC_VERSION, pv: PROMPT_VERSION, slot: store.rubric, ui: store.ui,
      items: A ? A.results : [], file: 'instructions', noun: [_t('инструкция'), _t('инструкции'), _t('инструкций')], what: _t('Инструкция'), whatAll: _t('Все инструкции'), whatCur: _t('Текущая инструкция'),
      label: (x, i) => (i + 1) + '. ' + (x.rec.unit || '') + (x.rec.ex ? ' Ex. ' + x.rec.ex : '') + ' – ' + x.rec.text.slice(0, 70),
      head: x => '<div class="box paper"><div class="small mute">' + esc(x.rec.book) + ' · ' + esc(E.labelOf(x.rec)) + _t(' · уровень ') + x.targetName + (x.rec.aspect ? ' · ' + esc(x.rec.aspect) : '') + '</div><div class="serif" style="font-size:21px;line-height:1.5;margin-top:6px">' + esc(x.rec.text) + '</div>' + (x.rec.exercise_text ? _t('<p class="small" style="margin-top:8px"><b>Упражнение.</b> <span class="serif">') + esc(x.rec.exercise_text) + '</span></p>' : '') + linkedTextsNote(x) + '</div>',
      prompt: promptInstr
    };
  }
  function linkedTextsNote(r) {
    const ps = P.filter(p => p.instr.id === r.id); if (!ps.length) return '';
    return _t('<p class="small" style="margin-top:8px"><b>Текст упражнения.</b> ') + ps.map(p => _t('«') + esc(p.text.rec.title || _t('без заголовка')) + _t('» – оценка уровня ') + E.lvName(p.text.level.est) + (p.harder ? _t(', инструкция сложнее текста (см. R6)') : '')).join('; ') + '</p>';
  }
  function renderRubric() {
    const el = $('#v-rubric'), K = rcfg();
    const res = K.items;
    const scope = store.mode === 'instr' ? '<div class="seg" id="rScope" style="margin-bottom:14px"><button data-rs="instr" aria-pressed="' + (K.mode === 'instr') + '">' + _t('Инструкции') + '</button><button data-rs="lessons" aria-pressed="' + (K.mode === 'lessons') + '">' + _t('Уроки') + '</button></div>' : '';
    if (!res.length) { el.innerHTML = scope + _t('<div class="empty">Нет данных. Загрузите ') + (K.mode === 'texts' ? _t('тексты') : _t('инструкции')) + _t(' во вкладке «Данные» – после этого здесь появятся экспертная оценка и оценка языковой моделью. Ключ Groq задаётся во вкладке «Настройки».</div>'); return; }
    const u = K.ui;
    if (!u.cur || !res.find(r => r.id === u.cur)) u.cur = res[0].id;
    const r = res.find(x => x.id === u.cur), idx = res.indexOf(r);
    const ex = Object.keys(K.slot.experts);
    const name = u.expert || '';
    const my = (K.slot.experts[name] || {})[r.id];
    const done = name ? res.filter(x => (K.slot.experts[name] || {})[x.id]).length : 0;
    let h = scope + _t('<h2>Рубричная оценка') + (K.mode === 'texts' ? _t(' текстов') : K.mode === 'lessons' ? _t(' уроков') : '') + _t('</h2><p class="mute">Эксперт заполняет рубрику независимо. Оценки модели по ') + (K.mode === 'texts' ? _t('этому тексту') : K.mode === 'lessons' ? _t('этому уроку') : _t('этой инструкции')) + _t(' открываются только после сохранения своей оценки. Рубрика – рабочая версия ') + K.version + '.</p>';
    h += _t('<div class="row" style="margin-bottom:14px"><label class="f">Эксперт<input id="rName" list="rNames" value="') + esc(name) + _t('" placeholder="Имя или код эксперта"><datalist id="rNames">') + ex.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist></label>' +
      '<label class="f" style="flex:1 1 320px">' + K.what + '<select id="rSel">' + res.map((x, i) => '<option value="' + x.id + '"' + (x.id === r.id ? ' selected' : '') + '>' + esc(K.label(x, i)) + ((K.slot.experts[name] || {})[x.id] ? ' ✓' : '') + '</option>').join('') + '</select></label>' +
      '<button class="btn" data-nav="-1"' + (idx ? '' : ' disabled') + _t('>Назад</button><button class="btn" data-nav="1"') + (idx < res.length - 1 ? '' : ' disabled') + _t('>Далее</button><span class="small mute">') + (name ? _t('Оценено ') + done + _t(' из ') + res.length : _t('Введите имя эксперта')) + '</span></div>';
    h += K.head(r);
    h += '<form id="rForm" class="rub" style="margin-top:14px">' + K.list.map(q => {
      const v = my ? my[q.code] : undefined;
      return '<div class="rq"><b>' + q.code + ' ' + esc(q.name) + '</b><div class="q">' + esc(q.q) + '</div><div class="opts">' + [['2', '2'], ['1', '1'], ['0', '0'], ['na', _t('н/п')]].map(([val, t]) => '<label><input type="radio" name="' + q.code + '" value="' + val + '"' + (v != null && String(v) === val ? ' checked' : '') + '>' + t + '</label>').join('') + '</div><div class="anchors">' + q.a.slice().reverse().map(esc).join('<br>') + '</div></div>';
    }).join('') + _t('<label class="f">Комментарий эксперта<textarea name="comment" rows="2">') + esc(my && my.comment || '') + _t('</textarea></label><div class="row"><button class="btn pri" type="submit" data-next="0">Сохранить</button><button class="btn" type="submit" data-next="1">Сохранить и далее</button>') + (my ? _t('<span class="small mute">Сохранено ') + new Date(my.date).toLocaleString(window.IA_I18N ? IA_I18N.locale : 'ru-RU') + '</span>' : '') + '</div></form>';
    if (my) {
      const ms = Object.entries(K.slot.models).filter(([, m]) => m.scores[r.id]);
      if (ms.length) h += _t('<h3>Сравнение с моделью</h3><div class="scroll"><table><thead><tr><th>Критерий</th><th class="n">Эксперт</th>') + ms.map(([n]) => '<th class="n">' + esc(n) + '</th>').join('') + '</tr></thead><tbody>' + K.list.map(q => '<tr><td>' + q.code + ' ' + esc(q.name) + '</td><td class="n">' + sv(my[q.code]) + '</td>' + ms.map(([, m]) => { const x = m.scores[r.id][q.code]; const y = x && x.score; return '<td class="n"><span class="' + (y != null && my[q.code] != null && String(y) !== String(my[q.code]) ? 'diff' : '') + '">' + sv(y) + '</span></td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    const md = K.slot.models;
    const gk = groqKey(), gm = u.groqModel || groqDefaultModel();
    h += _t('<h3 style="margin-top:34px">Оценка языковой моделью</h3><p class="small">Два способа на выбор. Автоматический – через Groq по ключу API. Ручной – промпт копируется в любой чат с моделью (Claude, ChatGPT, GigaChat, YandexGPT и др.), ответ вставляется обратно. В обоих случаях версия модели, версия промпта (') + K.pv + _t(') и дата сохраняются вместе с оценками.</p>') +
      _t('<div class="row" style="margin-bottom:12px"><span class="small mute">Что оценить</span><select class="inp" id="pScope"><option value="all">') + K.whatAll + ' (' + res.length + ')</option><option value="cur">' + K.whatCur + _t('</option><option value="unrated">Без оценки модели</option></select></div>') +
      _t('<div class="grid2"><div class="box"><h3 style="margin-top:0">Способ 1. Через Groq</h3>') +
      _t('<label class="f">Ключ API Groq<input id="gKey" type="password" autocomplete="off" placeholder="gsk_…" value="') + esc(gk) + '"></label>' +
      '<label class="chk"><input type="checkbox" id="gRemember"' + (localGet(GROQ_LS) ? ' checked' : '') + _t('><span>Запомнить ключ в этом браузере</span></label>') +
      _t('<label class="f">Модель<select id="gModel">') + GROQ_MODELS.map(m => '<option' + (m === gm ? ' selected' : '') + '>' + m + '</option>').join('') + '<option value="__custom"' + (GROQ_MODELS.includes(gm) ? '' : ' selected') + _t('>другая…</option></select></label>') +
      (GROQ_MODELS.includes(gm) ? '' : _t('<label class="f" style="margin-top:6px">Идентификатор модели<input id="gCustom" value="') + esc(gm) + '"></label>') +
      '<div class="row" style="margin-top:10px"><button class="btn pri" id="gRun"' + (groqState.busy ? ' disabled' : '') + _t('>Оценить через Groq</button><button class="btn" id="gStop"') + (groqState.busy ? '' : ' hidden') + _t('>Остановить</button><button class="btn sm" id="gTest">Проверить ключ</button></div>') +
      '<p class="small" id="gStatus" style="margin-top:8px">' + esc(groqState.msg || '') + '</p>' +
      _t('<p class="note">Это тот же ключ, что во вкладке «Настройки». Ключ хранится только в этом браузере и не попадает в экспорт, протокол и файлы инструмента. Ключ создаётся на console.groq.com в разделе API Keys. ') + (K.mode === 'texts' ? _t('Тексты отправляются пакетами по ') + GROQ_BATCH_T : _t('Инструкции отправляются пакетами по ') + GROQ_BATCH) + _t(', температура 0.</p></div>') +
      _t('<div class="box"><h3 style="margin-top:0">Способ 2. Вручную</h3>') +
      _t('<div class="row"><button class="btn" id="pCopy">Скопировать промпт</button><button class="btn" id="pDown">Скачать промпт .txt</button></div>') +
      _t('<div class="grid2" style="margin-top:10px;gap:10px"><label class="f">Модель и версия<input id="mName" placeholder="Claude Opus 5.5"></label><label class="f">Прогон (необязательно)<input id="mRun" placeholder="прогон 1"></label></div>') +
      _t('<label class="f" style="margin-top:8px">Ответ модели (JSON)<textarea id="mJson" rows="4" placeholder="[{&quot;id&quot;: &quot;…&quot;, &quot;scores&quot;: {&quot;') + K.list[0].code + _t('&quot;: {&quot;score&quot;: 2, &quot;rationale&quot;: &quot;…&quot;}}}]"></textarea></label><div class="row" style="margin-top:8px"><button class="btn pri" id="mImport">Импортировать</button></div>') +
      '<p class="note">' + (K.mode === 'texts' ? _t('Тексты длинные, поэтому их удобнее отправлять частями по 3-5.') : K.mode === 'lessons' ? _t('Уроки удобнее отправлять частями по 3-5.') : _t('Длинный список удобнее отправлять частями по 10-20 инструкций.')) + _t(' Модели точнее держат формат на коротких пакетах.</p></div></div>');
    if (Object.keys(md).length) h += _t('<table style="margin-top:12px"><thead><tr><th>Модель</th><th class="n">') + K.noun[2].charAt(0).toUpperCase() + K.noun[2].slice(1) + _t('</th><th>Промпт</th><th>Дата</th><th></th></tr></thead><tbody>') + Object.entries(md).map(([n, m]) => '<tr><td>' + esc(n) + '</td><td class="n">' + Object.keys(m.scores).length + '</td><td>' + esc(m.prompt) + '</td><td>' + new Date(m.date).toLocaleString(window.IA_I18N ? IA_I18N.locale : 'ru-RU') + '</td><td><button class="btn sm" data-mdel="' + esc(n) + _t('">Удалить</button></td></tr>')).join('') + '</tbody></table>';
    const rl = raters(K);
    h += _t('<h3 style="margin-top:34px">Согласованность оценок</h3>');
    if (rl.length >= 2) {
      if (!u.raterA || !rl.find(x => x.key === u.raterA)) u.raterA = rl[0].key;
      if (!u.raterB || !rl.find(x => x.key === u.raterB) || u.raterB === u.raterA) u.raterB = (rl.find(x => x.key !== u.raterA) || rl[1]).key;
      const ag = E.agreement(raterScores(K, u.raterA), raterScores(K, u.raterB), K.list.map(q => q.code));
      h += '<div class="row">' + ['raterA', 'raterB'].map(k => '<select class="inp" id="' + k + '">' + rl.map(x => '<option value="' + esc(x.key) + '"' + (x.key === u[k] ? ' selected' : '') + '>' + esc(x.label) + '</option>').join('') + '</select>').join(_t('<span>и</span>')) + '</div>' +
        _t('<div class="scroll"><table style="margin-top:10px"><thead><tr><th>Критерий</th><th class="n">n пар</th><th class="n">Точное совпадение</th><th class="n">Взвешенная каппа</th></tr></thead><tbody>') + ag.map(a => { const q = K.list.find(x => x.code === a.code); return '<tr><td>' + a.code + ' ' + esc(q.name) + '</td><td class="n">' + a.n + '</td><td class="n">' + (a.exact == null ? '—' : E.pct(a.exact, 1)) + '</td><td class="n">' + (a.kappa == null ? '—' : E.fmt(a.kappa, 2)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        _t('<p class="note">Каппа Коэна с квадратичными весами для порядковой шкалы 0-1-2, отметки «неприменимо» в расчёт не входят. Принятая интерпретация (Landis, Koch, 1977) – 0,41-0,60 умеренная, 0,61-0,80 существенная, выше 0,80 почти полная согласованность. Для трёх и более экспертов нужна альфа Криппендорфа – она войдёт во вторую версию.</p>');
    } else h += _t('<p class="mute small">Нужны оценки хотя бы двух экспертов или эксперта и модели.</p>');
    h += _t('<div class="row" style="margin-top:22px"><button class="btn" id="rExport">Экспорт оценок JSON</button><label class="btn" style="cursor:pointer">Импорт оценок JSON<input type="file" id="rImport" accept=".json" hidden></label></div>');
    el.innerHTML = h;
  }
  const sv = v => v == null ? '—' : v === 'na' ? _t('н/п') : v;
  const rEl = $('#v-rubric');
  rEl.addEventListener('change', e => {
    const t = e.target, K = rcfg(), u = K.ui;
    if (t.id === 'rSel') { u.cur = t.value; save(); renderRubric(); }
    if (t.id === 'rName') { u.expert = t.value.trim(); save(); renderRubric(); }
    if (t.id === 'raterA' || t.id === 'raterB') { u[t.id] = t.value; save(); renderRubric(); }
    if (t.id === 'rImport') readFile(t.files[0], txt => { try { const o = JSON.parse(txt); const rb = o.rubric || o; ['experts', 'models'].forEach(k => Object.assign(K.slot[k], rb[k] || {})); save(); renderRubric(); renderMap(); toast(_t('Оценки импортированы')); } catch (err) { toast(_t('Файл не читается как JSON')); } });
  });
  rEl.addEventListener('submit', e => {
    e.preventDefault();
    const K = rcfg(), u = K.ui; const name = ($('#rName').value || '').trim();
    if (!name) { toast(_t('Введите имя эксперта')); $('#rName').focus(); return; }
    u.expert = name;
    const fd = new FormData(e.target); const o = { date: new Date().toISOString(), comment: fd.get('comment') || '' };
    let n = 0; K.list.forEach(q => { const v = fd.get(q.code); if (v != null) { o[q.code] = v === 'na' ? 'na' : +v; n++; } });
    if (!n) { toast(_t('Не выбрано ни одного балла')); return; }
    (K.slot.experts[name] = K.slot.experts[name] || {})[u.cur] = o;
    if (e.submitter && e.submitter.dataset.next === '1') { const res = K.items; const i = res.findIndex(r => r.id === u.cur); if (i < res.length - 1) u.cur = res[i + 1].id; }
    save(); renderRubric(); renderMap(); toast(_t('Оценка сохранена'));
  });
  rEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rs) { store.ui.rscope = b.dataset.rs; save(); renderRubric(); return; }
    const K = rcfg(), u = K.ui;
    if (b.dataset.nav) { const res = K.items; const i = res.findIndex(r => r.id === u.cur) + (+b.dataset.nav); if (res[i]) { u.cur = res[i].id; save(); renderRubric(); } }
    if (b.id === 'pCopy') copy(K.prompt(scopeList(K, $('#pScope').value)));
    if (b.id === 'pDown') download(K.file + '-prompt-' + stamp() + '.txt', K.prompt(scopeList(K, $('#pScope').value)));
    if (b.id === 'mImport') importModel(K);
    if (b.id === 'gRun') runGroq(K);
    if (b.id === 'gStop') { groqState.stop = true; }
    if (b.id === 'gTest') testGroq();
    if (b.dataset.mdel) { delete K.slot.models[b.dataset.mdel]; if (u.model === b.dataset.mdel) u.model = ''; save(); renderRubric(); renderMap(); }
    if (b.id === 'rExport') download(K.file + '-ratings-' + stamp() + '.json', JSON.stringify({ rubricVersion: K.version, promptVersion: K.pv, rubric: K.slot }, null, 1), 'application/json');
  });
  function scopeList(K, scope) {
    let list = K.items;
    if (scope === 'cur') list = list.filter(r => r.id === K.ui.cur);
    if (scope === 'unrated') { const rated = new Set(Object.values(K.slot.models).flatMap(m => Object.keys(m.scores))); list = list.filter(r => !rated.has(r.id)); }
    return list;
  }
  function promptInstr(list) {
    const crit = R.RUBRIC.map(q => q.code + ' ' + q.name + '. ' + q.q + '\n  ' + q.a.slice().reverse().join('\n  ')).join('\n');
    return _t('Ты – эксперт по методике обучения иностранным языкам. Оцени инструкции к упражнениям учебников английского языка по рубрике ') + R.RUBRIC_VERSION + '.\n\n' +
      _t('Шкала для каждого критерия – 2 (соответствует), 1 (частично), 0 (не соответствует) или "na" (неприменимо). Оценивай инструкцию с учётом заявленного уровня CEFR, аспекта и текста упражнения, если он дан. Для R3 опирайся на классификации упражнений С.Ф. Шатилова (языковые, условно-речевые, речевые) и Е.И. Пассова (некоммуникативные, условно-коммуникативные, коммуникативные).\n\n') +
      _t('Критерии\n') + crit + '\n\n' +
      _t('Для каждого критерия верни балл, обоснование в одно-два предложения на русском языке, фрагмент инструкции, на который опирается оценка, и вариант переформулирования на английском языке, если балл ниже 2.\n\n') +
      _t('Ответ – только JSON-массив без пояснений и без разметки, по схеме\n[{"id": "<id инструкции>", "scores": {"R1": {"score": 2, "rationale": "…", "evidence": "…", "rewrite": "…"}, "R2": {…}, … "D5": {…}}}]\n\n') +
      _t('Для критерия R7 учитывай цель урока (поле lesson_aim; если его нет, выведи цель из заголовка урока и соседних упражнений) и место упражнения в уроке (поле position и список упражнений урока в поле lesson).\n\n') +
      _t('Инструкции (по одной в строке, JSON)\n') + list.map(r => JSON.stringify({ id: r.id, level: r.targetName, book: r.rec.book, unit: r.rec.unit, ex: r.rec.ex, aspect: r.rec.aspect || undefined, audience: r.rec.audience || undefined, text: r.rec.text, exercise_text: r.rec.exercise_text || undefined, ...lessonCtx(r) })).join('\n');
  }
  /* Урок, к которому относится инструкция, – цель и порядок упражнений для R7 */
  function lessonCtx(r) {
    const L = MA && MA.lessons.find(x => x.items.includes(r)); if (!L) return {};
    return { lesson_aim: L.aim || undefined, position: (L.items.indexOf(r) + 1) + '/' + L.items.length, lesson: L.items.map(x => (x.rec.ex ? x.rec.ex + '. ' : '') + x.rec.text.slice(0, 90)) };
  }
  function parseModelJSON(raw) {
    raw = String(raw || '').replace(/```(?:json)?/g, '');
    const a = raw.indexOf('['), b = raw.lastIndexOf(']');
    if (a >= 0 && b > a) { try { return JSON.parse(raw.slice(a, b + 1)); } catch (e) { /* ниже */ } }
    try { const o = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); return Array.isArray(o.items) ? o.items : Array.isArray(o.results) ? o.results : o.id ? [o] : null; } catch (e) { return null; }
  }
  function ingest(K, label, meta, arr) {
    const ids = new Set(K.items.map(r => r.id));
    const m = K.slot.models[label] = K.slot.models[label] || Object.assign({ prompt: K.pv, rubric: K.version, date: new Date().toISOString(), scores: {} }, meta);
    let n = 0, bad = 0;
    (Array.isArray(arr) ? arr : []).forEach(x => {
      if (!x || !ids.has(x.id) || !x.scores) { bad++; return; }
      const o = {}; K.list.forEach(q => { const sc = x.scores[q.code]; if (sc == null) return; const v = typeof sc === 'object' ? sc.score : sc; o[q.code] = { score: v === 'na' || v === 'н/п' || v === 'n/a' ? 'na' : +v, rationale: sc.rationale || '', evidence: sc.evidence || '', rewrite: sc.rewrite || '' }; if (o[q.code].score !== 'na' && ![0, 1, 2].includes(o[q.code].score)) delete o[q.code]; });
      m.scores[x.id] = o; n++;
    });
    return { n, bad };
  }
  function importModel(K) {
    const name = ($('#mName').value || '').trim(); if (!name) { toast(_t('Укажите модель и версию')); $('#mName').focus(); return; }
    const arr = parseModelJSON($('#mJson').value); if (!arr) { toast(_t('Ответ не читается как JSON-массив')); return; }
    const runName = $('#mRun').value.trim(); const label = name + (runName ? ' (' + runName + ')' : '');
    const r = ingest(K, label, { model: name, run: runName, via: _t('вручную') }, arr);
    K.ui.model = label; save(); renderRubric(); renderMap();
    toast(_t('Импортировано ') + r.n + (r.bad ? _t(', пропущено ') + r.bad + _t(' (неизвестный id)') : ''));
  }

  /* ---------- Groq ---------- */
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODELS = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
  const GROQ_LS = 'textbook-analyzer-groq-key', GROQ_BATCH = 5, GROQ_BATCH_T = 2;
  const groqState = { key: '', busy: false, stop: false, msg: '' };
  function localGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function groqKey() { return groqState.key || localGet(GROQ_LS); }
  function groqDefaultModel() { return store.groqModel || GROQ_MODELS[0]; }
  function groqModel() { const el = $('#gModel'); if (!el) return groqDefaultModel(); const v = el.value; return v === '__custom' ? (($('#gCustom') || {}).value || '').trim() : v; }
  function groqStatus(t) { groqState.msg = t; const el = $('#gStatus'); if (el) el.textContent = t; }
  rEl.addEventListener('input', e => { if (e.target.id === 'gKey') { groqState.key = e.target.value.trim(); if ($('#gRemember').checked) try { localStorage.setItem(GROQ_LS, groqState.key); } catch (err) { /* нет хранилища */ } } });
  rEl.addEventListener('change', e => {
    if (e.target.id === 'gRemember') { try { if (e.target.checked) localStorage.setItem(GROQ_LS, ($('#gKey').value || '').trim()); else localStorage.removeItem(GROQ_LS); } catch (err) { /* нет хранилища */ } }
    if (e.target.id === 'gModel') { rcfg().ui.groqModel = e.target.value === '__custom' ? '' : e.target.value; save(); renderRubric(); }
    if (e.target.id === 'gCustom') { rcfg().ui.groqModel = e.target.value.trim(); save(); }
  });
  async function groqCall(key, model, content) {
    let resp;
    try {
      resp = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content }] }) });
    } catch (e) { const err = new Error('net'); err.kind = 'net'; throw err; }
    if (!resp.ok) {
      let detail = ''; try { detail = (await resp.json()).error.message; } catch (e) { /* пусто */ }
      const err = new Error(detail || ('HTTP ' + resp.status)); err.status = resp.status; err.retry = +resp.headers.get('retry-after') || 0; throw err;
    }
    const j = await resp.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  }
  function groqError(e) {
    if (e.kind === 'net') return _t('Браузер не смог связаться с Groq. Проверьте интернет. Если связь есть, Groq может не принимать запросы со страницы, открытой как файл, – тогда откройте инструмент с GitHub Pages или используйте ручной способ.');
    if (e.status === 401) return _t('Ключ не принят (401). Проверьте ключ на console.groq.com.');
    if (e.status === 404) return _t('Модель не найдена (404). Выберите другую модель.');
    if (e.status === 413) return _t('Запрос слишком длинный для модели (413). Оцените тексты по одному – вариант «Текущий текст».');
    if (e.status === 429) return _t('Превышен лимит запросов Groq (429). Подождите минуту и продолжите с вариантом «Без оценки модели».');
    return _t('Ошибка Groq – ') + e.message;
  }
  async function testGroq() {
    const key = ($('#gKey').value || '').trim(); if (!key) { toast(_t('Введите ключ')); return; }
    groqState.key = key; groqStatus(_t('Проверка…'));
    try { await groqCall(key, groqModel(), _t('Ответь одним словом – ok')); groqStatus(_t('Ключ работает, модель ') + groqModel() + _t(' отвечает.')); }
    catch (e) { groqStatus(groqError(e)); }
  }
  async function runGroq(K) {
    if (groqState.busy) return;
    const key = ($('#gKey').value || '').trim(); if (!key) { toast(_t('Введите ключ API Groq')); $('#gKey').focus(); return; }
    const model = groqModel(); if (!model) { toast(_t('Укажите модель')); return; }
    const list = scopeList(K, $('#pScope').value); if (!list.length) { toast(_t('Нечего оценивать')); return; }
    const batch = K.mode === 'instr' ? GROQ_BATCH : GROQ_BATCH_T;
    groqState.key = key; groqState.busy = true; groqState.stop = false;
    $('#gRun').disabled = true; $('#gStop').hidden = false;
    const date = new Date().toISOString().slice(0, 10);
    const label = model + ' (Groq, ' + date + ')';
    let done = 0, bad = 0, fail = '';
    for (let i = 0; i < list.length; i += batch) {
      if (groqState.stop) { fail = _t('Остановлено.'); break; }
      const part = list.slice(i, i + batch);
      groqStatus(_t('Оценено ') + done + _t(' из ') + list.length + '…');
      let tries = 0;
      while (true) {
        try {
          const txt = await groqCall(key, model, K.prompt(part));
          const arr = parseModelJSON(txt);
          if (!arr) { bad += part.length; break; }
          const r = ingest(K, label, { model, run: _t('Groq, температура 0, пакет ') + batch, via: 'Groq API' }, arr);
          done += r.n; bad += Math.max(0, part.length - r.n); save();
          break;
        } catch (e) {
          if (e.status === 429 && tries < 2) { tries++; groqStatus(_t('Лимит запросов – пауза…')); await new Promise(res => setTimeout(res, Math.max(e.retry, 20) * 1000)); continue; }
          fail = groqError(e); break;
        }
      }
      if (fail) break;
    }
    groqState.busy = false;
    if (K.slot.models[label]) K.ui.model = label;
    save(); renderRubric(); renderMap();
    groqStatus((fail ? fail + ' ' : '') + _t('Оценено ') + done + _t(' из ') + list.length + (bad ? _t(', не удалось разобрать ответ для ') + bad : '') + '.');
  }

  /* ---------- методика ---------- */
  function renderMethod() {
    if (store.mode === 'texts') { TX.renderMethod(); return; }
    const S = store.settings;
    $('#v-method').innerHTML = _t('<h2>Методика расчёта</h2>') +
      _t('<p>Инструмент оценивает инструкции к упражнениям по алгоритмическим критериям A1-A7 и D1, D3, D4 и показывает результат в виде тепловой карты. Алгоритмические показатели воспроизводимы при фиксированных эталонах и настройках. Рубричные критерии R1-R6, D1, D2, D4, D5 заполняют эксперт и языковая модель. Инструмент не выносит итоговый вердикт, а показывает зоны, которые требуют экспертного взгляда.</p>') +
      _t('<h3>Предобработка</h3><p>Текст делится на предложения, слова приводятся к словарной форме по правилам и таблице неправильных форм. Фразовые глаголы и устойчивые сочетания (fill in, look up, in pairs, according to) распознаются как одна единица. Имена собственные, числа, буквенные метки (a-h) и отсылки (Ex. 3) в лексический расчёт не входят.</p>') +
      _t('<h3>A1 Лексический уровень</h3><p>Каждой единице приписывается уровень по списку лексики (по умолчанию CEFR-J Wordlist 1.5 и Octanove C1/C2; у многозначных по части речи слов берётся самый низкий уровень, у глаголов-установок – уровень глагола), для учебных значений многозначных слов (match, box, gap) – по словарю инструктивных значений. Единица на один уровень выше целевого получает вес 0,5, на два и более – 1. Взвешенная доля <code>w = Σ весов / число единиц</code>. Показатель <code>A1 = (w − допуск) / (насыщение − допуск)</code>, ограниченный отрезком 0-1. Сейчас допуск ') + S.tolerance + _t(' %, насыщение ') + S.saturation + _t(' %. Термины метаязыка из A1 исключены и учитываются в A4.</p>') +
      _t('<h3>A2 Грамматическая сложность</h3><p>Правила находят конструкции (страдательный залог, перфект, причастные обороты, придаточные определительные, косвенные вопросы, условные и уступительные придаточные, герундий, инфинитив цели, модальные глаголы, степени сравнения) и приписывают им уровень по CEFR-J Grammar Profile (версия 20180315). По умолчанию берётся столбец EGP этого профиля – нижняя граница уровня в English Grammar Profile, по выбору – уровень CEFR-J. Правила, которым нет соответствия в профиле, используют рабочую таблицу. Конструкция на один уровень выше даёт 0,5, на два и более – 1, сумма ограничена единицей.</p>') +
      _t('<h3>A3 Объём и плотность</h3><p>Считаются слова, предложения, действия (глаголы в императиве в начале предложения и после and, then, запятой) и слова на действие. Для каждого из трёх параметров (слова, слова в предложении, действия) превышение нормы уровня <code>e = (значение − норма) / норма</code> ограничено 0-1, A3 – среднее трёх превышений.</p>') +
      _t('<h3>A4 Метаязыковая нагрузка</h3><p>Словарь метаязыка задаёт уровень, с которого термин допустим без пояснения. Термин выше уровня даёт 0,5 или 1 за каждое употребление, при доле терминов больше 15 % добавляется 0,25. Сумма ограничена единицей.</p>') +
      _t('<h3>A5 Единообразие формулировок</h3><p>Инструкция относится к типу задания по главному действию (заполнение пропусков, соотнесение, выбор и др.), формулировка – это глагол с первым дополнением (fill in gap, complete sentence). В пределах учебника и типа <code>A5 = 1 − доля инструкций с той же формулировкой</code>. Показатель считается для типов, которые встречаются в учебнике не меньше трёх раз. Индекс вариативности учебника <code>V = (k − 1) / (n − 1)</code>.</p>') +
      _t('<h3>A6 Читаемость</h3><p>Индекс Флеша-Кинкейда и лёгкость чтения по Флешу приводятся справочно. На коротких текстах они ненадёжны и в ИСВ не входят.</p>') +
      _t('<h3>A7 Введённость лексики</h3><p>Флаг A1 снимается, если слово есть в словнике учебника в этом или более раннем уроке или уже встречалось в предыдущих инструкциях учебника заданное число раз (сейчас ') + S.historyMin + ').</p>' +
      _t('<h3>D1, D3, D4</h3><p>D1 проверяет, указаны ли для письменных и устных продуктивных заданий объём, время или число ответов (0 или 1). D3 проверяет, существует ли упражнение, на которое ссылается инструкция, среди загруженных данных (0 или 1, отсылки к рамке, тексту и странице помечаются для ручной проверки). D4 ищет эвристические признаки неоднозначности (match без указания пары, пропуски без источника слов, местоимение без антецедента) – 0,5 за признак.</p>') +
      _t('<h3>Индекс сложности восприятия (ИСВ)</h3><p><code>ИСВ = (wA1·A1 + wA2·A2 + wA3·A3 + wA4·A4) / (wA1 + wA2 + wA3 + wA4)</code>, сейчас веса ') + ['A1', 'A2', 'A3', 'A4'].map(k => k + ' ' + E.fmt(S.weights[k], 2)).join(', ') + _t('. Индекс объединяет лексическую, грамматическую, объёмную и метаязыковую нагрузку на восприятие инструкции учащимся.</p>') +
      _t('<h3>Рубрика и валидация</h3><p>Рубричные баллы 2-1-0 переводятся в 0, 0,5 и 1. Согласованность двух оценщиков рассчитывается как каппа Коэна с квадратичными весами. Рубричные оценки модели признаются надёжными только после сверки с независимыми экспертными оценками.</p>') +
      UM.docHTML(MA) +
      _t('<h3>Эталоны и версии</h3><p>Движок ') + E.VERSION + _t(', ядро ') + C.VERSION + _t(', интерфейс ') + UI_VERSION + _t(', импорт ') + (window.IA_IMPORT ? window.IA_IMPORT.VERSION : '—') + _t(', эталоны ') + R.version + _t(', рубрика ') + R.RUBRIC_VERSION + _t(', промпт ') + PROMPT_VERSION + _t(', список лексики – ') + esc(A ? A.meta.lexicon + ' (' + A.meta.lexiconSize + _t(' ед.)') : '') + _t(', уровни грамматики – ') + esc(A ? A.meta.grammarSource : '') + _t('. Источники – ') + (window.IA_CEFRJ ? window.IA_CEFRJ.cite.map(esc).join('; ') : '') + _t('. Протокол JSON сохраняет версии, настройки и все исходные оценки.</p>');
  }

  /* ---------- методика упражнений (ui-method.js) ---------- */
  const UM = window.IA_UI_METHOD({ $, esc, E, R, store, save });
  UM.bindSettings(() => rerun());
  /* Оценки урока L1, L2 под профилем урока в виде «Последовательность» */
  function lessonRated(id) {
    const K = UM.rcfgLessons(MA), rl = raters(K).map(x => ({ x, s: raterScores(K, x.key)[id] })).filter(y => y.s);
    if (!rl.length) return '';
    return '<p class="small" style="margin:8px 0 0">' + rl.map(y => esc(y.x.label) + ' – ' + R.LESSON_RUBRIC.map(q => q.code + ' ' + sv(y.s[q.code])).join(', ')).join('; ') + '</p>';
  }

  /* ---------- режим «Тексты» ---------- */
  const TX = window.IA_UI_TEXTS({
    $, esc, f2, E, R, X, C, LEVELS, HEAT, store, save, toast, copy, download, stamp, readFile, show, kpi, sel, cellHTML, legend, closeup, tipFor,
    raters, raterScores, rubricVal, rcfg, run: q => run(q), rerun: () => rerun(), renderAll: () => renderAll(), renderSettings: () => renderSettings(),
    get A() { return A; }, get T() { return T; }, get P() { return P; }, get U() { return U; },
    setCard: id => { curCard = id; }, closeCard: () => closeCard(), openInstrCard: id => openCard(id),
    settingsShared: () => sharedSettingsHTML(), parseNote: r => parseNote(r), UI_VERSION, TPROMPT_VERSION
  });

  /* ---------- импорт из учебника ---------- */
  const IM = window.IA_UI_IMPORT({
    $, esc, E, store, save, toast, copy, download, stamp, LEVELS, initData: () => initData(), run: q => run(q), show,
    get A() { return A; }, groqKey: () => groqKey(), groqDefaultModel: () => groqDefaultModel(), groqCall: (k, m, c) => groqCall(k, m, c), groqError: e => groqError(e)
  });

  /* ---------- старт ---------- */
  /* После смены языка пример заменяется примером на новом языке (данные исследователя не трогаются) */
  if (store.input.mode === 'csv' && store.input.csv && store.input.csv !== window.IA_SAMPLE.csv && window.IA_SAMPLE_ANY('csv', store.input.csv)) { store.input.csv = window.IA_SAMPLE.csv; store.vocab = parseVocab(window.IA_SAMPLE.vocab); store.vocabName = _t('пример словника'); }
  if (store.texts.items.length && store.texts.items.every(x => /\((пример|sample)\)$/.test(x.book || '')) && !store.texts.items.some(x => x.book === (X.recordsFromCSV(window.IA_SAMPLE.texts)[0] || {}).book)) store.texts.items = X.recordsFromCSV(window.IA_SAMPLE.texts);
  initData(); renderSettings(); IM.render();
  if (!store.input.text && !store.input.csv) { store.input.csv = window.IA_SAMPLE.csv; store.input.mode = 'csv'; store.vocab = parseVocab(window.IA_SAMPLE.vocab); store.vocabName = _t('пример словника'); initData(); }
  if (!store.texts.items.length && !store.texts.sampleLoaded) { store.texts.items = X.recordsFromCSV(window.IA_SAMPLE.texts); store.texts.sampleLoaded = true; }
  run(true);
  const h0 = TABS[location.hash.slice(1)]; show(h0 || store.ui.tab || 'map');
}
