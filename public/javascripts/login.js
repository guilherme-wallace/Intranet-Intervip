$(document).ready(function() {
    $('#login-form').submit(function(event) {
        event.preventDefault();
        
        // Reset error message
        $('#error-message').hide().text('');
        
        const username = $('#username').val().trim();
        const password = $('#password').val().trim();
        
        // Validação
        if (!username || !password) {
            showError('Por favor, preencha ambos os campos.');
            return;
        }
        
        // Animação de loading
        const loginButton = $(this).find('button[type="submit"]');
        loginButton.prop('disabled', true);
        loginButton.html('<i class="fas fa-spinner fa-spin"></i>');
        
        // Enviar dados para o backend
        $.ajax({
            url: '/login',
            method: 'POST',
            data: {
                username: username,
                password: password
            },
            success: function(response) {
                if (response.success) {
                    // Animação de sucesso antes do redirecionamento
                    loginButton.html('<i class="fas fa-check"></i>');
                    setTimeout(() => {
                        window.location.href = 'main';
                    }, 800);
                } else {
                    showError(response.message || 'Credenciais inválidas.');
                    resetLoginButton(loginButton);
                }
            },
            error: function(xhr) {
                const errorMsg = xhr.responseJSON && xhr.responseJSON.message 
                    ? xhr.responseJSON.message 
                    : 'Erro no servidor. Tente novamente.';
                showError(errorMsg);
                resetLoginButton(loginButton);
            }
        });
    });
    
    function showError(message) {
        const errorElement = $('#error-message');
        errorElement.text(message).fadeIn();
        
        // Adiciona animação de shake no formulário
        $('.login-card').css('animation', 'shake 0.5s');
        setTimeout(() => {
            $('.login-card').css('animation', '');
        }, 500);
    }
    
    function resetLoginButton(button) {
        setTimeout(() => {
            button.prop('disabled', false);
            button.html('<span class="button-text">Entrar</span><i class="fas fa-arrow-right button-icon"></i>');
        }, 1000);
    }
});

// Adiciona animação de shake
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);