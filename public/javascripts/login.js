$(document).ready(function() {
    $('#login-form').submit(function(event) {
        event.preventDefault();  // Evita o envio padrão do formulário

        var username = $('#username').val().trim();
        var password = $('#password').val().trim();

        if (!username || !password) {
            $('#error-message').text('Por favor, preencha ambos os campos.').show();
            return;
        }

        // Enviar os dados para o backend (autenticação via AD)
        $.ajax({
            url: '/login',
            method: 'POST',
            data: {
                username: username,
                password: password
            },
            success: function(response) {
                if (response.success) {
                    window.location.href = 'main';  // Redireciona para a página principal
                } else {
                    $('#error-message').text(response.message).show();
                }
            },
            error: function() {
                $('#error-message').text('Erro no servidor. Tente novamente.').show();
            }
        });
    });
});

