import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

window.extractData = async function () {
  const fileInput = document.getElementById('pdfFile');
  const file = fileInput.files[0];
  const resultArea = document.getElementById('resultArea');
  resultArea.innerHTML = "";

  if (!file) {
    alert("Selecione um arquivo PDF.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function () {
    const typedarray = new Uint8Array(reader.result);
    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(' ') + '\n';
    }

    const regex = /(\d{5})\s+([A-Z\s\.\-\(\)]+?)\s+PRO\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+(\d{2}\/\d{2}\/\d{4})/g;
    let match, count = 0;
    let outputHTML = "<h3>Resultado da Importação:</h3><ul>";

    while ((match = regex.exec(fullText)) !== null) {
      const os = match[1];
      const cliente = match[2].trim();
      const prevEnt = match[3];

      const q = query(tasksCollection, where("osNumber", "==", os));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        const docRef = doc(db, "tasks", existingDoc.id);
        const updatedStatuses = existingDoc.data().statuses.map(s =>
          s.id === "entrega" ? { ...s, date: prevEnt } : s
        );
        await updateDoc(docRef, { clientName: cliente, statuses: updatedStatuses });
        outputHTML += `<li>🔄 Atualizado: OS ${os} - ${cliente} (Entrega: ${prevEnt})</li>`;
      } else {
        await addDoc(tasksCollection, {
          osNumber: os,
          clientName: cliente,
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
        outputHTML += `<li>✅ Importado: OS ${os} - ${cliente} (Entrega: ${prevEnt})</li>`;
      }

      count++;
    }

    outputHTML += "</ul>";
    resultArea.innerHTML = outputHTML;
    fileInput.value = '';
  };

  reader.readAsArrayBuffer(file);
};
