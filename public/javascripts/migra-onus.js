$(function() {
    $('#dropOLTAntiga a').on('click', function() {
        switch ($(this).text()) {
            case 'SEA01-OLT-01-INTERVIP':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'SEA03-OLT-01-VNC':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'SEA04-OLT-01-LAR':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'VTA01-OLT-01-NEWPORT':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'VTA02-OLT-01-JDCB':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'VVA01-OLT-01-WLTS':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'VVA03-OLT-01-ARIB':
                $('#dropOLTAntiga').text($(this).text());
                break;
            case 'CCA01-OLT-01-VCGB':
                $('#dropOLTAntiga').text($(this).text());
                break;
        }
    });
    $('#dropOLTNova a').on('click', function() {
        switch ($(this).text()) {
            case 'SEA01-OLT-01-INTERVIP':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'SEA03-OLT-01-VNC':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'SEA04-OLT-01-LAR':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'VTA01-OLT-01-NEWPORT':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'VTA02-OLT-01-JDCB':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'VVA01-OLT-01-WLTS':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'VVA03-OLT-01-ARIB':
                $('#dropOLTNova').text($(this).text());
                break;
            case 'CCA01-OLT-01-VCGB':
                $('#dropOLTNova').text($(this).text());
                break;
        }
    });
    $( "#formData" ).validate({
        debug: true,
        rules: {
            dropOLTAntiga: {
                required: true
            },
            dropOLTNova: {
                required: true
            },
            pon_ANTIGA: {
                required: true
            },
            onu_ID: {
                required: true
            },
        },
        messages: {
            dropOLTAntiga: 'Preenchimento inválido',
            dropOLTNova: 'Preenchimento inválido',
            pon_ANTIGA: 'Preenchimento inválido',
            onu_ID: 'Preenchimento inválido'
        }
    });
    
    $('#formData').on('submit', function(e) {
        e.preventDefault();
    
        let dropOLTAntiga = $('#dropOLTAntiga').text();
        let dropOLTNova = $('#dropOLTNova').text();
        let pon_ANTIGA = $('#pon_ANTIGA').val();
        let onu_ID = $('#onu_ID').val();
    
        if ((dropOLTAntiga == "Selecione uma opção") || (dropOLTNova == "Selecione uma opção") || (pon_ANTIGA == "") || (onu_ID == "")) {
            $('#logconsole').val("Favor verificar se os campos foram preenchidos corretamente!");
        } else {
            $('#logconsole').val("Executando o script, por favor, aguarde...");
            $('#submitButton').attr('disabled', true)
            $('#limparDados').attr('disabled', true)

    
            let data = {
                use_OLT_Antiga: dropOLTAntiga,
                use_OLT_Nova: dropOLTNova,
                pon_ANTIGA: pon_ANTIGA,
                onu_ID: onu_ID,
                ont_LIN_PROF: $('#ont_LIN_PROF').val() || null,
                ont_SRV_PROF: $('#ont_SRV_PROF').val() || null,
                ont_native_vlan: $('#ont_native_vlan').val() || null,
                ont_vlan_service_port: $('#ont_vlan_service_port').val() || null,
                ont_gem_PORT: $('#ont_gem_PORT').val() || null,
                ont_user_vlan: $('#ont_user_vlan').val() || null
            };
    
            $.ajax({
                url: '/api/run-olt-script',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function(response) {
                    $('#logconsole').val("Script executado com sucesso!\n" + response);
                    $('#submitButton').attr('disabled', false)
                    $('#limparDados').attr('disabled', false)
                },
                error: function(xhr, status, error) {
                    $('#logconsole').val("Erro ao executar o script: " + xhr.responseText);
                    $('#submitButton').attr('disabled', false)
                    $('#limparDados').attr('disabled', false)
                }
            });
        }
    });

    document.getElementById('bntautorizaONU').addEventListener('click', function() {
        fetch('/api/autorizaONU')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar autorizaONU.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('autorizaONU_txt').value = data.autorizaONU;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('autorizaONU_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });

    document.getElementById('bntautorizaExcONU').addEventListener('click', function() {
        fetch('/api/autorizaONU')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar autorizaONU.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('autorizaONUExcecao_txt').value = data.autorizaONU;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('autorizaONUExcecao_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });
    document.getElementById('bntdeletaONU').addEventListener('click', function() {
        fetch('/api/autorizaONU')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar autorizaONU.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('ontDelete_txt').value = data.autorizaONU;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('ontDelete_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });
    document.getElementById('bntdeletaExcONU').addEventListener('click', function() {
        fetch('/api/autorizaONU')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar autorizaONU.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('ontDeleteExcecao_txt').value = data.autorizaONU;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('ontDeleteExcecao_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });
});
function cancelaCadastro() {
    location.reload()
    localStorage.clear();
}
