// Build Vocab-SRS-安裝與使用說明.docx from INSTALL.md structure.
// Run with: node scripts/build-docx.js
const fs = require('fs');
const path = require('path');

// Use the globally installed docx package
const docxPath = path.join('C:\\npm-global\\node_modules', 'docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  ExternalHyperlink, TabStopType, TabStopPosition,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
} = require(docxPath);

const CN = '微軟正黑體';
const MONO = 'Consolas';

// ---------- helpers ----------
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: CN, bold: true })],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: CN, bold: true })],
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, font: CN, bold: true })],
});

// Body paragraph supporting inline TextRun array
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

// Bullet list
const BULLET = (text, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  children: Array.isArray(text) ? text : [new TextRun({ text: String(text), font: CN })],
  spacing: { after: 60 },
});
// Numbered list (each call to NUM(ref) under same ref continues)
const NUM = (ref, text, level = 0) => new Paragraph({
  numbering: { reference: ref, level },
  children: Array.isArray(text) ? text : [new TextRun({ text: String(text), font: CN })],
  spacing: { after: 60 },
});

// Code block: monospace + gray shading via paragraph shading
const CODE = (text) => {
  const lines = text.split('\n');
  return lines.map((line, i) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
    spacing: { after: i === lines.length - 1 ? 120 : 0, line: 260 },
    children: [new TextRun({ text: line || ' ', font: MONO, size: 20 })],
  }));
};

// Inline code (in paragraph)
const IC = (text) => new TextRun({ text, font: MONO, size: 22, shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' } });

// Table: header row + body rows. cells = array of arrays of strings.
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

// ---------- content ----------
const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 240 },
  children: [new TextRun({ text: 'Vocab-SRS 安裝與使用說明', font: CN, bold: true, size: 56 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({ text: '單字卡 SRS · 給家庭用的雲端同步單字卡 App', font: CN, size: 24 })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 480 },
  children: [new TextRun({ text: '完整安裝指南 (給技術小白)', font: CN, size: 24, italics: true })],
}));

// Intro
children.push(P([
  T('這份文件假設你'), TB('剛裝好 Windows,什麼都沒裝'),
  T(',跟著做完,你的家人就能在 iPhone / Android / iPad 上練 7000 字英文單字,跨裝置自動同步。'),
]));
children.push(P([TB('全程不需要寫程式、不需要安裝 Git、Node.js、Python。'), T(' 只需要瀏覽器。')]));
children.push(P('完成後你會有:'));
children.push(BULLET('一個你自己的 Firebase 雲端資料庫 (免費方案夠用)'));
children.push(BULLET([T('一個 GitHub 網址 (例如 '), IC('https://你的帳號.github.io/vocab-srs/'), T(')')]));
children.push(BULLET([T('一個分享給家人的家庭網址 (例如 '), IC('https://你的帳號.github.io/vocab-srs/#fam=abc123xy'), T(')')]));
children.push(BULLET('家人手機桌面上的單字卡 App 圖示'));
children.push(P([T('預計耗時:'), TB('30–45 分鐘')]));
children.push(HR());

// ===== 1. 準備工作 =====
children.push(H1('1. 準備工作 (5 分鐘)'));

children.push(H2('1.1 需要的帳號'));
children.push(P('開兩個帳號,全部免費。如果你已經有,跳過。'));
children.push(makeTable(
  ['帳號', '網址', '用途'],
  [
    ['Google 帳號', 'https://accounts.google.com/signup', '之後拿來登入 Firebase'],
    ['GitHub 帳號', 'https://github.com/signup', '放網頁程式碼,免費架設網站'],
  ],
  [1800, 4200, 3360]
));

children.push(H2('1.2 需要的瀏覽器'));
children.push(P([
  T('電腦上裝 '), TB('Google Chrome'), T(' 或 '), TB('Microsoft Edge'),
  T(' (Windows 內建就有 Edge,可直接用)。'),
]));
children.push(P([TB('⚠️ 不要用 Internet Explorer。')]));
children.push(P('不需要安裝任何程式 (不需要 Git、不需要 Python、不需要 Node.js)。'));
children.push(HR());

// ===== 2. Fork =====
children.push(H1('2. Fork 程式碼到你的 GitHub (3 分鐘)'));
children.push(P([TB('「Fork」'), T(' = 把別人的程式碼複製一份到你的帳號下,之後你可以自由修改。')]));
children.push(NUM('s2', [T('用瀏覽器開啟原始專案: '), link('https://github.com/freewilljr1221/vocab-srs', 'https://github.com/freewilljr1221/vocab-srs')]));
children.push(NUM('s2', [TB('登入你的 GitHub 帳號'), T(' (右上角 Sign in)。')]));
children.push(NUM('s2', [T('在專案頁面的'), TB('右上角'), T(',按綠色或灰色的 '), TB('「Fork」'), T(' 按鈕。')]));
children.push(NUM('s2', '出現 "Create a new fork" 畫面:'));
children.push(BULLET([TB('Owner'), T(':選你自己的帳號')], 1));
children.push(BULLET([TB('Repository name'), T(':保留 '), IC('vocab-srs'), T(' 就好')], 1));
children.push(BULLET('其他不用動', 1));
children.push(NUM('s2', [T('按下方綠色 '), TB('「Create fork」'), T(' 按鈕。')]));
children.push(NUM('s2', [T('等 5–10 秒,網頁跳到 '), IC('https://github.com/你的帳號/vocab-srs'), T(',左上角會出現「forked from freewilljr1221/vocab-srs」字樣,表示完成。')]));
children.push(P([TB('現在這份程式碼是你的了。'), T(' 之後所有修改都在你的 fork 上做,原作者看不到。')]));
children.push(HR());

// ===== 3. Firebase =====
children.push(H1('3. 建立 Firebase 專案 (10 分鐘)'));
children.push(P('Firebase 是 Google 提供的免費後端服務,這裡只用「Firestore 資料庫」這一塊,免費額度遠遠用不完 (家庭用一輩子都不會超)。'));

children.push(H2('3.1 建立專案'));
children.push(NUM('s31', [T('用瀏覽器開 '), link('https://console.firebase.google.com/', 'https://console.firebase.google.com/')]));
children.push(NUM('s31', [T('用你的 '), TB('Google 帳號'), T(' 登入。')]));
children.push(NUM('s31', [T('點 '), TB('「新增專案 (Add project)」'), T(' 大方框。')]));
children.push(NUM('s31', [TB('專案名稱'), T(':輸入 '), IC('vocab-srs'), T('。下面會自動顯示一個 Project ID,例如 '), IC('vocab-srs-abc12'), T(',記下這個 ID (後面會用到)。')]));
children.push(NUM('s31', [T('按 '), TB('「繼續」'), T('。')]));
children.push(NUM('s31', [TB('Google Analytics'), T(':問你要不要啟用,'), TB('選「不啟用 (Disable)」'), T(',不需要。按 '), TB('「建立專案」'), T('。')]));
children.push(NUM('s31', [T('等 20–30 秒,按 '), TB('「繼續」'), T(' 進入專案首頁。')]));

children.push(H2('3.2 啟用 Firestore 資料庫'));
children.push(NUM('s32', [T('左側選單找 '), TB('「建構 (Build)」 → 「Firestore Database」'), T('。')]));
children.push(NUM('s32', [T('中間按 '), TB('「建立資料庫 (Create database)」'), T('。')]));
children.push(NUM('s32', [TB('位置 (Location)'), T(':選離你最近的,例如 '), IC('asia-east1 (台灣)'), T(' 或 '), IC('asia-northeast1 (東京)'), T('。'), TB('選了就不能改'), T('。')]));
children.push(NUM('s32', [TB('安全規則模式'), T(':選 '), TB('「以正式版模式啟動 (Start in production mode)」'), T(' (不要選測試模式,會有 30 天到期)。按 '), TB('「啟用」'), T('。')]));
children.push(NUM('s32', '等 30 秒,資料庫建立完成。'));

children.push(H2('3.3 註冊一個 Web 應用,拿到設定金鑰'));
children.push(NUM('s33', '回到專案首頁 (左上角點專案名稱)。'));
children.push(NUM('s33', [T('中間有一排圖示「快速開始」,'), TB('找到 </> 圖示 (網頁應用)'), T(',點一下。')]));
children.push(NUM('s33', [TB('應用程式暱稱 (App nickname)'), T(':輸入 '), IC('vocab-srs-web'), T(','), TB('不要勾'), T('「Firebase Hosting」。')]));
children.push(NUM('s33', [T('按 '), TB('「註冊應用程式」'), T('。')]));
children.push(NUM('s33', [T('下一個畫面會顯示一段程式碼,'), TB('最重要的就是這一段'), T(':')]));
children.push(...CODE(
`const firebaseConfig = {
  apiKey: "AIzaSy...一串很長的字...",
  authDomain: "vocab-srs-abc12.firebaseapp.com",
  projectId: "vocab-srs-abc12",
  storageBucket: "vocab-srs-abc12.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef..."
};`));
children.push(P([TB('把這整段複製起來,貼到 Windows 內建的記事本暫存。'), T(' 等下要用。')]));
children.push(NUM('s33', [T('按 '), TB('「繼續前往主控台」'), T('。')]));
children.push(HR());

// ===== 4. Rules =====
children.push(H1('4. 部署 Firestore 安全規則 (5 分鐘)'));
children.push(P('「安全規則」決定誰能讀寫你的資料庫。這份規則限制:只有知道家庭 PIN 的人能改使用者列表,每個家庭資料互相隔離。'));
children.push(P([TB('有兩種方法,挑一種:')]));

children.push(H2('方法 A:網頁貼上 (推薦,給技術小白)'));
children.push(NUM('s4a', [T('用瀏覽器開你 fork 的程式碼裡的這個檔案:'), IC('https://github.com/你的帳號/vocab-srs/blob/main/docs/firestore.rules')]));
children.push(NUM('s4a', [T('點右上角 '), TB('「Copy raw file」'), T(' 按鈕 (看起來像兩個方框疊在一起的圖示),複製整個檔案內容。')]));
children.push(NUM('s4a', [T('回到 Firebase Console,左側選單 '), TB('「Firestore Database」 → 上方分頁 「規則 (Rules)」'), T('。')]));
children.push(NUM('s4a', [TB('刪掉'), T('編輯框裡所有現有內容。')]));
children.push(NUM('s4a', [TB('貼上'), T('你剛複製的內容。')]));
children.push(NUM('s4a', [T('按右上角藍色 '), TB('「發佈 (Publish)」'), T(' 按鈕。')]));
children.push(NUM('s4a', '等 5 秒,看到 "Rules published" 訊息就完成。'));

children.push(H2('方法 B:用 Firebase CLI (給比較有經驗的人)'));
children.push(P('如果你之後常會改規則,可以裝 Firebase CLI 比較方便。'));
children.push(NUM('s4b', [TB('安裝 Node.js'), T(':到 '), link('https://nodejs.org/', 'https://nodejs.org/'), T(' 下載 LTS 版本 (左邊那個綠色按鈕),下載 .msi 檔,雙擊一路按 Next 安裝完。')]));
children.push(NUM('s4b', [TB('開啟 PowerShell'), T(' (按 Windows 鍵 → 輸入 '), IC('powershell'), T(' → Enter)。')]));
children.push(NUM('s4b', '輸入指令安裝 Firebase CLI:'));
children.push(...CODE('npm install -g firebase-tools'));
children.push(P('等 1–2 分鐘。'));
children.push(NUM('s4b', '登入 Firebase:'));
children.push(...CODE('firebase login'));
children.push(P('會跳出瀏覽器,用你的 Google 帳號登入。'));
children.push(NUM('s4b', '下載你 fork 的程式碼到電腦 (GitHub 網頁右上角綠色 Code 按鈕 → Download ZIP → 解壓縮)。'));
children.push(NUM('s4b', 'PowerShell 切換到解壓縮的資料夾,例如:'));
children.push(...CODE('cd C:\\Users\\你的名字\\Downloads\\vocab-srs-main'));
children.push(NUM('s4b', '部署規則:'));
children.push(...CODE('firebase deploy --only firestore:rules --project=你的-project-id'));
children.push(P([T('(Project ID 在 Firebase Console 專案首頁 → 齒輪 → 專案設定,例如 '), IC('vocab-srs-abc12'), T(')')]));
children.push(HR());

// ===== 5. 填入設定 =====
children.push(H1('5. 把 Firebase 設定填進程式碼 (5 分鐘)'));
children.push(P([T('把第 3.3 步複製到記事本的 '), IC('firebaseConfig'), T(' 區塊,貼到 '), IC('docs/index.html'), T('。')]));

children.push(H2('5.1 在 GitHub 網頁直接編輯 (不用下載)'));
children.push(NUM('s5', '用瀏覽器開:'));
children.push(P([IC('https://github.com/你的帳號/vocab-srs/blob/main/docs/index.html')]));
children.push(NUM('s5', [T('右上角有個鉛筆圖示 '), TB('「Edit this file」'), T(',點下去。')]));
children.push(NUM('s5', [TB('按 Ctrl + F'), T(' 在檔案內搜尋 '), IC('firebaseConfig'), T('。')]));
children.push(NUM('s5', '找到這一段 (大約在檔案最上面,第 23–31 行):'));
children.push(...CODE(
`const firebaseConfig = {
  apiKey: "AIzaSyAj5KpFN6V6yw7f8jByi_W7orPJbfSNeqk",
  authDomain: "vocab-srs-cae44.firebaseapp.com",
  projectId: "vocab-srs-cae44",
  storageBucket: "vocab-srs-cae44.firebasestorage.app",
  messagingSenderId: "470854073556",
  appId: "1:470854073556:web:5d6d1a26b8a8f1c1f4ac2e",
  measurementId: "G-3FYWRGGEN8"
};`));
children.push(NUM('s5', [TB('整段刪掉'), T(' (從 '), IC('const firebaseConfig = {'), T(' 到 '), IC('};'), T(' 共 9 行)。')]));
children.push(NUM('s5', [TB('貼上'), T('你在第 3.3 步複製的那段 (你自己的 Firebase 設定)。')]));
children.push(NUM('s5', [T('往下捲,找到綠色按鈕 '), TB('「Commit changes...」'), T(',點下去。')]));
children.push(NUM('s5', [T('跳出對話框,'), TB('Commit message'), T(' 隨便輸入例如「填入我的 Firebase 設定」,按 '), TB('「Commit changes」'), T('。')]));
children.push(P('完成。'));
children.push(P([TB('⚠️ 重要:'), T(' apiKey '), TB('不是密碼'), T(',被別人看到沒關係,這是 Firebase 設計上就會公開。下一步 (第 6 步) 才是真正的安全控制。')]));
children.push(HR());

// ===== 6. 鎖 API key =====
children.push(H1('6. 鎖定 API Key (重要!3 分鐘)'));
children.push(P('雖然 apiKey 公開沒關係,但要避免別人用你的 apiKey 在他們的網站亂打 Firebase 害你超過免費額度。'));
children.push(NUM('s6', [T('開 '), link('https://console.cloud.google.com/apis/credentials', 'https://console.cloud.google.com/apis/credentials')]));
children.push(NUM('s6', [T('上方確認'), TB('專案是你剛建的 vocab-srs-abc12'), T(' (左上角下拉選單切換)。')]));
children.push(NUM('s6', [T('在 '), TB('「API 金鑰 (API Keys)」'), T(' 區塊,找到名字像 '), IC('Browser key (auto created by Firebase)'), T(' 那個,點名字進去。')]));
children.push(NUM('s6', [TB('「應用程式限制 (Application restrictions)」'), T(':')]));
children.push(BULLET([T('選 '), TB('「HTTP referrers (網站)」')], 1));
children.push(BULLET([T('下方 '), TB('新增 (ADD AN ITEM)'), T(',輸入:')], 1));
children.push(...CODE('https://你的帳號.github.io/*'));
children.push(BULLET([T('再 ADD AN ITEM 一次,輸入 '), IC('localhost/*'), T(' (這樣本機開檔案測試也能用)。')], 1));
children.push(NUM('s6', [TB('「API 限制 (API restrictions)」'), T(':')]));
children.push(BULLET([T('選 '), TB('「限制金鑰 (Restrict key)」')], 1));
children.push(BULLET([T('下拉勾選 '), TB('「Cloud Firestore API」'), T('、'), TB('「Firebase Installations API」'), T('、'), TB('「Firebase Cloud Messaging API」'), T(' (後兩個可選)')], 1));
children.push(NUM('s6', [T('按下方 '), TB('「儲存 (Save)」'), T('。')]));
children.push(P('完成後就算 apiKey 被人撿走也沒用,因為只有你的網域能用。'));
children.push(HR());

// ===== 7. Pages =====
children.push(H1('7. 開啟 GitHub Pages (2 分鐘)'));
children.push(P([T('GitHub Pages = 免費網站代管,把你的 '), IC('docs/'), T(' 資料夾變成一個公開網址。')]));
children.push(NUM('s7', [T('開你的 fork: '), IC('https://github.com/你的帳號/vocab-srs')]));
children.push(NUM('s7', [T('上方分頁 '), TB('「Settings」'), T('。')]));
children.push(NUM('s7', [T('左側選單 '), TB('「Pages」'), T('。')]));
children.push(NUM('s7', [TB('「Source」'), T(':選 '), IC('Deploy from a branch'), T('。')]));
children.push(NUM('s7', [TB('「Branch」'), T(':')]));
children.push(BULLET([T('左下拉選 '), IC('main')], 1));
children.push(BULLET([T('右下拉選 '), IC('/docs')], 1));
children.push(NUM('s7', [T('按 '), TB('「Save」'), T('。')]));
children.push(NUM('s7', '等 1–3 分鐘,重新整理頁面,最上方會出現綠色框:'));
children.push(...CODE('✓ Your site is live at https://你的帳號.github.io/vocab-srs/'));
children.push(NUM('s7', [TB('點那個連結'), T(',應該會看到單字卡 App 載入畫面。')]));
children.push(P([T('如果一直顯示 '), IC('Building...'), T(',再等一下,最多 5 分鐘。')]));
children.push(HR());

// ===== 8. 手機安裝 =====
children.push(H1('8. 手機安裝 App + 分享家庭網址'));

children.push(H2('8.1 你自己先開一次,產生家庭代碼'));
children.push(NUM('s81', [T('用'), TB('手機'), T('開上面那個 GitHub Pages 網址: '), IC('https://你的帳號.github.io/vocab-srs/')]));
children.push(NUM('s81', '第一次開會自動產生一個家庭代碼,網址會變成:'));
children.push(...CODE('https://你的帳號.github.io/vocab-srs/#fam=abcd1234'));
children.push(NUM('s81', [T('看畫面'), TB('右上角'), T(',按 '), TB('使用者圖示 👤 → 「設定」'), T('。')]));
children.push(NUM('s81', [T('在「家庭」區塊'), TB('改一個好記的名字'), T(' (例如「王家」),按確認。')]));
children.push(NUM('s81', [T('新增使用者:'), TB('輸入名字 (小孩名) + 選顏色'), T('。')]));
children.push(NUM('s81', [T('第一個使用者新增時會要你'), TB('設一個 4–8 位數字 PIN'), T('。'), TB('記好這個 PIN'), T(',之後新增使用者、改名都會用到。')]));

children.push(H2('8.2 把網址分享給家人'));
children.push(P([T('直接把'), TB('含 #fam=xxxxxxxx 的完整網址'), T(' 用 LINE / Messenger 傳給家人。')]));
children.push(P([TB('⚠️ 不要傳沒有 #fam= 的網址'), T(',那會讓對方建一個新家庭。')]));

children.push(H2('8.3 家人手機安裝 App'));
children.push(P([TB('iPhone / iPad:')]));
children.push(NUM('s83a', [T('用 '), TB('Safari'), T(' (不要用 Chrome!iOS 只有 Safari 能裝 PWA) 開那個 '), IC('#fam='), T(' 網址。')]));
children.push(NUM('s83a', '下方分享圖示 ⬆ (中間方框加向上箭頭)。'));
children.push(NUM('s83a', [T('往下滑找 '), TB('「加入主畫面 (Add to Home Screen)」'), T(',按。')]));
children.push(NUM('s83a', [T('名字保留「單字卡」,右上角 '), TB('「新增」'), T('。')]));
children.push(NUM('s83a', '桌面就會出現單字卡圖示,跟一般 App 一樣用。'));
children.push(P([TB('Android:')]));
children.push(NUM('s83b', [T('用 '), TB('Chrome'), T(' 開那個 '), IC('#fam='), T(' 網址。')]));
children.push(NUM('s83b', '右上角三點 ⋮ 選單。'));
children.push(NUM('s83b', [T('選 '), TB('「安裝應用程式 (Install app)」'), T(' 或 '), TB('「加到主畫面」'), T('。')]));
children.push(NUM('s83b', '確認,桌面出現圖示。'));
children.push(HR());

// ===== 9. 使用說明 =====
children.push(H1('9. 使用說明'));

children.push(H2('9.1 切換使用者'));
children.push(P([T('右上角 '), TB('👤 圖示'), T(' → 點頭像選使用者。每個使用者的進度、SRS 排程獨立。')]));

children.push(H2('9.2 選等級'));
children.push(P([T('右上角 '), TB('Level 下拉選單'), T(',從 L01 (最簡單) 到 L70。每級 100 字。')]));

children.push(H2('9.3 練習卡片'));
children.push(P([T('中間是英文單字,'), TB('按一下卡片翻到中文翻譯'), T('。下方三個按鈕:')]));
children.push(makeTable(
  ['按鈕', '意思', 'SRS 行為'],
  [
    ['❌ 忘記',   '不會',         '隔天再考'],
    ['😐 普通',   '想了一下才會', '隔幾天再考'],
    ['✅ 熟悉',   '秒答',         '拉長間隔,1 週、2 週、1 個月...'],
  ],
  [1800, 2800, 4760]
));
children.push(P('SRS = Spaced Repetition System,依據你的反應自動排下次複習日期。'));

children.push(H2('9.4 查看練習紀錄'));
children.push(P([T('右上角 '), TB('📊 圖示'), T(' → 看每日練習數量、總熟悉字數。')]));

children.push(H2('9.5 加 / 改使用者'));
children.push(P([T('右上角 '), TB('👤 → 設定'), T(':')]));
children.push(BULLET('➕ 新增使用者 (要 PIN)'));
children.push(BULLET('✏️ 改名 (要 PIN)'));
children.push(BULLET('🎨 改顏色 (要 PIN)'));
children.push(BULLET('🗑 刪除 (要 PIN,會刪光該使用者所有紀錄)'));
children.push(P([T('PIN 設定一次後'), TB('全家庭共用'), T('。在任何裝置上要管理使用者都要打 PIN。')]));

children.push(H2('9.6 切換家庭 (很少用到)'));
children.push(P([T('右上角 '), TB('👤 → 設定 → 切換家庭'), T('。如果你同時管理多個家庭用得到,一般用戶不會用到。')]));

children.push(H2('9.7 跨裝置同步'));
children.push(P([T('只要不同裝置開的是'), TB('同一個 #fam= 網址'), T(',資料自動同步:')]));
children.push(BULLET('爸爸手機加了使用者 → 媽媽手機自動看到'));
children.push(BULLET('小孩在 iPad 練了 20 個字 → 在 iPhone 也看到一樣的紀錄'));
children.push(BULLET('同步延遲約 1 秒'));
children.push(HR());

// ===== 10. 疑難排解 =====
children.push(H1('10. 疑難排解'));

children.push(H2('Q: 網址打開全白 / 一直轉圈'));
children.push(BULLET([T('確認第 5 步的 '), IC('firebaseConfig'), T(' '), TB('整段都換對了'), T(',沒有少貼某幾行。')]));
children.push(BULLET('確認 Firestore 已建立 (第 3.2 步)。'));
children.push(BULLET('用桌機 Chrome 開網址 → 按 F12 → 看 Console 紅字,那是錯誤訊息。'));

children.push(H2('Q: 加使用者沒反應 / 點下去沒動'));
children.push(BULLET('重新整理頁面 (iPhone Safari 是下拉刷新;PWA 圖示要關掉重開)。'));
children.push(BULLET('確認 Firestore Rules 已部署 (第 4 步)。'));

children.push(H2('Q: 兩支手機看到的使用者不一樣'));
children.push(BULLET([T('確認'), TB('兩支都用 #fam=xxxxxxxx 同一個網址'), T('。')]));
children.push(BULLET('在 PWA 圖示裡看不到家庭代碼,可以從右上角 👤 → 設定 → 家庭區塊看代碼是不是一致。'));

children.push(H2('Q: 忘記 PIN'));
children.push(P([T('目前沒有忘記 PIN 重設功能。如果真的忘了,要用瀏覽器直接到 Firebase Console → Firestore Database → 找到 '), IC('families/你的家庭代碼/state/main'), T(' 文件 → 把 '), IC('pinHash'), T(' 欄位改成空字串 '), IC('""'), T(',就能重新設 PIN。')]));

children.push(H2('Q: 我想改程式 / 修 bug'));
children.push(BULLET([T('在 GitHub 網頁直接改 '), IC('docs/index.html'), T(' → Commit → 等 1 分鐘 GitHub Pages 自動重新部署。')]));
children.push(BULLET([T('如果改了 HTML/CSS/JS 結構,記得把 '), IC('docs/sw.js'), T(' 裡 '), IC('CACHE_VERSION'), T(' 數字往上加,不然瀏覽器會吃舊版快取。')]));

children.push(H2('Q: Firebase 會收錢嗎?'));
children.push(P('家庭使用量遠遠在免費額度 (Spark Plan) 內:'));
children.push(BULLET('每日 50,000 次讀取 (你全家一輩子也用不完)'));
children.push(BULLET('每日 20,000 次寫入'));
children.push(BULLET('1 GB 儲存空間'));
children.push(P('要超過很難,可以放心。如果你怕,到 Firebase Console → 左下齒輪 → 用量與計費 → 確認還在 Spark Plan 就好。'));
children.push(HR());

// Footer line
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 480 },
  children: [new TextRun({ text: '— 維護者:freewilljr1221 —', font: CN, italics: true, color: '666666' })],
}));

// ---------- doc setup ----------
const doc = new Document({
  creator: 'Claude',
  title: 'Vocab-SRS 安裝與使用說明',
  styles: {
    default: { document: { run: { font: CN, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: CN, color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: CN, color: '2E75B6' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: CN },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
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
      ...['s2','s31','s32','s33','s4a','s4b','s5','s6','s7','s81','s83a','s83b'].map(ref => ({
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
        children: [new TextRun({ text: 'Vocab-SRS 安裝與使用說明', font: CN, size: 18, color: '888888' })],
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

Packer.toBuffer(doc).then(buffer => {
  const outPath = 'C:\\HansDB\\Vocab-SRS\\Vocab-SRS-安裝與使用說明.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('Wrote', outPath, '(' + buffer.length + ' bytes)');
});
