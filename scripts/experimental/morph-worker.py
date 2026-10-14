"""Research-only linguistic service. No semantic frames or canonical writes."""
import json, sys, time, resource
import hu_core_news_md

started=time.perf_counter()
nlp=hu_core_news_md.load()
print(json.dumps({'type':'ready','model':'hu_core_news_md','version':hu_core_news_md.__version__,'loadMs':(time.perf_counter()-started)*1000}),flush=True)
LIMIT=200000
while True:
    line=sys.stdin.buffer.readline(LIMIT*12+1)
    if not line: break
    if len(line)>LIMIT*12:
        print(json.dumps({'type':'fatal','error':'oversized_line'}),flush=True); break
    ident=None
    try:
        req=json.loads(line); ident=req.get('id') if isinstance(req,dict) else None
        text=req.get('text') if isinstance(req,dict) else None
        if not isinstance(text,str) or not text.strip() or len(text)>LIMIT: raise ValueError('invalid_request')
        ts=time.perf_counter(); doc=nlp(text)
        # Node uses UTF-16 offsets, not Python Unicode code-point offsets.
        offsets=[0]
        for char in text: offsets.append(offsets[-1]+(2 if ord(char)>65535 else 1))
        span=lambda a,b:{'start':offsets[a],'end':offsets[b],'text':text[a:b]}
        tokens=[dict(span(t.idx,t.idx+len(t.text)),lemma=t.lemma_,pos=t.pos_,morph=t.morph.to_dict(),dep=t.dep_,headStart=offsets[t.head.idx]) for t in doc]
        sentences=[span(s.start_char,s.end_char) for s in doc.sents]
        entities=[dict(span(e.start_char,e.end_char),label=e.label_) for e in doc.ents]
        print(json.dumps({'id':ident,'ok':True,'annotation':{'tokens':tokens,'sentences':sentences,'entities':entities},'elapsedMs':(time.perf_counter()-ts)*1000,'peakRssBytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024},ensure_ascii=False),flush=True)
    except Exception as error:
        print(json.dumps({'id':ident,'ok':False,'error':type(error).__name__}),flush=True)
