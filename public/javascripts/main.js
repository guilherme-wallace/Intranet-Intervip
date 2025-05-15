document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle script
    const currentTheme = localStorage.getItem('theme') || 'light';
    const bodyElement = document.querySelector('body');
    const themeToggleButton = document.getElementById('theme-toggle');

    if (currentTheme === 'dark') {
        bodyElement.classList.add('dark-mode');
        if(themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
    } else {
        if(themeToggleButton) themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
    }

    if(themeToggleButton) {
        themeToggleButton.addEventListener('click', function() {
            bodyElement.classList.toggle('dark-mode');
            if (bodyElement.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                themeToggleButton.innerHTML = '<i class="bi bi-brightness-high"></i>';
            } else {
                localStorage.setItem('theme', 'light');
                themeToggleButton.innerHTML = '<i class="bi bi-moon-stars"></i>';
            }
        });
    }
    
    // User Info
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const username = data.username || 'Visitante';
            const group = data.group || 'Sem grupo';
            
            document.querySelectorAll('.user-info span').forEach(el => {
                if (el.textContent.includes('{username}')) {
                    el.textContent = username;
                }
                if (el.textContent.includes('{group}')) {
                    el.textContent = group;
                }
            });
            
            if (username === 'Visitante') {
                alert('Será necessário refazer o login!');
                window.location = "/";
            }
        })
        .catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
    
    // Observações
    const observacoesField = document.getElementById('observacoes');
    const salvarButton = document.getElementById('salvarObservacoes');
    const msgSalvo = document.getElementById('msgSalvo');
    const msgErro = document.getElementById('msgErro');
    
    function carregarObservacoes() {
        fetch('/api/observacoes')
            .then(response => response.json())
            .then(data => {
                observacoesField.value = data.observacoes || '';
            })
            .catch(error => {
                console.error('Erro ao carregar observações:', error);
            });
    }
    
    function salvarObservacoes() {
        const observacoes = observacoesField.value;
        
        fetch('/api/salvar-observacoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ observacoes })
        })
        .then(response => {
            if (response.ok) {
                msgSalvo.style.display = 'block';
                msgErro.style.display = 'none';
                setTimeout(() => { msgSalvo.style.display = 'none'; }, 3000);
            } else {
                throw new Error('Erro ao salvar');
            }
        })
        .catch(error => {
            console.error('Erro ao salvar observações:', error);
            msgSalvo.style.display = 'none';
            msgErro.style.display = 'block';
            setTimeout(() => { msgErro.style.display = 'none'; }, 3000);
        });
    }
    
    fetch('/api/username')
        .then(response => response.json())
        .then(data => {
            const group = data.group || 'Sem grupo';
            const allowedGroups = ['NOC', 'Logistica', 'Fibra'];
            
            if (allowedGroups.includes(group)) {
                observacoesField.addEventListener('mouseenter', () => {
                    observacoesField.removeAttribute('disabled');
                    salvarButton.style.display = 'inline-block';
                });
                
                observacoesField.addEventListener('mouseleave', () => {
                    setTimeout(() => { salvarButton.style.display = 'none'; }, 3000);
                    observacoesField.setAttribute("disabled", "");
                });
                
                salvarButton.addEventListener('click', salvarObservacoes);
            }
            
            carregarObservacoes();
        })
        .catch(error => {
            console.error('Erro ao obter o nome do usuário e grupo:', error);
        });
    
    // Add hover effect to cards
    const cards = document.querySelectorAll('.modern-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            if (mainElement.classList.contains('dark-mode')) {
                card.style.boxShadow = '0 10px 15px rgba(240, 240, 240, 0.5)';
                card.style.border = '1px solid rgba(240, 240, 240, 0.1)';
            } else {
                card.style.boxShadow = '0 10px 15px rgba(0, 0, 0, 0.7)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
            card.style.boxShadow = '';
            card.style.border = '';
        });
    });
});