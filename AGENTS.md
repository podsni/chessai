# AGENTS.md

## Quality Gates

- Quick check while coding: `bun run check:fast`
- Full check before push/PR: `bun run check`
- Auto-fix lint + format: `bun run fix`

## Agent Rules

- If lint errors exist, fix them first before continuing.
- Do not leave warnings/errors unresolved for changed code.
- Do not commit if `bun run fmt:check` fails.
- CI is the final gate; treat failing CI as failed work.
