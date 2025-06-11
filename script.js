// Passo 1: Importar as funções do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Passo 2: Configuração do Firebase com suas chaves
const firebaseConfig = {
  apiKey: "AIzaSyALCIfOdzUrbzs8_ceXXYFwsCeT161OFPw",
  authDomain: "kanban-board-92ce7.firebaseapp.com",
  projectId: "kanban-board-92ce7",
  storageBucket: "kanban-board-92ce7.appspot.com", // Corrigido para .appspot.com
  messagingSenderId: "494809291125",
  appId: "1:494809291125:web:17f9eefa4287d39174db3c"
};

// Passo 3: Inicializar o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, "tasks");

// --- Elementos do DOM ---
const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchCounter = document.getElementById('search-counter');

// --- Estado da Aplicação (espelho local do DB) ---
let tasks = [];
let currentSearchTerm = '';
let currentMatchingIndices = [];
let searchResultPointer = -1;

// --- Função Principal de Renderização ---
const renderAllTasks = (tasksToRender) => {
    kanbanBody.innerHTML = '';
    tasksToRender.forEach(task => {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.draggable = true;
        rowElement.id = task.id;

        const statusCellsHTML = task.statuses.map(status => `
            <div class="cell">
                <span class="status-label-mobile">${status.label}</span>
                <div class="status-control">
                    <input type="text" class="status-date-input" placeholder="dd/mm" value="${status.date || ''}" data-status-id="${status.id}">
                    <button class="status-button ${status.state}" data-status-id="${status.id}"></button>
                </div>
            </div>
        `).join('');

        rowElement.innerHTML = `
            <div class="cell cell-drag-handle">⠿</div>
            <div class="cell cell-client">
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName}">
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber}">
            </div>
            ${statusCellsHTML}
            <div class="cell cell-actions">
                <button class="action-button calendar-button" title="Adicionar à Agenda">...</button>
                <button class="action-button delete-button" title="Excluir Linha">×</button>
            </div>`;
        kanbanBody.appendChild(rowElement);
    });
};

// --- Carregar dados em tempo real do Firebase ---
onSnapshot(query(tasksCollection, orderBy("order")), (snapshot) => {
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllTasks(tasks);
});


// --- Lógica de Eventos ---

// CORRIGIDO: Botão Adicionar agora funciona com Firebase
addRowButton.addEventListener('click', async () => {
    // A ordem da nova tarefa será o tamanho atual do array de tarefas, garantindo que seja a última
    const newOrder = tasks.length;

    const newTaskData = {
        clientName: "Novo Cliente",
        osNumber: "OS: Nova",
        order: newOrder,
        statuses: [
            { id: 'compras', label: 'Compras', state: 'state-pending', date: '' }, { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
            { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' }, { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
            { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' }, { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
            { id: 'entrega', label: 'Entrega', state: 'state-pending', date: '' }
        ]
    };
    try {
        await addDoc(tasksCollection, newTaskData);
    } catch (error) {
        console.error("Erro ao adicionar nova tarefa: ", error);
        alert("Não foi possível adicionar a tarefa. Verifique o console para mais detalhes.");
    }
});

kanbanBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.kanban-row');
    if (!row) return;

    const docId = row.id;
    const docRef = doc(db, "tasks", docId);

    if (button.classList.contains('delete-button')) {
        await deleteDoc(docRef);
    } else if (button.classList.contains('status-button')) {
        const states = ['state-pending', 'state-done', 'state-blocked'];
        const statusId = button.dataset.statusId;
        const currentDoc = await getDoc(docRef);
        const currentStatuses = currentDoc.data().statuses;
        
        const newStatuses = currentStatuses.map(status => {
            if (status.id === statusId) {
                const currentState = states.find(s => status.state === s) || 'state-blocked';
                const nextIndex = (states.indexOf(currentState) + 1) % states.length;
                return { ...status, state: states[nextIndex] };
            }
            return status;
        });
        await updateDoc(docRef, { statuses: newStatuses });
    } else if (button.classList.contains('calendar-button')) {
        const task = tasks.find(t => t.id === docId);
        if (task) {
            const eventTitle = `Entrega: ${task.clientName} (${task.osNumber})`;
            const eventDetails = `Verificar detalhes da ${task.osNumber} para o cliente ${task.clientName}.`;
            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDetails)}`;
            window.open(googleCalendarUrl, '_blank');
        }
    }
});

kanbanBody.addEventListener('change', async (event) => {
    const input = event.target;
    const row = input.closest('.kanban-row');
    if (!row || !input.matches('input[type="text"]')) return;

    const docId = row.id;
    const docRef = doc(db, "tasks", docId);
    
    if (input.matches('.client-name-input')) {
        await updateDoc(docRef, { clientName: input.value });
    } else if (input.matches('.os-number-input')) {
        await updateDoc(docRef, { osNumber: input.value });
    } else if (input.matches('.status-date-input')) {
        const statusId = input.dataset.statusId;
        const currentDoc = await getDoc(docRef);
        const currentStatuses = currentDoc.data().statuses;
        const newStatuses = currentStatuses.map(s => (s.id === statusId) ? { ...s, date: input.value } : s);
        await updateDoc(docRef, { statuses: newStatuses });
    }
});

const handleSearch = () => { /* ... (código da pesquisa sem alterações) ... */ };
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
searchInput.addEventListener('input', () => { /* ... (código da pesquisa sem alterações) ... */ });

// --- Lógica de Arrastar e Soltar com Firebase ---
kanbanBody.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('kanban-row')) e.target.classList.add('dragging');
});

kanbanBody.addEventListener('dragend', async () => {
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) draggingElement.classList.remove('dragging');

    const newOrderedIds = Array.from(kanbanBody.querySelectorAll('.kanban-row')).map(r => r.id);
    
    // Usar um batch write para atualizar todos os documentos de uma vez (mais eficiente)
    const batch = writeBatch(db);
    newOrderedIds.forEach((id, index) => {
        const docRef = doc(db, "tasks", id);
        batch.update(docRef, { order: index });
    });
    
    await batch.commit();
});

kanbanBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(kanbanBody, e.clientY);
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        if (afterElement == null) kanbanBody.appendChild(draggingElement);
        else kanbanBody.insertBefore(draggingElement, afterElement);
    }
});

function getDragAfterElement(container, y) { /* ... (código sem alterações) ... */ }

// Código completo das funções auxiliares para referência
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-row:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

const clearSearchState = () => {
    currentSearchTerm = '';
    currentMatchingIndices = [];
    searchResultPointer = -1;
    searchCounter.textContent = '';
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
};
searchInput.addEventListener('input', clearSearchState);

const handleSearchFunc = () => {
    const newSearchTerm = searchInput.value.toLowerCase().trim();
    if (!newSearchTerm) { clearSearchState(); return; }

    if (newSearchTerm !== currentSearchTerm) {
        currentSearchTerm = newSearchTerm;
        currentMatchingIndices = tasks.reduce((acc, task, index) => {
            if (task.clientName.toLowerCase().includes(currentSearchTerm) || task.osNumber.toLowerCase().includes(currentSearchTerm)) {
                acc.push(index);
            }
            return acc;
        }, []);
        searchResultPointer = -1;
    }

    if (currentMatchingIndices.length === 0) {
        searchCounter.textContent = '0/0';
        alert('Nenhum item encontrado.');
        return;
    }

    searchResultPointer = (searchResultPointer + 1) % currentMatchingIndices.length;
    const taskIndexToShow = currentMatchingIndices[searchResultPointer];
    const foundTask = tasks[taskIndexToShow];
    const foundRow = document.getElementById(foundTask.id);

    if (foundRow) {
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        foundRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        foundRow.classList.add('highlight');
        searchCounter.textContent = `${searchResultPointer + 1}/${currentMatchingIndices.length}`;
    }
};
searchButton.addEventListener('click', handleSearchFunc);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearchFunc(); });
