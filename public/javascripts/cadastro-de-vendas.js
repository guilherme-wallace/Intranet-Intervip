$(function () {
    let item = template`<a class="dropdown-item" data-id="${'id'}">${'item'}</a>`;

    if ($('#salesperson-selector').children().length == 0) {
        fetch('api/v1/salesperson').then(response => response.json()).then(salespeople => {
            for (const salesperson of salespeople) {
                $('#salesperson-selector').append(item({id: salesperson.salespersonId, item: salesperson.name}));
            }
            
            $('#salesperson-selector a').on('click', function() {
                $('#salesperson-button').text($(this).text());
                $('#salesperson-input').val($(this).attr('data-id'));
                $('#sale-form').valid();
            });
        });
    }

    $('#form-selector a').on('click', function() {
        showSpinner();

        switch ($(this).text()) {
            case 'Venda':
                $('#form-toggle').css('background-color', 'green');
                $('#form-toggle').css('border-color', 'green');
                break;
            case 'Suspensão':
                $('#form-toggle').css('background-color', 'orange');
                $('#form-toggle').css('border-color', 'orange');
                break;
            case 'Cancelamento':
                $('#form-toggle').css('background-color', 'red');
                $('#form-toggle').css('border-color', 'red');
                break;
            case 'Reativação':
                $('#form-toggle').css('background-color', 'purple');
                $('#form-toggle').css('border-color', "purple");
                break;
            case 'Retenção':
                $('#form-toggle').css('background-color', 'blue');
                $('#form-toggle').css('border-color', 'blue');
                break;
        }

        if ($(this).text() == 'Venda') {
            $('#research').prop('hidden', false);
            $('#sale-research').prop('hidden', false);
            $('#cancel-research').prop('hidden', true);
            $('#how-met-button').text('Como conheceu a Intervip');
            $('#how-met-button').prop('disabled', false);
            $('#how-met-input').val('');

            if ($('#how-met-selector').children().length == 0) {
                fetch('api/v1/research/answer/1').then(response => response.json()).then(howmet => {
                    for (const how of howmet) {
                        $('#how-met-selector').append(item({id: how.answerId, item: how.answer}));
                    	console.log(how);
		    }
                    
                    $('#how-met-selector a').on('click', function() {
                        $('#how-met-button').text($(this).text());
                        $('#how-met-input').val($(this).attr('data-id'));
                        $('#sale-form').valid();
                    });
                });
            }
        }

        else if ($(this).text() == 'Reativação') {
            $('#research').prop('hidden', false);
            $('#sale-research').prop('hidden', false);
            $('#cancel-research').prop('hidden', true);
            $('#how-met-button').text('Já foi cliente');
            $('#how-met-button').prop('disabled', true);
            $('#how-met-input').val(1);
            $('#sale-form').valid();
        }

        else if ($(this).text() == 'Retenção') {
            $('#research').prop('hidden', true);
            $('#how-met-button').prop('disabled', true);
            $('#sale-form').valid();
        }

        else if (['Cancelamento', 'Suspensão'].includes($(this).text())) {
            $('#research').prop('hidden', false);
            $('#sale-research').prop('hidden', true);
            $('#cancel-research').prop('hidden', false);
            $('#reason-button').text('Motivo');
            $('#reason-input').val('');
            $('#satisfaction-button').text('Satisfeito com o serviço');
            $('#satisfaction-input').val('');

            if ($('#reason-selector').children().length == 0) {
                fetch('api/v1/research/answer/2').then(response => response.json()).then(reasons => {
                    for (const reason of reasons) {
                        $('#reason-selector').append(item({id: reason.answerId, item: reason.answer}));
                    }
                    
                    $('#reason-selector a').on('click', function() {
                        $('#reason-button').text($(this).text());
                        $('#reason-input').val($(this).attr('data-id'));
                        $('#sale-form').valid();
                    });
                });
            }

            if ($('#operator-selector').children().length == 0) {
                fetch('api/v1/research/answer/3').then(response => response.json()).then(operators => {
                    for (const operator of operators) {
                        $('#operator-selector').append(item({id: operator.answerId, item: operator.answer}));
                    }
                    
                    $('#operator-selector a').on('click', function() {
                        $('#operator-button').text($(this).text());
                        $('#operator-input').val($(this).attr('data-id'));
                        $('#sale-form').valid();
                    });
                });
            }

            if ($('#satisfaction-selector').children().length == 0) {
                fetch('api/v1/research/answer/4').then(response => response.json()).then(satisfactions => {
                    for (const satisfaction of satisfactions) {
                        $('#satisfaction-selector').append(item({id: satisfaction.answerId, item: satisfaction.answer}));
                        $('#satisfaction-selector a').on('click', function() {
                            $('#satisfaction-button').text($(this).text());
                            $('#satisfaction-input').val($(this).attr('data-id'));
                            $('#sale-form').valid();
                        });
                    }
                });
            }
        }

        $('#form-toggle').text($(this).text());
        $('#submit-button').prop('disabled', false);
        $('#submit-button').css("pointer-events", "");
        $('#submit-button-wrapper').popover('dispose');

        if ($('#client-id').val() !== '') {
            getContracts($('#client-id').val());
        }

        hideSpinner();
    });

    $('#client-id').on('focusout keydown', function(e) {
        if (!$(this).val()) {
            return;
        }

        if (e.which !== 13 && e.which !== 0) {
            return;
        }

        showSpinner();

        fetch(`api/v4/client/${$(this).val()}`).then(function (response) {
            switch (response.status) {
                case 404:
                    return alert("Cliente não encontrado, por favor verifique o código inserido.");
                case 400:
                    return alert("Código do cliente inválido.");
                case 200:
                    return response.json();
                default:
                    alert("Algo deu errado, reporte este erro ao suporte.");
                    throw new Error(response);
            }
        }).then(client => {
            if (!client) {
                $('#client-id').val("");
                $('#client-id').focus();
                return;
            }

            $('#client-name').val(client.Nome);
            $('#client-name').prop('disabled', true);
            $('#client-birthday').val(new Date(`${client.Nascimento}T00:00:00.000-03:00`).toLocaleDateString("pt-BR"));
            $('#client-birthday').prop('disabled', true);
            $('#client-email').val(client.Email);
            $('#client-email').prop('disabled', true);
            $('#client-phone').val(client.TelCelular);
            $('#client-phone').prop('disabled', true);

            fetch(`api/v1/group/${client.Grupo}`).then(response => response.json()).then(group => {
                $('#group-name').val(group.name);
                $('#group-name').attr('data-id', group.groupId);
                $('#group-name').prop('disabled', true);
                $('#client-cep').val(client.CEP);
                $('#client-cep').prop('disabled', true);
                $('#client-address').val(client.Endereco);
                $('#client-address').prop('disabled', true);
                $('#client-address-number').val(client.Numero);
                $('#client-address-number').prop('disabled', true);
                $('#client-address-complement').val(client.Complemento);
                $('#client-address-complement').prop('disabled', true);
                $('#client-address-neighbourhood').val(client.Bairro);
                $('#client-address-neighbourhood').prop('disabled', true);
                $('#client-address-city').val(client.Cidade);
                $('#client-address-city').prop('disabled', true);
                $('#client-address-uf').val(client.UF);
                $('#client-address-uf').prop('disabled', true);
            });

            getContracts($(this).val());
        });
            
        hideSpinner();
    });

    $('#client-id').numeric();
    $('#submit-button-wrapper').popover({ trigger: 'hover' });

    $.validator.addMethod('selected', function(value, element) {
        switch ($(element).attr('id')) {
            case 'how-met-input':
                if (!['Venda', 'Reativação'].includes($('#form-toggle').text())) {
                    return true;
                }

                else if (value != '') {
                    return true;
                }
                
                return false;

            case 'reason-input':
            case 'operator-input':
            case 'satisfaction-input':
                if ($('#form-toggle').text() === 'Cancelamento') {
                    if (value == '') {
                        return false;
                    }
                }

                return true;

            case 'salesperson-input':
                if (value == '') {
                    return false;
                }
                
                return true;
        }
    });

    $('#sale-form').validate({
        ignore: "input[type='text']:hidden",
        rules: {
            code: {
                required: true
            },
            howmet: {
                selected: true
            },
            reason: {
                selected: true
            },
            operator: {
                selected: true
            },
            satisfaction: {
                selected: true
            },
            salesperson: {
                selected: true
            }
        },
        messages: {
            code: 'Campo obrigatório',
            howmet: 'Selecione uma opção',
            reason: 'Selecione o motivo do cancelamento',
            operator: 'Selecione uma operadora',
            satisfaction: 'Selecione uma opção',
            salesperson: 'Selecione um usuário'
        }
    });

    $('#sale-form').on('submit', function(e) {
        e.preventDefault();

        if ($(this).valid()) {
            if ($('input[name="contract"]:checked').length == 0) {
                alert('Por favor, selecione um contrato.');
            }

            else {
                let contractId = $('input[name="contract"]:checked').val();
                let contractInfo = $(`#${contractId} input`).not('.ignore');
                let contract = (JSON.parse(localStorage.getItem('contracts'))).find(x => x.Contrato === contractId);
                $('#submit-button').attr('disabled', true);
                showSpinner();

                let sale = {
                    clientId: +$('#client-id').val(),
                    operation: '',
                    observation: $('#observation').val() || null,
                    contract: {
                        contractId: contractId,
                        endDate: contract.Fim == null ? null : contract.Fim.split('T')[0] + ' 00:00:00',
                        startDate: contract.Inicio == null ? null : contract.Inicio.split('T')[0] + ' 00:00:00',
                        name: contractInfo.filter('#contract-speed').val(),
                        bandwidth: +contractInfo.filter('#contract-speed').val().split(' ')[0],
                        cost: Number.parseFloat(contractInfo.filter('#contract-cost').val().replace(',','.'))
                    },
                    group: {
                        groupId: +$('#group-name').attr('data-id'),
                        name: $('#group-name').val()
                    },
                    address: {
                        postalCodeId: $('#client-cep').val(),
                        number: +$('#client-address-number').val(),
                        complement: $('#client-address-complement').val(),
                        address: $('#client-address').val(),
                        neighbourhood: $('#client-address-neighbourhood').val(),
                        city: $('#client-address-city').val(),
                        state: $('#client-address-uf').val()
                    },
                    technology: {
                        technologyId: +contractInfo.filter('#contract-technology').attr('data-id'),
                        technology: contractInfo.filter('#contract-technology').val()
                    },
                    research: {
                        reasonId: +$('#reason-input').val() || null,
                        howMetId: +$('#how-met-input').val() || null,
                        serviceProviderId: +$('#operator-input').val() || null,
                        satisfactionId: +$('#satisfaction-input').val() || null,
                        handout: $('#panfleto-checkbox').is(':checked'),
                        facebook: $('#facebook-checkbox').is(':checked'),
                        instagram: $('#instagram-checkbox').is(':checked')
                    },
                    salesperson: {
                        salespersonId:+$('#salesperson-input').val(),
                        name: $('#salesperson-button').text()
                    }
                };

                switch ($('#form-toggle').text()) {
                    case 'Venda':
                        sale.operation = 'V';
                        break;
                    case 'Reativação':
                        sale.operation = 'R';
                        break;
                    case 'Cancelamento':
                        sale.operation = 'C';
                        break;
                    case 'Suspensão':
                        sale.operation = 'S';
                        break;
                    case 'Retenção':
                        sale.operation = 'T';
                        sale.research = null;
                        break;
                }

                fetch('/api/v1/sale', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(sale)
                }).then(function (response) {
                    switch (response.status) {
                        case 400:
                            $('#submit-button').attr('disabled', false);
                            return alert(`Operação não permitida. A operação "${$('#form-toggle').text()}" não é permitida para o contrato selecionado.`);
                        case 401:          
                            $('#submit-button').attr('disabled', false);                  
                            return alert('Operação inválida, verifique o CEP cadastrado no perfil do cliente dentro do Routerbox.');
                        case 201:
                            return response.json();
                        default:
                            alert('Algo deu errado, reporte este erro ao suporte.');
                            $('#submit-button').attr('disabled', false);
                            throw new Error(response);
                    }
                }).then(data => {
                    hideSpinner();

                    if (data?.affectedRows > 0) {
                        alert(`Dados inseridos com sucesso.`);
                        return location.reload();
                    }
                });
            }
        }
    });

    function showSpinner() {
        $('#spinner').attr('hidden', false);
        $('.card-body').css('opacity', '0.5');
    }

    function hideSpinner() {
        $('#spinner').attr('hidden', true);
        $('.card-body').css('opacity', '1.0');
    }

    function getContracts(clientId) {
	fetch(`api/v4/contract/${clientId}`).then(response => response.json()).then(body => {
            if (body.length == 0) {
                $('#contracts').empty();
                return alert('Não existem contratos válidos para este cliente.\Certifique-se de que o contrato foi criado no cadastro do cliente.');
            }
    
            displayContracts(body);
	    localStorage['contracts'] = JSON.stringify(body);
        });
    }

    function displayContracts(contracts) {
        $('#contracts').empty();
        let html = template`
            <div id="${'contract'}" class="row">
                <div class="col-md-2">
                    <label>Plano</label>
                    <div class="input-group mb-3">
                        <div class="input-group-prepend">
                            <span class="input-group-text radio-button">
                                <div class="custom-control custom-radio custom-control-inline">
                                    <input id="${'radio'}" class="custom-control-input ignore" title="${'contract'}" type="radio" name="contract" value="${'contract'}"}>
                                    <label class="custom-control-label" for="${'radio'}"></label>
                                </div>
                            </span>
                        </div>
                        <input style="text-align: center;" type="text" class="form-control ignore" aria-label="Contrato" aria-describedby="basic-addon1" autocomplete="off" value="${'contract'}" disabled>
                    </div>
                </div>
                <div class="col-md-3">
                    <label>Plano</label>
                    <input id="contract-speed" type="text" class="form-control" aria-label="Descrição" aria-describedby="basic-addon1" autocomplete="off" value="${'speed'}" disabled>
                </div>
                <div class="col-md-2">
                    <label>Tecnologia</label>
                    <input id="contract-technology" type="text" class="form-control" aria-label="Descrição" aria-describedby="basic-addon1" autocomplete="off" value="${'technology'}" data-id="${'technologyId'}" disabled>
                </div>
                <div class="col-md-3">
                    <label>Valor</label>
                    <div class="input-group mb-3">
                        <div class="input-group-prepend">
                            <span class="input-group-text" id="basic-addon1">R$</span>
                        </div>
                        <input id="contract-cost" style="text-align: right;" type="text" class="form-control" aria-label="Valor" aria-describedby="basic-addon1" autocomplete="off" value="${'value'}" disabled>
                    </div>
                </div>
                <div class="col-md-2">
                    <label>Situação</label>
                    <input id="contract-state" style="text-align: center;" type="text" class="form-control" aria-label="Situação" aria-describedby="basic-addon1" autocomplete="off" value="${'state'}" disabled>
                </div>
            </div>`;

	let insertContract = (contract) => {
            if ($('#contracts').children().length == 0) {
                $('#contracts').prop('hidden', false);
                $('#contracts').append('<h3>Contratos</h3>');
            }

            speedText = contract.Descricao.match(/\d{1,4}M/g);
            contractSpeed = '-';

            if (speedText != null && speedText.length > 0) {
                contractSpeed = parseInt(speedText[0].slice(0, -1)) + ' Mbps';
            }

	    tech = contract.Descricao.match(/(FTTH|AIRMAX|CORP)/g);

            $('#contracts').append(html({
                radio: makeId(5),
                contract: contract.Contrato,
                speed: contractSpeed,
                technology: (tech == 'FTTH' || tech == 'CORP') ? tech : (tech == 'AIRMAX') ? 'Rádio' : 'FTTB',
                technologyId: (tech == 'FTTH' || tech == 'CORP') ? 4 : (tech == 'AIRMAX') ? 2 : 5,
                value: moneyFormatter(contract.Valor),
                state: contract.Situacao == 'I' ? 'Cancelado' : 'Ativo'
            }));

            if (contracts.indexOf(contract) < contracts.length - 1) {
                $('#contracts').append('<hr>');
            }
	}

	switch ($('#form-toggle').text()) {
	    case 'Selecione uma opção':
                return alert('Selecione uma opção.');
            break;

	    case 'Cancelamento':
            if (contracts.some((contract) => contract.Situacao != 'I')) {
		for (let contract of contracts) {
		    //if (contract.Situacao == 'I') {
                        insertContract(contract);
                    //}
                }

		break;
	    }
	    return alert('Não existem contratos válidos para este cliente.\nCertifique-se de que o contrato foi criado no cadastro do cliente.');

	    case 'Venda':
	    case 'Retenção':
	    case 'Suspensão':
	    for (let contract of contracts) {
            	if (contract.Situacao != 'I') {
                    insertContract(contract);
                }
            }
	    break;
	
	    case 'Reativação':
	    if (contracts.length > 1) {
		for (let contract of contracts) {
                    if (contract.Situacao != 'I') {
                        insertContract(contract);
                    }
                }

		break;
	    }
	    return alert('Não existem contratos válidos para este cliente.\nCertifique-se de que o contrato foi criado no cadastro do cliente.');
	}
    }
});
