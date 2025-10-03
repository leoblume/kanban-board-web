// ... (código existente) ...

// --- Função de Renderização com a Correção Definitiva ---
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
                <input type="text" class="os-number-input" placeholder="Nº OS" value="${task.osNumber || ''}">
                <input type="text" class="client-name-input" placeholder="Nome do Cliente" value="${task.clientName || ''}">
            </div>
            ${task.statuses.map(s => `
                <div class="cell">
                    <div class="status-control">
                        <button class="status-button ${s.state}" data-status-id="${s.id}"></button>
                        <input type="text" class="status-date-input" placeholder="dd/mm" value="${s.date || ''}" data-status-id="${s.id}">
                    </div>
                </div>
            `).join('')}
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


// ... (código existente) ...

// --- DRAG-AND-DROP (KANBAN) ---
kanbanBody.addEventListener('dragstart', (e) => { 
    const row = e.target.closest('.kanban-row');
    if (row) {
        const osNumber = row.querySelector('.os-number-input').value;
        const clientName = row.querySelector('.client-name-input').value;
        
        // Determinar o setor principal para o arrastar
        // Para simplificar, vamos pegar o status mais avançado que não seja 'pending'
        const task = tasks.find(t => t.id === row.id);
        let mainSector = 'geral'; // Valor padrão
        if (task && task.statuses) {
            // Encontrar o status mais relevante (ex: o último a ser 'in-progress' ou 'done')
            const activeStatus = task.statuses.slice().reverse().find(s => s.state === 'state-in-progress' || s.state === 'state-done');
            if (activeStatus) {
                mainSector = activeStatus.id; // Usa o ID do status como setor
            } else {
                // Se nenhum status estiver ativo/feito, talvez o primeiro pendente ou o de entrega
                const deliveryStatus = task.statuses.find(s => s.id === 'entrega');
                if (deliveryStatus && deliveryStatus.date) {
                    mainSector = 'entrega';
                }
            }
        }
        
        e.dataTransfer.setData('application/json', JSON.stringify({ osNumber, clientName, mainSector }));
        e.dataTransfer.effectAllowed = 'copyMove';
    }
});

// ... (código existente) ...

// --- LÓGICA DA PROGRAMAÇÃO SEMANAL (AJUSTADA) ---
// Mapeamento de setores para ícones (SVG)
const sectorIcons = {
    'impressao': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M5.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M7 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/><path d="M11 0H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 1H3a1 1 0 0 0-1 1v2h9V2a1 1 0 0 0-1-1zM3 15a1 1 0 0 1-1-1V6h9v8a1 1 0 0 1-1 1H3z"/></svg>`,
    'acabamento': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 2 4H1.5a.5.5 0 0 1-.5-.5v-2zM4 1.5A.5.5 0 0 1 4.5 1H6a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 6 4H5.5a.5.5 0 0 1-.5-.5v-2zM8 1.5A.5.5 0 0 1 8.5 1H10a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 10 4H9.5a.5.5 0 0 1-.5-.5v-2zM12 1.5A.5.5 0 0 1 12.5 1H14a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 14 4h-.5a.5.5 0 0 1-.5-.5v-2zM0 6.5A.5.5 0 0 1 .5 6H2a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 2 9H1.5a.5.5 0 0 1-.5-.5v-2zM4 6.5A.5.5 0 0 1 4.5 6H6a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 6 9H5.5a.5.5 0 0 1-.5-.5v-2zM8 6.5A.5.5 0 0 1 8.5 6H10a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 10 9H9.5a.5.5 0 0 1-.5-.5v-2zM12 6.5A.5.5 0 0 1 12.5 6H14a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 14 9h-.5a.5.5 0 0 1-.5-.5v-2zM0 11.5a.5.5 0 0 1 .5-.5H2a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 2 14H1.5a.5.5 0 0 1-.5-.5v-2zM4 11.5a.5.5 0 0 1 .5-.5H6a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 6 14H5.5a.5.5 0 0 1-.5-.5v-2zM8 11.5a.5.5 0 0 1 .5-.5H10a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 10 14H9.5a.5.5 0 0 1-.5-.5v-2zM12 11.5a.5.5 0 0 1 .5-.5H14a.5.5 0 0 1 .5.5v2A.5.5 0 0 1 14 14h-.5a.5.5 0 0 1-.5-.5v-2z"/></svg>`,
    'corte': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2 0A.5.5 0 0 1 8 6v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zM11 5.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zM14 5.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zM5.5 9.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V10a.5.5 0 0 1 .5-.5zm2 0A.5.5 0 0 1 8 10v2a.5.5 0 0 1-1 0V10a.5.5 0 0 1 .5-.5zm2 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V10a.5.5 0 0 1 .5-.5zM11 9.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V10a.5.5 0 0 1 .5-.5zM14 9.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V10a.5.5 0 0 1 .5-.5zM15 15H1a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1zM1 2v12h14V2H1z"/></svg>`,
    'instalacao': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12.5 16a.5.5 0 0 0 .5-.5V.707L14.707 2.5l.793-.793-2.5-2.5-2.5 2.5.793.793L12 1.293V15.5a.5.5 0 0 0 .5.5zm-9-16v14.293L1.293 12.5l-.793.793 2.5 2.5 2.5-2.5-.793-.793L4 14.707V.5a.5.5 0 0 0-.5-.5z"/></svg>`,
    'serralheria': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6 3a3 3 0 1 0-6 0v3h4.586A1.5 1.5 0 0 1 5.5 7.5L4.09 9.909a.5.5 0 0 0 .707.707l1.414-1.414A.5.5 0 0 1 7 9.5V13h4v-1.5a.5.5 0 0 0-1 0V12H8v-2.5a.5.5 0 0 0-1 0V10H6V6h1.5a.5.5 0 0 0 0-1H6V3zm-.5 3h-2a2.5 2.5 0 0 1 2.5-2.5V3c0-.28-.22-.5-.5-.5zM8 8.5v2.5a.5.5 0 0 0 1 0V8.5a.5.5 0 0 0-1 0zm3.5-3.5a.5.5 0 0 0 0 1H13v1.5a.5.5 0 0 0 1 0V5h1.5a.5.5 0 0 0 0-1H14V2.5a.5.5 0 0 0-1 0V4h-1.5a.5.5 0 0 0-.5-.5z"/></svg>`,
    'faturamento': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.758 2.855L15 11.19V5.383zm-.035 6.876L8.107 9.42l-.893.536-7.165 4.301A1 1 0 0 0 2 13h12a1 1 0 0 0 .965-.741zM1 11.19l4.616-2.774L1 5.383v5.807zM1.646 4.854l13-7.5l.708.708-13 7.5-.708-.708z"/></svg>`,
    'entrega': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM4 1h8a1 1 0 0 1 1 1v2H3V2a1 1 0 0 1 1-1zm8 14H4a1 1 0 0 1-1-1v-4h10v4a1 1 0 0 1-1 1zm0-9H3V5h10v1z"/></svg>`,
    'arte': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V1zm4.5 0V.5h7A.5.5 0 0 1 12 1h1.5a.5.5 0 0 0 0-1H4a.5.5 0 0 0 0 1H1.5a.5.5 0 0 0-.5.5v1.793l2-2h1.5zM15 4.5v7h-1.793l2-2V4.5a.5.5 0 0 0-1 0zM1 4.5V3.207l-2 2H1v1.5a.5.5 0 0 0 1 0zM11.5 15.5V15h-7A.5.5 0 0 1 4 14v-1.5a.5.5 0 0 0 0-1h1.5a.5.5 0 0 0 0 1v.5h7A.5.5 0 0 0 12 15h1.5a.5.5 0 0 0 0 1H11.5zM15.5 11.5V11a.5.5 0 0 0-1 0v.5a.5.5 0 0 0 0 1h1.5v-.5a.5.5 0 0 0 0-1zM.5 11.5V11a.5.5 0 0 0-1 0v.5a.5.5 0 0 0 0 1H.5v-.5a.5.5 0 0 0 0-1zM.5 4.5V4a.5.5 0 0 0-1 0v.5a.5.5 0 0 0 0 1H.5v-.5a.5.5 0 0 0 0-1zM15.5 4.5V4a.5.5 0 0 0-1 0v.5a.5.5 0 0 0 0 1H15.5v-.5a.5.5 0 0 0 0-1z"/></svg>`,
    'compras': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM3.135 3h10.231L12.04 11H4.07zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>`,
    'geral': `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1zM0 4c0-1.11.89-2 2-2h12a2 2 0 0 1 2 2v1H0V4z"/></svg>` // Ícone genérico
};

function renderScheduleItem(os, client, sector = 'geral') { // Adicionado 'sector' como parâmetro
    const item = document.createElement('div');
    item.className = `schedule-item sector-${sector}`; // Adiciona classe baseada no setor
    item.dataset.os = os;
    item.dataset.client = client;
    item.dataset.sector = sector; // Armazena o setor no dataset
    
    const clientName = client || '';
    let firstWord = clientName.split(' ')[0];
    if (firstWord.length > 8) {
        firstWord = firstWord.substring(0, 8);
    }
    const formattedText = `${os} ${firstWord}`.trim();
    
    // Inclui o ícone do setor
    const icon = sectorIcons[sector] || sectorIcons['geral'];

    item.innerHTML = `
        <span class="schedule-item-icon">${icon}</span>
        <span class="schedule-item-text" title="${os} ${client} (${sector})">${formattedText}</span>
        <button class="delete-schedule-item-btn" title="Excluir">×</button>
    `;
    return item;
}

onSnapshot(scheduleCollection, (snapshot) => { 
    document.querySelectorAll('.drop-zone').forEach(zone => zone.innerHTML = ''); 
    snapshot.forEach(doc => { 
        const dayId = doc.id; 
        const tasks = doc.data().tasks || []; 
        const zone = document.getElementById(dayId); 
        if (zone) { 
            tasks.forEach(task => { 
                // Passa o setor para a função de renderização
                zone.appendChild(renderScheduleItem(task.osNumber, task.clientName, task.mainSector || 'geral')); 
            }); 
        } 
    }); 
});

// ... (código existente) ...

weeklySchedulePanel.addEventListener('drop', async e => { e.preventDefault(); const dropZone = e.target.closest('.drop-zone'); if (dropZone) { dropZone.classList.remove('drag-over'); try { 
            const taskData = JSON.parse(e.dataTransfer.getData('application/json')); 
            if (taskData && taskData.osNumber && taskData.clientName) { 
                const dayId = dropZone.id;
                const scheduleDocRef = doc(db, "schedule", dayId);
                
                // Salva o setor junto com a tarefa na agenda
                await setDoc(scheduleDocRef, { tasks: arrayUnion({ 
                    osNumber: taskData.osNumber, 
                    clientName: taskData.clientName,
                    mainSector: taskData.mainSector || 'geral' // Salva o setor
                }) }, { merge: true });
            }
        } catch (error) { 
            console.error("Erro ao salvar na programação:", error); 
        } 
    } 
});

weeklySchedulePanel.addEventListener('click', async e => { 
    if (e.target.classList.contains('delete-schedule-item-btn')) { 
        const item = e.target.closest('.schedule-item'); 
        const zone = e.target.closest('.drop-zone'); 
        if (item && zone) { 
            const taskToRemove = { 
                osNumber: item.dataset.os, 
                clientName: item.dataset.client,
                mainSector: item.dataset.sector || 'geral' // Inclui o setor na remoção
            }; 
            const dayId = zone.id; 
            const scheduleDocRef = doc(db, "schedule", dayId); 
            try { 
                await updateDoc(scheduleDocRef, { tasks: arrayRemove(taskToRemove) }); 
            } catch (error) { 
                console.error("Erro ao excluir da programação:", error); 
            } 
        } 
    } 
});

// ... (restante do código existente) ...
