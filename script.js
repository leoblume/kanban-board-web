import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyALCIfOdzUrbzs8_ceXXYFwsCeT161OFPw",
  authDomain: "kanban-board-92ce7.firebaseapp.com",
  projectId: "kanban-board-92ce7",
  storageBucket: "kanban-board-92ce7.firebasestorage.app",
  messagingSenderId: "494809291125",
  appId: "1:494809291125:web:17f9eefa4287d39174db3c"
};

// Passo 3: Inicializar o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, "tasks");

// O resto do seu código, agora usando Firebase...
const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const searchInput = document.getElementById('search-input');

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const kanbanBody = document.getElementById('kanban-body');
    const addRowButton = document.getElementById('add-row-button');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchCounter = document.getElementById('search-counter');

    // --- Estado da Aplicação ---
    let tasks = [];
    // MODIFICADO: Estado para a lógica de pesquisa
    let currentSearchTerm = '';
    let currentMatchingIndices = [];
    let searchResultPointer = -1;

    // --- Funções de Dados (LocalStorage) ---
    const saveTasks = () => localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
    const loadTasks = () => JSON.parse(localStorage.getItem('kanbanTasks')) || [];

    // --- Função Principal de Renderização ---
    const renderAllTasks = () => {
        kanbanBody.innerHTML = '';
        tasks.forEach(task => {
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
    
    // --- Funções de Limpeza ---
    const clearSearchState = () => {
        currentSearchTerm = '';
        currentMatchingIndices = [];
        searchResultPointer = -1;
        searchCounter.textContent = '';
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    };

    // --- Lógica de Pesquisa (Totalmente refeita) ---
    const handleSearch = () => {
        const newSearchTerm = searchInput.value.toLowerCase().trim();
        
        // Se a busca estiver vazia, limpa tudo
        if (!newSearchTerm) {
            clearSearchState();
            return;
        }

        // Se o termo de busca mudou, inicia uma nova busca
        if (newSearchTerm !== currentSearchTerm) {
            currentSearchTerm = newSearchTerm;
            currentMatchingIndices = tasks.reduce((acc, task, index) => {
                if (task.clientName.toLowerCase().includes(currentSearchTerm) || task.osNumber.toLowerCase().includes(currentSearchTerm)) {
                    acc.push(index);
                }
                return acc;
            }, []);
            searchResultPointer = -1; // Reseta o ponteiro
        }

        // Se não houver resultados, informa o usuário
        if (currentMatchingIndices.length === 0) {
            searchCounter.textContent = '0/0';
            alert('Nenhum item encontrado.');
            return;
        }

        // Avança para o próximo resultado (e volta ao início se chegar ao fim)
        searchResultPointer = (searchResultPointer + 1) % currentMatchingIndices.length;

        // Pega o item a ser destacado
        const taskIndexToShow = currentMatchingIndices[searchResultPointer];
        const foundTask = tasks[taskIndexToShow];
        const foundRow = document.getElementById(foundTask.id);

        if (foundRow) {
            // Limpa destaques antigos e destaca o novo
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            foundRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            foundRow.classList.add('highlight');
            // Atualiza o contador
            searchCounter.textContent = `${searchResultPointer + 1}/${currentMatchingIndices.length}`;
        }
    };

    // --- Lógica de Eventos ---
    // (O restante do código permanece o mesmo, mas está incluído abaixo para ser completo)
    
    addRowButton.addEventListener('click', () => { /* ... */ });
    kanbanBody.addEventListener('click', (event) => { /* ... */ });
    kanbanBody.addEventListener('change', (event) => { /* ... */ });
    
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    searchInput.addEventListener('input', clearSearchState); // Reseta a busca se o usuário digitar

    kanbanBody.addEventListener('dragstart', (e) => { /* ... */ });
    kanbanBody.addEventListener('dragend', () => { /* ... */ });
    kanbanBody.addEventListener('dragover', (e) => { /* ... */ });
    function getDragAfterElement(container, y) { /* ... */ }

    // --- Inicialização da Aplicação ---
    tasks = loadTasks();
    renderAllTasks();

    // Funções de evento completas (sem alteração da versão anterior)
    addRowButton.addEventListener('click', () => {
        tasks.push({
            id: 'task-' + Date.now(), clientName: "Novo Cliente", osNumber: "OS: Nova",
            statuses: ['compras', 'arte', 'impressao', 'acabamento', 'faturamento', 'instalacao', 'entrega'].map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), state: 'state-pending', date: '' }))
        });
        saveTasks();
        renderAllTasks();
    });

// evento envio google calendar

kanbanBody.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.kanban-row');
    if (!row) return;

    const taskIndex = tasks.findIndex(t => t.id === row.id);
    if (taskIndex === -1) return;

    if (button.classList.contains('delete-button')) {
        tasks.splice(taskIndex, 1);
    } else if (button.classList.contains('status-button')) {
        const states = ['state-pending', 'state-done', 'state-blocked'];
        const statusId = button.dataset.statusId;
        const statusObj = tasks[taskIndex].statuses.find(s => s.id === statusId);
        const currentState = states.find(s => button.classList.contains(s)) || 'state-blocked';
        const nextIndex = (states.indexOf(currentState) + 1) % states.length;
        statusObj.state = states[nextIndex];
    } else if (button.classList.contains('calendar-button')) {
        // --- LÓGICA DO GOOGLE CALENDAR CORRIGIDA E ATIVADA ---
        const task = tasks[taskIndex];
        const clientName = task.clientName || 'Cliente não definido';
        const osNumber = task.osNumber || 'OS não definida';
        
        const eventTitle = `Entrega: ${clientName} (${osNumber})`;
        const eventDetails = `Verificar detalhes da ${osNumber} para o cliente ${clientName}.`;
        
        // Formata a URL para o Google Agenda
        const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDetails)}`;
        
        // Abre o link em uma nova aba
        window.open(googleCalendarUrl, '_blank');
        return; // Retorna para não executar o saveTasks/renderAllTasks desnecessariamente
    }
    saveTasks();
    renderAllTasks(); 
});



    kanbanBody.addEventListener('change', (event) => {
        const input = event.target;
        const row = input.closest('.kanban-row');
        if (!row || !input.matches('input[type="text"]')) return;

        const task = tasks.find(t => t.id === row.id);
        if (!task) return;

        if (input.matches('.client-name-input')) task.clientName = input.value;
        if (input.matches('.os-number-input')) task.osNumber = input.value;
        if (input.matches('.status-date-input')) {
            const statusId = input.dataset.statusId;
            const statusObj = task.statuses.find(s => s.id === statusId);
            if (statusObj) statusObj.date = input.value;
        }
        saveTasks();
    });
    
    kanbanBody.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('kanban-row')) e.target.classList.add('dragging');
    });
    kanbanBody.addEventListener('dragend', () => {
        document.querySelector('.dragging')?.classList.remove('dragging');
        const newOrderedIds = Array.from(kanbanBody.querySelectorAll('.kanban-row')).map(r => r.id);
        tasks.sort((a, b) => newOrderedIds.indexOf(a.id) - newOrderedIds.indexOf(b.id));
        saveTasks();
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
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.kanban-row:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
});

let tasks = []; // Este array será um espelho local do DB para a pesquisa

const renderAllTasks = (tasksToRender) => {
    kanbanBody.innerHTML = '';
    tasksToRender.forEach(task => {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.draggable = true;
        rowElement.id = task.id;
        // ... (resto do seu código de renderização do HTML)
    });

// NOVO: Carregar dados em tempo real do Firebase
onSnapshot(query(tasksCollection, orderBy("order")), (snapshot) => {
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllTasks(tasks);
});

