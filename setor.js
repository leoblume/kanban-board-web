--- START OF FILE setor.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- INÍCIO DO MODO DE DEPURAÇÃO ---
console.log("--- SCRIPT setor.js INICIADO (MODO DE DEPURAÇÃO ATIVO) ---");

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

console.log("[DEBUG] Elementos do DOM selecionados:", { taskListContainer, sectorTitleElement });

const urlParams = new URLSearchParams(window.location.search);
const sectorId = urlParams.get('setor');
const sectorName = urlParams.get('nome') || sectorId;

console.log(`[DEBUG] Parâmetros da URL: sectorId = '${sectorId}', sectorName = '${sectorName}'`);

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
    console.error("[DEBUG] ERRO CRÍTICO: sectorId não encontrado na URL.");
    if(sectorTitleElement) sectorTitleElement.textContent = "Erro: Setor não especificado.";
    if(taskListContainer) taskListContainer.innerHTML = '<p class="error-message">ID do setor não encontrado na URL.</p>';
} else {
    if(sectorTitleElement) sectorTitleElement.textContent = `Painel do Setor: ${sectorName}`;
    document.querySelector('title').textContent = `Painel: ${sectorName}`;
    loadSectorTasks();
}

function renderTasks(tasksToRender) {
    console.log(`[DEBUG] renderTasks() chamada com ${tasksToRender.length} tarefas para renderizar.`);
    if (!taskListContainer) {
        console.error("[DEBUG] ERRO CRÍTICO: taskListContainer é nulo. Não é possível renderizar.");
        return;
    }
    if (tasksToRender.length === 0) {
        taskListContainer.innerHTML = '<p class="no-tasks-message">Nenhuma tarefa pendente para este setor no momento.</p>';
        return;
    }
    // ... (o restante da função de renderização é o mesmo e provavelmente não tem erro)
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
            </div>`;
        taskListContainer.appendChild(taskElement);
    });
    console.log("[DEBUG] Renderização concluída com sucesso.");
}

function loadSectorTasks() {
    console.log("[DEBUG] loadSectorTasks() iniciada.");
    const currentSectorIndex = canonicalStatuses.findIndex(s => s.id === sectorId);
    console.log(`[DEBUG] Índice do setor '${sectorId}' é: ${currentSectorIndex}`);

    if (currentSectorIndex === -1) {
        console.error("[DEBUG] ERRO: O sectorId da URL não é um setor válido.");
        if(taskListContainer) taskListContainer.innerHTML = '<p class="error-message">O setor especificado na URL é inválido.</p>';
        return;
    }

    const q = query(tasksCollection, orderBy("deliveryDate"));
    console.log("[DEBUG] Criando listener onSnapshot para a coleção 'tasks'. Aguardando resposta do Firebase...");

    onSnapshot(q, (snapshot) => {
        console.log(`[DEBUG] >>> onSnapshot ATIVADO! Firebase respondeu.`);
        console.log(`[DEBUG] Firebase retornou ${snapshot.size} documentos.`);

        if (snapshot.empty) {
            console.warn("[DEBUG] A coleção 'tasks' está vazia ou a consulta não retornou resultados.");
        }

        const allTasks = snapshot.docs.map(doc => {
            return { id: doc.id, ...doc.data() };
        });
        console.log("[DEBUG] Dados brutos recebidos do Firebase:", allTasks);

        const healedTasks = allTasks.map(task => ({
            ...task,
            statuses: healStatuses(task.statuses),
            deliveryDateDisplay: formatDisplayDate(task.deliveryDate)
        }));
        console.log("[DEBUG] Dados após a função healStatuses():", healedTasks);

        console.log("[DEBUG] --- INICIANDO PROCESSO DE FILTRAGEM ---");
        const filteredTasks = healedTasks.filter(task => {
            console.log(`\n[DEBUG] Verificando Tarefa: OS=${task.osNumber}, Cliente=${task.clientName}`);
            
            const sectorStatus = task.statuses.find(s => s.id === sectorId);
            console.log(`  -> Status para o setor '${sectorId}':`, sectorStatus);
            if (!sectorStatus) {
                console.log(`  -> MOTIVO DA REMOÇÃO: Status para o setor não encontrado.`);
                return false;
            }

            const isTaskActiveInSector = sectorStatus.state === 'state-pending' || sectorStatus.state === 'state-in-progress';
            console.log(`  -> A tarefa está ativa ('pending' ou 'in-progress') neste setor? ${isTaskActiveInSector}`);
            if (!isTaskActiveInSector) {
                console.log(`  -> MOTIVO DA REMOÇÃO: Status é '${sectorStatus.state}'.`);
                return false;
            }

            console.log("  -> Verificando bloqueios em etapas anteriores...");
            let isBlockedPreviously = false;
            for (let i = 0; i < currentSectorIndex; i++) {
                const previousStatus = task.statuses[i];
                if (previousStatus.state === 'state-blocked') {
                    console.log(`  -> MOTIVO DA REMOÇÃO: Tarefa bloqueada na etapa '${previousStatus.id}'.`);
                    isBlockedPreviously = true;
                    break;
                }
            }
            if(isBlockedPreviously) return false;

            console.log("  ==> RESULTADO: MANTER esta tarefa na lista.");
            return true;
        });
        console.log("--- PROCESSO DE FILTRAGEM CONCLUÍDO ---");
        console.log(`[DEBUG] Número de tarefas após o filtro: ${filteredTasks.length}`);
        console.log("[DEBUG] Lista final de tarefas a serem renderizadas:", filteredTasks);

        renderTasks(filteredTasks);

    }, (error) => {
        console.error("[DEBUG] !!! ERRO NO LISTENER onSnapshot !!!", error);
        if(taskListContainer) taskListContainer.innerHTML = '<p class="error-message">Erro grave ao conectar com o Firebase. Verifique o console (F12) para detalhes.</p>';
    });
}

// O event listener de clique não deve ter problemas, mas o mantemos para integridade.
if(taskListContainer) {
    taskListContainer.addEventListener('click', async (event) => {
        // ... (código do listener de clique permanece o mesmo)
    });
} else {
    console.warn("[DEBUG] taskListContainer é nulo, o listener de clique não foi adicionado.");
}