import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Suas configurações do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyALCIfOdzUrbzs8_ceXXYFwsCeT161OFPw",
  authDomain: "kanban-board-92ce7.firebaseapp.com",
  projectId: "kanban-board-92ce7",
  storageBucket: "kanban-board-92ce7.appspot.com",
  messagingSenderId: "494809291125",
  appId: "1:494809291125:web:17f9eefa4287d39174db3c"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, "tasks");

// Configuração do worker do pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// --- FUNÇÃO DE IMPORTAÇÃO DE PDF ---
window.extractData = async function () {
  const fileInput = document.getElementById('pdfFile');
  const file = fileInput.files[0];
  const resultArea = document.getElementById('resultArea');
  resultArea.innerHTML = "Processando PDF...";

  if (!file) {
    alert("Por favor, selecione um arquivo PDF.");
    resultArea.innerHTML = "Aguardando ação...";
    return;
  }

  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const typedarray = new Uint8Array(reader.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const sortedItems = content.items.sort((a, b) => (Math.abs(a.transform[5] - b.transform[5]) > 5 ? b.transform[5] - a.transform[5] : a.transform[4] - b.transform[4]));
        fullText += sortedItems.map(item => item.str).join(' ');
      }
      
      fullText = fullText.replace(/Total OSs.*?:\s*\d+/g, '').replace(/\s{2,}/g, ' ');

      const regex = /(\d{5})\s+(.*?)\s+PRO\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}\s+(\d{2}\/\d{2}\/\d{4})/g;
      
      let match;
      let count = 0;
      let outputHTML = "<h3>Log de Importação:</h3><ul>";
      const tasksToProcess = [];

      while ((match = regex.exec(fullText)) !== null) {
        tasksToProcess.push({ os: match[1], clientAndDesc: match[2].trim(), prevEnt: match[3] });
      }

      if (tasksToProcess.length === 0) {
        outputHTML += "<li class='warning'>⚠️ Nenhum dado de OS encontrado no PDF.</li>";
      }

      for (const task of tasksToProcess) {
        const { os, clientAndDesc, prevEnt } = task;
        let { clientName, description } = splitClientAndDescription(clientAndDesc);
        
        const q = query(tasksCollection, where("osNumber", "==", os));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const existingDoc = snapshot.docs[0];
          const docRef = doc(db, "tasks", existingDoc.id);
          const updatedStatuses = existingDoc.data().statuses.map(s => (s.id === "entrega" ? { ...s, date: prevEnt } : s));
          await updateDoc(docRef, { clientName: clientName, description: description, statuses: updatedStatuses });
          outputHTML += `<li class='warning'>🔄 Atualizado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
        } else {
          await addDoc(tasksCollection, {
            osNumber: os, clientName: clientName, description: description,
            order: Date.now() + count,
            deliveryDate: convertDateToSortable(prevEnt),
            statuses: [
              { id: 'compras', label: 'Compras', state: 'state-pending', date: '' },
              { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
              { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' },
              { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
              { id: 'corte', label: 'Corte', state: 'state-pending', date: '' },
              { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' },
              { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
              { id: 'entrega', label: 'Entrega', state: 'state-pending', date: prevEnt }
            ]
          });
          outputHTML += `<li class='success'>✅ Importado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
        }
        count++;
      }
      outputHTML += `</ul><p><strong>Total de itens processados: ${count}</strong></p>`;
      resultArea.innerHTML = outputHTML;
      fileInput.value = '';

    } catch (error) {
      console.error("Erro ao processar o PDF:", error);
      resultArea.innerHTML = `<p style="color: red;"><strong>Erro:</strong> Falha ao processar o arquivo PDF. Verifique o console.</p>`;
    }
  };
  reader.readAsArrayBuffer(file);
};

// --- FUNÇÃO DE MIGRAÇÃO/MANUTENÇÃO DE DADOS ---
window.runMigration = async function() {
    const resultArea = document.getElementById('resultArea');
    const migrationButton = document.getElementById('migration-button');
    migrationButton.disabled = true;
    migrationButton.textContent = "Verificando...";
    resultArea.innerHTML = "🚀 Iniciando manutenção de dados...";
    
    try {
        const querySnapshot = await getDocs(collection(db, "tasks"));
        const batch = writeBatch(db);
        let updatesNeeded = 0;
        let logHTML = "<h3>Log de Manutenção:</h3><ul>";

        logHTML += `<li>🔍 Encontradas ${querySnapshot.size} tarefas para verificação.</li>`;

        querySnapshot.forEach((document) => {
            const data = document.data();
            let needsUpdate = false;
            const updates = {};
            let logMessage = '';

            if (data.deliveryDate === undefined) {
                const entregaStatus = data.statuses.find(s => s.id === 'entrega');
                updates.deliveryDate = convertDateToSortable(entregaStatus?.date || '');
                needsUpdate = true;
                logMessage += ' [deliveryDate adicionado] ';
            }
            if (data.order === undefined) {
                updates.order = 0;
                needsUpdate = true;
                logMessage += ' [order adicionado] ';
            }
            const hasCorte = data.statuses.some(s => s.id === 'corte');
            if (!hasCorte) {
                const newStatuses = [...data.statuses];
                newStatuses.splice(4, 0, { id: 'corte', label: 'Corte', state: 'state-pending', date: '' });
                updates.statuses = newStatuses;
                needsUpdate = true;
                logMessage += ' [status Corte adicionado] ';
            }

            if (needsUpdate) {
                logHTML += `<li class="warning">🔧 Corrigindo OS ${data.osNumber || document.id}:${logMessage}</li>`;
                const docRef = doc(db, "tasks", document.id);
                batch.update(docRef, updates);
                updatesNeeded++;
            }
        });

        if (updatesNeeded > 0) {
            logHTML += `<li>Enviando ${updatesNeeded} atualizações para o banco de dados...</li>`;
            await batch.commit();
            logHTML += `<li class="success">🎉 SUCESSO! Manutenção concluída!</li>`;
        } else {
            logHTML += `<li class="success">👍 Nenhuma tarefa precisou de correção. Seus dados já estão atualizados.</li>`;
        }
        
        resultArea.innerHTML = logHTML + "</ul>";

    } catch (error) {
        resultArea.innerHTML = `<p style="color: red;"><strong>Erro na manutenção:</strong> ${error.message}. Verifique o console.</p>`;
        console.error("Erro na manutenção:", error);
    } finally {
        migrationButton.disabled = false;
        migrationButton.textContent = "Executar Manutenção de Dados";
    }
}

// --- Funções Auxiliares ---
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

function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/');
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear();
    return `${year}-${month}-${day}`;
}