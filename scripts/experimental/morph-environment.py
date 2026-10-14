"""Read-only installed environment/model provenance, no NLP inference."""
import hashlib, importlib.metadata, json, pathlib, platform
import hu_core_news_md
root=pathlib.Path(hu_core_news_md.__file__).parent
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file() and '__pycache__' not in str(p)}
print(json.dumps({'python':platform.python_version(),'modelRoot':str(root),'packages':{name:importlib.metadata.version(name) for name in ['huspacy','hu-core-news-md','spacy','numpy','psutil']},'modelFiles':files},indent=2))
