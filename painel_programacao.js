// Importar SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Configuração Firebase (preencha com seus dados)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  databaseURL: "https://SEU_DATABASE_URL.firebaseio.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_ID",
  appId: "SEU_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Cores iguais ao Kanban principal
const COLORS = {
  arte: "#1E88E5",
  impressao: "#FB8C00",
  acabamento: "#FFD54F",
  corte: "#9CCC65",
  serralheria: "#A1887F",
  instalacao: "#F4511E"
};

// Atualiza painel com dados
function carregarProgramacao(snapshot) {
  document.querySelectorAll(".painel-lista").forEach(el => (el.innerHTML = ""));
  const dados = snapshot.val();
  if (!dados) return;

  Object.values(dados).forEach(item => {
    const dia = document.getElementById(item.diaSemana?.toLowerCase());
    if (!dia) return;

    const card = document.createElement("div");
    card.className = "painel-item";
    card.style.borderLeftColor = COLORS[item.setor] || "#ccc";
    card.style.backgroundColor = "#fff";

    card.innerHTML = `
      <div class="painel-cliente">${item.cliente}</div>
      <div class="painel-os">OS: ${item.os}</div>
      <div class="painel-setor">${item.setor}</div>
      <div class="painel-data">Entrega: ${item.dataEntrega || "—"}</div>
    `;

    dia.querySelector(".painel-lista").appendChild(card);
  });
}

// Escuta o Firebase em tempo real
onValue(ref(db, "programacao_semanal"), carregarProgramacao);

// Atualização visual automática (opcional)
setInterval(() => window.location.reload(), 30000);
