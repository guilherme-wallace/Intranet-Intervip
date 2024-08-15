$(function() {
     //Form validation
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
            if ($(this).valid()) {
                fetch('api/v1/viability', {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: $('#clientName').val(),
                        phoneNumber: $('#clientPhone').val(),
                        email: $('#clientEmail').val() || null,
                        postalCode: $('#clientCep').val(),
                        city: $('#clientAddressCity').val() || null,
                        neighborhood: $('#clientAddressNeighbourhood').val() || null,
                        state: $('#clientAddressUf').val() || null,
                        address: $('#clientAddress').val() || null,
                        number: +$('#clientAddressNumber').val() || null,
                        complement: $('#clientAddressComplement').val() || null,
                    })
                }).then(function (response) {
                    switch (response.status) {
                        case 201:
                            alert("Inserido com sucesso.");
                            location.reload()
                        default:
                            alert('Algo deu errado, reporte este erro ao suporte.');
                            throw new Error(response);
                    }
                });
            }
        }
    });
});

/*
const Estados = {
    Rondônia: 11,
	Acre: 12,
	Amazonas: 13,
	Rorâima: 14,
	Pará: 15,
	Amapá: 16,
	Tocantins: 17,
	Manaus: 21,
	Piauí: 22,
	Ceará: 23,
	RioGrandeDoNorte: 24,
	Paraíba: 25,
	Pernambuco: 26,
	Alagoas: 27,
	Sergipe: 28,
	Bahia: 29,
	MinasGerais: 31,
	EspíritoSanto: 32,
	RioDeJaneiro: 33,
	SãoPaulo: 35,
	Paraná: 41,
	SantaCatarina: 42,
	RioGrandeDoSul: 43,
	MatoGrossoDoSul: 50,
	MatoGrosso: 51,
	Goiás: 52,
	DistritoFederal: 53
}
*/
