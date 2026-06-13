# Vocab-SRS Handoff (Session 3 → 4)

> **下一次 session 開頭直接讀這檔,所有 context 都在這。**
> 線上版: https://freewilljr1221.github.io/vocab-srs/ (main / docs)

## 目標
單字複習 PWA,**6255 字** (L1-L6),iPhone/iPad/Android 通用,GH Pages 部署。
- 正面:單字 + 美式 IPA + MP3 發音
- 背面:詞性 (多 POS 並列) + 中文翻譯 (繁中,多義) + 英英定義 + 英文例句
- SRS (間隔重複) — **下次 session 才做**

## 目前狀態 (Session 3 結束)

### 資料管線
| Pass | 內容 | 狀態 |
|------|------|------|
| **01 CSV→Skeleton** | 6255 卡,id/word/slug/pos/level | ✅ 完成 |
| **02 Pass A Dictionary** | IPA / MP3 / 英英 / 英例 | ✅ L1-L5 ~96%,L6 ~90% (剩 rate_limited 可 resume) |
| **03 Pass B 中文翻譯** | zh_by_pos / zh_main | 🟡 L1 31% (320/1018),L2-L6 = 0(被 Nvidia 429 卡住) |
| **Pass C 英文例句** | 補滿例句 (1 POS→2 句 / 多 POS→每 POS 1 句) | ✅ 全 6 級 0 缺口 (Session 4, Haiku 生成) |
| **10 Build Ship** | 壓縮 + 複製到 docs/data/ | ✅ 工具好了 |

### 前端 (docs/)
| 檔案 | 狀態 |
|------|------|
| `docs/index.html` | ✅ vanilla JS, iOS-safe, **SRS v1 完成**(複習/瀏覽雙模式) |
| `docs/sw.js` | ✅ cache-first shell, stale-while-revalidate data, v3-srs-fixes |
| `docs/manifest.json` | ✅ 相對路徑,GH Pages 友善 |
| `docs/icons/` | ✅ icon-192, icon-512 |
| `docs/data/L{1-6}.json` | ✅ slim ship 資料,L1 含部分中翻 |
| **設定畫面** | ⏸ 下次做(每日新卡量寫死 15) |
| **匯入/匯出 SRS state** | ⏸ 下次做(跨裝置同步用) |

### Pass B 翻譯品質實測 (L1 前 10 字)
```
able          adj.        能夠的; 能幹的; 有能力的
about         adv./prep.  大約; 到處; 四處 / 關於; 在...周圍
according to  prep.       根據; 按照; 依據 (dict 404 也救回來)
actor/actress n.          演員; 演藝人員 (斜線字 OK)
address       n./v.       地址; 住址 / 準備; 處理; 應對 (多 POS 分離)
```
品質可用,個別字略不精準 (`above (adj.)→天上的` 應是 `上述的`),v1 接受。

### SRS 行為實測
- 點翻面 → 出現 4 顆評分鈕,每鈕顯示下次到期間隔 (`1d / 4d / 7d / 14d` 之類)
- 評分後 → 卡片消失下一張
- 評 Again → 卡片塞到 deck 尾端(同 session 不重複扣 ease)
- 同卡 Again 3 次 → 強制畢業(避免 UX 卡死)
- 評完當日新卡上限 (15) → 「今日完成」畫面
- 切「瀏覽」模式 → 全部卡可上下翻,不計入 SRS

---

## 下次 Session (Session 4) 第一件事

**先看 app 還活著**:https://freewilljr1221.github.io/vocab-srs/ — 你 iPhone/iPad 上有沒有 SRS 進度,有沒有壞掉

```bash
cd C:\HansDB\Vocab-SRS

# 1. 確認 Session 3 結束時的資料狀況 (預期值見「現況快照」表)
node -e "for(let i=1;i<=6;i++){try{const c=require('./data/enriched/L'+i+'.json');console.log('L'+i+': dict='+c.filter(x=>x.dict_a?.found).length+'/'+c.length+' zh='+c.filter(x=>x.zh_b?.ok).length)}catch{console.log('L'+i+': missing')}}"

# 2. 看 git 是否乾淨 (Session 3 結束時應該乾淨)
git status
git log --oneline -5
```

### 現況快照 (Session 3 結束)
| L | Cards | dict | zh_ok | dict 未抓 (retryable) |
|---|-------|------|-------|----------------------|
| 1 | 1018 | 96.4% | 320 (31%) | 6 |
| 2 | 1030 | 95.8% | 0 | 39 |
| 3 | 1053 | 95.0% | 0 | 46 |
| 4 | 1047 | 97.3% | 0 | 23 |
| 5 | 1055 | 96.5% | 0 | 29 |
| 6 | 1052 | **90.5%** | 0 | 95 |

dict 中 `rate_limited` 全部 `retryable: true`(Free Dictionary API 限流),resume 會重抓。
`not_found` 是真 404(專有名詞、縮寫如 `Mrs.`, `o'clock`),要留給 MiniMax。

## 下次 Session (Session 4) 待辦清單

### 階段 1:資料補完(背景,~大半天但不耗 token)

```bash
# A. 補 Pass A 還沒 100% 的 levels (resume 邏輯只打沒成功的)
for lv in 2 3 4 5 6; do
  node scripts/02-pass-a-dict.mjs --level $lv --concurrency 3
done
#    註:concurrency 從 5 降到 3 — Free Dictionary 限流嚴

# B. Pass B 中文翻譯 (重點!)
#    Session 3 試跑 L1 → 320 OK / 195 token截斷 / 503 卡 429
#    Nvidia API 持續 429 可能是日配額,先確認:
curl -sS -X POST 'https://integrate.api.nvidia.com/v1/chat/completions' \
  -H "Authorization: Bearer $NVIDIA_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"minimaxai/minimax-m2.7","messages":[{"role":"user","content":"say hi"}],"max_tokens":50}' | head -c 200

#    回 200 → API 通,跑 Pass B
#    回 429 → 等 1 小時再試

# C. Pass B 全 6 levels (concurrency 降到 3,避免再 429)
for lv in 1 2 3 4 5 6; do
  node scripts/03-pass-b-zh.mjs --level $lv --batch 5 --concurrency 3
done

# D. 對被 token 截斷的卡用更小 batch 重抓
#    (195 卡 in L1, 應該也會在其他 level 出現)
#    要稍微改 03-pass-b-zh.mjs 加 --only-error truncated_max_tokens flag,或直接:
node -e "
const fs=require('fs');
for(let i=1;i<=6;i++){
  const f='./data/enriched/L'+i+'.json';
  if(!fs.existsSync(f))continue;
  const c=JSON.parse(fs.readFileSync(f,'utf8'));
  let n=0;
  for(const x of c){if(x.zh_b?.error==='truncated_max_tokens'){delete x.zh_b;n++}}
  fs.writeFileSync(f,JSON.stringify(c));
  console.log('L'+i+': cleared '+n+' truncated entries');
}
"
#    然後用 --batch 2 重跑
for lv in 1 2 3 4 5 6; do
  node scripts/03-pass-b-zh.mjs --level $lv --batch 2 --concurrency 3
done
```

**估時**:Pass A 剩餘 ~10 min,Pass B 全 6 levels ~8-12 hr(分次跑沒關係)

### 階段 2:推資料到線上

```bash
node scripts/10-build-ship.mjs
git add docs/data/ data/enriched/.placeholder  # data/enriched/ 已 gitignore
git commit -m "Refresh ship data"
git push
# 等 30s,iPhone 關掉 PWA 重開就拿到新資料 (SW stale-while-revalidate)
```

### 階段 3:Pass C — 中文例句翻譯(新腳本)

抓 `dict_a.meanings[].examples` 裡的英文例句,送 MiniMax 翻成中文。
schema 設計:每張卡加 `examples_zh` 欄位,跟 `dict_a.meanings[].examples` 索引對齊。

預估腳本 ~200 行,結構跟 `03-pass-b-zh.mjs` 高度相似。仿造寫:
- 同樣的 retry/atomic-write/flush-mutex/pool pattern
- 同樣的 partial coverage → retryable 規則
- 同樣的 sanitize hint (例句裡可能有用戶輸入)

`10-build-ship.mjs` 要對應更新 → 把 `examples_zh` 也 slim 進 ship 資料。

### 階段 4:前端優化(在 docs/index.html)

優先順序:
1. **設定畫面** — 每日新卡量 (現在硬編 15) / TTS 速度 / 深淺色手動切換 / 「重置 SRS 進度」按鈕
2. **匯入/匯出 SRS state** — 跨裝置同步(iPhone ↔ iPad),JSON 對拷
3. **更新提示** — push 新版後跳「有新版可更新」(SW 拿到新 cache 時 postMessage)
4. **首頁 dashboard** — 今日到期 / 新卡剩餘 / 已掌握 (interval≥21d) 數字
5. **Codex review docs/index.html 剩下 4 個 MED**:
   - showDone 時 ratingArea.show 殘留(Session 3 修了一半,確認)
   - 跨 tab 競爭(同步寫 srsData)— 可加 storage event listener
   - browse idx=-1 latent 邊界
   - iOS speechSynthesis 在 PWA standalone 偶發空 voices — 加 warm-up retry

### 階段 5:部署狀態 ✅

Session 3 已搞定:
- Repo: https://github.com/freewilljr1221/vocab-srs
- Pages: https://freewilljr1221.github.io/vocab-srs/ (Source: branch `main` / folder `/docs`)
- 不需再設定,push `main` 自動部署

**注意**:GH Pages 部署在子路徑 (`/vocab-srs/`),所有路徑用相對 (`./manifest.json`),已處理。
PWA 更新後**必須關掉 PWA 再開**(雙擊 home → 上滑)才會載新版,瀏覽器分頁 reload 也可。

---

## 重要設計決定 (不要改)

1. **多 POS 一張卡** (Q1-A): `tear,n./v.` 一張卡,背面分開顯示 n. 和 v. 的中文
2. **字根+衍生一張卡** (Q2-A): `accomplish(ment)` 一張卡,word 保留 `(ment)`,slug `accomplish` 給 dict API
3. **跨 level 同形異義字保留多張卡** (Q3-A): `tear` 出現在 L2 一張、`lead` 出現在 L1+L4 兩張
4. **斜線並列字** (slug fix): `actor/actress` → display 保留斜線,slug 取 `actor` 一個拼法做 dict 查
5. **資料分檔**: 不合併成單一檔,**lazy load by level**,iOS PWA 開機更快
6. **無 AI 教練**: 拿掉了,因為前端直呼 Anthropic API 不可行 (沒 key + CORS),需要 backend proxy。日後想加就部署 Cloudflare Worker
7. **TTS + MP3 雙軌**: MP3 first (從 dictionaryapi.dev),失敗 fallback `speechSynthesis`
8. **無付費 API**: Free Dictionary (公開 CC BY-SA 3.0) + Nvidia NIM 免費 (60 RPM)

---

## Session 4 增量更新 (2026-06-13)

### 已交付 — Pass C 英文例句（全 6 級補滿）
- **規則**：1 個詞性 → 2 句例句；2+ 個詞性 → 每詞性 1 句。缺口按**宣告 POS**（`c.pos` 拆 `/`）對 `dict_a.meanings` bucket 計算（與前端顯示一致）。
- **生成方式**：**不走 MiniMax，改用 Claude Haiku subagents**（量大、規格明確）。主 agent (Opus) 抽查品質。
- **新腳本**（仿 `pb-claude-*` 三件套）：
  - `scripts/04a-pc-examples-extract.mjs` — 掃 enriched 找缺口 → compact batch
  - `scripts/04b-pc-examples-merge.mjs` — 生成結果 append 回 `dict_a.meanings[].examples`（dedupe，每 bucket cap 3，找不到 bucket 就建）
  - chunk 用既有 `pb-claude-split.mjs`
- **流程**：extract → split(200) → 20 個 Haiku subagent 生成 → 驗證(JSON/覆蓋/句數) → merge 有效檔 → re-extract 抓殘留 → 補生成(chunk 100) → merge → 確認 **0 缺口**。共生成 ~5500 句，enriched 內例句總數 18785。
- **build-ship 修正**：原本 `dict_a.found===false` 的卡（dict 404 專有名詞/縮寫）會被丟掉整個 meanings，導致替它們生成的例句在 ship 時消失。改成**只要有 meanings 就 ship**（前端 `renderBack` 本來就不看 `found`）。ship 端 0 缺口、16269 句。
- **前端** `docs/index.html` `renderBack`：`exPerPos = posList.length===1 ? 2 : 1`，迴圈渲染多句 `.example-en`（原本只 `examples[0]`）。
- **資料修正**：`afraid-L1` 的 pos 是大寫 `Adj.`（來源 typo，導致前端 `posLong` 對不到、背面整個不顯示），已正規化為 `adj.`（skeleton + enriched）。全庫掃描確認只此一張非標準 POS。
- **版本**：sw.js `CACHE_VERSION` 1.2.2 → **1.3.0**（MINOR，新功能），index.html `ver-num` 同步。
- **驗證**：本地 preview 實機確認 `according to`(prep. 單POS)→2 句、`finger`(n./v.)→每詞性 1 句。

### 已交付 — TCG 卡牌皮膚（v1.4.0）
- 卡片改成**原創 TCG 風深色皮膚**（全自製，零侵權素材）：深色星空卡面 + **靜態彩色漸層邊框**（mask 圓角，無閃卡動畫）+ 正面詞性膠囊/等級寶石/漸層發音鈕；背面深色面板，例句帶彩色側線（單詞性 2 句時第一句青、第二句紫）。
- **字體全走系統字**（流量 0 KB）：標題 `ui-rounded`、IPA/定義/例句 `ui-serif`、中文沿用 `--font`（已含 PingFang/微軟正黑）。**不引入任何網頁字體**（尤其不載 CJK web font）。
- 卡片為**恆定深色物件**（不隨 app light/dark 反轉），內部色 hardcode。
- 背面捲動：`#card-back` 不捲，內容包進 `.back-scroll`（inset 3px，在 ring 內），多詞性長卡捲動時邊框固定。
- 改檔：`docs/index.html`（卡片 CSS 整段 + 正面加 `#card-pos`/`#card-gem` + renderBack 包 `.back-scroll` + renderCard 填徽記）、`docs/sw.js` `CACHE_VERSION` → 1.4.0。
- 驗證：本地 preview computed-style 確認正反面字體/顏色/邊框/側線/捲動容器皆如預期（preview 截圖在此環境逾時，改用 eval 量測）。

### 已交付 — 深色科技格線頁底（v1.4.1）
- 配合恆深卡片，**app 固定為深色**：移除 `@media (prefers-color-scheme: dark)`，`:root` 直接用深色 palette（`--bg #080b14`、`--surface #161c28`…）。
- body 套**科技格線底**（純 CSS 雙層 linear-gradient，22px，淡青線；零圖檔/零流量）。
- 下拉箭頭 svg fill 由 `#6b6860` 改 `#a8a59f`（深底下可見）。版本 → 1.4.1（PATCH）。

### 待辦（延續）
- `sw.js`/`manifest.json` 仍待 Codex review（本 session 未送；本次只動 `CACHE_VERSION` 字串）。
- Pass C 腳本（04a/04b）本身未送 Codex review。
- TCG 皮膚 + 深色頁底的 CSS／JS 改動未送 Codex review。

---

## Session 3 增量更新 (2026-05-18)

### 已交付
- **GH Pages 上線** → https://freewilljr1221.github.io/vocab-srs/ (main / docs)
- `src/` → `docs/` 重命名 (GH Pages 子資料夾相容)
- `.gitignore` 排除 `data/enriched/`, `logs/`, `.tmp/`, `.claude/`
- **SRS v1 完成** in docs/index.html:
  - 「複習 / 瀏覽」模式切換,預設複習
  - SM-2 (Again/Hard/Good/Easy),4 顆評分鈕 + 下次間隔預覽
  - localStorage 鍵 `vocab_srs_v1`,記錄 per card id
  - 每日新卡上限 `DAILY_NEW_LIMIT = 15` (硬編,設定畫面下次做)
  - 「今日完成」畫面
  - Codex review → 修 5 HIGH:
    1. Again 同卡多次不再重複扣 ease/lapses
    2. 同卡 Again >3 次 → 強制畢業(避免 UX 卡死)
    3. Again 預覽 `1d` 改正
    4. srsData 載入時 schema sanitize (NaN/wrong-type 丟棄)
    5. swipe→click 改用 `state.swipedAt` timestamp 旗標
- Pass A L5 補滿 (97%),L6 跑到 ~60%

### 資料現況 (Session 3 結束)
見上方「現況快照」表。Session 3 期間 L1 zh 從 145 → 320,L5 補滿,L6 從 0 → 90.5%。

### Session 3 發現的問題 (待下次處理)
1. **Pass B L1 大量 429** (503/1018 卡 = 50%):
   - resume 機制正確(429 標 `retryable: true`,下次會重抓)
   - 但目前 Nvidia API 持續節流 — 可能日配額用罄
   - 下次先等 24 小時或測試 API 是否回穩,再重跑 Pass B
   - 也應該確認 truncated_max_tokens (195 個) 用 `--batch 2` 重跑能不能救
2. **設定畫面未做**:每日新卡量寫死 15,使用者改不了
3. **docs/index.html 還有 4 個 Codex 標的 MED/LATENT 問題**(cosmetic):
   - showDone 時 ratingArea.show 可能殘留 (已部分修)
   - 跨 tab 競爭(同步寫 srsData)
   - browse idx=-1 latent 邊界
   - iOS speechSynthesis 在 PWA standalone 偶發空 voices
4. **PWA 更新通知**:目前推新版本後使用者要關掉 PWA 重開才會載到新 index.html。可加 update prompt
5. **Pass C (例句翻譯) 未做**

### 重要設計決定追加
9. **SRS state key = card id** (不是 word)。跨 level 同形字 SM-2 完全獨立。

---

## 已知問題 / TODO 紀錄

1. **小品質瑕疵**: 個別中翻不夠精準 (e.g. `above (adj.) → 天上的` 應 `上述的`)。Pass D 可做「品質審查」用 MiniMax 自我評分,我們再決定要不要做
2. **Free Dict 13 字真 404** (L1): `for`, `kite`, `touch`, `Mrs.`, `o'clock`, `every`, `look`, `be`, `is` 等。MiniMax 可以填中翻但沒英英、沒英例。Pass C 想想要不要也讓 MiniMax 生英例
3. **MP3 license**: dictionaryapi.dev 的音檔是 wiktionary 來的,**CC BY-SA 3.0**。商用上要在 about 頁面標 attribution
4. **iPad split-view**: 沒測過,可能要再加 `@media (orientation: landscape)` breakpoint
5. **localStorage 不會跨裝置同步**: 之後想跨機同步 SRS 進度,要寫 export/import JSON
6. **資料體積**: L1 ship = 718 KB (含完整 dict)。6 levels 全 ship ~4 MB。gzip 後 ~700 KB。iOS PWA 首屏只載 L1,可以接受
7. **`finish_reason: length` 邊緣狀況**: 03 script 把它標 retryable=false 且給 hint「下次用 --batch 較小」。下次發現有 truncated_max_tokens 錯誤,re-run 時加 `--batch 2`

---

## 檔案地圖

```
C:\HansDB\Vocab-SRS\
├── HANDOFF.md                  ← 你正在讀的這個
├── audit-index.md              ← Opus 4.7 對舊 index.html 的審查 (參考)
├── .gitignore                  ← 排除 data/enriched/, logs/, .tmp/, .claude/
├── index.html                  ← 舊版,留作參考,**不要部署** (有 SRS/Coach 但 hard-code 50 字)
├── manifest.json, sw.js        ← 舊版,**不要部署**
├── icons/                      ← 圖示 (兩個尺寸,夠用)
│
├── scripts/                    ← 資料管線 (Node.js, no deps)
│   ├── 01-csv-to-skeleton.mjs  ← CSV → 骨架 JSON
│   ├── 02-pass-a-dict.mjs      ← Free Dictionary 抓 IPA/MP3/英英/英例
│   ├── 03-pass-b-zh.mjs        ← MiniMax M2.7 翻中文
│   └── 10-build-ship.mjs       ← enriched → docs/data (slim)
│
├── data/
│   ├── skeleton/L{1..6}.json   ← 不動,基準 (commit 進 repo)
│   └── enriched/L{1..6}.json   ← Pass A/B/C 後全量 (含 log 欄位) **.gitignore**
│
├── docs/                       ← **GH Pages 部署目標**(原 src/,Session 3 改名)
│   ├── index.html              ← PWA 入口 (含 SRS 模式)
│   ├── sw.js                   ← Service Worker (v3-srs-fixes)
│   ├── manifest.json
│   ├── icons/                  ← icon-192.png, icon-512.png
│   └── data/L{1..6}.json       ← 由 10-build-ship.mjs 產生 (slim,commit)
│
└── logs/                       ← 每張卡每個 Pass 的成敗紀錄 (.gitignore)
    ├── passA.jsonl
    └── passB.jsonl
```

---

## 重要環境

- Node v24.15.0 (有 built-in fetch)
- `NVIDIA_API_KEY` 在環境變數 (MiniMax M2.7 via Nvidia NIM,OpenAI 相容)
- API endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- Model: `minimaxai/minimax-m2.7` (注意 `.7`)
- Reasoning model,有 `reasoning_content` 欄位,要給 `max_tokens >= 1500`
- 60 RPM 免費額度,目前用 concurrency=5 ~ 20 RPM,有安全裕度

## 本地測試 PWA

```bash
cd docs
# 任何 static server 都可以,例如:
python -m http.server 8000
# 或
npx serve .
# 然後開 http://localhost:8000
```

iOS 真機測:用 GH Pages 上線版即可 (https://freewilljr1221.github.io/vocab-srs/),不需 ngrok。

## 已交付給 Codex review 的程式碼
- `02-pass-a-dict.mjs` — 修了 4 HIGH + 4 MED + 2 LOW (Session 2)
- `03-pass-b-zh.mjs` — 修了 3 HIGH + 4 MED (Session 2)
- `docs/index.html` — Session 3 SRS 加完後送 review,修 5 HIGH
- `01-csv-to-skeleton.mjs`, `10-build-ship.mjs` — 簡單,沒送
- `sw.js`, `manifest.json` — **下次 session 送 Codex review!**(Session 3 來不及)
