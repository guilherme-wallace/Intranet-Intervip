document.addEventListener('DOMContentLoaded', function() {

    initializeThemeAndUserInfo();

    const selectOS = document.getElementById('select-os');
    const formContainer = document.getElementById('apr-form-container'); // Agora controlamos a DIV inteira
    const btnSalvar = document.getElementById('btn-salvar-apr');
    const btnCancelar = document.getElementById('btn-cancelar-apr'); // Referência Segura (CSP)
    
    const chkPermissao = document.getElementById('demanda_4');
    const inputNomePermissao = document.getElementById('apr-nome-permissao');
    const inputContatoPermissao = document.getElementById('apr-contato-permissao');

    // MOCK: Dados da OS
    const mockOSPendentes = [
        { id: "OS-89421", cliente: "Empresa de Logística S.A.", local: "Rua das Flores, 123", atividade: "Lançamento de Fibra e Fusão" },
        { id: "OS-89502", cliente: "Supermercado Compre Bem", local: "Av. Principal, 400", atividade: "Troca de Roteador / Reparo Interno" },
        { id: "OS-89555", cliente: "João Carlos Silva", local: "Rua do Bosque, 89", atividade: "Instalação Nova Residencial" }
    ];

    // Carrega select fake
    mockOSPendentes.forEach(os => {
        const option = document.createElement('option');
        option.value = os.id;
        option.textContent = `[${os.id}] - ${os.cliente} (${os.atividade})`;
        selectOS.appendChild(option);
    });

    // Lógica principal: Esconde ou Mostra o Formulário
    selectOS.addEventListener('change', function() {
        if(this.value) {
            // Remove a classe d-none para mostrar o form suavemente
            formContainer.classList.remove('d-none');
            
            const osSelecionada = mockOSPendentes.find(os => os.id === this.value);
            document.getElementById('apr-cliente').value = osSelecionada.cliente;
            document.getElementById('apr-atividade').value = osSelecionada.atividade;
            document.getElementById('apr-local').value = osSelecionada.local;
            
        } else {
            // Oculta novamente se ele voltar para a opção vazia
            formContainer.classList.add('d-none');
            document.getElementById('form-apr').reset();
        }
    });

    // Evento seguro para o botão Cancelar (sem JS inline no HTML)
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            window.location.reload();
        });
    }

    // Demanda 4: Permissão do Cliente
    inputNomePermissao.disabled = true;
    inputContatoPermissao.disabled = true;

    chkPermissao.addEventListener('change', function() {
        inputNomePermissao.disabled = !this.checked;
        inputContatoPermissao.disabled = !this.checked;
        
        if(this.checked) {
            inputNomePermissao.focus();
        } else {
            inputNomePermissao.value = '';
            inputContatoPermissao.value = '';
        }
    });

    // Adicionar Técnico (Sem scripts Inline para Exclusão)
    const btnAddTecnico = document.getElementById('btn-add-tecnico');
    const selectTecnico = document.getElementById('select-tecnico');
    const listaTecnicos = document.getElementById('lista-tecnicos');

    btnAddTecnico.addEventListener('click', function() {
        const tecnicoName = selectTecnico.value;
        if(tecnicoName) {
            // Cria o elemento principal da Badge
            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary py-2 px-3 fs-6 rounded-pill d-flex align-items-center shadow-sm';
            
            // Cria os icones e o texto interno
            badge.innerHTML = `<i class="bi bi-person-fill me-2"></i> <span>${tecnicoName}</span> 
                               <i class="bi bi-x-circle-fill ms-3 text-white-50 btn-remove-tecnico" style="cursor: pointer; transition: color 0.2s;" title="Remover Técnico"></i>`;
            
            // Adiciona o EventListener APENAS no ícone de exclusão
            const btnRemove = badge.querySelector('.btn-remove-tecnico');
            btnRemove.addEventListener('mouseover', () => btnRemove.classList.replace('text-white-50', 'text-white'));
            btnRemove.addEventListener('mouseout', () => btnRemove.classList.replace('text-white', 'text-white-50'));
            btnRemove.addEventListener('click', function() {
                badge.remove();
            });

            listaTecnicos.appendChild(badge);
            selectTecnico.value = '';
        }
    });
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
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                showModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                setTimeout(() => { window.location = "/"; }, 300);
                return;
            }
        document.querySelectorAll('.user-info span').forEach(el => {
            if (el.textContent.includes('{username}')) el.textContent = username;
            if (el.textContent.includes('{group}')) el.textContent = group;
        });

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
}