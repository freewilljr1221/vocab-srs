# Vocab-SRS — AI 專案地圖

> 給 AI 的完整地圖：檔案清單／資料管線／部署／memory，**全用絕對路徑**。
> ⚠️ 本檔是 **`AI-README.md`**（給 AI），與既有公開 `README.md` 不同檔、不互相覆蓋。
> 三層分工：`CLAUDE.md`=架構/慣例、本檔=地圖、`HANDOFF.md`=逐 session 現況真相，互不重複。
> 更新日：2026-06-09

---

## 1. 定位

單字複習 **PWA**，**6255 字（L1–L6）**，iPhone/iPad/Android 通用，**vanilla JS（無 build、無 deps）**，SM-2 間隔重複。卡面：正面 單字+美式 IPA+MP3；背面 多 POS+繁中多義+英英定義+例句。資料由 Node 管線離線生成，前端 lazy load。

- **根目錄**：`C:\HansDB\Vocab-SRS`
- **線上**：https://freewilljr1221.github.io/vocab-srs/
- **git**：`github.com/freewilljr1221/vocab-srs`（branch `main`，可 push）
- **session 真相**：每次開頭先讀 `C:\HansDB\Vocab-SRS\HANDOFF.md`

---

## 2. 檔案地圖（絕對路徑）

### ⚠️ 部署目標 — `C:\HansDB\Vocab-SRS\docs\`（GH Pages source = `main` / `/docs`）
| 路徑 | 類型 | 用途 |
|---|---|---|
| `docs\index.html` | html | **PWA 正式入口**（push main 自動部署） |
| `docs\sw.js` | js | Service Worker（cache-first shell） |
| `docs\manifest.json` | json | PWA manifest |
| `docs\data\L{1..6}.json` + `index.json` | json | slim 卡片資料（按 level lazy load） |
| `docs\icons\icon-{192,512}.png` | png | PWA 圖示 |
| `docs\firestore.rules` | rules | **Firestore 安全規則**（家庭級同步：「有 URL 即可看」、per-family 資料） |

> 🚨 **根目錄的 `index.html`／`sw.js`／`manifest.json`／`icons\` 是舊版 —— 不要部署、不要當正式改。** 只動 `docs\`。

### 資料管線 — `C:\HansDB\Vocab-SRS\scripts\`（Node .mjs）
| 路徑 | 類型 | 管線步驟 |
|---|---|---|
| `scripts\01-csv-to-skeleton.mjs` | mjs | CSV → 基準骨架 |
| `scripts\02-pass-a-dict.mjs` | mjs | Pass A：字典（IPA/POS/定義/例句，Free Dictionary API） |
| `scripts\10-build-ship.mjs` | mjs | 組裝 + slim → 出 `docs\data\` |
| `scripts\pb-claude-{extract,split,merge}.mjs` | mjs | **Pass B 繁中翻譯（canonical）**：抽取 `!zh_b.ok` → 切分 → Haiku subagent 翻 → merge 回寫 `zh_b`（`source=claude-inline`） |
| `scripts\build-docx.js` | js | 產 親戚安裝包的兩份 Word 文件 |

### 資料 / 紀錄
| 路徑 | 類型 | 用途 |
|---|---|---|
| `data\skeleton\L{1..6}.json` + `_summary.json` | json | 基準骨架（**commit**） |
| `data\enriched\L{1..6}.json` | json | Pass 全量（**.gitignore**） |
| `logs\passA.jsonl` / `passB.jsonl` | jsonl | 每卡每 Pass 成敗紀錄（**.gitignore**） |

### 文件 / 其他
| 路徑 | 類型 | 用途 |
|---|---|---|
| `C:\HansDB\Vocab-SRS\HANDOFF.md` | md | **session context 唯一真相**（現況/待辦/管線進度） |
| `C:\HansDB\Vocab-SRS\README.md` | md | 公開 README（人看；勿與本檔混淆） |
| `C:\HansDB\Vocab-SRS\audit-index.md` | md | 舊 index.html 的 Opus 審查（參考） |
| `C:\HansDB\Vocab-SRS\Vocab-SRS-親戚安裝包\` | — | 親戚安裝包（含 build-docx.js 產物） |

### 治理 / 設定檔
| 路徑 | 類型 | 作用 |
|---|---|---|
| `C:\HansDB\Vocab-SRS\.gitignore` | — | 擋 `data\enriched\`、`logs\`、`.tmp\` |
| `C:\HansDB\Vocab-SRS\.claude\settings.local.json` | json | 本 repo 工具權限 |

---

## 3. 資料管線 / 部署流

```
CSV
  → scripts/01-csv-to-skeleton  → data/skeleton/L{1..6}.json (commit)
  → scripts/02-pass-a-dict      → data/enriched/ (字典: Free Dictionary API)
  → scripts/pb-claude-{extract,split,merge} → data/enriched/ (繁中: Claude-inline + Haiku subagent；canonical)
  → scripts/10-build-ship       → docs/data/L{1..6}.json + index.json (slim, commit)
部署: push main → GH Pages 自動發佈 docs/ → https://freewilljr1221.github.io/vocab-srs/
前端: docs/index.html (vanilla JS) 按 level lazy load docs/data/，SM-2 排程，SW cache-first
同步: Firestore（家庭級，docs/firestore.rules）
```
> PWA 更新後**必須關掉 PWA 再開**才載新版（SW cache-first shell）。

---

## 4. Skills

- **無**（本專案不設 repo skill）。code review 一律送 **Codex**（全域慣例）。

---

## 5. Memory 規劃

- **位置**：`C:\Users\Administrator\.claude\projects\C--HansDB-Vocab-SRS\memory\`
- **載入**：cwd 在 Vocab-SRS 時 `MEMORY.md` 前 ~200 行自動載入。

| 檔案 | 內容 | 現況 |
|---|---|---|
| `MEMORY.md` | 索引 | **2026-06-09 新建** |
| `project_vocab_srs.md` | 動態現況指標（指向 HANDOFF.md 為真相） | **2026-06-09 新建** |

**分工（避免飄移）**：架構/慣例/部署雷 → CLAUDE.md；**逐 session 現況/待辦/管線進度 → `HANDOFF.md`（canonical）**；memory 只做指標 + 不變的 key 提醒，不重抄 HANDOFF。

---

## 6. 環境變數 / API / 依賴

| 項目 | 值 |
|---|---|
| Runtime | Node v24（built-in fetch，無 npm deps） |
| 翻譯 API | Pass B 繁中走 **Claude-inline** 管線（`pb-claude-*` + Haiku subagent）；翻譯 key 見 HansKey、進度見 HANDOFF |
| 字典 API | Free Dictionary（CC BY-SA 3.0，免費） |
| 同步 | Firestore（family-scale，`docs\firestore.rules`） |
| key 總表 | 見 `C:\HansDB\HansKey.md`（翻譯用 `NVIDIA_API_KEY`） |
| 本地測 | `cd C:\HansDB\Vocab-SRS\docs && python -m http.server 8000` |

---

## 7. 入口與執行

```bash
# 跑資料管線（依序）
node C:\HansDB\Vocab-SRS\scripts\01-csv-to-skeleton.mjs
node C:\HansDB\Vocab-SRS\scripts\02-pass-a-dict.mjs
# Pass B（繁中）已完成，走 Claude-inline：pb-claude-extract → split → Haiku subagent → pb-claude-merge
node C:\HansDB\Vocab-SRS\scripts\10-build-ship.mjs
# 本地預覽 PWA
cd C:\HansDB\Vocab-SRS\docs && python -m http.server 8000
# 部署：git push main（GH Pages 自動發 docs/）
```

---

## 8. 雷區 / 鐵則（速記，完整見 CLAUDE.md + HANDOFF.md）

1. ⚠️ **部署只動 `docs\`**；根目錄 `index.html/sw.js/manifest.json` 是舊版，勿碰。
2. 路徑全相對（`./...`）—— GH Pages 在子路徑 `/vocab-srs/`。
3. **SRS state key = card id**（非 word）；跨 level 同形字獨立卡。
4. 資料按 level lazy load（不合併，iOS 開機快）。
5. 無 AI 教練（前端直呼 API 不可行，需 backend proxy）；只用免費 API。
6. **Pass B 舊路徑（NIM/MiniMax `03-pass-b-zh.mjs`）已退役** —— 一律走 `pb-claude-*`，勿再呼叫舊腳本；key／進度見 HANDOFF＋HansKey。

---

## 9. 改動防漂移（改 A 別忘了改 B）

無獨立 change-impact-map；連動點：
- 改 `docs\` 前端後 → 視需要 bump `docs\sw.js`（SW cache-first，否則抓舊版）。
- 改卡片 schema → 同步 `scripts\*` 管線 + `data\skeleton` + `docs\data` 重生。
- **逐 session 進度一律回寫 `HANDOFF.md`**（session 真相，不在 memory/CLAUDE 重抄）。
- 寫檔前 `git status --short` → 有改動先 `git diff` 確認。
> 注意：**根 vs docs 雙份 `index.html/sw.js/manifest.json`** 是最大漂移風險源 —— 永遠只改 docs 版。
