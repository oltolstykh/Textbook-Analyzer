/* Чтение .docx и .txt в браузере без библиотек.
   .docx – это zip-архив; текст лежит в word/document.xml. Архив распаковывается
   встроенным DecompressionStream('deflate-raw') (Chrome, Edge, Safari 16.4+, Firefox 113+). */
(function (g) {
  const _t = g._t || (s => s);
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

  function entries(buf) {
    const b = new Uint8Array(buf);
    let e = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error(_t('Файл не похож на .docx (нет оглавления архива)'));
    const n = u16(b, e + 10); let p = u32(b, e + 16);
    const out = [];
    for (let k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) break;
      const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), off = u32(b, p + 42);
      const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nlen));
      out.push({ name, method, csize, off });
      p += 46 + nlen + xlen + clen;
    }
    return { b, out };
  }
  async function inflate(data) {
    if (typeof DecompressionStream === 'undefined') throw new Error(_t('Браузер не умеет распаковывать .docx – обновите его или сохраните файл как .txt'));
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([data]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function readEntry(z, name) {
    const en = z.out.find(x => x.name === name); if (!en) return null;
    const b = z.b, p = en.off;
    if (u32(b, p) !== 0x04034b50) throw new Error(_t('Повреждённый архив'));
    const start = p + 30 + u16(b, p + 26) + u16(b, p + 28);
    const raw = b.subarray(start, start + en.csize);
    const data = en.method === 0 ? raw : en.method === 8 ? await inflate(raw) : null;
    if (!data) throw new Error(_t('Неизвестный способ сжатия в архиве'));
    return new TextDecoder('utf-8').decode(data);
  }
  const ent = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, '&');
  /* Абзацы документа – <w:p>; внутри текст <w:t>, табуляция и перенос строки */
  function paragraphsFromXML(xml) {
    const body = xml.replace(/<w:(?:del|instrText|delText)\b[\s\S]*?<\/w:(?:del|instrText|delText)>/g, '');
    const paras = [];
    const rp = /<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g; let m;
    while ((m = rp.exec(body))) {
      let t = '';
      const rt = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g; let x;
      while ((x = rt.exec(m[0]))) t += x[1] != null ? ent(x[1]) : x[0] === '<w:tab/>' ? '\t' : '\n';
      paras.push(t.replace(/ /g, ' ').replace(/[ \t]+$/g, ''));
    }
    return paras;
  }
  async function readDocx(buf) {
    const z = entries(buf);
    const xml = await readEntry(z, 'word/document.xml');
    if (xml == null) throw new Error(_t('В архиве нет word/document.xml – это не документ Word'));
    const paras = paragraphsFromXML(xml).filter(p => p.trim());
    return { paragraphs: paras, text: paras.join('\n\n') };
  }
  /* Подробное чтение для импорта инструкций – у абзаца есть признак жирного начертания,
     уровень заголовка и номер автонумерации Word (сам номер в тексте документа не хранится). */
  const attr = (s, name) => { const m = s.match(new RegExp('w:' + name + '="([^"]*)"')); return m ? m[1] : null; };
  const isOn = tag => { const v = attr(tag, 'val'); return v == null || !/^(0|false|none)$/i.test(v); };
  function stylesFromXML(xml) {
    const out = {};
    (xml || '').replace(/<w:style\b[\s\S]*?<\/w:style>/g, s => {
      const id = attr(s.match(/<w:style\b[^>]*>/)[0], 'styleId'); if (!id) return s;
      const nm = (s.match(/<w:name w:val="([^"]*)"/) || [])[1] || id;
      const rpr = (s.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
      const b = rpr.match(/<w:b(?:\s[^>]*)?\/>/);
      const hd = nm.match(/^(?:heading|заголовок)\s*(\d)/i) || (/^title$/i.test(nm) ? [0, '1'] : null);
      const np = (s.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0].match(/<w:numPr>[\s\S]*?<\/w:numPr>/);
      out[id] = { name: nm, bold: !!(b && isOn(b[0])), head: hd ? +hd[1] : 0, numPr: np ? np[0] : null };
      return s;
    });
    return out;
  }
  function numberingFromXML(xml) {
    const abs = {}, nums = {};
    (xml || '').replace(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g, a => {
      const id = attr(a.match(/<w:abstractNum\b[^>]*>/)[0], 'abstractNumId'); const lv = {};
      a.replace(/<w:lvl\b[\s\S]*?<\/w:lvl>/g, l => { const il = attr(l.match(/<w:lvl\b[^>]*>/)[0], 'ilvl'); lv[il] = { fmt: (l.match(/<w:numFmt w:val="([^"]*)"/) || [])[1] || 'decimal', start: +((l.match(/<w:start w:val="(\d+)"/) || [])[1] || 1), text: (l.match(/<w:lvlText w:val="([^"]*)"/) || [])[1] || '%1.' }; return l; });
      abs[id] = lv; return a;
    });
    (xml || '').replace(/<w:num\b[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId w:val="(\d+)"\/>[\s\S]*?<\/w:num>/g, (m, n, a) => { nums[n] = abs[a] || {}; return m; });
    return nums;
  }
  const roman = n => { let s = ''; [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']].forEach(([v, r]) => { while (n >= v) { s += r; n -= v; } }); return s; };
  function fmtNum(fmt, n) {
    if (/letter/i.test(fmt)) { const c = String.fromCharCode(96 + ((n - 1) % 26) + 1); return /upper/i.test(fmt) ? c.toUpperCase() : c; }
    if (/roman/i.test(fmt)) { const r = roman(n); return /upper/i.test(fmt) ? r.toUpperCase() : r; }
    if (/bullet|none/i.test(fmt)) return '';
    return String(n);
  }
  async function readDocxRich(buf) {
    const z = entries(buf);
    const xml = await readEntry(z, 'word/document.xml');
    if (xml == null) throw new Error(_t('В архиве нет word/document.xml – это не документ Word'));
    const styles = stylesFromXML(await readEntry(z, 'word/styles.xml'));
    const numbering = numberingFromXML(await readEntry(z, 'word/numbering.xml'));
    const body = xml.replace(/<w:(?:del|instrText|delText)\b[\s\S]*?<\/w:(?:del|instrText|delText)>/g, '');
    const counters = {}, out = [];
    const rp = /<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g; let m;
    while ((m = rp.exec(body))) {
      const p = m[0];
      const ppr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
      const st = styles[(ppr.match(/<w:pStyle w:val="([^"]*)"/) || [])[1]] || { bold: false, head: 0, name: '' };
      let text = '', all = 0, boldN = 0;
      const rr = /<w:r[ >][\s\S]*?<\/w:r>/g; let r;
      while ((r = rr.exec(p))) {
        const rpr = (r[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
        const b = rpr.match(/<w:b(?:\s[^>]*)?\/>/);
        const bold = b ? isOn(b[0]) : st.bold;
        let t = '';
        const rt = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g; let x;
        while ((x = rt.exec(r[0]))) t += x[1] != null ? ent(x[1]) : x[0] === '<w:tab/>' ? '\t' : '\n';
        text += t; const n = t.replace(/\s/g, '').length; all += n; if (bold) boldN += n;
      }
      text = text.replace(/ /g, ' ').replace(/[ \t]+$/g, '');
      if (!text.trim()) continue;
      let list = null;
      const np = ppr.match(/<w:numPr>[\s\S]*?<\/w:numPr>/) || (st.numPr ? [st.numPr] : null);
      if (np) {
        const nid = attr((np[0].match(/<w:numId [^>]*\/>/) || [''])[0], 'val'), il = attr((np[0].match(/<w:ilvl [^>]*\/>/) || [''])[0], 'val') || '0';
        const def = (numbering[nid] || {})[il] || { fmt: +il ? 'lowerLetter' : 'decimal', start: 1 };
        const c = counters[nid] = counters[nid] || {};
        c[il] = c[il] == null ? def.start : c[il] + 1;
        Object.keys(c).forEach(k => { if (+k > +il) delete c[k]; });
        const lab = fmtNum(def.fmt, c[il]);
        if (nid !== '0' && lab) list = { n: lab, lvl: +il, fmt: def.fmt };
      }
      out.push({ text, bold: all > 0 && boldN / all >= 0.6, head: st.head, style: st.name, list });
    }
    return out;
  }
  /* Заголовок – первая строка, если она короткая (до 12 слов), без точки в конце и за ней есть ещё текст */
  function splitTitle(text) {
    const t = String(text || '').replace(/\r\n?/g, '\n').replace(/^\s+/, '');
    const m = t.match(/^([^\n]+)\n+([\s\S]+)$/);
    if (m && m[1].trim().split(/\s+/).length <= 12 && !/[.!?:;]\s*$/.test(m[1]) && !/^\s*[A-Z][A-Za-z .'-]{0,24}:/.test(m[1])) return { title: m[1].trim(), text: m[2].trim() };
    return { title: '', text: t.trim() };
  }
  g.IA_DOCX = { readDocx, readDocxRich, paragraphsFromXML, splitTitle };
})(typeof window !== 'undefined' ? window : globalThis);
