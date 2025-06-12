// --- Importações do Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Configuração do Firebase ---
// Mantenha aqui a sua configuração original
const firebaseConfig = {
  apiKey: "AIzaSyALCIfOdzUrbzs8_ceXXYFwsCeT161OFPw",
  authDomain: "kanban-board-92ce7.firebaseapp.com",
  projectId: "kanban-board-92ce7",
  storageBucket: "kanban-board-92ce7.appspot.com",
  messagingSenderId: "494809291125",
  appId: "1:494809291125:web:17f9eefa4287d39174db3c"
};

// --- Inicialização ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, "tasks");

// --- Seletores de Elementos DOM ---
const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchCounter = document.getElementById('search-counter');

// --- Estado Local ---
let tasks = [];
let currentSearchTerm = '', currentMatchingIndices = [], searchResultPointer = -1;

// --- Renderização ---
const renderAllTasks = (tasksToRender) => {
    kanbanBody.innerHTML = '';
    tasksToRender.forEach(task => {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.draggable = true;
        rowElement.id = task.id;
        
        rowElement.innerHTML = `
            <div class="cell cell-drag-handle">⠿</div>
            <div class="cell cell-client">
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber}">
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName}">
            </div>
            ${task.statuses.map(s => `
                <div class="cell">
                    <span class="status-label-mobile">${s.label}</span>
                    <div class="status-control">
                        <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id="${s.id}">
                        <button class="status-button ${s.state}" data-status-id="${s.id}"></button>
                    </div>
                </div>`).join('')}
            <div class="cell cell-actions">
                <button class="action-button calendar-button" title="Adicionar à Agenda">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>
                </button>
                <button class="action-button delete-button" title="Excluir Linha">×</button>
            </div>
        `;
        kanbanBody.appendChild(rowElement);
    });
};

// --- Funções Auxiliares ---
// Converte data dd/mm para um formato que ordena corretamente (yyyy-mm-dd)
function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) {
        return '9999-12-31'; // Datas vazias ou inválidas vão para o final
    }
    const parts = dateStr.split('/');
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) {
        return '9999-12-31'; // Data mal formatada
    }
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear();
    return `${year}-${month}-${day}`;
}

// --- Carregamento e Migração de Dados em Tempo Real ---
// A query principal agora ordena por data de entrega e depois pela ordem manual.
const q = query(tasksCollection, orderBy("deliveryDate", "asc"), orderBy("order", "asc"));

onSnapshot(q, (snapshot) => {
    const batch = writeBatch(db);
    let updatesNeeded = 0;

    tasks = snapshot.docs.map(doc => {
        const data = doc.data();
        let needsUpdate = false;

        // --- LÓGICA DE MIGRAÇÃO E CORREÇÃO AUTOMÁTICA ---
        // 1. Garante que 'deliveryDate' existe para ordenação. Se não existir, cria-o.
        if (data.deliveryDate === undefined) {
            const entregaStatus = data.statuses.find(s => s.id === 'entrega');
            data.deliveryDate = convertDateToSortable(entregaStatus?.date || '');
            needsUpdate = true;
        }

        // 2. Garante que o status 'corte' existe. Se não existir, adiciona-o.
        const hasCorte = data.statuses.some(s => s.id === 'corte');
        if (!hasCorte) {
            const newCorteStatus = { id: 'corte', label: 'Corte', state: 'state-pending', date: '' };
            const acabamentoIndex = data.statuses.findIndex(s => s.id === 'acabamento');
            data.statuses.splice(acabamentoIndex + 1, 0, newCorteStatus);
            needsUpdate = true;
        }
        
        // Se uma atualização for necessária, adiciona ao batch para ser salvo de uma vez.
        if (needsUpdate) {
            console.log(`Agendando atualização para a tarefa ${doc.id} (migração de dados).`);
            const docRef = doc(db, "tasks", doc.id);
            batch.update(docRef, { statuses: data.statuses, deliveryDate: data.deliveryDate });
            updatesNeeded++;
        }

        return { id: doc.id, ...data };
    });

    // Se houver atualizações pendentes, envia todas de uma vez para o Firebase.
    if (updatesNeeded > 0) {
        console.log(`Executando ${updatesNeeded} atualizações em batch...`);
        batch.commit().then(() => {
            console.log("Migração de dados concluída com sucesso.");
        }).catch(err => {
            console.error("Erro ao executar a migração de dados em batch:", err);
        });
    }

    renderAllTasks(tasks);
    console.log("Dados carregados/atualizados do Firebase.");
}, (error) => {
    console.error("ERRO GRAVE AO CARREGAR DADOS:", error);
    kanbanBody.innerHTML = `<p style="text-align: center; color: red; padding: 20px; font-weight: bold;">Erro ao carregar os dados. Verifique o console para mais detalhes (F12) e certifique-se de que o índice do Firestore foi criado corretamente na aba 'Índices' do seu banco de dados.</p>`;
});

// --- Lógica de Eventos ---

addRowButton.addEventListener('click', async () => {
    const newOrder = tasks.length;
    await addDoc(tasksCollection, {
        clientName: "Novo Cliente", osNumber: "OS: Nova", order: newOrder,
        deliveryDate: '9999-12-31', // Data padrão para ordenação de novos itens
        statuses: [
            { id: 'compras', label: 'Compras', state: 'state-pending', date: '' },
            { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
            { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' },
            { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
            { id: 'corte', label: 'Corte', state: 'state-pending', date: '' },
            { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' },
            { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
            { id: 'entrega', label: 'Entrega', state: 'state-pending', date: '' }
        ]
    });
});

kanbanBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.kanban-row');
    if (!row) return;
    const docId = row.id;
    const docRef = doc(db, "tasks", docId);

    if (button.classList.contains('delete-button')) { await deleteDoc(docRef); }
    else if (button.classList.contains('status-button')) {
        const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];
        const statusId = button.dataset.statusId;
        const currentDoc = await getDoc(docRef);
        const newStatuses = currentDoc.data().statuses.map(status => {
            if (status.id === statusId) {
                const currentIndex = states.indexOf(status.state);
                const nextIndex = (currentIndex + 1) % states.length;
                return { ...status, state: states[nextIndex] };
            }
            return status;
        });
        await updateDoc(docRef, { statuses: newStatuses });
    }
    else if (button.classList.contains('calendar-button')) {
        const task = tasks.find(t => t.id === docId);
        if (task) {
            const eventTitle = `Entrega: ${task.clientName} (${task.osNumber})`;
            const eventDetails = `Verificar detalhes da ${task.osNumber} para o cliente ${task.clientName}.`;
            window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDetails)}`, '_blank');
        }
    }
});

kanbanBody.addEventListener('change', async (event) => {
    const input = event.target;
    const row = input.closest('.kanban-row');
    if (!row || !input.matches('input[type="text"]')) return;
    const docId = row.id;
    const docRef = doc(db, "tasks", docId);
    
    if (input.matches('.client-name-input')) { await updateDoc(docRef, { clientName: input.value }); } 
    else if (input.matches('.os-number-input')) { await updateDoc(docRef, { osNumber: input.value }); } 
    else if (input.matches('.status-date-input')) {
        const statusId = input.dataset.statusId;
        const currentDoc = await getDoc(docRef);
        const newStatuses = currentDoc.data().statuses.map(s => (s.id === statusId) ? { ...s, date: input.value } : s);
        
        const updateData = { statuses: newStatuses };

        // Se a data de entrega for alterada, atualiza o campo de ordenação.
        if (statusId === 'entrega') {
            updateData.deliveryDate = convertDateToSortable(input.value);
        }
        await updateDoc(docRef, updateData);
    }
});

// --- DRAG AND DROP ---
kanbanBody.addEventListener('dragstart', (e) => { if (e.target.classList.contains('kanban-row')) e.target.classList.add('dragging'); });
kanbanBody.addEventListener('dragend', async () => {
    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) return;
    draggingElement.classList.remove('dragging');
    
    const newOrderedIds = Array.from(kanbanBody.querySelectorAll('.kanban-row')).map(r => r.id);
    const batch = writeBatch(db);
    newOrderedIds.forEach((id, index) => { batch.update(doc(db, "tasks", id), { order: index }); });
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
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-row:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// --- PESQUISA ---
const clearSearchState = () => {
    currentSearchTerm = ''; currentMatchingIndices = []; searchResultPointer = -1;
    searchCounter.textContent = '';
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
};
const handleSearch = () => {
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
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
searchInput.addEventListener('input', clearSearchState);