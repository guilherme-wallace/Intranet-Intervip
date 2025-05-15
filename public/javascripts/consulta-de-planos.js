// Variáveis globais
let blocosModal = null;
let apartamentoModal = null;
let currentBlock = null;

// Inicializar os tabs
function initializeTabs() {
    const tabElms = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElms.forEach(tabEl => {
        tabEl.addEventListener('click', event => {
            event.preventDefault();
            const tab = new bootstrap.Tab(tabEl);
            tab.show();
        });
    });
}

// Inicializa os modais
document.addEventListener('DOMContentLoaded', function() {
    blocosModal = new bootstrap.Modal(document.getElementById('blocos-modal'));
    apartamentoModal = new bootstrap.Modal(document.getElementById('apartamento-modal'));
    
    // Inicializa os tabs
    initializeTabs();
    
    // Configura o autoComplete para o campo de condomínio
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json())
                    .then(data => callback(data))
                    .catch(err => console.error("Erro na consulta:", err));
            }
        }
    });

    // Evento quando um condomínio é selecionado
    $('#input-condo').on('autocomplete.select', function(e, item) {   
        if (!item?.value) {
            alert("Erro: Valor selecionado inválido.");
            return;
        }

        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                // Preenche informações básicas
                $('#input-condo').val(condo.condominio);
                $("#dados-condo-cep").text(condo.cep || '-');          
                $("#dados-condo-endereco").text(condo.endereco || '-');  
                $("#dados-condo-numero").text(condo.numero || '-');     
                $("#dados-condo-cidade").text(getCidadeNome(condo.cidadeId));
                $("#dados-condo-bairro").text(condo.bairro || '-');
        
                // Esconde todas as linhas dinâmicas
                $('[id^="linha-"]').prop('hidden', true);
                $('#complemento').val('');
                
                // Busca blocos do condomínio
                loadBlocks(item.value);
            })
            .catch(err => console.error("Erro:", err));
    });

    // Configura o botão de seleção de blocos
    document.getElementById('botao-blocos').addEventListener('click', function() {
        const blocks = JSON.parse(localStorage.getItem('blocks') || '[]');
        if (blocks.length > 0) {
            showBlocksModal(blocks);
        }
    });

    // Configura o botão de seleção de apartamentos
    document.getElementById('botao-apartamentos').addEventListener('click', function() {
        if (currentBlock) {
            showApartments(currentBlock);
        }
    });

    // Configura o botão de copiar complemento
    document.getElementById('copiar-complemento').addEventListener('click', copiarComplemento);
});

// Mostra o modal com os blocos disponíveis
function showBlocksModal(blocks) {
    const blocosLista = document.getElementById('blocos-lista');
    blocosLista.innerHTML = '';
    
    // Cria um botão para cada bloco
    blocks.forEach(block => {
        const button = document.createElement('button');
        button.className = 'ivp-block-btn';
        button.innerHTML = `
            <div class="ivp-block-name">${block.name}</div>
            <div class="ivp-block-tech">${block.technology}</div>
        `;
        button.addEventListener('click', () => {
            selectBlock(block);
            blocosModal.hide();
            
        });
        blocosLista.appendChild(button);
    });
    
    blocosModal.show();
}

// Carrega os blocos de um condomínio
function loadBlocks(condominioId) {
    // Esconde alertas anteriores e reseta a interface
    document.getElementById('bloco-sem-estrutura-alert').style.display = 'none';
    document.getElementById('linha-blocos').hidden = true;
    document.getElementById('linha-apartamentos').hidden = true;
    document.getElementById('linha-casas').hidden = true;
    document.getElementById('linha-complemento').hidden = true;

    fetch(`api/v1/block/${condominioId}`)
        .then(response => {
            if (!response.ok) {
                // Trata 404 como bloco sem estrutura
                if (response.status === 404) {
                    throw new Error("sem_estrutura");
                }
                throw new Error("Erro ao carregar blocos");
            }
            return response.json();
        })
        .then(blocks => {
            if (blocks.length === 0 || (blocks.length === 1 && blocks[0].technology === 'Sem estrutura')) {
                throw new Error("sem_estrutura");
            }

            localStorage.setItem('blocks', JSON.stringify(blocks));
            document.getElementById('linha-blocos').hidden = false;
            
            if (blocks.length === 1) {
                selectBlock(blocks[0]);
                if (blocks[0].floors !== null) {
                    setTimeout(() => apartamentoModal.show(), 300);
                }
            }
        })
        .catch(error => {
            if (error.message === "sem_estrutura") {
                const alertElement = document.getElementById('bloco-sem-estrutura-alert');
                alertElement.style.display = 'block';
                
                // Atualiza a tabela de planos para estado vazio
                document.getElementById('planos-disponiveis').innerHTML = `
                    <tr>
                        <td colspan="3" class="text-center py-4 text-muted">
                            Nenhum plano disponível para esse bloco.
                        </td>
                    </tr>`;
            } else {
                console.error("Erro ao carregar blocos:", error);
                alert("Erro ao carregar informações dos blocos");
            }
        });
}

// Seleciona um bloco específico
function selectBlock(block) {
    document.getElementById('bloco-sem-estrutura-alert').style.display = 'none';
    currentBlock = block;
    document.getElementById('botao-blocos').textContent = block.name;
    document.getElementById('estrutura').textContent = block.technology;
    
    // Esconde todas as seções primeiro
    document.getElementById('linha-apartamentos').hidden = true;
    document.getElementById('linha-casas').hidden = true;
    document.getElementById('linha-complemento').hidden = true;

    if (block.technologyId === 3) {
        alert("Bloco sem estrutura!");
    } else if (block.floors !== null) {
        document.getElementById('linha-apartamentos').hidden = false;
        document.getElementById('linha-complemento').hidden = false;
    } else {
        document.getElementById('linha-casas').hidden = false;
        document.getElementById('linha-complemento').hidden = false;
        
        const numeroCasa = document.getElementById('numero-casa');
        numeroCasa.value = '';
        numeroCasa.onkeyup = function() {
            const complement = generateComplement(block.name, this.value);
            document.getElementById('complemento').value = complement;
        };
    }
    
    fetchPlans(block);
}

// Mostra a seção de apartamentos para o bloco selecionado
function showApartments(block) {
    // Limpa e preenche o modal de apartamentos
    const apartamentoLista = document.getElementById('apartamento-lista');
    apartamentoLista.innerHTML = '';
    
    for (let j = 0; j <= (block.floors - block.initialFloor); j++) {
        for (let k = 1; k <= block.units; k++) {
            const apt = `${parseInt(block.initialFloor) + j}0${k}`;
            const button = document.createElement('button');
            button.className = 'dropdown-item';
            button.type = 'button';
            button.textContent = apt;
            button.addEventListener('click', function() {
                const complement = generateComplement(block.name, `Ap ${apt}`);
                document.getElementById('complemento').value = complement;
                apartamentoModal.hide();
            });
            apartamentoLista.appendChild(button);
        }
    }
    
    apartamentoModal.show();
}

// Gera o texto do complemento
function generateComplement(blockName, value) {
    const prefixMap = {
        'Bloco': 'Bl',
        'Torre': 'T',
        'Cobertura': 'Cob',
        'Loja': 'Lj',
        'Sala': 'Sl'
    };
    
    let complement = '';
    
    for (const [prefix, abbr] of Object.entries(prefixMap)) {
        if (blockName.includes(prefix)) {
            complement += blockName.replace(prefix, abbr) + ' - ';
            break;
        }
    }
    
    if (!complement && !blockName.includes('Unico')) {
        complement += blockName + ' - ';
    }
    
    return complement + value;
}

// Copia o complemento para a área de transferência
function copiarComplemento() {
    const complemento = document.getElementById('complemento');
    complemento.select();
    document.execCommand('copy');
    
    // Feedback visual
    const btn = document.getElementById('copiar-complemento');
    btn.innerHTML = '<i class="bi bi-check"></i>';
    setTimeout(() => {
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
    }, 2000);
}

// Busca os planos disponíveis para um bloco
async function fetchPlans(block) {
    // Limpa as tabelas
    document.getElementById('planos-disponiveis').innerHTML = '';
    document.getElementById('planos-disponiveis_voip').innerHTML = '';
    document.getElementById('planos-disponiveis_app').innerHTML = '';
    
    try {
        const response = await fetch(`api/v3/plan`);
        const plans = await response.json();
        
        // Processa todos os planos
        const processedPlans = processPlans(plans, block.groupId);
        
        // Filtra planos por categoria
        const internetPlans = filterPlansByTechnology(processedPlans, block.technology);
        const voipPlans = processedPlans.filter(plan => plan.name.includes('VOIP'));
        const appPlans = processedPlans.filter(plan => plan.name.includes('APP'));
        
        // Preenche as tabelas
        fillPlansTable('planos-disponiveis', internetPlans);
        fillPlansTable('planos-disponiveis_voip', voipPlans, true);
        fillPlansTable('planos-disponiveis_app', appPlans, true);
        
    } catch (error) {
        console.error("Erro ao buscar planos:", error);
        showErrorInTables();
    }
}

// Filtra planos por tecnologia
function filterPlansByTechnology(plans, technology) {
    if (technology === 'FTTH') {
        return plans.filter(plan => plan.name.includes('FTTH'));
    } else if (technology === 'Rádio') {
        return plans.filter(plan => plan.name.includes('AIRMAX'));
    } else if (technology === 'FTTB' || technology === 'Fibra') {
        return plans.filter(plan => plan.name.includes('FIBER') && !plan.name.includes('FTTH'));
    }
    return [];
}

// Preenche uma tabela de planos
function fillPlansTable(tableId, plans, skipSpeed = false) {
    const tableBody = document.getElementById(tableId);
    
    if (plans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4 text-muted" style="color: red;">
                    Nenhum plano disponível
                </td>
            </tr>
        `;
        return;
    }
    
    plans.forEach(plan => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${plan.name.replace('IVP_HOME_', '')}</td>
            <td>${skipSpeed ? '' : plan.speed + 'M'}</td>
            <td>R$${plan.price}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Mostra mensagem de erro nas tabelas
function showErrorInTables() {
    const errorMsg = `
        <tr>
            <td colspan="3" class="text-center py-4 text-danger">
                Erro ao carregar planos
            </td>
        </tr>
    `;
    document.getElementById('planos-disponiveis').innerHTML = errorMsg;
    document.getElementById('planos-disponiveis_voip').innerHTML = errorMsg;
    document.getElementById('planos-disponiveis_app').innerHTML = errorMsg;
}

// Processa os planos aplicando descontos
function processPlans(plans, groupId) {
    return plans.map(plan => {
        return {
            name: plan.name,
            speed: plan.speed,
            price: applyDiscount(parseFloat(plan.price), groupId).toFixed(2)
        };
    }).sort((a, b) => b.speed - a.speed); // Ordena por velocidade (maior primeiro)
}

// Aplica descontos conforme grupo
function applyDiscount(price, groupId) {
    // Implemente suas regras de desconto aqui
    // Exemplo: if (groupId === 10) return price * 0.9; // 10% de desconto
    return price;
}

// Função auxiliar para mapear ID da cidade para nome
function getCidadeNome(cidadeId) {
    const cidades = {
        "3173": "Vitória",
        "3172": "Vila Velha",
        "3169": "Viana",
        "3165": "Serra",
        "3159": "Santa Teresa",
        "3112": "Cariacica"
    };
    return cidades[cidadeId] || '-';
}

function resetForm() {
    location.reload();
}

document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle script
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');

    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
        if(themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
    } else {
        if(themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
    }

    if(themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');
            if (bodyElement.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
            }
        });
    }
    
    // User Info
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const group = data.group || 'Sem grupo';
            
            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) {
                    el.textContent = username;
                }
                if (el.textContent.includes('{group}')) {
                    el.textContent = group;
                }
            });
            
            if (username === 'Visitante') {
                alert('Será necessário refazer o login!');
                window.location = "/";
            }
        })
        .catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
});