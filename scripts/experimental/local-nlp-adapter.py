#!/usr/bin/env python3
"""Isolated candidate-annotation adapter. It cannot emit canonical UTOM data."""

import argparse
import json
import os
import re
import resource
import sys
import time
from pathlib import Path


REPORTING = {"mond", "közöl", "ír", "jelent", "elismer", "tagad", "vitat", "állít"}
TYPE_MAP = {
    "PER": "person", "PERSON": "person", "PERS": "person",
    "ORG": "organization", "ORGANIZATION": "organization",
    "LOC": "location", "LOCATION": "location", "GPE": "location",
}


def norm(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def numeric_spans(text):
    pattern = r"\d+(?:[,.]\d+)?(?:\s+(?:ezer|millió|milliárd))?\s+(?:forint(?:ot)?|euró|beteget|másodpercet|fokot)"
    return [(m.start(), m.end(), m.group(0)) for m in re.finditer(pattern, text, re.I)]


def sentence_for(sentences, start):
    return next((s for s in sentences if s["start"] <= start < s["end"]), None)


def nearest_entity(entities, position, sentence):
    candidates = [e for e in entities if sentence["start"] <= e["start"] < sentence["end"] and e["end"] <= position]
    return max(candidates, key=lambda e: e["end"], default=None)


def build_candidates(text, sentences, tokens, entities):
    token_by_id = {t["id"]: t for t in tokens}
    children = {}
    for token in tokens:
        children.setdefault(token.get("head"), []).append(token)

    bindings = []
    for start, end, raw in numeric_spans(text):
        sentence = sentence_for(sentences, start)
        if not sentence:
            continue
        number_token = next((t for t in tokens if t["start"] <= start < t["end"] or start <= t["start"] < end), None)
        cursor = number_token
        seen = set()
        verb = None
        while cursor and cursor["id"] not in seen:
            seen.add(cursor["id"])
            if cursor.get("upos") in {"VERB", "AUX"}:
                verb = cursor
                break
            cursor = token_by_id.get(cursor.get("head"))
        subject = None
        if verb:
            subject_token = next((t for t in children.get(verb["id"], []) if str(t.get("deprel", "")).startswith(("nsubj", "csubj"))), None)
            if subject_token:
                containing = [e for e in entities if e["start"] <= subject_token["start"] < e["end"]]
                subject = containing[0] if containing else None
        subject = subject or nearest_entity(entities, start, sentence)
        bindings.append({"numberText": raw, "subjectText": subject["text"] if subject else None})

    dependencies = []
    for token in tokens:
        if not str(token.get("deprel", "")).startswith(("nsubj", "csubj")):
            continue
        head = token_by_id.get(token.get("head"))
        if not head:
            continue
        containing = [e for e in entities if e["start"] <= token["start"] < e["end"]]
        subject = containing[0]["text"] if containing else token["text"]
        dependencies.append({"subjectText": subject, "predicateLemma": norm(head.get("lemma"))})

    attributions = []
    for sentence in sentences:
        sentence_tokens = [t for t in tokens if sentence["start"] <= t["start"] < sentence["end"]]
        for index, token in enumerate(sentence_tokens):
            lemma = norm(token.get("lemma"))
            if lemma == "szerint":
                source = nearest_entity(entities, token["start"], sentence)
            elif lemma in REPORTING:
                source_token = next((t for t in children.get(token["id"], []) if str(t.get("deprel", "")).startswith(("nsubj", "csubj"))), None)
                matches = [e for e in entities if source_token and e["start"] <= source_token["start"] < e["end"]]
                source = matches[0] if matches else nearest_entity(entities, token["start"], sentence)
            else:
                continue
            attributions.append({"sourceText": source["text"] if source else None, "reportingLemma": lemma})

    conditional = any(norm(t.get("lemma")) == "ha" or "Mood=Cnd" in str(t.get("morph", "")) for t in tokens)
    negated = any(norm(t.get("lemma")) == "nem" or t.get("deprel") == "neg" or norm(t.get("lemma")) == "tagad" for t in tokens)
    return {
        "entities": entities,
        "numericBindings": bindings,
        "dependencies": dependencies,
        "attributions": attributions,
        "conditional": conditional,
        "negated": negated,
    }


def spacy_annotation(nlp, text):
    doc = nlp(text)
    sentences = [{"start": s.start_char, "end": s.end_char, "text": s.text} for s in doc.sents]
    tokens = [{
        "id": i + 1, "text": t.text, "start": t.idx, "end": t.idx + len(t.text),
        "lemma": t.lemma_, "upos": t.pos_, "xpos": t.tag_, "morph": str(t.morph),
        "head": t.head.i + 1 if t.head.i != t.i else 0, "deprel": t.dep_,
    } for i, t in enumerate(doc)]
    entities = [{
        "text": e.text, "start": e.start_char, "end": e.end_char,
        "rawType": e.label_, "type": TYPE_MAP.get(e.label_, "other"),
        "canonical": norm(" ".join(t.lemma_ for t in e)),
    } for e in doc.ents]
    return {"sentences": sentences, "tokens": tokens, **build_candidates(text, sentences, tokens, entities)}


def stanza_annotation(nlp, text):
    doc = nlp(text)
    sentences, tokens = [], []
    next_id = 1
    for sentence in doc.sentences:
        start = min(t.start_char for t in sentence.tokens)
        end = max(t.end_char for t in sentence.tokens)
        sentences.append({"start": start, "end": end, "text": text[start:end]})
        local_to_global = {}
        for word in sentence.words:
            local_to_global[word.id] = next_id
            next_id += 1
        token_by_word = {}
        for token in sentence.tokens:
            for word in token.words:
                token_by_word[word.id] = token
        for word in sentence.words:
            token = token_by_word[word.id]
            tokens.append({
                "id": local_to_global[word.id], "text": word.text,
                "start": token.start_char, "end": token.end_char, "lemma": word.lemma,
                "upos": word.upos, "xpos": word.xpos, "morph": word.feats or "",
                "head": local_to_global.get(word.head, 0), "deprel": word.deprel,
            })
    entities = [{
        "text": e.text, "start": e.start_char, "end": e.end_char,
        "rawType": e.type, "type": TYPE_MAP.get(e.type, "other"),
        "canonical": norm(e.text),
    } for e in doc.ents]
    return {"sentences": sentences, "tokens": tokens, **build_candidates(text, sentences, tokens, entities)}


def directory_size(paths):
    total = 0
    for root in paths:
        for base, _, files in os.walk(root):
            total += sum(os.path.getsize(os.path.join(base, name)) for name in files)
    return total


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=["huspacy", "stanza"], required=True)
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--stanza-model-dir", default="/tmp/utom-stanza-models")
    args = parser.parse_args()
    corpus = json.loads(Path(args.corpus).read_text(encoding="utf8"))
    load_start = time.perf_counter()
    rss_before = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
    if args.provider == "huspacy":
        import hu_core_news_md
        nlp = hu_core_news_md.load()
        annotate = lambda text: spacy_annotation(nlp, text)
        model_paths = [str(Path(hu_core_news_md.__file__).parent)]
        versions = {"hu_core_news_md": hu_core_news_md.__version__}
    else:
        import stanza
        nlp = stanza.Pipeline("hu", model_dir=args.stanza_model_dir, processors="tokenize,pos,lemma,depparse,ner", use_gpu=False, download_method=None, verbose=False)
        annotate = lambda text: stanza_annotation(nlp, text)
        model_paths = [args.stanza_model_dir]
        versions = {"stanza": stanza.__version__}
    load_ms = (time.perf_counter() - load_start) * 1000
    rss_after_load = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
    results = []
    # Untimed warm-up is kept separate from measured articles.
    annotate("Tesztmondat a modell bemelegítéséhez.")
    started = time.perf_counter()
    token_count = 0
    article_times = []
    for case in corpus["cases"]:
        item_start = time.perf_counter()
        annotation = annotate(case["text"])
        article_times.append((time.perf_counter() - item_start) * 1000)
        token_count += len(annotation["tokens"])
        results.append({"id": case["id"], "text": case["text"], "annotation": annotation})
    warm_seconds = time.perf_counter() - started
    payload = {
        "provider": args.provider,
        "candidateOnly": True,
        "canonicalProjectionAllowed": False,
        "versions": versions,
        "performance": {
            "modelLoadMs": load_ms,
            "warmTotalMs": warm_seconds * 1000,
            "meanMsPerArticle": sum(article_times) / len(article_times),
            "articleTimesMs": article_times,
            "tokens": token_count,
            "tokensPerSecond": token_count / warm_seconds,
            "peakRssBytes": max(rss_before, rss_after_load, resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024),
            "rssDeltaAfterLoadBytes": max(0, rss_after_load - rss_before),
            "modelDiskBytes": directory_size(model_paths),
        },
        "results": results,
    }
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
