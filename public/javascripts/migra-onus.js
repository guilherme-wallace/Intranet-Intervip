//public/javascripts/migra-onus.js

document.addEventListener('DOMContentLoaded', function() {
    initializeThemeAndUserInfo();
});

$(function() {
    $('#limparDados').on('click', cancelaCadastro);
    
    let selectedIpAntiga = "";
    let selectedIpNova = "";

    $.ajax({
        url: '/api/olts',
        method: 'GET',
        success: function(olts) {
            const $listaAntiga = $('#listaOLTAntiga');
            const $listaNova = $('#listaOLTNova');
            
            olts.forEach(function(olt) {
                const item = `<a class="dropdown-item olt-item" data-ip="${olt.ip}" style="cursor: pointer;">${olt.name}</a>`;
                $listaAntiga.append(item);
                $listaNova.append(item);
            });
        },
        error: function(err) {
            console.error("Erro ao carregar OLTs:", err);
            $('#logconsole').val("Erro ao carregar lista de OLTs do sistema.");
        }
    });

    $(document).on('click', '#listaOLTAntiga .olt-item', function() {
        const nome = $(this).text();
        const ip = $(this).data('ip');
        $('#dropOLTAntiga').text(nome);
        selectedIpAntiga = ip;
    });

    $(document).on('click', '#listaOLTNova .olt-item', function() {
        const nome = $(this).text();
        const ip = $(this).data('ip');
        $('#dropOLTNova').text(nome);
        selectedIpNova = ip;
    });

    $( "#formData" ).validate({
        debug: true,
        rules: {
            pon_ANTIGA: { required: true },
            onu_ID: { required: true },
        },
        messages: {
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
            showLoading("Executando o script, por favor, aguarde..."); 
            $('#submitButton').attr('disabled', true);
            $('#limparDados').attr('disabled', true);

            let data = {
                use_OLT_Antiga: dropOLTAntiga,
                ip_OLT_Antiga: selectedIpAntiga,
                use_OLT_Nova: dropOLTNova,
                ip_OLT_Nova: selectedIpNova,
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
                    hideLoading(); 
                    $('#logconsole').val("Script executado com sucesso!\n" + response);
                    $('#submitButton').attr('disabled', false);
                    $('#limparDados').attr('disabled', false);
                },
                error: function(xhr, status, error) {
                    hideLoading(); 
                    $('#logconsole').val("Erro ao executar o script: " + xhr.responseText);
                    $('#submitButton').attr('disabled', false);
                    $('#limparDados').attr('disabled', false);
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
        fetch('/api/autorizaONUExcecao')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar autorizaONUExcecao.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('autorizaONUExcecao_txt').value = data.autorizaONUExcecao;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('autorizaONUExcecao_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });
    document.getElementById('bntdeletaONU').addEventListener('click', function() {
        fetch('/api/ontDelete')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar ontDelete.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('ontDelete_txt').value = data.ontDelete;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('ontDelete_txt').value = 'Erro ao carregar o conteúdo.';
            });
    });
    document.getElementById('bntdeletaExcONU').addEventListener('click', function() {
        fetch('/api/ontDeleteExcecao')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar ontDeleteExcecao.txt');
                }
                return response.json();
            })
            .then(data => {
                document.getElementById('ontDeleteExcecao_txt').value = data.ontDeleteExcecao;
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

function initializeThemeAndUserInfo() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');
    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
    } else {
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
    }
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');
            const newTheme = bodyElement.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            themeToggleButton.innerHTML = newTheme === 'dark' ? '<i class="bi bi-brightness-high"></i>' : '<i class="bi bi-moon-stars"></i>';
        });
    }
    const logoutButton = document.getElementById('btnLogout');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            window.location.href = '/logout';
        });
    }
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const group = data.group || 'Sem grupo';
            if (username === 'Visitante') {
                showModal('Sessão Expirada', 'Será necessário refazer o login!', 'warning');
                setTimeout(() => { window.location = "/"; }, 300);
                return;
            }
        document.querySelectorAll('.user-info span').forEach(el => {
            if (el.textContent.includes('{username}')) el.textContent = username;
            if (el.textContent.includes('{group}')) el.textContent = group;
        });

        }).catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
}

function showLoading(texto) {
    document.getElementById('loading-text').textContent = texto;
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}