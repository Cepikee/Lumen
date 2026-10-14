#!/usr/bin/env python3
"""Persistent JSONL worker for local bake-off only; never emits canonical data."""

import argparse
import importlib.util
import json
import sys
from pathlib import Path


def load_adapter():
    path = Path(__file__).with_name("local-nlp-adapter.py")
    spec = importlib.util.spec_from_file_location("utom_local_nlp_adapter", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=["huspacy", "stanza"], required=True)
    parser.add_argument("--stanza-model-dir", default="/tmp/utom-stanza-models")
    args = parser.parse_args()
    adapter = load_adapter()
    if args.provider == "huspacy":
        import hu_core_news_md
        nlp = hu_core_news_md.load()
        annotate = lambda text: adapter.spacy_annotation(nlp, text)
    else:
        import stanza
        nlp = stanza.Pipeline("hu", model_dir=args.stanza_model_dir, processors="tokenize,pos,lemma,depparse,ner", use_gpu=False, download_method=None, verbose=False)
        annotate = lambda text: adapter.stanza_annotation(nlp, text)
    print(json.dumps({"type": "ready", "provider": args.provider, "candidateOnly": True}), flush=True)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            if not isinstance(request, dict) or not isinstance(request.get("text"), str) or not request["text"].strip():
                raise ValueError("invalid_request")
            response = {"id": request.get("id"), "ok": True, "candidateOnly": True, "annotation": annotate(request["text"])}
        except Exception as error:
            response = {"id": None, "ok": False, "error": type(error).__name__, "message": str(error)}
        print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
