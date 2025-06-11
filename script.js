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

const kanbanBody = document.getElementById('kanban-body');
const addRowButton = document.getElementById('add-row-button');
const pdfUploadInput = document.getElementById('pdf-upload');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchCounter = document.getElementById('search-counter');

// --- Estado Local ---
let tasks = [];
let currentSearchTerm = '', currentMatchingIndices = [], searchResultPointer = -1;

// --- Configuração do Worker da PDF.js ---
pdfjsLib.GlobalWorkerOptions.workerSrc = `//mozilla.github.io/pdf.js/build/pdf.worker.js`;

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
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName}">
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber}">
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

// --- Carregamento em Tempo Real ---
onSnapshot(query(tasksCollection, orderBy("order")), (snapshot) => {
    tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllTasks(tasks);
    console.log("Dados carregados/atualizados do Firebase.");
}, (error) => {
    console.error("Erro ao carregar dados: ", error);
});

// --- LÓGICA DO INTERPRETADOR DE PDF ---
const parseAndCreateTasksFromPdf = async (text) => {
    const lines = text.split('\n').map(line => line.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const records = [];
    const osLineRegex = /^(\d{5})\s+(.+?)\s+PRO\s+.*?(\d{2}\/\d{2}\/\d{4})$/;

    for (const line of lines) {
        const match = line.match(osLineRegex);
        if (match) {
            records.push({
                os: match[1],
                client: match[2],
                prevEntr: match[3]
            });
        }
    }
    
    if (records.length === 0) {
        alert("Nenhuma tarefa no formato esperado foi encontrada no PDF. Verifique se o relatório está correto.");
        return;
    }

    const batch = writeBatch(db);
    let currentOrder = tasks.length;
    records.forEach(record => {
        const newDocRef = doc(collection(db, "tasks"));
        batch.set(newDocRef, {
            clientName: record.client, osNumber: `OS: ${record.os}`, order: currentOrder++,
            statuses: [
                { id: 'compras', label: 'Compras', state: 'state-pending', date: '' },
                { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
                { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' },
                { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
                { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' },
                { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
                { id: 'entrega', label: 'Entrega', state: 'state-pending', date: record.prevEntr }
            ]
        });
    });

    try {
        await batch.commit();
        alert(`${records.length} tarefa(s) importada(s) com sucesso!`);
    } catch (error) {
        console.error("Erro ao salvar tarefas em lote:", error);
        alert("Falha ao salvar as tarefas importadas.");
    }
};

const handlePdfUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async () => {
        const typedarray = new Uint8Array(fileReader.result);
        try {
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(" ") + "\n";
            }
            parseAndCreateTasksFromPdf(fullText);
        } catch (error) {
            console.error("Erro ao ler PDF:", error);
        }
    };
    fileReader.readAsArrayBuffer(file);
    event.target.value = null;
};

// --- LÓGICA DE EVENTOS PRINCIPAIS ---
pdfUploadInput.addEventListener('change', handlePdfUpload);
addRowButton.addEventListener('click', async () => {
    const newOrder = tasks.length;
    await addDoc(tasksCollection, {
        clientName: "Novo Cliente", osNumber: "OS: Nova", order: newOrder,
        statuses: [
            { id: 'compras', label: 'Compras', state: 'state-pending', date: '' }, { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
            { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' }, { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
            { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' }, { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
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
        const states = ['state-pending', 'state-done', 'state-blocked'];
        const statusId = button.dataset.statusId;
        const currentDoc = await getDoc(docRef);
        const newStatuses = currentDoc.data().statuses.map(status => {
            if (status.id === statusId) {
                const currentState = states.find(s => status.state === s) || 'state-blocked';
                const nextIndex = (states.indexOf(currentState) + 1) % states.length;
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
        await updateDoc(docRef, { statuses: newStatuses });
    }
});

// --- DRAG AND DROP ---
kanbanBody.addEventListener('dragstart', (e) => { if (e.target.classList.contains('kanban-row')) e.target.classList.add('dragging'); });
kanbanBody.addEventListener('dragend', async () => {
    document.querySelector('.dragging')?.classList.remove('dragging');
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
