document.addEventListener('DOMContentLoaded', function() {

    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsTable = document.getElementById('resultsTable');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const equipamentosTableBody = document.getElementById('equipamentosTableBody');
    const cadastroForm = document.getElementById('cadastroForm');
    const saveEquipamentoBtn = document.getElementById('saveEquipamentoBtn');
    const tipoEquipamentoSelect = document.getElementById('tipoEquipamento');
    const cadastroEquipamentoModal = new bootstrap.Modal(document.getElementById('cadastroEquipamentoModal'));

    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    const detailsForm = document.getElementById('detailsForm');
    const detailsTableContainer = document.getElementById('detailsTableContainer');
    const detailsTableBody = document.getElementById('detailsTableBody');
    const editEquipamentoBtn = document.getElementById('editEquipamentoBtn');
    const deleteEquipamentoBtn = document.getElementById('deleteEquipamentoBtn');
    const saveEditEquipamentoBtn = document.getElementById('saveEditEquipamentoBtn');
    const detailsModalLabel = document.getElementById('detailsModalLabel');

    let userGroup = '';

    function showMessageModal(title, message, isSuccess = true) {
        let modalEl = document.getElementById('messageModal');
        if (!modalEl) {
            const modalHtml = `
                <div class="modal fade" id="messageModal" tabindex="-1" aria-labelledby="messageModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-sm modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="messageModalLabel"></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modalEl = document.getElementById('messageModal');
        }

        const modal = new bootstrap.Modal(modalEl);
        const modalTitle = modalEl.querySelector('.modal-header .modal-title');
        const modalBody = modalEl.querySelector('.modal-body');

        modalTitle.textContent = title;
        modalBody.textContent = message;

        modalTitle.className = isSuccess ? 'modal-title text-success' : 'modal-title text-danger';

        modal.show();
    }

    // Função para exibir um modal de confirmação customizado
    function showConfirmModal(message, onConfirm) {
        let confirmModalEl = document.getElementById('confirmModal');
        if (!confirmModalEl) {
            const modalHtml = `
                <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-sm modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="confirmModalLabel">Confirmação</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Não</button>
                                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Sim</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            confirmModalEl = document.getElementById('confirmModal');
        }

        const confirmModal = new bootstrap.Modal(confirmModalEl);
        const modalBody = confirmModalEl.querySelector('.modal-body');
        modalBody.textContent = message;

        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        const newConfirmDeleteBtn = confirmDeleteBtn.cloneNode(true);
        confirmDeleteBtn.parentNode.replaceChild(newConfirmDeleteBtn, confirmDeleteBtn);
        
        newConfirmDeleteBtn.addEventListener('click', () => {
            onConfirm();
            confirmModal.hide();
        });

        confirmModal.show();
    }


    function loadTiposEquipamento(selectElement, selectedValue) {
        fetch('/api/v1/equipamentos/tipos')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar os tipos de equipamento');
                }
                return response.json();
            })
            .then(data => {
                selectElement.innerHTML = '';
                data.forEach(tipo => {
                    const option = document.createElement('option');
                    option.value = tipo.id_equipamentoTipo;
                    option.textContent = tipo.tipo_equipamento;
                    selectElement.appendChild(option);
                });
                if (selectedValue) {
                    selectElement.value = selectedValue;
                } else {
                    selectElement.value = '1';
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                showMessageModal('Erro', 'Erro ao carregar tipos de equipamento.', false);
            });
    }

    function searchEquipamentos(searchTerm) {
        let url = '/api/v1/equipamentos';
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar equipamentos');
                }
                return response.json();
            })
            .then(data => {
                equipamentosTableBody.innerHTML = '';
                if (data.length > 0) {
                    resultsTable.style.display = 'block';
                    noResultsMessage.style.display = 'none';
                    data.forEach(equipamento => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${equipamento.tipo_equipamento}</td>
                            <td>${equipamento.nome || 'N/A'}</td>
                            <td>${equipamento.marca}</td>
                            <td>${equipamento.modelo}</td>
                            <td>
                                <button class="btn btn-sm btn-info view-details-btn" data-equipamento='${JSON.stringify(equipamento)}'>
                                    <i class="bi bi-eye"></i> Detalhes
                                </button>
                            </td>
                        `;
                        equipamentosTableBody.appendChild(row);
                    });

                    document.querySelectorAll('.view-details-btn').forEach(button => {
                        button.addEventListener('click', function() {
                            const equipamento = JSON.parse(this.getAttribute('data-equipamento'));
                            displayEquipamentoDetails(equipamento);
                        });
                    });

                } else {
                    resultsTable.style.display = 'none';
                    noResultsMessage.style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                showMessageModal('Erro', 'Erro ao buscar equipamentos. Tente novamente.', false);
                resultsTable.style.display = 'none';
                noResultsMessage.style.display = 'block';
            });
    }
    
    function displayEquipamentoDetails(equipamento) {
        const booleanKeys = [
            'porta_gpon',
            'porta_sfp',
            'mesh',
            'suporte_tr069',
            'ipv6'
        ];
        
        // CORREÇÃO: Pegar os dados para o formulário de edição
        document.getElementById('detailsIdEquipamento').value = equipamento.id_equipamento;
        document.getElementById('detailsNome').value = equipamento.nome || '';
        document.getElementById('detailsMarca').value = equipamento.marca || '';
        document.getElementById('detailsModelo').value = equipamento.modelo || '';
        document.getElementById('detailsNumPortasWan').value = equipamento.num_portas_wan || '';
        document.getElementById('detailsPortaGpon').value = equipamento.porta_gpon ? '1' : '0';
        document.getElementById('detailsPortaSfp').value = equipamento.porta_sfp ? '1' : '0';
        document.getElementById('detailsNumPortasLan').value = equipamento.num_portas_lan || '';
        document.getElementById('detailsPadraoWifi').value = equipamento.padrao_wifi || '';
        document.getElementById('detailsEthernetTipo').value = equipamento.ethernet_tipo || '';
        document.getElementById('detailsVelocidadeLan').value = equipamento.velocidade_lan || '';
        document.getElementById('detailsVelocidadeWifi24').value = equipamento.velocidade_wifi_2_4 || '';
        document.getElementById('detailsVelocidadeWifi58').value = equipamento.velocidade_wifi_5_8 || '';
        document.getElementById('detailsCoberturaWifi').value = equipamento.cobertura_wifi || '';
        document.getElementById('detailsDensidadeWifi').value = equipamento.densidade_wifi || '';
        document.getElementById('detailsMimo').value = equipamento.mimo || '';
        document.getElementById('detailsMesh').value = equipamento.mesh ? '1' : '0';
        document.getElementById('detailsTipoMesh').value = equipamento.tipo_mesh || '';
        document.getElementById('detailsSuporteTr069').value = equipamento.suporte_tr069 ? '1' : '0';
        document.getElementById('detailsIpv6').value = equipamento.ipv6 ? '1' : '0';
        document.getElementById('detailsEnderecoIp').value = equipamento.endereco_ip || '';
        document.getElementById('detailsNomeUsuario').value = equipamento.nome_usuario || '';
        document.getElementById('detailsSenhaAcesso').value = equipamento.senha_acesso || '';
        document.getElementById('detailsFonte').value = equipamento.fonte || '';
        
        // CORREÇÃO: Inicializa o campo de preço médio com 0,00 se for nulo
        document.getElementById('detailsPrecoMedio').value = equipamento.preco_medio ? (parseFloat(equipamento.preco_medio).toFixed(2).replace('.', ',')) : '0,00';
        
        document.getElementById('detailsDataUltimaAtualizacao').value = equipamento.data_ultima_atualizacao_preco || '';
        document.getElementById('detailsSite').value = equipamento.site || '';
        document.getElementById('detailsObservacoes').value = equipamento.observacoes || '';

        const detailsTipoEquipamentoSelect = document.getElementById('detailsTipoEquipamento');
        loadTiposEquipamento(detailsTipoEquipamentoSelect, equipamento.tipo_equipamentoId);

        // CORREÇÃO: Popular a tabela de detalhes com os dados
        const labels = {
            id_equipamento: 'ID',
            tipo_equipamento: 'Tipo',
            nome: 'Nome',
            marca: 'Marca',
            modelo: 'Modelo',
            num_portas_wan: 'Nº Portas WAN',
            porta_gpon: 'Porta GPON',
            porta_sfp: 'Porta SFP',
            num_portas_lan: 'Nº Portas LAN',
            padrao_wifi: 'Padrão Wi-Fi',
            ethernet_tipo: 'Tipo de Ethernet',
            velocidade_lan: 'Velocidade LAN',
            velocidade_wifi_2_4: 'Velocidade Wi-Fi (2.4GHz)',
            velocidade_wifi_5_8: 'Velocidade Wi-Fi (5.8GHz)',
            cobertura_wifi: 'Cobertura Wi-Fi',
            densidade_wifi: 'Densidade Wi-Fi',
            mimo: 'MIMO',
            mesh: 'Suporte Mesh',
            tipo_mesh: 'Tipo de Mesh',
            suporte_tr069: 'Suporte TR-069',
            ipv6: 'Suporte IPv6',
            endereco_ip: 'Endereço IP',
            nome_usuario: 'Nome de Usuário',
            senha_acesso: 'Senha de Acesso',
            fonte: 'Fonte',
            preco_medio: 'Preço Médio',
            data_ultima_atualizacao_preco: 'Data Última Atualização',
            site: 'Site',
            observacoes: 'Observações'
        };

        const tipoEquipamentoNome = equipamento.tipo_equipamento;
        let tableHtml = `<tr><td>Tipo:</td><td>${tipoEquipamentoNome}</td></tr>`;

        for (const key in equipamento) {
            if (key === 'id_equipamento' || key === 'tipo_equipamentoId' || key === 'tipo_equipamento') continue;
            
            let value = equipamento[key];
            
            if (value === null || value === '') {
                value = 'N/A';
            } else if (booleanKeys.includes(key)) {
                value = value === 1 ? 'Sim' : 'Não';
            } else if (key === 'preco_medio') {
                value = `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
            } else if (key.includes('data_') && value) {
                 const date = new Date(value);
                 if (!isNaN(date.getTime())) {
                     value = date.toLocaleDateString('pt-BR');
                 } else {
                     value = 'N/A';
                 }
            }
            
            const formattedKey = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
            tableHtml += `<tr><td>${formattedKey}:</td><td>${value}</td></tr>`;
        }

        detailsTableBody.innerHTML = tableHtml;

        detailsModal.show();
    }

    function toggleEditMode(isEditing) {
        const detailsForm = document.getElementById('detailsForm');
        const detailsTableContainer = document.getElementById('detailsTableContainer');
        const fields = detailsForm.querySelectorAll('input, select, textarea');

        fields.forEach(field => {
            field.disabled = !isEditing;
        });
        
        // Garante que o campo de Tipo de Equipamento (select) seja editável apenas no modo de edição
        document.getElementById('detailsTipoEquipamento').disabled = !isEditing;

        if (isEditing) {
            detailsModalLabel.textContent = 'Editar Equipamento';
            detailsTableContainer.style.display = 'none';
            detailsForm.style.display = 'block';
            editEquipamentoBtn.style.display = 'none';
            deleteEquipamentoBtn.style.display = 'inline-block';
            saveEditEquipamentoBtn.style.display = 'inline-block';
        } else {
            detailsModalLabel.textContent = 'Detalhes do Equipamento';
            detailsTableContainer.style.display = 'block';
            detailsForm.style.display = 'none';
            editEquipamentoBtn.style.display = (userGroup === 'NOC' || userGroup === 'Logistica' || userGroup === 'Fibra') ? 'inline-block' : 'none';
            deleteEquipamentoBtn.style.display = 'none';
            saveEditEquipamentoBtn.style.display = 'none';
        }
    }

    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value;
        searchEquipamentos(searchTerm);
    });

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });

    function formatCurrency(input) {
      let value = input.value.replace(/\D/g, '');
      if (value.length === 0) {
        input.value = '0,00';
        return;
      }
      if (value.length === 1) {
        value = '00' + value;
      } else if (value.length === 2) {
         value = '0' + value;
      }

      let cents = value.slice(-2);
      let reais = value.slice(0, -2);
      reais = reais.replace(/^0+/, '');

      if (reais.length === 0) {
        reais = '0';
      }
      input.value = reais.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.') + ',' + cents;
    }

    document.getElementById('precoMedio').addEventListener('input', function() {
      formatCurrency(this);
    });

    document.getElementById('detailsPrecoMedio').addEventListener('input', function() {
        formatCurrency(this);
    });

    saveEquipamentoBtn.addEventListener('click', function() {
        const nomeField = document.getElementById('nome');
        const marcaField = document.getElementById('marca');
        const modeloField = document.getElementById('modelo');

        if (!nomeField.value || !marcaField.value || !modeloField.value) {
            showMessageModal('Erro de Validação', 'Por favor, preencha todos os campos obrigatórios.', false);
            return;
        }

        const formData = new FormData(cadastroForm);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const precoMedioValue = data.preco_medio ? parseFloat(data.preco_medio.replace('.', '').replace(',', '.')) : null;

        const payload = {
            tipo_equipamentoId: parseInt(data.tipo_equipamentoId, 10),
            nome: data.nome,
            marca: data.marca,
            modelo: data.modelo,
            num_portas_wan: data.num_portas_wan ? parseInt(data.num_portas_wan, 10) : null,
            porta_gpon: data.porta_gpon === '1',
            porta_sfp: data.porta_sfp === '1',
            num_portas_lan: data.num_portas_lan ? parseInt(data.num_portas_lan, 10) : null,
            padrao_wifi: data.padrao_wifi,
            ethernet_tipo: data.ethernet_tipo,
            velocidade_lan: data.velocidade_lan,
            velocidade_wifi_2_4: data.velocidade_wifi_2_4,
            velocidade_wifi_5_8: data.velocidade_wifi_5_8,
            cobertura_wifi: data.cobertura_wifi,
            densidade_wifi: data.densidade_wifi,
            mimo: data.mimo,
            mesh: data.mesh === '1',
            tipo_mesh: data.tipo_mesh,
            suporte_tr069: data.suporte_tr069 === '1',
            ipv6: data.ipv6 === '1',
            endereco_ip: data.endereco_ip,
            nome_usuario: data.nome_usuario,
            senha_acesso: data.senha_acesso,
            fonte: data.fonte,
            preco_medio: precoMedioValue,
            data_ultima_atualizacao_preco: data.data_ultima_atualizacao_preco || new Date().toISOString().split('T')[0],
            site: data.site,
            observacoes: data.observacoes
        };

        fetch('/api/v1/equipamentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Erro ao cadastrar equipamento'); });
            }
            return response.json();
        })
        .then(result => {
            showMessageModal('Sucesso', 'Equipamento cadastrado com sucesso!', true);
            cadastroEquipamentoModal.hide();
            cadastroForm.reset();
            searchEquipamentos('');
        })
        .catch(error => {
            console.error('Erro:', error);
            showMessageModal('Erro', 'Erro ao cadastrar equipamento: ' + error.message, false);
        });
    });

    editEquipamentoBtn.addEventListener('click', () => {
        toggleEditMode(true);
    });

    saveEditEquipamentoBtn.addEventListener('click', function() {
        const id = document.getElementById('detailsIdEquipamento').value;
        const detailsForm = document.getElementById('detailsForm');
        const formData = new FormData(detailsForm);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        if (!data.nome || !data.marca || !data.modelo) {
            showMessageModal('Erro de Validação', 'Por favor, preencha todos os campos obrigatórios.', false);
            return;
        }

        const precoMedioValue = data.preco_medio ? parseFloat(data.preco_medio.replace('.', '').replace(',', '.')) : null;

        const payload = {
            id_equipamento: id,
            tipo_equipamentoId: parseInt(data.tipo_equipamentoId, 10),
            nome: data.nome,
            marca: data.marca,
            modelo: data.modelo,
            num_portas_wan: data.num_portas_wan ? parseInt(data.num_portas_wan, 10) : null,
            porta_gpon: data.porta_gpon === '1',
            porta_sfp: data.porta_sfp === '1',
            num_portas_lan: data.num_portas_lan ? parseInt(data.num_portas_lan, 10) : null,
            padrao_wifi: data.padrao_wifi,
            ethernet_tipo: data.ethernet_tipo,
            velocidade_lan: data.velocidade_lan,
            velocidade_wifi_2_4: data.velocidade_wifi_2_4,
            velocidade_wifi_5_8: data.velocidade_wifi_5_8,
            cobertura_wifi: data.cobertura_wifi,
            densidade_wifi: data.densidade_wifi,
            mimo: data.mimo,
            mesh: data.mesh === '1',
            tipo_mesh: data.tipo_mesh,
            suporte_tr069: data.suporte_tr069 === '1',
            ipv6: data.ipv6 === '1',
            endereco_ip: data.endereco_ip,
            nome_usuario: data.nome_usuario,
            senha_acesso: data.senha_acesso,
            fonte: data.fonte,
            preco_medio: precoMedioValue,
            data_ultima_atualizacao_preco: data.data_ultima_atualizacao_preco || new Date().toISOString().split('T')[0],
            site: data.site,
            observacoes: data.observacoes
        };

        fetch(`/api/v1/equipamentos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Erro ao atualizar equipamento'); });
            }
            return response.json();
        })
        .then(() => {
            showMessageModal('Sucesso', 'Equipamento atualizado com sucesso!', true);
            detailsModal.hide();
            searchEquipamentos('');
        })
        .catch(error => {
            console.error('Erro:', error);
            showMessageModal('Erro', 'Erro ao atualizar equipamento: ' + error.message, false);
        });
    });

    deleteEquipamentoBtn.addEventListener('click', function() {
        const id = document.getElementById('detailsIdEquipamento').value;
        
        showConfirmModal('Tem certeza que deseja deletar esse equipamento?', () => {
            fetch(`/api/v1/equipamentos/${id}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao deletar equipamento');
                }
                showMessageModal('Sucesso', 'Equipamento deletado com sucesso!', true);
                detailsModal.hide();
                searchEquipamentos('');
            })
            .catch(error => {
                console.error('Erro:', error);
                showMessageModal('Erro', 'Erro ao deletar equipamento: ' + error.message, false);
            });
        });
    });

    document.getElementById('cadastroEquipamentoModal').addEventListener('show.bs.modal', function() {
        loadTiposEquipamento(tipoEquipamentoSelect);
        document.getElementById('portaGpon').value = '0';
        document.getElementById('portaSfp').value = '0';
        document.getElementById('mesh').value = '0';
        document.getElementById('suporteTr069').value = '0';
        document.getElementById('ipv6').value = '0';
        document.getElementById('observacoes').value = '';

        const precoMedioInput = document.getElementById('precoMedio');
        precoMedioInput.value = '';
        formatCurrency(precoMedioInput);
    });

    document.getElementById('detailsModal').addEventListener('show.bs.modal', function() {
        const precoMedioInputDetails = document.getElementById('detailsPrecoMedio');
        if (!precoMedioInputDetails.value) {
             precoMedioInputDetails.value = '0,00';
        }
    });

    document.getElementById('detailsModal').addEventListener('hidden.bs.modal', function() {
        toggleEditMode(false);
    });

    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            userGroup = data.group;
            searchEquipamentos('');

            if (userGroup === 'NOC' || userGroup === 'Logistica') {
                editEquipamentoBtn.style.display = 'inline-block';
                cadastrarEquipamentoBtn.style.display = 'inline-block';
            } else {
                editEquipamentoBtn.style.display = 'none';
                cadastrarEquipamentoBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
            searchEquipamentos('');
        });
});
