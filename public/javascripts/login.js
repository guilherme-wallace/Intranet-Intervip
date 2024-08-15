$(document).ready(function() {
    $('#login-form').submit(function(event) {
        event.preventDefault();

        var username = $('#username').val();
        var password = $('#password').val();

        // Aqui você pode adicionar a lógica para verificar o login no servidor Node.js

        // Exemplo simples de verificação (não seguro)
        if (password === 'intervipwifi') {
            // Simulação de redirecionamento após o login bem-sucedido
            window.location.href = 'main';
        } else {
            $('#error-message').text('Credenciais inválidas. Tente novamente.');
        }
    });
});