
// --- Importações do Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const exportPdfButton = document.getElementById('export-pdf-button');
const globalSchedulePanel = document.getElementById('global-schedule-panel'); // Novo seletor

// --- LÓGICA DO QUADRO KANBAN (TAREFAS) ---
let tasks = [];
const canonicalStatuses = [ { id: 'compras', label: 'Compras' }, { id: 'arte', label: 'Arte Final' }, { id: 'impressao', label: 'Impressão' }, { id: 'acabamento', label: 'Acabamento' }, { id: 'corte', label: 'Corte' }, { id: 'faturamento', label: 'Fat.' }, { id: 'instalacao', label: 'Instalação' }, { id: 'entrega', label: 'Entrega' }];

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

function convertDateToSortable(dateStr) { if (!dateStr || !dateStr.includes('/')) return '9999-12-31'; const parts = dateStr.split('/'); if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31'; const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear(); return `${year}-${month}-${day}`; }

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
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber || ''}">
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName || ''}">
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
                <button class="action-button calendar-button" title="Adicionar à Agenda"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> </button>
                <button class="action-button delete-button" title="Excluir Linha">×</button>
            </div>
        `;
        kanbanBody.appendChild(rowElement);
    });
};

const q = query(tasksCollection, orderBy("deliveryDate", "asc"), orderBy("order", "asc"));
onSnapshot(q, (snapshot) => {
    // ... Lógica de auto-correção das tarefas ... (sem alterações aqui)
    tasks = snapshot.docs.map(documentSnapshot => ({ id: documentSnapshot.id, ...documentSnapshot.data() }));
    renderAllTasks(tasks);
    console.log("Dados das tarefas carregados/atualizados.");
}, (error) => {
    console.error("ERRO GRAVE AO CARREGAR DADOS DAS TAREFAS:", error);
    kanbanBody.innerHTML = `<p style="color: red;">Erro ao carregar as tarefas.</p>`;
});

addRowButton.addEventListener('click', async () => {
    try {
        const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1 : Date.now();
        await addDoc(tasksCollection, {
            clientName: "Novo Cliente",
            osNumber: "OS: Nova",
            order: newOrder,
            deliveryDate: '9999-12-31',
            statuses: healStatuses([]) // Apenas os status, sem programação
        });
    } catch (error) {
        console.error("Erro ao adicionar nova tarefa:", error);
        alert("Falha ao adicionar a nova tarefa.");
    }
});

// ... Todos os outros event listeners do KANBAN (click, change, drag-drop, etc) permanecem os mesmos ...
// (O código foi omitido para brevidade, mas ele continua o mesmo de antes)
kanbanBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.kanban-row');
    if (!row) return;
    const docId = row.id;
    const docRef = doc(db, "tasks", docId);

    try {
        if (button.classList.contains('delete-button')) {
            await deleteDoc(docRef);
        } else if (button.classList.contains('status-button')) {
            const states = ['state-pending', 'state-in-progress', 'state-done', 'state-blocked'];
            const statusId = button.dataset.statusId;
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const completeStatuses = healStatuses(docSnap.data().statuses);
            const newStatuses = completeStatuses.map(status => (status.id === statusId) ? { ...status, state: states[(states.indexOf(status.state) + 1) % states.length] } : status);
            await updateDoc(docRef, { statuses: newStatuses });
        } else if (button.classList.contains('calendar-button')) {
            // ...
        }
    } catch (error) {
        console.error(`Erro ao executar ação no botão '${button.className}' para a tarefa ${docId}:`, error);
        alert("Ocorreu um erro ao executar a ação. Por favor, tente novamente.");
    }
});
kanbanBody.addEventListener('change', async (event) => {
    const input = event.target;
    const row = input.closest('.kanban-row');
    if (!row || !input.matches('input[type="text"]')) return;
    const docId = row.id;
    const docRef = doc(db, "tasks", docId);

    try {
        if (input.matches('.client-name-input')) {
            await updateDoc(docRef, { clientName: input.value });
        } else if (input.matches('.os-number-input')) {
            await updateDoc(docRef, { osNumber: input.value });
        } else if (input.matches('.status-date-input')) {
            const statusId = input.dataset.statusId;
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const completeStatuses = healStatuses(docSnap.data().statuses);
            const newStatuses = completeStatuses.map(s => (s.id === statusId) ? { ...s, date: input.value } : s);
            const updateData = { statuses: newStatuses };
            if (statusId === 'entrega') {
                updateData.deliveryDate = convertDateToSortable(input.value);
            }
            await updateDoc(docRef, updateData);
        }
    } catch (error) {
        console.error(`Erro ao salvar alteração no campo '${input.className}' para a tarefa ${docId}:`, error);
        alert("Houve um erro ao salvar sua alteração.");
    }
});


// --- NOVA LÓGICA PARA O PAINEL DE PROGRAMAÇÃO SEMANAL GLOBAL ---

const scheduleDocRef = doc(db, "schedules", "globalWeekly");

// Função para gerar o objeto de dados padrão da programação
const getDefaultScheduleData = () => {
    const defaultDay = ["", "", "", ""];
    const defaultWeek = {
        segunda: [...defaultDay],
        terca: [...defaultDay],
        quarta: [...defaultDay],
        quinta: [...defaultDay],
        sexta: [...defaultDay],
    };
    return {
        semana1: defaultWeek,
        semana2: { ...defaultWeek }, // Cria uma cópia para a segunda semana
    };
};

// Função para renderizar o HTML do painel global
const renderGlobalSchedule = (scheduleData) => {
    const weekDays = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    const renderWeekHTML = (weekKey, weekData) => `
        <div class="weekly-schedule-week">
            ${weekDays.map(day => `
                <div class="weekly-schedule-day">
                    <div class="weekly-schedule-header">${day.charAt(0).toUpperCase() + day.slice(1)}</div>
                    ${(weekData[day] || ["", "", "", ""]).map((text, index) => `
                        <input 
                            type="text" 
                            class="weekly-schedule-input" 
                            value="${text || ''}" 
                            data-week="${weekKey}" 
                            data-day="${day}" 
                            data-slot="${index}">
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;

    globalSchedulePanel.innerHTML = `
        <h2>Programação Semanal</h2>
        <div class="weekly-schedule-container">
            ${renderWeekHTML('semana1', scheduleData.semana1)}
            ${renderWeekHTML('semana2', scheduleData.semana2)}
        </div>
    `;
};

// Listener para carregar e atualizar o painel de programação
onSnapshot(scheduleDocRef, (docSnap) => {
    if (docSnap.exists()) {
        console.log("Dados da programação global carregados.");
        renderGlobalSchedule(docSnap.data());
    } else {
        console.log("Criando documento de programação global padrão.");
        const defaultData = getDefaultScheduleData();
        // Usa setDoc para criar o documento, pois ele pode não existir
        setDoc(scheduleDocRef, defaultData).then(() => {
            renderGlobalSchedule(defaultData);
        });
    }
}, (error) => {
    console.error("ERRO AO CARREGAR DADOS DA PROGRAMAÇÃO GLOBAL:", error);
    globalSchedulePanel.innerHTML = `<p style="color: red;">Erro ao carregar a programação semanal.</p>`;
});

// Listener para salvar as alterações feitas no painel de programação
globalSchedulePanel.addEventListener('change', async (event) => {
    const input = event.target;
    if (!input.matches('.weekly-schedule-input')) return;

    const { week, day, slot } = input.dataset;
    const value = input.value;

    // Constrói o caminho do campo para o Firestore usando notação de ponto
    // Ex: 'semana1.segunda.0'
    const fieldPath = `${week}.${day}.${slot}`;

    try {
        // Atualiza apenas o campo específico que foi alterado
        await updateDoc(scheduleDocRef, { [fieldPath]: value });
        console.log(`Programação atualizada: ${fieldPath} = ${value}`);
    } catch (error) {
        console.error("Erro ao salvar a alteração na programação:", error);
        alert("Não foi possível salvar a alteração na programação.");
    }
});
