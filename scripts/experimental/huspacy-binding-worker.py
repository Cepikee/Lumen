#!/usr/bin/env python3
"""Bounded research worker. Candidate annotations only; no canonical persistence."""
import importlib.util, json, sys, time
from pathlib import Path

MAX_TEXT_CHARS=200_000
path=Path(__file__).with_name("huspacy-binding-research.py")
spec=importlib.util.spec_from_file_location("utom_huspacy_binding",path)
binding=importlib.util.module_from_spec(spec); spec.loader.exec_module(binding)
import hu_core_news_md
started=time.perf_counter(); nlp=hu_core_news_md.load(); load_ms=(time.perf_counter()-started)*1000
print(json.dumps({"type":"ready","candidateOnly":True,"config":"D","modelLoadMs":load_ms}),flush=True)
for line in sys.stdin:
    request_id=None
    try:
        request=json.loads(line); request_id=request.get("id") if isinstance(request,dict) else None
        text=request.get("text") if isinstance(request,dict) else None
        if not isinstance(text,str) or not text.strip(): raise ValueError("invalid_request")
        if len(text)>MAX_TEXT_CHARS: raise ValueError("request_too_large")
        annotation=binding.annotate(nlp,text,"D")
        response={"id":request_id,"ok":True,"candidateOnly":True,"canonicalWrites":0,"annotation":annotation}
    except Exception as error:
        response={"id":request_id,"ok":False,"error":type(error).__name__,"message":str(error)}
    print(json.dumps(response,ensure_ascii=False),flush=True)
