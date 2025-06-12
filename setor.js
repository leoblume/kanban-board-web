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

if (!sectorId) {
    sectorTitleElement.textContent = "Erro: Setor não especificado.";
} else {
    sectorTitleElement.textContent = `Painel do Setor: ${sectorName}`;
    pageTitleElement.textContent = `Painel: ${sectorName}`;
    loadSectorTasks();
}

// ALTERAÇÃO 3: Função auxiliar para obter a data de exibição
function getDisplayDate(dateString) {
    if (dateString && dateString.trim() !== '') {
        return dateString;
    }
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Mês é 0-indexado
    return `${day}/${month}`;
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
        
        // ALTERAÇÃO 3: Buscar as datas
        const deliveryStatus = task.statuses.find(s => s.id === 'entrega');
        
        const sectorDisplayDate = getDisplayDate(sectorStatus.date);
        const finalDisplayDate = getDisplayDate(deliveryStatus?.date || '');

        const taskElement = document.createElement('div');
        taskElement.className = 'sector-task-card';
        taskElement.dataset.docId = task.id;

        // ALTERAÇÃO 3: Atualizado o HTML para incluir as datas
        taskElement.innerHTML = `
            <div class="sector-task-header">
                <div class="sector-task-info">
                    <span class="sector-task-os">${task.osNumber}</span>
                    <span class="sector-task-client">${task.clientName}</span>
                </div>
                <div class="sector-task-action">
                    <span>Marcar como Concluído:</span>
                    <button class="status-button ${sectorStatus.state}" title="Clique para marcar como 'Concluído'"></button>
                </div>
            </div>
            <div class="sector-task-dates">
                <span class="date-label">Data Setor: <strong class="date-value">${sectorDisplayDate}</strong></span>
                <span class="date-label">Entrega Final: <strong class="date-value">${finalDisplayDate}</strong></span>
            </div>
        `;
        taskListContainer.appendChild(taskElement);
    });
}

function loadSectorTasks() {
    const q = query(tasksCollection, orderBy("deliveryDate"));

    onSnapshot(q, (snapshot) => {
        const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filteredTasks = allTasks.filter(task => {
            const isBlocked = task.statuses.some(s => s.state === 'state-blocked');
            if (isBlocked) {
                return false;
            }

            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            // Mostrar tarefas que estão 'em andamento' OU 'pendente' para este setor
            return sectorStatus && (sectorStatus.state === 'state-in-progress' || sectorStatus.state === 'state-pending');
        });

        renderTasks(filteredTasks);

    }, (error) => {
        console.error("Erro ao carregar tarefas do setor: ", error);
        taskListContainer.innerHTML = '<p class="error-message">Não foi possível carregar as tarefas.</p>';
    });
}

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
        const newStatuses = taskData.statuses.map(status => {
            if (status.id === sectorId) {
                // Alterna entre pendente, em progresso e concluído
                const currentState = status.state;
                let nextState = 'state-done'; // Por padrão, marca como concluído
                if (currentState === 'state-pending') {
                    nextState = 'state-in-progress';
                } else if (currentState === 'state-in-progress') {
                    nextState = 'state-done';
                }
                // Se já estiver 'done', o clique não faz nada, ou pode-se adicionar lógica para reverter.
                // Por enquanto, apenas avança para concluído.
                return { ...status, state: 'state-done' };
            }
            return status;
        });

        await updateDoc(docRef, { statuses: newStatuses });
    } catch (error) {
        console.error("Erro ao atualizar o status: ", error);
        alert("Ocorreu um erro ao tentar atualizar a tarefa.");
    }
});