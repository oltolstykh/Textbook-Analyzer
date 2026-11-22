/* Переключение языка интерфейса (русский – исходный, английский – по словарю i18n-en.js). Версия i18n-0.1.
   _t(фраза) возвращает перевод для текущего языка; пробелы по краям фразы сохраняются.
   Язык хранится в браузере, смена языка перезагружает страницу – так переводятся и данные модулей, созданные при загрузке. */
(function (g) {
  const LS = 'textbook-analyzer-lang';
  let lang = 'ru';
  try {
    const s = g.localStorage && g.localStorage.getItem(LS);
    lang = s === 'en' || s === 'ru' ? s : (/^ru|^uk|^be|^kk/i.test((g.navigator && g.navigator.language) || 'ru') ? 'ru' : 'en');
  } catch (e) { lang = 'ru'; }
  const D = g.IA_I18N_EN || {};
  function _t(s) {
    if (lang !== 'en' || typeof s !== 'string') return s;
    if (Object.prototype.hasOwnProperty.call(D, s)) return D[s];
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return Object.prototype.hasOwnProperty.call(D, m[2]) ? m[1] + D[m[2]] + m[3] : s;
  }
  function setLang(l) { try { g.localStorage.setItem(LS, l); } catch (e) { /* нет хранилища */ } g.location.reload(); }
  /* Статический текст index.html – текстовые узлы и атрибуты */
  function translateDOM(root) {
    if (lang !== 'en' || !root) return;
    const w = g.document.createTreeWalker(root, 4);
    const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(t => { if (/[А-Яа-яЁё]/.test(t.nodeValue) && !t.parentElement.closest('script,style')) t.nodeValue = _t(t.nodeValue); });
    root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => { const v = el.getAttribute(a); if (v && /[А-Яа-яЁё]/.test(v)) el.setAttribute(a, _t(v)); }));
  }
  g._t = _t;
  g.IA_I18N = { VERSION: 'i18n-0.1', lang, setLang, translateDOM, locale: lang === 'en' ? 'en-GB' : 'ru-RU' };
  if (g.document && g.document.documentElement) g.document.documentElement.lang = lang;
  /* Переключатель RU / EN в шапке и перевод статического текста страницы */
  if (g.document && g.document.body) {
    translateDOM(g.document.body);
    const seg = g.document.getElementById('langSeg');
    if (seg) {
      seg.querySelectorAll('button[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang));
      seg.addEventListener('click', e => { const b = e.target.closest('button[data-lang]'); if (b && b.dataset.lang !== lang) setLang(b.dataset.lang); });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
