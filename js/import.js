/* Импорт инструкций из учебника. Версия import-0.1.
   Источники – PDF (pdf.js, подгружается при первом PDF), .docx (жирное начертание, стили, автонумерация Word),
   веб-страница (сохранённый файл .html, вставка из буфера обмена, адрес страницы), .txt.
   Каждый читатель приводит источник к списку строк { text, bold, head, size, font, page, y, para },
   extract() находит уроки, номера упражнений, инструкции и начало материала упражнения.
   Результат – кандидаты для просмотра исследователем, а не готовый корпус. */
(function (g) {
  const _t = g._t || (s => s);
  const VERSION = 'import-0.1';

  /* ---------- признаки инструкции ---------- */
  const VERBS = new Set(('act add answer arrange ask brainstorm build change check choose circle classify close colour color combine compare complete ' +
    'continue copy correct count cover create cross decide define describe design discuss divide do draw explain fill find finish follow give go group guess ' +
    'highlight identify imagine interview join judge label learn list listen look make mark match memorise memorize note number open order ' +
    'paraphrase pick plan play point practise practice predict prepare present pronounce put rank read record remember repeat replace report ' +
    'rephrase retell review rewrite role-play roleplay say scan see share show sing skim sort speak spell study summarise summarize swap take ' +
    'talk tell think tick transform translate try turn underline use vote watch work write').split(' '));
  /* Обстоятельство перед глаголом – In pairs, discuss… Now listen… */
  const LEAD = /^(?:(?:now|then|first(?:ly)?|next|finally|also|again|together|individually|quickly|in pairs|in (?:small )?groups|in teams|in threes|with (?:a|your) partner|as a class|before (?:you )?(?:read|listen|watch|start)(?:ing)?|after (?:you )?(?:read|listen|watch)(?:ing)?|while (?:you )?(?:read|listen|watch)(?:ing)?|when you (?:have )?finish(?:ed)?)\s*,?\s+)/i;
  const CONT = /^(?:then|use|don['’]t|do not|there (?:is|are)|you (?:can|will|may|need|should)|make sure|remember|each|one|try|add|compare|check|now|after that|finally)\b/i;
  const words = s => (String(s).match(/[A-Za-zА-Яа-яЁё0-9]+(?:['’-][A-Za-z]+)*/g) || []).length;

  function firstVerb(t) {
    let s = String(t).trim().replace(/^["“'‘(]+/, ''), lead = false;
    for (let k = 0; k < 2; k++) { const m = s.match(LEAD); if (!m) break; s = s.slice(m[0].length); lead = true; }
    const w = (s.match(/^[A-Za-z]+(?:-[a-z]+)?/) || [''])[0];
    if (!w) return null;
    if (!lead && !/^[A-Z]/.test(w)) return null;
    return VERBS.has(w.toLowerCase()) ? w.toLowerCase() : null;
  }
  /* Инструкция – начинается с глагола-установки, не короче трёх слов, без пропусков ___ в первом предложении */
  function isInstr(t) {
    t = String(t).trim();
    if (words(t) < 3) return false;
    if (!firstVerb(t)) return false;
    const s1 = t.split(/(?<=[.!?:])\s/)[0];
    if (/_{2,}|\.{4,}|…{2,}/.test(s1)) return false;
    if (/^(?:look|see|watch|go|turn|point|try|say|tell|play|show|take|do)\b/i.test(t) && /[!?]$/.test(s1) && words(s1) < 5) return false;
    return true;
  }

  /* ---------- разметка строки ---------- */
  const RE_UNIT = /^(?:unit|lesson|module|chapter|section|topic|part|урок|раздел|модуль|глава|тема)\s*[:.№#]?\s*(\d{1,3}[a-z]?|[ivxlc]{1,6})\b\s*[:.–—-]?\s*(.*)$/i;
  const RE_CODE = /^(\d{1,2}[A-D])\b\s*[:.–—-]?\s*(.{0,80})$/;
  const RE_NUM = /^(?:(?:ex(?:ercise)?|task|activity|упр(?:ажнение)?)\.?\s*)?(\d{1,2})([a-h])?\s*[.):]?\s+(?=\S)/i;
  const RE_NUM_ONLY = /^(?:(?:ex(?:ercise)?|task|activity)\.?\s*)?(\d{1,2})([a-h])?\s*[.):]?$/i;
  const RE_SUB = /^\(?([a-h])\s*[.)]\s+(?=\S)|^([a-h])\s+(?=[A-Z])/;
  const RE_ITEM = /^(?:\(?(?:\d{1,2}|[a-h]|[ivx]{1,4})\s*[.)]\s|\d{1,2}\s+(?=[a-z_…"“'])|[•▪●○◦■□✓✗\-–—*]\s)/;

  function unitOf(b, medSize) {
    const t = b.text.trim();
    if (words(t) > 14) return null;
    let m = t.match(RE_UNIT);
    if (m && !isInstr(m[2]) && !/^\d/.test(m[2] || '')) { const n = m[1]; const kind = t.match(/^\S+/)[0].replace(/[:.]$/, ''); return { unit: kind.charAt(0).toUpperCase() + kind.slice(1).toLowerCase() + ' ' + n.toUpperCase(), title: (m[2] || '').trim() }; }
    m = t.match(RE_CODE);
    if (m && (b.head || (b.size && medSize && b.size >= medSize * 1.3)) && !isInstr(m[2])) return { unit: m[1].toUpperCase(), title: m[2].trim() };
    return null;
  }

  /* Инструкция внутри длинного абзаца обрывается перед первым пунктом упражнения или пропуском */
  function cutInstr(t) {
    t = t.replace(/\s+/g, ' ').trim();
    const re = /\s(?:\(?(?:1|a|i)\s*[.)]|\(1\)|1\s+(?=[A-Za-z_]))\s/g; let m, cut = -1;
    while ((m = re.exec(t))) { if (words(t.slice(0, m.index)) >= 3) { cut = m.index; break; } }
    const gap = t.search(/_{2,}|\.{4,}|…/);
    if (gap > 0 && (cut < 0 || gap < cut)) { const pre = t.slice(0, gap); const e = Math.max(pre.lastIndexOf('. '), pre.lastIndexOf(': '), pre.lastIndexOf('? '), pre.lastIndexOf('! ')); if (e > 0 && words(pre.slice(0, e)) >= 3) cut = e + 1; }
    if (cut < 0 && words(t) > 60) { const ss = t.split(/(?<=[.!?])\s+/); cut = ss.slice(0, 2).join(' ').length; }
    if (cut < 0) return { instr: t, rest: '' };
    return { instr: t.slice(0, cut).trim(), rest: t.slice(cut).trim() };
  }

  /* ---------- склейка строк PDF и простого текста в абзацы ---------- */
  function startsMarker(t) { return RE_UNIT.test(t) || RE_NUM.test(t) || RE_NUM_ONLY.test(t) || RE_SUB.test(t) || RE_ITEM.test(t); }
  function blocks(lines) {
    const out = [];
    lines.forEach(l => {
      const t = String(l.text || '').replace(/\s+/g, ' ').trim(); if (!t) return;
      const p = out[out.length - 1];
      const join = p && !l.para && !p.para && p.page === l.page && !startsMarker(t) && !p.closed &&
        (l.font == null || p.font === l.font || (p.size && l.size && Math.abs(p.size - l.size) < 0.6)) &&
        (l.y == null || p.y == null || (p.y - l.y > 0 && p.y - l.y <= (l.size || 10) * 1.9)) &&
        !/[.!?:]["”’)]?$/.test(p.text) && (l.y != null || /^[a-z(]/.test(t)) && !(p.head && !l.head);
      if (join) {
        p.text = /[A-Za-z]-$/.test(p.text) && /^[a-z]/.test(t) ? p.text.slice(0, -1) + t : p.text + ' ' + t;
        p.y = l.y; p.n++;
      } else out.push({ text: t, bold: !!l.bold, head: l.head || 0, size: l.size || 0, font: l.font, page: l.page || 0, y: l.y, para: !!l.para, n: 1 });
    });
    return out;
  }

  /* ---------- поиск инструкций ---------- */
  function pass(bl, medSize) {
    const out = []; let unit = '', lastNum = '', pending = null, cur = null;
    const close = () => { if (cur) { cur.exercise_text = cur.content.join('\n').slice(0, 1500).trim(); delete cur.content; delete cur.open; out.push(cur); cur = null; } };
    const start = (b, ex, text, conf, why) => {
      close();
      const c = cutInstr(text);
      cur = { unit, ex, text: c.instr, conf, why, page: b.page, font: b.font, bold: b.bold, open: !c.rest, content: c.rest ? [c.rest] : [] };
    };
    bl.forEach(b => {
      const t = b.text.trim();
      const u = unitOf(b, medSize);
      if (u) { close(); unit = u.unit; lastNum = ''; pending = null; return; }
      const mo = t.match(RE_NUM_ONLY);
      if (mo && t.length <= 12) { pending = { n: mo[1] + (mo[2] || ''), page: b.page, y: b.y, size: b.size }; return; }
      /* номер упражнения на отдельной строке действует только для ближайшей строки той же страницы (не номер страницы) */
      if (pending && (pending.page !== b.page || (pending.y != null && b.y != null && Math.abs(pending.y - b.y) > Math.max(pending.size || 10, b.size || 10) * 3))) pending = null;
      const mn = t.match(RE_NUM);
      if (mn) {
        const rest = t.slice(mn[0].length), ex = mn[1] + (mn[2] || '');
        if (isInstr(rest)) { start(b, ex, rest, 'high', _t('номер и глагол-установка')); lastNum = mn[1]; pending = null; return; }
        if (b.bold && words(rest) >= 3 && words(rest) <= 40 && /^[A-Z]/.test(rest) && !/_{2,}/.test(rest)) { start(b, ex, rest, 'mid', _t('номер и выделение шрифтом')); lastNum = mn[1]; pending = null; return; }
      }
      const ms = t.match(RE_SUB);
      if (ms && lastNum) {
        const rest = t.slice(ms[0].length);
        if (isInstr(rest)) { start(b, lastNum + (ms[1] || ms[2]), rest, b.bold ? 'high' : 'mid', _t('подпункт упражнения ') + lastNum); pending = null; return; }
      }
      if (pending && isInstr(t)) { start(b, pending.n, t, 'high', _t('номер и глагол-установка')); lastNum = pending.n.replace(/[a-h]$/, ''); pending = null; return; }
      pending = null;
      if (isInstr(t) && !RE_ITEM.test(t)) {
        if (cur && cur.open && cur.ex && words(cur.text) + words(t) <= 70 && cur.page === b.page) { const c = cutInstr(t); cur.text += ' ' + c.instr; if (c.rest) { cur.content.push(c.rest); cur.open = false; } return; }
        if (words(t) <= 45) { start(b, '', t, b.bold ? 'mid' : 'low', b.bold ? _t('глагол-установка и выделение шрифтом, без номера') : _t('глагол-установка, без номера')); return; }
      }
      if (cur && cur.open && CONT.test(t) && words(t) <= 30 && !!b.bold === !!cur.bold && !RE_ITEM.test(t)) { const c = cutInstr(t); cur.text += ' ' + c.instr; if (c.rest) { cur.content.push(c.rest); cur.open = false; } return; }
      /* заголовок раздела после материала упражнения завершает упражнение */
      if (cur && !cur.open && cur.content.length && (b.head || (b.size && medSize && b.size >= medSize * 1.15))) { close(); return; }
      if (cur) { cur.open = false; cur.content.push(t); }
    });
    close();
    return out;
  }
  function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

  function extract(lines) {
    const bl = blocks(lines);
    const medSize = median(bl.filter(b => b.size).map(b => b.size));
    let res = pass(bl, medSize);
    /* Шрифт инструкций в PDF – тот, которым набраны уверенно найденные инструкции; его блоки считаются выделенными */
    const fc = {}; res.filter(c => c.conf === 'high' && c.font).forEach(c => { fc[c.font] = (fc[c.font] || 0) + 1; });
    const all = {}; bl.forEach(b => { if (b.font) all[b.font] = (all[b.font] || 0) + 1; });
    const fonts = Object.keys(fc).filter(f => fc[f] >= 2 && all[f] <= bl.length * 0.4);
    if (fonts.length) { bl.forEach(b => { if (fonts.includes(b.font)) b.bold = true; }); res = pass(bl, medSize); }
    let k = 0;
    res = res.filter((c, i) => c.text && !(i && res[i - 1].text === c.text && res[i - 1].unit === c.unit));
    res.forEach(c => { c.id = 'c' + (++k); c.on = c.conf !== 'low'; delete c.font; delete c.bold; });
    return { candidates: res, blocks: bl.length, units: [...new Set(res.map(c => c.unit).filter(Boolean))] };
  }

  /* ---------- PDF ---------- */
  const BASE = (() => { try { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/import\.js(\?.*)?$/, '') : 'js/'; } catch (e) { return 'js/'; } })();
  let pdfLoading = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(_t('Не удалось загрузить ') + src)); document.head.appendChild(s); }); }
  function loadPdfJs() {
    if (g.pdfjsLib && g.pdfjsWorker) return Promise.resolve(g.pdfjsLib);
    if (!pdfLoading) pdfLoading = loadScript(BASE + 'vendor/pdfjs-worker.js').then(() => loadScript(BASE + 'vendor/pdfjs.js')).then(() => g.pdfjsLib).catch(e => { pdfLoading = null; throw new Error(_t('Модуль чтения PDF не загрузился. Проверьте, что в папке js/vendor есть файлы pdfjs.js и pdfjs-worker.js.')); });
    return pdfLoading;
  }
  function pageLines(tc, W, pageNo) {
    const it = tc.items.filter(x => x.str != null && x.str !== '').map(x => {
      const tr = x.transform; const h = Math.hypot(tr[2], tr[3]) || x.height || 10;
      return { s: x.str, x: tr[4], y: tr[5], w: x.width || x.str.length * h * 0.5, h, f: x.fontName };
    }).filter(x => x.s.trim() || x.s === ' ');
    it.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows = [];
    it.forEach(x => { const r = rows.find(r => Math.abs(r.y - x.y) <= Math.max(r.h, x.h) * 0.45); if (r) { r.items.push(x); r.h = Math.max(r.h, x.h); } else rows.push({ y: x.y, h: x.h, items: [x] }); });
    const segs = [];
    rows.forEach(r => {
      r.items.sort((a, b) => a.x - b.x);
      let seg = null;
      r.items.forEach(x => {
        const gap = seg ? x.x - seg.x1 : 0;
        if (!seg || gap > Math.max(seg.h, x.h) * 2.2) { seg = { x0: x.x, x1: x.x + x.w, y: r.y, h: x.h, parts: [], fonts: {} }; segs.push(seg); }
        else if (gap > x.h * 0.12 && !/\s$/.test(seg.parts.join('')) && !/^\s/.test(x.s)) seg.parts.push(' ');
        seg.parts.push(x.s); seg.x1 = Math.max(seg.x1, x.x + x.w); seg.h = Math.max(seg.h, x.h);
        seg.fonts[x.f] = (seg.fonts[x.f] || 0) + x.s.length;
      });
    });
    /* Две колонки – большинство отрезков целиком в левой или правой половине */
    const L = segs.filter(s => s.x1 < W * 0.53), Rr = segs.filter(s => s.x0 > W * 0.47), span = segs.filter(s => !(s.x1 < W * 0.53) && !(s.x0 > W * 0.47));
    let order = segs;
    if (L.length >= 5 && Rr.length >= 5 && span.length < segs.length * 0.25) {
      const top = Math.max(...L.concat(Rr).map(s => s.y));
      const by = (a, b) => b.y - a.y;
      order = span.filter(s => s.y > top).sort(by).concat(L.sort(by), Rr.sort(by), span.filter(s => s.y <= top).sort(by));
    }
    return order.map(s => ({ text: s.parts.join('').replace(/\s+/g, ' ').trim(), size: Math.round(s.h * 10) / 10, font: Object.entries(s.fonts).sort((a, b) => b[1] - a[1])[0][0], page: pageNo, y: s.y, x: s.x0 })).filter(l => l.text);
  }
  async function readPdf(buf, opt) {
    opt = opt || {};
    const lib = await loadPdfJs();
    const task = lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, stopAtErrors: false });
    const doc = await task.promise;
    const n = doc.numPages, from = Math.max(1, +opt.from || 1), to = Math.min(n, +opt.to || n);
    const lines = []; let chars = 0;
    for (let p = from; p <= to; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const ls = pageLines(tc, vp.width, p);
      ls.forEach(l => { chars += l.text.length; lines.push(l); });
      if (opt.progress) opt.progress(p - from + 1, to - from + 1);
      page.cleanup();
    }
    const pages = to - from + 1;
    try { await task.destroy(); } catch (e) { /* документ уже закрыт */ }
    return { lines, pages, total: n, from, to, chars, scanned: chars < pages * 40 };
  }

  /* ---------- Word ---------- */
  async function readDocx(buf) {
    const ps = await g.IA_DOCX.readDocxRich(buf);
    return { lines: ps.map(p => ({ text: (p.list ? p.list.n + (p.list.lvl ? ') ' : '. ') : '') + p.text.replace(/\n/g, ' '), bold: p.bold, head: p.head, para: true, page: 0 })) };
  }

  /* ---------- веб-страница ---------- */
  const BLOCK = new Set('ADDRESS ARTICLE ASIDE BLOCKQUOTE BODY CAPTION DD DETAILS DIV DL DT FIELDSET FIGCAPTION FIGURE FOOTER FORM H1 H2 H3 H4 H5 H6 HEADER HR LI MAIN NAV OL P PRE SECTION SUMMARY TABLE TBODY TD TFOOT TH THEAD TR UL LEGEND'.split(' '));
  const SKIP = new Set('SCRIPT STYLE NOSCRIPT TEMPLATE SVG CANVAS IFRAME BUTTON SELECT OPTION NAV FOOTER HEAD'.split(' '));
  const boldEl = el => { const t = el.tagName; if (t === 'B' || t === 'STRONG') return true; const st = (el.getAttribute && el.getAttribute('style')) || ''; if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(st)) return true; const c = (el.getAttribute && el.getAttribute('class')) || ''; return /\b(bold|instruction|rubric|task|direction|exercise-?title)\b/i.test(c); };
  function readHtml(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const out = []; let buf = '', bN = 0, all = 0, head = 0;
    const flush = () => { const t = buf.replace(/\s+/g, ' ').trim(); if (t) out.push({ text: t, bold: all > 0 && bN / all >= 0.6, head, para: true, page: 0 }); buf = ''; bN = 0; all = 0; };
    function walk(node, bold, hd) {
      for (let ch = node.firstChild; ch; ch = ch.nextSibling) {
        if (ch.nodeType === 3) { const s = ch.nodeValue; buf += s; const n = s.replace(/\s/g, '').length; all += n; if (bold) bN += n; if (n) head = hd; continue; }
        if (ch.nodeType !== 1) continue;
        const tag = ch.tagName;
        if (SKIP.has(tag) || ch.hidden || /display\s*:\s*none/i.test(ch.getAttribute('style') || '')) continue;
        if (tag === 'BR') { flush(); continue; }
        if (tag === 'IMG') { const a = ch.getAttribute('alt'); if (a && a.length < 40) buf += ' '; continue; }
        if (tag === 'INPUT' || tag === 'TEXTAREA') { buf += ' ___ '; continue; }
        const b = bold || boldEl(ch), h = /^H[1-6]$/.test(tag) ? +tag[1] : hd;
        if (BLOCK.has(tag)) {
          flush();
          if (tag === 'LI' && ch.parentElement && ch.parentElement.tagName === 'OL') {
            const ol = ch.parentElement, items = [...ol.children].filter(x => x.tagName === 'LI');
            const n = +(ch.getAttribute('value') || 0) || ((+ol.getAttribute('start') || 1) + items.indexOf(ch));
            const tp = ol.getAttribute('type') || '';
            buf += (tp === 'a' ? String.fromCharCode(96 + n) + ') ' : tp === 'A' ? String.fromCharCode(64 + n) + ') ' : n + '. ');
          }
          walk(ch, b, h); flush();
        } else walk(ch, b, h);
      }
    }
    walk(doc.body || doc.documentElement, false, 0); flush();
    const title = (doc.querySelector('title') || {}).textContent || '';
    return { lines: out, title: title.trim() };
  }
  async function readUrl(url) {
    let resp;
    try { resp = await fetch(url, { mode: 'cors', credentials: 'omit' }); }
    catch (e) { const err = new Error(_t('Сайт не разрешает читать страницу из другого места (так устроена защита браузеров). Откройте страницу, выделите всё (Cmd+A или Ctrl+A), скопируйте и вставьте в поле «Вставить со страницы». Можно также сохранить страницу как файл .html и выбрать этот файл.')); err.kind = 'cors'; throw err; }
    if (!resp.ok) throw new Error(_t('Страница не открылась – ответ сервера ') + resp.status + _t('. Если она требует входа (Moodle, электронная библиотека), скопируйте её содержимое и вставьте в поле «Вставить со страницы».'));
    const type = resp.headers.get('content-type') || '';
    if (/pdf/i.test(type) || /\.pdf(\?|$)/i.test(url)) return Object.assign(await readPdf(await resp.arrayBuffer()), { kind: 'pdf' });
    return Object.assign(readHtml(await resp.text()), { kind: 'html' });
  }

  /* ---------- простой текст ---------- */
  function readText(t) { return { lines: String(t || '').replace(/\r\n?/g, '\n').split('\n').map(x => ({ text: x, page: 0 })) }; }

  /* ---------- файл любого поддерживаемого вида ---------- */
  async function readFile(f, opt) {
    const n = f.name || '';
    if (/\.pdf$/i.test(n) || f.type === 'application/pdf') return Object.assign(await readPdf(await f.arrayBuffer(), opt), { kind: 'pdf' });
    if (/\.docx$/i.test(n)) return Object.assign(await readDocx(await f.arrayBuffer()), { kind: 'docx' });
    if (/\.doc$/i.test(n)) throw new Error(_t('Формат .doc (Word 97-2003) не читается – откройте файл в Word и сохраните как .docx.'));
    if (/\.(html?|xhtml|mht)$/i.test(n) || /html/.test(f.type)) return Object.assign(readHtml(await f.text()), { kind: 'html' });
    if (/\.(txt|text|md)$/i.test(n) || /^text\//.test(f.type)) return Object.assign(readText(await f.text()), { kind: 'txt' });
    throw new Error(_t('Формат файла не поддерживается – нужен PDF, DOCX, HTML или TXT.'));
  }
  /* Сплошной текст из прочитанного источника (для режима «Тексты») – абзацы через пустую строку */
  function plain(src) { return blocks(src.lines).map(b => b.text).join('\n\n'); }
  /* Текст источника с пометками страниц – для языковой модели */
  function sourceText(src) {
    let p = -1; const out = [];
    blocks(src.lines).forEach(b => { if (b.page && b.page !== p) { p = b.page; out.push(_t('[стр. ') + p + ']'); } out.push(b.text); });
    return out.join('\n');
  }
  function chunks(text, max) {
    max = max || 7000; const ls = text.split('\n'), out = []; let cur = '';
    ls.forEach(l => { if (cur && cur.length + l.length + 1 > max) { out.push(cur); cur = ''; } cur += (cur ? '\n' : '') + l; });
    if (cur) out.push(cur);
    return out;
  }

  /* ---------- языковая модель ---------- */
  function llmPrompt(chunk, meta) {
    meta = meta || {};
    return _t('Ты помогаешь исследователю собрать корпус инструкций к упражнениям учебника английского языка') + (meta.book ? _t(' «') + meta.book + _t('»') : '') + (meta.level ? _t(', заявленный уровень ') + meta.level : '') + '.\n\n' +
      _t('Ниже текст страниц учебника, извлечённый из ') + (meta.kind === 'pdf' ? _t('PDF (порядок строк может нарушаться, колонтитулы и номера страниц – мусор)') : _t('документа')) + _t('. Найди все инструкции к упражнениям – формулировки задания, обращённые к учащемуся (обычно в повелительном наклонении – Read…, Listen and…, Work in pairs…, Complete…). Для каждой укажи урок (Unit, Lesson и т. п., если виден), номер упражнения и подпункт (1, 2a), саму инструкцию и начало материала упражнения.\n\n') +
      _t('Правила\n- Инструкцию переписывай дословно, как в источнике, ничего не исправляй, не сокращай и не переводи. Если инструкция состоит из нескольких предложений, бери их все.\n- Пункты упражнения, тексты для чтения, заголовки, примеры ответов в инструкцию не включай.\n- exercise_text – первые 300 символов материала упражнения дословно, пустая строка, если материала нет.\n- Если урок или номер не виден, оставь пустую строку.\n- Не придумывай инструкций, которых нет в тексте.\n\n') +
      _t('Ответ – только JSON-массив без пояснений и без разметки, по схеме\n[{"unit": "Unit 1", "ex": "2a", "instruction": "…", "exercise_text": "…"}]\n\n') +
      _t('Текст учебника\n') + chunk;
  }
  const norm = s => String(s || '').toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/[^a-z0-9'"-]+/g, ' ').trim();
  function parseLlm(answer, src) {
    let s = String(answer || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
    const a = s.indexOf('['), b = s.lastIndexOf(']');
    if (a < 0 || b < a) throw new Error(_t('В ответе модели нет JSON-массива'));
    let arr; try { arr = JSON.parse(s.slice(a, b + 1)); } catch (e) { throw new Error(_t('Ответ модели не разбирается как JSON – ') + e.message); }
    const hay = src ? ' ' + norm(src) + ' ' : null;
    return arr.filter(x => x && (x.instruction || x.text)).map(x => {
      const text = String(x.instruction || x.text).replace(/\s+/g, ' ').trim();
      const found = !hay || hay.includes(' ' + norm(text) + ' ') || hay.includes(norm(text));
      return { unit: String(x.unit || '').trim(), ex: String(x.ex || x.exercise || '').trim(), text, exercise_text: String(x.exercise_text || '').trim(), conf: found ? 'llm' : 'low', why: found ? _t('найдено моделью, текст сверен с источником') : _t('модель вернула текст, которого нет в источнике дословно – проверьте'), page: 0, on: found };
    });
  }

  g.IA_IMPORT = { VERSION, isInstr, firstVerb, cutInstr, blocks, extract, readFile, readPdf, readDocx, readHtml, readUrl, readText, plain, sourceText, chunks, llmPrompt, parseLlm, loadPdfJs };
})(typeof window !== 'undefined' ? window : globalThis);
