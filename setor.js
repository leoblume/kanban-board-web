// --- START OF FILE setor.js ---

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

// Lista canônica de status, essencial para a lógica de correção.
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

/**
 * Função de "cura": Garante que uma tarefa tenha todos os 8 status,
 * adicionando os que faltam como 'state-pending'.
 * @param {Array} statusesArray - A lista de status vinda do banco.
 * @returns {Array} A lista completa e corrigida de status.
 */
function healStatuses(statusesArray = []) {
    return canonicalStatuses.map(canonical => {
        const existing = statusesArray.find(s => s.id === canonical.id);
        return {
            id: canonical.id,
            label: canonical.label,
            state: existing?.state || 'state-pending',
            date: existing?.date || ''
        };
    });
}

// Função auxiliar para formatar a data para exibição
function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr.startsWith('9999')) return 'N/D';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
}

if (!sectorId) {
    sectorTitleElement.textContent = "Erro: Setor não especificado.";
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
        if (!sectorStatus) return;

        let executionDate = sectorStatus.date || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
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
    const q = query(tasksCollection, orderBy("deliveryDate"));

    onSnapshot(q, (snapshot) => {
        const allTasks = snapshot.docs.map(doc => {
            const data = doc.data();
            const healedStatuses = healStatuses(data.statuses); // Corrige os dados para exibição
            return {
                id: doc.id, ...data, statuses: healedStatuses,
                deliveryDateDisplay: formatDisplayDate(data.deliveryDate)
            };
        });
        
        const filteredTasks = allTasks.filter(task => {
            const isBlocked = task.statuses.some(s => s.state === 'state-blocked');
            if (isBlocked) return false;

            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            return sectorStatus && (sectorStatus.state === 'state-pending' || sectorStatus.state === 'state-in-progress');
        });

        renderTasks(filteredTasks);
    }, (error) => {
        console.error("Erro ao carregar tarefas do setor: ", error);
        taskListContainer.innerHTML = '<p class="error-message">Não foi possível carregar as tarefas.</p>';
    });
}

// Event listener para ciclar o status da tarefa
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
        
        // *** ESTA É A CORREÇÃO CRÍTICA NA GRAVAÇÃO ***
        // 1. "Cura" a lista de status lida do banco para garantir que ela esteja completa.
        const completeStatuses = healStatuses(taskData.statuses);
        
        const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];
        
        // 2. Mapeia sobre a lista COMPLETA para fazer a alteração.
        const newStatuses = completeStatuses.map(status => {
            if (status.id === sectorId) {
                const currentIndex = states.indexOf(status.state);
                const nextIndex = (currentIndex + 1) % states.length;
                return { ...status, state: states[nextIndex] };
            }
            return status;
        });

        // 3. Salva a lista COMPLETA e modificada de volta no banco.
        await updateDoc(docRef, { statuses: newStatuses });

    } catch (error) {
        console.error("Erro ao atualizar o status: ", error);
        alert("Ocorreu um erro ao tentar atualizar a tarefa.");
    }
});
// --- END OF FILE setor.js ---
