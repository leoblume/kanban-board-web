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
const exportPdfButton = document.getElementById('export-pdf-button');
const schedulerContainer = document.querySelector('.weekly-scheduler-container');

// --- LÓGICA CENTRAL ROBUSTA ---
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

const renderAllTasks = (tasksToRender) => { kanbanBody.innerHTML = ''; tasksToRender.forEach(task => { const rowElement = document.createElement('div'); rowElement.className = 'kanban-row'; rowElement.draggable = true; rowElement.id = task.id; rowElement.innerHTML = ` <div class="cell cell-drag-handle" title="Arraste para reordenar ou agendar">⠿</div> <div class="cell cell-client"> <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber || ''}"> <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName || ''}"> </div> ${task.statuses.map(s => ` <div class="cell"> <span class="status-label-mobile">${s.label}</span> <div class="status-control"> <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id="${s.id}"> <button class="status-button ${s.state}" data-status-id="${s.id}"></button> </div> </div>`).join('')} <div class="cell cell-actions"> <button class="action-button calendar-button" title="Adicionar à Agenda Google"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg> </button> <button class="action-button delete-button" title="Excluir Linha">×</button> </div> `; kanbanBody.appendChild(rowElement); }); };

// --- LISTENER PRINCIPAL DO BANCO DE DADOS ---
const q = query(tasksCollection, orderBy("deliveryDate", "asc"), orderBy("order", "asc"));
onSnapshot(q, (snapshot) => {
    const batch = writeBatch(db);
    let updatesNeeded = 0;
    tasks = snapshot.docs.map(documentSnapshot => {
        const data = documentSnapshot.data();
        let needsDBUpdate = false;
        const updates = {};
        let correctedData = { ...data };
        const healedStatuses = healStatuses(data.statuses);
        if (JSON.stringify(data.statuses || []) !== JSON.stringify(healedStatuses)) { updates.statuses = healedStatuses; correctedData.statuses = healedStatuses; needsDBUpdate = true; }
        if (correctedData.deliveryDate === undefined) { const deliveryDate = convertDateToSortable(healedStatuses.find(s => s.id === 'entrega')?.date); updates.deliveryDate = deliveryDate; correctedData.deliveryDate = deliveryDate; needsDBUpdate = true; }
        if (correctedData.order === undefined) { updates.order = Date.now(); correctedData.order = updates.order; needsDBUpdate = true; }
        if (correctedData.scheduledDate === undefined) { updates.scheduledDate = null; correctedData.scheduledDate = null; needsDBUpdate = true; }
        if (needsDBUpdate) { const docRef = doc(db, "tasks", documentSnapshot.id); batch.update(docRef, updates); updatesNeeded++; }
        return { id: documentSnapshot.id, ...correctedData };
    });

    if (updatesNeeded > 0) {
        batch.commit().catch(err => console.error("Erro ao salvar auto-correção de dados:", err));
    }

    renderAllTasks(tasks);
    renderWeeklyScheduler(tasks);
    console.log("Dados carregados/atualizados do Firebase.");
}, (error) => {
    console.error("ERRO GRAVE AO CARREGAR DADOS:", error);
    kanbanBody.innerHTML = `<p style="text-align: center; color: red; padding: 20px; font-weight: bold;">Erro ao carregar os dados. Verifique o console (F12) e certifique-se de que o índice do Firebase está criado e ativado.</p>`;
});

// --- LÓGICA DO AGENDADOR SEMANAL ---
function getWeekDates(weekOffset = 0) {
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = (currentDay === 0) ? -6 : 1 - currentDay;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset + (weekOffset * 7));
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        weekDates.push(day);
    }
    return weekDates;
}

function formatDateToKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function renderWeeklyScheduler(allTasks) {
    const week1Dates = getWeekDates(0);
    const week2Dates = getWeekDates(1);
    const weekContainers = [document.querySelector('#week-1-container .week-grid'), document.querySelector('#week-2-container .week-grid')];
    const weekLabels = [document.getElementById('week-1-label'), document.getElementById('week-2-label')];
    
    const firstDayWeek1 = week1Dates[0].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    const lastDayWeek1 = week1Dates[4].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    weekLabels[0].textContent = `Semana Atual (${firstDayWeek1} - ${lastDayWeek1})`;
    
    const firstDayWeek2 = week2Dates[0].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    const lastDayWeek2 = week2Dates[4].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
    weekLabels[1].textContent = `Próxima Semana (${firstDayWeek2} - ${lastDayWeek2})`;

    weekContainers.forEach(container => container.innerHTML = '');

    [week1Dates, week2Dates].forEach((week, weekIndex) => {
        const container = weekContainers[weekIndex];
        week.forEach(date => {
            const dateKey = formatDateToKey(date);
            const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const dayNumber = date.getDate();

            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.innerHTML = `<div class="day-header">${dayName} ${dayNumber}</div><div class="day-slots" data-date="${dateKey}"></div>`;
            
            const daySlotsContainer = dayColumn.querySelector('.day-slots');
            const scheduledTasksForDay = allTasks.filter(t => t.scheduledDate === dateKey);
            
            let filledSlots = 0;
            scheduledTasksForDay.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = 'scheduled-task-item';
                taskElement.innerHTML = `<span class="info">${task.osNumber || ''} - ${task.clientName || ''}</span><button class="unschedule-button" data-task-id="${task.id}" title="Remover do agendamento">×</button>`;
                daySlotsContainer.appendChild(taskElement);
                filledSlots++;
            });

            for(let i = filledSlots; i < 4; i++) {
                 const slot = document.createElement('div');
                 slot.className = 'drop-slot';
                 daySlotsContainer.appendChild(slot);
            }
            container.appendChild(dayColumn);
        });
    });
}

// --- EVENT LISTENERS GERAIS ---
addRowButton.addEventListener('click', async () => {
    try {
        const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1 : Date.now();
        await addDoc(tasksCollection, {
            clientName: "Novo Cliente", osNumber: "OS: Nova", order: newOrder, deliveryDate: '9999-12-31', statuses: healStatuses([]), scheduledDate: null
        });
    } catch (error) { console.error("Erro ao adicionar nova tarefa:", error); alert("Falha ao adicionar a nova tarefa."); }
});

document.body.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.classList.contains('unschedule-button')) {
        const taskId = button.dataset.taskId;
        if (confirm("Tem certeza que deseja remover esta tarefa do agendamento?")) {
            try {
                const docRef = doc(db, "tasks", taskId);
                await updateDoc(docRef, { scheduledDate: null });
            } catch (error) { console.error("Erro ao desagendar tarefa:", error); alert("Falha ao remover a tarefa do agendamento."); }
        }
        return;
    }

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
            const task = tasks.find(t => t.id === docId);
            if (task) {
                const eventTitle = `Entrega: ${task.clientName} (${task.osNumber})`;
                const eventDetails = `Verificar detalhes da ${task.osNumber} para o cliente ${task.clientName}.`;
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&details=${encodeURIComponent(eventDetails)}`, '_blank');
            }
        }
    } catch (error) { console.error(`Erro ao executar ação no botão '${button.className}' para a tarefa ${docId}:`, error); alert("Ocorreu um erro ao executar a ação."); }
});

kanbanBody.addEventListener('change', async (event) => {
    const input = event.target;
    const row = input.closest('.kanban-row');
    if (!row || !input.matches('input[type="text"]')) return;
    const docId = row.id;
    const docRef = doc(db, "tasks", docId);

    try {
        if (input.matches('.client-name-input')) { await updateDoc(docRef, { clientName: input.value }); }
        else if (input.matches('.os-number-input')) { await updateDoc(docRef, { osNumber: input.value }); }
        else if (input.matches('.status-date-input')) {
            const statusId = input.dataset.statusId;
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;
            const completeStatuses = healStatuses(docSnap.data().statuses);
            const newStatuses = completeStatuses.map(s => (s.id === statusId) ? { ...s, date: input.value } : s);
            const updateData = { statuses: newStatuses };
            if (statusId === 'entrega') { updateData.deliveryDate = convertDateToSortable(input.value); }
            await updateDoc(docRef, updateData);
        }
    } catch (error) { console.error(`Erro ao salvar alteração no campo '${input.className}' para a tarefa ${docId}:`, error); alert("Houve um erro ao salvar sua alteração."); }
});

// --- LÓGICA DE DRAG-AND-DROP ---
kanbanBody.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('kanban-row')) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.id);
        e.dataTransfer.effectAllowed = 'move';
    }
});

kanbanBody.addEventListener('dragend', async (e) => {
    const draggingElement = document.querySelector('.dragging');
    if (!draggingElement) return;
    draggingElement.classList.remove('dragging');
    
    // Verifica se o drop foi fora do kanban (provavelmente no scheduler)
    // Se o dropEffect for 'none', significa que o drop não foi em um alvo válido para reordenação
    if (e.dataTransfer.dropEffect !== 'none') {
        const newOrderedIds = Array.from(kanbanBody.querySelectorAll('.kanban-row')).map(r => r.id);
        const batch = writeBatch(db);
        newOrderedIds.forEach((id, index) => {
            batch.update(doc(db, "tasks", id), { order: index });
        });
        try { await batch.commit(); } catch (error) { console.error("Erro ao salvar a nova ordem das tarefas:", error); }
    }
});

kanbanBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(kanbanBody, e.clientY);
    const draggingElement = document.querySelector('.dragging');
    if (draggingElement) {
        if (afterElement == null) { kanbanBody.appendChild(draggingElement); }
        else { kanbanBody.insertBefore(draggingElement, afterElement); }
    }
});
function getDragAfterElement(container, y) { const draggableElements = [...container.querySelectorAll('.kanban-row:not(.dragging)')]; return draggableElements.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) return { offset, element: child }; else return closest; }, { offset: Number.NEGATIVE_INFINITY }).element; }

schedulerContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetSlot = e.target.closest('.drop-slot');
    document.querySelectorAll('.drop-slot.drag-over').forEach(el => el.classList.remove('drag-over'));
    if (targetSlot) {
        targetSlot.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    }
});

schedulerContainer.addEventListener('dragleave', (e) => {
    e.target.closest('.drop-slot')?.classList.remove('drag-over');
});

schedulerContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    const targetSlot = e.target.closest('.drop-slot');
    if (targetSlot) {
        targetSlot.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const date = targetSlot.parentElement.dataset.date;
        
        if (taskId && date) {
            try {
                const docRef = doc(db, "tasks", taskId);
                await updateDoc(docRef, { scheduledDate: date });
            } catch (error) { console.error("Erro ao agendar tarefa:", error); alert("Falha ao agendar a tarefa."); }
        }
    }
});

// --- CÓDIGOS DE PESQUISA, HEADER FIXO, PDF (sem alterações) ---
let currentSearchTerm = ''; let currentMatchingIndices = []; let searchResultPointer = -1;
const clearSearchState = () => { currentSearchTerm = ''; currentMatchingIndices = []; searchResultPointer = -1; searchCounter.textContent = ''; document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight')); };
const handleSearch = () => { const newSearchTerm = searchInput.value.toLowerCase().trim(); if (!newSearchTerm) { clearSearchState(); return; } if (newSearchTerm !== currentSearchTerm) { currentSearchTerm = newSearchTerm; currentMatchingIndices = tasks.reduce((acc, task, index) => { if (task.clientName.toLowerCase().includes(currentSearchTerm) || task.osNumber.toLowerCase().includes(currentSearchTerm)) { acc.push(index); } return acc; }, []); searchResultPointer = -1; } if (currentMatchingIndices.length === 0) { searchCounter.textContent = '0/0'; alert('Nenhum item encontrado.'); return; } searchResultPointer = (searchResultPointer + 1) % currentMatchingIndices.length; const taskIndexToShow = currentMatchingIndices[searchResultPointer]; const foundTask = tasks[taskIndexToShow]; const foundRow = document.getElementById(foundTask.id); if (foundRow) { document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight')); foundRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); foundRow.classList.add('highlight'); searchCounter.textContent = `${searchResultPointer + 1}/${currentMatchingIndices.length}`; } };
searchButton.addEventListener('click', handleSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
searchInput.addEventListener('input', clearSearchState);

function handleStickyHeader() { const header = document.querySelector('.kanban-header'); const placeholder = document.querySelector('.header-placeholder'); const kanbanTable = document.querySelector('.kanban-table'); if (!header || !placeholder || !kanbanTable) return; const scrollTriggerPoint = kanbanTable.offsetTop; if (window.pageYOffset > scrollTriggerPoint) { if (!header.classList.contains('is-sticky')) { header.classList.add('is-sticky'); placeholder.style.display = 'block'; } const rect = kanbanTable.getBoundingClientRect(); placeholder.style.height = `${header.offsetHeight}px`; header.style.width = `${rect.width}px`; header.style.left = `${rect.left}px`; } else { if (header.classList.contains('is-sticky')) { header.classList.remove('is-sticky'); header.style.width = ''; header.style.left = ''; placeholder.style.display = 'none'; } } }
window.addEventListener('scroll', handleStickyHeader); window.addEventListener('resize', handleStickyHeader);

const exportToPDF = async () => { const contentToPrint = document.querySelector('.kanban-board'); const originalButtonText = exportPdfButton.querySelector('span').textContent; exportPdfButton.disabled = true; exportPdfButton.querySelector('span').textContent = 'Exportando...'; document.querySelectorAll('.kanban-row').forEach(row => { const clientCell = row.querySelector('.cell-client'); const osInput = row.querySelector('.os-number-input'); const clientInput = row.querySelector('.client-name-input'); if (clientCell && osInput && clientInput) { const tempDiv = document.createElement('div'); tempDiv.className = 'pdf-client-info'; tempDiv.innerHTML = `<span class="pdf-os">${osInput.value}</span><span class="pdf-client">${clientInput.value}</span>`; clientCell.appendChild(tempDiv); } row.querySelectorAll('.status-control').forEach(control => { const dateInput = control.querySelector('.status-date-input'); if (dateInput && dateInput.value) { const tempSpan = document.createElement('span'); tempSpan.className = 'pdf-date-text'; tempSpan.textContent = dateInput.value; control.insertBefore(tempSpan, dateInput); } }); }); document.body.classList.add('print-mode'); try { const canvas = await html2canvas(contentToPrint, { scale: 2, useCORS: true, logging: false }); const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const canvasAspectRatio = canvas.height / canvas.width; let finalPdfWidth = pdfWidth - 20; let finalPdfHeight = finalPdfWidth * canvasAspectRatio; let position = 0; let heightLeft = finalPdfHeight; pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, finalPdfWidth, finalPdfHeight); heightLeft -= (pdfHeight - 20); while (heightLeft > 0) { position -= (pdfHeight - 20); pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position, finalPdfWidth, finalPdfHeight); heightLeft -= (pdfHeight - 20); } pdf.save('quadro-kanban.pdf'); } catch (error) { console.error("Erro ao gerar o PDF:", error); alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes."); } finally { document.body.classList.remove('print-mode'); document.querySelectorAll('.pdf-client-info').forEach(div => div.remove()); document.querySelectorAll('.pdf-date-text').forEach(span => span.remove()); exportPdfButton.disabled = false; exportPdfButton.querySelector('span').textContent = originalButtonText; } };
exportPdfButton.addEventListener('click', exportToPDF);
