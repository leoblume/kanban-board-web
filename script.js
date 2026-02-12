import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALCIfOdzUrbzs8_ceXXYFwsCeT161OFPw",
  authDomain: "kanban-board-92ce7.firebaseapp.com",
  projectId: "kanban-board-92ce7",
  storageBucket: "kanban-board-92ce7.appspot.com",
  messagingSenderId: "494809291125",
  appId: "1:494809291125:web:17f9eefa4287d39174db3c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, "tasks");
const scheduleCollection = collection(db, "schedule");

// --- Seletores DOM ---
const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchCounter = document.getElementById('search-counter');
const exportPdfButton = document.getElementById('export-pdf-button');
const weeklySchedulePanel = document.getElementById('weekly-schedule-panel');
const hideScheduleButton = document.getElementById('hide-schedule-button');
const showScheduleButton = document.getElementById('show-schedule-button');

// --- SELETORES DO BLOCO DE NOTAS ---
const sideNotesPanel = document.getElementById('side-notes-panel');
const sideNotesTextarea = document.getElementById('side-notes-textarea');
const hideNotesButton = document.getElementById('hide-notes-button');
const showNotesButton = document.getElementById('show-notes-button');
const notesStatus = document.getElementById('notes-status');
const notesDocRef = doc(db, "settings", "global_notes");

// --- LÓGICA DO BLOCO DE NOTAS (FIREBASE) ---
onSnapshot(notesDocRef, (docSnap) => {
    if (docSnap.exists() && document.activeElement !== sideNotesTextarea) {
        sideNotesTextarea.value = docSnap.data().content || "";
    }
});

let typingTimer;
sideNotesTextarea.addEventListener('input', () => {
    notesStatus.textContent = "Digitando...";
    clearTimeout(typingTimer);
    typingTimer = setTimeout(async () => {
        try {
            await setDoc(notesDocRef, { content: sideNotesTextarea.value }, { merge: true });
            notesStatus.textContent = "Salvo";
        } catch (error) {
            notesStatus.textContent = "Erro ao salvar";
        }
    }, 1000);
});

showNotesButton.addEventListener('click', () => {
    sideNotesPanel.classList.remove('side-panel-hidden');
    document.body.classList.add('notes-open');
});

hideNotesButton.addEventListener('click', () => {
    sideNotesPanel.classList.add('side-panel-hidden');
    document.body.classList.remove('notes-open');
});

// --- LÓGICA KANBAN EXISTENTE ---
let tasks = [];
const canonicalStatuses = [ { id: 'compras', label: 'Compras' }, { id: 'arte', label: 'Arte Final' }, { id: 'impressao', label: 'Impressão' }, { id: 'acabamento', label: 'Acabamento' }, { id: 'corte', label: 'Corte' }, { id: 'faturamento', label: 'Fat.' }, { id: 'instalacao', label: 'Instalação' }, { id: 'entrega', label: 'Entrega' }];
function healStatuses(statusesArray = []) { return canonicalStatuses.map(canonical => { const existing = statusesArray.find(s => s.id === canonical.id); return { id: canonical.id, label: canonical.label, state: existing?.state || 'state-pending', date: existing?.date || '' }; }); }
function convertDateToSortable(dateStr) { if (!dateStr || !dateStr.includes('/')) return '9999-12-31'; const parts = dateStr.split('/'); if (parts.length < 2) return '9999-12-31'; return `${new Date().getFullYear()}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; }

const renderAllTasks = (tasksToRender) => {
    kanbanBody.innerHTML = '';
    tasksToRender.forEach(task => {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.id = task.id;
        rowElement.draggable = true;
        rowElement.innerHTML = `
            <div class="cell cell-drag-handle">⠿</div>
            <div class="cell cell-client">
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber || ''}">
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName || ''}">
            </div>
            ${task.statuses.map(s => `
                <div class="cell">
                    <div class="status-control">
                        <button class="status-button ${s.state}" data-status-id="${s.id}"></button>
                        <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id="${s.id}">
                    </div>
                </div>
            `).join('')}
            <div class="cell cell-actions">
                <button class="action-button delete-button">×</button>
            </div>`;
        kanbanBody.appendChild(rowElement);
    });
};

onSnapshot(query(tasksCollection, orderBy("deliveryDate", "asc")), (snapshot) => {
    tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAllTasks(tasks);
});

addRowButton.addEventListener('click', () => addDoc(tasksCollection, { clientName: "Novo Cliente", osNumber: "OS", statuses: healStatuses([]), deliveryDate: '9999-12-31' }));

// Eventos de clique e mudança (abreviados para brevidade, mantendo lógica original)
kanbanBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('.kanban-row');
    if (btn.classList.contains('delete-button')) await deleteDoc(doc(db, "tasks", row.id));
    if (btn.classList.contains('status-button')) {
        const snap = await getDoc(doc(db, "tasks", row.id));
        const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];
        const current = snap.data().statuses.find(s => s.id === btn.dataset.statusId);
        const nextState = states[(states.indexOf(current.state) + 1) % states.length];
        const newStatuses = snap.data().statuses.map(s => s.id === btn.dataset.statusId ? {...s, state: nextState} : s);
        await updateDoc(doc(db, "tasks", row.id), { statuses: newStatuses });
    }
});

// Outros listeners omitidos para focar na nova funcionalidade; mantenha sua lógica de exportação e pesquisa original.
