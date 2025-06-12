import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Suas configurações do Firebase (mantidas como no original)
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

/**
 * Função principal para extrair dados do PDF, processá-los e salvar no Firebase.
 */
window.extractData = async function () {
  const fileInput = document.getElementById('pdfFile');
  const file = fileInput.files[0];
  const resultArea = document.getElementById('resultArea');
  resultArea.innerHTML = "Processando..."; // Feedback para o usuário

  if (!file) {
    alert("Por favor, selecione um arquivo PDF.");
    resultArea.innerHTML = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async function () {
    try {
      const typedarray = new Uint8Array(reader.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      let fullText = '';

      // ETAPA 1: Extrair e ORDENAR o texto de cada página
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        const sortedItems = content.items.sort((a, b) => {
          const yA = a.transform[5]; const yB = b.transform[5];
          const xA = a.transform[4]; const xB = b.transform[4];
          if (Math.abs(yA - yB) > 5) { return yB - yA; }
          return xA - xB;
        });
        fullText += sortedItems.map(item => item.str).join(' ');
      }
      
      fullText = fullText.replace(/Total OSs.*?:\s*\d+/g, '').replace(/\s{2,}/g, ' ');
      const regex = /(\d{5})\s+(.*?)\s+PRO\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+(\d{2}\/\d{2}\/\d{4})/g;
      
      let match;
      let count = 0;
      let outputHTML = "<h3>Resultado da Importação:</h3><ul>";
      const tasksToProcess = [];

      while ((match = regex.exec(fullText)) !== null) {
        tasksToProcess.push({ os: match[1], clientAndDesc: match[2].trim(), prevEnt: match[3] });
      }

      if (tasksToProcess.length === 0) {
        outputHTML += "<li>⚠️ Nenhum dado de OS encontrado. Verifique o formato do PDF ou a extração de texto.</li>";
      }

      for (const task of tasksToProcess) {
        const { os, clientAndDesc, prevEnt } = task;
        let { clientName, description } = splitClientAndDescription(clientAndDesc);
        
        const q = query(tasksCollection, where("osNumber", "==", os));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const existingDoc = snapshot.docs[0];
          const docRef = doc(db, "tasks", existingDoc.id);
          const updatedStatuses = existingDoc.data().statuses.map(s => s.id === "entrega" ? { ...s, date: prevEnt } : s);
          
          await updateDoc(docRef, { 
            clientName: clientName, 
            description: description, 
            statuses: updatedStatuses,
            deliveryDate: convertDateToSortable(prevEnt) // Atualiza também o campo de ordenação
          });
          outputHTML += `<li>🔄 Atualizado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
        } else {
          // MODIFICADO: Adicionado o status 'corte' e o campo 'deliveryDate'
          await addDoc(tasksCollection, {
            osNumber: os,
            clientName: clientName,
            description: description,
            order: Date.now() + count,
            deliveryDate: convertDateToSortable(prevEnt), // <-- CAMPO ADICIONADO PARA ORDENAÇÃO
            statuses: [
              { id: 'compras', label: 'Compras', state: 'state-pending', date: '' },
              { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
              { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' },
              { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
              { id: 'corte', label: 'Corte', state: 'state-pending', date: '' }, // <-- CAMPO ADICIONADO
              { id: 'faturamento', label: 'Faturamento', state: 'state-pending', date: '' },
              { id: 'instalacao', label: 'Instalação', state: 'state-pending', date: '' },
              { id: 'entrega', label: 'Entrega', state: 'state-pending', date: prevEnt }
            ]
          });
          outputHTML += `<li>✅ Importado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
        }
        count++;
      }

      outputHTML += `</ul><p><strong>Total de itens processados: ${count}</strong></p>`;
      resultArea.innerHTML = outputHTML;
      fileInput.value = '';

    } catch (error) {
      console.error("Erro ao processar o PDF:", error);
      resultArea.innerHTML = `<p style="color: red;"><strong>Erro:</strong> Falha ao processar o arquivo PDF. Verifique o console para mais detalhes.</p>`;
    }
  };

  reader.readAsArrayBuffer(file);
};

/**
 * Função auxiliar para converter a data para um formato ordenável.
 * @param {string} dateStr - A data no formato "dd/mm/yyyy"
 * @returns {string} A data no formato "yyyy-mm-dd"
 */
function convertDateToSortable(dateStr) {
    if (!dateStr || !dateStr.includes('/')) return '9999-12-31';
    const parts = dateStr.split('/');
    if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear();
    return `${year}-${month}-${day}`;
}

/**
 * Separa a string "Cliente + Descrição" em duas partes.
 * @param {string} combinedString - A string contendo nome do cliente e descrição juntos.
 * @returns {{clientName: string, description: string}}
 */
function splitClientAndDescription(combinedString) {
  // A sua lógica de separação (heurística) permanece a mesma.
  const descKeywords = [
    'REPARO', 'LETRA CAIXA', 'ADESIVO', 'PERSONALIZAÇÃO', 'RETIRADA', 'LONA COM IMPRESSÃO', 'TROCA DE LONA',
    'ESTRUTURAS E LONA', 'BANNER EM LONA', 'PAINEL BACKLIGHT', 'PLOTER RECORTE', 'CRACHÁ', 'MANUTENÇÃO DE',
    'SINALÉTICA DOCAS', 'WIND BANNER', 'TECIDO WIND', 'CÓPIA DE LETRAS', 'IMPRESSÃO E APLICAÇÃO',
    'FACHADA EM ACM', 'PLAQUINHAS', 'COMUNICAÇÃO', 'LONAS COM IMPRESSÃO', '(CORTESIA) ADESIVO'
  ];

  let clientName = combinedString;
  let description = '';

  for (const keyword of descKeywords) {
    const index = combinedString.indexOf(keyword);
    if (index > 0) {
      clientName = combinedString.substring(0, index).trim();
      description = combinedString.substring(index).trim();
      clientName = clientName.replace(/[\s-]*$/, '');
      return { clientName, description };
    }
  }
  return { clientName: combinedString.trim(), description: "Não especificada" };
}