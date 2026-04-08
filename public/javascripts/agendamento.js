// javascripts/agendamento.js

document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeAndUserInfo()

    const urlParams = new URLSearchParams(window.location.search);
    const osId = urlParams.get('os');
    const origem = urlParams.get('origem');

    if (!osId) {
        alert("Nenhuma OS informada na URL.");
        document.getElementById('loading-os').style.display = 'none';
        return;
    }

    const dataInput = document.getElementById('input-data');
    const hoje = new Date().toISOString().split('T')[0];
    dataInput.setAttribute('min', hoje);

    await carregarDadosOS(osId, origem);

    dataInput.addEventListener('change', buscarVagasPorData);
    document.getElementById('form-agendamento').addEventListener('submit', confirmarAgendamento);
});

async function carregarDadosOS(id_ticket, origem) {
    try {
        const response = await fetch(`/api/v5/agendamento/detalhes-os/${id_ticket}?origem=${origem}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error);

        document.getElementById('loading-os').style.display = 'none';
        document.getElementById('conteudo-agendamento').style.display = 'block';

        document.getElementById('badge-tipo-os').textContent = data.tipo_servico;
        document.getElementById('os-cliente-nome').textContent = data.nome;
        document.getElementById('os-ticket-id').textContent = `Ticket IXC: #${data.id_ticket}`;
        document.getElementById('os-endereco').textContent = data.endereco;
        document.getElementById('os-mensagem').textContent = data.mensagem;
        
        let municipioBase = "DESCONHECIDO";
        if (data.cidade) {
            const cidadeUpper = data.cidade.toUpperCase();
            if (cidadeUpper.includes("SERRA")) municipioBase = "SERRA";
            else if (cidadeUpper.includes("VILA VELHA")) municipioBase = "VILA VELHA";
            else if (cidadeUpper.includes("VITORIA") || cidadeUpper.includes("VITÓRIA")) municipioBase = "VITORIA";
        }
        
        document.getElementById('os-municipio').textContent = municipioBase;
        document.getElementById('os-tipo-imovel').textContent = data.tipo_imovel;

        document.getElementById('hidden-os-id').value = data.id_ticket;
        document.getElementById('hidden-municipio').value = municipioBase;
        document.getElementById('hidden-tipo-servico').value = data.tipo_servico;
        
        document.getElementById('form-agendamento').dataset.clienteId = data.cliente_id;
        document.getElementById('form-agendamento').dataset.tipoImovel = data.tipo_imovel;

    } catch (error) {
        alert("Erro ao buscar OS: " + error.message);
    }
}

async function buscarVagasPorData() {
    const dataEscolhida = document.getElementById('input-data').value;
    const municipio = document.getElementById('hidden-municipio').value;
    
    if (!dataEscolhida || !municipio) return;

    const radioMatutino = document.getElementById('turno-matutino');
    const radioVespertino = document.getElementById('turno-vespertino');
    radioMatutino.checked = false;
    radioVespertino.checked = false;
    document.getElementById('btn-confirmar-agendamento').disabled = true;

    document.getElementById('loading-vagas').classList.remove('d-none');
    document.getElementById('vagas-matutino').textContent = "Consultando...";
    document.getElementById('vagas-vespertino').textContent = "Consultando...";

    try {
        const response = await fetch(`/api/v5/agendamento/vagas?data=${dataEscolhida}&municipio=${municipio}`);
        const vagas = await response.json();

        radioMatutino.disabled = !vagas.matutino.disponivel;
        document.getElementById('vagas-matutino').innerHTML = vagas.matutino.disponivel 
            ? `<span class="text-success fw-bold">${vagas.matutino.vagas} Vagas restantes</span>` 
            : `<span class="text-danger fw-bold">Turno Esgotado</span>`;

        radioVespertino.disabled = !vagas.vespertino.disponivel;
        document.getElementById('vagas-vespertino').innerHTML = vagas.vespertino.disponivel 
            ? `<span class="text-success fw-bold">${vagas.vespertino.vagas} Vagas restantes</span>` 
            : `<span class="text-danger fw-bold">Turno Esgotado</span>`;

        document.querySelectorAll('input[name="turno"]').forEach(radio => {
            radio.addEventListener('change', () => {
                document.getElementById('btn-confirmar-agendamento').disabled = false;
            });
        });

    } catch (error) {
        console.error("Erro vagas:", error);
    } finally {
        document.getElementById('loading-vagas').classList.add('d-none');
    }
}

async function confirmarAgendamento(event) {
    event.preventDefault();
    
    const btnConfirmar = document.getElementById('btn-confirmar-agendamento');
    const originalText = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';
    btnConfirmar.disabled = true;

    const payload = {
        id_ticket: document.getElementById('hidden-os-id').value,
        cliente_id: document.getElementById('form-agendamento').dataset.clienteId,
        municipio: document.getElementById('hidden-municipio').value,
        tipo_servico: document.getElementById('hidden-tipo-servico').value,
        tipo_imovel: document.getElementById('form-agendamento').dataset.tipoImovel,
        data_agendamento: document.getElementById('input-data').value,
        turno: document.querySelector('input[name="turno"]:checked').value,
        aceita_encaixe: document.getElementById('chk-encaixe').checked
    };

    try {
        const response = await fetch('/api/v5/agendamento/confirmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        document.getElementById('form-agendamento').innerHTML = `
            <div class="alert alert-success text-center p-4 border-success">
                <i class="bi bi-check-circle-fill display-4 d-block mb-3"></i>
                <h4 class="alert-heading fw-bold">Agendamento Realizado!</h4>
                <p class="mb-0">A OS foi enviada para o painel da Logística.</p>
                <a href="/main" class="btn btn-outline-success mt-3">Voltar ao Início</a>
            </div>
        `;

    } catch (error) {
        alert("Erro ao confirmar: " + error.message);
        btnConfirmar.innerHTML = originalText;
        btnConfirmar.disabled = false;
    }
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