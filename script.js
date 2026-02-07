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
      openInputModal(i, button.textContent);
      return;
    }

    // 単一クリックは短い遅延後に色をサイクルして保存
    clickTimer = setTimeout(async () => {
      if (clickCount === 1) {
        const current = button.dataset.color || 'none';
        const order = ['none', 'orange', 'yellow', 'red', 'black'];
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
    // ボタンの無効化（連打防止）
    resetBtn.disabled = true;

    // 最大遅延時間の計算用
    let maxDelay = 0;

    // 全ボタンに対してアニメーション適用
    buttons.forEach((button, index) => {
      // indexは0始まりの配列インデックス、IDはindex+1
      // グリッド座標を計算 (Rows=3, Columns=40)
      // index = row * columns + col
      const row = Math.floor(index / 40);
      const col = index % 40;

      // 左上(0,0)から右下への波紋のような遅延
      const delay = (col + row) * 30; // 30msごとに伝播
      if (delay > maxDelay) maxDelay = delay;

      setTimeout(() => {
        // アニメーションクラス付与
        button.classList.add('reset-animating');

        // 色を視覚的にリセット (データ更新前の先行表示)
        button.style.backgroundColor = '#e0e0e0';
        button.style.color = '#000000';
        button.dataset.color = 'none';

        // アニメーション終了後にクラス削除
        setTimeout(() => {
          button.classList.remove('reset-animating');
        }, 400); // CSSのアニメーション時間と合わせる
      }, delay);
    });

    // アニメーションが全体に行き渡った頃合いを見てデータ更新
    setTimeout(async () => {
      const colorsPayload = {};
      for (let i = 1; i <= totalButtons; i++) {
        colorsPayload[i] = 'none';
      }
      try {
        await setDoc(docRef, { colors: colorsPayload }, { merge: true });
      } catch (e) {
        console.error("Reset failed:", e);
      } finally {
        resetBtn.disabled = false;
      }
    }, maxDelay + 200);
  });
}

/* リザルト（赤のボタンの文字を表示） */
const showBtn = document.getElementById('showResults');
const resultsModal = document.getElementById('resultsModal');
const resultsList = document.getElementById('resultsList');
const closeModal = document.getElementById('closeModal');

/* 入力モーダル要素 (New Design) */
const inputModal = document.getElementById('inputModal');
const inputField = document.getElementById('inputField');
const cancelInputLink = document.getElementById('cancelInput');
const saveInputBtn = document.getElementById('saveInput');

let editingButtonId = null;

function openInputModal(id, currentText) {
  if (!inputModal) return;
  editingButtonId = id;
  // 初期値セット
  inputField.value = currentText;
  // モーダル表示
  inputModal.classList.remove('hidden');
  // アニメーションなどでtransitionが終わってからfocusしたほうが安全だが、今回は少し遅らせる
  setTimeout(() => inputField.focus(), 50);
}

function closeInputModal() {
  if (!inputModal) return;
  inputModal.classList.add('hidden');
  editingButtonId = null;
  inputField.value = ''; // Reset value
  inputField.blur();
}

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

/* 入力モーダル制御 */
if (inputModal) {
  // 背景クリックで閉じる
  inputModal.addEventListener('click', (e) => {
    if (e.target === inputModal) closeInputModal();
  });

  // キャンセルボタン
  if (cancelInputLink) {
    cancelInputLink.addEventListener('click', closeInputModal);
  }

  // 保存処理
  const saveAction = async () => {
    if (editingButtonId !== null) {
      const newText = inputField.value;
      // 値が空でも保存（名前を消したいケース対応）
      await setDoc(docRef, { labels: { [editingButtonId]: newText } }, { merge: true });
      closeInputModal();
    }
  };

  // 保存ボタン
  if (saveInputBtn) {
    saveInputBtn.addEventListener('click', saveAction);
  }

  // Enterキーで保存、Escapeでキャンセル
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAction();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeInputModal();
    }
  });
}

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
