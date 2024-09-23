$(function() {
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
    
        if ((nameValid == "") || (phoneNumberValid == "") || (postalCodeValid == "")) {
            alert("Favor verificar se os campos foram preenchidos corretamente!")
        }else{
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
                });
                console.log(viabilitys);            
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
                    alert("Inserido com sucesso.");
                    location.reload();
                }).catch(function (error) {
                    console.error("Erro:", error.message);
                    alert('Erro: ' + error.message);
                    location.reload();
                });
            }
        }
    });
});

