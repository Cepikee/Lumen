import sys, os, locale, json, importlib.metadata as md, hashlib, pathlib
import spacy, hu_core_news_md
root=pathlib.Path(hu_core_news_md.__file__).parent
print(json.dumps(dict(pythonExecutable=sys.executable,pythonVersion=sys.version,
    prefix=sys.prefix,pythonPath=os.environ.get('PYTHONPATH'),cwd=os.getcwd(),
    packages={p:md.version(p) for p in ['pip','spacy','huspacy','hu-core-news-md']},
    modelRoot=str(root),stdinEncoding=sys.stdin.encoding,stdoutEncoding=sys.stdout.encoding,
    locale=locale.setlocale(locale.LC_ALL,None),preferredEncoding=locale.getpreferredencoding(),
    modelHashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and '__pycache__' not in str(p)},
    temporaryEnvironmentExists=pathlib.Path('/tmp/utom-morph-research').exists()),ensure_ascii=False))
