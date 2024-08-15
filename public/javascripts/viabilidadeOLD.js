$(function() {
    $("#clientCep").on("keyup", function(event) {
	while (isNaN(+$(this).val()) || ($(this).val().length > 0 && $(this).val().length > 8)) {
	    $(this).val($(this).val().slice(0,-1));
       	}
    });
    
    $("#clientAddressNumber").on("keyup", function(event) {
    	while (isNaN(+$(this).val()) && ($(this).val().length > 0)) {
	    $(this).val($(this).val().slice(0,-1));
       	}
    });

    $("#clientCep").on("focusout", function() {
        fetch(`https://api.intervip.com.br/postalcode/${$("#clientCep").val()}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-Version': '1.0'
            }
        }).then(function (response) {
            switch (response.status) {
	    	case 404:
		    alert ('CEP nao encontrado.');
		case 200:
		    return response.json();
		default:
		    alert('CEP Invalido.');
	    }
	}).then(CEP => {
	    localStorage.setItem('CEP', JSON.stringify(CEP));
	    $("#clientAddress").val(CEP.Street);
	    $("#clientAddressNeighbourhood").val(CEP.Neighbourhood);
	    $("#clientAddressCity").val(CEP.City);
	    $("#clientAddressUf").val(CEP.State);
	    $('#submitButton').attr("disabled", false);
	});
    });
    
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
                maxlength: 8,
            },
            clientPhone: {
                required: true,
                celular: true
            },
            clientEmail: {
                email: true
            },
            clientAddressLot: {
                maxlength: 4,
            },
            clientAddressSquare: {
                maxlength: 4,
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

        if ($(this).valid()) {
            fetch('https://api.intervip.com.br/lead', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-Version': '1.0',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: $('#clientName').val(),
                    email: $('#clientEmail').val() || null,
                    phoneNumber: $('#clientPhone').val(),
                    address: {
                        number: +$('#clientAddressNumber').val() || null,
                        square: $('#clientAddressSquare').val() || null,
                        lot: $('#clientAddressLot').val() || null,
			complement: $('#clientAddressComplement').val() || null,
                        postalCode: JSON.parse(window.localStorage.getItem('CEP'))
                    }
                })
            }).then(function (response) {
                switch (response.status) {
		    case 409:
                    case 201:
                        alert("Inserido com sucesso.");
                        localStorage.clear();
                        return location.reload();
                    default:
                        alert('Algo deu errado, reporte este erro ao suporte.');
                        $('#submitButton').attr('disabled', false);
                        throw new Error(response);
                }
            });
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
