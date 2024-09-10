$(function () {
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

    
    $('#limparDados').on('click', function(){  
        location.reload()
    });

    $('#dropdown-clientes-fora-do-ar-PTC').on('click', function (e) {
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', false);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', true);
        /*$('#corpoEmail-portabilidade').attr('hidden', true);*/
        $('#e-mail-enviar').attr('hidden', false);

        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
    });
    $('#dropdown-clientes-fora-do-ar-FIBRA').on('click', function (e) {
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', true);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', false);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', true);
        /*$('#corpoEmail-portabilidade').attr('hidden', true);*/
        $('#e-mail-enviar').attr('hidden', false);
        
        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
    });
    $('#dropdown-recolher-equipamento-PTC').on('click', function (e) {
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', true);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', false);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', true);
        /*$('#corpoEmail-portabilidade').attr('hidden', true);*/
        $('#e-mail-enviar').attr('hidden', false);
        
        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
    });
    $('#dropdown-recolher-equipamento-FIBRA').on('click', function (e) {
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', true);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', false);
        /*$('#corpoEmail-portabilidade').attr('hidden', true);*/
        $('#e-mail-enviar').attr('hidden', false);
        
        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
    });
    $('#dropdown-portabilidade').on('click', function (e) {
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', true);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', true);
        /*$('#corpoEmail-portabilidade').attr('hidden', false);*/
        $('#e-mail-enviar').attr('hidden', false);
        
        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
    });

    $('#limparDados').on('click', function(e){
        while ($(".cleaner").val() != "") {
            $(".cleaner").val("");
        }
        $('#corpoEmail-clientes-fora-do-ar-PTC').attr('hidden', true);
        $('#corpoEmail-clientes-fora-do-ar-FIBRA').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-PTC').attr('hidden', true);
        $('#corpoEmail-recolher-equipamento-FIBRA').attr('hidden', true);
        /*$('#corpoEmail-portabilidade').attr('hidden', true);*/
        $('#e-mail-enviar').attr('hidden', true);
    });

    $('#dropdown-emails a').on('click', function() {
        switch ($(this).text()) {
            case 'Clientes fora do ar - PTC':
                $('#selecaoDropdown').text($(this).text());
                $('#selecaoDropdown').css('background-color', 'LightSlateGray');
                $('#selecaoDropdown').css('border-color', 'DarkSlateGray');
                break;
            case 'Clientes fora do ar - Fibra':
                $('#selecaoDropdown').text($(this).text());
                $('#selecaoDropdown').css('background-color', 'LightSlateGray');
                $('#selecaoDropdown').css('border-color', 'DarkSlateGray');
                break;
            case 'Recolher equipamento - PTC':
                $('#selecaoDropdown').text($(this).text());
                $('#selecaoDropdown').css('background-color', 'DarkSlateGray');
                $('#selecaoDropdown').css('border-color', 'DarkSlateGray');
                break;
            case 'Recolher equipamento - Fibra':
                $('#selecaoDropdown').text($(this).text());
                $('#selecaoDropdown').css('background-color', 'DarkSlateGray');
                $('#selecaoDropdown').css('border-color', 'DarkSlateGray');
                break;/*
            case 'Solicitação de portabilidade':
                $('#selecaoDropdown').css('background-color', 'green');
                $('#selecaoDropdown').css('border-color', 'green');
                $('#selecaoDropdown').text($(this).text());
                break;*/
        }
    });

    $('#dropdown-prioridade-clientes-fora-do-ar-PTC a').on('click', function() {
        switch ($(this).text()) {
            case 'Baixa':
                $('#prioridade-clientes-fora-do-ar-PTC').css('background-color', 'yellow');
                $('#prioridade-clientes-fora-do-ar-PTC').css('border-color', 'yellow');
                $('#prioridade-clientes-fora-do-ar-PTC').css('color', 'black');
                $('#prioridade-clientes-fora-do-ar-PTC').text($(this).text());
                break;
            case 'Média':
                $('#prioridade-clientes-fora-do-ar-PTC').css('background-color', 'orange');
                $('#prioridade-clientes-fora-do-ar-PTC').css('border-color', 'orange');
                $('#prioridade-clientes-fora-do-ar-PTC').css('color', 'black');
                $('#prioridade-clientes-fora-do-ar-PTC').text($(this).text());
                break;
            case 'Alta':
                $('#prioridade-clientes-fora-do-ar-PTC').css('background-color', 'red');
                $('#prioridade-clientes-fora-do-ar-PTC').css('border-color', 'red');
                $('#prioridade-clientes-fora-do-ar-PTC').css('color', 'White');
                $('#prioridade-clientes-fora-do-ar-PTC').text($(this).text());
                break;
            case 'Emergêncial':
                $('#prioridade-clientes-fora-do-ar-PTC').css('background-color', 'purple');
                $('#prioridade-clientes-fora-do-ar-PTC').css('border-color', 'purple');
                $('#prioridade-clientes-fora-do-ar-PTC').css('color', 'White');
                $('#prioridade-clientes-fora-do-ar-PTC').text($(this).text());
                break;
        }
    });
    
    $('#dropdown-prioridade-clientes-fora-do-ar-FIBRA a').on('click', function() {
        switch ($(this).text()) {
            case 'Baixa':
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('background-color', 'yellow');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('border-color', 'yellow');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('color', 'black');
                $('#prioridade-clientes-fora-do-ar-FIBRA').text($(this).text());
                break;
            case 'Média':
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('background-color', 'orange');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('border-color', 'orange');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('color', 'black');
                $('#prioridade-clientes-fora-do-ar-FIBRA').text($(this).text());
                break;
            case 'Alta':
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('background-color', 'red');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('border-color', 'red');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('color', 'White');
                $('#prioridade-clientes-fora-do-ar-FIBRA').text($(this).text());
                break;
            case 'Emergêncial':
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('background-color', 'purple');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('border-color', 'purple');
                $('#prioridade-clientes-fora-do-ar-FIBRA').css('color', 'White');
                $('#prioridade-clientes-fora-do-ar-FIBRA').text($(this).text());
                break;
        }
    });
    
    $('#dropdown-prioridade-recolher-equipamento-PTC a').on('click', function() {
        switch ($(this).text()) {
            case 'Baixa':
                $('#prioridade-recolher-equipamento-PTC').css('background-color', 'yellow');
                $('#prioridade-recolher-equipamento-PTC').css('border-color', 'yellow');
                $('#prioridade-recolher-equipamento-PTC').css('color', 'black');
                $('#prioridade-recolher-equipamento-PTC').text($(this).text());
                break;
            case 'Alta':
                $('#prioridade-recolher-equipamento-PTC').css('background-color', 'red');
                $('#prioridade-recolher-equipamento-PTC').css('border-color', 'red');
                $('#prioridade-recolher-equipamento-PTC').css('color', 'White');
                $('#prioridade-recolher-equipamento-PTC').text($(this).text());
                break;
        }
    });

    $('#dropdown-prioridade-recolher-equipamento-FIBRA a').on('click', function() {
        switch ($(this).text()) {
            case 'Baixa':
                $('#prioridade-recolher-equipamento-FIBRA').css('background-color', 'yellow');
                $('#prioridade-recolher-equipamento-FIBRA').css('border-color', 'yellow');
                $('#prioridade-recolher-equipamento-FIBRA').css('color', 'black');
                $('#prioridade-recolher-equipamento-FIBRA').text($(this).text());
                break;
            case 'Alta':
                $('#prioridade-recolher-equipamento-FIBRA').css('background-color', 'red');
                $('#prioridade-recolher-equipamento-FIBRA').css('border-color', 'red');
                $('#prioridade-recolher-equipamento-FIBRA').css('color', 'White');
                $('#prioridade-recolher-equipamento-FIBRA').text($(this).text());
                break;
        }
    });

    function corpoEmailClientesForaDoArPTC() {
        var dataAtual = dataHoje();
        var localForaPTC = $('#local-clientes-fora-do-ar-PTC').val();
        var problemaForaPTC = $('#problema-clientes-fora-do-ar-PTC').val();
        var prioridadeForaPTC = $('#prioridade-clientes-fora-do-ar-PTC').text();
        var obsForaPTC = $('#observacoes-clientes-fora-do-ar-PTC').val();
        var usuarioLogado = '';
    
        $.get('/api/username', function(response) {
            usuarioLogado = response.username || 'NOC';
        });
    
        if (!localForaPTC || !problemaForaPTC || prioridadeForaPTC === "Selecione uma opção" || !obsForaPTC) {
            $('#confirmarEmail').attr('hidden', true);
            alert("Todos os campos precisam ser preenchidos!");
        } else {
            $('#confirmarEmail').attr('hidden', false);
    
            let templateRowNomeEnviar = `
                <div class="row">
                    <div class="col-sm-2" style="padding-inline-start: 2rem">
                        <h5><b>Assunto:</b></h5>
                    </div>
                    <div class="col-sm-10">
                        <h6>[PTC] [NOC] LOCAL FORA DO AR --> ${localForaPTC} - ${dataAtual}</h6>
                    </div>
                </div>
                <hr>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Local:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${localForaPTC}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Problema:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${problemaForaPTC}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Prioridade:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${prioridadeForaPTC}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Observações:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${obsForaPTC}</h6>
                    </div>
                </div>
            `;
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;
    
            $('#confirmarEmail').off('click').on('click', function() {
                var destinatario = 'guilherme.costa@intervip.net.br, gabriel@intervip.net.br';
                var assunto = `[PTC] [NOC] LOCAL FORA DO AR --> ${localForaPTC} - ${dataAtual}`;
                var mensagem = `
                    <p><strong>Local:</strong> ${localForaPTC}</p>
                    <p><strong>Problema:</strong> ${problemaForaPTC}</p>
                    <p><strong>Prioridade:</strong> ${prioridadeForaPTC}</p>
                    <p><strong>Observações:</strong> ${obsForaPTC}</p>
                    <p><strong>Operador:</strong> ${usuarioLogado}</p>
                `;
                enviarEmail(destinatario, assunto, mensagem);
            });
    
            $('#bntFecharconfirmarEmail').off('click').on('click', function() {  
                location.reload();
            });
        }
    }    

    function corpoEmailClientesForaDoArFIBRA() {
        var dataAtual = dataHoje();
        var localForaFIBRA = $('#local-clientes-fora-do-ar-FIBRA').val();
        var problemaForaFIBRA = $('#problema-clientes-fora-do-ar-FIBRA').val();
        var prioridadeForaFIBRA = $('#prioridade-clientes-fora-do-ar-FIBRA').text();
        var obsForaFIBRA = $('#observacoes-clientes-fora-do-ar-FIBRA').val();
        var usuarioLogado = '';
    
        $.get('/api/username', function(response) {
            usuarioLogado = response.username || 'NOC';
        });
    
        if (!localForaFIBRA || !problemaForaFIBRA || prioridadeForaFIBRA === "Selecione uma opção" || !obsForaFIBRA) {
            $('#confirmarEmail').attr('hidden', true);
            alert("Todos os campos precisam ser preenchidos!");
        } else {
            $('#confirmarEmail').attr('hidden', false);
    
            let templateRowNomeEnviar = `
                <div class="row">
                    <div class="col-sm-2" style="padding-inline-start: 2rem">
                        <h5><b>Assunto:</b></h5>
                    </div>
                    <div class="col-sm-10">
                        <h6>[FIBRA] [NOC] LOCAL FORA DO AR --> ${localForaFIBRA} - ${dataAtual}</h6>
                    </div>
                </div>
                <hr>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Local:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${localForaFIBRA}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Problema:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${problemaForaFIBRA}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Prioridade:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${prioridadeForaFIBRA}</h6>
                    </div>
                </div>
                <div class="row" style="text-align: initial;">
                    <div class="col-sm-3" style="padding-inline-start: 2rem">
                        <h5>Observações:</h5>
                    </div>
                    <div class="col-sm-9">
                        <h6>${obsForaFIBRA}</h6>
                    </div>
                </div>
            `;
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;
    
            $('#confirmarEmail').off('click').on('click', function() {
                var destinatario = 'guilherme.costa@intervip.net.br, joabe@intervip.net.br';
                var assunto = `[FIBRA] [NOC] LOCAL FORA DO AR --> ${localForaFIBRA} - ${dataAtual}`;
                var mensagem = `
                    <p><strong>Local:</strong> ${localForaFIBRA}</p>
                    <p><strong>Problema:</strong> ${problemaForaFIBRA}</p>
                    <p><strong>Prioridade:</strong> ${prioridadeForaFIBRA}</p>
                    <p><strong>Observações:</strong> ${obsForaFIBRA}</p>
                    <p><strong>Operador:</strong> ${usuarioLogado}</p>
                `;
                enviarEmail(destinatario, assunto, mensagem);
            });
    
            $('#bntFecharconfirmarEmail').off('click').on('click', function() {  
                location.reload();
            });
        }
    }
    
    function corpoEmailRecolherEquipamentoPTC() {
        var dataAtual = dataHoje()
        var localRecolherEquipamentoPTC = $('#local-recolher-equipamento-PTC').val();
        var dispositivoRecolherEquipamentoPTC = $('#dispositivo-recolher-equipamento-PTC').val();
        var motivoRecolherEquipamentoPTC = $('#motivo-recolher-equipamento-PTC').val();
        var snMacRecolherEquipamentoPTC = $('#sn-mac-recolher-equipamento-PTC').val();
        var prioridadeRecolherEquipamentoPTC = $('#prioridade-recolher-equipamento-PTC').text();
        var usuarioLogado = '';
        
        $.get('/api/username', function(response) {
            usuarioLogado = response.username || 'NOC';
        });

        if(localRecolherEquipamentoPTC == "" || dispositivoRecolherEquipamentoPTC == "" || motivoRecolherEquipamentoPTC == "" || snMacRecolherEquipamentoPTC == "" || prioridadeRecolherEquipamentoPTC == "Selecione uma opção"){
            $('#confirmarEmail').attr('hidden', true);
            alert("Todos os campos precisam ser preenchidos!")
        } else {
            $('#confirmarEmail').attr('hidden', false);
            let templateRowNomeEnviar = `
            <div class="row">
                <div class="col-sm-2" style="padding-inline-start: 2rem">
                    <h5><b>Assunto:</b></h5>
                </div>
                <div class="col-sm-10">
                    <h6>[PTC] [NOC] Recolher equipamento --> ${localRecolherEquipamentoPTC} - ${dataAtual} </h6>
                </div>
            </div>
            <hr>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Local:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${localRecolherEquipamentoPTC}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Dispositivo:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${dispositivoRecolherEquipamentoPTC}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Motivo:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${motivoRecolherEquipamentoPTC}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>SN / MAC:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${snMacRecolherEquipamentoPTC}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Prioridade:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${prioridadeRecolherEquipamentoPTC}</h6>
                </div>
            </div>`
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'guilherme.costa@intervip.net.br, gabriel.risso@intervip.net.br'
                var assunto = `[PTC] [NOC] Recolher equipamento --> ${localRecolherEquipamentoPTC} - ${dataAtual} `;
                var mensagem = `<p><strong>Local:</strong> ${localRecolherEquipamentoPTC} <br>
                <p><strong>Dispositivo:</strong> ${dispositivoRecolherEquipamentoPTC} <br>
                <p><strong>Motivo:</strong> ${motivoRecolherEquipamentoPTC} <br>
                <p><strong>SN/MAC:</strong> ${snMacRecolherEquipamentoPTC} <br>
                <p><strong>Prioridade:</strong> ${prioridadeRecolherEquipamentoPTC} <br>
                <p><strong>Operador:</strong> ${usuarioLogado} <br>
                `
                enviarEmail(destinatario, assunto, mensagem);
                //console.log(destinatario, assunto, mensagem);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }
  
    function corpoEmailRecolherEquipamentoFIBRA() {
        var dataAtual = dataHoje()
        var clienteRecolherEquipamentoFIBRA = $('#cliente-recolher-equipamento-FIBRA').val();
        var dispositivoRecolherEquipamentoFIBRA = $('#dispositivo-recolher-equipamento-FIBRA').val();
        var motivoRecolherEquipamentoFIBRA = $('#motivo-recolher-equipamento-FIBRA').val();
        var snMacRecolherEquipamentoFIBRA = $('#sn-mac-recolher-equipamento-FIBRA').val();
        var enderecoRecolherEquipamentoFIBRA = $('#endereco-recolher-equipamento-FIBRA').val();
        var prioridadeRecolherEquipamentoFIBRA = $('#prioridade-recolher-equipamento-FIBRA').text();
        var usuarioLogado = '';
        
        $.get('/api/username', function(response) {
            usuarioLogado = response.username || 'NOC';
        });

        
        if(clienteRecolherEquipamentoFIBRA == "" || dispositivoRecolherEquipamentoFIBRA == "" || motivoRecolherEquipamentoFIBRA == "" || snMacRecolherEquipamentoFIBRA == "" || prioridadeRecolherEquipamentoFIBRA == "Selecione uma opção"){
            $('#confirmarEmail').attr('hidden', true);
            alert("Todos os campos precisam ser preenchidos!")
        } else {
            $('#confirmarEmail').attr('hidden', false);
            let templateRowNomeEnviar = `
            <div class="row">
                <div class="col-sm-2" style="padding-inline-start: 2rem">
                    <h5><b>Assunto:</b></h5>
                </div>
                <div class="col-sm-10">
                    <h6>[FIBRA] [NOC] Recolher equipamento --> ${clienteRecolherEquipamentoFIBRA} - ${dataAtual} </h6>
                </div>
            </div>
            <hr>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Local:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${clienteRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Dispositivo:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${dispositivoRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Motivo:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${motivoRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>SN / MAC:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${snMacRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Endereço:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${enderecoRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Prioridade:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${prioridadeRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>`
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'guilherme.costa@intervip.net.br, joabe@intervip.net.br'
                var assunto = `[FIBRA] [NOC] Recolher equipamento --> ${clienteRecolherEquipamentoFIBRA} - ${dataAtual} `;
                var mensagem = `<p><strong>Cliente:</strong> ${clienteRecolherEquipamentoFIBRA} <br>
                <p><strong>Dispositivo:</strong> ${dispositivoRecolherEquipamentoFIBRA} <br>
                <p><strong>Motivo:</strong> ${motivoRecolherEquipamentoFIBRA} <br>
                <p><strong>SN/MAC:</strong> ${snMacRecolherEquipamentoFIBRA} <br>
                <p><strong>Endereço:</strong> ${enderecoRecolherEquipamentoFIBRA} <br>
                <p><strong>Prioridade:</strong> ${prioridadeRecolherEquipamentoFIBRA} <br>
                <p><strong>Operador:</strong> ${usuarioLogado} <br>
                `
                enviarEmail(destinatario, assunto, mensagem);
                //console.log(destinatario, assunto, mensagem);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }

    $('#bntEnviar').on('click', function() {
        var dropdownSelecionado = $('#selecaoDropdown').text()
        if (dropdownSelecionado == "Clientes fora do ar - PTC") {
            corpoEmailClientesForaDoArPTC();
        }
        if (dropdownSelecionado == "Clientes fora do ar - Fibra") {
            corpoEmailClientesForaDoArFIBRA();
        }
        if (dropdownSelecionado == "Recolher equipamento - PTC") {
            corpoEmailRecolherEquipamentoPTC();
        }
        if (dropdownSelecionado == "Recolher equipamento - Fibra") {
            corpoEmailRecolherEquipamentoFIBRA();
        }
    });
});
