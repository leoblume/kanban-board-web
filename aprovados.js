import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const aprovadosCollection = collection(db, "tasks_aprovados");

const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');

function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2] || new Date().getFullYear();
    return `${year}-${month}-${day}`;
}

const renderTasks = (tasks) => {
    kanbanBody.innerHTML = '';
    tasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'kanban-row';
        row.id = task.id;
        row.innerHTML = `
            <div class="cell cell-drag-handle">⠿</div>
            <div class="cell cell-client">
                <input type="text" class="os-number-input" value="${task.osNumber || ''}" placeholder="OS">
                <input type="text" class="client-name-input" value="${task.clientName || ''}" placeholder="Cliente">
            </div>
            <div class="cell">
                <input type="text" class="status-date-input delivery-date-field" style="width: 100px" value="${task.deliveryDisplay || ''}" placeholder="dd/mm/aaaa">
            </div>
            <div class="cell cell-actions">
                <button class="action-button delete-button">×</button>
            </div>
        `;
        kanbanBody.appendChild(row);
    });
};

onSnapshot(query(aprovadosCollection, orderBy("deliveryDate", "asc")), (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks(tasks);
});

addRowButton.addEventListener('click', () => {
    addDoc(aprovadosCollection, { 
        clientName: "Novo Cliente", 
        osNumber: "00000", 
        deliveryDate: "9999-12-31", 
        deliveryDisplay: "" 
    });
});

kanbanBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-button')) {
        if(confirm("Excluir esta tarefa?")) deleteDoc(doc(db, "tasks_aprovados", e.target.closest('.kanban-row').id));
    }
});

kanbanBody.addEventListener('change', async (e) => {
    const row = e.target.closest('.kanban-row');
    const docRef = doc(db, "tasks_aprovados", row.id);
    const val = e.target.value;

    if (e.target.classList.contains('os-number-input')) await updateDoc(docRef, { osNumber: val });
    if (e.target.classList.contains('client-name-input')) await updateDoc(docRef, { clientName: val });
    if (e.target.classList.contains('delivery-date-field')) {
        await updateDoc(docRef, { 
            deliveryDisplay: val,
            deliveryDate: convertDateToSortable(val)
        });
    }
});