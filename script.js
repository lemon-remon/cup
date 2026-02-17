import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDdQyh3u1ZgzlgbIb3dc1Gx--5Hdkukx6U",
    authDomain: "play-48bb3.firebaseapp.com",
    projectId: "play-48bb3",
    storageBucket: "play-48bb3.firebasestorage.app",
    messagingSenderId: "245177049970",
    appId: "1:245177049970:web:634a9cc62418161722b3eb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const nameInput = document.getElementById('nameInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
if (!messagesContainer) {
    console.error("Critical Error: 'messagesContainer' element not found in the DOM.");
}
const tosLink = document.getElementById('tosLink');
const tosModal = document.getElementById('tosModal');
const closeTosBtn = document.getElementById('closeTosBtn');
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let deleteTargetId = null;

function openTos() {
    tosModal.classList.add('active');
}

function closeTos() {
    tosModal.classList.remove('active');
}

if (tosLink) {
    tosLink.addEventListener('click', (e) => {
        e.preventDefault();
        openTos();
    });
}

if (closeTosBtn) {
    closeTosBtn.addEventListener('click', closeTos);
}

if (tosModal) {
    tosModal.addEventListener('click', (e) => {
        if (e.target === tosModal) {
            closeTos();
        }
    });
}

function openDeleteModal(id) {
    deleteTargetId = id;
    deleteModal.classList.add('active');
}

function closeDeleteModal() {
    deleteModal.classList.remove('active');
    deleteTargetId = null;
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteTargetId) return;

        const id = deleteTargetId;
        const originalText = confirmDeleteBtn.innerText;
        confirmDeleteBtn.innerText = '削除中...';
        confirmDeleteBtn.disabled = true;

        try {
            await deleteDoc(doc(db, "messages", id));
            closeDeleteModal();
        } catch (e) {
            console.error(e);
            alert("削除に失敗しました。");
        } finally {
            confirmDeleteBtn.innerText = originalText;
            confirmDeleteBtn.disabled = false;
        }
    });
}

async function sendMessage() {
    const name = nameInput.value.trim() || '名無しさん';
    const content = messageInput.value.trim();

    if (!content) {
        alert("メッセージを入力してください！");
        return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '送信中...';

    try {
        await addDoc(collection(db, "messages"), {
            name: name,
            content: content,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    } catch (e) {
        console.error(e);
        alert("送信に失敗しました。");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `送信する <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    }
}

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!e.isComposing) {
            sendMessage();
        }
    }
});

const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    if (snapshot.empty) {
        messagesContainer.innerHTML = '<div class="loading-state">まだメッセージはありません。<br></div>';
        return;
    }

    snapshot.forEach((docSnapshot) => {
        const message = docSnapshot.data();
        renderMessage(message, docSnapshot.id);
    });
});

function deleteMessage(id) {
    openDeleteModal(id);
}

function renderMessage(message, id) {
    const div = document.createElement('div');
    div.classList.add('message-card');

    let timeString = '';
    if (message.timestamp) {
        const date = message.timestamp.toDate();
        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        if (isToday) {
            timeString = date.toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } else {
            timeString = date.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    const initial = (message.name || '名').charAt(0);

    div.innerHTML = `
        <div class="message-header">
            <div class="message-avatar">${sanitizeHTML(initial)}</div>
            <span class="message-name">${sanitizeHTML(message.name)}</span>
            <span class="message-meta">${timeString}</span>
            <button class="delete-btn" title="削除">×</button>
        </div>
        <div class="message-content">${sanitizeHTML(message.content)}</div>
    `;

    const deleteBtn = div.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteMessage(id));
    }

    if (messagesContainer) {
        messagesContainer.appendChild(div);
    } else {
        console.error("Cannot append message: messagesContainer is missing.");
    }
}

function sanitizeHTML(str) {
    return str.replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}