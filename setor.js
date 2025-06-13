// *** LÓGICA DE FILTRAGEM CORRIGIDA E SIMPLIFICADA ***
const filteredTasks = allTasks.filter(task => {
    // Regra 1: Ignora a tarefa se qualquer etapa estiver bloqueada.
    const isBlocked = task.statuses.some(s => s.state === 'state-blocked');
    if (isBlocked) {
        return false;
    }

    // Regra 2: A tarefa deve ter o status 'pendente' ou 'em andamento' PARA ESTE SETOR.
    const sectorStatus = task.statuses.find(s => s.id === sectorId);

    // Retorna verdadeiro se o status do setor existir e for 'pending' OU 'in-progress'.
    return sectorStatus && (sectorStatus.state === 'state-pending' || sectorStatus.state === 'state-in-progress');
});