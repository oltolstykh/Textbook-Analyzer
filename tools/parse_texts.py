#!/usr/bin/env python3
"""Синтаксический разбор текстов для анализатора инструкций и текстов (формат CoNLL-U).

Анализатор работает в браузере и не разбирает текст сам. Скрипт готовит разбор заранее
с помощью spaCy или Stanza, а анализатор загружает результат во вкладке «Данные».

Порядок работы
  1. В анализаторе – «Данные» – «Синтаксический разбор» – «Скачать тексты для разбора» (файл .jsonl).
  2. python3 parse_texts.py texts-for-parsing.jsonl -o parsed.conllu
  3. В анализаторе – «Загрузить разбор» – parsed.conllu.

Установка (один раз)
  spaCy  – python3 -m pip install spacy && python3 -m spacy download en_core_web_sm
  Stanza – python3 -m pip install stanza  (модель en скачается при первом запуске)

Параметры
  --engine spacy|stanza   анализатор (по умолчанию spacy)
  --model NAME            модель spaCy (en_core_web_sm, en_core_web_trf …) или язык Stanza (en)
Вход – .jsonl из анализатора (поля id и text) или обычный .txt (весь файл – один текст).
В заголовке каждого документа записываются анализатор и версии, чтобы их можно было указать в методике.
"""
import argparse
import json
import sys


def utf16_len(s):
    return len(s.encode('utf-16-le')) // 2


def read_input(path):
    if path.lower().endswith('.jsonl'):
        docs = []
        with open(path, encoding='utf-8-sig') as f:
            for n, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                obj = json.loads(line)
                docs.append((str(obj.get('id') or 'doc%d' % n), str(obj.get('text') or '')))
        return docs
    with open(path, encoding='utf-8-sig') as f:
        return [('doc1', f.read())]


def write_doc(out, doc_id, text, parser, sentences):
    """sentences – список предложений, предложение – список слов (dict):
    form, lemma, upos, xpos, feats, head (номер в предложении, 0 – корень), deprel, start, end (смещения в тексте)."""
    out.write('# newdoc id = %s\n' % doc_id)
    out.write('# doc_text = %s\n' % json.dumps(text, ensure_ascii=False))
    out.write('# parser = %s\n' % parser)
    for k, words in enumerate(sentences, 1):
        if not words:
            continue
        s0, s1 = words[0]['start'], words[-1]['end']
        out.write('# sent_id = %s-%d\n' % (doc_id, k))
        out.write('# text = %s\n' % ' '.join(text[s0:s1].split()))
        for i, w in enumerate(words, 1):
            # смещения в единицах UTF-16 – так считает браузер
            a, b = utf16_len(text[:w['start']]), utf16_len(text[:w['end']])
            misc = 'TokenRange=%d:%d' % (a, b)
            cols = [str(i), w['form'], w['lemma'] or '_', w['upos'] or '_', w['xpos'] or '_', w['feats'] or '_',
                    str(w['head']), w['deprel'] or '_', '_', misc]
            out.write('\t'.join(c.replace('\t', ' ').replace('\n', ' ') or '_' for c in cols) + '\n')
        out.write('\n')


def run_spacy(docs, model):
    import spacy
    nlp = spacy.load(model)
    meta = nlp.meta
    parser = 'spaCy %s, %s %s' % (spacy.__version__, meta.get('lang', 'en') + '_' + meta.get('name', model), meta.get('version', ''))
    texts = [t for _, t in docs]
    for (doc_id, text), doc in zip(docs, nlp.pipe(texts)):
        sentences = []
        for sent in doc.sents:
            toks = [t for t in sent if not t.is_space]
            num = {t.i: n for n, t in enumerate(toks, 1)}
            words = []
            for t in toks:
                h = t.head
                while h.is_space and h.head.i != h.i:
                    h = h.head
                head = 0 if (h.i == t.i or h.i not in num) else num[h.i]
                words.append(dict(form=t.text, lemma=t.lemma_, upos=t.pos_, xpos=t.tag_, feats=str(t.morph) or '_',
                                  head=head, deprel='root' if t.dep_ == 'ROOT' else t.dep_,
                                  start=t.idx, end=t.idx + len(t.text)))
            sentences.append(words)
        yield doc_id, text, parser, sentences


def run_stanza(docs, lang):
    import stanza
    nlp = stanza.Pipeline(lang, processors='tokenize,mwt,pos,lemma,depparse', verbose=False)
    parser = 'Stanza %s, %s' % (stanza.__version__, lang)
    for doc_id, text in docs:
        doc = nlp(text)
        sentences = []
        for sent in doc.sentences:
            words = []
            for w in sent.words:
                tok = w.parent
                words.append(dict(form=w.text, lemma=w.lemma, upos=w.upos, xpos=w.xpos, feats=w.feats or '_',
                                  head=w.head, deprel=w.deprel, start=tok.start_char, end=tok.end_char))
            sentences.append(words)
        yield doc_id, text, parser, sentences


def main():
    ap = argparse.ArgumentParser(description='Синтаксический разбор для анализатора инструкций и текстов (CoNLL-U)')
    ap.add_argument('input', help='.jsonl из анализатора или .txt')
    ap.add_argument('-o', '--output', default='parsed.conllu', help='файл результата (по умолчанию parsed.conllu)')
    ap.add_argument('--engine', choices=['spacy', 'stanza'], default='spacy')
    ap.add_argument('--model', default=None, help='модель spaCy или язык Stanza')
    a = ap.parse_args()
    docs = [d for d in read_input(a.input) if d[1].strip()]
    if not docs:
        sys.exit('Во входном файле нет текстов')
    try:
        gen = run_spacy(docs, a.model or 'en_core_web_sm') if a.engine == 'spacy' else run_stanza(docs, a.model or 'en')
        n = 0
        with open(a.output, 'w', encoding='utf-8') as out:
            for doc_id, text, parser, sentences in gen:
                write_doc(out, doc_id, text, parser, sentences)
                n += 1
                if n == 1:
                    print('Анализатор –', parser, file=sys.stderr)
    except ImportError as e:
        sys.exit('Не установлен %s. См. раздел «Установка» в начале скрипта.\n%s' % (a.engine, e))
    except OSError as e:
        sys.exit('Не найдена модель. Для spaCy – python3 -m spacy download en_core_web_sm\n%s' % e)
    print('Готово – %d текстов, файл %s' % (n, a.output), file=sys.stderr)


if __name__ == '__main__':
    main()
