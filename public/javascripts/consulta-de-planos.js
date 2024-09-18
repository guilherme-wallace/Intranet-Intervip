$(document).ready(function () {
    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                fetch(`api/v4/condominio?query=${query}`).then(response => response.json()).then(data => {
                        callback(data);
                    }).catch(err => {
                        console.error("Erro na consulta:", err);
                    });
            }
        }
    });

    $('.bloco-item').click(function () {
        let val = $(this).data('id');
        $('#input-bloco-value').val(val);
        $('#main-form').submit();
    });

    $('#input-condo').on('autocomplete.select', function (e, item) {   
        if (!item || !item.value) {
            alert("Erro: O valor selecionado está vazio.");
            return;
        }

        fetch(`api/v1/condominio/${item.value}`).then(response => response.json()).then(condo => {
            
            $('#input-condo').val(condo.condominio);

            $("#planos-disponiveis").empty();
            $('#planos-disponiveis').append('<tr class="fundo-cinza"> \
                                                <td>Tipo</td> \
                                                <td>Valor (R$)</td> \
                                            </tr>');
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
            
            $("#dados-condo-cep").text(condo.cep);          
            $("#dados-condo-endereco").text(condo.endereco);  
            $("#dados-condo-numero").text(condo.numero);     
            $("#dados-condo-cidade").text(cidades[condo.cidadeId]);
            $("#dados-condo-bairro").text(condo.bairro);
    
            $('#linha-apartamentos').prop('hidden', true);
            $('#linha-complemento').prop('hidden', true);
            $('#linha-casas').prop('hidden', true);
            $('#botao-blocos').text('Selecione o Bloco');
            $('#complemento').val('');
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
});


 // Complemento RBX
function copiar() {
    $('#complemento').focus();
    $('#complemento').select();
    document.execCommand("copy");
}

function mostraApartamento(block) {
    $('#estrutura').text(block.technology);
    $('#linha-casas').prop('hidden', true);
    $('#linha-apartamentos').prop('hidden', false);
    $('#linha-complemento').prop('hidden', false);
    $('#apartamento-lista').empty();
    let html = template`<button class="dropdown-item dropdown-apartamento" type="button">${'apartamento'}</button>`;

    for (j = 0; j <= (block.floors - block.initialFloor); j++) {
        for (k = 1; k <= block.units; k++) {
            $('#apartamento-lista').append(html({ apartamento: `${parseInt(block.initialFloor) + j}0${k}` }));
        }
    }

    pegaPlanos(block);
    $('.dropdown-apartamento').on('click', function () {
        let bloco = $('#botao-blocos').text();
        let complement = '';

        if (bloco.includes('Bloco')) {
            complement += bloco.replace('Bloco', 'Bl') + ' - ';
        }
        
        else if (bloco.includes('Torre')) {
            complement += bloco.replace('Torre', 'T') + ' - ';
        }
        
        else if (bloco.includes('Cobertura')) {
            complement += bloco.replace('Cobertura', 'Cob') + ' - ';
        }

        else if (bloco.includes('Loja')) {
            complement += bloco.replace('Loja', 'Lj') + ' - ';
        }

        else if (bloco.includes('Sala')) {
            complement += bloco.replace('Sala', 'Sl') + ' - ';
        }

        else if (!bloco.includes('Unico')) {
            complement += bloco + ' - ';
        }
        
        complement += `Ap ${$(this).text()}`;                                                
        $('#complemento').val(complement);                                                
        $('#selecionar-apartamento').modal('hide');
    });
}

function mostraCasa(block) {
    $('#numero-casa').val('');
    $('#estrutura').text(block.technology);
    $('#linha-casas').prop('hidden', false);
    $('#linha-apartamentos').prop('hidden', true);
    $('#linha-complemento').prop('hidden', false);
    pegaPlanos(block);

    $('#numero-casa').on('keyup', function () {
        let complement = "";

        if (block.name.includes("Quadra")) {
            complement += block.name.replace("Quadra", "Qd");
        }

        if (block.Tipo.includes("Lote")) {
            complement += block.type.replace("Lote", " Lt");
        }

        else {
            complement += block.type;
        }

        complement += ` ${$(this).val()}`;
        $('#complemento').val(complement);
    });
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

async function pegaPlanos(block) {
    $('#planos-disponiveis').empty();
    let html = template`<tr>
			    <td class="plano-tipo">${'tipo'}</td>
			    <td>R$${'valor'}</td>
			</tr>`;
    
    let groupPlans = await fetch(`api/v3/plan?query=${block.technology == 'Rádio' ? 'AIRMAX' : 'FIBER_FTTH'}`).then(response => response.json()).then(plans => {
        plans.sort((a, b) => b.speed - a.speed);
	let internetPlans = [];

	for (const plan of plans) {
	    internetPlans.push({
		name: plan.name,
            	price: (parseFloat(plan.price) - (function() {
		    switch (block.groupId) {
		        default: return 0;
                    };
               	})()).toFixed(2)
            });
	}

	return internetPlans;
    });

    groupPlans.sort((a, b) => b.price - a.price);

    let tvInternetPlans = await fetch(`api/v3/plan?query=FIBER_DIRECTV`).then(response => response.json()).then(plans => {
	plans.sort((a, b) => b.price - a.price);
	let tvInternetPlans = [];

	for (const plan of plans) {
	    tvInternetPlans.push({
	        name: plan.name,
		price: (parseFloat(plan.price) - (function() {
		    switch (block.groupId) {
			default: return 0;
		    };
	    	})()).toFixed(2)
	    });
	}

	return tvInternetPlans;
    
    });

    groupPlans.push(...tvInternetPlans);    

    let tvPlans = await fetch(`api/v3/plan?query=IVP_TV`).then(response => response.json()).then(plans => {
	plans.sort((a, b) => b.price - a.price);
	let tvPlans = [];

	for (const plan of plans) {
	    tvPlans.push({
		name: plan.name,
		price: (parseFloat(plan.price) - (function() {
		    switch (block.groupId) {
			default: return 0;
		    };
		})()).toFixed(2)
	    });
    	}

	return tvPlans;
    });

    groupPlans.push(...tvPlans);

    for (const plan of groupPlans) {
	$('#planos-disponiveis').append(html({
	    tipo: plan.name,
	    valor: plan.price
	}));
    }
}
