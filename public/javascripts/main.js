// Configuração do marked.js
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
        const validLang = ['javascript', 'python', 'bash'].includes(lang) ? lang : 'plaintext';
        return hljs.highlight(validLang, code).value;
    }
});

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

        const escalaSobreAvisoField = document.getElementById('escalaSobreAviso');
        const salvarEscalaButton = document.getElementById('salvarEscalaSobreAviso');
        const msgSalvoEscala = document.getElementById('msgSalvoEscala');
        const msgErroEscala = document.getElementById('msgErroEscala');

        const localEmFalhaField = document.getElementById('localEmFalha');
        const salvarLocalButton = document.getElementById('salvarLocalEmFalha');
        const msgSalvoLocal = document.getElementById('msgSalvoLocal');
        const msgErroLocal = document.getElementById('msgErroLocal');

        // Função para alternar entre o modo de edição e visualização do Markdown
        function toggleMarkdownView(textareaId, previewId, button) {
            const textarea = document.getElementById(textareaId);
            const preview = document.getElementById(previewId);
            
            if (textarea.style.display === 'none') {
                // Mostra o textarea e esconde o preview
                textarea.style.display = 'block';
                preview.style.display = 'none';
                button.innerHTML = '<i class="bi bi-eye"></i> Visualizar';
                textarea.focus();
            } else {
                // Mostra o preview e esconde o textarea
                textarea.style.display = 'none';
                preview.style.display = 'block';
                preview.innerHTML = marked.parse(textarea.value);
                button.innerHTML = '<i class="bi bi-pencil"></i> Editar';
                
                // Aplica highlight.js para códigos
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        }
        // Função para renderizar o preview do Markdown
        function renderMarkdownPreview(textareaId, previewId, buttonId) {
            const textarea = document.getElementById(textareaId);
            const preview = document.getElementById(previewId);
            const button = document.getElementById(buttonId);
            
            if (!textarea || !preview || !button) return;
            
            // Configura o evento de clique no botão
            button.addEventListener('click', function() {
                toggleMarkdownView(textareaId, previewId, button);
            });
            
            // Renderiza o Markdown inicial
            preview.innerHTML = marked.parse(textarea.value);
        }

        // Carrega os dados iniciais
        function carregarDados() {
            // Carrega Observações
            fetch('/api/observacoes')
                .then(response => response.json())
                .then(data => {
                    observacoesField.value = data.observacoes || '';
                    // Configura o preview inicial
                    renderMarkdownPreview('observacoes', 'observacoes-preview', 'toggleObservacoes');
                    // Inicia mostrando o preview
                    document.getElementById('observacoes').style.display = 'none';
                    document.getElementById('observacoes-preview').style.display = 'block';
                    document.getElementById('toggleObservacoes').innerHTML = '<i class="bi bi-pencil"></i> Editar';
                })
                .catch(error => {
                    console.error('Erro ao carregar observações:', error);
                });
            
            // Carrega Escala sobre Aviso
            fetch('/api/escalaSobreAviso')
                .then(response => response.json())
                .then(data => {
                    escalaSobreAvisoField.value = data.escalaSobreAviso || '';
                    renderMarkdownPreview('escalaSobreAviso', 'escala-preview', 'toggleEscala');
                    document.getElementById('escalaSobreAviso').style.display = 'none';
                    document.getElementById('escala-preview').style.display = 'block';
                    document.getElementById('toggleEscala').innerHTML = '<i class="bi bi-pencil"></i> Editar';
                })
                .catch(error => {
                    console.error('Erro ao carregar escala sobre aviso:', error);
                });
            
            // Carrega Locais em Falha
            fetch('/api/localEmFalha')
                .then(response => response.json())
                .then(data => {
                    localEmFalhaField.value = data.localEmFalha || '';
                    renderMarkdownPreview('localEmFalha', 'local-preview', 'toggleLocal');
                    document.getElementById('localEmFalha').style.display = 'none';
                    document.getElementById('local-preview').style.display = 'block';
                    document.getElementById('toggleLocal').innerHTML = '<i class="bi bi-pencil"></i> Editar';
                })
                .catch(error => {
                    console.error('Erro ao carregar locais em falha:', error);
                });
        }

        function salvarObservacoes() {
            // Garante formatação Markdown básica se não tiver
            let observacoes = observacoesField.value;
            if (!observacoes.startsWith('# ')) {
                observacoes = '' + observacoes;
            }
            
            fetch('/api/salvar-observacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ observacoes })
            })
            .then(response => {
                if (response.ok) {
                    // Atualiza o preview após salvar
                    document.getElementById('observacoes-preview').innerHTML = marked.parse(observacoes);
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

        function salvarEscalaSobreAviso() {
            let escalaSobreAviso = escalaSobreAvisoField.value;
            if (!escalaSobreAviso.startsWith('# ')) {
                escalaSobreAviso = '' + escalaSobreAviso;
            }
            
            fetch('/api/salvar-escalaSobreAviso', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ escalaSobreAviso })
            })
            .then(response => {
                if (response.ok) {
                    // Atualiza o preview após salvar
                    document.getElementById('escala-preview').innerHTML = marked.parse(escalaSobreAviso);
                    msgSalvoEscala.style.display = 'block';
                    msgErroEscala.style.display = 'none';
                    setTimeout(() => { msgSalvoEscala.style.display = 'none'; }, 3000);
                } else {
                    throw new Error('Erro ao salvar');
                }
            })
            .catch(error => {
                console.error('Erro ao salvar escala sobre aviso:', error);
                msgSalvoEscala.style.display = 'none';
                msgErroEscala.style.display = 'block';
                setTimeout(() => { msgErroEscala.style.display = 'none'; }, 3000);
            });
        }

        function salvarLocalEmFalha() {
            let localEmFalha = localEmFalhaField.value;
            if (!localEmFalha.startsWith('# ')) {
                localEmFalha = '' + localEmFalha;
            }
            
            fetch('/api/salvar-localEmFalha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ localEmFalha })
            })
            .then(response => {
                if (response.ok) {
                    // Atualiza o preview após salvar
                    document.getElementById('local-preview').innerHTML = marked.parse(localEmFalha);
                    msgSalvoLocal.style.display = 'block';
                    msgErroLocal.style.display = 'none';
                    setTimeout(() => { msgSalvoLocal.style.display = 'none'; }, 3000);
                } else {
                    throw new Error('Erro ao salvar');
                }
            })
            .catch(error => {
                console.error('Erro ao salvar locais em falha:', error);
                msgSalvoLocal.style.display = 'none';
                msgErroLocal.style.display = 'block';
                setTimeout(() => { msgErroLocal.style.display = 'none'; }, 3000);
            });
        }

        fetch('/api/username')
            .then(response => response.json())
            .then(data => {
                const group = data.group || 'Sem grupo';
                const allowedGroups = ['NOC', 'Logistica', 'Fibra'];
                
                if (allowedGroups.includes(group)) {
                    // Configura eventos para Observações
                    observacoesField.addEventListener('mouseenter', () => {
                        observacoesField.removeAttribute('disabled');
                        salvarButton.style.display = 'inline-block';
                        document.getElementById('toggleObservacoes').style.display = 'inline-block';
                    });
                    
                    observacoesField.addEventListener('mouseleave', () => {
                        setTimeout(() => { 
                            if (observacoesField.style.display !== 'none') {
                                salvarButton.style.display = 'none';
                                document.getElementById('toggleObservacoes').style.display = 'none';
                                observacoesField.setAttribute("disabled", "");
                            }
                        }, 6000);
                    });
                    
                    salvarButton.addEventListener('click', salvarObservacoes);
                    
                    // Configura eventos para Escala sobre Aviso
                    escalaSobreAvisoField.addEventListener('mouseenter', () => {
                        escalaSobreAvisoField.removeAttribute('disabled');
                        salvarEscalaButton.style.display = 'inline-block';
                        document.getElementById('toggleEscala').style.display = 'inline-block';
                    });
                    
                    escalaSobreAvisoField.addEventListener('mouseleave', () => {
                        setTimeout(() => { 
                            if (escalaSobreAvisoField.style.display !== 'none') {
                                salvarEscalaButton.style.display = 'none';
                                document.getElementById('toggleEscala').style.display = 'none';
                                escalaSobreAvisoField.setAttribute("disabled", "");
                            }
                        }, 6000);
                    });
                    
                    salvarEscalaButton.addEventListener('click', salvarEscalaSobreAviso);
                    
                    // Configura eventos para Locais em Falha
                    localEmFalhaField.addEventListener('mouseenter', () => {
                        localEmFalhaField.removeAttribute('disabled');
                        salvarLocalButton.style.display = 'inline-block';
                        document.getElementById('toggleLocal').style.display = 'inline-block';
                    });
                    
                    localEmFalhaField.addEventListener('mouseleave', () => {
                        setTimeout(() => { 
                            if (localEmFalhaField.style.display !== 'none') {
                                salvarLocalButton.style.display = 'none';
                                document.getElementById('toggleLocal').style.display = 'none';
                                localEmFalhaField.setAttribute("disabled", "");
                            }
                        }, 6000);
                    });
                    
                    salvarLocalButton.addEventListener('click', salvarLocalEmFalha);
                }
                
                carregarDados();
            })
            .catch(error => {
                console.error('Erro ao obter o nome do usuário e grupo:', error);
            });
    
    // Add hover effect to cards
    const cards = document.querySelectorAll('.modern-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            if (bodyElement.classList.contains('dark-mode')) {
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

    function atualizarDados() {
        // Atualiza usuário e grupo primeiro
        fetch('/api/username')
            .then(response => response.json())
            .then(data => {
                document.querySelectorAll('.user-info span').forEach(el => {
                    if (el.textContent.includes('{username}')) {
                        el.textContent = data.username || 'Visitante';
                    }
                    if (el.textContent.includes('{group}')) {
                        el.textContent = data.group || 'Sem grupo';
                    }
                });
            })
            .catch(error => {
                console.error('Erro ao atualizar dados do usuário:', error);
            });

        // Atualiza Observações
        fetch('/api/observacoes')
            .then(response => response.json())
            .then(data => {
                observacoesField.value = data.observacoes || '';
                document.getElementById('observacoes-preview').innerHTML = marked.parse(observacoesField.value);
            })
            .catch(error => {
                console.error('Erro ao atualizar observações:', error);
            });

        // Atualiza Escala sobre Aviso
        fetch('/api/escalaSobreAviso')
            .then(response => response.json())
            .then(data => {
                escalaSobreAvisoField.value = data.escalaSobreAviso || '';
                document.getElementById('escala-preview').innerHTML = marked.parse(escalaSobreAvisoField.value);
            })
            .catch(error => {
                console.error('Erro ao atualizar escala sobre aviso:', error);
            });

        // Atualiza Locais em Falha
        fetch('/api/localEmFalha')
            .then(response => response.json())
            .then(data => {
                localEmFalhaField.value = data.localEmFalha || '';
                document.getElementById('local-preview').innerHTML = marked.parse(localEmFalhaField.value);
            })
            .catch(error => {
                console.error('Erro ao atualizar locais em falha:', error);
            });
    }

    // Executa a cada 1 minutos (60000 milissegundos)
    setInterval(atualizarDados, 60000);

    // Executa imediatamente ao carregar
    atualizarDados();

});