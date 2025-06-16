import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

const urlParams = new URLSearchParams(window.location.search);
const setorId = urlParams.get("setor");
const setorNome = urlParams.get("nome");

document.getElementById("setor-title").textContent = `Tarefas do setor: ${setorNome}`;
const container = document.getElementById("tarefas-do-setor");

function hojeFormatado() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

function healStatuses(statuses = []) {
  const ids = ["compras", "arte", "impressao", "acabamento", "corte", "faturamento", "instalacao", "entrega"];
  return ids.map(id => {
    const existing = statuses.find(s => s.id === id);
    return {
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      state: existing?.state || "state-pending",
      date: existing?.date || ""
    };
  });
}

function createTarefaCard(task, status) {
  const card = document.createElement("div");
  card.className = "sector-task-card";

  // Usa a data do status, se não houver, usa a data de hoje para exibição.
  const dataExec = status.date || hojeFormatado();

  card.innerHTML = `
    <div class="sector-task-os">${task.osNumber || "OS?"}</div>
    <div class="sector-task-client">${task.clientName || "Cliente?"}</div>
    <div class="sector-task-execution-date">Exec.: ${dataExec}</div>
    <div class="sector-task-action">
      <button class="status-button ${status.state}" title="Marcar como feito" data-id="${task.id}" data-status="${status.id}"></button>
    </div>
  `;

  return card;
}

// --- NOVO: Função para converter a data "DD/MM" para um objeto Date ---
// Isso é essencial para a ordenação correta.
function parseDate(dateString) {
  // Se a data não existir, retorna uma data muito no futuro
  // para que esses itens fiquem no final da lista.
  if (!dateString) {
    return new Date('9999-12-31');
  }
  const [day, month] = dateString.split('/').map(Number);
  // Os meses em JavaScript são baseados em 0 (janeiro = 0)
  return new Date(new Date().getFullYear(), month - 1, day);
}

onSnapshot(tasksCollection, (snapshot) => {
  container.innerHTML = "";
  
  // --- MUDANÇA 1: Criar um array temporário para armazenar as tarefas a serem exibidas ---
  const tarefasParaExibir = [];

  snapshot.docs.forEach(docSnap => {
    const task = { id: docSnap.id, ...docSnap.data() };
    const statuses = healStatuses(task.statuses);
    const currentStatus = statuses.find(s => s.id === setorId);

    if (!currentStatus) return;

    const isAguardando = currentStatus.state === "state-in-progress";
    const isSemStatus = currentStatus.state === "state-pending";

    if (isAguardando || isSemStatus) {
      // Em vez de renderizar, adiciona a tarefa e seu status ao nosso array
      tarefasParaExibir.push({ task, status: currentStatus });
    }
  });

  // --- MUDANÇA 2: Ordenar o array de tarefas ---
  tarefasParaExibir.sort((a, b) => {
    const dateA = parseDate(a.status.date);
    const dateB = parseDate(b.status.date);
    return dateA - dateB; // Ordena da data mais antiga para a mais nova
  });

  // --- MUDANÇA 3: Renderizar os cards a partir do array já ordenado ---
  tarefasParaExibir.forEach(item => {
    const card = createTarefaCard(item.task, item.status);
    container.appendChild(card);
  });
});

container.addEventListener("click", async (event) => {
  const button = event.target.closest(".status-button");
  if (!button) return;

  const docId = button.dataset.id;
  const statusId = button.dataset.status;
  const taskRef = doc(db, "tasks", docId);
  const snap = await getDoc(taskRef);

  if (!snap.exists()) return;

  const data = snap.data();
  const statuses = healStatuses(data.statuses);

  const updatedStatuses = statuses.map(s => {
    if (s.id === statusId) {
      return {
        ...s,
        state: "state-done",
        date: s.date || hojeFormatado()
      };
    }
    return s;
  });

  await updateDoc(taskRef, { statuses: updatedStatuses });
});
