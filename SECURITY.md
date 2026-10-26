# Security policy

## Supported versions

Security fixes are made on the latest release on the default branch.

## Threat model in brief

Sheetfit runs entirely in the browser. It has no server, no accounts and no analytics. Uploaded images are decoded locally and stored only in the user's own browser (IndexedDB) when they save a project. The relevant risks are therefore:

- Malformed image files that could crash or hang the page. Files are validated by type and size (60 MB maximum) and decoded by the browser's own image decoder.
- Very large images or exports that exhaust memory. Canvas sizes are checked before allocation and a clear error is shown when a size is too large.
- Supply-chain issues in dependencies. Dependencies are pinned through `package-lock.json` and installed with `npm ci` in CI.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's **Report a vulnerability** form on the repository's Security tab (GitHub Security Advisories). Do not open a public issue for security problems.

Include:

- A description of the issue and its impact
- Steps or a file that reproduces it
- The browser and version you used

You can expect an acknowledgement within 7 days. Once a fix is available, the advisory will be published with credit to the reporter unless you prefer to remain anonymous.
