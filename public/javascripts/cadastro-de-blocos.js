$(function () {
    $('[data-toggle="tooltip"]').tooltip();
    localStorage.clear();
    insereLinhas();

    $('#input-condo').autoComplete({
        minLength: 1,
        resolver: 'custom',
        events: {
            search: function (query, callback) {
                fetch(`api/v4/group?query=${query}`).then(response => response.json()).then(data => {
                    callback(data);
                });
            }
        }
    });

    $('#input-condo').on('autocomplete.select', function (e, item) {
        $("#input-condo-value").val(item.value);
        localStorage.setItem('group', JSON.stringify(item));
        listaBlocos(item.value);
    });
});

function listaBlocos(groupId) {
    fetch(`api/v1/block/${groupId}`).then(function (response) {
        switch (response.status) {
            case 200:
                return response.json();
            case 404:
                alert('Não existem blocos criados para este grupo.');
                return null;
            default:
                alert('Algo deu errado, contate o suporte.');
                return null;
        }
    }).then(blocks => {
        $('#blocos-lista').empty();
        $('#blocos-lista').append('<tr> \
                                        <th style="width: 36%;">Bloco</th> \
                                        <th style="width: 14%;">Tipo</th> \
                                        <th style="width: 14%;">Estrutura</th> \
                                        <th style="width: 7%;">Andares</th> \
                                        <th style="width: 12%;">Andar Inicial</th> \
                                        <th style="width: 8%;">Unidades</th> \
                                        <th style="width: 8%;">Total</th> \
                                    </tr>');

        if (!blocks) {
            return;
        }

        let html = template`<tr id="dados-bloco-${'id'}">
                                <td class="row" style="padding: 0px; margin: 0;">
                                    <div class="col-sm-2" id="bnt-deleta-bloco-${'id'}" style="padding: 0px;" hidden>
                                        <button type="button" class="input-group-text cor-span" id="deleta-bloco-${'id'}" style="cursor: pointer;">
                                            <img src="images/menos.png" style="max-height: 20px;">
                                        </button>
                                    </div>
                                    <div class="col-sm-12" id="bnt-nome-bloco-${'id'}" style="padding: 4.8px;">
                                        ${'nome'}
                                    </div>
                                </td>
                                <td>${'tipo'}</td>
                                <td>${'estrutura'}</td>
                                <td>${'andares'}</td>
                                <td>${'andarInicial'}</td>
                                <td>${'unidades'}</td>
                                <td>${'total'}</td>
                            </tr>`;

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
                            return listaBlocos(groupId);
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
                            <input type="text" id="quantidade-andares-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 11%;  text-align: center;"
                                placeholder="Andares" autocomplete="off" maxlength="10" size="100">
                            <input type="text" id="andar-inicial-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 13%;  text-align: center;"
                                placeholder="Andar inicial" autocomplete="off" maxlength="10" size="100">
                            <input type="text" id="unidades-por-andar-${'index'}" class="form-control form-control-md"style="margin-left: 5px; max-width: 11%; text-align: center;"
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
                    }

                    else {
                        $(`#andar-inicial-${id}`).prop('readonly', false).prop('disabled', false);
                        $(`#quantidade-andares-${id}`).prop('readonly', false).prop('disabled', false);
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

//----------------------BTN cancelar-------------------------
function cancelaCadastro() {
    window.location.href = '../';
    localStorage.clear();
}


//---------------- Insere informações no BD ----------------------------
function cadastraBlocos() {
    var group = JSON.parse(localStorage.getItem('group'));

    if (!group) {
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
            'group': {
                groupId: +group.value,
                name: group.text
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
            localStorage.removeItem('group');
            $('#destino').empty();
            insereLinhas();
            listaBlocos(group.value);
            
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
