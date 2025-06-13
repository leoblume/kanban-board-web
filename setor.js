--- START OF FILE setor.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

const taskListContainer = document.getElementById('tasks-list');
const sectorTitleElement = document.getElementById('sector-title');
const pageTitleElement = document.querySelector('title');

const urlParams = new URLSearchParams(window.location.search);
const sectorId = urlParams.get('setor');
const sectorName = urlParams.get('nome') || sectorId;

const canonicalStatuses = [
    { id: 'compras', label: 'Compras' },
    { id: 'arte', label: 'Arte Final' },
    { id: 'impressao', label: 'Impressão' },
    { id: 'acabamento', label: 'Acabamento' },
    { id: 'corte', label: 'Corte' },
    { id: 'faturamento', label: 'Faturamento' },
    { id: 'instalacao', label: 'Instalação' },
    { id: 'entrega', label: 'Entrega' }
];

function healStatuses(statusesArray = []) {
    return canonicalStatuses.map(canonical => {
        const existing = statusesArray ? statusesArray.find(s => s.id === canonical.id) : null;
        return {
            id: canonical.id,
            label: canonical.label,
            state: existing?.state || 'state-pending',
            date: existing?.date || ''
        };
    });
}

function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr.startsWith('9999')) return 'N/D';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
}

if (!sectorId) {
    sectorTitleElement.textContent = "Erro: Setor não especificado.";
    taskListContainer.innerHTML = '<p class="error-message">ID do setor não encontrado na URL.</p>';
} else {
    sectorTitleElement.textContent = `Painel do Setor: ${sectorName}`;
    pageTitleElement.textContent = `Painel: ${sectorName}`;
    loadSectorTasks();
}

function renderTasks(tasksToRender) {
    if (tasksToRender.length === 0) {
        taskListContainer.innerHTML = '<p class="no-tasks-message">Nenhuma tarefa pendente para este setor no momento.</p>';
        return;
    }

    taskListContainer.innerHTML = '';
    tasksToRender.forEach(task => {
        const sectorStatus = task.statuses.find(s => s.id === sectorId);
        const executionDate = sectorStatus.date || 'Sem data';
        
        const taskElement = document.createElement('div');
        taskElement.className = 'sector-task-card';
        taskElement.dataset.docId = task.id;

        taskElement.innerHTML = `
            <span class="sector-task-os">${task.osNumber}</span>
            <span class="sector-task-client">${task.clientName}</span>
            <span class="sector-task-execution-date">Execução: ${executionDate}</span>
            <span class="sector-task-delivery">Entrega: ${task.deliveryDateDisplay}</span>
            <div class="sector-task-action">
                <button class="status-button ${sectorStatus.state}" title="Clique para alterar o status"></button>
            </div>
        `;
        taskListContainer.appendChild(taskElement);
    });
}

function loadSectorTasks() {
    // Encontra o índice do setor atual no fluxo de trabalho. Essencial para a lógica de bloqueio.
    const currentSectorIndex = canonicalStatuses.findIndex(s => s.id === sectorId);
    if (currentSectorIndex === -1) {
        console.error("ID de setor inválido fornecido na URL:", sectorId);
        taskListContainer.innerHTML = '<p class="error-message">O setor especificado na URL é inválido.</p>';
        return;
    }

    const q = query(tasksCollection, orderBy("deliveryDate"));

    onSnapshot(q, (snapshot) => {
        const allTasks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data, 
                statuses: healStatuses(data.statuses),
                deliveryDateDisplay: formatDisplayDate(data.deliveryDate)
            };
        });
        
        // --- LÓGICA DE FILTRO ROBUSTA E CORRIGIDA ---
        const filteredTasks = allTasks.filter(task => {
            // 1. Encontra o status específico para este setor de forma segura.
            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            
            // Verificação de segurança: se o status não for encontrado, ignora a tarefa.
            if (!sectorStatus) return false;

            // 2. REGRA PRINCIPAL: A tarefa deve estar ativa (Pendente ou Em Andamento) NESTE setor.
            const isTaskActiveInSector = sectorStatus.state === 'state-pending' || sectorStatus.state === 'state-in-progress';
            if (!isTaskActiveInSector) {
                return false;
            }

            // 3. REGRA DE BLOQUEIO: Se a tarefa estiver ativa, verificamos se alguma etapa ANTERIOR está bloqueada.
            // A função `healStatuses` garante que `task.statuses` está na ordem correta.
            for (let i = 0; i < currentSectorIndex; i++) {
                if (task.statuses[i].state === 'state-blocked') {
                    return false; // Encontrou um bloqueio em uma etapa anterior, então não mostrar.
                }
            }
            
            // Se passou por todas as verificações, a tarefa é válida para este painel.
            return true;
        });

        renderTasks(filteredTasks);

    }, (error) => {
        console.error("Erro ao carregar tarefas do setor: ", error);
        taskListContainer.innerHTML = '<p class="error-message">Não foi possível carregar as tarefas. Verifique o console para mais detalhes.</p>';
    });
}

// Event listener para ciclar o status da tarefa (sem alterações)
taskListContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('.status-button');
    if (!button) return;

    const card = button.closest('.sector-task-card');
    const docId = card.dataset.docId;
    const docRef = doc(db, "tasks", docId);

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;

        const taskData = docSnap.data();
        const completeStatuses = healStatuses(taskData.statuses);
        const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];
        
        const newStatuses = completeStatuses.map(status => {
            if (status.id === sectorId) {
                const currentIndex = states.indexOf(status.state);
                const nextIndex = (currentIndex + 1) % states.length;
                return { ...status, state: states[nextIndex] };
            }
            return status;
        });

        await updateDoc(docRef, { statuses: newStatuses });

    } catch (error) {
        console.error("Erro ao atualizar o status: ", error);
        alert("Ocorreu um erro ao tentar atualizar a tarefa.");
    }
});