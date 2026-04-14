document.addEventListener('DOMContentLoaded', () => {
    initializeThemeAndUserInfo();
    
    const lgForm = document.getElementById('lgForm');
    const resultOutput = document.getElementById('lgResultOutput');
    const typeSelect = document.getElementById('consultaType');
    const targetInput = document.getElementById('targetIp');

    if (!lgForm || !resultOutput || !typeSelect || !targetInput) return;

    typeSelect.addEventListener('change', () => {
        const val = typeSelect.value;
        if (val === 'bgp') {
            targetInput.placeholder = 'Ex: 8.8.8.0/24';
        } else if (val === 'bgp6') {
            targetInput.placeholder = 'Ex: 2001:4860:4860::/64';
        } else if (val === 'ping' || val === 'trace') {
            targetInput.placeholder = 'Ex: 8.8.8.8';
        } else {
            targetInput.placeholder = 'Ex: 2001:4860:4860::8888';
        }
        targetInput.value = '';
        targetInput.classList.remove('is-invalid');
    });

    targetInput.addEventListener('input', function() {
        const type = typeSelect.value;
        let currentVal = this.value;

        if (type === 'bgp') {
            currentVal = currentVal.replace(/[^0-9.\/]/g, '');
            const parts = currentVal.split('/');
            if (parts.length > 2) currentVal = parts[0] + '/' + parts.slice(1).join('').replace(/\//g, '');
            
        } else if (type === 'bgp6') {
            currentVal = currentVal.replace(/[^0-9a-fA-F:\/]/g, '');
            const parts = currentVal.split('/');
            if (parts.length > 2) currentVal = parts[0] + '/' + parts.slice(1).join('').replace(/\//g, '');

        } else if (type === 'ping' || type === 'trace') {
            currentVal = currentVal.replace(/[^0-9.]/g, '');
            
        } else if (type === 'ping6' || type === 'trace6') {
            currentVal = currentVal.replace(/[^0-9a-fA-F:]/g, '');
        }

        if (this.value !== currentVal) {
            this.value = currentVal;
        }
    });

    lgForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(lgForm);
        const requestData = {
            type: formData.get('type'),
            target: formData.get('target').trim(),
            router: formData.get('router')
        };

        let isValid = true;
        let errorMessage = '';

        const regexIPv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const regexIPv4CIDR = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
        const regexIPv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        const regexIPv6CIDR = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))\/(12[0-8]|1[0-1][0-9]|[1-9]?[0-9]|0)$/;

        if (requestData.type === 'bgp') {
            if (!regexIPv4CIDR.test(requestData.target)) {
                isValid = false;
                errorMessage = 'Para BGP IPv4, informe IP e máscara corretos (Ex: 8.8.8.0/24).';
            }
        } else if (requestData.type === 'bgp6') {
            if (!regexIPv6CIDR.test(requestData.target)) {
                isValid = false;
                errorMessage = 'Para BGP IPv6, informe IP e máscara corretos (Ex: 2001:4860:4860::/64).';
            }
        } else if (requestData.type === 'ping' || requestData.type === 'trace') {
            if (!regexIPv4.test(requestData.target)) {
                isValid = false;
                errorMessage = 'Endereço IPv4 inválido (Não use máscara para Ping/Trace).';
            }
        } else if (requestData.type === 'ping6' || requestData.type === 'trace6') {
            if (!regexIPv6.test(requestData.target)) {
                isValid = false;
                errorMessage = 'Endereço IPv6 inválido (Não use máscara para Ping/Trace).';
            }
        }

        if (!isValid) {
            targetInput.classList.add('is-invalid');
            resultOutput.textContent = `Erro de Formatação: ${errorMessage}`;
            resultOutput.classList.add('text-danger');
            return; 
        }

        targetInput.classList.remove('is-invalid');
        
        resultOutput.textContent = `Consultando ${requestData.type.toUpperCase()} para ${requestData.target} no roteador ${requestData.router}...\nPor favor aguarde, isso pode levar alguns segundos.`;
        resultOutput.classList.remove('text-danger');

        try {
            const submitBtn = lgForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Executando...';

            const response = await fetch('/api/v5/looking-glass/consultar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                resultOutput.textContent = data.output;
            } else {
                resultOutput.textContent = `Erro na consulta: ${data.message || data.error || 'Erro desconhecido.'}`;
                resultOutput.classList.add('text-danger');
            }

            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Executar Consulta';

        } catch (error) {
            console.error('Erro na requisição LG:', error);
            resultOutput.textContent = 'Erro ao conectar com a API da Intranet. Tente novamente mais tarde.';
            resultOutput.classList.add('text-danger');
            
            const submitBtn = lgForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Executar Consulta';
        }
    });
});

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
                alert('Sessão Expirada! Será necessário refazer o login!');
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