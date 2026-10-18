# Archived GitHub workflows

Files in this directory are historical evidence and are not loaded by GitHub Actions.

- `fetch-444.yml.disabled`: obsolete duplicate ingestion path. The canonical pipeline fetches all enabled sources, including 444.hu.
- `lint.yml.disabled`: duplicated the lint step already enforced by `ci.yml`.
- `depcheck.yml.disabled`: called `npx --no-install depcheck` although `depcheck` is not a repository dependency; it was not a reliable gate.
