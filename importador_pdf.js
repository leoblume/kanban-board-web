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
        
        // Ordena os itens de texto por sua posição no documento (Y, depois X)
        // Isso transforma o texto "bagunçado" em texto com ordem de leitura natural
        const sortedItems = content.items.sort((a, b) => {
          const yA = a.transform[5]; // Coordenada Y do item A
          const yB = b.transform[5]; // Coordenada Y do item B
          const xA = a.transform[4]; // Coordenada X do item A
          const xB = b.transform[4]; // Coordenada X do item B

          // Se os itens estão em linhas diferentes (com uma tolerância de 5 pixels)
          if (Math.abs(yA - yB) > 5) {
            return yB - yA; // Ordena da linha de cima para a de baixo
          }
          // Se estão na mesma linha, ordena da esquerda para a direita
          return xA - xB;
        });

        // Junta os textos ordenados em uma única string
        fullText += sortedItems.map(item => item.str).join(' ');
      }
      
      // Limpa espaços múltiplos e linhas que não contêm dados de OS
      fullText = fullText.replace(/Total OSs.*?:\s*\d+/g, ''); // Remove linhas de total
      fullText = fullText.replace(/\s{2,}/g, ' '); // Normaliza espaços

      // ETAPA 2: Usar uma Regex mais robusta para capturar cada linha de dados
      // Padrão: (OS) (Cliente + Descrição) PRO (DataAprovação) (DataProd) (DataEntrega)
      const regex = /(\d{5})\s+(.*?)\s+PRO\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+(\d{2}\/\d{2}\/\d{4})/g;
      
      let match;
      let count = 0;
      let outputHTML = "<h3>Resultado da Importação:</h3><ul>";
      const tasksToProcess = [];

      while ((match = regex.exec(fullText)) !== null) {
        tasksToProcess.push({
          os: match[1],
          clientAndDesc: match[2].trim(),
          prevEnt: match[3]
        });
      }

      if (tasksToProcess.length === 0) {
        outputHTML += "<li>⚠️ Nenhum dado de OS encontrado. Verifique o formato do PDF ou a extração de texto.</li>";
      }

      for (const task of tasksToProcess) {
        const { os, clientAndDesc, prevEnt } = task;

        // ETAPA 3: Heurística para separar Cliente da Descrição
        let { clientName, description } = splitClientAndDescription(clientAndDesc);
        
        const q = query(tasksCollection, where("osNumber", "==", os));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const existingDoc = snapshot.docs[0];
          const docRef = doc(db, "tasks", existingDoc.id);
          const updatedStatuses = existingDoc.data().statuses.map(s =>
            s.id === "entrega" ? { ...s, date: prevEnt } : s
          );
          // Atualiza também o nome do cliente, caso tenha mudado
          await updateDoc(docRef, { clientName: clientName, description: description, statuses: updatedStatuses });
          outputHTML += `<li>🔄 Atualizado: OS ${os} - ${clientName} (Entrega: ${prevEnt})</li>`;
        } else {
          await addDoc(tasksCollection, {
            osNumber: os,
            clientName: clientName,
            description: description,
            order: Date.now() + count,
            statuses: [
              { id: 'compras', label: 'Compras', state: 'state-pending', date: '' },
              { id: 'arte', label: 'Arte Final', state: 'state-pending', date: '' },
              { id: 'impressao', label: 'Impressão', state: 'state-pending', date: '' },
              { id: 'acabamento', label: 'Acabamento', state: 'state-pending', date: '' },
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
 * Separa a string "Cliente + Descrição" em duas partes.
 * Isso é uma heurística e pode precisar de ajustes se os tipos de descrição mudarem.
 * @param {string} combinedString - A string contendo nome do cliente e descrição juntos.
 * @returns {{clientName: string, description: string}}
 */
function splitClientAndDescription(combinedString) {
  // Palavras-chave que indicam o início de uma descrição
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
    // Se a palavra-chave for encontrada e não estiver no início da string
    if (index > 0) {
      clientName = combinedString.substring(0, index).trim();
      description = combinedString.substring(index).trim();
      // Remove hífens ou pontos que podem ter ficado no final do nome do cliente
      clientName = clientName.replace(/[\s-]*$/, '');
      return { clientName, description };
    }
  }

  // Se nenhum keyword foi encontrado, assumimos que tudo é o nome do cliente
  // (caso de descrições muito curtas ou não previstas)
  return { clientName: combinedString.trim(), description: "Não especificada" };
}
