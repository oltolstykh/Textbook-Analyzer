/* Интерфейс модуля «Методика упражнений» (method.js) – столбцы тепловой карты, вид «Последовательность урока»,
   блок карточки, статистика, настройки, рубрика урока (L1, L2) и раздел вкладки «Методика». Версия ui-m-0.1.
   Подключается из ui.js как фабрика – получает общие функции и состояние. */
window.IA_UI_METHOD = function (U) {
  const _t = window._t || (s => s);
  const { $, esc, E, R, store, save } = U;
  const MT = window.IA_METHOD, M = R.METHOD;
  const LPROMPT_VERSION = 'prompt-l-0.1';
  const VERSION = 'ui-m-0.1';
  const f2 = x => x == null || isNaN(x) ? '—' : E.fmt(x, 2);
  const cfg = () => Object.assign({}, MT.DEFAULTS, store.settings.method || {});
  const en = () => cfg().view === 'en';
  const typeLabel = m => !m || !m.type ? _t('не определён') : en() ? MT.TYPE[m.type].en : MT.TYPE[m.type].name;
  const groupLabel = m => !m || !m.group ? _t('не определена') : en() ? M.GROUPS[m.group].en : M.GROUPS[m.group].name;
  const phaseLabel = m => !m || !m.phase ? '—' : en() ? MT.PHASE[m.phase].en : MT.PHASE[m.phase].name;
  const stageLabel = m => !m || !m.stage ? '—' : en() ? MT.STAGE[m.stage].en : MT.STAGE[m.stage].name;
  const CONF = { high: _t('высокая'), mid: _t('средняя'), low: _t('низкая') };
  const RULE_NAME = id => MT.RULE[id].name;
  const SRC = k => String(k || '').replace(/sol06/g, _t('Соловова, 2006')).replace(/harmer/g, 'Harmer').replace(/scriv/g, 'Scrivener').replace(/celta/g, 'Thornbury, Watkins').replace(/tkt/g, 'Spratt et al., 2011').replace(/с\./g, _t('с.'));

  /* Значок типа – номер ступени шкалы свободы, цвет по группе */
  function chip(m, id, extra) {
    const n = m && m.n;
    const t = n ? n + ' · ' + typeLabel(m) + ' (' + groupLabel(m) + ')' + (m.phase ? ' · ' + phaseLabel(m) : '') + (m.stage ? ' · ' + stageLabel(m) : '') : _t('тип не определён');
    return '<span class="mx-chip mx-' + (n || 0) + (m && m.confLevel === 'low' ? ' mx-low' : '') + '" title="' + esc(t) + '"' + (id ? ' data-id="' + id + '" tabindex="0" role="button"' : '') + (extra || '') + '>' + (n || '?') + '</span>';
  }
  function legend() {
    return '<div class="legend mx-legend">' + M.TYPES.map(t => '<span>' + chip({ n: t.n, type: t.id, group: t.group }) + esc(en() ? t.en : t.name) + '</span>').join('') +
      '<span>' + chip(null) + _t('не определён') + '</span></div>';
  }

  /* ---------- Тепловая карта ---------- */
  /* Столбцы для строки упражнения – тип и отметки последовательности */
  function flagsFor(MA, r) { if (!MA) return []; const L = MA.lessons.find(x => x.items.includes(r)); return L ? L.flags.filter(f => f.id === r.id) : []; }
  function exCells(MA, r) {
    const fl = flagsFor(MA, r).filter(f => MT.RULE[f.rule].weight > 0 || f.rule === 'unitDrop');
    return '<td class="sep"></td><td>' + chip(r.method, r.id) + '</td><td class="mx-fl">' + (fl.length ? fl.map(f => '<span class="tag mx-tag mx-' + f.rule + '" title="' + esc(f.text) + '">' + esc(RULE_NAME(f.rule)) + '</span>').join('') : '') + '</td>';
  }
  function exHead() { return '<th></th><th class="n" title="' + esc(_t('Тип упражнения по степени свободы учащегося (Соловова, 2006, с. 32)')) + '"><b>' + _t('Тип') + '</b></th><th title="' + esc(_t('Отметки правил последовательности урока')) + '"><b>' + _t('Последовательность') + '</b></th>'; }
  /* Столбцы для строки урока – ПСУ и профиль */
  function unitCells(MA, key, cellHTML) {
    const L = MA && MA.lessons.find(x => x.key === key);
    if (!L) return '<td class="sep"></td><td></td><td></td>';
    return '<td class="sep"></td><td>' + cellHTML(L.SEQ, _t('ПСУ – показатель последовательности урока'), '') + '</td><td><span class="mx-prof">' + L.items.map(r => chip(r.method, r.id)).join('') + '</span></td>';
  }
  function unitHead() { return '<th></th><th class="n" title="' + esc(_t('Показатель последовательности урока')) + '"><b>' + _t('ПСУ') + '</b></th><th><b>' + _t('Профиль урока') + '</b></th>'; }

  /* Вид «Последовательность урока» – упражнения по порядку, высота столбика – ступень шкалы свободы */
  function seqView(MA, book, lessonRaters) {
    if (!MA) return '';
    const ls = MA.lessons.filter(L => book === '*' || L.book === book);
    const S = cfg();
    let h = legend() + '<div class="mx-lessons">';
    let lastB = null;
    for (const L of ls) {
      if (L.book !== lastB && (book === '*')) { h += '<h3 class="mx-book">' + esc(L.book) + '</h3>'; lastB = L.book; }
      const rated = lessonRaters ? lessonRaters(L.id) : '';
      h += '<div class="box mx-lesson' + (L.problem ? ' mx-problem' : '') + '"><div class="row" style="justify-content:space-between;align-items:baseline"><b>' + esc(L.unit || _t('Без урока')) + '</b><span class="small">' + _t('ПСУ ') + f2(L.SEQ) + (L.problem ? _t(' – достигает порога ') + f2(S.problemSEQ) : '') + '</span></div>' +
        (L.aim ? '<div class="small mute">' + _t('Цель урока – ') + esc(L.aim) + '</div>' : '') +
        '<div class="mx-seq" role="list">' + L.items.map((r, i) => {
          const m = r.method, fl = L.flags.filter(f => f.id === r.id && MT.RULE[f.rule].weight > 0);
          return '<div class="mx-col" role="listitem"><div class="mx-mark">' + fl.map(f => '<span class="mx-dot mx-' + f.rule + '" title="' + esc(RULE_NAME(f.rule) + ' – ' + f.text) + '">' + (f.rule === 'jump' ? '↑' : f.rule === 'return' ? '↓' : '•') + '</span>').join('') + '</div>' +
            '<button class="mx-bar mx-' + (m.n || 0) + (m.confLevel === 'low' ? ' mx-low' : '') + '" style="height:' + (14 + (m.n || 0.6) * 16) + 'px" data-id="' + r.id + '" title="' + esc('Ex. ' + (r.rec.ex || i + 1) + ' – ' + typeLabel(m) + (m.stage ? ', ' + stageLabel(m) : '') + ' – ' + r.rec.text) + '">' + (m.n || '?') + '</button>' +
            '<div class="mx-lab">' + esc(r.rec.ex || String(i + 1)) + '</div></div>';
        }).join('') + '</div>' +
        (L.flags.length ? '<ul class="issues small">' + L.flags.map(f => { const r = L.items.find(x => x.id === f.id); return '<li><span class="tag mx-' + f.rule + '">' + esc(RULE_NAME(f.rule)) + '</span>' + (r ? 'Ex. ' + esc(r.rec.ex || '') + ' – ' : '') + esc(f.text) + '.' + (MT.RULE[f.rule].alt ? ' <span class="mute">' + esc(MT.RULE[f.rule].alt) + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="small mute" style="margin:0">' + _t('Отметок нет.') + '</p>') +
        rated + '</div>';
    }
    h += '</div><p class="note">' + _t('Высота столбика – ступень шкалы свободы (1 подстановочное, 2 трансформационное, 3 условно-коммуникативное, 4 подлинно коммуникативное). Стрелка вверх – скачок, вниз – возврат, точка – порядок работы с текстом или пропущенный этап. ПСУ = сумма весов отметок / max(2, n − 1), где n – число упражнений с определённым типом. Клик по столбику открывает карточку.') + '</p>';
    return h;
  }

  /* ---------- Карточка ---------- */
  function cardBlock(MA, r) {
    const m = r.method; if (!m) return '';
    const L = MA && MA.lessons.find(x => x.items.includes(r));
    const k = L ? L.items.indexOf(r) : -1;
    const fl = L ? L.flags.filter(f => f.id === r.id) : [];
    const T = m.type ? MT.TYPE[m.type] : null;
    let h = '<h3>' + _t('Методика упражнения') + '</h3><div class="scroll"><table class="small"><tbody>' +
      '<tr><td>' + _t('Тип по степени свободы') + '</td><td>' + chip(m) + ' <b>' + esc(typeLabel(m)) + '</b>' + (T ? ' <span class="mute">(' + esc(en() ? T.name : T.en) + ')</span><div class="mute">' + esc(T.def) + ' – ' + esc(SRC(T.src)) + '</div>' : '') + '</td></tr>' +
      '<tr><td>' + _t('Группа') + '</td><td>' + esc(groupLabel(m)) + '</td></tr>' +
      '<tr><td>' + _t('Этап работы над материалом') + '</td><td>' + esc(phaseLabel(m)) + '</td></tr>' +
      (m.stage ? '<tr><td>' + _t('Этап работы с текстом') + '</td><td>' + esc(stageLabel(m)) + (m.again ? _t(' (повторное обращение к тексту)') : '') + '</td></tr>' : '') +
      '<tr><td>' + _t('Единица материала') + '</td><td>' + esc(m.unitName) + (m.unitBy ? ' <span class="mute">(' + (m.unitBy === 'exercise_text' ? _t('по тексту упражнения') : _t('по инструкции')) + ')</span>' : '') + '</td></tr>' +
      '<tr><td>' + _t('Надёжность определения') + '</td><td>' + CONF[m.confLevel] + ' (' + f2(m.conf) + ')</td></tr>' +
      '<tr><td>' + _t('Обоснование') + '</td><td>' + (m.why.length ? esc(m.why.join('; ')) : '—') + '</td></tr>';
    if (L) h += '<tr><td>' + _t('Место в уроке') + '</td><td>' + (k + 1) + _t(' из ') + L.items.length + ' <span class="mx-prof">' + L.items.map(x => x === r ? chip(x.method, '', ' style="outline:2px solid var(--ink)"') : chip(x.method)).join('') + '</span>' +
      (L.aim ? '<div class="mute">' + _t('Цель урока – ') + esc(L.aim) + '</div>' : '<div class="mute">' + _t('Цель урока в данных не указана – для R7 её выведет модель из заголовка и материала урока.') + '</div>') + '</td></tr>';
    h += '</tbody></table></div>';
    if (fl.length) h += '<ul class="issues small">' + fl.map(f => '<li><span class="tag mx-' + f.rule + '">' + esc(RULE_NAME(f.rule)) + '</span>' + esc(f.text) + ' <span class="mute">(' + esc(SRC(MT.RULE[f.rule].src)) + ')' + (MT.RULE[f.rule].alt ? ' ' + esc(MT.RULE[f.rule].alt) : '') + '</span></li>').join('') + '</ul>';
    return h;
  }

  /* ---------- Статистика ---------- */
  function statsBlock(MA, cellHTML, kpi) {
    if (!MA) return '';
    const st = MA.stats, S = cfg();
    const pc = (a, b) => E.pct(a || 0, b);
    let h = '<h2 style="margin-top:34px">' + _t('Методика упражнений') + '</h2><div class="kpis">' + kpi(st.lessons, _t('уроков')) + kpi(f2(st.meanSEQ), _t('средний ПСУ')) + kpi(st.problem, _t('уроков с ПСУ ≥ ') + E.fmt(S.problemSEQ, 2)) +
      kpi(pc(st.groups.speech, st.n), _t('речевых упражнений')) + kpi(pc(st.conf.low, st.n), _t('с низкой надёжностью типа')) + '</div>';
    const cols = M.TYPES.map(t => [t.id, en() ? t.en : t.name]).concat([['none', _t('не определён')]]);
    h += '<h3>' + _t('Распределение типов по учебникам') + '</h3><div class="scroll"><table><thead><tr><th>' + _t('Учебник') + '</th><th class="n">n</th>' + cols.map(c => '<th class="n">' + esc(c[1]) + '</th>').join('') + '<th class="n">' + _t('Уроков') + '</th><th class="n">' + _t('Средний ПСУ') + '</th></tr></thead><tbody>' +
      st.books.map(b => '<tr><td>' + esc(b.book) + '</td><td class="n">' + b.n + '</td>' + cols.map(c => '<td class="n">' + (b.types[c[0]] || 0) + ' <span class="mute small">' + pc(b.types[c[0]], b.n) + '</span></td>').join('') + '<td class="n">' + b.lessons + '</td><td class="n">' + f2(b.meanSEQ) + '</td></tr>').join('') + '</tbody></table></div>';
    const cnt = (o, list, lab) => '<table><tbody>' + list.map(x => '<tr><td>' + esc(lab(x)) + '</td><td class="n">' + (o[x.id] || 0) + '</td></tr>').join('') + '</tbody></table>';
    h += '<div class="grid2"><div><h3>' + _t('Этапы работы над материалом') + '</h3>' + cnt(st.phases, M.PHASES, x => en() ? x.en : x.name) + '</div><div><h3>' + _t('Этапы работы с текстом') + '</h3>' + cnt(st.stages, M.TEXT_STAGES, x => en() ? x.en : x.name) + '</div><div><h3>' + _t('Единица материала') + '</h3>' + cnt(st.units, M.UNITS, x => x.name) + '</div></div>';
    h += '<h3>' + _t('Типичные нарушения последовательности') + '</h3><div class="scroll"><table><thead><tr><th>' + _t('Правило') + '</th><th>' + _t('Признак') + '</th><th class="n">' + _t('Вес') + '</th><th class="n">' + _t('Отметок') + '</th><th class="n">' + _t('Уроков') + '</th><th>' + _t('Источник') + '</th></tr></thead><tbody>' +
      st.rules.map(x => { const Rr = MT.RULE[x.id]; const w = x.id === 'return' ? (S.countReturn ? S.wReturn : 0) : x.id === 'textOrder' ? S.wText : Rr.weight; return '<tr><td><b>' + esc(Rr.name) + '</b></td><td class="small">' + esc(Rr.text) + (Rr.alt ? ' <span class="mute">' + esc(Rr.alt) + '</span>' : '') + '</td><td class="n">' + E.fmt(w, 1) + '</td><td class="n">' + x.n + '</td><td class="n">' + x.lessons + '</td><td class="small mute">' + esc(SRC(Rr.src)) + (Rr.altSrc ? '; ' + esc(SRC(Rr.altSrc)) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    h += '<h3>' + _t('Уроки') + '</h3><div class="scroll"><table class="heat"><thead><tr><th>' + _t('Урок') + '</th><th class="n">n</th><th class="n">' + _t('ПСУ') + '</th><th>' + _t('Профиль') + '</th><th>' + _t('Отметки') + '</th></tr></thead><tbody>' +
      MA.lessons.map(L => '<tr><td class="lab" style="cursor:default"><div class="t">' + esc(L.unit || '—') + '</div><div class="m">' + esc(L.book) + '</div></td><td class="n small">' + L.n + '</td><td>' + cellHTML(L.SEQ, _t('ПСУ'), '') + '</td><td><span class="mx-prof">' + L.items.map(r => chip(r.method, r.id)).join('') + '</span></td><td class="small">' + (L.flags.filter(f => MT.RULE[f.rule].weight > 0).map(f => esc(RULE_NAME(f.rule))).join(', ') || '—') + '</td></tr>').join('') + '</tbody></table></div>' + legend();
    return h;
  }

  /* ---------- Настройки ---------- */
  function settingsHTML() {
    const S = cfg();
    return '<div class="box" style="margin-top:18px" id="mxSet"><h3 style="margin-top:0">' + _t('Методика упражнений') + '</h3>' +
      '<label class="f">' + _t('Названия типов и этапов') + '<select data-ms="view"><option value="ru"' + (S.view !== 'en' ? ' selected' : '') + '>' + _t('отечественная методика (Соловова, 2006)') + '</option><option value="en"' + (S.view === 'en' ? ' selected' : '') + '>' + _t('зарубежные соответствия (controlled – guided – communicative, ESA)') + '</option></select></label>' +
      '<div class="note">' + _t('Классификация одна – шкала степени свободы учащегося. Переключатель меняет названия в карте, карточке и статистике.') + '</div>' +
      '<label class="f" style="margin-top:8px">' + _t('Порог урока по ПСУ') + '<input type="number" data-ms="problemSEQ" value="' + S.problemSEQ + '" min="0" max="1" step="0.05"></label>' +
      '<label class="chk"><input type="checkbox" data-ms="countReturn"' + (S.countReturn ? ' checked' : '') + '><span>' + _t('Учитывать возврат к языковому упражнению после речевого задания') + '</span></label>' +
      '<label class="f">' + _t('Вес возврата') + '<input type="number" data-ms="wReturn" value="' + S.wReturn + '" min="0" max="1" step="0.25"></label>' +
      '<label class="f" style="margin-top:6px">' + _t('Вес нарушения порядка работы с текстом') + '<input type="number" data-ms="wText" value="' + S.wText + '" min="0" max="1" step="0.25"></label>' +
      '<div class="note">' + _t('Скачок и отсутствие выхода в речь имеют вес 1. Для учебников, построенных от задания к анализу языка (boomerang, test-teach-test), возврат стоит не учитывать.') + '</div></div>';
  }
  function bindSettings(rerun) {
    $('#v-settings').addEventListener('change', e => {
      const t = e.target; if (!t.dataset || !t.dataset.ms) return;
      store.settings.method = Object.assign({}, MT.DEFAULTS, store.settings.method || {});
      store.settings.method[t.dataset.ms] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? +t.value : t.value;
      save(); rerun();
    });
  }

  /* ---------- Рубрика урока ---------- */
  function lessonLabel(L, i) { return (i + 1) + '. ' + (L.book ? L.book + ' · ' : '') + (L.unit || _t('Без урока')) + ' (' + L.n + ')'; }
  function lessonHead(L) {
    return '<div class="box paper"><div class="small mute">' + esc(L.book) + ' · ' + esc(L.unit || '') + (L.aim ? _t(' · цель – ') + esc(L.aim) : _t(' · цель в данных не указана')) + '</div><ol class="serif" style="margin:8px 0 0;padding-left:22px;font-size:16px;line-height:1.5">' +
      L.items.map(r => '<li>' + (r.rec.ex ? '<span class="small mute">Ex. ' + esc(r.rec.ex) + '</span> ' : '') + esc(r.rec.text) + (r.rec.exercise_text ? '<div class="small mute">' + esc(String(r.rec.exercise_text).slice(0, 160)) + '</div>' : '') + '</li>').join('') + '</ol></div>';
  }
  function promptLessons(list, level) {
    const crit = R.LESSON_RUBRIC.map(q => q.code + ' ' + q.name + '. ' + q.q + '\n  ' + q.a.slice().reverse().join('\n  ')).join('\n');
    return _t('Ты – эксперт по методике обучения иностранным языкам. Оцени уроки учебников английского языка как последовательность упражнений по рубрике ') + R.LESSON_RUBRIC_VERSION + '.\n\n' +
      _t('Шкала для каждого критерия – 2 (соответствует), 1 (частично), 0 (не соответствует) или "na" (неприменимо). Опирайся на отечественную методику – ознакомление, тренировка, применение, переход от языковых упражнений к условно-речевым и речевым, три этапа работы с текстом. Порядок «задание, затем анализ языка» допустим, если он оправдан целью урока. Если цель урока не указана, сформулируй её сама по заголовку и упражнениям и укажи в поле aim.\n\n') +
      _t('Критерии\n') + crit + '\n\n' +
      _t('Для каждого критерия верни балл и обоснование в одно-два предложения на русском языке с номерами упражнений, на которые опирается оценка.\n\n') +
      _t('Ответ – только JSON-массив без пояснений и без разметки, по схеме\n[{"id": "<id урока>", "aim": "…", "scores": {"L1": {"score": 2, "rationale": "…"}, "L2": {"score": 1, "rationale": "…"}}}]\n\n') +
      _t('Уроки (по одному в строке, JSON)\n') + list.map(L => JSON.stringify({ id: L.id, book: L.book, unit: L.unit, level: (L.items[0] || {}).targetName, aim: L.aim || undefined,
        exercises: L.items.map(r => ({ ex: r.rec.ex || undefined, section: r.rec.section || undefined, aspect: r.rec.aspect || undefined, text: r.rec.text, exercise_text: r.rec.exercise_text ? String(r.rec.exercise_text).slice(0, 300) : undefined })) })).join('\n');
  }
  function rcfgLessons(MA) {
    store.lessonRubric = store.lessonRubric || { experts: {}, models: {} };
    store.lessonUi = store.lessonUi || { cur: null, expert: '', model: '', raterA: '', raterB: '' };
    return {
      mode: 'lessons', list: R.LESSON_RUBRIC, version: R.LESSON_RUBRIC_VERSION, pv: LPROMPT_VERSION, slot: store.lessonRubric, ui: store.lessonUi,
      items: MA ? MA.lessons : [], file: 'lessons', noun: [_t('урок'), _t('урока'), _t('уроков')], what: _t('Урок'), whatAll: _t('Все уроки'), whatCur: _t('Текущий урок'),
      label: lessonLabel, head: lessonHead, prompt: list => promptLessons(list)
    };
  }

  /* ---------- Вкладка «Методика» ---------- */
  function docHTML(MA) {
    const S = cfg();
    return '<h3>' + _t('Методика упражнений (method-0.1)') + '</h3><p>' + _t('Каждая инструкция получает тип по шкале степени свободы учащегося. Отечественная методика выделяет подстановочные, трансформационные, условно-коммуникативные и подлинно коммуникативные упражнения (Соловова, 2006, с. 32). Первые два типа объединяются в языковые (доречевые), третий соответствует условно-речевым, четвёртый – речевым упражнениям. Зарубежные пособия описывают ту же шкалу как controlled, guided и communicative practice (Соловова, 2006, с. 32; Harmer, с. 85; Scrivener, с. 127, 168).') + '</p>' +
      '<div class="scroll"><table class="small"><thead><tr><th>' + _t('Тип') + '</th><th>' + _t('Признак') + '</th><th>' + _t('Соответствие') + '</th><th>' + _t('Источник') + '</th></tr></thead><tbody>' +
      M.TYPES.map(t => '<tr><td>' + chip({ n: t.n, type: t.id, group: t.group }) + ' ' + esc(t.name) + '</td><td>' + esc(t.def) + '</td><td>' + esc(t.en) + '</td><td class="mute">' + esc(SRC(t.src)) + '</td></tr>').join('') + '</tbody></table></div>' +
      '<p>' + _t('Тип определяется по типу задания и глаголу-установке, указанию на форму (correct form, in brackets, грамматический термин), образцу, опорам, признакам речевой ситуации (собственная цель высказывания, информационный разрыв, личный опыт) и связи с текстом. Надёжность определения складывается из трёх признаков – известен ли тип задания (0,2), есть ли решающий признак (0,3), нет ли противоречия (минус 0,3) при базе 0,4.') + '</p>' +
      '<p>' + _t('Этап работы над материалом – ознакомление, тренировка, применение (Соловова, 2006, с. 115), у Скривенера – clarification, restricted output, authentic output (с. 159-160), у Хармера – Study и Activate (с. 84). Задания к текстам получают этап работы с текстом – дотекстовый, текстовый, послетекстовый (Соловова, 2006, с. 136-139, 161-163). Единица материала – слово, словосочетание, предложение, сверхфразовое единство (там же, с. 93-98).') + '</p>' +
      '<p>' + _t('Правила последовательности урока и их веса') + '</p><ul class="issues small">' + M.RULES.map(x => '<li><b>' + esc(x.name) + '</b> – ' + esc(x.text) + ' <span class="mute">(' + esc(SRC(x.src)) + ')' + (x.alt ? ' ' + esc(x.alt) + ' (' + esc(SRC(x.altSrc)) + ')' : '') + '</span></li>').join('') + '</ul>' +
      '<p><code>' + _t('ПСУ = (скачки + w·возвраты + пропуски выхода в речь + wт·нарушения порядка работы с текстом) / max(2, n − 1)') + '</code>, ' + _t('сейчас w = ') + E.fmt(S.countReturn ? S.wReturn : 0, 2) + ', ' + _t('wт = ') + E.fmt(S.wText, 2) + _t(', порог урока – ') + E.fmt(S.problemSEQ, 2) + _t('. Показатель не выносит вердикт – он показывает уроки, порядок упражнений в которых стоит проверить эксперту.') + '</p>' +
      '<p>' + _t('Уместность задания (R7) и последовательность урока (L1, L2) оценивают эксперт и языковая модель. Цель урока берётся из необязательного столбца aim (цель урока), если его нет – модель выводит цель из заголовка и упражнений урока.') + '</p>' +
      '<h3>' + _t('Источники методики упражнений') + '</h3><ol class="small">' + Object.values(M.SOURCES).map(s => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      '<p class="note">' + _t('Модуль ') + MT.VERSION + _t(', эталоны ') + R.METHOD_VERSION + _t(', интерфейс модуля ') + VERSION + _t(', рубрика урока ') + R.LESSON_RUBRIC_VERSION + _t(', промпт урока ') + LPROMPT_VERSION + '.</p>';
  }

  /* ---------- Экспорт ---------- */
  function exportPart(MA) {
    if (!MA) return null;
    return { version: MA.version, resources: MA.resources, ui: VERSION, settings: MA.settings, lessonRubricVersion: R.LESSON_RUBRIC_VERSION, lessonPromptVersion: LPROMPT_VERSION,
      exercises: MA.lessons.flatMap(L => L.items.map(r => ({ id: r.id, type: r.method.type, n: r.method.n, group: r.method.group, phase: r.method.phase, stage: r.method.stage, unit: r.method.unit, conf: r.method.conf, why: r.method.why }))),
      lessons: MA.lessons.map(L => ({ id: L.id, book: L.book, unit: L.unit, aim: L.aim, profile: L.profile, SEQ: L.SEQ, flags: L.flags })),
      stats: MA.stats, conclusions: MA.conclusions, lessonRubric: store.lessonRubric || null };
  }
  const CSV_HEAD = ['method_type', 'method_step', 'method_group', 'method_phase', 'method_text_stage', 'method_unit', 'method_confidence', 'lesson_SEQ', 'lesson_flags'];
  function csvCells(MA, r) {
    const m = r.method || {}; const L = MA && MA.lessons.find(x => x.items.includes(r));
    return [m.type || '', m.n || '', m.group || '', m.phase || '', m.stage || '', m.unit || '', m.conf == null ? '' : E.fmt(m.conf, 2), L && L.SEQ != null ? E.fmt(L.SEQ, 3) : '', L ? L.flags.filter(f => f.id === r.id).map(f => f.rule).join(', ') : ''];
  }

  return { VERSION, LPROMPT_VERSION, chip, legend, exCells, exHead, unitCells, unitHead, seqView, cardBlock, statsBlock, settingsHTML, bindSettings, rcfgLessons, docHTML, exportPart, CSV_HEAD, csvCells, typeLabel };
};
