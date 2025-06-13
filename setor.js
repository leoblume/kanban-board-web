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

// A ordem dos setores é crucial para a lógica de dependência.
// Esta lista deve ser a mesma do script.js
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

// Função auxiliar para formatar a data para exibição (yyyy-mm-dd -> dd/mm)
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

    taskListContainer.innerHTML = ''; // Limpa a lista
    tasksToRender.forEach(task => {
        const sectorStatus = task.statuses.find(s => s.id === sectorId);
        if (!sectorStatus) return;

        let executionDate;
        if (sectorStatus.date) {
            executionDate = sectorStatus.date;
        } else {
            const today = new Date();
            const day = String(today.getDate()).padStart(2, '0');
            const month = String(today.getMonth() + 1).padStart(2, '0');
            executionDate = `${day}/${month}`;
        }

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
        const allTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            deliveryDateDisplay: formatDisplayDate(doc.data().deliveryDate)
        }));

        // *** CORREÇÃO DEFINITIVA APLICADA AQUI ***
        const filteredTasks = allTasks.filter(task => {
            // Regra 1: Ignora a tarefa se qualquer etapa estiver bloqueada.
            if (task.statuses.some(s => s.state === 'state-blocked')) {
                return false;
            }

            // Regra 2: A tarefa deve estar 'pendente' ou 'em andamento' neste setor.
            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            if (!sectorStatus || (sectorStatus.state !== 'state-pending' && sectorStatus.state !== 'state-in-progress')) {
                return false;
            }

            // Regra 3: A etapa ANTERIOR deve estar 'concluída'.
            const currentIndex = canonicalStatuses.findIndex(s => s.id === sectorId);

            // Se for o primeiro setor (Compras), não há etapa anterior, então ele está sempre liberado.
            if (currentIndex === 0) {
                return true;
            }

            // Para os outros setores, verifica a etapa anterior.
            const previousSectorId = canonicalStatuses[currentIndex - 1].id;
            const previousSectorStatus = task.statuses.find(s => s.id === previousSectorId);

            // A etapa anterior deve existir e estar 'concluída' para liberar a atual.
            return previousSectorStatus && previousSectorStatus.state === 'state-done';
        });

        renderTasks(filteredTasks);

    }, (error) => {
        console.error("Erro ao carregar tarefas do setor: ", error);
        taskListContainer.innerHTML = '<p class="error-message">Não foi possível carregar as tarefas.</p>';
    });
}

// Event listener para ciclar o status da tarefa (sem alterações, mas mantido para integridade)
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
        const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];

        const newStatuses = taskData.statuses.map(status => {
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
// --- END OF FILE setor.js ---