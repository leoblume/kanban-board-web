import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

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

  card.innerHTML = `
    <div class="sector-task-os">${task.osNumber || "OS?"}</div>
    <div class="sector-task-client">${task.clientName || "Cliente?"}</div>
    <div class="sector-task-execution-date">Exec.: ${status.date || "--/--"}</div>
    <div class="sector-task-action">
      <button class="status-button ${status.state}" title="Alterar status" data-id="${task.id}" data-status="${status.id}"></button>
    </div>
  `;

  return card;
}

onSnapshot(tasksCollection, (snapshot) => {
  container.innerHTML = "";
  snapshot.docs.forEach(docSnap => {
    const task = { id: docSnap.id, ...docSnap.data() };
    const statuses = healStatuses(task.statuses);
    const currentStatus = statuses.find(s => s.id === setorId);

    if (!currentStatus) return;

    const isAguardando = currentStatus.state === "state-in-progress";
    const isSemStatus = currentStatus.state === "state-pending";

    if (isAguardando || isSemStatus) {
      const card = createTarefaCard(task, currentStatus);
      container.appendChild(card);
    }
  });
});

container.addEventListener("click", async (event) => {
  const button = event.target.closest(".status-button");
  if (!button) return;

  const docId = button.dataset.id;
  const statusId = button.dataset.status;

  const taskDoc = doc(db, "tasks", docId);
  const docSnap = await (await taskDoc.get()).data();
  const statuses = healStatuses(docSnap.statuses);

  const newStatuses = statuses.map(s => {
    if (s.id === statusId) {
      const cycle = ["state-pending", "state-in-progress", "state-done", "state-blocked"];
      const nextState = cycle[(cycle.indexOf(s.state) + 1) % cycle.length];
      return { ...s, state: nextState };
    }
    return s;
  });

  await updateDoc(taskDoc, { statuses: newStatuses });
});
