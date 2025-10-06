// --- Importações do Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDoc, writeBatch, setDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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
const scheduleCollection = collection(db, "schedule");

// --- Seletores de Elementos DOM ---
const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchCounter = document.getElementById('search-counter');
const exportPdfButton = document.getElementById('export-pdf-button');
const weeklySchedulePanel = document.getElementById('weekly-schedule-panel');
const hideScheduleButton = document.getElementById('hide-schedule-button');
const showScheduleButton = document.getElementById('show-schedule-button');

// --- LÓGICA CENTRAL ROBUSTA ---
let tasks = [];
// Adicionado 'serralheria' e garantido que 'entrega' está presente para o kanban
const canonicalStatuses = [ 
    { id: 'compras', label: 'Compras' }, 
    { id: 'arte', label: 'Arte Final' }, 
    { id: 'impressao', label: 'Impressão' }, 
    { id: 'acabamento', label: 'Acabamento' }, 
    { id: 'corte', label: 'Corte' }, 
    { id: 'faturamento', label: 'Fat.' }, 
    { id: 'serralheria', label: 'Serralheria' }, // Novo status
    { id: 'instalacao', label: 'Instalação' }, 
    { id: 'entrega', label: 'Entrega' }
];

function healStatuses(statusesArray = []) { 
    return canonicalStatuses.map(canonical => { 
        const existing = statusesArray.find(s => s.id === canonical.id); 
        return { id: canonical.id, label: canonical.label, state: existing?.state || 'state-pending', date: existing?.date || '' }; 
    }); 
}

function convertDateToSortable(dateStr) { 
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31'; 
    const parts = dateStr.split('/'); 
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31'; 
    const day = parts[0].padStart(2, '0'); 
    const month = parts[1].padStart(2, '0'); 
    const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear(); 
    return `${year}-${month}-${day}`; 
}

// Mapeamento de status para classes de cores para a agenda
const statusColorClasses = {
    'arte': 'schedule-item-arte',
    'impressao': 'schedule-item-impressao',
    'acabamento': 'schedule-item-acabamento',
    'corte': 'schedule-item-corte',
    'serralheria': 'schedule-item-serralheria',
    'instalacao': 'schedule-item-instalacao',
    // Adicione um default ou para outros status se necessário
    'compras': 'schedule-item-default',
    'faturamento': 'schedule-item-default',
    'entrega': 'schedule-item-default'
};

// --- Função de Renderização com a Correção Definitiva ---
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
                    <div class="status-control">
                        <button class="status-button ${s.state}" data-status-id="${s.id}"></button>
                        <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id="${s.id}">
                    </div>
                </div>
            `).join('')}
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


// --- LISTENERS (KANBAN) ---
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
        if (JSON.stringify(data.statuses || []) !== JSON.stringify(healedStatuses)) { 
            updates.statuses = healedStatuses; 
            correctedData.statuses = healedStatuses; 
            needsDBUpdate = true; 
        } 
        if (correctedData.deliveryDate === undefined) { 
            const deliveryDate = convertDateToSortable(healedStatuses.find(s => s.id === 'entrega')?.date); 
            updates.deliveryDate = deliveryDate; 
            correctedData.deliveryDate = deliveryDate; 
            needsDBUpdate = true; 
        } 
        if (correctedData.order === undefined) { 
            updates.order = Date.now(); 
            correctedData.order = updates.order; 
            needsDBUpdate = true; 
        } 
        if (needsDBUpdate) { 
            const docRef = doc(db, "tasks", documentSnapshot.id); 
            batch.update(docRef, updates); 
            updatesNeeded++; 
        } 
        return { id: documentSnapshot.id, ...correctedData }; 
    }); 
    if (updatesNeeded > 0) { 
        batch.commit().catch(err => console.error("Erro ao salvar auto-correção de dados:", err)); 
    } 
    renderAllTasks(tasks); 
}, (error) => { 
    console.error("ERRO GRAVE AO CARREGAR DADOS:", error); 
    kanbanBody.innerHTML = `<p style="text-align: center; color: red;">Erro ao carregar os dados.</p>`; 
});

addRowButton.addEventListener('click', async () => { 
    try { 
        const newOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1 : Date.now(); 
        await addDoc(tasksCollection, { 
            clientName: "Novo Cliente", 
            osNumber: "OS: Nova", 
            order: newOrder, 
            deliveryDate: '9999-12-31', 
            statuses: healStatuses([]) 
        }); 
    } catch (error) { 
        console.error("Erro ao adicionar nova tarefa:", error); 
    } 
});

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
            const task = tasks.find(t => t.id === docId); 
            if (task) { 
                const eventTitle = `Entrega: ${task.clientName} (${task.osNumber})`; 
                window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}`, '_blank'); 
            } 
        } 
    } catch (error) { 
        console.error(`Erro na ação do botão para a tarefa ${docId}:`, error); 
    } 
});

kanbanBody.addEventListener('change', async (event) => { 
    const input = event.target; 
    const row = input.closest('.kanban-row'); 
    if (!row || !input.matches('input[type="text"]')) return; 
    const docId = row.id; 
    const docRef = doc(db, "tasks", docId); 
    try { 
        let updateData = {}; 
        if (input.matches('.client-name-input')) { 
            updateData.clientName = input.value; 
        } else if (input.matches('.os-number-input')) { 
            updateData.osNumber = input.value; 
        } else if (input.matches('.status-date-input')) { 
            const statusId = input.dataset.statusId; 
            const docSnap = await getDoc(docRef); 
            if (!docSnap.exists()) return; 
            const completeStatuses = healStatuses(docSnap.data().statuses); 
            const newStatuses = completeStatuses.map(s => (s.id === statusId) ? { ...s, date: input.value } : s); 
            updateData.statuses = newStatuses; 
            if (statusId === 'entrega') { 
                updateData.deliveryDate = convertDateToSortable(input.value); 
            } 
        } 
        await updateDoc(docRef, updateData); 
    } catch (error) { 
        console.error(`Erro ao salvar alteração no campo para a tarefa ${docId}:`, error); 
    } 
});

// --- DRAG-AND-DROP (KANBAN) ---
kanbanBody.addEventListener('dragstart', (e) => { 
    const row = e.target.closest('.kanban-row');
    if (row) {
        const osNumber = row.querySelector('.os-number-input').value;
        const clientName = row.querySelector('.client-name-input').value;
        // Ao arrastar, enviaremos o OS e Cliente. O status será selecionado na agenda.
        e.dataTransfer.setData('application/json', JSON.stringify({ osNumber, clientName }));
        e.dataTransfer.effectAllowed = 'copyMove'; 
    }
});

// --- LÓGICA DA PROGRAMAÇÃO SEMANAL (AJUSTADA) ---
function renderScheduleItem(task) { // Agora recebe o objeto da tarefa agendada
    const item = document.createElement('div');
    // Adiciona a classe de cor com base no status salvo, ou um padrão
    item.className = `schedule-item ${statusColorClasses[task.statusId] || 'schedule-item-default'}`;
    item.dataset.os = task.osNumber;
    item.dataset.client = task.clientName;
    item.dataset.statusId = task.statusId; // Salva o status ID no dataset

    const clientName = task.clientName || '';
    let firstWord = clientName.split(' ')[0];
    if (firstWord.length > 8) {
        firstWord = firstWord.substring(0, 8);
    }
    const formattedText = `${task.osNumber} ${firstWord}`.trim();

    // Cria o dropdown de status
    const statusSelect = document.createElement('select');
    statusSelect.className = 'schedule-status-select';
    statusSelect.title = "Selecionar Setor/Status";
    canonicalStatuses.forEach(s => {
        if (s.id !== 'compras' && s.id !== 'faturamento' && s.id !== 'entrega') { // Filtra status para o dropdown
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.label;
            if (s.id === task.statusId) {
                option.selected = true;
            }
            statusSelect.appendChild(option);
        }
    });

    item.innerHTML = `
        <span class="schedule-item-text" title="${task.osNumber} ${task.clientName}">${formattedText}</span>
        <button class="delete-schedule-item-btn" title="Excluir">×</button>
    `;
    item.insertBefore(statusSelect, item.querySelector('.delete-schedule-item-btn')); // Insere o select antes do botão de excluir

    return item;
}

onSnapshot(scheduleCollection, (snapshot) => { 
    document.querySelectorAll('.drop-zone').forEach(zone => zone.innerHTML = ''); 
    snapshot.forEach(doc => { 
        const dayId = doc.id; 
        const tasks = doc.data().tasks || []; 
        const zone = document.getElementById(dayId); 
        if (zone) { 
            tasks.forEach(task => { 
                zone.appendChild(renderScheduleItem(task)); // Passa o objeto completo da tarefa
            }); 
        } 
    }); 
});

weeklySchedulePanel.addEventListener('dragover', e => { 
    e.preventDefault(); 
    const dropZone = e.target.closest('.drop-zone'); 
    if (dropZone) dropZone.classList.add('drag-over'); 
});

weeklySchedulePanel.addEventListener('dragleave', e => { 
    const dropZone = e.target.closest('.drop-zone'); 
    if (dropZone) dropZone.classList.remove('drag-over'); 
});

weeklySchedulePanel.addEventListener('drop', async e => { 
    e.preventDefault(); 
    const dropZone = e.target.closest('.drop-zone'); 
    if (dropZone) { 
        dropZone.classList.remove('drag-over'); 
        try { 
            const taskDataTransfer = JSON.parse(e.dataTransfer.getData('application/json')); 
            if (taskDataTransfer && taskDataTransfer.osNumber && taskDataTransfer.clientName) { 
                const dayId = dropZone.id;
                // Ao adicionar, definimos um status inicial (ex: 'arte' ou o primeiro da lista)
                const initialStatusId = 'arte'; 
                const taskToSchedule = { 
                    osNumber: taskDataTransfer.osNumber, 
                    clientName: taskDataTransfer.clientName,
                    statusId: initialStatusId // Adiciona o status inicial
                };
                const scheduleDocRef = doc(db, "schedule", dayId);
                await setDoc(scheduleDocRef, { tasks: arrayUnion(taskToSchedule) }, { merge: true });
            }
        } catch (error) { 
            console.error("Erro ao salvar na programação:", error); 
        } 
    } 
});

weeklySchedulePanel.addEventListener('click', async e => { 
    if (e.target.classList.contains('delete-schedule-item-btn')) { 
        const item = e.target.closest('.schedule-item'); 
        const zone = e.target.closest('.drop-zone'); 
        if (item && zone) { 
            const taskToRemove = { 
                osNumber: item.dataset.os, 
                clientName: item.dataset.client,
                statusId: item.dataset.statusId // Importante para remover o item correto
            }; 
            const dayId = zone.id; 
            const scheduleDocRef = doc(db, "schedule", dayId); 
            try { 
                await updateDoc(scheduleDocRef, { tasks: arrayRemove(taskToRemove) }); 
            } catch (error) { 
                console.error("Erro ao excluir da programação:", error); 
            } 
        } 
    } 
});

// Listener para a mudança no select de status
weeklySchedulePanel.addEventListener('change', async e => {
    if (e.target.classList.contains('schedule-status-select')) {
        const select = e.target;
        const item = select.closest('.schedule-item');
        const zone = select.closest('.drop-zone');

        if (item && zone) {
            const oldStatusId = item.dataset.statusId;
            const newStatusId = select.value;

            const taskToUpdate = {
                osNumber: item.dataset.os,
                clientName: item.dataset.client,
                statusId: oldStatusId
            };

            const updatedTask = {
                osNumber: item.dataset.os,
                clientName: item.dataset.client,
                statusId: newStatusId
            };

            const dayId = zone.id;
            const scheduleDocRef = doc(db, "schedule", dayId);

            try {
                // Remove o item antigo e adiciona o item atualizado com o novo status
                const docSnap = await getDoc(scheduleDocRef);
                if (docSnap.exists()) {
                    let currentTasks = docSnap.data().tasks || [];
                    currentTasks = currentTasks.filter(t => 
                        !(t.osNumber === taskToUpdate.osNumber && 
                          t.clientName === taskToUpdate.clientName && 
                          t.statusId === taskToUpdate.statusId)
                    );
                    currentTasks.push(updatedTask);
                    await updateDoc(scheduleDocRef, { tasks: currentTasks });
                }
            } catch (error) {
                console.error("Erro ao atualizar status do item na programação:", error);
            }
        }
    }
});


// --- LÓGICA PARA MOSTRAR/OCULTAR PAINEL ---
const setSchedulePanelVisibility = (isHidden) => {
    document.body.classList.toggle('schedule-is-hidden', isHidden);
    localStorage.setItem('scheduleHidden', isHidden ? 'true' : 'false');
};
hideScheduleButton.addEventListener('click', () => setSchedulePanelVisibility(true));
showScheduleButton.addEventListener('click', () => setSchedulePanelVisibility(false));

// --- INICIALIZAÇÃO E EVENTOS GLOBAIS ---
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('scheduleHidden') === 'true') {
        setSchedulePanelVisibility(true);
    }
    window.addEventListener('scroll', handleStickyHeader);
    window.addEventListener('resize', handleStickyHeader);
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    searchInput.addEventListener('input', clearSearchState);
    exportPdfButton.addEventListener('click', exportToPDF);
});

// --- PESQUISA, HEADER FIXO, PDF ---
let currentSearchTerm = ''; let currentMatchingIndices = []; let searchResultPointer = -1; const clearSearchState = () => { currentSearchTerm = ''; currentMatchingIndices = []; searchResultPointer = -1; searchCounter.textContent = ''; document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight')); }; const handleSearch = () => { const newSearchTerm = searchInput.value.toLowerCase().trim(); if (!newSearchTerm) { clearSearchState(); return; } if (newSearchTerm !== currentSearchTerm) { currentSearchTerm = newSearchTerm; currentMatchingIndices = tasks.reduce((acc, task, index) => { if ((task.clientName || '').toLowerCase().includes(currentSearchTerm) || (task.osNumber || '').toLowerCase().includes(currentSearchTerm)) { acc.push(index); } return acc; }, []); searchResultPointer = -1; } if (currentMatchingIndices.length === 0) { searchCounter.textContent = '0/0'; alert('Nenhum item encontrado.'); return; } searchResultPointer = (searchResultPointer + 1) % currentMatchingIndices.length; const taskIndexToShow = currentMatchingIndices[searchResultPointer]; const foundTask = tasks[taskIndexToShow]; const foundRow = document.getElementById(foundTask.id); if (foundRow) { document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight')); foundRow.scrollIntoView({ behavior: 'smooth', block: 'center' }); foundRow.classList.add('highlight'); searchCounter.textContent = `${searchResultPointer + 1}/${currentMatchingIndices.length}`; } }; function handleStickyHeader() { const header = document.querySelector('.kanban-header'); const placeholder = document.querySelector('.header-placeholder'); const kanbanTable = document.querySelector('.kanban-table'); if (!header || !placeholder || !kanbanTable) return; const scrollTriggerPoint = kanbanTable.offsetTop; if (window.pageYOffset > scrollTriggerPoint) { if (!header.classList.contains('is-sticky')) { header.classList.add('is-sticky'); placeholder.style.display = 'block'; } const rect = kanbanTable.getBoundingClientRect(); placeholder.style.height = `${header.offsetHeight}px`; header.style.width = `${rect.width}px`; header.style.left = `${rect.left}px`; } else { if (header.classList.contains('is-sticky')) { header.classList.remove('is-sticky'); header.style.width = ''; header.style.left = ''; placeholder.style.display = 'none'; } } } const exportToPDF = async () => { const contentToPrint = document.querySelector('.kanban-board'); const originalButtonText = exportPdfButton.querySelector('span').textContent; exportPdfButton.disabled = true; exportPdfButton.querySelector('span').textContent = 'Exportando...'; document.querySelectorAll('.kanban-row').forEach(row => { const clientCell = row.querySelector('.cell-client'); const osInput = row.querySelector('.os-number-input'); const clientInput = row.querySelector('.client-name-input'); if (clientCell && osInput && clientInput) { const tempDiv = document.createElement('div'); tempDiv.className = 'pdf-client-info'; tempDiv.innerHTML = `<span class="pdf-os">${osInput.value}</span><span class="pdf-client">${clientInput.value}</span>`; clientCell.appendChild(tempDiv); } row.querySelectorAll('.status-control').forEach(control => { const dateInput = control.querySelector('.status-date-input'); if (dateInput && dateInput.value) { const tempSpan = document.createElement('span'); tempSpan.className = 'pdf-date-text'; tempSpan.textContent = dateInput.value; control.insertBefore(tempSpan, dateInput); } }); }); document.body.classList.add('print-mode'); try { const { jsPDF } = window.jspdf; const canvas = await html2canvas(contentToPrint, { scale: 2, useCORS: true, logging: false }); const pdf = new jsPDF('l', 'mm', 'a4'); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = pdf.internal.pageSize.getHeight(); const canvasAspectRatio = canvas.width / canvas.height; let finalPdfHeight = pdfHeight - 20; let finalPdfWidth = finalPdfHeight / canvasAspectRatio; if (finalPdfWidth > pdfWidth - 20) { finalPdfWidth = pdfWidth - 20; finalPdfHeight = finalPdfWidth * canvasAspectRatio; } let position = 0; let heightLeft = canvas.height * (finalPdfWidth / canvas.width); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, finalPdfWidth, finalPdfHeight); heightLeft -= (pdfHeight - 20); while (heightLeft > 0) { position -= (pdfHeight - 20); pdf.addPage(); pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, position + 10, finalPdfWidth, finalPdfHeight); heightLeft -= (pdfHeight - 20); } pdf.save('quadro-kanban.pdf'); } catch (error) { console.error("Erro ao gerar o PDF:", error); alert("Ocorreu um erro ao gerar o PDF."); } finally { document.body.classList.remove('print-mode'); document.querySelectorAll('.pdf-client-info, .pdf-date-text').forEach(el => el.remove()); exportPdfButton.disabled = false; exportPdfButton.querySelector('span').textContent = originalButtonText; } };
