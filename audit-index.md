# Audit: `index.html` (Vocab-SRS PWA)

審查日期: 2026-05-18
檔案: `C:\HansDB\Vocab-SRS\index.html` (39.7 KB, 657 行)
搭配: `manifest.json`, `sw.js`, `icons/icon-{192,512}.png`

---

## 1. 現況摘要

**結構**: 單檔 HTML,全部 inline (約 160 行 CSS + 350 行 JS)。CSS 用 CSS variables + `prefers-color-scheme: dark` 自動跟系統。HTML 用 4 個 `.screen` div 切換 (dashboard / flashcard / ai-coach / wordlist),JS 純原生 (無框架),透過 `onclick` inline handler 調用全域函式。

**已有功能**:
- **SRS**: 自寫簡化版 SM-2 (`sm2()`),四級 grade (Again/Hard/Good/Easy),狀態存 `localStorage` (`vocab_srs_v2`)
- **兩種模式**: SRS 複習(到期+新卡, 每次最多補滿到 10 張) vs. 亂練(全字庫 shuffle, 不計入 SRS)
- **AI 教練**: 直接從前端 `fetch('https://api.anthropic.com/v1/messages')` —— **無 API key,實際上一定 401**。沒有 backend proxy
- **單字卡翻面**: CSS 3D `rotateY(180deg)`,翻面自動 TTS 發音
- **發音**: 純 `speechSynthesis` (Web Speech API),**沒有 MP3 fallback**
- **CSV 上傳**: 簡易 parse (`split(',')`),擴充字庫
- **PWA**: `manifest.json` + `sw.js` (cache-first, API 略過),`beforeinstallprompt` (Android) + iOS 手動引導 hint
- **Dark mode**: 純 `prefers-color-scheme`,無手動切換
- **Offline badge**: 監聽 `online/offline`

**資料**: **內嵌在 JS 中** (`const VOCAB = [...]`),約 50 個示範單字,欄位: `w,d,p,pos,ex,h` (word/中文釋義/音標/詞性/例句/口訣)。**沒有英英定義、沒有 level 欄位、沒有 lazy load**。完全不符合 7000 字 × level 1-6 分檔的目標。

---

## 2. iOS Safari PWA 相容性檢查

| 項目 | 狀態 | 備註 |
|---|---|---|
| `viewport-fit=cover` | OK | 有,但缺 `user-scalable=no` / `maximum-scale=1` —— iOS 雙擊縮放仍會觸發,翻卡時體驗差 |
| `apple-touch-icon` | 部分 | 只有 192x192 一張,**缺 180x180 (iOS 標準)** 和其他尺寸 (152, 167) |
| `apple-mobile-web-app-capable` | OK | 有 |
| `apple-mobile-web-app-status-bar-style` | OK | `black-translucent` |
| `apple-mobile-web-app-title` | OK | "單字卡" |
| iOS 安裝引導 | OK (粗糙) | 有 `#ios-hint`,但 2 秒後彈出,且未檢查使用者是否已關閉過 (每次開都跳) |
| `speechSynthesis` user-gesture | **FAIL** | iOS 要求第一次 `speak()` 必須在 user gesture 內。目前在 `flipCard()` 內呼叫 —— 點卡片翻面算是 user gesture,**勉強過關**,但 `onvoiceschanged` 在 iOS 經常不觸發,`getVoices()` 同步呼叫常拿到空陣列 → 第一次發音掉 voice。需要 retry/warm-up |
| MP3 fallback | **FAIL** | 完全沒有。iOS Safari 在 PWA standalone 模式下 `speechSynthesis` 偶有靜音 bug (iOS 17+ 才較穩),沒 fallback 等於賭運氣 |
| 觸控目標 ≥44pt | 大致 OK | rating button padding 11px、nav-btn 7px×16px → 約 38-42pt,**邊緣不及格**。`.install-close` (4px padding) 過小 |
| Safe area (notch) | OK | `env(safe-area-inset-top/bottom)` 有用在 `#app`、`#install-banner`、`#offline-badge` |
| `100dvh` | OK | 有用 dynamic viewport,iOS 16+ 沒問題 |
| `-webkit-backface-visibility` | OK | 翻卡有加 prefix |
| Service Worker / 離線 | 部分 | `sw.js` cache-first 沒問題,但 **`ASSETS` 用絕對路徑 `/index.html`**。GitHub Pages 部署在 `/vocab-srs/` 子路徑下時會 404,離線完全失效。必須改 `./index.html` 或加 `scope` |
| `start_url` | FAIL on GH Pages | manifest 寫 `/index.html`,GH Pages 子路徑會錯;應為 `./` 或 `index.html` |
| `display: standalone` | OK | iOS 認 `apple-mobile-web-app-capable` |
| `theme-color` 對 iOS | 無效 | iOS Safari 不認 theme-color (僅 Android Chrome / iOS 15+ 部分支援),但無害 |
| iPad 大螢幕 | FAIL | `max-width: 680px` 卡死,iPad 橫向會兩側大量留白且 stat-grid 字太小;沒有 tablet breakpoint |
| 雙擊縮放 / pinch zoom | 風險 | 沒 `touch-action: manipulation`,翻卡點擊可能有 300ms 延遲 (現代 Safari 已改善但建議補) |

---

## 3. 與目標需求的差距

### (a) 直接可用
- SRS SM-2 演算法骨架 (`sm2()` + `dueCards()` + `newCards()`) —— 邏輯精簡正確,可保留
- CSS variables + dark mode 配色設計 (綠 #1D9E75 主色、Again/Hard/Easy 顏色語意分明)
- 翻卡 3D 動畫 (CSS perspective + rotateY)
- Service Worker 離線快取**思路** (但路徑要修)
- localStorage save/load + `mastery()` 計算
- CSV 上傳骨架 (但需強化 parsing)

### (b) 需小改
- Viewport meta (補 `user-scalable=no`)
- `sw.js` 路徑改相對路徑;`manifest.json` `start_url` 同上
- Apple touch icon 補 180x180
- iOS hint 加 `localStorage` 記住「已關閉」狀態
- 觸控目標放大到 ≥44pt
- iPad breakpoint (`max-width: 680px` 在 ≥768px 改成 880-960px)
- `speechSynthesis` 加 warm-up + voice 載入 retry

### (c) 缺失或設計錯誤,需重做
1. **資料層完全不符**:
   - 現在內嵌 ~50 字、結構含中文釋義/音標/例句/口訣 (`d/p/ex/h`)
   - 來源 CSV 只有 `word, pos, level` 三欄,**沒中文、沒音標、沒例句、沒英英定義**
   - 7000 字無法內嵌 (>1MB),必須 fetch + lazy load by level
   - 中文翻譯/英英定義/例句要嘛預先生成 (跑一次 LLM 入庫),要嘛即時 fetch (慢且耗 API)
2. **AI 教練無法運作**: 前端直呼 `api.anthropic.com` 沒 API key,且就算放 key 也會被 CORS 擋 + key 外洩。**必須改成 Cloudflare Worker / Vercel Function proxy,或拿掉這功能**
3. **MP3 美式發音 fallback 缺失**: 目標明確要求,但完全沒實作。建議用 dictionaryapi.dev 或預存 mp3
4. **Level 1-6 拆分機制不存在**: 沒有 level 欄位、沒有依等級切 deck
5. **新卡限制邏輯太死**: `newCards().slice(0,10-due.length)` 寫死 10,7000 字情境下應該可設定 (daily new limit)
6. **CSV parsing 太脆弱**: `split(',')` 無法處理含逗號的釋義/例句,沒處理 quote escape
7. **無資料版本管理**: 改字庫後 `srsData` 殘留舊單字資料、新單字沒索引
8. **無 import/export**: SRS 進度只在 localStorage,換裝置全沒了 (iPhone ↔ iPad 同步是必要的)
9. **無設定畫面**: 字級篩選、每日新卡量、TTS 語速/口音、深淺色手動切換,全沒有
10. **inline onclick 滿天飛**: 不利後續維護/拆檔/測試
11. **AI 教練 system prompt 混入「記憶口訣」**: 但 CSV 來源沒這欄位,直接拔掉這功能或重設計
12. **單檔 657 行已開始難維護**: 7000 字 + 多 level + MP3 + 設定畫面 + proxy 加進來會爆 2000 行

---

## 4. 結論

### **C) 重寫** (但偷骨架)

**理由**: 資料模型 (`{w,d,p,pos,ex,h}` ≠ `{word,pos,level}`)、規模 (50 → 7000)、載入策略 (內嵌 → lazy by level)、AI 教練架構 (直呼 API → 必須 proxy)、發音 fallback (無 → 必須有 MP3) —— 五個核心點全部不對。強行改現有檔會比重寫還累,因為 `VOCAB` 結構滲透到 SRS / wordlist / coach / card 各處。

**建議從現檔偷的東西** (不超過 100 行):
- `sm2()` 演算法 (15 行)
- CSS variables 配色 + dark mode (20 行)
- 翻卡 CSS (perspective / rotateY / backface-visibility) (10 行)
- rating button 4 級配色語意
- iOS hint 文案與顯示邏輯思路
- Service Worker cache-first 骨架 (路徑修掉)

**重寫架構建議** (口語層級,不展開):
- 拆檔: `index.html` / `app.js` / `srs.js` / `data.js` / `tts.js` / `coach.js` / `styles.css`
- 資料: 把 6 個 LxClean.csv 預跑 LLM 補齊 (中文/英英/例句/音標),產出 `data/level-{1..6}.json`,首屏只載 level 1,其他 on-demand
- TTS: `speechSynthesis` 為主,失敗或無 en-US voice 則 fallback `dictionaryapi.dev` 拿 mp3
- AI 教練: 若要保留,部署 Cloudflare Worker 當 proxy;若不想搞 backend,**直接砍掉這功能**省事
- 設定畫面: level 篩選 / 每日新卡量 / TTS 速度 / import-export JSON
- PWA 路徑全用相對路徑,確保 GH Pages 子路徑可用

**底線**: 現有 40KB 不算大資產,留戀沒意義。重寫 1-2 天可到比現在更穩的狀態。

