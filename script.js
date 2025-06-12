// --- Importações do Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0 o status faltante, mas a maneira como ele fazia isso podia falhar em alguns casos, resultando em uma coluna "fantasma" que não renderiza os controles.

A solução definitiva é implementar uma lógica de **"auto-correção" (self-healing)**. Toda vez que uma tarefa for carregada do banco de dados, nosso código irá verificar se a lista de status está perfeita. Se não estiver, ele a corrigirá na hora, garantindo que a exibição seja sempre correta.

---

### A Causa do Problema

A renderização do HTML depende de um array `task.statuses` com 8 itens, cada um com `id`, `label`, `state`, etc. Se, por qualquer motivo, uma tarefa no banco de dados tiver um array com apenas 7 itens, a 8ª coluna na interface ficará vazia, sem o input de data e o botão.

### A Correção

O `script.js` abaixo foi modificado para ser muito mais robusto. Ele não confia mais que os dados do Firebase estejam perfeitos. Em vez disso, ele os "cura" antes de renderizar.

**Substitua todo o conteúdo do seu arquivo `script.js` por este código corrigido.** Nenhum outro arquivo precisa ser alterado.

```javascript
// --- Importações do Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Configuração do Firebase ---
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
        
        // A renderização agora sempre recebe um array de status completo e correto
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
function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/');
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31';
    const day = parts[0].padStart(2, '0');
    const month =/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- Configuração do Firebase ---
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
function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/');
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[1].padStart(2, '0');
    const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear();
    return `${year}-${month}-${day}`;
}

// --- Carregamento e Migração de Dados em Tempo Real ---

// Esta é a "fonte da verdade" para a estrutura de status.
const canonicalStatuses = [
    { id: 'compras', label: 'Compras' }, { id: 'arte', label: 'Arte Final' },
    { id: 'impressao', label: 'Impressão' }, { id: 'acabamento', label: 'Acabamento' },
    { id: 'corte', label: 'Corte' }, { id: 'faturamento', label: 'Fat.' },
    { id: 'instalacao', label: 'Instalação' }, { id: 'entrega', label: 'Entrega' }
];

const q = query(tasksCollection, orderBy("deliveryDate", "asc"), orderBy("order", "asc"));

onSnapshot(q, (snapshot) => {
    const batch = writeBatch(db);
    let updatesNeeded = 0;

    tasks = snapshot.docs.map(documentSnapshot => {
        const data = documentSnapshot.data();
        let needsDBUpdate = false;
        const updates = {};

        // --- LÓGICA DE AUTO-CORREÇÃO (SELF-HEALING) ---
        const existingStatuses = data.statuses || [];
        const healedStatuses = canonicalStatuses.map(canonical => {
            const existing = existingStatuses.find(s => s.id === canonical.id);
            return {
                id: canonical.id,
                label: canonical.label,
                state: existing?.state || 'state-pending',
                date: existing?.date || ''
            };
        });

        // Se a estrutura dos status foi corrigida, marcamos para salvar no banco.
        if (JSON.stringify(existingStatuses) !== JSON.stringify(healedStatuses)) {
            updates.statuses = healedStatuses;
            needsDBUpdate = true;
        }
        
        // Mantém a verificação para os outros campos necessários
        if (data.deliveryDate === undefined) {
            updates.deliveryDate = convertDateToSortable(healedStatuses.find(s => s.id === 'entrega').date);
            needsDBUpdate = true;
        }
        if (data.order === undefined) {
            updates.order = 0;
            needsDBUpdate = true;
        }

        if (needsDBUpdate) {
            console.log(`Agendando auto-correção para a tarefa ${documentSnapshot.id}.`);
            const docRef = doc(db, "tasks", documentSnapshot.id);
            batch.update(docRef, updates);
            updatesNeeded++;
        }

        // Retorna a versão corrigida dos dados para a renderização
        return { 
            id: documentSnapshot.id, 
            ...data, // Dados originais
            ...updates // Adiciona os campos corrigidos (se houver)
        };
    });

    if (updatesNeeded > 0) {
        console.log(`Enviando ${updatesNeeded} atualizações de auto-correção em lote...`);
        batch.commit().catch(err => console.error("Erro ao salvar auto-correção:", err));
    }

    renderAllTasks(tasks);
    console.log("Dados carregados/atualizados do Firebase.");
}, (error) => {
    console.error("ERRO GRAVE AO CARREGAR DADOS:", error);
    kanbanBody.innerHTML = `<p style="text-align: center; color: red; padding: 20px; font-weight: bold;">Erro ao carregar os dados. Verifique o console para mais detalhes (F12).</p>`;
});

// --- LÓGICA DE EVENTOS (sem alterações) ---
addRowButton.addEventListener('click', async () => { /* ... */ });
kanbanBody.addEventListener('click', async (event) => { /* ... */ });
kanbanBody.addEventListener('change', async (event) => { /* ... */ });
// --- DRAG AND DROP --- (sem alterações)
// --- PESQUISA --- (sem alterações)

// O código abaixo é idêntico ao anterior e foi omitido por brevidade.
// Cole o código completo se estiver substituindo o arquivo inteiro.

addRowButton.addEventListener('click', async () => {
    const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order)) + 1 : 0;
    await addDoc(tasksCollection, {
        clientName: "Novo Cliente", osNumber: "OS: Nova", order: newOrder,
        deliveryDate: '9999-12-31',
        // Cria a tarefa já com a estrutura de status perfeita
        statuses: canonicalStatuses.map(s => ({ ...s, state: 'state-pending', date: '' }))
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
        const newStatuses = currentDoc.data().statuses.map(status => (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear();
    return `${year}-${month}-${day}`;
}

// --- Carregamento e Migração de Dados em Tempo Real ---
const q = query(tasksCollection, orderBy("deliveryDate", "asc"), orderBy("order", "asc"));

onSnapshot(q, (snapshot) => {
    const batch = writeBatch(db);
    let updatesNeeded = 0;

    tasks = snapshot.docs.map(documentSnapshot => {
        const data = documentSnapshot.data();
        let needsUpdate = false;
        let localData = { ...data }; // Cria uma cópia local para manipular
        const updates = {};

        // LÓGICA DE MIGRAÇÃO COMPLETA
        // 1. Garante que 'deliveryDate' existe
        if (localData.deliveryDate === undefined) {
            const entregaStatus = localData.statuses.find(s => s.id === 'entrega');
            updates.deliveryDate = convertDateToSortable(entregaStatus?.date || '');
            needsUpdate = true;
        }

        // 2. Garante que 'order' existe
        if (localData.order === undefined) {
            updates.order = 0;
            needsUpdate = true;
        }

        // 3. (CORREÇÃO) Garante que o status 'corte' existe
        const hasCorte = localData.statuses.some(s => s.id === 'corte');
        if (!hasCorte) {
            const newCorteStatus = { id: 'corte', label: 'Corte', state: 'state-pending', date: '' };
            const acabamentoIndex = localData.statuses.findIndex(s => s.id === 'acabamento');
            
            // Modifica a cópia local do array de status
            const newStatuses = [...localData.statuses];
            newStatuses.splice(acabamentoIndex + 1, 0, newCorteStatus);
            
            // Adiciona o array de status completo ao payload de atualização
            updates.statuses = newStatuses; 
            localData.statuses = newStatuses; // Atualiza a cópia local para a renderização imediata
            needsUpdate = true;
        }

        // Se algo precisar ser atualizado, adiciona ao batch
        if (needsUpdate) {
            console.log(`Agendando atualização para a tarefa ${documentSnapshot.id} (migração de dados).`);
            const docRef = doc(db, "tasks", documentSnapshot.id); 
            batch.update(docRef, updates);
            updatesNeeded++;
        }

        // Retorna a cópia local dos dados, já corrigida para a renderização
        return { id: documentSnapshot.id, ...localData };
    });

    if (updatesNeeded > 0) {
        console.log(`Enviando ${updatesNeeded} atualizações em lote...`);
        batch.commit().then(() => {
            console.log("Migração de dados em lote concluída com sucesso.");
        }).catch(err => {
            console.error("Erro ao executar a migração de dados em lote:", err);
        });
    }

    renderAllTasks(tasks);
    console.log("Dados carregados/atualizados do Firebase.");
}, (error) => {
    console.error("ERRO GRAVE AO CARREGAR DADOS:", error);
    kanbanBody.innerHTML = `<p style="text-align: center; color: red; padding: 20px; font-weight: bold;">Erro ao carregar os dados. Verifique o console para mais detalhes (F12).</p>`;
});


// --- Lógica de Eventos (O restante do código não foi alterado) ---

addRowButton.addEventListener('click', async () => {
    const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1 : 0;
    await addDoc(tasksCollection, {
        clientName: "Novo Cliente", osNumber: "OS: Nova", order: newOrder,
        deliveryDate: '9999-12-31',
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
                 {
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

        if (statusId === 'entrega') {
            updateData.deliveryDate = convertDateToSortable(input.value);
        }
        await updateDoc(docRef, updateData);
    }
});

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
```const nextIndex = (currentIndex + 1) % states.length;
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