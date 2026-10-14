#!/usr/bin/env python3
"""Candidate-only HuSpaCy binding research. Never emits canonical UTOM writes."""
import argparse, json, os, re, resource, time
from pathlib import Path

TYPE_MAP={"PER":"person","ORG":"organization","LOC":"location","GPE":"location"}
REPORT={"mond","közöl","ír","jelent","elismer","tagad","állít","ígér"}
UNITS={"százalék","forint","gól","fok","megawatt","beteg","szerződés","irat","üzem","járat","pótlóbusz"}
COND={"ha","amennyiben"}

def norm(v): return re.sub(r"\s+"," ",str(v or "").strip().lower())
def ent_rows(doc, config):
    rows=[]
    for e in doc.ents:
        typ=TYPE_MAP.get(e.label_)
        if not typ or "\n" in e.text: continue
        canonical=norm(e.text)
        if config in {"C","D"}:
            canonical=norm(" ".join(t.lemma_ for t in e))
            canonical=re.sub(r"(?:é|nak|nek)$","",canonical).strip()
        rows.append({"text":e.text,"start":e.start_char,"end":e.end_char,"type":typ,"canonical":canonical,"rawType":e.label_})
    return rows

def baseline_entities(text):
    rows=[]
    for m in re.finditer(r"\b(?:[A-ZÁÉÍÓÖŐÚÜŰ][\wÁÉÍÓÖŐÚÜŰáéíóöőúüű.-]+(?:\s+|$)){1,3}",text):
        value=m.group(0).strip()
        if len(value)<3: continue
        rows.append({"text":value,"start":m.start(),"end":m.start()+len(value),"type":"other","canonical":norm(value)})
    return rows

def containing_entity(entities, token):
    return next((e for e in entities if e["start"]<=token.idx<e["end"]),None)

def sentence_entities(entities,sent): return [e for e in entities if sent.start_char<=e["start"]<sent.end_char]

def number_mentions(doc):
    out=[]
    for t in doc:
        if t.pos_!="NUM" or not re.search(r"\d",t.text): continue
        unit=t.head if norm(t.head.lemma_) in UNITS else (doc[t.i+1] if t.i+1<len(doc) and norm(doc[t.i+1].lemma_) in UNITS else None)
        if unit is None: continue
        start=min(t.idx,unit.idx); end=max(t.idx+len(t.text),unit.idx+len(unit.text))
        out.append({"numberText":doc.text[start:end],"start":start,"end":end,"unit":norm(unit.lemma_),"token":t,"unitToken":unit})
    return out

def governing_verb(token):
    seen=set(); cur=token
    while cur.i not in seen:
        seen.add(cur.i)
        if cur.pos_ in {"VERB","AUX"}: return cur
        if cur.head.i==cur.i: break
        cur=cur.head
    cop=next((c for c in token.children if c.dep_=="cop"),None)
    return cop

def local_segment(text,start,sent):
    left=max(text.rfind(",",sent.start_char,start),text.rfind(";",sent.start_char,start))
    right_candidates=[p for p in (text.find(",",start,sent.end_char),text.find(";",start,sent.end_char)) if p>=0]
    return (left+1 if left>=0 else sent.start_char,min(right_candidates) if right_candidates else sent.end_char)

def select_subject(doc, mention, entities, config):
    sent=mention["token"].sent; verb=governing_verb(mention["unitToken"])
    if config!="D":
        candidates=[e for e in sentence_entities(entities,sent) if e["end"]<=mention["start"]]
        return (max(candidates,key=lambda e:e["end"],default=None),verb,"nearest")
    lo,hi=local_segment(doc.text,mention["start"],sent)
    local=[e for e in entities if lo<=e["start"]<hi and e["end"]<=mention["start"]]
    if local:
        candidate=max(local,key=lambda e:e["end"])
        etok=next((t for t in sent if candidate["start"]<=t.idx<candidate["end"]),None)
        if etok and (etok.dep_.startswith(("nsubj","obl","nmod")) or governing_verb(etok)==verb):
            return candidate,verb,"dependency-coordination"
    if verb:
        subj=next((t for t in verb.children if t.dep_.startswith(("nsubj","csubj"))),None)
        ent=containing_entity(entities,subj) if subj else None
        if ent:return ent,verb,"dependency"
    return None,verb,"abstain"

def attribution(doc,entities,config):
    rows=[]
    for t in doc:
        lemma=norm(t.lemma_)
        if lemma!="szerint" and lemma not in REPORT: continue
        sent=t.sent; source=None
        if config=="D" and lemma in REPORT:
            st=next((c for c in t.children if c.dep_.startswith(("nsubj","csubj"))),None)
            source=containing_entity(entities,st) if st else None
        prior=[e for e in sentence_entities(entities,sent) if e["end"]<=t.idx+len(t.text)]
        source=source or max(prior,key=lambda e:e["end"],default=None)
        rows.append({"sourceText":source["text"] if source else None,"reportingLemma":lemma,"start":t.idx,"end":t.idx+len(t.text)})
    return rows

def annotate(nlp,text,config):
    doc=nlp(text); entities=baseline_entities(text) if config=="A" else ent_rows(doc,config)
    frames=[]
    for m in number_mentions(doc):
        subject,verb,method=select_subject(doc,m,entities,config)
        predicate=norm(verb.lemma_) if verb else None
        obj=m["unit"]
        conditional=False
        if verb:
            conditional=any(norm(x.lemma_) in COND for x in verb.sent if x.i<=verb.i) or "Mood=Cnd" in str(verb.morph)
        negated=bool(verb and any(norm(x.lemma_)=="nem" or x.dep_=="neg" for x in verb.subtree))
        frames.append({"subjectText":subject["text"] if subject else None,"predicateLemma":predicate,"objectLemma":obj,"numberText":m["numberText"],"start":m["start"],"end":m["end"],"method":method,"conditional":conditional,"negated":negated,"canonical":False})
    return {"entities":entities,"frames":frames,"attributions":attribution(doc,entities,config),"tokens":[{"text":t.text,"start":t.idx,"end":t.idx+len(t.text),"lemma":t.lemma_,"pos":t.pos_,"morph":str(t.morph),"head":t.head.i,"dep":t.dep_} for t in doc]}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--corpus",required=True); ap.add_argument("--output",required=True); ap.add_argument("--repeat",type=int,default=1); a=ap.parse_args()
    import hu_core_news_md
    corpus=json.loads(Path(a.corpus).read_text(encoding="utf8")); before=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024
    started=time.perf_counter(); nlp=hu_core_news_md.load(); load_ms=(time.perf_counter()-started)*1000
    nlp("Bemelegítő mondat.")
    outputs={}; perf={}
    for config in ["A","B","C","D"]:
        rows=[]; begin=time.perf_counter(); tokens=0
        for _ in range(a.repeat):
            for case in corpus["cases"]:
                ann=annotate(nlp,case["text"],config); tokens+=len(ann["tokens"])
                if len(rows)<len(corpus["cases"]): rows.append({"id":case["id"],"text":case["text"],"annotation":ann})
        elapsed=time.perf_counter()-begin
        outputs[config]=rows; perf[config]={"articles":len(corpus["cases"])*a.repeat,"totalMs":elapsed*1000,"meanMsPerArticle":elapsed*1000/(len(corpus["cases"])*a.repeat),"tokensPerSecond":tokens/elapsed}
    payload={"candidateOnly":True,"canonicalWrites":0,"modelLoadMs":load_ms,"peakRssBytes":resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024,"rssDeltaBytes":max(0,resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024-before),"performance":perf,"configurations":outputs}
    Path(a.output).write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
if __name__=="__main__":main()
