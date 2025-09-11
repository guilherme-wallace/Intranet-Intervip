"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Favicon = require("serve-favicon");
var Express = require("express");
var Path = require("path");
var fs = require("fs");
var index_1 = require("./routes/index");
var index_2 = require("./routes/api/index");
var emailRoutes_1 = require("./src/routes/emailRoutes");
var scriptAddCondominiumsBDRoute_1 = require("./src/routes/scriptAddCondominiumsBDRoute");
var scriptmigraOnusRoute_1 = require("./src/routes/scriptmigraOnusRoute");
var express = require("express");
var bodyParser = require("body-parser");
var ActiveDirectory = require("activedirectory2");
var session = require("express-session");
var loginConfig_1 = require("./src/configs/loginConfig");
var APP = Express();
require('express-file-logger')(APP, {
    basePath: 'logs',
    fileName: 'access.log',
    showOnConsole: false
});
APP.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Definir true se estiver usando HTTPS
}));
// Configurações do Active Directory
var config = {
    url: loginConfig_1.config_login.url,
    baseDN: loginConfig_1.config_login.baseDN,
    username: loginConfig_1.config_login.username,
    password: loginConfig_1.config_login.password // Senha do administrador
};
// Criar instância do Active Directory
var ad = new ActiveDirectory(config);
APP.use(bodyParser.json());
APP.use(bodyParser.urlencoded({ extended: true }));
// Endpoint de login
APP.post('/login', function (req, res) {
    var _a = req.body, username = _a.username, password = _a.password;
    var userPrincipalName = "".concat(username, "@ivp.net.br"); // domínio
    ad.authenticate(userPrincipalName, password, function (err, auth) {
        if (err) {
            //console.error('Erro de autenticação:', err);
            return res.json({ success: false, message: 'Erro de autenticação' });
        }
        if (auth) {
            //console.log('Usuário autenticado com sucesso');
            // Salva o nome de usuário na sessão
            req.session.username = username;
            // Obtem grupos do usuário
            ad.findUser(userPrincipalName, function (err, user) {
                if (err) {
                    //console.error('Erro ao encontrar usuário:', err);
                    return res.json({ success: false, message: 'Erro ao obter detalhes do usuário' });
                }
                if (!user) {
                    //console.error('Usuário não encontrado');
                    return res.json({ success: false, message: 'Usuário não encontrado' });
                }
                //console.log('grupos: ', user.distinguishedName);
                var textUserGroup = user.distinguishedName;
                // Correção da regex para capturar o nome do grupo corretamente
                var userGroupRegex = new RegExp('OU=([^,]+)');
                var userGroup = userGroupRegex.exec(textUserGroup);
                if (userGroup && userGroup[1]) {
                    //console.log("Regex: ", userGroup[1]);
                    if (userGroup[1] === 'Helpdesk') {
                        userGroup[1] = 'CRI';
                    }
                    // Salvar o grupo do usuário na sessão
                    req.session.group = userGroup[1];
                }
                else {
                    //console.log('Nenhum grupo encontrado para o usuário');
                    req.session.group = 'Sem grupo';
                }
                res.json({ success: true });
            });
        }
        else {
            //console.log('Falha na autenticação');
            res.json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});
APP.get('/api/username', function (req, res) {
    var username = req.session.username || 'Visitante';
    var group = req.session.group || 'Sem grupo';
    res.json({ username: username, group: group });
});
// ---- Observações
var initializeMarkdownFiles = function () {
    var files = [
        { path: observacoesPath, defaultContent: '' },
        { path: escalaSobreAvisoPath, defaultContent: '' },
        { path: localEmFalhaPath, defaultContent: '' }
    ];
    files.forEach(function (file) {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, file.defaultContent, 'utf8');
            console.log("Arquivo ".concat(file.path, " criado com sucesso."));
        }
    });
};
var observacoesPath = Path.join(__dirname, 'public/savedFiles/observacoes.md');
// ---- Observações
APP.get('/api/observacoes', function (req, res) {
    fs.readFile(observacoesPath, 'utf8', function (err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                var defaultContent_1 = '';
                fs.writeFile(observacoesPath, defaultContent_1, 'utf8', function (err) {
                    if (err) {
                        console.error('Erro ao criar arquivo de observações:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ observacoes: defaultContent_1 });
                });
            }
            else {
                console.error('Erro ao ler o arquivo de observações:', err);
                return res.status(500).json({ error: 'Erro ao carregar observações' });
            }
        }
        else {
            // Verifica se já tem formatação Markdown básica
            var content = data;
            if (!content.startsWith('#') && content.trim() !== '') {
                content = "".concat(content);
            }
            res.json({ observacoes: content });
        }
    });
});
APP.post('/api/salvar-observacoes', function (req, res) {
    var observacoes = req.body.observacoes;
    if (observacoes) {
        var contentToSave = observacoes;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(observacoesPath, contentToSave, 'utf8', function (err) {
            if (err) {
                console.error('Erro ao salvar as observações:', err);
                return res.status(500).send('Erro ao salvar observações');
            }
            res.status(200).send('Observações salvas com sucesso');
        });
    }
    else {
        res.status(400).send('Observações inválidas');
    }
});
// --- Escala sobre Aviso
var escalaSobreAvisoPath = Path.join(__dirname, 'public/savedFiles/escalaSobreAviso.md');
APP.get('/api/escalaSobreAviso', function (req, res) {
    fs.readFile(escalaSobreAvisoPath, 'utf8', function (err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                var defaultContent_2 = '';
                fs.writeFile(escalaSobreAvisoPath, defaultContent_2, 'utf8', function (err) {
                    if (err) {
                        console.error('Erro ao criar arquivo de escalaSobreAviso:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ escalaSobreAviso: defaultContent_2 });
                });
            }
            else {
                console.error('Erro ao ler o arquivo de escalaSobreAviso:', err);
                return res.status(500).json({ error: 'Erro ao carregar escalaSobreAviso' });
            }
        }
        else {
            res.json({ escalaSobreAviso: data });
        }
    });
});
APP.post('/api/salvar-escalaSobreAviso', function (req, res) {
    var escalaSobreAviso = req.body.escalaSobreAviso;
    if (escalaSobreAviso) {
        var contentToSave = escalaSobreAviso;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(escalaSobreAvisoPath, contentToSave, 'utf8', function (err) {
            if (err) {
                console.error('Erro ao salvar as EscalaSobreAviso:', err);
                return res.status(500).send('Erro ao salvar EscalaSobreAviso');
            }
            res.status(200).send('EscalaSobreAviso salvas com sucesso');
        });
    }
    else {
        res.status(400).send('EscalaSobreAviso inválidas');
    }
});
// -- Localidades em Falha.
var localEmFalhaPath = Path.join(__dirname, 'public/savedFiles/localEmFalha.md');
APP.get('/api/localEmFalha', function (req, res) {
    fs.readFile(localEmFalhaPath, 'utf8', function (err, data) {
        if (err) {
            if (err.code === 'ENOENT') {
                var defaultContent_3 = '';
                fs.writeFile(localEmFalhaPath, defaultContent_3, 'utf8', function (err) {
                    if (err) {
                        console.error('Erro ao criar arquivo de localEmFalha:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ localEmFalha: defaultContent_3 });
                });
            }
            else {
                console.error('Erro ao ler o arquivo de localEmFalha:', err);
                return res.status(500).json({ error: 'Erro ao carregar localEmFalha' });
            }
        }
        else {
            res.json({ localEmFalha: data });
        }
    });
});
APP.post('/api/salvar-localEmFalha', function (req, res) {
    var localEmFalha = req.body.localEmFalha;
    if (localEmFalha) {
        var contentToSave = localEmFalha;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(localEmFalhaPath, contentToSave, 'utf8', function (err) {
            if (err) {
                console.error('Erro ao salvar as localEmFalha:', err);
                return res.status(500).send('Erro ao salvar localEmFalha');
            }
            res.status(200).send('localEmFalha salvas com sucesso');
        });
    }
    else {
        res.status(400).send('localEmFalha inválidas');
    }
});
// --- Migra PON
var autorizaONUPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/autorizaONU.txt');
APP.get('/api/autorizaONU', function (req, res) {
    fs.readFile(autorizaONUPath, 'utf8', function (err, data) {
        if (err) {
            console.error('Erro ao ler o arquivo de autorizaONU.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar autorizaONU.txt' });
        }
        res.json({ autorizaONU: data });
    });
});
var autorizaONUExcecaoPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/autorizaONUExcecao.txt');
APP.get('/api/autorizaONUExcecao', function (req, res) {
    fs.readFile(autorizaONUExcecaoPath, 'utf8', function (err, data) {
        if (err) {
            console.error('Erro ao ler o arquivo de autorizaONUExcecao.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar autorizaONUExcecao.txt' });
        }
        res.json({ autorizaONUExcecao: data });
    });
});
var ontDeletePath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/ontDelete.txt');
APP.get('/api/ontDelete', function (req, res) {
    fs.readFile(ontDeletePath, 'utf8', function (err, data) {
        if (err) {
            console.error('Erro ao ler o arquivo de ontDelete.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar ontDelete.txt' });
        }
        res.json({ ontDelete: data });
    });
});
var ontDeleteExcecaoPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/ontDeleteExcecao.txt');
APP.get('/api/ontDeleteExcecao', function (req, res) {
    fs.readFile(ontDeleteExcecaoPath, 'utf8', function (err, data) {
        if (err) {
            console.error('Erro ao ler o arquivo de ontDeleteExcecao.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar ontDeleteExcecao.txt' });
        }
        res.json({ ontDeleteExcecao: data });
    });
});
//hakai
APP.use(express.json());
APP.use(express.static(Path.join(__dirname, 'public')));
APP.post('/hakai', function (req, res) {
    var filesToHakai = [
        Path.join(__dirname, 'public/javascripts/cadastro-de-blocos.js'),
        Path.join(__dirname, 'public/javascripts/cadastro-de-vendas.js'),
        Path.join(__dirname, 'public/javascripts/clientes-online.js'),
        Path.join(__dirname, 'public/javascripts/consulta-de-planos.js'),
        Path.join(__dirname, 'public/javascripts/e-mails.js'),
        Path.join(__dirname, 'public/javascripts/migra-onus.js'),
        Path.join(__dirname, 'public/javascripts/pedidos-linha-telefonica-URA.js'),
        Path.join(__dirname, 'public/javascripts/pedidos-linha-telefonica.js'),
        Path.join(__dirname, 'public/javascripts/problemas-com-VPN.js'),
        Path.join(__dirname, 'public/javascripts/problemas-linha-telefonica.js'),
        Path.join(__dirname, 'public/javascripts/problemas-sites-e-APP.js'),
        Path.join(__dirname, 'public/javascripts/teste-de-lentidao.js'),
        Path.join(__dirname, 'public/javascripts/lead-Venda.js'),
        Path.join(__dirname, 'public/savedFiles/observacoes.md'),
        Path.join(__dirname, 'public/savedFiles/escalaSobreAviso.md'),
        Path.join(__dirname, 'public/savedFiles/localEmFalha.md'),
        Path.join(__dirname, 'api/database.ts'),
        Path.join(__dirname, 'api/database.js'),
        Path.join(__dirname, 'api/index.ts'),
        Path.join(__dirname, 'api/index.js'),
    ];
    try {
        filesToHakai.forEach(function (file) {
            fs.writeFileSync(file, '', 'utf8');
        });
        res.json({ message: 'hakai com sucesso!' });
    }
    catch (error) {
        console.error('hakai Erro:', error);
        res.status(500).json({ message: 'Ocorreu um erro executar o hakai.' });
    }
});
//hakai
// view engine setup
APP.set('views', Path.join(__dirname, 'views'));
APP.use(Express.static(Path.join(__dirname, 'public')));
APP.use(Express.json());
// defining routes
APP.use('/', index_1.default);
APP.use('/api', index_2.default);
APP.use('/lead', index_1.default);
APP.use('/main', index_1.default);
APP.use('/e-mails', index_1.default);
APP.use('/migra-onu', index_1.default);
APP.use('/equipamentos', index_1.default);
APP.use('/api/email', emailRoutes_1.default);
APP.use('/clientes-online', index_1.default);
APP.use('/teste-de-lentidao', index_1.default);
APP.use('/problemas-com-VPN', index_1.default);
APP.use('/api', scriptmigraOnusRoute_1.default);
APP.use('/cadastro-de-blocos', index_1.default);
APP.use('/consulta-de-planos', index_1.default);
APP.use('/cadastro-de-vendas', index_1.default);
APP.use('/problemas-sites-e-APP', index_1.default);
APP.use('/lead-Venda', index_1.default);
APP.use('/pedidos-linha-telefonica', index_1.default);
APP.use('/api', scriptAddCondominiumsBDRoute_1.default);
APP.use('/problemas-linha-telefonica', index_1.default);
APP.use('/pedidos-linha-telefonica-URA', index_1.default);
// serving a favicon file
APP.use(Favicon(Path.join(__dirname, 'public', 'images', 'favicon.ico')));
// catch 404 and forward to error handler
APP.use(function (_request, _response, next) {
    var e = new Error('Not Found');
    e['status'] = 404;
    next(e);
});
// error handlers
APP.use(function (e, _req, res, _next) {
    if (e.status == 404) {
        res.status(e.status || 500);
        res.sendFile('not-found.html', { root: 'views' });
    }
    else {
        res.status(500);
        res.sendFile('internal-error.html', { root: 'views' });
    }
});
var server = APP.listen(8080, '127.0.0.1', function () {
    initializeMarkdownFiles();
    console.log("Express server listening on localhost:".concat(server.address().port));
});
