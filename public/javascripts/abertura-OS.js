// javascripts/abertura-OS.js
let clienteAtual = null;
let ultimoTicketGerado = null;

document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeAndUserInfo();
    
    await carregarAssuntosIXC();

    const btnBuscar = document.getElementById('btn-buscar-cliente');
    const inputBusca = document.getElementById('input-busca-cliente');

    btnBuscar.addEventListener('click', () => realizarBusca(inputBusca.value));
    inputBusca.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusca(inputBusca.value);
    });

    document.getElementById('select-assunto').addEventListener('change', atualizarChecklist);
    document.getElementById('btn-gerar-os').addEventListener('click', gerarOS);
    
    document.getElementById('btn-confirmar-tarefa').addEventListener('click', processarAvancoTarefa);
});

async function carregarAssuntosIXC() {
    try {
        const response = await fetch('/api/v5/abertura-OS/assuntos');
        const assuntos = await response.json();
        const select = document.getElementById('select-assunto');
        
        select.innerHTML = '<option value="">Selecione o Assunto...</option>';

        assuntos.forEach(a => {
            const nomeStr = (a.assunto || '').toUpperCase();
            
            if (!nomeStr.includes('INSTALA') && !nomeStr.includes('TITULARIDADE')) {
                const option = document.createElement('option');
                option.value = a.id;
                option.dataset.departamento = a.id_departamento || a.id_setor || '1'; 
                
                option.dataset.processo = a.id_wfl_processo || a.id_processo || ''; 
                
                option.textContent = a.assunto;
                select.appendChild(option);
            }
        });
    } catch (e) {
        document.getElementById('select-assunto').innerHTML = '<option value="">Erro ao carregar assuntos</option>';
    }
}

async function realizarBusca(termo) {
    if (!termo) return;

    termo = termo.trim();

    if (/[a-zA-Z]/.test(termo)) {
        alert("Busca inválida! Digite apenas o Código do cliente, CPF ou CNPJ.");
        document.getElementById('input-busca-cliente').value = '';
        return;
    }
    
    const btn = document.getElementById('btn-buscar-cliente');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/v5/abertura-OS/busca-cliente/${termo}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Cliente não encontrado.");

        clienteAtual = data;

        document.getElementById('display-nome-cliente').textContent = data.nome || 'N/A';
        document.getElementById('display-endereco-cliente').textContent = data.endereco || 'N/A';
        
        const selectContrato = document.getElementById('select-contrato');
        selectContrato.innerHTML = '';
        if (data.contrato_id) {
            selectContrato.add(new Option(`Contrato ${data.contrato_id}`, data.contrato_id));
        } else {
            selectContrato.add(new Option('Sem contrato ativo', ''));
        }

        const enderecoUpper = (data.endereco || '').toUpperCase();
        const isPredio = enderecoUpper.includes('APTO') || enderecoUpper.includes('BLOCO') || enderecoUpper.includes('CONDOMINIO');
        
        const badge = document.getElementById('display-tipo-imovel');
        badge.textContent = isPredio ? 'PRÉDIO / CONDOMÍNIO' : 'CASA';
        badge.className = isPredio ? 'badge bg-info text-dark' : 'badge bg-primary';

        const card = document.getElementById('card-diagnostico');
        card.style.opacity = '1';
        card.style.pointerEvents = 'auto';

    } catch (error) {
        alert(error.message);
        
        const card = document.getElementById('card-diagnostico');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        
        clienteAtual = null;
    } finally {
        btn.innerHTML = '<i class="bi bi-search"></i>';
        btn.disabled = false;
    }
}

function atualizarChecklist(e) {
    const select = e.target;
    const assuntoTexto = select.options[select.selectedIndex]?.text.toUpperCase() || '';
    
    const area = document.getElementById('area-checklist');
    const container = document.getElementById('checklist-items');
    
    area.classList.remove('d-none');
    container.innerHTML = '';

    let checks = [];
    if (assuntoTexto.includes('LOS') || assuntoTexto.includes('SEM ACESSO')) {
        checks = ['Cliente verificou se a ONU está ligada na tomada?', 'Cabo de fibra ótica está conectado e sem dobras visíveis?'];
    } else if (assuntoTexto.includes('LENTIDA') || assuntoTexto.includes('LENTIDÃO')) {
        checks = ['Teste de velocidade realizado via Cabo de Rede?', 'Equipamentos (ONU e Roteador) foram reiniciados?'];
    } else {
        area.classList.add('d-none');
        return;
    }

    checks.forEach((texto, index) => {
        container.innerHTML += `
            <div class="form-check mb-1">
                <input class="form-check-input" type="checkbox" id="check-${index}" required>
                <label class="form-check-label text-dark" for="check-${index}">${texto}</label>
            </div>
        `;
    });
}

async function gerarOS() {
    if (!clienteAtual) return alert("Busque e selecione um cliente primeiro.");

    const selectAssunto = document.getElementById('select-assunto');
    const id_assunto = selectAssunto.value;
    const assuntoTexto = selectAssunto.options[selectAssunto.selectedIndex]?.text; 
    const id_departamento = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.departamento;
    
    const id_processo = selectAssunto.options[selectAssunto.selectedIndex]?.dataset.processo;
    
    const id_contrato = document.getElementById('select-contrato').value;
    const observacao = document.getElementById('obs-triagem').value;

    if (!id_assunto) return alert("Selecione um Processo/Assunto.");
    
    if (!id_processo) {
        return alert("ERRO DE CONFIGURAÇÃO NO IXC: Este assunto não possui um Processo (Workflow) vinculado a ele no IXC. Peça ao gestor para vincular!");
    }
    
    if (!observacao) return alert("Preencha as observações da triagem.");

    const checkboxes = document.querySelectorAll('#checklist-items input[type="checkbox"]');
    for (let chk of checkboxes) {
        if (!chk.checked) return alert("Por favor, confirme todos os itens do checklist obrigatório.");
    }

    const btn = document.getElementById('btn-gerar-os');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando Atendimento...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/v5/abertura-OS/criar-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente_id: clienteAtual.id,
                contrato_id: id_contrato || null,
                id_assunto: id_assunto,
                id_departamento: id_departamento,
                id_processo: id_processo,
                observacao: observacao,
                titulo: assuntoTexto
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        ultimoTicketGerado = data.ticket_id;
        document.getElementById('sucesso-ticket-id').textContent = ultimoTicketGerado;
        
        carregarTarefasProcesso(id_processo);
        
        const modalElement = document.getElementById('modalDecisaoAgendamento');
        const modalDecisao = new bootstrap.Modal(modalElement);
        modalDecisao.show();

    } catch (error) {
        alert("Erro ao criar chamado: " + error.message);
    } finally {
        btn.innerHTML = '<i class="bi bi-file-earmark-plus me-2"></i>Continuar';
        btn.disabled = false;
    }
}

async function carregarTarefasProcesso(id_processo) {
    const container = document.getElementById('lista-tarefas-processo');
    container.innerHTML = '<div class="text-center text-muted"><span class="spinner-border spinner-border-sm"></span> Carregando tarefas do fluxo...</div>';
    
    try {
        const response = await fetch(`/api/v5/abertura-OS/tarefas/${id_processo}`);
        const tarefas = await response.json();
        
        if (tarefas.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">Nenhuma tarefa da Sequência 2 encontrada para este processo. O IXC seguirá o fluxo padrão.</div>';
            return;
        }
        
        container.innerHTML = '';
        tarefas.forEach((t, index) => {
            const isVisita = t.descricao.toUpperCase().includes('VISITA');
            const icon = isVisita ? 'bi-calendar2-event text-primary' : 'bi-diagram-3 text-success';
            const checked = index === 0 ? 'checked' : '';
            
            container.innerHTML += `
                <div class="form-check border rounded p-3 bg-white shadow-sm d-flex align-items-center" style="cursor: pointer; transition: 0.2s;" onclick="document.getElementById('tarefa-${t.id}').checked = true" onmouseover="this.classList.add('bg-light')" onmouseout="this.classList.remove('bg-light')">
                    <input class="form-check-input ms-1 me-3 fs-5" type="radio" name="radio-tarefa" id="tarefa-${t.id}" value="${t.id}" data-setor="${t.id_setor}" data-nome="${t.descricao}" ${checked}>
                    <label class="form-check-label w-100 fw-bold text-dark d-flex align-items-center m-0" for="tarefa-${t.id}" style="cursor: pointer;">
                        <i class="bi ${icon} fs-4 me-3"></i> 
                        <span style="font-size: 0.95rem;">${t.descricao}</span>
                    </label>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = '<div class="text-danger p-2 border rounded border-danger">Erro ao carregar tarefas do IXC.</div>';
    }
}

async function processarAvancoTarefa() {
    const radioSelecionado = document.querySelector('input[name="radio-tarefa"]:checked');
    if (!radioSelecionado) return alert('Selecione uma tarefa para avançar.');
    
    const btn = document.getElementById('btn-confirmar-tarefa');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Movendo Chamado...';
    
    const id_tarefa = radioSelecionado.value;
    const id_setor = radioSelecionado.dataset.setor;
    const nome_tarefa = radioSelecionado.dataset.nome.toUpperCase();
    
    try {
        await fetch('/api/v5/abertura-OS/avancar-tarefa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticket_id: ultimoTicketGerado,
                id_tarefa: id_tarefa,
                id_setor: id_setor,
                usuario_intranet: window.usuarioLogado
            })
        });
        
        if (nome_tarefa.includes('VISITA')) {
            window.location.href = `/agendamento?os=${ultimoTicketGerado}&origem=intranet`;
        } else {
            alert(`Sucesso! Chamado encaminhado para a etapa: ${nome_tarefa}`);
            window.location.reload(); 
        }
    } catch (error) {
        alert('Erro ao mover a tarefa no IXC. Tente novamente.');
        btn.disabled = false;
        btn.innerHTML = 'Confirmar e Avançar <i class="bi bi-arrow-right-circle ms-1"></i>';
    }
}

function redirecionarAgendamento() {
    if (!ultimoTicketGerado) return;
    window.location.href = `/agendamento?os=${ultimoTicketGerado}&origem=intranet`;
}

function initializeThemeAndUserInfo() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');
    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
    } else {
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
    }
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');
            const newTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            themeToggleButton.innerHTML = newTheme === 'dark' ? '<i class="bi bi-brightness-high"></i>' : '<i class="bi bi-moon-stars"></i>';
        });
    }
    const logoutButton = document.getElementById('btnLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            window.location.href = '/logout';
        });
    }
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            window.usuarioLogado = username;
            const rawGroup = data.group || '';
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                showModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                setTimeout(() => { window.location = "/"; }, 300);
                return;
            }
            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) {
                    el.textContent = username;
                }
                if (el.textContent.includes('{group}')) {
                    el.textContent = group;
                }
            });
        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
}