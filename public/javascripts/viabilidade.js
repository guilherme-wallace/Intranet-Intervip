$(function() {
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
                $('#clientDropdownTipo').text($(this).text());
				$('#row-clientDropdownTipo-Cond').attr('hidden', false);
                break;
            case 'Casa':
                $('#clientDropdownTipo').text($(this).text());
				$('#row-clientDropdownTipo-Cond').attr('hidden', true);
                $('#clientAddressCondName').val('');
                $('#clientAddressBloco').val('');
                $('#clientAddressApartamento').val('');
                $('#clientAddressSindico').val('');
                break;
        }
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
        if (["6", "7", "8", "9"].indexOf(value.substring(2, 3)) == -1) {
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
                maxlength: 8
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
            clientPhone: 'Preenchimento inválido'
        }
    });
    
    $('#formData').on('submit', function(e) {
        e.preventDefault();
    
        let nameValid = $('#clientName').val();
        let phoneNumberValid = $('#clientPhone').val();
        let postalCodeValid = $('#clientCep').val();
        let addressType = $('#clientDropdownTipo').text()
        var dataAtual = dataHoje();
    
        if ((nameValid == "") || (phoneNumberValid == "") || (postalCodeValid == "") || (addressType == "Selecione uma opção")) {
            alert("Favor verificar se os campos foram preenchidos corretamente!")
        } else {
            let viabilitys = [];
            if ($(this).valid()) {
                viabilitys.push({
                    clientName: $('#clientName').val(),
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
                    apartment: $('#clientAddressApartamento').val() || null,
                    unionNumber: $('#clientAddressSindico').val() || null,
                });
                //console.log(viabilitys);
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
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com';
                        var assunto = `Viabilidade de condomínio: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].condominio} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: VIABILIDADE DE CONDOMÍNIO</strong></p>
                            <p><strong>Nome do cliente:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Nome do condomínio:</strong> ${viabilitys[0].condominio}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
                        `;
                        enviarEmail(destinatario, assunto, mensagem);
                        //console.log(destinatario, assunto, mensagem);
                        alert("Solicitação enviada com sucesso.");
                    }
                    else {
                        var destinatario = 'mullermuraro1+yrlqflg0cdxykjr3yukw@boards.trello.com';
                        var assunto = `Viabilidade de casas: ${viabilitys[0].postalCodeId} --> ${viabilitys[0].neighborhood} --> ${viabilitys[0].city} - ${dataAtual}`;
                        var mensagem = `
                            <p><strong>TIPO DE SOLICITAÇÃO: VIABILIDADE DE CASA</strong></p>
                            <p><strong>Nome do cliente:</strong> ${viabilitys[0].clientName}</p>
                            <p><strong>Celular:</strong> ${viabilitys[0].phoneNumber}</p>
                            <p><strong>E-mail do interessado:</strong> ${viabilitys[0].email}</p>
                            <p><strong>CEP:</strong> ${viabilitys[0].postalCodeId}</p>
                            <p><strong>Endereço:</strong> ${viabilitys[0].address}</p>
                            <p><strong>Número:</strong> ${viabilitys[0].number}</p>
                            <p><strong>Complemento:</strong> ${viabilitys[0].complement}</p>
                            <p><strong>Bairro:</strong> ${viabilitys[0].neighborhood}</p>
                            <p><strong>Cidade:</strong> ${viabilitys[0].city}</p>
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

