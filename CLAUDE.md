# Vocab-SRS — 單字複習 PWA（本機 repo 原則）

> 本檔＝精簡入口。**逐 session 的現況／待辦／資料管線進度以 `HANDOFF.md` 為 canonical**（每次 session 開頭先讀它）；本檔只放不常變的架構／慣例／部署，不重複 HANDOFF 內容。
> Global `~\.claude\CLAUDE.md` 通用原則仍適用（Codex 管 code review、Gemini 管搜尋、`<200` 行等），不在此重述。

## 這個 repo 是什麼

單字複習 PWA，**6255 字（L1–L6）**，iPhone／iPad／Android 通用，vanilla JS（無 build、無 deps），SM-2 間隔重複。
- 線上：https://freewilljr1221.github.io/vocab-srs/
- Repo：`github.com/freewilljr1221/vocab-srs`（git，可 push；branch `main`）
- 卡面：正面 單字＋美式 IPA＋MP3；背面 詞性（多 POS）＋繁中翻譯（多義）＋英英定義＋英文例句

## ⚠️ 最重要的雷

- **部署目標＝`docs/`**（GH Pages source ＝ `main` / `/docs`，push `main` 自動部署）。**根目錄的 `index.html`／`sw.js`／`manifest.json` 是舊版 —— 不要部署、不要當正式改。**
- 路徑全用相對（`./...`）—— GH Pages 在子路徑 `/vocab-srs/`。
- PWA 更新後**必須關掉 PWA 再開**才會載新版（SW cache-first shell）。

## 檔案地圖（durable）

| 路徑 | 用途 |
|---|---|
| `HANDOFF.md` | **session context 唯一真相**（現況快照／待辦／管線進度） |
| `audit-index.md` | 舊 index.html 的 Opus 審查（參考） |
| `scripts/0{1,2,3}-*.mjs`、`10-build-ship.mjs` | Node 資料管線（CSV→骨架→Pass A 字典→Pass B 中翻→ship） |
| `data/skeleton/L{1..6}.json` | 基準骨架（commit） |
| `data/enriched/L{1..6}.json` | Pass 全量（**.gitignore**） |
| `docs/` | **GH Pages 部署目標**（PWA 入口 + slim data，commit） |
| `logs/` | 每卡每 Pass 成敗紀錄（.gitignore） |

## 重要設計決定（不要改）

多 POS 一張卡／字根+衍生一張卡（`accomplish(ment)`）／跨 level 同形異義保留多卡／資料**按 level lazy load**（不合併，iOS 開機快）／**SRS state key = card id**（非 word，跨 level 同形字獨立）／無 AI 教練（前端直呼 API 不可行，需 backend proxy）／只用免費 API（Free Dictionary CC BY-SA 3.0 + Nvidia NIM MiniMax）。

## 環境

Node v24（built-in fetch）；`NVIDIA_API_KEY`（`minimaxai/minimax-m2.7` via Nvidia NIM，OpenAI 相容，60 RPM，reasoning model 需 `max_tokens ≥ 1500`）。本地測 PWA：`cd docs && python -m http.server 8000`。

## 慣例

繁中翻譯／UI；程式碼一律送 **Codex** review（`sw.js`／`manifest.json` 仍待 review，見 HANDOFF.md 末）。
