let osCarregadas = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeThemeAndUserInfo();
    carregarTecnicosParceiros();

    const selectOS = document.getElementById('select-os');
    const formContainer = document.getElementById('apr-form-container'); 
    const formAPR = document.getElementById('form-apr');
    const btnSalvar = document.getElementById('btn-salvar-apr');
    const btnCancelar = document.getElementById('btn-cancelar-apr'); 
    
    const demanda1 = document.getElementById('demanda_1');
    const demanda2 = document.getElementById('demanda_2');
    const demanda3 = document.getElementById('demanda_3');
    const demanda4 = document.getElementById('demanda_4');
    
    const inputNomePermissao = document.getElementById('apr-nome-permissao');
    const inputContatoPermissao = document.getElementById('apr-contato-permissao');
    const secaoEpis = document.getElementById('secao-epis');

    selectOS.addEventListener('change', function() {
        if(this.value) {
            formContainer.classList.remove('d-none');
            
            const osSelecionada = osCarregadas.find(os => os.id === this.value);
            
            if(osSelecionada) {
                document.getElementById('apr-cliente').value = osSelecionada.tipo === 'E' ? 'Estrutura Própria / Manutenção' : osSelecionada.cliente;
                document.getElementById('apr-atividade').value = osSelecionada.atividade;
                document.getElementById('apr-local').value = osSelecionada.local;
            }
        } else {
            formContainer.classList.add('d-none');
            formAPR.reset();
            atualizarLógicaEPIs();
        }
    });

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => window.location.reload());
    }

    inputNomePermissao.disabled = true;
    inputContatoPermissao.disabled = true;

    demanda4.addEventListener('change', function() {
        inputNomePermissao.disabled = !this.checked;
        inputContatoPermissao.disabled = !this.checked;
        if(this.checked) {
            inputNomePermissao.focus();
        } else {
            inputNomePermissao.value = '';
            inputContatoPermissao.value = '';
        }
    });

    function atualizarLógicaEPIs() {
        const isAltura = demanda1.checked;
        const isRedes = demanda2.checked;
        const isConfinado = demanda3.checked;

        if (!isAltura && !isRedes && !isConfinado) {
            secaoEpis.classList.add('d-none');
            ['cabeca', 'msup', 'face', 'resp', 'tronco', 'maos', 'pes'].forEach(id => {
                document.getElementById(`chk-epi-${id}`).required = false;
            });
            return;
        }

        secaoEpis.classList.remove('d-none');
        const todosEPIs = ['cabeca', 'msup', 'face', 'resp', 'tronco', 'maos', 'pes'];
        let obrigatorios = [];

        if (isAltura || isRedes) {
            obrigatorios.push('cabeca', 'face', 'tronco', 'maos', 'pes');
        }

        if (isConfinado) {
            obrigatorios.push('cabeca', 'face', 'resp', 'maos', 'pes');
        }

        obrigatorios = [...new Set(obrigatorios)];

        todosEPIs.forEach(epi => {
            const tr = document.getElementById(`row-epi-${epi}`);
            const chk = document.getElementById(`chk-epi-${epi}`);
            const statusBox = document.getElementById(`status-epi-${epi}`);

            if (obrigatorios.includes(epi)) {
                statusBox.innerHTML = '<span class="badge bg-danger rounded-pill px-3 py-2"><i class="bi bi-asterisk"></i> Obrigatório</span>';
                chk.required = true;
                tr.classList.add('table-warning');
            } else {
                statusBox.innerHTML = '<span class="badge bg-secondary bg-opacity-50 rounded-pill px-3 py-2 text-dark">Opcional</span>';
                chk.required = false;
                tr.classList.remove('table-warning');
            }
        });
    }

    [demanda1, demanda2, demanda3].forEach(el => el.addEventListener('change', atualizarLógicaEPIs));

    btnSalvar.addEventListener('click', async function(e) {
        e.preventDefault();

        if (!demanda1.checked && !demanda2.checked && !demanda3.checked && !demanda4.checked) {
            alert('Atenção: É obrigatório selecionar pelo menos uma Demanda do Serviço.');
            return;
        }

        if (!formAPR.checkValidity()) {
            formAPR.reportValidity();
            return;
        }

        const btnOriginalText = btnSalvar.innerHTML;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Gerando PDF Oficial...';
        btnSalvar.classList.add('disabled');

        try {
            const osId = selectOS.value;
            const osSelecionada = osCarregadas.find(os => os.id === osId);
            
            let tecnicoResponsavel = document.querySelector('.user-info span').textContent || 'Desconhecido';

            const parceiros = Array.from(document.querySelectorAll('.badge-tecnico')).map(b => b.getAttribute('data-nome'));

            const getRadioVal = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || 'nao';
            
            const atividades = {
                altura: getRadioVal('req_altura') === 'sim',
                confinado: getRadioVal('req_confinado') === 'sim',
                telecom: getRadioVal('req_telecom') === 'sim',
                icamento: getRadioVal('req_icamento') === 'sim',
                eletrica: getRadioVal('req_eletrica') === 'sim',
                movimentacao: getRadioVal('req_movimentacao') === 'sim',
                escavacao: getRadioVal('req_escavacao') === 'sim',
                pt: getRadioVal('req_pt') === 'sim'
            };

            const todosEpis = ['cabeca', 'msup', 'face', 'resp', 'tronco', 'maos', 'pes'];
            const epis = todosEpis.map(id => ({
                nome: document.querySelector(`#row-epi-${id} td:first-child`).textContent.trim(),
                checked: document.getElementById(`chk-epi-${id}`)?.checked || false
            }));

            const tabelas = document.querySelectorAll('table');
            const providencias = [];
            if (tabelas.length > 1) {
                tabelas[1].querySelectorAll('tbody tr').forEach(tr => {
                    const tds = tr.querySelectorAll('td');
                    if(tds.length === 3) {
                        const inputOutros = tds[0].querySelector('input[type="text"]');
                        let nome = inputOutros ? `Outros: ${inputOutros.value}` : tds[0].textContent.trim();
                        providencias.push({
                            nome: nome,
                            p: tds[1].querySelector('input').checked,
                            v: tds[2].querySelector('input').checked
                        });
                    }
                });
            }

            const textareas = document.querySelectorAll('textarea');
            const riscosContainer = document.querySelectorAll('.apr-section')[4];
            
            const payload = {
                os: osSelecionada,
                tecnico_responsavel: tecnicoResponsavel,
                parceiros: parceiros,
                cliente_permissao: demanda4.checked ? `${inputNomePermissao.value} (${inputContatoPermissao.value})` : '',
                data_preenchimento: new Date().toLocaleString('pt-BR'),
                atividades: atividades,
                demandas: {
                    altura: demanda1.checked,
                    redes: demanda2.checked,
                    confinado: demanda3.checked,
                    permissao: demanda4.checked
                },
                epis: epis,
                providencias: providencias,
                textos: {
                    outras_protecoes: textareas[0]?.value || '',
                    recomendacoes: textareas[1]?.value || ''
                },
                riscos: {
                    queda_alt: document.getElementById('risco_queda_alt')?.checked || false,
                    impacto: document.getElementById('risco_impacto')?.checked || false,
                    insetos: document.getElementById('risco_insetos')?.checked || false,
                    transito: document.getElementById('risco_transito')?.checked || false,
                    ergonomico: document.getElementById('risco_ergonomico')?.checked || false,
                    outros: riscosContainer ? riscosContainer.querySelector('input[type="text"]')?.value || '' : ''
                }
            };

            const response = await fetch('/api/v5/analise-de-risco/salvar-apr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Erro ao salvar APR.');

            alert(`✅ APR gerada com sucesso!\nO.S. atualizada no IXC.\n\nLink do PDF: ${result.link}`);
            window.location.reload();

        } catch (error) {
            console.error(error);
            alert(`Falha ao salvar APR: ${error.message}`);
            btnSalvar.innerHTML = btnOriginalText;
            btnSalvar.classList.remove('disabled');
        }
    });

    const btnAddTecnico = document.getElementById('btn-add-tecnico');
    const selectTecnico = document.getElementById('select-tecnico');
    const listaTecnicos = document.getElementById('lista-tecnicos');

    btnAddTecnico.addEventListener('click', function() {
        const tecnicoData = selectTecnico.value;
        if(tecnicoData) {
            const tec = JSON.parse(tecnicoData);

            const jaAdicionado = document.querySelector(`.badge-tecnico[data-id="${tec.id}"]`);
            if (jaAdicionado) {
                alert("Este técnico já foi adicionado!");
                return;
            }

            const badge = document.createElement('span');
            badge.className = 'badge bg-secondary py-2 px-3 fs-6 rounded-pill d-flex align-items-center shadow-sm badge-tecnico';
            badge.setAttribute('data-id', tec.id);
            badge.setAttribute('data-nome', tec.nome);
            
            badge.innerHTML = `<i class="bi bi-person-fill me-2"></i> <span>${tec.nome}</span> 
                               <i class="bi bi-x-circle-fill ms-3 text-white-50 btn-remove-tecnico" style="cursor: pointer; transition: color 0.2s;" title="Remover Técnico"></i>`;
            
            const btnRemove = badge.querySelector('.btn-remove-tecnico');
            btnRemove.addEventListener('mouseover', () => btnRemove.classList.replace('text-white-50', 'text-white'));
            btnRemove.addEventListener('mouseout', () => btnRemove.classList.replace('text-white', 'text-white-50'));
            btnRemove.addEventListener('click', () => badge.remove());

            listaTecnicos.appendChild(badge);
            selectTecnico.value = '';
        }
    });
});

async function carregarMinhasOSPendentes(username) {
    const selectOS = document.getElementById('select-os');
    selectOS.innerHTML = '<option value="">Sincronizando com o IXC, aguarde...</option>';
    
    try {
        const response = await fetch(`/api/v5/analise-de-risco/minhas-os?username=${username}`);
        if (!response.ok) throw new Error('Falha ao conectar na API');
        
        osCarregadas = await response.json();
        
        selectOS.innerHTML = '<option value="" selected>Selecione uma O.S. para iniciar a APR...</option>';
        
        if (osCarregadas.length === 0) {
            selectOS.innerHTML = '<option value="" selected>✓ Nenhuma O.S. pendente no seu nome.</option>';
        } else {
            osCarregadas.forEach(os => {
                const option = document.createElement('option');
                option.value = os.id;
                
                const nomeTruncado = os.cliente.length > 30 ? os.cliente.substring(0, 30) + '...' : os.cliente;
                
                if (os.tipo === 'E' || os.id_cliente === '0') {
                    const localTruncado = os.local.length > 35 ? os.local.substring(0, 35) + '...' : os.local;
                    option.textContent = `[Estrutura: OS ${os.id}] - ${localTruncado} (${os.atividade})`;
                } else {
                    option.textContent = `[Cliente: ${os.id_cliente}] - ${nomeTruncado} (${os.atividade})`;
                }
                
                selectOS.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar OS:", error);
        selectOS.innerHTML = '<option value="">❌ Erro de comunicação com o IXC. Tente atualizar a página.</option>';
    }
}

async function carregarTecnicosParceiros() {
    const selectTecnico = document.getElementById('select-tecnico');
    selectTecnico.innerHTML = '<option value="">Carregando técnicos...</option>';

    try {
        const response = await fetch('/api/v5/analise-de-risco/tecnicos-parceiros');
        if (!response.ok) throw new Error('Erro ao buscar técnicos');

        const tecnicos = await response.json();
        
        selectTecnico.innerHTML = '<option value="">Selecione o colega...</option>';
        
        tecnicos.forEach(tec => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ id: tec.id_tecnico, nome: tec.nome });
            option.textContent = tec.nome;
            selectTecnico.appendChild(option);
        });

    } catch (error) {
        console.error("Erro:", error);
        selectTecnico.innerHTML = '<option value="">Erro ao carregar lista.</option>';
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
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                return setTimeout(() => { window.location = "/"; }, 300);
            }
            
            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) el.textContent = username;
                if (el.textContent.includes('{group}')) el.textContent = group;
            });

            carregarMinhasOSPendentes(username);

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário:', error);
        });
}