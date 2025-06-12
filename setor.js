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

// Obter o ID e o nome do setor a partir dos parâmetros da URL
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

function renderTasks(tasksToRender) {
    if (tasksToRender.length === 0) {
        taskListContainer.innerHTML = '<p class="no-tasks-message">Nenhuma tarefa pendente para este setor no momento.</p>';
        return;
    }

    taskListContainer.innerHTML = ''; // Limpa a lista
    tasksToRender.forEach(task => {
        const sectorStatus = task.statuses.find(s => s.id === sectorId);
        if (!sectorStatus) return;

        const taskElement = document.createElement('div');
        taskElement.className = 'sector-task-card';
        taskElement.dataset.docId = task.id;

        taskElement.innerHTML = `
            <div class="sector-task-info">
                <span class="sector-task-os">${task.osNumber}</span>
                <span class="sector-task-client">${task.clientName}</span>
                <span class="sector-task-delivery">Entrega: ${task.deliveryDateDisplay || 'N/D'}</span>
            </div>
            <div class="sector-task-action">
                <span>Marcar como Concluído:</span>
                <button class="status-button ${sectorStatus.state}" title="Clique para marcar como 'Concluído'"></button>
            </div>
        `;
        taskListContainer.appendChild(taskElement);
    });
}

function loadSectorTasks() {
    // Ordena pela data de entrega, que foi adicionada no script.js principal
    const q = query(tasksCollection, orderBy("deliveryDate"));

    onSnapshot(q, (snapshot) => {
        const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Filtra as tarefas de acordo com as regras especificadas
        const filteredTasks = allTasks.filter(task => {
            // Regra 1: A tarefa não pode ter NENHUM status bloqueado (vermelho)
            const isBlocked = task.statuses.some(s => s.state === 'state-blocked');
            if (isBlocked) {
                return false;
            }

            // Regra 2: O status específico deste setor deve existir e estar "em andamento" (azul)
            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            return sectorStatus && sectorStatus.state === 'state-in-progress';
        });

        renderTasks(filteredTasks);

    }, (error) => {
        console.error("Erro ao carregar tarefas do setor: ", error);
        taskListContainer.innerHTML = '<p class="error-message">Não foi possível carregar as tarefas.</p>';
    });
}

// Event listener para marcar a tarefa como concluída
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
            // Ação permitida: Mudar o status APENAS para 'concluído'
            if (status.id === sectorId) {
                return { ...status, state: 'state-done' };
            }
            return status;
        });

        await updateDoc(docRef, { statuses: newStatuses });
        // A UI se atualizará automaticamente graças ao onSnapshot
    } catch (error) {
        console.error("Erro ao atualizar o status: ", error);
        alert("Ocorreu um erro ao tentar atualizar a tarefa.");
    }
});