// javascripts/abertura-OS.js
let clienteAtual = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeThemeAndUserInfo();

    const btnBuscar = document.getElementById('btn-buscar-cliente');
    const inputBusca = document.getElementById('input-busca-cliente');

    btnBuscar.addEventListener('click', () => realizarBusca(inputBusca.value));
    inputBusca.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') realizarBusca(inputBusca.value);
    });

    document.getElementById('select-motivo').addEventListener('change', atualizarChecklist);
});

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

        if (!response.ok) throw new Error(data.error);

        clienteAtual = data.cliente;
        preencherDadosCliente(data);
        
    } catch (error) {
        alert(error.message || "Erro ao buscar cliente.");
        document.getElementById('card-diagnostico').style.opacity = '0.5';
        document.getElementById('card-diagnostico').style.pointerEvents = 'none';
    } finally {
        btn.innerHTML = '<i class="bi bi-search"></i>';
        btn.disabled = false;
    }
}

function preencherDadosCliente(data) {
    const card = document.getElementById('card-diagnostico');
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';

    document.getElementById('display-nome-cliente').textContent = data.cliente.nome;
    document.getElementById('display-endereco-cliente').textContent = 
        `${data.cliente.endereco}, ${data.cliente.numero} - ${data.cliente.bairro}, ${data.cliente.cidade}`;

    const selectContrato = document.getElementById('select-contrato');
    selectContrato.innerHTML = '';
    data.contratos.forEach(c => {
        selectContrato.add(new Option(`Contrato ${c.id} - Status: ${c.status}`, c.id));
    });

    const enderecoUpper = data.cliente.endereco.toUpperCase() + (data.cliente.complemento || '').toUpperCase();
    const isPredio = enderecoUpper.includes('APTO') || enderecoUpper.includes('BLOCO') || enderecoUpper.includes('CONDOMINIO');
    
    const badge = document.getElementById('display-tipo-imovel');
    badge.textContent = isPredio ? 'PRÉDIO / CONDOMÍNIO' : 'CASA';
    badge.className = isPredio ? 'badge bg-info text-dark' : 'badge bg-primary';

    const alerta = document.getElementById('alerta-os-aberta');
    if (data.os_abertas && data.os_abertas.length > 0) {
        alerta.classList.remove('d-none');
    } else {
        alerta.classList.add('d-none');
    }
}

function atualizarChecklist(e) {
    const motivo = e.target.value;
    const area = document.getElementById('area-checklist');
    const container = document.getElementById('checklist-items');
    
    area.classList.remove('d-none');
    container.innerHTML = '';

    let checks = [];
    if (motivo === 'LOS') {
        checks = ['Cliente verificou se a ONU está ligada na tomada?', 'Cabo de fibra ótica está conectado e sem dobras visíveis?'];
    } else if (motivo === 'LENTIDAO') {
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

document.getElementById('btn-gerar-os').addEventListener('click', async function() {
    if (!clienteAtual) return alert("Busque e selecione um cliente primeiro.");

    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Gerando...';
    btn.disabled = true;

    const payload = {
        cliente_id: clienteAtual.id,
        contrato_id: document.getElementById('select-contrato').value,
        motivo: document.getElementById('select-motivo').value,
        observacao: document.getElementById('obs-triagem').value
    };

    try {
        const response = await fetch('/api/v5/abertura-os/gerar-os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        window.location.href = `/agendamento?os=${data.id_ticket}&origem=suporte`;

    } catch (error) {
        alert("Erro ao criar OS: " + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

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
             showModal('Erro de Autenticação', 'Não foi possível verificar seu usuário. Por favor, faça o login novamente.', 'danger');
             setTimeout(() => { window.location = "/"; }, 300);
        });
}