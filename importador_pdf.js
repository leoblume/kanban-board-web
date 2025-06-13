--- START OF FILE importador_pdf.js ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Seletores de elementos da nova UI
const fileInput = document.getElementById('pdfFile');
const importButton = document.getElementById('importButton');
const resultArea = document.getElementById('resultArea');
const deletionArea = document.getElementById('deletionArea');
const deleteList = document.getElementById('deleteList');
const deleteButton = document.getElementById('deleteButton');

// Lógica de extração e sincronização totalmente refeita
window.extractData = async function () {
  const file = fileInput.files[0];
  if (!file) {
    alert("Por favor, selecione um arquivo PDF.");
    return;
  }

  // --- Feedback visual para o usuário ---
  importButton.disabled = true;
  importButton.textContent = "Processando...";
  resultArea.style.display = 'block';
  resultArea.innerHTML = "Lendo PDF...";
  deletionArea.style.display = 'none';

  try {
    // ETAPA 1: Extrair OS do PDF
    const pdfOsDataMap = await getOsFromPdf(file);
    resultArea.innerHTML = `PDF lido. ${pdfOsDataMap.size} OS encontradas. Comparando com o banco de dados...`;
    
    // ETAPA 2: Buscar todos os dados do Firebase
    const dbTasksSnapshot = await getDocs(tasksCollection);
    const dbTasks = dbTasksSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // ETAPA 3: Processar atualizações e novas entradas
    const { updatedCount, importedCount, importLogHTML } = await processPdfTasks(pdfOsDataMap, dbTasks);

    // ETAPA 4: Identificar tarefas para exclusão
    const tasksToDelete = dbTasks.filter(task => {
      // Regra 1: Não está no PDF
      const notInPdf = !pdfOsDataMap.has(task.osNumber);
      // Regra 2: Não é uma entrada manual (ignora OS com 5 digitos começando com '1')
      const isManualEntry = task.osNumber && task.osNumber.startsWith('1') && task.osNumber.length === 5;
      return notInPdf && !isManualEntry;
    });

    // ETAPA 5: Renderizar os resultados
    resultArea.innerHTML = `<h3>Resultados da Sincronização</h3>
                            <p><strong>Total de itens processados no PDF: ${pdfOsDataMap.size}</strong></p>
                            <ul>
                               <li class="imported">✅ Criados: ${importedCount}</li>
                               <li class="updated">🔄 Atualizados: ${updatedCount}</li>
                            </ul>
                            <br>
                            <strong>Log detalhado:</strong>
                            <ul>${importLogHTML}</ul>`;

    if (tasksToDelete.length > 0) {
      renderDeletionCandidates(tasksToDelete);
    } else {
      deletionArea.style.display = 'block';
      deletionArea.innerHTML = '<h2>Itens não encontrados no PDF</h2><p>✅ Sincronização perfeita! Nenhuma tarefa precisou ser removida.</p>';
    }

  } catch (error) {
    console.error("Erro no processo de sincronização:", error);
    resultArea.innerHTML = `<p style="color: red;"><strong>Erro:</strong> ${error.message}. Verifique o console.</p>`;
  } finally {
    importButton.disabled = false;
    importButton.textContent = "Analisar e Sincronizar";
    fileInput.value = '';
  }
};

async function getOsFromPdf(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = async function () {
            try {
                const typedarray = new Uint8Array(reader.result);
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    // Ordena o texto para reconstruir a ordem das linhas corretamente
                    const sortedItems = content.items.sort((a, b) => (Math.abs(a.transform[5] - b.transform[5]) > 5) ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]);
                    fullText += sortedItems.map(item => item.str).join(' ');
                }
                
                fullText = fullText.replace(/Total OSs.*?:\s*\d+/g, '').replace(/\s{2,}/g, ' ');
                const regex = /(\d{5})\s+(.*?)\s+PRO\s+.*?(\d{2}\/\d{2}\/\d{4})/g;
                
                const osDataMap = new Map();
                let match;
                while ((match = regex.exec(fullText)) !== null) {
                    osDataMap.set(match[1], { os: match[1], clientAndDesc: match[2].trim(), prevEnt: match[3] });
                }
                resolve(osDataMap);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function processPdfTasks(pdfOsDataMap, dbTasks) {
    let updatedCount = 0;
    let importedCount = 0;
    let importLogHTML = "";
    
    const dbOsMap = new Map(dbTasks.map(task => [task.osNumber, task]));
    const batch = writeBatch(db);

    for (const [os, pdfTaskData] of pdfOsDataMap.entries()) {
        const { clientAndDesc, prevEnt } = pdfTaskData;
        let { clientName, description } = splitClientAndDescription(clientAndDesc);
        
        const existingTask = dbOsMap.get(os);

        if (existingTask) {
            // Atualiza existente
            const docRef = doc(db, "tasks", existingTask.id);
            const currentStatuses = existingTask.statuses || [];
            const updatedStatuses = healStatuses(currentStatuses).map(s => s.id === "entrega" ? { ...s, date: prevEnt } : s);
            
            batch.update(docRef, { 
                clientName: clientName, 
                description: description, 
                statuses: updatedStatuses,
                deliveryDate: convertDateToSortable(prevEnt)
            });
            importLogHTML += `<li class="updated">🔄 Atualizado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
            updatedCount++;
        } else {
            // Adiciona novo
            const newDocRef = doc(collection(db, "tasks")); // Cria referência para novo doc
            batch.set(newDocRef, {
                osNumber: os, clientName, description,
                order: Date.now() + importedCount, // Garante ordem única
                deliveryDate: convertDateToSortable(prevEnt),
                statuses: healStatuses([{ id: 'entrega', date: prevEnt }])
            });
            importLogHTML += `<li class="imported">✅ Importado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
            importedCount++;
        }
    }
    
    if(updatedCount > 0 || importedCount > 0){
        await batch.commit();
    }
    
    return { updatedCount, importedCount, importLogHTML };
}

function renderDeletionCandidates(tasks) {
    deletionArea.style.display = 'block';
    deleteList.innerHTML = tasks.map(task => `
        <li class="todelete">
            <label>
                <input type="checkbox" class="delete-checkbox" data-doc-id="${task.id}" checked>
                <strong>OS: ${task.osNumber}</strong> - ${task.clientName}
            </label>
        </li>
    `).join('');
    
    deleteButton.style.display = 'block';
}

deleteButton.addEventListener('click', async () => {
    const checkboxes = deleteList.querySelectorAll('.delete-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Nenhum item selecionado para remoção.");
        return;
    }

    if (!confirm(`Tem certeza que deseja remover ${checkboxes.length} item(ns) permanentemente?`)) {
        return;
    }

    deleteButton.disabled = true;
    deleteButton.textContent = "Removendo...";

    const batch = writeBatch(db);
    checkboxes.forEach(cb => {
        const docId = cb.dataset.docId;
        batch.delete(doc(db, "tasks", docId));
    });

    try {
        await batch.commit();
        alert(`${checkboxes.length} item(ns) removido(s) com sucesso!`);
        // Limpa a UI após a remoção
        deletionArea.innerHTML = '<h2>Itens não encontrados no PDF</h2><p>✅ Itens selecionados foram removidos com sucesso.</p>';
        deleteButton.style.display = 'none';
    } catch (error) {
        console.error("Erro ao remover tarefas:", error);
        alert("Ocorreu um erro ao remover as tarefas.");
    } finally {
        deleteButton.disabled = false;
        deleteButton.textContent = "Remover Selecionados";
    }
});


// --- Funções Auxiliares ---
const canonicalStatuses = [ { id: 'compras', label: 'Compras' }, { id: 'arte', label: 'Arte Final' }, { id: 'impressao', label: 'Impressão' }, { id: 'acabamento', label: 'Acabamento' }, { id: 'corte', label: 'Corte' }, { id: 'faturamento', label: 'Faturamento' }, { id: 'instalacao', label: 'Instalação' }, { id: 'entrega', label: 'Entrega' }];

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

function convertDateToSortable(dateStr) { 
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/'); 
    if (parts.length < 3) return '9999-12-31'; 
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function splitClientAndDescription(combinedString) { 
    const descKeywords = ['REPARO', 'LETRA CAIXA', 'ADESIVO', 'PERSONALIZAÇÃO', 'RETIRADA', 'LONA COM IMPRESSÃO', 'TROCA DE LONA', 'ESTRUTURAS E LONA', 'BANNER EM LONA', 'PAINEL BACKLIGHT', 'PLOTER RECORTE', 'CRACHÁ', 'MANUTENÇÃO DE', 'SINALÉTICA DOCAS', 'WIND BANNER', 'TECIDO WIND', 'CÓPIA DE LETRAS', 'IMPRESSÃO E APLICAÇÃO', 'FACHADA EM ACM', 'PLAQUINHAS', 'COMUNICAÇÃO', 'LONAS COM IMPRESSÃO', '(CORTESIA) ADESIVO']; 
    let clientName = combinedString; 
    let description = ''; 
    for (const keyword of descKeywords) { 
        const index = combinedString.indexOf(keyword); 
        if (index > 0) { 
            clientName = combinedString.substring(0, index).trim().replace(/[\s-]*$/, ''); 
            description = combinedString.substring(index).trim(); 
            return { clientName, description }; 
        } 
    } 
    return { clientName: combinedString.trim(), description: "Não especificada" }; 
}