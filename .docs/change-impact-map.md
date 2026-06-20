# Vocab-SRS 變更連動圖（Change-Impact Map）

> **用途**：改一個東西時，這裡列出「必須一起改」的相關檔，避免漏東漏西（drift）。
> **時機**：動前端 / 卡片 schema / 資料管線 / 部署前後各看一次。
> **權威順序**：`CLAUDE.md`（架構/慣例/部署雷）＞ `HANDOFF.md`（逐 session 現況真相）＞ `AI-README.md`（地圖）。
> **最大漂移風險**：**根目錄 vs `docs\` 雙份 `index.html`/`sw.js`/`manifest.json`** —— 永遠只改 `docs\` 版（根目錄是舊版，勿碰）。
> **維護鐵則**：本圖本身也要同步——新增/移除任何連動關係時一起更新，否則它會過時失效。

---

## A. 改前端（`docs\index.html` / `docs\*.js` / `docs\css`）

⚠️ **只動 `docs\`**（GH Pages source = `main` / `/docs`）。根目錄同名檔是舊版，不部署、不當正式改。
- 改前端邏輯/資產 → **bump `docs\sw.js`** 的 cache 版本（SW cache-first shell，否則使用者抓舊版）
- 路徑全用相對 `./...`（GH Pages 在子路徑 `/vocab-srs/`，絕對路徑會 404）
- PWA 更新後**必須關掉 PWA 再開**才載新版

## B. 改卡片資料 schema（欄位、卡片 id 規則、POS 結構…）

改 schema → 全管線 + 兩端資料重生：
- `scripts\01-csv-to-skeleton.mjs`（骨架結構）
- `scripts\02-pass-a-dict.mjs`（字典欄位：IPA/POS/定義/例句）
- `scripts\pb-claude-{extract,split,merge}.mjs`（繁中欄位 `zh_b`；Pass B canonical 路徑 + Haiku subagent）
- `scripts\10-build-ship.mjs`（slim 組裝 → `docs\data\`）
- `data\skeleton\L{1..6}.json`（commit）＋ `docs\data\L{1..6}.json` + `index.json`（重生）
- `docs\index.html` 前端讀取/渲染卡片的程式（欄位名對齊）
- `AI-README.md` §2 資料管線表
> **鐵則**：SRS state key = **card id**（非 word）；跨 level 同形字獨立卡——改 id 規則會動到既存使用者進度。

## C. 改資料管線 / 資料源（API、Pass 邏輯）

- 翻譯 API：Pass B 已完成，走 **Claude-inline** 路徑（`scripts\pb-claude-{extract,split,merge}.mjs` + Haiku subagent；extract 抓 `!zh_b.ok` → split → subagent 翻 → merge 寫回 `zh_b.source=claude-inline`）。`NVIDIA_API_KEY` = diffusiongemma；舊 `scripts\03-pass-b-zh.mjs`（MiniMax，hardcode model）已刪除
- 字典 API：`scripts\02-pass-a-dict.mjs`（Free Dictionary，CC BY-SA 3.0）
- `AI-README.md` §6 環境表 ＋ `C:\HansDB\HansKey.md`（`NVIDIA_API_KEY` Machine scope = **diffusiongemma**，2026-06-16 起）
- 紀錄：`logs\passA.jsonl` / `passB.jsonl`（.gitignore，每卡每 Pass 成敗）

## D. 部署 / GH Pages 設定

- 部署 = `git push main` → GH Pages 自動發 `docs\`
- 改 GH Pages source（branch / 資料夾）→ 對齊 `AI-README.md` §2 部署目標說明 ＋ CLAUDE.md「最重要的雷」
- Firestore 同步規則：`docs\firestore.rules`（家庭級「有 URL 即可看」、per-family）

## E. 逐 session 現況 / 待辦 / 管線進度

- 一律回寫 **`HANDOFF.md`**（canonical，每次 session 開頭先讀）
- memory（`project_vocab_srs.md`）只做指標 + 不變的 key 提醒，**不重抄 HANDOFF**
- 架構/慣例/部署雷 → `CLAUDE.md`；地圖 → `AI-README.md`

## F. 親戚安裝包文件

- `scripts\build-docx.js` → 產 `Vocab-SRS-親戚安裝包\` 內兩份 Word
- 改安裝步驟/文案 → 重跑 build-docx.js 重生

---

## 連動速記

```
改前端      → 只動 docs\；bump docs\sw.js；相對路徑；關 PWA 再開
改卡片schema → scripts 01/02/03(+pb-claude) → 10-build-ship → data\skeleton + docs\data 重生 → 前端渲染對齊
改資料源    → 對應 scripts pass + AI-README §6 + HansKey.md（NVIDIA_API_KEY = diffusiongemma）
部署        → push main 自動發 docs\
session進度 → 回寫 HANDOFF.md（不入 memory/CLAUDE）
```
> 寫檔前 `git status --short` → 有改動先 `git diff` 確認。
