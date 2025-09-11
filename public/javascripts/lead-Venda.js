$(function() {
    
    // Função para gerar um número aleatório de 15 dígitos começando com 4009
    function gerarNumeroAleatorio() {
        const prefixo = "40099100 - ";
        const numeroAleatorio = Math.floor(100000 + Math.random() * 9000000).toString().substring(0, 11);
        return prefixo + numeroAleatorio;
    }

    // Evento de clique no checkbox "Cadastro interno"
    $('#cadastroInternoCheckbox').on('change', function() {
        if (this.checked) {
            const numeroAleatorio = gerarNumeroAleatorio();
            $('#btnCadastroInternoCheckbox').text("Sim");
            $('#clientPhone').val(numeroAleatorio).prop('disabled', true);
            $('#clientEmail').val('intervip@intervip.net.br').prop('disabled', true);
            $('#clientName').val('Intervip').prop('disabled', true);
        } else {
            $('#btnCadastroInternoCheckbox').text('Não');
            $('#clientPhone').val('').prop('disabled', false);
            $('#clientEmail').val('').prop('disabled', false);
            $('#clientName').val('').prop('disabled', false);
        }
    });

    function dataHoje() {
        const dataCompleta = new Date();
        var dataDia = dataCompleta.getDate();
        var dataMes = dataCompleta.getMonth() +1;
        var dataANO = dataCompleta.getFullYear();

        if (dataDia < 10){
            dataDia = "0" + dataDia
        };
        var data = `${dataDia}/${dataMes}/${dataANO}`
        
        return data
    }
    const enviarEmail = async (destinatario, assunto, mensagem) => {
        var destinatario;
        var assunto;
        var mensagem;
    
        try {
            const resposta = await fetch('/api/email/enviar-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ para: destinatario, assunto, mensagem }),
            });
    
            const dadosResposta = await resposta.json();
    
            if (resposta.ok) {
                alert(dadosResposta.message);
                location.reload()
                localStorage.clear();
            } else {
                alert(`Erro ao enviar o e-mail: ${dadosResposta.error}`);
            }
        } catch (erro) {
            console.error(`Erro ao enviar o e-mail: ${erro.message}`);
        }
    };

    $('#clientDropdownTipo a').on('click', function() {
        switch ($(this).text()) {
            case 'Condomínio':
                localStorage.clear();
                $('#clientDropdownTipo').text($(this).text());
                $('#row-corporativo').attr('hidden', true);
                $('#clientCNPJ').text('');
                $('#clientCNPJ').val('');
                $('#fantasiaName').text('');
                $('#fantasiaName').val('');
				$('#row-clientDropdownTipo-Cond').attr('hidden', false);
				$('#col-predioNaoEstuturado').attr('hidden', false);
				$('#col-predioEstuturado').attr('hidden', true);
				$('#row-endereco').attr('hidden', false);
				$('#row-endereco2').attr('hidden', false);
				$('#col-blocoNaoEstuturado').attr('hidden', false);
				$('#col-blocoEstuturado').attr('hidden', true);
                
                $('#clientCep').attr('disabled', false)
                $('#clientCep').text('');
                $('#clientCep').val('');
                $('#fantasiaName').text('');
                $('#fantasiaName').val('');
                $('#clientAddress').attr('disabled', false)
                $('#clientAddress').text('');
                $('#clientAddress').val('');
                $('#clientAddressNumber').attr('disabled', false)
                $('#clientAddressNumber').text('');
                $('#clientAddressNumber').val('');
                $('#clientAddressCity').attr('disabled', false)
                $('#clientAddressCity').text('');
                $('#clientAddressCity').val('');
                $('#clientAddressNeighbourhood').attr('disabled', false)
                $('#clientAddressNeighbourhood').text('');
                $('#clientAddressNeighbourhood').val('');
                $('#col_clientAddressUf').attr('hidden', false);
                $('#col_clientAddressComplement').attr('hidden', false);
                
                $('#submitButton').attr('disabled', false);
                break;
            case 'Casa':
                localStorage.clear();
                $('#clientDropdownTipo').text($(this).text());
                $('#row-corporativo').attr('hidden', true);
                $('#clientCNPJ').text('');
                $('#clientCNPJ').val('');
                $('#fantasiaName').text('');
                $('#fantasiaName').val('');
				$('#row-clientDropdownTipo-Cond').attr('hidden', true);
				$('#row-endereco').attr('hidden', false);
				$('#row-endereco2').attr('hidden', false);
                $('#clientAddressCondName').val('');
                $('#clientAddressBloco').val('');
                $('#clientAddressApartamento').val('');
                $('#clientAddressSindico').val('');

                $('#clientCep').attr('disabled', false)
                $('#clientCep').text('');
                $('#clientCep').val('');
                $('#clientAddress').attr('disabled', false)
                $('#clientAddress').text('');
                $('#clientAddress').val('');
                $('#clientAddressNumber').attr('disabled', false)
                $('#clientAddressNumber').text('');
                $('#clientAddressNumber').val('');
                $('#clientAddressCity').attr('disabled', false)
                $('#clientAddressCity').text('');
                $('#clientAddressCity').val('');
                $('#clientAddressNeighbourhood').attr('disabled', false)
                $('#clientAddressNeighbourhood').text('');
                $('#clientAddressNeighbourhood').val('');
                $('#col_clientAddressUf').attr('hidden', false);
                $('#col_clientAddressComplement').attr('hidden', false);
                
                $('#submitButton').attr('disabled', false);
                break;
            case 'Estrutura FTTH':
                localStorage.clear();
                $('#clientDropdownTipo').text($(this).text());
                $('#row-corporativo').attr('hidden', true);
                $('#clientCNPJ').text('');
                $('#clientCNPJ').val('');
                $('#fantasiaName').text('');
                $('#fantasiaName').val('');
				$('#row-clientDropdownTipo-Cond').attr('hidden', false);
				$('#col-predioEstuturado').attr('hidden', false);
				$('#col-predioNaoEstuturado').attr('hidden', true);
				$('#row-endereco').attr('hidden', true);
				$('#row-endereco2').attr('hidden', true);
				$('#col-blocoNaoEstuturado').attr('hidden', true);
				$('#col-blocoEstuturado').attr('hidden', false);
                $('#clientAddressBloco').val('');
                $('#clientAddressUf').val('');
                $('#clientAddressComplement').val('');
                break;
            case 'Corporativo':
                localStorage.clear();
                $('#clientDropdownTipo').text($(this).text());
                $('#row-corporativo').attr('hidden', false);
                $('#clientCNPJ').text('');
                $('#clientCNPJ').val('');
                $('#fantasiaName').text('');
                $('#fantasiaName').val('');
                $('#row-clientDropdownTipo-Cond').attr('hidden', true);
                $('#row-endereco').attr('hidden', false);
                $('#row-endereco2').attr('hidden', false);
                $('#clientAddressCondName').val('');
                $('#clientAddressBloco').val('');
                $('#clientAddressApartamento').val('');
                $('#clientAddressSindico').val('');

                $('#clientCep').attr('disabled', false)
                $('#clientCep').text('');
                $('#clientCep').val('');
                $('#clientAddress').attr('disabled', false)
                $('#clientAddress').text('');
                $('#clientAddress').val('');
                $('#clientAddressNumber').attr('disabled', false)
                $('#clientAddressNumber').text('');
                $('#clientAddressNumber').val('');
                $('#clientAddressCity').attr('disabled', false)
                $('#clientAddressCity').text('');
                $('#clientAddressCity').val('');
                $('#clientAddressNeighbourhood').attr('disabled', false)
                $('#clientAddressNeighbourhood').text('');
                $('#clientAddressNeighbourhood').val('');
                $('#col_clientAddressUf').attr('hidden', false);
                $('#col_clientAddressComplement').attr('hidden', false);
                
                $('#submitButton').attr('disabled', false);
                break;
        }
    });
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                fetch(`api/v4/condominio?query=${query}`).then(response => response.json()).then(data => {
                    callback(data);
                });
            }
        }
    });

    $('.bloco-item').click(function () {
        let val = $(this).data('id');
        $('#input-bloco-value').val(val);
        $('#formData').submit();
    });
    
    $('#input-condo').on('autocomplete.select', function (e, item) {   
        $("#input-condo-value").val(item.value);
        if (!item || !item.value) {
            alert("Erro: O valor selecionado está vazio.");
            return;
        }

        fetch(`api/v1/condominio/${item.value}`).then(response => response.json()).then(condo => {
            
            $('#input-condo').val(condo.condominio);
            const cidades = {
                "3173": "Vitória",
                "3172": "Vila Velha",
                "3169": "Viana",
                "3165": "Serra",
                "3159": "Santa Teresa",
                "3169": "Viana",
                "3112": "Cariacica",
            };
            //console.log(condo)
            
            $('#clientAddressCondName').val(condo.condominio)
            $('#row-endereco').attr('hidden', false);
            $('#row-endereco2').attr('hidden', false);
            $('#clientCep').attr('disabled', true)
            $('#clientCep').text(condo.cep || "Favor verificar no IXC");
            $('#clientCep').val(condo.cep || "Favor verificar no IXC");
            $('#clientAddress').attr('disabled', true)
            $('#clientAddress').text(condo.endereco || "Favor verificar no IXC");
            $('#clientAddress').val(condo.endereco || "Favor verificar no IXC");
            $('#clientAddressNumber').attr('disabled', true)
            $('#clientAddressNumber').text(condo.numero || "Favor verificar no IXC");
            $('#clientAddressNumber').val(condo.numero || "Favor verificar no IXC");
            $('#clientAddressCity').attr('disabled', true)
            $('#clientAddressCity').text(cidades[condo.cidadeId] || "Favor verificar no IXC");
            $('#clientAddressCity').val(cidades[condo.cidadeId] || "Favor verificar no IXC");
            $('#clientAddressNeighbourhood').attr('disabled', true)
            $('#clientAddressNeighbourhood').text(condo.bairro || "Favor verificar no IXC");
            $('#clientAddressNeighbourhood').val(condo.bairro || "Favor verificar no IXC");
            
            $('#col_clientAddressUf').attr('hidden', true);
            $('#col_clientAddressComplement').attr('hidden', true);
            
            $('#botao-blocos').text('Selecione o Bloco');

            fetch(`api/v1/block/${item.value}`).then(response => response.json()).then(blocks => {
                if (blocks.length == 0 || (blocks.length == 1 && blocks[0].technology == 'Sem estrutura')) {
                    return alert("Bloco sem estrutura!");
                }
                localStorage['condominioId'] = item.value;
                localStorage['blocks'] = JSON.stringify(blocks);

                let html = template`<button class="dropdown-item dropdown-bloco" type="button">${'bloco'}</button>`;
                $('#linha-blocos').prop('hidden', false);
                $('#blocos-lista').empty();
    
                for (const block of blocks) {
                    if (blocks.length > 1) {
                        $('#blocos-lista').append(html({ bloco: block.name }));
                    }
                    else if (blocks.length == 1 && block.technologyId == 3) {
                        $('#blocos-lista').append(html({ bloco: block.name }));
                        $('#botao-blocos').text(block.name);
                        $('#estrutura').tect(block.technology);
                        registraEventoBotaoBlocos();
                        $('.dropdown-bloco').click();
                    }
                    else if (block.floors !== null) {
                        $('#blocos-lista').append(html({ bloco: block.name }));
                        $('#botao-blocos').text(block.name);
                        mostraApartamento(block);
                    }
                    else {
                        $("#dados-condo-cep").text('Pegar com o cliente');
                        $("#dados-condo-endereco").text('Pegar com o cliente');
                        $("#dados-condo-numero").text('Pegar com o cliente');
                        $('#blocos-lista').append(html({ bloco: block.name }));
                        $('#botao-blocos').text(block.name);
                        mostraCasa(block);
                    }
                }
                registraEventoBotaoBlocos();
            }).catch(() => {                
                return alert("Bloco sem estrutura!");
            });
        }).catch(err => {
            console.error("Erro na requisição ao condomínio:", err);
        });
    });

    jQuery.validator.addMethod('celular', function (value, element) {
        value = value.replace("(","");
        value = value.replace(")", "");
        value = value.replace("-", "");
        value = value.replace(" ", "").trim();
        if (value == '0000000000') {
            return (this.optional(element) || false);
        } else if (value == '00000000000') {
            return (this.optional(element) || false);
        }
        if (["00", "01", "02", "03", , "04", , "05", , "06", , "07", , "08", "09", "10"]
        .indexOf(value.substring(0, 2)) != -1) {
            return (this.optional(element) || false);
        }
        if (value.length < 10 || value.length > 11) {
            return (this.optional(element) || false);
        }
        return (this.optional(element) || true);
    }, 'Informe um número de telefone celular válido!');

    $( "#formData" ).validate({
        debug: true,
        rules: {
            clientName: {
                required: true,
                minlength: 3
            },
            clientCep: {
                required: true,
                maxlength: 10
            },
            clientPhone: {
                required: true,
                celular: true
            },
            clientEmail: {
                email: true
            },
            clientDropdownTipo: {
                required: true
            },
        },
        messages: {
            clientName: 'Preenchimento inválido',
            clientCep: 'Preenchimento inválido',
            clientPhone: 'Informe um número de telefone celular válido!'
        }
    });

    var usuarioLogado = '';
    $.get('/api/username', function(response) {
        usuarioLogado = response.username;
    });
    
    $('#formData').on('submit', function(e) {
        e.preventDefault();
    
        let nameValid = $('#clientName').val();
        let clientCNPJValid = $('#clientCNPJ').val();
        let phoneNumberValid = $('#clientPhone').val();
        let postalCodeValid = $('#clientCep').val();
        let addressType = $('#clientDropdownTipo').text()
        var dataAtual = dataHoje();
        
        //console.log("nameValid: ", nameValid, " phoneNumberValid: ", phoneNumberValid, " postalCodeValid: ", postalCodeValid, " addressType: ", addressType, " clientCNPJValid: ", clientCNPJValid)
        if ((nameValid == "") || (phoneNumberValid == "") || (postalCodeValid == "") || (addressType == "Selecione uma opção")) {
            alert("Favor verificar se os campos foram preenchidos corretamente!")
        } else {
            let viabilitys = [];
            if ($(this).valid()) {
                viabilitys.push({
                    clientName: $('#clientName').val(),
                    cnpj: $('#clientCNPJ').val() || null,
                    nomeFantaisa: $('#fantasiaName').val() || null, 
                    phoneNumber: $('#clientPhone').val(),
                    email: $('#clientEmail').val() || null,
                    postalCodeId: $('#clientCep').val(),
                    city: $('#clientAddressCity').val() || null,
                    neighborhood: $('#clientAddressNeighbourhood').val() || null,
                    state: $('#clientAddressUf').val() || null,
                    address: $('#clientAddress').val() || null,
                    number: +$('#clientAddressNumber').val() || null,
                    complement: $('#clientAddressComplement').val() || null,
                    type: $('#clientDropdownTipo').text(),
                    condominio: $('#clientAddressCondName').val() || null,
                    block: $('#clientAddressBloco').val() || null,
                    blockEstruturado: $('#botao-blocos').text() || null,
                    apartment: $('#clientAddressApartamento').val() || null,
                    unionNumber: $('#clientAddressSindico').val() || null,
                    operador: usuarioLogado,
                });
                //console.log(viabilitys);
                //console.log(viabilitys[0].operador)
                fetch('api/v1/viability', {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify(viabilitys)
                }).then(function (response) {
                    if (!response.ok) {
                        if (response.status === 409) {
                            return response.json().then(err => {
                                throw new Error(err.error || 'Número de telefone já foi inserido.');
                            });
                        }
                        return response.json().then(err => {
                            throw new Error(err.error || 'Erro conte o suporte.');
                        });
                    }
                    return response.json();
                }).then(function (data) {
                    if (addressType == 'Condomínio') {
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com, leads@intervip.net.br';
                        var assunto = `leads de condomínio: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].condominio} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: leads DE CONDOMÍNIO</strong></p>
                            <p><strong>Nome do cliente:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>Número do síndico:</strong> ${viabilitys[0].unionNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
                            <p><strong>Nome do condomínio:</strong> ${viabilitys[0].condominio}</p>
                            <p><strong>Bloco:</strong> ${viabilitys[0].block}</p>
                            <p><strong>Apartamento:</strong> ${viabilitys[0].apartment}</p>
                            <p><br></p>
                            <p><strong>Operador:</strong> ${viabilitys[0].operador}</p>
                        `;
                        enviarEmail(destinatario, assunto, mensagem);
                        //console.log(destinatario, assunto, mensagem);
                        alert("Solicitação enviada com sucesso.");
                    }
                    else if (addressType == 'Estrutura FTTH') {
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com, leads@intervip.net.br';
                        var assunto = `leads para Estrutura FTTH: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].condominio} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: leads DE ESTRUTURA PARA FTTH</strong></p>
                            <p><strong>Nome do cliente:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>Número do síndico:</strong> ${viabilitys[0].unionNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
                            <p><strong>Nome do condomínio:</strong> ${viabilitys[0].condominio}</p>
                            <p><strong>Bloco:</strong> ${viabilitys[0].blockEstruturado}</p>
                            <p><strong>Apartamento:</strong> ${viabilitys[0].apartment}</p>
                            <p><br></p>
                            <p><strong>Operador:</strong> ${viabilitys[0].operador}</p>
                        `;
                        enviarEmail(destinatario, assunto, mensagem);
                        //console.log(destinatario, assunto, mensagem);
                        alert("Solicitação enviada com sucesso.");
                    }
                    else if (addressType == 'Corporativo') {
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com, leads@intervip.net.br';
                        var assunto = `leads para corporativos: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: leads DE CORPORATIVOS</strong></p>
                            <p><strong>Nome do cliente ou empresa:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>CNPJ:</strong> ${viabilitys[0].cnpj}</p>
                            <p><strong>Nome fantasia:</strong> ${viabilitys[0].nomeFantaisa}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Complemento:</strong> ${viabilitys[0].complement}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
                            <p><br></p>
                            <p><strong>Operador:</strong> ${viabilitys[0].operador}</p>
                        `;
                        enviarEmail(destinatario, assunto, mensagem);
                        //console.log(destinatario, assunto, mensagem);
                        alert("Solicitação enviada com sucesso.");
                    }
                    else {
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com, leads@intervip.net.br';
                        var assunto = `leads de casas: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: leads DE CASA</strong></p>
                            <p><strong>Nome do cliente:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Complemento:</strong> ${viabilitys[0].complement}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
                            <p><br></p>
                            <p><strong>Operador:</strong> ${viabilitys[0].operador}</p>
                        `;
                        enviarEmail(destinatario, assunto, mensagem);
                        //console.log(destinatario, assunto, mensagem);
                        alert("Solicitação enviada com sucesso.");
                    }
                }).catch(function (error) {
                    console.error("Erro:", error.message);
                    alert('Erro: ' + error.message);
                    //location.reload();
                });
            }
        }
    });   
});

function mostraApartamento(block) {
    $('#estrutura').text(block.technology);
    if (block.technology == "FTTH") {
        alert('Esse bloco já é FTTH!')
        $('#submitButton').attr('disabled', true);
    }
    else {
        $('#submitButton').attr('disabled', false);
    }
}

function mostraCasa(block) {
    $('#estrutura').text(block.technology);
    if (block.technology == "FTTH") {
        alert('Essas Casas já são FTTH!')
        $('#submitButton').attr('disabled', true);
    }
    else {
        $('#submitButton').attr('disabled', false);
    }
}

function registraEventoBotaoBlocos() {                    
    $('.dropdown-bloco').on('click', function () {            
        $('#complemento').val('');
        $('#botao-blocos').text($(this).text());

        for (block of JSON.parse(localStorage['blocks'])) {
            if ($(this).text() === block.name) {
                if(block.technologyId == 3) {
                    alert("Bloco sem estrutura!");
                }

                else if (block.floors !== null) {
                    mostraApartamento(block);
                }

                else {
                    mostraCasa(block);
                }

                break;
            }
        }
    });
}
