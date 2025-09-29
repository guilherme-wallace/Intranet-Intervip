// intranet-intervip/public/javascripts/viabilidade-rede-neutra.js

document.addEventListener('DOMContentLoaded', function() {
    // --- INICIALIZAÇÃO DOS COMPONENTES ---
    initializeSearchModeToggle();
    setupCondoSearch();
    setupAddressSearch();
    initializeThemeAndUserInfo(); // Esta função agora está definida abaixo
});

// -----------------------------------------------------------------------------
// --- LÓGICA PARA ALTERNAR OS MODOS DE BUSCA (CONDOMÍNIO / ENDEREÇO) ---
// -----------------------------------------------------------------------------
function initializeSearchModeToggle() {
    const btnCondo = document.getElementById('btn-show-condo-search');
    const btnAddress = document.getElementById('btn-show-address-search');
    const panelCondo = document.getElementById('search-by-condo-panel');
    const panelAddress = document.getElementById('search-by-address-panel');
    const resultsContainer = document.getElementById('resultado-container');

    btnCondo.addEventListener('click', () => {
        panelCondo.style.display = 'block';
        panelAddress.style.display = 'none';
        resultsContainer.style.display = 'none';
        btnCondo.classList.add('active-btn');
        btnAddress.classList.remove('active-btn');
    });

    btnAddress.addEventListener('click', () => {
        panelCondo.style.display = 'none';
        panelAddress.style.display = 'block';
        resultsContainer.style.display = 'none';
        btnAddress.classList.add('active-btn');
        btnCondo.classList.remove('active-btn');
    });
}

// -----------------------------------------------------------------------------
// --- LÓGICA DE BUSCA POR CONDOMÍNIO ---
// -----------------------------------------------------------------------------
function setupCondoSearch() {
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

    $('#input-condo').on('autocomplete.select', function(e, item) {
        if (!item?.value) return;

        $('#loading-spinner').show();
        $('#resultado-container').hide();
        $('#condo-info-card').show();

        fetch(`api/v1/condominio/${item.value}`)
            .then(response => response.json())
            .then(condo => {
                $('#input-condo').val(condo.condominio);
                $("#dados-condo-cep").text(condo.cep || '-');
                $("#dados-condo-endereco").text(condo.endereco || '-');
                $("#dados-condo-numero").text(condo.numero || '-');
                $("#dados-condo-cidade").text(getCidadeNome(condo.cidadeId));
                $("#dados-condo-bairro").text(condo.bairro || '-');
                loadAndCheckBlocks(item.value);
            })
            .catch(err => {
                console.error("Erro ao buscar detalhes do condomínio:", err);
                $('#loading-spinner').hide();
            });
    });
}

function loadAndCheckBlocks(condominioId) {
    const resultsContainer = document.getElementById('resultado-container');
    const tableHead = document.getElementById('results-table-head');
    const tableBody = document.getElementById('results-table-body');
    const statusElement = document.getElementById('viabilidade-status');
    
    document.getElementById('results-title').textContent = 'Estruturas Encontradas';
    tableHead.innerHTML = '<tr><th>Bloco/Torre</th><th>Tecnologia</th></tr>';
    tableBody.innerHTML = '';

    fetch(`api/v1/block/${condominioId}`)
        .then(response => response.status === 404 ? [] : response.json())
        .then(blocks => {
            let possuiFTTH = false;
            if (blocks && blocks.length > 0) {
                blocks.forEach(block => {
                    const row = tableBody.insertRow();
                    row.innerHTML = `<td>${block.name}</td><td>${block.technology}</td>`;
                    if (block.technology === 'FTTH') {
                        possuiFTTH = true;
                        row.classList.add('row-ftth');
                    } else {
                        row.classList.add('row-other-tech');
                    }
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Nenhuma estrutura encontrada.</td></tr>`;
            }

            statusElement.textContent = possuiFTTH ? 'Possui Viabilidade' : 'Não Possui Viabilidade no Momento';
            statusElement.className = possuiFTTH ? 'viabilidade-status status-ok' : 'viabilidade-status status-nok';
            
            statusElement.style.display = 'block';
            resultsContainer.style.display = 'block';
        })
        .catch(error => {
            console.error("Erro ao carregar blocos:", error);
            tableBody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">Erro ao carregar estruturas.</td></tr>`;
        })
        .finally(() => {
            $('#loading-spinner').hide();
        });
}

// -----------------------------------------------------------------------------
// --- LÓGICA DE BUSCA POR ENDEREÇO (API GEOGRID) ---
// -----------------------------------------------------------------------------
function setupAddressSearch() {
    const input = document.getElementById('input-address');
    const suggestions = document.getElementById('address-suggestions');
    let debounceTimer;

    input.addEventListener('keyup', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = input.value.trim();
            if (query.length < 3) {
                suggestions.style.display = 'none';
                return;
            }
            fetch(`/api/v5/address-autocomplete?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    suggestions.innerHTML = '';
                    if (data && data.length > 0) {
                        data.forEach(item => {
                            const li = document.createElement('li');
                            li.className = 'list-group-item list-group-item-action';
                            li.textContent = item.description;
                            li.style.cursor = 'pointer';
                            li.onclick = () => selectAddress(item.description, item.place_id);
                            suggestions.appendChild(li);
                        });
                        suggestions.style.display = 'block';
                    } else {
                        suggestions.style.display = 'none';
                    }
                });
        }, 300);
    });
}

function selectAddress(description, placeId) {
    document.getElementById('input-address').value = description;
    document.getElementById('address-suggestions').style.display = 'none';
    
    $('#loading-spinner').show();
    $('#resultado-container').hide();
    $('#condo-info-card').hide();

    fetch('/api/v5/geogrid-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: placeId })
    })
    .then(response => {
        if (!response.ok) throw new Error('Falha na resposta do servidor Geogrid');
        return response.json();
    })
    .then(caixas => {
        displayGeogridResults(caixas);
    })
    .catch(error => {
        console.error('Erro ao buscar dados do Geogrid:', error);
        displayGeogridResults([]);
    })
    .finally(() => {
        $('#loading-spinner').hide();
    });
}

function displayGeogridResults(caixas) {
    const resultsContainer = document.getElementById('resultado-container');
    const tableHead = document.getElementById('results-table-head');
    const tableBody = document.getElementById('results-table-body');
    const statusElement = document.getElementById('viabilidade-status');
    
    document.getElementById('results-title').textContent = 'Equipamentos Próximos (Raio de 400m)';
    tableHead.innerHTML = `<tr><th>Nome</th><th>Distância</th><th>Portas Livres</th><th>Local</th></tr>`;
    tableBody.innerHTML = '';

    if (!caixas || caixas.length === 0) {
        statusElement.textContent = 'Não Possui Viabilidade no Momento';
        statusElement.className = 'viabilidade-status status-nok';
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento com portas livres encontrado no raio.</td></tr>`;
    } else {
        const itensExcluidos = ['poste'];

        const caixasFiltradas = caixas.filter(caixa => !itensExcluidos.includes(caixa.item));

        caixasFiltradas.sort((a, b) => a.distancia - b.distancia);

        const top10Caixas = caixasFiltradas.slice(0, 5);

        if (top10Caixas.length === 0) {
            statusElement.textContent = 'Não Possui Viabilidade no Momento';
            statusElement.className = 'viabilidade-status status-nok';
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento de atendimento (CTO, etc.) encontrado no raio.</td></tr>`;
        } else {
            statusElement.textContent = 'Possui Viabilidade';
            statusElement.className = 'viabilidade-status status-ok';
            
            top10Caixas.forEach(caixa => {
                const row = tableBody.insertRow();
                
                row.className = parseInt(caixa.portasLivres) > 0 ? 'row-available' : 'row-unavailable';

                const mapsUrl = `https://www.google.com/maps?q=${caixa.latitude},${caixa.longitude}`;
                const linkMapa = `<a href="${mapsUrl}" target="_blank" class="map-link"><i class="bi bi-geo-alt-fill"></i> Ver</a>`;

                row.innerHTML = `
                    <td>${caixa.sigla || 'N/D'}</td>
                    <td>${caixa.distancia ? `${caixa.distancia.toFixed(2)} m` : 'N/D'}</td>
                    <td>${caixa.portasLivres}</td>
                    <td class="text-center">${linkMapa}</td>
                `;
            });
        }
    }

    statusElement.style.display = 'block';
    resultsContainer.style.display = 'block';
}

function getCidadeNome(cidadeId) {
    const cidades = {
        "3173": "Vitória", "3172": "Vila Velha", "3169": "Viana",
        "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica"
    };
    return cidades[cidadeId] || 'Não identificada';
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
    
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const group = data.group || 'Sem grupo';

            if (username === 'Visitante') {
                alert('Será necessário refazer o login!');
                window.location = "/";
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
            alert('Não foi possível verificar seu usuário. Por favor, faça o login novamente.');
            window.location = "/";
        });
}