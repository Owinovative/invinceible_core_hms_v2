# Third-party license review

This record documents manual reviews for dependency licenses that automated
scanners could not classify. It supplements the package lock files; generated
lock-file license metadata must not be edited by hand.

## CSSTools MIT-0 packages

Reviewed: 2026-07-16

| Package | Version | Dependency path | Published license |
| --- | --- | --- | --- |
| `@csstools/color-helpers` | 6.1.0 | `jsdom` → `@asamuzakjp/css-color` → `@csstools/css-color-parser` | MIT-0 |
| `@csstools/css-syntax-patches-for-csstree` | 1.1.6 | `jsdom` | MIT-0 |

### Evidence

- Each package declares the SPDX identifier `MIT-0` in its published
  `package.json`.
- Each published package contains `LICENSE.md` headed
  `MIT No Attribution (MIT-0)` and identifies the copyright holder as
  `CSSTools Contributors`.
- The package metadata points to the CSSTools `postcss-plugins` repository:
  <https://github.com/csstools/postcss-plugins>.
- `MIT-0` is an SPDX-listed permissive license:
  <https://spdx.org/licenses/MIT-0.html>.

### Disposition

These packages are approved for this project. MIT-0 permits use, copying,
modification, distribution, sublicensing, and sale without an attribution
condition and includes the standard warranty and liability disclaimer.

Both packages are transitive dependencies of `jsdom`, which is a frontend
development dependency used by the Vitest browser-like test environment. They
are not direct application dependencies and are not required by a production
dependency-only installation.

The Trivy findings stating that the license could not be identified are treated
as license-classification findings, not security vulnerabilities. Re-review is
required if either package changes its declared license or is replaced with a
different package or version under another license.
