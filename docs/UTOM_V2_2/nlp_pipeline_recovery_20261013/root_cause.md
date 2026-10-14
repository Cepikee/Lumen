# Root cause established before transport repair

The previous Wsl/Service/RPC_S_CALL_FAILED is not reproduced now. Its underlying
host-service cause cannot be reconstructed from the old discarded stderr.
No claim is made that a package/path correction fixes Windows RPC itself.

Current minimal request using the configured research invocation succeeds with
exit 0 and empty stderr (reproduction.txt). Same input using WorkerClient defaults
fails exit 1, ModuleNotFoundError: hu_core_news_md (default_reproduction.json).

Concrete repository defect: WorkerClient still defaults to
PYTHONPATH=/tmp/utom-morph-research, which no longer exists. Active collectors
explicitly use /home/mark/.local/share/utom-morph-research. The installed persistent
environment loads successfully. Align the default with that existing environment;
do not install/upgrade packages or alter semantics.

Secondary observability defect: client ignores stderr and exit code, collapsing
model-import errors and transport failures to worker_exit. Preserve bounded
diagnostic details without changing callers' existing error message contract.
Protocol safety gap: empty token/sentence arrays pass validAnnotation. Require
actual ordered spans and valid sentence-local dependency heads, not empty success.

Environment: Ubuntu-24.04 WSL2, /usr/bin/python3 3.12.3, spaCy 3.8.16,
HuSpaCy 0.12.1, hu_core_news_md 3.8.0; UTF-8. Golden/model comparison follows.
