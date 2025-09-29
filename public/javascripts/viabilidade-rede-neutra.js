document.addEventListener('DOMContentLoaded', function() {
    
    // Configura o autoComplete para o campo de condomínio
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                fetch(`api/v4/condominio?query=${query}`)
                    .then(response => response.json())
                    .then(data => callback(data))
                    .catch(err => console.error("Erro na busca de condomínios:", err));
            }
        }
    });

    // Evento quando um condomínio é selecionado
    $('#input-condo').on('autocomplete.select', function(e, item) {   
        if (!item?.value) {
            alert("Erro: Valor selecionado inválido.");
            return;
        }

        // Busca detalhes do condomínio selecionado
        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                $('#input-condo').val(condo.condominio);
                $("#dados-condo-cep").text(condo.cep || '-');          
                $("#dados-condo-endereco").text(condo.endereco || '-');  
                $("#dados-condo-numero").text(condo.numero || '-');     
                $("#dados-condo-cidade").text(getCidadeNome(condo.cidadeId));
                $("#dados-condo-bairro").text(condo.bairro || '-');
                document.getElementById('resultado-container').style.display = 'block';
                loadAndCheckBlocks(item.value);
            })
            .catch(err => {
                console.error("Erro ao buscar detalhes do condomínio:", err)
                alert('Não foi possível carregar os detalhes do condomínio.');
            });
    });

    // --- Lógica de Tema e Usuário (CORRIGIDA) ---
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
            const newTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            themeToggleButton.innerHTML = newTheme === 'dark' ? '<i class="bi bi-brightness-high"></i>' : '<i class="bi bi-moon-stars"></i>';
        });
    }
    
    // ***** INÍCIO DA CORREÇÃO *****
    // Lógica para buscar e exibir nome de usuário e grupo
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const group = data.group || 'Sem grupo';

            // Redireciona se for visitante
            if (username === 'Visitante') {
                alert('Será necessário refazer o login!');
                window.location = "/";
                return; // Impede a execução do resto do código
            }
            
            // Itera por todos os spans dentro de .user-info e substitui o conteúdo
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
            // Opcional: redirecionar para login em caso de falha na API
            alert('Não foi possível verificar seu usuário. Por favor, faça o login novamente.');
            window.location = "/";
        });
    // ***** FIM DA CORREÇÃO *****
});

/**
 * Carrega os blocos, preenche a tabela e define o status de viabilidade.
 * @param {string} condominioId - O ID do condomínio a ser verificado.
 */
function loadAndCheckBlocks(condominioId) {
    const statusElement = document.getElementById('viabilidade-status');
    const tabelaCorpo = document.getElementById('blocos-tabela-corpo');
    
    tabelaCorpo.innerHTML = '<tr><td colspan="2" class="text-center">Buscando...</td></tr>';
    statusElement.style.display = 'none';
    statusElement.className = 'viabilidade-status';

    fetch(`api/v1/block/${condominioId}`)
        .then(response => {
            if (response.status === 404) return [];
            if (!response.ok) throw new Error("Erro na rede ou servidor.");
            return response.json();
        })
        .then(blocks => {
            tabelaCorpo.innerHTML = '';
            let possuiFTTH = false;

            if (blocks.length === 0) {
                tabelaCorpo.innerHTML = '<tr><td colspan="2" class="text-center text-muted">Nenhuma estrutura encontrada.</td></tr>';
            } else {
                blocks.forEach(block => {
                    const row = tabelaCorpo.insertRow();
                    row.innerHTML = `<td>${block.name}</td><td>${block.technology}</td>`;
                    
                    if (block.technology === 'FTTH') {
                        possuiFTTH = true;
                        row.classList.add('row-ftth');
                    } else {
                        row.classList.add('row-other-tech');
                    }
                });
            }

            if (possuiFTTH) {
                statusElement.textContent = 'Possui Viabilidade';
                statusElement.classList.add('status-ok');
            } else {
                statusElement.textContent = 'Não Possui Viabilidade no Momento';
                statusElement.classList.add('status-nok');
            }
            statusElement.style.display = 'block';
        })
        .catch(error => {
            console.error("Erro ao carregar blocos:", error);
            tabelaCorpo.innerHTML = '<tr><td colspan="2" class="text-center text-danger">Erro ao carregar estruturas.</td></tr>';
            statusElement.textContent = 'Erro na Verificação';
            statusElement.classList.add('status-nok');
            statusElement.style.display = 'block';
        });
}

/**
 * Função auxiliar para mapear ID da cidade para nome.
 */
function getCidadeNome(cidadeId) {
    const cidades = {
        "3173": "Vitória", "3172": "Vila Velha", "3169": "Viana",
        "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica"
    };
    return cidades[cidadeId] || 'Não identificada';
}