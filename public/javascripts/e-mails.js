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
        var dataAtual = dataHoje()
        var localForaPTC = $('#local-clientes-fora-do-ar-PTC').val();
        var problemaForaPTC = $('#problema-clientes-fora-do-ar-PTC').val();
        var prioridadeForaPTC = $('#prioridade-clientes-fora-do-ar-PTC').text();
        var obsForaPTC = $('#observacoes-clientes-fora-do-ar-PTC').val();
        var operadorForaPTC = $('#operador-clientes-fora-do-ar-PTC').val();
        
        if(localForaPTC == "" || problemaForaPTC == "" || prioridadeForaPTC == "Selecione uma opção" || obsForaPTC == "" || operadorForaPTC == ""){
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
                    <h6>[PTC] [NOC] LOCAL FORA DO AR --> ${localForaPTC} - ${dataAtual} </h6>
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
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Operador:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${operadorForaPTC}</h6>
                </div>
            </div>`
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'noc@intervip.net.br, ptc@intervip.net.br'
                var assunto = `[PTC] [NOC] LOCAL FORA DO AR --> ${localForaPTC} - ${dataAtual}`;
                var mensagem = `<p><strong>Local:</strong> ${localForaPTC} <br>
                <p><strong>Problema:</strong> ${problemaForaPTC} <br>
                <p><strong>Prioridade:</strong> ${prioridadeForaPTC} <br>
                <p><strong>Observações:</strong> ${obsForaPTC} <br>
                <p><strong>Operador:</strong> ${operadorForaPTC} <br>
                `
                enviarEmail(destinatario, assunto, mensagem);
                //console.log(destinatario, assunto, mensagem);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }

    function corpoEmailClientesForaDoArFIBRA() {
        var dataAtual = dataHoje()
        var localForaFIBRA = $('#local-clientes-fora-do-ar-FIBRA').val();
        var problemaForaFIBRA = $('#problema-clientes-fora-do-ar-FIBRA').val();
        var prioridadeForaFIBRA = $('#prioridade-clientes-fora-do-ar-FIBRA').text();
        var obsForaFIBRA = $('#observacoes-clientes-fora-do-ar-FIBRA').val();
        var operadorForaFIBRA = $('#operador-clientes-fora-do-ar-FIBRA').val();
        
        if(localForaFIBRA == "" || problemaForaFIBRA == "" || prioridadeForaFIBRA == "Selecione uma opção" || obsForaFIBRA == "" || operadorForaFIBRA == ""){
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
                    <h6>[FRIBRA] [NOC] LOCAL FORA DO AR --> ${localForaFIBRA} - ${dataAtual} </h6>
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
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Operador:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${operadorForaFIBRA}</h6>
                </div>
            </div>`
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'noc@intervip.net.br, fibra@intervip.net.br'
                var assunto = `[FIBRA] [NOC] LOCAL FORA DO AR --> ${localForaFIBRA} - ${dataAtual}`;
                var mensagem = `<p><strong>Local:</strong> ${localForaFIBRA} <br>
                <p><strong>Problema:</strong> ${problemaForaFIBRA} <br>
                <p><strong>Prioridade:</strong> ${prioridadeForaFIBRA} <br>
                <p><strong>Observações:</strong> ${obsForaFIBRA} <br>
                <p><strong>Operador:</strong> ${operadorForaFIBRA} <br>
                `
                enviarEmail(destinatario, assunto, mensagem);
                //console.log(destinatario, assunto, mensagem);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }
    
    function corpoEmailRecolherEquipamentoPTC() {
        var dataAtual = dataHoje()
        var localRecolherEquipamentoPTC = $('#local-recolher-equipamento-PTC').val();
        var dispositivoRecolherEquipamentoPTC = $('#dispositivo-recolher-equipamento-PTC').val();
        var motivoRecolherEquipamentoPTC = $('#motivo-recolher-equipamento-PTC').val();
        var snMacRecolherEquipamentoPTC = $('#sn-mac-recolher-equipamento-PTC').val();
        var prioridadeRecolherEquipamentoPTC = $('#prioridade-recolher-equipamento-PTC').text();
        var operadorRecolherEquipamentoPTC = $('#operador-recolher-equipamento-PTC').val();
        
        if(localRecolherEquipamentoPTC == "" || dispositivoRecolherEquipamentoPTC == "" || motivoRecolherEquipamentoPTC == "" || snMacRecolherEquipamentoPTC == "" || prioridadeRecolherEquipamentoPTC == "Selecione uma opção" || operadorRecolherEquipamentoPTC == ""){
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
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Operador:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${operadorRecolherEquipamentoPTC}</h6>
                </div>
            </div>  `
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'noc@intervip.net.br, ptc@intervip.net.br'
                var assunto = `[PTC] [NOC] Recolher equipamento --> ${localRecolherEquipamentoPTC} - ${dataAtual} `;
                var mensagem = `<p><strong>Local:</strong> ${localRecolherEquipamentoPTC} <br>
                <p><strong>Dispositivo:</strong> ${dispositivoRecolherEquipamentoPTC} <br>
                <p><strong>Motivo:</strong> ${motivoRecolherEquipamentoPTC} <br>
                <p><strong>SN/MAC:</strong> ${snMacRecolherEquipamentoPTC} <br>
                <p><strong>Prioridade:</strong> ${prioridadeRecolherEquipamentoPTC} <br>
                <p><strong>Operador:</strong> ${operadorRecolherEquipamentoPTC} <br>
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
        var operadorRecolherEquipamentoFIBRA = $('#operador-recolher-equipamento-FIBRA').val();
        
        if(clienteRecolherEquipamentoFIBRA == "" || dispositivoRecolherEquipamentoFIBRA == "" || motivoRecolherEquipamentoFIBRA == "" || snMacRecolherEquipamentoFIBRA == "" || prioridadeRecolherEquipamentoFIBRA == "Selecione uma opção" || operadorRecolherEquipamentoFIBRA == ""){
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
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Operador:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${operadorRecolherEquipamentoFIBRA}</h6>
                </div>
            </div>  `
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var dataAtual = dataHoje()
                var destinatario = 'noc@intervip.net.br, fibra@intervip.net.br'
                var assunto = `[FIBRA] [NOC] Recolher equipamento --> ${clienteRecolherEquipamentoFIBRA} - ${dataAtual} `;
                var mensagem = `<p><strong>Cliente:</strong> ${clienteRecolherEquipamentoFIBRA} <br>
                <p><strong>Dispositivo:</strong> ${dispositivoRecolherEquipamentoFIBRA} <br>
                <p><strong>Motivo:</strong> ${motivoRecolherEquipamentoFIBRA} <br>
                <p><strong>SN/MAC:</strong> ${snMacRecolherEquipamentoFIBRA} <br>
                <p><strong>Endereço:</strong> ${enderecoRecolherEquipamentoFIBRA} <br>
                <p><strong>Prioridade:</strong> ${prioridadeRecolherEquipamentoFIBRA} <br>
                <p><strong>Operador:</strong> ${operadorRecolherEquipamentoFIBRA} <br>
                `
                enviarEmail(destinatario, assunto, mensagem);
                //console.log(destinatario, assunto, mensagem);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }
      
    /*function corpoEmailSolicitacaoDePortabilidade() {
        var linhaPortabilidade = $('#linha-portabilidade').val();
        var nomePortabilidade = $('#nome-portabilidade').val();
        var cpfCnpjPortabilidade = $('#cpf-cnpj-portabilidade').val();
        var enderecoPortabilidade = $('#endereco-portabilidade').val();
        var cepPortabilidade = $('#CEP-portabilidade').val();
        var operadorPortabilidade = $('#operador-portabilidade').val();
        
        if(linhaPortabilidade == "" || nomePortabilidade == "" || cpfCnpjPortabilidade == "" || enderecoPortabilidade == "" || cepPortabilidade == "" || operadorPortabilidade == ""){
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
                    <h6>SOLICITAÇÃO DE PORTABILIDADE TN: ${linhaPortabilidade} </h6>
                </div>
            </div>
            <hr>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Linha:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${linhaPortabilidade}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Nome:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${nomePortabilidade}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>CPF/CNPJ:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${cpfCnpjPortabilidade}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Endereço:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${enderecoPortabilidade}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>CEP:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${cepPortabilidade}</h6>
                </div>
            </div>
            <div class="row" style="text-align: initial;">
                <div class="col-sm-3" style="padding-inline-start: 2rem">
                    <h5>Operador:</h5>
                </div>
                <div class="col-sm-9">
                    <h6>${operadorPortabilidade}</h6>
                </div>
            </div>  
            `
            document.getElementById("rowNomeEnviar").innerHTML = templateRowNomeEnviar;

            $('#confirmarEmail').on('click', function() {
                var destinatario = 'guilherme.costa@intervip.net.br'
                var assunto = `SOLICITAÇÃO DE PORTABILIDADE TN: ${linhaPortabilidade}`;
                var mensagem = `<p><strong>Linha:</strong> ${linhaPortabilidade} <br>
                <p><strong>Nome do cliente:</strong> ${nomePortabilidade} <br>
                <p><strong>CPF / CNPJ:</strong> ${cpfCnpjPortabilidade} <br>
                <p><strong>Endereço:</strong> ${enderecoPortabilidade} <br>
                <p><strong>CEP:</strong> ${cepPortabilidade} <br>
                <br>
                <p>Atenciosamente,<br>
                <p>${operadorPortabilidade} - NOC Intervip.
                `
                var anexoName = "Arquivo cliente";
                var anexoFile = $('#anexo').val();

                const enviarEmailPortabilidade = async (destinatario, assunto, mensagem, anexoName, anexoFile) => {
                  var destinatario;
                  var assunto;
                  var mensagem;
                  var anexoName;
                  var anexoFile;
                  
                  try {
                    const formData = new FormData();
                    formData.append('para', destinatario);
                    formData.append('assunto', assunto);
                    formData.append('mensagem', mensagem);
                    formData.append('anexoName', anexoName);
                    formData.append('anexoFile', anexoFile);
                    //formData.append('anexo', anexoInput.files[0]); // Adiciona o arquivo anexo ao FormData
              
                    const resposta = await fetch('/api/email/enviar-email', {
                      method: 'POST',
                      body: formData,
                    });
              
                    const dadosResposta = await resposta.json();
              
                    if (resposta.ok) {
                      alert(dadosResposta.message);
                    } else {
                      alert(`Erro ao enviar o e-mail: ${dadosResposta.error}`);
                    }
                  } catch (erro) {
                    console.error(`Erro ao enviar o e-mail: ${erro.message}`);
                  }
                };

                enviarEmailPortabilidade(destinatario, assunto, mensagem, anexoName, anexoFile);
                //console.log(destinatario, assunto, mensagem, anexoName, anexoFile);
            });
            $('#bntFecharconfirmarEmail').on('click', function(){  
                location.reload()
            });
        };
    }*/

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
        }/*
        if (dropdownSelecionado == "Solicitação de portabilidade") {
            corpoEmailSolicitacaoDePortabilidade();
        }*/
    });
});
