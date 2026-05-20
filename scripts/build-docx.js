// Build the two Word documents for the 親戚安裝包:
//   - 01-安裝說明.docx
//   - 02-使用手冊.docx
//
// Run with: node scripts/build-docx.js
const fs = require('fs');
const path = require('path');

const docxPath = path.join('C:\\npm-global\\node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber,
} = require(docxPath);

const CN = '微軟正黑體';
const MONO = 'Consolas';
const OUT_DIR = path.join('C:\\HansDB\\Vocab-SRS', 'Vocab-SRS-親戚安裝包');

// ---------- shared helpers ----------
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: CN, bold: true })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: CN, bold: true })],
});
const P = (runs) => new Paragraph({
  children: Array.isArray(runs) ? runs : [new TextRun({ text: String(runs), font: CN })],
  spacing: { after: 120 },
});
const T = (text, opts = {}) => new TextRun({ text, font: CN, ...opts });
const TB = (text) => new TextRun({ text, font: CN, bold: true });
const link = (text, url) => new ExternalHyperlink({
  children: [new TextRun({ text, font: CN, style: 'Hyperlink' })],
  link: url,
});
const BULLET = (text, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  children: Array.isArray(text) ? text : [new TextRun({ text: String(text), font: CN })],
  spacing: { after: 60 },
});
const NUM = (ref, text, level = 0) => new Paragraph({
  numbering: { reference: ref, level },
  children: Array.isArray(text) ? text : [new TextRun({ text: String(text), font: CN })],
  spacing: { after: 60 },
});
const CODE = (text) => text.split('\n').map((line, i, arr) => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
  spacing: { after: i === arr.length - 1 ? 120 : 0, line: 260 },
  children: [new TextRun({ text: line || ' ', font: MONO, size: 20 })],
}));
const IC = (text) => new TextRun({ text, font: MONO, size: 22, shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' } });

const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
const borders = { top: border, bottom: border, left: border, right: border };
function makeTable(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: 'DCE6F1' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: CN, bold: true })] })],
    })),
  });
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((c, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: c, font: CN })] })],
    })),
  }));
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}
const HR = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 6 } },
  spacing: { before: 120, after: 240 },
  children: [new TextRun({ text: '' })],
});
const TITLE = (text, sub) => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 240 },
    children: [new TextRun({ text, font: CN, bold: true, size: 56 })],
  }),
  ...(sub ? [new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    children: [new TextRun({ text: sub, font: CN, size: 24, italics: true })],
  })] : []),
];

// ========================================================================
// Document 1: 01-安裝說明.docx
// ========================================================================
function buildInstallDoc() {
  const c = [];
  c.push(...TITLE('Vocab-SRS 安裝說明', '給技術小白的逐步指南'));

  c.push(P([T('這份文件假設你'), TB('剛裝好 Windows,什麼都沒裝'),
    T(',跟著做完,你的家人就能在 iPhone / Android / iPad 上練 '),
    TB('6,255 字英文單字'), T(' (Level 1–6,每級約 1,000 字),跨裝置自動同步。')]));
  c.push(P([TB('全程不需要寫程式、不需要安裝 Git、Node.js、Python。'), T(' 只需要瀏覽器。')]));
  c.push(P([TB('字庫已經打包好'), T(' —— 6,255 字的英文單字、中文翻譯、字典定義、發音音檔網址,全部已經放在 '),
    IC('docs/data/L1.json'), T(' ~ '), IC('L6.json'),
    T(' (共約 4.3 MB),fork 過去就有,不用自己跑任何資料生成腳本。')]));
  c.push(P('完成後你會有:'));
  c.push(BULLET('一個你自己的 Firebase 雲端資料庫 (免費方案夠用)'));
  c.push(BULLET([T('一個 GitHub 網址 (例如 '), IC('https://你的帳號.github.io/vocab-srs/'), T(')')]));
  c.push(BULLET([T('一個分享給家人的家庭網址 (例如 '), IC('https://你的帳號.github.io/vocab-srs/#fam=abc123xy'), T(')')]));
  c.push(BULLET('家人手機桌面上的單字卡 App 圖示'));
  c.push(P([T('預計耗時:'), TB('30–45 分鐘')]));
  c.push(P([T('安裝完成後請打開 '), TB('「02-使用手冊」'), T(' 學怎麼用 App。')]));
  c.push(HR());

  // 1. 準備工作
  c.push(H1('1. 準備工作 (5 分鐘)'));
  c.push(H2('1.1 需要的帳號'));
  c.push(P('開兩個帳號,全部免費。如果你已經有,跳過。'));
  c.push(makeTable(['帳號', '網址', '用途'], [
    ['Google 帳號', 'https://accounts.google.com/signup', '之後拿來登入 Firebase'],
    ['GitHub 帳號', 'https://github.com/signup', '放網頁程式碼,免費架設網站'],
  ], [1800, 4200, 3026]));
  c.push(H2('1.2 需要的瀏覽器'));
  c.push(P([T('電腦上裝 '), TB('Google Chrome'), T(' 或 '), TB('Microsoft Edge'),
    T(' (Windows 內建就有 Edge,可直接用)。')]));
  c.push(P([TB('⚠️ 不要用 Internet Explorer。')]));
  c.push(P('不需要安裝任何程式 (不需要 Git、不需要 Python、不需要 Node.js)。'));
  c.push(HR());

  // 2. Fork
  c.push(H1('2. Fork 程式碼到你的 GitHub (3 分鐘)'));
  c.push(P([TB('「Fork」'), T(' = 把別人的程式碼複製一份到你的帳號下,之後你可以自由修改。')]));
  c.push(NUM('s2', [T('用瀏覽器開啟原始專案: '), link('https://github.com/freewilljr1221/vocab-srs', 'https://github.com/freewilljr1221/vocab-srs')]));
  c.push(NUM('s2', [TB('登入你的 GitHub 帳號'), T(' (右上角 Sign in)。')]));
  c.push(NUM('s2', [T('在專案頁面的'), TB('右上角'), T(',按綠色或灰色的 '), TB('「Fork」'), T(' 按鈕。')]));
  c.push(NUM('s2', '出現 "Create a new fork" 畫面:'));
  c.push(BULLET([TB('Owner'), T(':選你自己的帳號')], 1));
  c.push(BULLET([TB('Repository name'), T(':保留 '), IC('vocab-srs'), T(' 就好')], 1));
  c.push(BULLET('其他不用動', 1));
  c.push(NUM('s2', [T('按下方綠色 '), TB('「Create fork」'), T(' 按鈕。')]));
  c.push(NUM('s2', [T('等 5–10 秒,網頁跳到 '), IC('https://github.com/你的帳號/vocab-srs'), T(',左上角會出現「forked from freewilljr1221/vocab-srs」字樣,表示完成。')]));
  c.push(P([TB('現在這份程式碼是你的了。'), T(' 之後所有修改都在你的 fork 上做,原作者看不到。')]));
  c.push(HR());

  // 3. Firebase
  c.push(H1('3. 建立 Firebase 專案 (10 分鐘)'));
  c.push(P('Firebase 是 Google 提供的免費後端服務,這裡只用「Firestore 資料庫」這一塊,免費額度遠遠用不完。'));
  c.push(H2('3.1 建立專案'));
  c.push(NUM('s31', [T('用瀏覽器開 '), link('https://console.firebase.google.com/', 'https://console.firebase.google.com/')]));
  c.push(NUM('s31', [T('用你的 '), TB('Google 帳號'), T(' 登入。')]));
  c.push(NUM('s31', [T('點 '), TB('「新增專案 (Add project)」'), T(' 大方框。')]));
  c.push(NUM('s31', [TB('專案名稱'), T(':輸入 '), IC('vocab-srs'), T('。下面會自動顯示一個 Project ID,例如 '), IC('vocab-srs-abc12'), T(',記下這個 ID。')]));
  c.push(NUM('s31', [T('按 '), TB('「繼續」'), T('。')]));
  c.push(NUM('s31', [TB('Google Analytics'), T(':'), TB('選「不啟用 (Disable)」'), T('。按 '), TB('「建立專案」'), T('。')]));
  c.push(NUM('s31', '等 20–30 秒,按「繼續」進入專案首頁。'));
  c.push(H2('3.2 啟用 Firestore 資料庫'));
  c.push(NUM('s32', [T('左側選單找 '), TB('「建構 (Build)」 → 「Firestore Database」'), T('。')]));
  c.push(NUM('s32', [T('中間按 '), TB('「建立資料庫 (Create database)」'), T('。')]));
  c.push(NUM('s32', [TB('位置 (Location)'), T(':選 '), IC('asia-east1 (台灣)'), T(' 或 '), IC('asia-northeast1 (東京)'), T('。'), TB('選了就不能改'), T('。')]));
  c.push(NUM('s32', [TB('安全規則模式'), T(':選 '), TB('「以正式版模式啟動 (Start in production mode)」'), T('。按 '), TB('「啟用」'), T('。')]));
  c.push(NUM('s32', '等 30 秒,資料庫建立完成。'));
  c.push(H2('3.3 註冊 Web 應用,拿到設定金鑰'));
  c.push(NUM('s33', '回到專案首頁。'));
  c.push(NUM('s33', [T('找到 '), TB('</> 圖示 (網頁應用)'), T(',點一下。')]));
  c.push(NUM('s33', [TB('應用程式暱稱'), T(':輸入 '), IC('vocab-srs-web'), T(','), TB('不要勾'), T(' Firebase Hosting。')]));
  c.push(NUM('s33', [T('按 '), TB('「註冊應用程式」'), T('。')]));
  c.push(NUM('s33', '畫面會顯示一段程式碼,把這段複製到記事本:'));
  c.push(...CODE(
`const firebaseConfig = {
  apiKey: "AIzaSy...一串很長的字...",
  authDomain: "vocab-srs-abc12.firebaseapp.com",
  projectId: "vocab-srs-abc12",
  storageBucket: "vocab-srs-abc12.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef..."
};`));
  c.push(NUM('s33', '按「繼續前往主控台」。'));
  c.push(HR());

  // 4. Rules
  c.push(H1('4. 部署 Firestore 安全規則 (5 分鐘)'));
  c.push(P('「安全規則」決定誰能讀寫你的資料庫。'));
  c.push(P([TB('有兩種方法,挑一種:')]));
  c.push(H2('方法 A:網頁貼上 (推薦,給技術小白)'));
  c.push(NUM('s4a', [T('用瀏覽器開: '), IC('https://github.com/你的帳號/vocab-srs/blob/main/docs/firestore.rules')]));
  c.push(NUM('s4a', [T('點右上角 '), TB('「Copy raw file」'), T(' 按鈕,複製整個檔案內容。')]));
  c.push(NUM('s4a', [T('回到 Firebase Console,'), TB('「Firestore Database」 → 上方分頁 「規則」'), T('。')]));
  c.push(NUM('s4a', [TB('刪掉'), T('編輯框裡所有現有內容,'), TB('貼上'), T('你剛複製的。')]));
  c.push(NUM('s4a', [T('按右上角藍色 '), TB('「發佈 (Publish)」'), T(' 按鈕。')]));
  c.push(H2('方法 B:用 Firebase CLI'));
  c.push(NUM('s4b', [TB('安裝 Node.js'), T(':到 '), link('https://nodejs.org/', 'https://nodejs.org/'), T(' 下載 LTS .msi,雙擊安裝。')]));
  c.push(NUM('s4b', [TB('開 PowerShell'), T(' (Windows 鍵 → 輸入 powershell)。')]));
  c.push(NUM('s4b', '輸入指令:'));
  c.push(...CODE('npm install -g firebase-tools'));
  c.push(NUM('s4b', '登入 Firebase:'));
  c.push(...CODE('firebase login'));
  c.push(NUM('s4b', '下載你 fork 的程式碼 (GitHub Code 按鈕 → Download ZIP → 解壓縮)。'));
  c.push(NUM('s4b', '切換到解壓縮的資料夾:'));
  c.push(...CODE('cd C:\\Users\\你的名字\\Downloads\\vocab-srs-main'));
  c.push(NUM('s4b', '部署規則:'));
  c.push(...CODE('firebase deploy --only firestore:rules --project=你的-project-id'));
  c.push(HR());

  // 5. 填設定
  c.push(H1('5. 把 Firebase 設定填進程式碼 (5 分鐘)'));
  c.push(P([T('把第 3.3 步複製的 '), IC('firebaseConfig'), T(' 區塊,貼到 '), IC('docs/index.html'), T('。')]));
  c.push(NUM('s5', [T('開: '), IC('https://github.com/你的帳號/vocab-srs/blob/main/docs/index.html')]));
  c.push(NUM('s5', [T('右上角 '), TB('鉛筆圖示'), T(' 進入編輯。')]));
  c.push(NUM('s5', [TB('Ctrl + F'), T(' 搜尋 '), IC('firebaseConfig'), T('。')]));
  c.push(NUM('s5', '找到這一段 (第 23–31 行):'));
  c.push(...CODE(
`const firebaseConfig = {
  apiKey: "AIzaSyAj5KpFN6V6yw7f8jByi_W7orPJbfSNeqk",
  authDomain: "vocab-srs-cae44.firebaseapp.com",
  projectId: "vocab-srs-cae44",
  storageBucket: "vocab-srs-cae44.firebasestorage.app",
  messagingSenderId: "470854073556",
  appId: "1:470854073556:web:5d6d1a26b8a8f1c1f4ac2e",
  measurementId: "G-3FYWRGGEN8"
};`));
  c.push(NUM('s5', [TB('整段刪掉'), T(' (共 9 行),'), TB('貼上'), T('你自己的設定。')]));
  c.push(NUM('s5', [T('往下捲,按 '), TB('「Commit changes...」'), T(' 綠色按鈕。')]));
  c.push(P([TB('⚠️ '), T('apiKey '), TB('不是密碼'), T(',被別人看到沒關係。下一步才是真正的安全控制。')]));
  c.push(HR());

  // 6. API Key
  c.push(H1('6. 鎖定 API Key (重要!3 分鐘)'));
  c.push(P('避免別人用你的 apiKey 在他們的網站亂打 Firebase 害你超過免費額度。'));
  c.push(NUM('s6', [T('開 '), link('https://console.cloud.google.com/apis/credentials', 'https://console.cloud.google.com/apis/credentials')]));
  c.push(NUM('s6', [T('上方確認專案是你剛建的 '), IC('vocab-srs-abc12'), T('。')]));
  c.push(NUM('s6', [T('找 '), IC('Browser key (auto created by Firebase)'), T(',點名字進去。')]));
  c.push(NUM('s6', [TB('「應用程式限制」'), T(':')]));
  c.push(BULLET([T('選 '), TB('「HTTP referrers (網站)」')], 1));
  c.push(BULLET([T('新增 (ADD AN ITEM):')], 1));
  c.push(...CODE('https://你的帳號.github.io/*'));
  c.push(BULLET([T('再新增: '), IC('localhost/*')], 1));
  c.push(NUM('s6', [TB('「API 限制」'), T(':選「限制金鑰」,勾 '), TB('Cloud Firestore API'), T('。')]));
  c.push(NUM('s6', [T('按 '), TB('「儲存」'), T('。')]));
  c.push(HR());

  // 7. Pages
  c.push(H1('7. 開啟 GitHub Pages (2 分鐘)'));
  c.push(NUM('s7', [T('開你的 fork: '), IC('https://github.com/你的帳號/vocab-srs')]));
  c.push(NUM('s7', [TB('Settings'), T(' → 左側 '), TB('Pages'), T('。')]));
  c.push(NUM('s7', [TB('Source'), T(':選 '), IC('Deploy from a branch'), T('。')]));
  c.push(NUM('s7', [TB('Branch'), T(':左下拉 '), IC('main'), T(',右下拉 '), IC('/docs'), T('。')]));
  c.push(NUM('s7', [T('按 '), TB('「Save」'), T('。')]));
  c.push(NUM('s7', '等 1–3 分鐘,綠色框會顯示你的網址:'));
  c.push(...CODE('✓ Your site is live at https://你的帳號.github.io/vocab-srs/'));
  c.push(P([T('如果一直 '), IC('Building...'), T(',再等一下,最多 5 分鐘。')]));
  c.push(HR());

  // 8. 手機安裝
  c.push(H1('8. 手機安裝 App + 分享家庭網址'));
  c.push(H2('8.1 你自己先開一次,產生家庭代碼'));
  c.push(NUM('s81', [T('用'), TB('手機'), T('開 '), IC('https://你的帳號.github.io/vocab-srs/')]));
  c.push(NUM('s81', '網址會自動加上家庭代碼:'));
  c.push(...CODE('https://你的帳號.github.io/vocab-srs/#fam=abcd1234'));
  c.push(NUM('s81', [T('右上角 '), TB('👤 → 設定'), T(',改家庭名稱、新增使用者。')]));
  c.push(NUM('s81', [T('第一個使用者新增時會要你設 '), TB('4–8 位 PIN'), T('。'), TB('記好這個 PIN'), T('。')]));
  c.push(H2('8.2 分享給家人'));
  c.push(P([T('用 LINE 把'), TB('含 #fam= 的完整網址'), T('傳給家人。')]));
  c.push(P([TB('⚠️ 不要傳沒 #fam= 的網址'), T(',會讓對方建新家庭。')]));
  c.push(H2('8.3 家人手機安裝'));
  c.push(P([TB('iPhone / iPad:')]));
  c.push(NUM('s83a', [T('用 '), TB('Safari'), T(' (不能用 Chrome) 開 '), IC('#fam='), T(' 網址。')]));
  c.push(NUM('s83a', '下方分享圖示 ⬆ → 「加入主畫面」。'));
  c.push(NUM('s83a', '按右上角「新增」。'));
  c.push(P([TB('Android:')]));
  c.push(NUM('s83b', [T('用 '), TB('Chrome'), T(' 開 '), IC('#fam='), T(' 網址。')]));
  c.push(NUM('s83b', '右上角 ⋮ → 「安裝應用程式」。'));
  c.push(HR());

  // 完成
  c.push(H1('安裝完成!'));
  c.push(P([T('接下來請打開 '), TB('「02-使用手冊」'), T(' 學怎麼操作 App、SRS 三個按鈕怎麼用、忘記 PIN 怎麼辦。')]));
  c.push(P('如果哪一步卡住,把錯誤訊息或畫面截圖傳給原作者。'));
  c.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480 },
    children: [new TextRun({ text: '— 維護者:freewilljr1221 —', font: CN, italics: true, color: '666666' })],
  }));
  return c;
}

// ========================================================================
// Document 2: 02-使用手冊.docx
// ========================================================================
function buildUsageDoc() {
  const c = [];
  c.push(...TITLE('Vocab-SRS 使用手冊', 'App 操作說明 & 疑難排解'));

  c.push(P([T('還沒裝好?請先看 '), TB('「01-安裝說明」'), T(' 完成安裝。')]));
  c.push(P('這份文件教你裝好之後,怎麼操作這個單字卡 App、怎麼幫家人練、卡住時怎麼辦。'));
  c.push(HR());

  // 1. 切換使用者
  c.push(H1('1. 切換使用者'));
  c.push(P([T('右上角 '), TB('👤 圖示'), T(' → 點頭像選使用者。每個使用者的進度、SRS 排程獨立。')]));
  c.push(P('每個使用者可以自選顏色 (藍、綠、黃、粉、紅、橘),右上角的小頭像會用對應的顏色標示。'));

  // 2. 選等級
  c.push(H1('2. 選等級'));
  c.push(P([T('右上角 '), TB('Level 下拉選單'), T(',從 '), TB('Level 1 (最簡單) 到 Level 6'), T('。')]));
  c.push(makeTable(['Level', '字數', '難度'], [
    ['Level 1', '1,018', '國小 / 基礎'],
    ['Level 2', '1,030', '國中'],
    ['Level 3', '1,053', '國中進階'],
    ['Level 4', '1,047', '高中'],
    ['Level 5', '1,055', '高中進階'],
    ['Level 6', '1,052', '大學 / 全民英檢中高級'],
    ['合計',    '6,255', ''],
  ], [2000, 2000, 5026]));
  c.push(P('字庫已內建在程式碼裡,不用自己準備。每張卡含:英文單字、中文翻譯、英文字典定義、發音音檔 (點喇叭可聽)。'));

  // 3. SRS 三個按鈕
  c.push(H1('3. 練習卡片 (SRS 三個按鈕)'));
  c.push(P([T('中間是英文單字,'), TB('按一下卡片翻到中文翻譯'), T('。下方三個按鈕:')]));
  c.push(makeTable(['按鈕', '意思', 'SRS 行為'], [
    ['❌ 忘記',   '不會',         '隔天再考'],
    ['😐 普通',   '想了一下才會', '隔幾天再考'],
    ['✅ 熟悉',   '秒答',         '拉長間隔,1 週、2 週、1 個月...'],
  ], [1800, 2800, 4426]));
  c.push(P([TB('SRS = Spaced Repetition System (間隔重複系統)'), T(',依據你的反應自動排下次複習日期。')]));
  c.push(BULLET('按「忘記」的字隔天會再出現'));
  c.push(BULLET('按「熟悉」的字會慢慢拉長到 1 週、2 週、1 個月後才再考'));
  c.push(BULLET('系統用的是經典的 SM-2 演算法,跟 Anki 同源'));
  c.push(P([TB('建議用法'), T(':每天打開 App,先看「📊 今日要複習 N 張」,把這 N 張練完當天就結束。剛開始 N 會比較多,練 1–2 週後會穩定在每天 30–80 張左右。')]));

  // 4. 查看紀錄
  c.push(H1('4. 查看練習紀錄'));
  c.push(P([T('右上角 '), TB('📊 圖示'), T(' → 看每日練習數量、總熟悉字數。')]));
  c.push(P('可以看到:'));
  c.push(BULLET('今天練了幾張'));
  c.push(BULLET('連續練習天數'));
  c.push(BULLET('每個 Level 的進度 (已熟悉 / 總卡片數)'));

  // 5. 加/改使用者
  c.push(H1('5. 加 / 改使用者'));
  c.push(P([T('右上角 '), TB('👤 → 設定'), T(':')]));
  c.push(BULLET([TB('➕ 新增使用者'), T(' (要 PIN)')]));
  c.push(BULLET([TB('✏️ 改名'), T(' (要 PIN)')]));
  c.push(BULLET([TB('🎨 改顏色'), T(' (要 PIN)')]));
  c.push(BULLET([TB('🗑 刪除'), T(' (要 PIN,'), TB('會刪光該使用者所有紀錄,無法復原'), T(')')]));
  c.push(P([T('PIN 是 4–8 位數字,'), TB('設定一次後全家庭共用'), T('。在任何裝置上要管理使用者都要打 PIN。同一裝置上打過一次 PIN 之後,下次不會再問。')]));

  // 6. 切換家庭
  c.push(H1('6. 切換家庭 (很少用到)'));
  c.push(P([T('右上角 '), TB('👤 → 設定 → 切換家庭'), T('。')]));
  c.push(P('如果你同時管理多個家庭 (例如自己家 + 表妹家),可以在這裡切換。一般用戶不會用到。'));
  c.push(P([T('切換到別的家庭後,'), TB('會要求重新輸入該家庭的 PIN'), T(' 才能管理那邊的使用者。')]));

  // 7. 跨裝置同步
  c.push(H1('7. 跨裝置同步'));
  c.push(P([T('只要不同裝置開的是'), TB('同一個 #fam=xxxxxxxx 網址'), T(',資料自動同步:')]));
  c.push(BULLET('爸爸手機加了使用者 → 媽媽手機自動看到'));
  c.push(BULLET('小孩在 iPad 練了 20 個字 → 在 iPhone 也看到一樣的紀錄'));
  c.push(BULLET('改了使用者顏色、名字 → 全家裝置 1 秒內更新'));
  c.push(P('同步是雲端即時推送的 (用 Firebase Firestore),延遲約 1 秒。網路斷掉也能離線練,等網路恢復會自動 push 上去。'));
  c.push(P([TB('⚠️ '), T('如果 PWA (桌面圖示) 打開後家庭代碼不一樣,代表那台裝置裝錯了。要從含 '), IC('#fam='), T(' 的網址重新裝一次。')]));

  // 8. 疑難排解
  c.push(H1('8. 疑難排解 Q & A'));

  c.push(H2('Q: 網址打開全白 / 一直轉圈'));
  c.push(BULLET([T('確認安裝第 5 步的 '), IC('firebaseConfig'), T(' '), TB('整段都換對了'), T('。')]));
  c.push(BULLET('確認 Firestore 已建立 (安裝第 3.2 步)。'));
  c.push(BULLET('用桌機 Chrome 開網址 → 按 F12 → 看 Console 紅字。'));

  c.push(H2('Q: 加使用者沒反應 / 點下去沒動'));
  c.push(BULLET('重新整理頁面 (iPhone Safari 是下拉刷新;PWA 圖示要關掉重開)。'));
  c.push(BULLET('確認 Firestore Rules 已部署 (安裝第 4 步)。'));

  c.push(H2('Q: 兩支手機看到的使用者不一樣'));
  c.push(BULLET([T('確認'), TB('兩支都用 #fam=xxxxxxxx 同一個網址'), T('。')]));
  c.push(BULLET('PWA 圖示裡看不到網址,可以從 👤 → 設定 → 家庭區塊看代碼。'));

  c.push(H2('Q: 忘記 PIN'));
  c.push(P('目前沒有忘記 PIN 重設功能。如果真的忘了:'));
  c.push(NUM('qpin', 'Firebase Console → Firestore Database'));
  c.push(NUM('qpin', [T('找到 '), IC('families/你的家庭代碼/state/main'), T(' 文件')]));
  c.push(NUM('qpin', [T('把 '), IC('pinHash'), T(' 欄位改成空字串 '), IC('""')]));
  c.push(NUM('qpin', '回到 App 就可以重新設 PIN'));

  c.push(H2('Q: 我想改程式 / 修 bug'));
  c.push(BULLET([T('在 GitHub 網頁直接改 '), IC('docs/index.html'), T(' → Commit → 等 1 分鐘自動部署。')]));
  c.push(BULLET([T('改了結構記得把 '), IC('docs/sw.js'), T(' 裡 '), IC('CACHE_VERSION'), T(' 加號,不然瀏覽器吃舊版快取。')]));

  c.push(H2('Q: Firebase 會收錢嗎?'));
  c.push(P('家庭使用量遠在免費額度 (Spark Plan) 內:'));
  c.push(BULLET('每日 50,000 次讀取 (一輩子用不完)'));
  c.push(BULLET('每日 20,000 次寫入'));
  c.push(BULLET('1 GB 儲存空間'));
  c.push(P('要超過很難,可以放心。'));

  c.push(H2('Q: 手機上音檔不會發聲'));
  c.push(BULLET('點英文單字旁邊的喇叭圖示。'));
  c.push(BULLET('iOS 第一次點要先解除靜音模式 (側邊小撥桿)。'));
  c.push(BULLET('音檔從免費字典 API 抓 mp3,網路太慢可能要等 1–2 秒。'));

  c.push(H2('Q: 想把某個字從牌組移除 (已經學會了)'));
  c.push(P('目前 App 沒有「踢出牌組」按鈕。你可以連按「✅ 熟悉」幾次,SRS 會把間隔拉到很長 (幾個月後才再考),實際上等於不會再看到。'));

  c.push(HR());
  c.push(P('如果還有問題,把錯誤訊息或畫面截圖傳給原作者。'));
  c.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480 },
    children: [new TextRun({ text: '— 維護者:freewilljr1221 —', font: CN, italics: true, color: '666666' })],
  }));
  return c;
}

// ---------- doc-level config (shared) ----------
function makeDoc(children, title) {
  return new Document({
    creator: 'Claude',
    title,
    styles: {
      default: { document: { run: { font: CN, size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: CN, color: '1F3864' },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: CN, color: '2E75B6' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      ],
    },
    numbering: {
      config: [
        { reference: 'bullets', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
        ]},
        ...['s2','s31','s32','s33','s4a','s4b','s5','s6','s7','s81','s83a','s83b','qpin'].map(ref => ({
          reference: ref, levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          ],
        })),
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: title, font: CN, size: 18, color: '888888' })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '第 ', font: CN, size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: CN, size: 18, color: '888888' }),
            new TextRun({ text: ' 頁', font: CN, size: 18, color: '888888' }),
          ],
        })] }),
      },
      children,
    }],
  });
}

async function main() {
  const installDoc = makeDoc(buildInstallDoc(), 'Vocab-SRS 安裝說明');
  const usageDoc   = makeDoc(buildUsageDoc(),   'Vocab-SRS 使用手冊');

  const installBuf = await Packer.toBuffer(installDoc);
  const usageBuf   = await Packer.toBuffer(usageDoc);

  const out1 = path.join(OUT_DIR, '01-安裝說明.docx');
  const out2 = path.join(OUT_DIR, '02-使用手冊.docx');
  fs.writeFileSync(out1, installBuf);
  fs.writeFileSync(out2, usageBuf);
  console.log('Wrote', out1, '(' + installBuf.length + ' bytes)');
  console.log('Wrote', out2, '(' + usageBuf.length + ' bytes)');
}
main();
