
# 🌐 Intranet Intervip - Gerência de Redes

Sistema interno de gerenciamento da Intervip Telecom, desenvolvido com foco em automação, usabilidade e integração com ferramentas operacionais da empresa.

![Intervip Banner](https://raw.githubusercontent.com/guilherme-wallace/Intranet-Intervip/main/public/images/logo.png)

## 🚀 Tecnologias Utilizadas

- **Frontend:** HTML5, Bootstrap 5, JavaScript
- **Backend:** Node.js, TypeScript, Express.js
- **Automação:** Scripts auxiliares em **Python**
- **Banco de Dados:** MySQL
- **CI/CD:** GitHub Actions

## 📦 Funcionalidades Principais

🔍 Consulta de Planos  
👥 Clientes On-line  
✅ Cadastro de Viabilidade  
🧪 Teste de Lentidão  
🔒 Problemas com VPN  
🌐 Problemas em Sites/APP  
📞 Pedidos e Problemas com Linhas Telefônicas  
📧 NOC – E-mails, Migração de ONUs, Cadastro de Blocos  
📝 Observações do Dia (registradas e exibidas automaticamente)

## ⚙️ Como Rodar Localmente

```bash
# Instale as dependências e compile o projeto
npm install
npm run-script build

# Inicie o servidor
npm start
```

🔊 O servidor escutará na porta `localhost:8080` por padrão.

> Certifique-se de que o banco de dados MySQL esteja configurado corretamente e as variáveis de ambiente estejam definidas.

## 📂 Estrutura do Projeto

```plaintext
├── app.ts                 # Arquivo principal Node.js (servidor)
├── views/                 # Arquivos HTML (ex: index.html e main.html)
├── public/
│   ├── stylesheets/       # Estilos customizados (CSS)
│   ├── javascripts/       # Scripts JS
│   ├── images/            # Logos, ícones, favicons
│   └── scripts/           # Scripts Python de automação
```

## 🐍 Scripts Python

Scripts auxiliares em Python automatizam tarefas como:

- Migração de ONUs em OLTs Huawei
- Geração e execução de comandos em lote
- Extração de informações e logs

## 🛡 Segurança e Controle

- Acesso autenticado por sessão, usando LDAP
- Informações do usuário e grupo exibidas no cabeçalho
- Área restrita de administração (NOC)
- Histórico e logs de ações

## 👨‍💻 Autor

Desenvolvido por [Guilherme Wallace](https://github.com/guilherme-wallace)  
Projeto em produção interna na Intervip Telecom.
