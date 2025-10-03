let currentSearchedAddress = '';

document.addEventListener('DOMContentLoaded', function() {
    initializeSearchModeToggle();
    setupCondoSearch();
    setupAddressSearch();
    initializeThemeAndUserInfo();
});

function initializeSearchModeToggle() {
    const btnCondo = document.getElementById('btn-show-condo-search');
    const btnAddress = document.getElementById('btn-show-address-search');
    const panelCondo = document.getElementById('search-by-condo-panel');
    const panelAddress = document.getElementById('search-by-address-panel');
    const condoResults = document.getElementById('condo-results-container');
    const detailsResults = document.getElementById('details-results-container');

    btnCondo.addEventListener('click', () => {
        panelCondo.style.display = 'block';
        panelAddress.style.display = 'none';
        condoResults.style.display = 'none';
        detailsResults.style.display = 'none';
        btnCondo.classList.add('active-btn');
        btnAddress.classList.remove('active-btn');
    });

    btnAddress.addEventListener('click', () => {
        panelCondo.style.display = 'none';
        panelAddress.style.display = 'block';
        condoResults.style.display = 'none';
        detailsResults.style.display = 'none';
        btnAddress.classList.add('active-btn');
        btnCondo.classList.remove('active-btn');
    });
}

function setupCondoSearch() {
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function(query, callback) {
                fetch(`api/v4/condominio?query=${query}`).then(res => res.json()).then(data => callback(data));
            }
        }
    });

    $('#input-condo').on('autocomplete.select', function(e, item) {
        if (!item?.value) return;
        $('#loading-spinner').show();
        $('#condo-results-container').hide();
        $('#details-results-container').hide();
        Promise.all([
            fetch(`api/v1/condominio/${item.value}`).then(res => res.json()),
            fetch(`api/v1/block/${item.value}`).then(res => res.ok ? res.json() : [])
        ]).then(([condo, blocks]) => {
            $('#input-condo').val(condo.condominio);
            $("#dados-condo-cep").text(condo.cep || '-');
            $("#dados-condo-endereco").text(condo.endereco || '-');
            $("#dados-condo-numero").text(condo.numero || '-');
            $("#dados-condo-cidade").text(getCidadeNome(condo.cidadeId));
            $("#dados-condo-bairro").text(condo.bairro || '-');
            if (!blocks || blocks.length === 0) {
                $('#estrutura-principal').text('Nenhuma');
                fetchPlans(null);
                $('#condo-results-container').show(); 
                const statusElement = document.getElementById('viabilidade-status');
                statusElement.textContent = 'Não Possuímos Viabilidade no Momento';
                statusElement.className = 'viabilidade-status status-nok';
                statusElement.style.display = 'block';
                document.getElementById('results-title').style.display = 'none';
                document.getElementById('results-table-head').innerHTML = '';
                document.getElementById('results-table-body').innerHTML = '';
                $('#details-results-container').show();
            } else {
                const principalTechnology = determinePrincipalTechnology(blocks);
                $('#estrutura-principal').text(principalTechnology || 'Nenhuma');
                fetchPlans(principalTechnology);
                displayBlockDetails(blocks);
                $('#condo-results-container').show();
                $('#details-results-container').show();
            }
        }).catch(err => {
            console.error("Erro ao buscar detalhes do condomínio ou blocos:", err);
            const statusElement = document.getElementById('viabilidade-status');
            statusElement.textContent = 'Erro ao consultar. Tente novamente.';
            statusElement.className = 'viabilidade-status status-nok';
            statusElement.style.display = 'block';
            $('#details-results-container').show();
        }).finally(() => {
            $('#loading-spinner').hide();
        });
    });
}

function determinePrincipalTechnology(blocks) {
    if (!blocks || blocks.length === 0) return null;
    const technologies = blocks.map(b => b.technology);
    if (technologies.includes('FTTH')) return 'FTTH';
    if (technologies.includes('FTTB') || technologies.includes('Fibra')) return 'FTTB';
    if (technologies.includes('Rádio')) return 'Rádio';
    return technologies[0];
}

function displayBlockDetails(blocks) {
    const tableHead = document.getElementById('results-table-head');
    const tableBody = document.getElementById('results-table-body');
    const statusElement = document.getElementById('viabilidade-status');
    
    document.getElementById('results-title').textContent = 'Estruturas Detalhadas por Bloco';
    tableHead.innerHTML = '<tr><th>Bloco/Torre</th><th>Tecnologia</th></tr>';
    tableBody.innerHTML = '';
    statusElement.style.display = 'none';

    if (blocks && blocks.length > 0) {
        blocks.forEach(block => {
            const row = tableBody.insertRow();
            row.innerHTML = `<td>${block.name}</td><td>${block.technology}</td>`;
            if (block.technology === 'FTTH') row.classList.add('row-ftth');
            else row.classList.add('row-other-tech');
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">Nenhuma estrutura encontrada.</td></tr>`;
    }
}

async function fetchPlans(technology) {
    const tables = ['planos-disponiveis', 'planos-disponiveis_voip', 'planos-disponiveis_app'];
    tables.forEach(id => document.getElementById(id).innerHTML = '<tr><td colspan="3" class="text-center py-4">Carregando...</td></tr>');
    
    try {
        const response = await fetch(`api/v3/plan`);
        const plans = await response.json();
        
        const processedPlans = processPlans(plans);
        
        const internetPlans = filterPlansByTechnology(processedPlans, technology);
        const voipPlans = processedPlans.filter(plan => plan.name.includes('VOIP'));
        const appPlans = processedPlans.filter(plan => plan.name.includes('APP'));
        
        fillPlansTable('planos-disponiveis', internetPlans);
        fillPlansTable('planos-disponiveis_voip', voipPlans, true);
        fillPlansTable('planos-disponiveis_app', appPlans, true);
        
    } catch (error) {
        console.error("Erro ao buscar planos:", error);
        tables.forEach(id => document.getElementById(id).innerHTML = '<tr><td colspan="3" class="text-center text-danger">Erro ao carregar planos.</td></tr>');
    }
}

function processPlans(plans) {
    return plans.map(plan => ({
        name: plan.name,
        speed: plan.speed,
        price: parseFloat(plan.price).toFixed(2)
    })).sort((a, b) => b.speed - a.speed);
}

function filterPlansByTechnology(plans, technology) {
    if (technology === 'FTTH') return plans.filter(p => p.name.includes('FTTH'));
    if (technology === 'Rádio') return plans.filter(p => p.name.includes('AIRMAX'));
    if (technology === 'FTTB' || technology === 'Fibra') return plans.filter(p => p.name.includes('FIBER') && !p.name.includes('FTTH'));
    return [];
}

function fillPlansTable(tableId, plans, skipSpeed = false) {
    const tableBody = document.getElementById(tableId);
    tableBody.innerHTML = '';
    
    if (plans.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted">Nenhum plano disponível</td></tr>`;
        return;
    }
    
    plans.forEach(plan => {
        const row = document.createElement('tr');
        const cleanName = plan.name.replace(/IVP_HOME_|FTTH|FIBER|AIRMAX|_/g, ' ').trim();
        row.innerHTML = `
            <td>${cleanName}</td>
            <td>${skipSpeed ? '-' : plan.speed + 'M'}</td>
            <td>R$${plan.price}</td>
        `;
        tableBody.appendChild(row);
    });
}

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
    currentSearchedAddress = description; 
    
    document.getElementById('input-address').value = description;
    document.getElementById('address-suggestions').style.display = 'none';
    
    $('#loading-spinner').show();
    $('#details-results-container').hide();
    
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
        $('#details-results-container').show();
    });
}

function displayGeogridResults(caixas) {
    const tableHead = document.getElementById('results-table-head');
    const tableBody = document.getElementById('results-table-body');
    const statusElement = document.getElementById('viabilidade-status');
    
    document.getElementById('results-title').textContent = 'Equipamentos Próximos (Raio de 400m)';
    tableHead.innerHTML = `<tr><th>Nome</th><th>Distância</th><th>Portas Livres</th><th>Local</th></tr>`;
    tableBody.innerHTML = '';

    const itensExcluidos = ['poste'];
    const caixasFiltradas = caixas.filter(caixa => !itensExcluidos.includes(caixa.item) && caixa.portasLivres > 0);

    if (caixasFiltradas.length === 0) {
        statusElement.textContent = 'Não Possui Viabilidade no Momento';
        statusElement.className = 'viabilidade-status status-nok';
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Nenhum equipamento de atendimento com portas livres encontrado.</td></tr>`;
    } else {
        statusElement.textContent = 'Possui Viabilidade';
        statusElement.className = 'viabilidade-status status-ok';
        
        caixasFiltradas.sort((a, b) => a.distancia - b.distancia);
        const top10Caixas = caixasFiltradas.slice(0, 10);

        top10Caixas.forEach(caixa => {
            const row = tableBody.insertRow();
            row.className = parseInt(caixa.portasLivres) > 0 ? 'row-available' : 'row-unavailable';
            const origin = encodeURIComponent(currentSearchedAddress);
            const destination = `${caixa.latitude},${caixa.longitude}`;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
            
            const linkMapa = `<a href="${mapsUrl}" target="_blank" class="map-link"><i class="bi bi-geo-alt-fill"></i> Ver Rota</a>`;
            
            row.innerHTML = `
                <td>${caixa.sigla || 'N/D'}</td>
                <td>${caixa.distancia ? `${caixa.distancia.toFixed(2)} m` : 'N/D'}</td>
                <td>${caixa.portasLivres}</td>
                <td class="text-center">${linkMapa}</td>
            `;
        });
    }
    statusElement.style.display = 'block';
}

function getCidadeNome(cidadeId) {
    const cidades = {"3173": "Vitória", "3172": "Vila Velha", "3169": "Viana", "3165": "Serra", "3159": "Santa Teresa", "3112": "Cariacica"};
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

            if (group === 'RedeNeutra') {
                document.body.classList.add('user-group-redeneutra');
            }

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
            alert('Não foi possível verificar seu usuário. Por favor, faça o login novamente.');
            window.location = "/";
        });
}