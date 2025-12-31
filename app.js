"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv = require("dotenv");
dotenv.config();
var Favicon = require("serve-favicon");
var Express = require("express");
var Path = require("path");
var fs = require("fs");
var bodyParser = require("body-parser");
var ActiveDirectory = require("activedirectory2");
var session = require("express-session");
var helmet_1 = require("helmet");
var express_rate_limit_1 = require("express-rate-limit");
var index_1 = require("./routes/index");
var index_2 = require("./routes/api/index");
var emailRoutes_1 = require("./src/routes/emailRoutes");
var scriptAddCondominiumsBDRoute_1 = require("./src/routes/scriptAddCondominiumsBDRoute");
var scriptmigraOnusRoute_1 = require("./src/routes/scriptmigraOnusRoute");
var geospatial_1 = require("./routes/api/v5/geospatial");
var ixc_1 = require("./routes/api/v5/ixc");
var loginConfig_1 = require("./src/configs/loginConfig");
var jwt = require("jsonwebtoken");
process.on('uncaughtException', function (error) {
    console.error('--- ERRO NÃO CAPTURADO (Uncaught Exception) ---');
    console.error(error);
});
process.on('unhandledRejection', function (reason, promise) {
    console.error('--- REJEIÇÃO DE PROMISE NÃO CAPTURADA (Unhandled Rejection) ---');
    console.error('Razão:', reason);
});
var APP = Express();
// =======================================================
// --- CONFIGURAÇÃO DOS MIDDLEWARES DE SEGURANÇA ---
// =======================================================
APP.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                'https://cdn.jsdelivr.net',
                'https://cdnjs.cloudflare.com',
                "'unsafe-inline'",
                'https://*.kaspersky-labs.com'
            ],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https://raw.githubusercontent.com", "https://*.bing.com"],
            connectSrc: ["'self'", "https://bing.biturl.top", "*"],
        },
    },
}));
var limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições enviadas deste IP, por favor, tente novamente após 15 minutos.'
});
APP.use(limiter);
APP.use(bodyParser.json());
APP.use(bodyParser.urlencoded({ extended: true }));
require('express-file-logger')(APP, {
    basePath: 'logs',
    fileName: 'access.log',
    showOnConsole: false
});
// Express Session com cookies
APP.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'strict'
    }
}));
// =======================================================
// --- MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO ---
// =======================================================
/*
const isApiAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.session && req.session.username && req.session.username !== 'Visitante') {
        return next();
    } else {
        return res.status(401).json({
            error: 'Acesso não autorizado. Por favor, faça o login.'
        });
    }
};
*/
var protectApi = function (req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, function (err, user) {
            if (err) {
                return res.status(403).json({ error: 'Token inválido ou expirado.' });
            }
            req.user = user;
            return next();
        });
    }
    else if (req.session && req.session.username && req.session.username !== 'Visitante') {
        return next();
    }
    else {
        return res.status(401).json({
            error: 'Acesso não autorizado. Token ou sessão não fornecidos.'
        });
    }
};
var protectRoutes = function (req, res, next) {
    var group = req.session.group;
    var requestedUrl = req.originalUrl;
    if (!group) {
        return res.redirect('/');
    }
    if (group === 'RedeNeutra' && requestedUrl !== '/viabilidade-intervip') {
        return res.redirect('/viabilidade-intervip');
    }
    next();
};
// =======================================================
// --- CONFIGURAÇÃO DO ACTIVE DIRECTORY ---
// =======================================================
var config = {
    url: loginConfig_1.config_login.url,
    baseDN: loginConfig_1.config_login.baseDN,
    username: loginConfig_1.config_login.username,
    password: loginConfig_1.config_login.password
};
var ad = new ActiveDirectory(config);
APP.post('/login', function (req, res) {
    var _a = req.body, username = _a.username, password = _a.password;
    var userPrincipalName = "".concat(username, "@ivp.net.br");
    ad.authenticate(userPrincipalName, password, function (err, auth) {
        if (err) {
            return res.json({ success: false, message: 'Erro de autenticação' });
        }
        if (auth) {
            ad.findUser(userPrincipalName, function (err, user) {
                if (err || !user) {
                    return res.json({ success: false, message: 'Erro ao obter detalhes do usuário' });
                }
                var textUserGroup = user.distinguishedName;
                var userGroupRegex = new RegExp('OU=([^,]+)');
                var userGroupMatch = userGroupRegex.exec(textUserGroup);
                var group = 'Sem grupo';
                if (userGroupMatch && userGroupMatch[1]) {
                    group = userGroupMatch[1] === 'Helpdesk' ? 'CRI' : userGroupMatch[1];
                }
                req.session.username = username;
                req.session.group = group;
                var redirectUrl = '/main';
                if (group === 'RedeNeutra') {
                    redirectUrl = '/viabilidade-intervip';
                }
                var payload = { username: username, group: group };
                var token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
                res.json({
                    success: true,
                    redirectUrl: redirectUrl,
                    token: token
                });
            });
        }
        else {
            res.json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});
APP.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.error("Erro ao fazer logout:", err);
            return res.redirect('/main');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});
/*
APP.use('/api/v5', isApiAuthenticated, geospatialRoutes);
APP.use('/api', isApiAuthenticated, API);
APP.use('/api/email', isApiAuthenticated, emailRoutes);
APP.use('/api', isApiAuthenticated, scriptmigraOnusRoute);
APP.use('/api', isApiAuthenticated, scriptAddCondominiumsBDRoute);

APP.get('/api/username', isApiAuthenticated, (req, res) => {
    const username = req.session.username || 'Visitante';
    const group = req.session.group || 'Sem grupo';
    res.json({ username, group });
});
*/
APP.use('/api/v5/geo', protectApi, geospatial_1.default);
APP.use('/api/v5/ixc', protectApi, ixc_1.default);
APP.use('/api', protectApi, index_2.default);
APP.use('/api/email', protectApi, emailRoutes_1.default);
APP.use('/api', protectApi, scriptmigraOnusRoute_1.default);
APP.use('/api', protectApi, scriptAddCondominiumsBDRoute_1.default);
APP.get('/api/username', protectApi, function (req, res) {
    if (req.user) {
        return res.json({ username: req.user.username, group: req.user.group });
    }
    else {
        var username = req.session.username || 'Visitante';
        var group = req.session.group || 'Sem grupo';
        return res.json({ username: username, group: group });
    }
});
// ======================================================
APP.use('/', index_1.default);
APP.use('/lead', protectRoutes, index_1.default);
APP.use('/main', protectRoutes, index_1.default);
APP.use('/e-mails', protectRoutes, index_1.default);
APP.use('/migra-onu', protectRoutes, index_1.default);
APP.use('/soc-report', protectRoutes, index_1.default);
APP.use('/equipamentos', protectRoutes, index_1.default);
APP.use('/clientes-online', protectRoutes, index_1.default);
APP.use('/teste-de-lentidao', protectRoutes, index_1.default);
APP.use('/problemas-com-VPN', protectRoutes, index_1.default);
APP.use('/cadastro-de-blocos', protectRoutes, index_1.default);
APP.use('/consulta-de-planos', protectRoutes, index_1.default);
APP.use('/viabilidade-intervip', protectRoutes, index_1.default);
APP.use('/cadastro-de-vendas', protectRoutes, index_1.default);
APP.use('/cadastro-bandaLarga', protectRoutes, index_1.default);
APP.use('/cadastro-corporativo', protectRoutes, index_1.default);
APP.use('/cadastro-rede-neutra', protectRoutes, index_1.default);
APP.use('/problemas-sites-e-APP', protectRoutes, index_1.default);
APP.use('/lead-Venda', protectRoutes, index_1.default);
APP.use('/pedidos-linha-telefonica', protectRoutes, index_1.default);
APP.use('/problemas-linha-telefonica', protectRoutes, index_1.default);
APP.use('/pedidos-linha-telefonica-URA', protectRoutes, index_1.default);
// =======================================================
// --- ROTINAS INTERNAS E SERVIÇOS ESTÁTICOS ---
// =======================================================
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
APP.set('views', Path.join(__dirname, 'views'));
APP.use(Express.static(Path.join(__dirname, 'public')));
APP.use(Favicon(Path.join(__dirname, 'public', 'images', 'favicon.ico')));
APP.use(function (_request, _response, next) {
    var e = new Error('Not Found');
    e['status'] = 404;
    next(e);
});
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
