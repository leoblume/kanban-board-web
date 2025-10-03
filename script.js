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
const canonicalStatuses = [ { id: 'compras', label: 'Compras' }, { id: 'arte', label: 'Arte Final' }, { id: 'impressao', label: 'Impressão' }, { id: 'acabamento', label: 'Acabamento' }, { id: 'corte', label: 'Corte' }, { id: 'faturamento', label: 'Fat.' }, { id: 'instalacao', label: 'Instalação' }, { id: 'entrega', label: 'Entrega' }];
function healStatuses(statusesArray = []) { return canonicalStatuses.map(canonical => { const existing = statusesArray.find(s => s.id === canonical.id); return { id: canonical.id, label: canonical.label, state: existing?.state || 'state-pending', date: existing?.date || '' }; }); }
function convertDateToSortable(dateStr) { if (!dateStr || !dateStr.includes('/')) return '9999-12-31'; const parts = dateStr.split('/'); if (parts.length < 2 || isNaN(parseInt(parts[0])) || isNaN(parseInt(parts[1]))) return '9999-12-31'; const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); const year = (parts[2] && parts[2].length === 4) ? parts[2] : new Date().getFullYear(); return `${year}-${month}-${day}`; }

// --- Função de Renderização com a Correção Definitiva ---
const renderAllTasks = (tasksToRender) => {
    kanbanBody.innerHTML = '';
    tasksToRender.forEach(task => {
        const rowElement = document.createElement('div');
        rowElement.className = 'kanban-row';
        rowElement.draggable = true; // Mantemos draggable para arrastar para a programação semanal
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
                        <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id
