import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* Firebase設定 */
const firebaseConfig = {
  apiKey: "AIzaSyAY-ofXgWEF0I8L-7mEwwionGtrtLf7fj0",
  authDomain: "bcup-da27b.firebaseapp.com",
  projectId: "bcup-da27b",
  storageBucket: "bcup-da27b.firebasestorage.app",
  messagingSenderId: "1067812351812",
  appId: "1:1067812351812:web:08454b08ca18b20bb57111"
};

/* 初期化 */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* 同期用ドキュメント（全端末共通） */
const docRef = doc(db, "sync", "buttons");

/* ボタン生成 */
const buttonContainer = document.getElementById("buttonContainer");
const rows = 3;
const columns = 40;
const totalButtons = rows * columns;

const buttons = [];

for (let i = 1; i <= totalButtons; i++) {
  const button = document.createElement("button");
  button.className = "square-button";
  button.textContent = i;
  button.dataset.id = i;

  let clickCount = 0;
  let clickTimer = null;

  button.addEventListener("click", async () => {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);

    // 三回クリックは即時処理（ラベル編集）
    if (clickCount === 3) {
      clearTimeout(clickTimer);
      clickCount = 0;
      const newText = prompt("名前入れて:", button.textContent);
      if (newText !== null) {
        await setDoc(docRef, { labels: { [i]: newText } }, { merge: true });
      }
      return;
    }

    // 単一クリックは短い遅延後に色をサイクルして保存
    clickTimer = setTimeout(async () => {
      if (clickCount === 1) {
        const current = button.dataset.color || 'none';
        const order = ['none', 'yellow', 'orange', 'red', 'black'];
        const next = order[(order.indexOf(current) + 1) % order.length];
        button.dataset.color = next;
        button.style.backgroundColor = next === 'none' ? '#e0e0e0' : next;
        // 黒背景時は文字色を白にする
        button.style.color = (next === 'black') ? '#ffffff' : '#000000';
        await setDoc(docRef, { colors: { [i]: next } }, { merge: true });
      }
      clickCount = 0;
    }, 500);
  });

  buttonContainer.appendChild(button);
  buttons.push(button);
}

/* 🔥 他端末とリアルタイム同期 */
onSnapshot(docRef, (snapshot) => {
  const data = snapshot.data() || {};
  const labels = data.labels || {};
  const colors = data.colors || {};
  buttons.forEach(button => {
    const id = button.dataset.id;
    // ラベル
    if (labels[id] !== undefined) {
      button.textContent = labels[id];
    } else {
      button.textContent = id;
    }
    // 色
    const color = colors[id] || 'none';
    button.dataset.color = color;
    button.style.backgroundColor = color === 'none' ? '#e0e0e0' : color;
    button.style.color = (color === 'black') ? '#ffffff' : '#000000';
  });
});

/* タイトル横の色リセットボタン */
const resetBtn = document.getElementById('resetColors');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    // 全ボタンの色を 'none' に設定して一度に保存
    const colorsPayload = {};
    for (let i = 1; i <= totalButtons; i++) {
      colorsPayload[i] = 'none';
    }
    await setDoc(docRef, { colors: colorsPayload }, { merge: true });
  });
}

/* リザルト（赤のボタンの文字を表示） */
const showBtn = document.getElementById('showResults');
const resultsModal = document.getElementById('resultsModal');
const resultsList = document.getElementById('resultsList');
const closeModal = document.getElementById('closeModal');

function openResultsModal(lines) {
  if (!resultsModal || !resultsList) return;
  resultsList.innerHTML = '';
  lines.forEach(line => {
    const div = document.createElement('div');
    div.textContent = line;
    resultsList.appendChild(div);
  });
  resultsModal.classList.remove('hidden');
}

function closeResultsModal() {
  if (!resultsModal) return;
  resultsModal.classList.add('hidden');
}

// close handlers
if (closeModal) closeModal.addEventListener('click', closeResultsModal);
if (resultsModal) resultsModal.addEventListener('click', (e) => {
  if (e.target === resultsModal) closeResultsModal();
});

if (showBtn) {
  showBtn.addEventListener('click', () => {
    // 色ごとにラベルを収集（'none' は除外）
    const colorMap = {};
    buttons.forEach(b => {
      const c = (b.dataset.color || '').toString().toLowerCase();
      if (!c || c === 'none') return;
      const txt = b.textContent.trim();
      if (!colorMap[c]) colorMap[c] = [];
      colorMap[c].push(txt);
    });

    if (Object.keys(colorMap).length === 0) {
      openResultsModal(['今週は優秀やったね']);
      return;
    }

    const sortList = (arr) => arr.slice().sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    const mapLabel = (col) => {
      const m = { black: '黒', red: '赤', orange: '橙', yellow: '黄' };
      return m[col] || col;
    };

    const preferred = ['black', 'red', 'orange', 'yellow'];
    const lines = [];
    // 優先色を先に追加
    preferred.forEach(col => {
      if (colorMap[col]) {
        lines.push(`[${mapLabel(col)}]${sortList(colorMap[col]).join(',')}`);
        delete colorMap[col];
      }
    });
    // 残りの色をアルファベット順で追加
    Object.keys(colorMap).sort().forEach(col => {
      lines.push(`[${mapLabel(col)}]${sortList(colorMap[col]).join(',')}`);
    });

    openResultsModal(lines);
  });
}

