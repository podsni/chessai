# skill.md — Implementasi “Fastest Frontend Tooling” pakai Bun + tsgo + Oxlint + Oxfmt

> Tujuan: bikin **feedback loop super cepat** (typecheck/lint/format kilat) + **guardrails ketat** (kode konsisten, bug ketahan) sehingga **manusia & AI/LLM** sama-sama kerja lebih rapi dan cepat.

---

## 🎯 Hasil yang kamu dapat

- ✅ Type-check ~lebih cepat dengan **tsgo** (TypeScript native preview)
- ✅ Linting super cepat dengan **Oxlint**
- ✅ Formatting cepat + “batteries included” dengan **Oxfmt** (import sort, Tailwind class sort, dsb)
- ✅ Workflow Bun: `bun add`, `bun run`, `bunx` untuk eksekusi tool sekali jalan

---

## 🧩 Komponen Stack

| Komponen                                | Peran                                                | Output                |
| --------------------------------------- | ---------------------------------------------------- | --------------------- |
| **Bun**                                 | package manager + script runner                      | install & run cepat   |
| **tsgo** (`@typescript/native-preview`) | typecheck (pengganti `tsc`)                          | error tipe cepat      |
| **Oxlint**                              | linter (pengganti ESLint untuk sebagian besar kasus) | error lint + autofix  |
| **Oxfmt**                               | formatter (pengganti Prettier untuk banyak setup)    | format rapi konsisten |
| _(opsional)_ `@oxlint/migrate`          | migrasi dari ESLint flat config                      | `.oxlintrc.json`      |
| _(opsional)_ `@nkzw/oxlint-config`      | preset guardrail ketat                               | config siap pakai     |

Catatan:

- `bunx` adalah ekuivalen `npx` dan alias dari `bun x`. (lihat docs Bun)
- Oxfmt saat ini **alpha**: cocok untuk banyak proyek, tapi setup kompleks/monorepo tertentu bisa perlu penyesuaian. (lihat docs Oxc)

---

## ✅ Prasyarat

- Bun terpasang dan bisa dipanggil dari terminal: `bun --version`
- Git (buat hooks/CI)
- VS Code (opsional, tapi recommended untuk integrasi tsgo)

---

## 1) Install dependency (Bun-first)

Jalankan di root project:

```bash
bun add -D @typescript/native-preview oxlint oxfmt
```

Opsional (kalau kamu mau migrasi config ESLint dan/atau guardrail preset):

```bash
bun add -D @oxlint/migrate @nkzw/oxlint-config
```

> Tip Windows: kalau `bunx` bermasalah, coba pakai `bun x` (karena `bunx` = alias `bun x`).

---

## 2) Aktifkan tsgo di VS Code

Ada 2 cara yang paling aman:

### Opsi A — Setting langsung

Tambahkan ke VS Code settings (JSON):

```jsonc
{
  "typescript.experimental.useTsgo": true,
}
```

### Opsi B — Pakai extension “TypeScript (Native Preview)”

1. Install extension “TypeScript (Native Preview)”
2. Buka Command Palette → jalankan:
   - `TypeScript Native Preview: Enable (Experimental)`

> Ini ngaktifin language service native preview sehingga editor (diagnostics, hover, go-to-def) ikut lebih kencang.

---

## 3) Tambah scripts standar di `package.json`

Targetnya: _1 command buat “cek semua”_ dan _1 command buat “cek cepat”_.

```jsonc
{
  "scripts": {
    "//": "=== Quality Gates ===",
    "typecheck": "tsgo -p tsconfig.json",
    "lint": "oxlint .",
    "lint:fix": "oxlint . --fix",
    "fmt": "oxfmt .",
    "fmt:check": "oxfmt --check .",

    "//2": "=== Bundled Checks ===",
    "check:fast": "bun run lint && bun run fmt:check",
    "check": "bun run typecheck && bun run lint && bun run fmt:check",

    "//3": "=== Convenience ===",
    "fix": "bun run lint:fix && bun run fmt",
  },
}
```

Rekomendasi pemakaian:

- Saat ngoding cepat: `bun run check:fast`
- Sebelum push/PR: `bun run check`
- Kalau banyak error: `bun run fix`

---

## 4) Setup Oxfmt (pengganti Prettier) — config minimal

Oxc merekomendasikan `.oxfmtrc.json` atau `.oxfmtrc.jsonc`.

Buat file `.oxfmtrc.jsonc`:

```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 80,
}
```

Kenapa `printWidth: 80`?

- Oxfmt default `printWidth` = 100, sedangkan Prettier default = 80.
- Kalau kamu migrasi dari Prettier dan pengin diff formatting minimal, 80 biasanya lebih aman.

---

## 5) Setup Oxlint — pilihan “baru” vs “migrasi”

### A) Kalau project baru (tanpa ESLint)

Generate config dasar:

```bash
bunx oxlint --init
# kalau bunx bermasalah: bun x oxlint --init
```

### B) Kalau sudah pakai ESLint flat config (eslint.config.js / mjs)

Gunakan migrator resmi:

```bash
bunx @oxlint/migrate eslint.config.js
```

Opsional kalau kamu pakai type-aware rules ala `typescript-eslint`:

```bash
bunx @oxlint/migrate --type-aware eslint.config.js
```

Hasilnya biasanya menghasilkan `.oxlintrc.json` yang bisa kamu edit lanjut.

### C) Migrasi bertahap (paling realistis untuk repo besar)

Kalau ada rules ESLint yang belum bisa diganti, kamu bisa jalanin dua-duanya sementara:

```bash
oxlint && eslint
```

Strategi umum:

1. Jalanin Oxlint dulu (cepat, nangkep error awal)
2. ESLint tinggal untuk rules yang belum tersedia

---

## 6) “Prettier → Oxfmt” cepat (kalau kamu sudah pakai Prettier)

Oxc menyediakan jalur migrasi “1 command” untuk setup sederhana.

**Versi Bun:**

```bash
bun add -D oxfmt@latest
bunx oxfmt --migrate=prettier
bunx oxfmt
```

Lalu:

- Hapus file config Prettier (`.prettierrc*`, `prettier.config.*`) kalau sudah tidak dipakai
- Update script/hook yang masih memanggil Prettier

---

## 7) Git hooks (opsional tapi recommended)

Tujuannya: **jangan ada kode “kotor” masuk repo**.

### Versi simpel (Husky)

- `pre-commit`: jalankan `bun run check:fast`
- `pre-push`: jalankan `bun run check`

Kalau kamu pakai `lint-staged`, fokuskan ke file staged biar lebih cepat:

- `oxfmt` untuk format
- `oxlint --fix` untuk lint autofix

---

## 8) CI (contoh konsep)

Di CI kamu cukup jalankan:

```bash
bun install --frozen-lockfile
bun run check
```

> Tip: kalau project besar, `check:fast` bisa jadi job terpisah yang lebih cepat, sementara `typecheck` bisa job lain (atau dijalankan di PR saja).

---

## 🛠️ Troubleshooting cepat

### 1) `bunx` tidak jalan / error di Windows

- Coba `bun x <cmd>` karena `bunx` = alias `bun x`.
- Pastikan Bun ada di PATH.

### 2) Format jadi beda jauh setelah migrasi

- Pastikan `.oxfmtrc.jsonc` set `printWidth: 80` (jika kamu sebelumnya Prettier default).
- Pastikan kamu update Prettier ke v3.8 dulu (opsional) sebelum migrasi supaya output lebih mirip.

### 3) Ada rules ESLint yang “belum ada” di Oxlint

- Jalankan mode bertahap: `oxlint && eslint`
- Matikan rules ESLint yang overlap supaya nggak dobel.

---

## 🤖 “AI/LLM Guardrails” (biar AI nggak ngawur)

Kalau kamu sering pakai agent / coding assistant:

- Tambahkan file `AGENTS.md` berisi:
  - Cara menjalankan `bun run check:fast` dan `bun run check`
  - Aturan: “jika lint error, fix dulu; jangan biarkan warning”
  - Preferensi: jangan commit kalau `fmt:check` gagal
- Pastikan CI jadi “hakim terakhir”: kalau CI merah, dianggap gagal.

---

## ✅ Checklist implementasi (biar tinggal centang)

- [ ] `bun add -D @typescript/native-preview oxlint oxfmt`
- [ ] `package.json` punya script `check:fast`, `check`, `fix`
- [ ] VS Code setting `"typescript.experimental.useTsgo": true`
- [ ] File `.oxfmtrc.jsonc` ada dan `printWidth` diset (opsional)
- [ ] Oxlint: `bunx oxlint --init` atau `bunx @oxlint/migrate ...`
- [ ] (opsional) pre-commit / CI menjalankan `bun run check:fast` / `bun run check`

---

## 📚 Referensi resmi (kalau kamu mau cek sumber)

- Bun `bunx` docs
- TypeScript Go preview repo (`microsoft/typescript-go`) & `@typescript/native-preview`
- Oxc docs: “Migrate from Prettier” dan “Migrate from ESLint”

---

Kalau kamu sebut project kamu ini tipe apa—**Vite+React**, **library**, atau **backend service**—aku bisa “customize” skill.md ini jadi lebih spesifik (misal: lint rule untuk React, path alias TS, atau setup monorepo).
