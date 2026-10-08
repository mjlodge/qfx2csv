# AGENTS.md

## Rules

- Keep the production dependency tree advisory-clean on its own: every runtime package must be clean without `overrides` patches (currently `write-excel-file` for XLSX export, chosen because it pulls in only `fflate`). Do not add npm `overrides` that force newer versions of transitive packages — forcing the pattern-matching library this way breaks ESLint at runtime and leaves npm reporting an invalid tree. Why: the dependency scanner reads the lockfile, and patching transitives caused a broken code checker instead of a real fix.
