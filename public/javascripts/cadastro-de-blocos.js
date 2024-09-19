$(function () {
    $('[data-toggle="tooltip"]').tooltip();
    localStorage.clear();
    insereLinhas();

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

    $('#input-condo').on('autocomplete.select', function (e, item) {
        $("#input-condo-value").val(item.value);
        localStorage.setItem('condominio', JSON.stringify(item));
        listaBlocos(item.value);

        fetch(`api/v1/condominio/${item.value}`).then(response => response.json()).then(condo => {
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
            
            $("#dados-condo-cep").text(condo.cep  || "Favor verificar no IXC");          
            $("#dados-condo-endereco").text(condo.endereco  || "Favor verificar no IXC");  
            $("#dados-condo-numero").text(condo.numero  || "Favor verificar no IXC");     
            $("#dados-condo-cidade").text(cidades[condo.cidadeId] || "Favor verificar no IXC");
            $("#dados-condo-bairro").text(condo.bairro  || "Favor verificar no IXC");
    
            $('#linha-apartamentos').prop('hidden', true);
            $('#linha-complemento').prop('hidden', true);
            $('#linha-casas').prop('hidden', true);
            $('#botao-blocos').text('Selecione o Bloco');
            $('#complemento').val('');

        }).catch(err => {
            console.error("Erro na requisição ao condomínio:", err);
        });
    });
});

function listaBlocos(condominioId) {
    fetch(`api/v1/block/${condominioId}`).then(function (response) {
        switch (response.status) {
            case 200:
                return response.json();
            case 404:
                alert('Não existem blocos criados para este condomínio. Ou o condomínio ainda não foi registrado no Intranet.');
                return null;
            default:
                alert('Algo deu errado, contate o suporte.');
                return null;
        }
    }).then(blocks => {
        $('#blocos-lista').empty();
        $('#blocos-lista').append('<tr> \
                                        <th style="width: 6%;"></th> \
                                        <th style="width: 30%;">Bloco</th> \
                                        <th style="width: 14%;">Tipo</th> \
                                        <th style="width: 14%;">Estrutura</th> \
                                        <th style="width: 7%;">Andares</th> \
                                        <th style="width: 12%;">Andar Inicial</th> \
                                        <th style="width: 8%;">Unidades</th> \
                                        <th style="width: 8%;">Total</th> \
                                        <th style="width: 8%;">Ações</th> \
                                    </tr>');

        if (!blocks) {
            return;
        }

        let html = template`<tr id="dados-bloco-${'id'}">
                                <td>
                                    <div id="bnt-deleta-bloco-${'id'}" hidden>
                                        <button type="button" class="input-group-text cor-span" id="deleta-bloco-${'id'}" style="cursor: pointer;">
                                            <img src="images/menos.png" style="max-height: 20px;">
                                        </button>
                                    </div>
                                </td>
                                <td><input type="text" class="form-control" id="edit-nome-bloco-${'id'}" value="${'nome'}" readonly /></td>
                                <td>
                                    <div class="dropdown">
                                        <button id="botao-tipo-unidade-${'id'}" class="btn dropdown-toggle scroll-menu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: whitesmoke; color: black; border: 1px solid lightgrey; width: 100%;" disabled>${'tipo'}</button>
                                        <div id="tipo-unidade-${'id'}" class="dropdown-menu"></div>
                                    </div>
                                </td>
                                <td>
                                    <div class="dropdown">
                                        <button id="botao-blocos-estrutura-${'id'}" class="btn dropdown-toggle scroll-menu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: whitesmoke; color: black; border: 1px solid lightgrey; width: 100%;" disabled>${'estrutura'}</button>
                                        <div id="blocos-estrutura-${'id'}" class="dropdown-menu"></div>
                                    </div>
                                </td>
                                <td><input type="number" class="form-control" id="edit-andares-${'id'}" value="${'andares'}" readonly /></td>
                                <td><input type="number" class="form-control" id="edit-andarInicial-${'id'}" value="${'andarInicial'}" readonly /></td>
                                <td><input type="number" class="form-control" id="edit-unidades-${'id'}" value="${'unidades'}" readonly /></td>
                                <td><input type="text" class="form-control" id="edit-total-${'id'}" value="${'total'}" readonly /></td>
                                <td>
                                    <button class="btn btn-warning" id="btn-editar-bloco-${'id'}">Editar</button>
                                    <button class="btn btn-success" id="btn-salvar-bloco-${'id'}" hidden>Salvar</button>
                                </td>
                            </tr>`;
        const typeMap = {
            'Casa': 1,
            'Lote': 2,
            'Loja': 3,
            'Sala': 4,
            'Quiosque': 5,
            'Apartamento': 6,
            'Cobertura': 7
        };

        const technologyMap = {
            'Fibra': 1,
            'Rádio': 2,
            'Sem estrutura': 3,
            'FTTH': 4,
            'FTTB': 5
        };

        for (const block of blocks) {
            $('#blocos-lista').append(html({
                id: block.blockId,
                nome: block.name,
                tipo: block.type,
                estrutura: block.technology,
                andares: block.floors ?? "N/A",
                andarInicial: block.initialFloor ?? "N/A",
                unidades: block.units,
                total: (block.floors - block.initialFloor + 1) * block.units
            }));

            displayBlockTypesListaBlocos(block.blockId);
            displayBlockTechnologiesListaBlocos(block.blockId);

            $(`#btn-editar-bloco-${block.blockId}`).on('click', function () {

                const typeId = typeMap[block.type] || null;
                const technologyId = technologyMap[block.technology] || null;

                localStorage[`tipo-unidade-${block.blockId}`] = typeId;
                localStorage[`blocos-estrutura-${block.blockId}`] = technologyId;

                console.log(block)

                $(`#edit-nome-bloco-${block.blockId}`).prop('readonly', false);
                $(`#botao-tipo-unidade-${block.blockId}`).prop('disabled', false);
                $(`#botao-blocos-estrutura-${block.blockId}`).prop('disabled', false);
                $(`#edit-andares-${block.blockId}`).prop('readonly', false);
                $(`#edit-andarInicial-${block.blockId}`).prop('readonly', false);
                $(`#edit-unidades-${block.blockId}`).prop('readonly', false);              

                $(`#btn-editar-bloco-${block.blockId}`).hide();
                $(`#btn-salvar-bloco-${block.blockId}`).prop('hidden', false);
            });

            $(`#btn-salvar-bloco-${block.blockId}`).on('click', function () {
                const updatedBlock = {
                    blockId: block.blockId,
                    name: $(`#edit-nome-bloco-${block.blockId}`).val(),
                    typeId: localStorage[`tipo-unidade-${block.blockId}`],  
                    structureId: localStorage[`blocos-estrutura-${block.blockId}`],  
                    floors: $(`#edit-andares-${block.blockId}`).val(),
                    initialFloor: $(`#edit-andarInicial-${block.blockId}`).val(),
                    units: $(`#edit-unidades-${block.blockId}`).val()
                };

                fetch(`api/v1/block/${block.blockId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedBlock)
                }).then(response => {
                    if (response.status === 200) {
                        alert('Bloco atualizado com sucesso!');
                        listaBlocos(condominioId);
                    } else {
                        alert('Erro ao atualizar bloco!');
                    }
                });
            });
        }

        function displayBlockTypesListaBlocos(blockId) {
            let types = JSON.parse(localStorage.getItem('types')) ?? [];
            let typeTemplate = template`<button class="dropdown-item dropdown-tipo" data-id="${'typeId'}" type="button">${'type'}</button>`;

            $(`#tipo-unidade-${blockId}`).empty();
            for (const type of types) {
                $(`#tipo-unidade-${blockId}`).append(typeTemplate({ type: type.type, typeId: type.typeId }));
            }

            $(`#tipo-unidade-${blockId} .dropdown-tipo`).on('click', function () {
                let typeId = parseInt($(this).data("id"));
                localStorage[`tipo-unidade-${blockId}`] = typeId;  
                $(`#botao-tipo-unidade-${blockId}`).text($(this).text());
            });
        }

        function displayBlockTechnologiesListaBlocos(blockId) {
            let technologies = JSON.parse(localStorage.getItem('technologies')) ?? [];
            let technologyTemplate = template`<button class="dropdown-item dropdown-tipo" data-id="${'technologyId'}" type="button">${'technology'}</button>`;

            $(`#blocos-estrutura-${blockId}`).empty();
            for (const technology of technologies) {
                $(`#blocos-estrutura-${blockId}`).append(technologyTemplate({ technology: technology.technology, technologyId: technology.technologyId }));
            }

            $(`#blocos-estrutura-${blockId} .dropdown-tipo`).on('click', function () {
                let technologyId = parseInt($(this).data("id"));
                localStorage[`blocos-estrutura-${blockId}`] = technologyId;  
                $(`#botao-blocos-estrutura-${blockId}`).text($(this).text());
            });
        }

        $('*[id^=dados-bloco-]').hover(function () {
            let id = $(this).attr('id').slice(12);
            $(`#bnt-deleta-bloco-${id}`).prop('hidden', false);
            $(`#bnt-nome-bloco-${id}`).prop('class', 'col-sm-10');
        }, function () {
            let id = $(this).attr('id').slice(12);
            $(`#bnt-deleta-bloco-${id}`).prop('hidden', true);
            $(`#bnt-nome-bloco-${id}`).prop('class', 'col-sm-12');
        });

        $('*[id^=deleta-bloco-]').on('click', function () {
            if (confirm('Tem certeza que deseja deletar este bloco?')) {
                fetch(`api/v1/block/${$(this).attr('id').slice(13)}`, {
                    method: 'DELETE'
                }).then(function(response) {
                    switch (response.status) {
                        case 204:
                            alert('Bloco removido com sucesso!');
                            return listaBlocos(condominioId);
                        default:
                            return alert("Ocorreu um erro, contate o suporte!");
                    }
                });
            }
        });
    });
}

function insereLinhas() {
    let html = template`<div class="input-group" id="origem-${'index'}" style="width: 100%;">
                            <input type="text" id="blocos-nome-${'index'}" class="form-control form-control-md"style="max-width: 33%;"
                                placeholder="Insira o nome do bloco" data-toggle="tooltip" data-html="true" data-placement="top" title="Caso o prédio não contenha blocos, escreva apenas <b>Unico</b>." autocomplete="off" maxlength="40" size="100">
                            <div class="dropdown" style="margin-left: 5px; text-align: center; min-width: 16%;">
                                <button id="botao-tipo-unidade-${'index'}" class="btn dropdown-toggle scroll-menu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: whitesmoke; color: black; border: 1px solid lightgrey; width: 100%;">Tipo de Unidade</button>
                                <div id="tipo-unidade-${'index'}" class="dropdown-menu" aria-labelledby="dropdown-blocos">
                                </div>
                            </div>
                            <div class="dropdown" data-toggle="tooltip" data-html="true" data-placement="top" title="Tipo de estrutura no local" style="margin-left: 5px; text-align: center; min-width: 15%;">
                                <button id="botao-blocos-estrutura-${'index'}" class="btn dropdown-toggle scroll-menu" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="background-color: whitesmoke; color: black; border: 1px solid lightgrey; width: 100%;">Estrutura</button>
                                <div id="blocos-estrutura-${'index'}" class="dropdown-menu" aria-labelledby="dropdown-blocos">
                                </div>
                            </div>
                            <input type="number" id="quantidade-andares-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 11%;  text-align: center;"
                                placeholder="Andares" autocomplete="off" maxlength="10" size="100">
                            <input type="number" id="andar-inicial-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 13%;  text-align: center;"
                                placeholder="Andar inicial" autocomplete="off" maxlength="10" size="100">
                            <input type="number" id="unidades-por-andar-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 11%; text-align: center;"
                                placeholder="Unidades" data-toggle="tooltip" data-placement="top" title="Unidades por andar" autocomplete="off" maxlength="10" size="100">
                        </div>`;
    $('#destino').append(html({ index: $('*[id^=origem-]').length }));
    $('#btnMenos').prop('hidden', false);
    
    let types = JSON.parse(localStorage.getItem('types')) ?? [];

    if (!types || types.length == 0) {
        fetch('api/v1/type').then(response => response.json()).then(data => {
            localStorage.setItem('types', JSON.stringify(data));
            displayBlockTypes(data);
        });
    }

    else {        
        displayBlockTypes(types);
    }
    
    let technologies = JSON.parse(localStorage.getItem('technologies')) ?? [];

    if (!technologies || technologies.length == 0) {
        fetch('api/v1/technology').then(response => response.json()).then(data => {
            localStorage.setItem('technologies', JSON.stringify(data));
            displayBlockTechnologies(data);
        });
    }

    else {        
        displayBlockTechnologies(technologies);
    }
}

function displayBlockTypes(types) {
    let typeTemplate = template`<button class="dropdown-item dropdown-tipo" data-id="${'typeId'}" type="button">${'type'}</button>`;

    $('[id^=tipo-unidade-]').each(function () {
        if ($(this).children().length == 0) {
            for (const type of types) {
                $(this).append(typeTemplate({ type: type.type, typeId: type.typeId })); 
                $('.dropdown-tipo').on('click', function () {
                    let parentId = $(this).closest('div').attr('id');
                    let typeId = parseInt($(this).data("id"));
                    let id = parentId.slice(13);

                    if (typeId < 3 || typeId == 5) {
                        $(`#andar-inicial-${id}`).prop('readonly', true).prop('disabled', true);
                        $(`#quantidade-andares-${id}`).prop('readonly', true).prop('disabled', true);
                        $(`#andar-inicial-${id}`).val('1');
                        $(`#quantidade-andares-${id}`).val('1');
                    }

                    else {
                        $(`#andar-inicial-${id}`).prop('readonly', false).prop('disabled', false);
                        $(`#quantidade-andares-${id}`).prop('readonly', false).prop('disabled', false);
                        $(`#andar-inicial-${id}`).val('');
                        $(`#quantidade-andares-${id}`).val('');
                    };

                    localStorage[parentId] = typeId;
                    $(`#botao-tipo-unidade-${id}`).text($(this).text());
                });
            }
        }
    });
}

function displayBlockTechnologies(technologies) {
    let technologyTemplate = template`<button class="dropdown-item dropdown-tipo" data-id="${'technologyId'}" type="button">${'technology'}</button>`;

    $('[id^=blocos-estrutura-]').each(function () {
        if ($(this).children().length == 0) {
            for (const technology of technologies) {
                $(this).append(technologyTemplate({ technology: technology.technology, technologyId: technology.technologyId }));
                $('.dropdown-tipo').on('click', function () {
                    let parentId = $(this).closest('div').attr('id');
                    let id = parentId.slice(17);
                    localStorage[parentId] = $(this).data("id");
                    $(`#botao-blocos-estrutura-${id}`).text($(this).text());
                });
            }
        }
    });
}

//----------------------BTN remover-------------------------
function removeLinhas() {
    var destino = document.getElementById('destino');

    if (destino.childNodes.length > 0) {
        destino.removeChild(destino.childNodes[destino.childNodes.length - 1]);

        for (variable in localStorage) {
            if (variable.endsWith($('*[id^=tipo-unidade-]').length)) {
                localStorage.removeItem(variable);
            }
        }

        if (destino.childNodes.length == 1) {
            $('#btnMenos').prop('hidden', true);
        }
    }
}

//----------------------BTN reload-------------------------
function atualizaCondominios() {
    fetch('/api/run-python')
        .then(response => response.text())
        .then(data => {
            //console.log(data);
            alert('Condomínios atualizado!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Falha ao executar o script: add-condominiums-to-BD \n Favor informar ao suporte.');
        });
}

//----------------------BTN cancelar-------------------------
function cancelaCadastro() {
    location.reload()
    localStorage.clear();
}


//---------------- Insere informações no BD ----------------------------
function cadastraBlocos() {
    var condominio = JSON.parse(localStorage.getItem('condominio'));

    if (!condominio) {
        return alert("Favor selecionar o comdomínio!");
    }

    $("#input-condo-value").val('');
    var nomes = $('*[id^=blocos-nome-]');
    var unidades = $('*[id^=unidades-por-andar-]');
    var andares = $('*[id^=quantidade-andares-]');
    var andaresIniciais = $('*[id^=andar-inicial-]');

    var tipos = [];
    var estruturas = [];
    for (variable in localStorage) {
        if (variable.substring(0, 17) == 'blocos-estrutura-') {
            estruturas.push(localStorage[variable]);
        }

        else if (variable.substring(0, 13) == 'tipo-unidade-') {
            tipos.push(localStorage[variable]);
        }
    }

    let blocks = [];

    for (var i = 0; i < nomes.length; i++) {
        blocks.push({
            'condominio': {
                condominioId: +condominio.value,
                name: condominio.text
            },
            structureId: +estruturas[i],
            name: nomes[i].value,
            typeId: +tipos[i],
            floors: (andares[i].value === '' ? null : andares[i].value),
            units: unidades[i].value,
            initialFloor: (andaresIniciais[i].value === '' ? null : andaresIniciais[i].value)
        });
    }

    fetch('api/v1/block', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify(blocks)
    }).then(function (response) {
        switch (response.status) {
            case 201:
                return response.json();
            case 400:
                return alert('Erro ao adicionar blocos, verifique se todas os campos estão preenchidos corretamente.');
            default:
                return alert("Ocorreu um erro, contate o suporte!");
        }
    }).then(response => {
        if (response) {
            localStorage.removeItem('condominio');
            $('#destino').empty();
            insereLinhas();
            listaBlocos(condominio.value);
            
            for (variable in localStorage) {
                if (variable.substring(0, 17) == 'blocos-estrutura-') {
                    localStorage.removeItem(variable);
                }

                else if (variable.substring(0, 13) == 'tipo-unidade-') {
                    localStorage.removeItem(variable);
                }
            }
            
            return alert('Blocos adicionados com sucesso!');
        }
    });
}
