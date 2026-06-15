"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
dotenv.config();
const Favicon = require("serve-favicon");
const Express = require("express");
const Path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const ActiveDirectory = require("activedirectory2");
const session = require("express-session");
const bcrypt = require("bcrypt");
const usuariosConfig_1 = require("./src/controllers/usuariosConfig");
const helmet_1 = require("helmet");
const express_rate_limit_1 = require("express-rate-limit");
const index_1 = require("./routes/index");
const index_2 = require("./routes/api/index");
const emailRoutes_1 = require("./src/routes/emailRoutes");
const scriptAddCondominiumsBDRoute_1 = require("./src/routes/scriptAddCondominiumsBDRoute");
const scriptmigraOnusRoute_1 = require("./src/routes/scriptmigraOnusRoute");
const geospatial_1 = require("./routes/api/v5/geospatial");
const ixc_1 = require("./routes/api/v5/ixc");
const loginConfig_1 = require("./src/configs/loginConfig");
const soc_1 = require("./routes/api/v5/soc");
const monitoramento_de_falhas_1 = require("./routes/api/v5/monitoramento-de-falhas");
const looking_glass_1 = require("./routes/api/v5/looking-glass");
const rede_neutra_1 = require("./routes/api/v5/rede_neutra");
const analise_de_risco_1 = require("./routes/api/v5/analise-de-risco");
const abertura_OS_1 = require("./routes/api/v5/abertura-OS");
const agendamento_1 = require("./routes/api/v5/agendamento");
const painel_logistica_1 = require("./routes/api/v5/painel-logistica");
const jwt = require("jsonwebtoken");
process.on('uncaughtException', (error) => {
    console.error('--- ERRO NÃO CAPTURADO (Uncaught Exception) ---');
    console.error(error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('--- REJEIÇÃO DE PROMISE NÃO CAPTURADA (Unhandled Rejection) ---');
    console.error('Razão:', reason);
});
const APP = Express();
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
const limiter = (0, express_rate_limit_1.default)({
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
const protectApi = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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
const protectRoutes = (req, res, next) => {
    const group = req.session.group;
    const requestedUrl = req.originalUrl;
    if (!group) {
        return res.redirect('/');
    }
    //if (group === 'RedeNeutra' && requestedUrl !== '/viabilidade-intervip') {
    //return res.redirect('/viabilidade-intervip');
    //}
    if (group === 'RedeNeutra' && requestedUrl !== '/viabilidade-intervip') {
        return res.redirect('/viabilidade-intervip');
    }
    next();
};
// =======================================================
// --- CONFIGURAÇÃO DO ACTIVE DIRECTORY ---
// =======================================================
const config = {
    url: loginConfig_1.config_login.url,
    baseDN: loginConfig_1.config_login.baseDN,
    username: loginConfig_1.config_login.username,
    password: loginConfig_1.config_login.password
};
const ad = new ActiveDirectory(config);
// ======================= PERMISSÕES ======================
const PERMISSOES_SISTEMA = {
    'card-Avisos': ['NOC', 'Comercial', 'Almoxarifado', 'Corporativo', 'ADMIN', 'Fibra', 'Financeiro', 'Helpdesk', 'CRI', 'Logistica', 'Qualidade'],
    'card-viabilidade-intervip': ['NOC', 'Comercial', 'Almoxarifado', 'Corporativo', 'ADMIN', 'Fibra', 'Financeiro', 'Helpdesk', 'CRI', 'Logistica', 'Qualidade', 'villaggionet', 'ultracom', 'seliga', 'nv7', 'nwt', 'netplanety', 'infinity', 'inova.telecom', 'conectmais', 'conectja', 'supernet', 'RedeNeutra'],
    'card-clientes-online': ['NOC', 'Almoxarifado', 'Corporativo', 'ADMIN', 'Fibra', 'Financeiro', 'Helpdesk', 'CRI', 'Logistica', 'Qualidade'],
    'card-lead-Venda': ['NOC', 'Comercial', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-cadastro-de-vendas': ['NOC', 'Comercial', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-equipamentos': ['NOC', 'Comercial', 'Almoxarifado', 'Corporativo', 'ADMIN', 'Fibra', 'Financeiro', 'Helpdesk', 'CRI', 'Logistica', 'Qualidade', 'TecnicoFibra', 'TecnicoLogistica'],
    'card-teste-de-lentidao': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-problemas-com-VPN': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-problemas-sites-e-APP': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-pedidos-linha-telefonica': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-pedidos-linha-telefonica-URA': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-problemas-linha-telefonica': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro', 'Helpdesk', 'CRI', 'Qualidade'],
    'card-e-mails': ['NOC', 'ADMIN'],
    'card-migra-onu': ['NOC', 'ADMIN'],
    'card-cadastro-de-blocos': ['NOC', 'ADMIN'],
    'card-soc-report': ['NOC', 'ADMIN'],
    'card-monitoramento-de-falhas': ['NOC', 'ADMIN', 'Fibra', 'Logistica'],
    'card-looking-glass': ['NOC', 'ADMIN'],
    'card-analise-de-risco': ['NOC', 'TecnicoFibra', 'TecnicoLogistica', 'Fibra', 'Logistica', 'ADMIN'],
    'card-abertura-OS': ['NOC', 'Fibra', 'Logistica', 'Financeiro', 'Helpdesk', 'CRI', 'Corporativo', 'Comercial', 'ADMIN'],
    'card-agendamento': ['NOC', 'Fibra', 'Logistica', 'Financeiro', 'Helpdesk', 'CRI', 'Corporativo', 'Comercial', 'ADMIN'],
    'card-painel-logistica': ['NOC', 'Fibra', 'Logistica', 'Financeiro', 'Helpdesk', 'CRI', 'Corporativo', 'Comercial', 'ADMIN'],
    'card-cadastro-bandaLarga': ['NOC', 'Comercial', 'Almoxarifado', 'Corporativo', 'ADMIN', 'Fibra', 'Financeiro', 'Helpdesk', 'CRI', 'Logistica', 'Qualidade'],
    'card-cadastro-corporativo': ['NOC', 'Corporativo', 'ADMIN', 'Financeiro'],
    'card-cadastro-redeNeutra': ['NOC', 'conectmais', 'conectja', 'seliga', 'nv7', 'netplanety', 'villaggionet', 'supernet', 'Corporativo', 'Financeiro', 'ADMIN'],
    'card-demo-redeNeutra': ['NOC', 'ADMIN'],
};
APP.get('/api/permissoes-usuario', (req, res) => {
    const userGroup = req.session.group || 'Sem grupo';
    const acessosPermitidos = Object.keys(PERMISSOES_SISTEMA).filter(id => {
        return PERMISSOES_SISTEMA[id].includes(userGroup) || userGroup === 'ADMIN';
    });
    res.json({ idsPermitidos: acessosPermitidos });
});
function verificarAcessoPagina(pagina) {
    return (req, res, next) => {
        const userGroup = req.session.group || 'Sem grupo';
        const permissao = PERMISSOES_SISTEMA[`card-${pagina}`];
        if (userGroup === 'ADMIN' || (permissao && permissao.includes(userGroup))) {
            return next();
        }
        res.redirect('/main');
    };
}
APP.get('/viabilidade-intervip', verificarAcessoPagina('viabilidade-intervip'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'viabilidade-intervip.html'));
});
APP.get('/clientes-online', verificarAcessoPagina('clientes-online'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'clientes-online.html'));
});
APP.get('/lead-Venda', verificarAcessoPagina('lead-Venda'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'lead-Venda.html'));
});
APP.get('/cadastro-de-vendas', verificarAcessoPagina('cadastro-de-vendas'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'cadastro-de-vendas.html'));
});
APP.get('/equipamentos', verificarAcessoPagina('equipamentos'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'equipamentos.html'));
});
APP.get('/teste-de-lentidao', verificarAcessoPagina('teste-de-lentidao'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'teste-de-lentidao.html'));
});
APP.get('/problemas-com-VPN', verificarAcessoPagina('problemas-com-VPN'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'problemas-com-VPN.html'));
});
APP.get('/problemas-sites-e-APP', verificarAcessoPagina('problemas-sites-e-APP'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'problemas-sites-e-APP.html'));
});
APP.get('/pedidos-linha-telefonica', verificarAcessoPagina('pedidos-linha-telefonica'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'pedidos-linha-telefonica.html'));
});
APP.get('/pedidos-linha-telefonica-URA', verificarAcessoPagina('pedidos-linha-telefonica-URA'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'pedidos-linha-telefonica-URA.html'));
});
APP.get('/problemas-linha-telefonica', verificarAcessoPagina('problemas-linha-telefonica'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'problemas-linha-telefonica.html'));
});
APP.get('/e-mails', verificarAcessoPagina('e-mails'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'e-mails.html'));
});
APP.get('/migra-onu', verificarAcessoPagina('migra-onu'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'migra-onu.html'));
});
APP.get('/cadastro-de-blocos', verificarAcessoPagina('cadastro-de-blocos'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'cadastro-de-blocos.html'));
});
APP.get('/soc-report', verificarAcessoPagina('soc-report'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'soc-report.html'));
});
APP.get('/monitoramento-de-falhas', verificarAcessoPagina('monitoramento-de-falhas'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'monitoramento-de-falhas.html'));
});
APP.get('/looking-glass', verificarAcessoPagina('looking-glass'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'looking-glass.html'));
});
APP.get('/analise-de-risco', verificarAcessoPagina('analise-de-risco'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'analise-de-risco.html'));
});
APP.get('/abertura-OS', verificarAcessoPagina('abertura-OS'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'abertura-OS.html'));
});
APP.get('/agendamento', verificarAcessoPagina('agendamento'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'agendamento.html'));
});
APP.get('/painel-logistica', verificarAcessoPagina('painel-logistica'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'painel-logistica.html'));
});
APP.get('/cadastro-bandaLarga', verificarAcessoPagina('cadastro-bandaLarga'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'cadastro-bandaLarga.html'));
});
APP.get('/cadastro-corporativo', verificarAcessoPagina('cadastro-corporativo'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'cadastro-corporativo.html'));
});
APP.get('/cadastro-redeNeutra', verificarAcessoPagina('cadastro-redeNeutra'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'cadastro-redeNeutra.html'));
});
APP.get('/demo-redeNeutra', verificarAcessoPagina('demo-redeNeutra'), (req, res) => {
    res.sendFile(Path.join(__dirname, 'views', 'demo-redeNeutra.html'));
});
// ======================= USERLOGIN ======================
APP.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const userPrincipalName = `${username}@ivp.net.br`;
    ad.authenticate(userPrincipalName, password, (err, auth) => __awaiter(void 0, void 0, void 0, function* () {
        if (auth) {
            ad.findUser(userPrincipalName, (err, user) => __awaiter(void 0, void 0, void 0, function* () {
                if (err || !user)
                    return res.json({ success: false, message: 'Erro ao obter detalhes do AD' });
                let group = 'Comum';
                const textUserGroup = user.distinguishedName;
                const userGroupRegex = new RegExp('OU=([^,]+)');
                const userGroupMatch = userGroupRegex.exec(textUserGroup);
                group = userGroupMatch && userGroupMatch[1] === 'Helpdesk'
                    ? 'CRI'
                    : (userGroupMatch ? userGroupMatch[1] : 'Sem grupo');
                try {
                    yield usuariosConfig_1.UsuariosDB.sincronizarUsuarioAD(user.displayName || username, username, password, group);
                    yield usuariosConfig_1.UsuariosDB.sincronizarIXC(username);
                }
                catch (dbErr) {
                    console.error("Erro na sincronização AD/IXC:", dbErr);
                }
                return gerarSessaoEToken(req, res, username, group);
            }));
        }
        else {
            try {
                const usuarioLocal = yield usuariosConfig_1.UsuariosDB.buscarPorUsuario(username);
                if (usuarioLocal) {
                    const senhaValida = yield bcrypt.compare(password, usuarioLocal.senha);
                    if (senhaValida) {
                        try {
                            yield usuariosConfig_1.UsuariosDB.sincronizarIXC(usuarioLocal.usuario);
                        }
                        catch (ixcErr) {
                            console.error("Erro na sincronização com IXC (Local):", ixcErr);
                        }
                        return gerarSessaoEToken(req, res, usuarioLocal.usuario, usuarioLocal.grupo);
                    }
                }
                return res.json({ success: false, message: 'Usuário ou senha inválidos' });
            }
            catch (dbErr) {
                return res.json({ success: false, message: 'Erro no banco local' });
            }
        }
    }));
}));
function gerarSessaoEToken(req, res, username, group) {
    req.session.username = username;
    req.session.group = group;
    const gruposParceiros = [
        'ultracom', 'seliga', 'infinity', 'inova.telecom', 'RedeNeutra'
    ];
    let redirectUrl = gruposParceiros.includes(group) ? '/viabilidade-intervip' : '/main';
    //let redirectUrl = gruposParceiros.includes(group) ? '/viabilidade-intervip' : '/main';
    const payload = { username, group };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({
        success: true,
        redirectUrl: redirectUrl,
        //redirectUrl: redirectUrl,
        token: token
    });
}
APP.get('/logout', (req, res) => {
    req.session.destroy((err) => {
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
APP.use('/api/v5/soc', protectApi, soc_1.default);
APP.use('/api/v5/monitoramento-de-falhas', protectApi, monitoramento_de_falhas_1.default);
APP.use('/api/v5/looking-glass', protectApi, looking_glass_1.default);
APP.use('/api/v5/rede_neutra', protectApi, rede_neutra_1.default);
APP.use('/api/v5/analise-de-risco', protectApi, analise_de_risco_1.default);
APP.use('/api/v5/abertura-OS', protectApi, abertura_OS_1.default);
APP.use('/api/v5/agendamento', protectApi, agendamento_1.default);
APP.use('/api/v5/painel-logistica', protectApi, painel_logistica_1.default);
APP.get('/api/username', protectApi, (req, res) => {
    if (req.user) {
        return res.json({ username: req.user.username, group: req.user.group });
    }
    else {
        const username = req.session.username || 'Visitante';
        const group = req.session.group || 'Sem grupo';
        return res.json({ username, group });
    }
});
// ======================================================
APP.use('/', index_1.default);
APP.use('/lead', protectRoutes, index_1.default);
APP.use('/main', protectRoutes, index_1.default);
APP.use('/e-mails', protectRoutes, index_1.default);
APP.use('/migra-onu', protectRoutes, index_1.default);
APP.use('/lead-Venda', protectRoutes, index_1.default);
APP.use('/soc-report', protectRoutes, index_1.default);
APP.use('/agendamento', protectRoutes, index_1.default);
APP.use('/abertura-OS', protectRoutes, index_1.default);
APP.use('/equipamentos', protectRoutes, index_1.default);
APP.use('/looking-glass', protectRoutes, index_1.default);
APP.use('/clientes-online', protectRoutes, index_1.default);
APP.use('/demo-redeNeutra', protectRoutes, index_1.default);
APP.use('/painel-logistica', protectRoutes, index_1.default);
APP.use('/analise-de-risco', protectRoutes, index_1.default);
APP.use('/teste-de-lentidao', protectRoutes, index_1.default);
APP.use('/problemas-com-VPN', protectRoutes, index_1.default);
APP.use('/cadastro-de-blocos', protectRoutes, index_1.default);
//APP.use('/consulta-de-planos', protectRoutes, ROUTES);
APP.use('/viabilidade-intervip', protectRoutes, index_1.default);
//APP.use('/cadastro-de-vendas', protectRoutes, ROUTES);
APP.use('/cadastro-bandaLarga', protectRoutes, index_1.default);
APP.use('/cadastro-redeNeutra', protectRoutes, index_1.default);
APP.use('/cadastro-corporativo', protectRoutes, index_1.default);
APP.use('/problemas-sites-e-APP', protectRoutes, index_1.default);
APP.use('/monitoramento-de-falhas', protectRoutes, index_1.default);
APP.use('/pedidos-linha-telefonica', protectRoutes, index_1.default);
APP.use('/problemas-linha-telefonica', protectRoutes, index_1.default);
APP.use('/pedidos-linha-telefonica-URA', protectRoutes, index_1.default);
// =======================================================
// --- ROTINAS INTERNAS E SERVIÇOS ESTÁTICOS ---
// =======================================================
const initializeMarkdownFiles = () => {
    const files = [
        { path: observacoesPath, defaultContent: '' },
        { path: escalaSobreAvisoPath, defaultContent: '' },
        { path: localEmFalhaPath, defaultContent: '' }
    ];
    files.forEach(file => {
        if (!fs.existsSync(file.path)) {
            fs.writeFileSync(file.path, file.defaultContent, 'utf8');
            console.log(`Arquivo ${file.path} criado com sucesso.`);
        }
    });
};
const observacoesPath = Path.join(__dirname, 'public/savedFiles/observacoes.md');
APP.get('/api/observacoes', (req, res) => {
    fs.readFile(observacoesPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const defaultContent = '';
                fs.writeFile(observacoesPath, defaultContent, 'utf8', (err) => {
                    if (err) {
                        console.error('Erro ao criar arquivo de observações:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ observacoes: defaultContent });
                });
            }
            else {
                console.error('Erro ao ler o arquivo de observações:', err);
                return res.status(500).json({ error: 'Erro ao carregar observações' });
            }
        }
        else {
            let content = data;
            if (!content.startsWith('#') && content.trim() !== '') {
                content = `${content}`;
            }
            res.json({ observacoes: content });
        }
    });
});
APP.post('/api/salvar-observacoes', (req, res) => {
    const { observacoes } = req.body;
    if (observacoes) {
        let contentToSave = observacoes;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(observacoesPath, contentToSave, 'utf8', (err) => {
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
const escalaSobreAvisoPath = Path.join(__dirname, 'public/savedFiles/escalaSobreAviso.md');
APP.get('/api/escalaSobreAviso', (req, res) => {
    fs.readFile(escalaSobreAvisoPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const defaultContent = '';
                fs.writeFile(escalaSobreAvisoPath, defaultContent, 'utf8', (err) => {
                    if (err) {
                        console.error('Erro ao criar arquivo de escalaSobreAviso:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ escalaSobreAviso: defaultContent });
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
APP.post('/api/salvar-escalaSobreAviso', (req, res) => {
    const { escalaSobreAviso } = req.body;
    if (escalaSobreAviso) {
        let contentToSave = escalaSobreAviso;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(escalaSobreAvisoPath, contentToSave, 'utf8', (err) => {
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
const localEmFalhaPath = Path.join(__dirname, 'public/savedFiles/localEmFalha.md');
APP.get('/api/localEmFalha', (req, res) => {
    fs.readFile(localEmFalhaPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                const defaultContent = '';
                fs.writeFile(localEmFalhaPath, defaultContent, 'utf8', (err) => {
                    if (err) {
                        console.error('Erro ao criar arquivo de localEmFalha:', err);
                        return res.status(500).json({ error: 'Erro ao criar arquivo' });
                    }
                    return res.json({ localEmFalha: defaultContent });
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
APP.post('/api/salvar-localEmFalha', (req, res) => {
    const { localEmFalha } = req.body;
    if (localEmFalha) {
        let contentToSave = localEmFalha;
        if (!contentToSave.startsWith('#')) {
            contentToSave = '' + contentToSave;
        }
        contentToSave = contentToSave.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFile(localEmFalhaPath, contentToSave, 'utf8', (err) => {
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
const autorizaONUPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/autorizaONU.txt');
APP.get('/api/autorizaONU', (req, res) => {
    fs.readFile(autorizaONUPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo de autorizaONU.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar autorizaONU.txt' });
        }
        res.json({ autorizaONU: data });
    });
});
const autorizaONUExcecaoPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/autorizaONUExcecao.txt');
APP.get('/api/autorizaONUExcecao', (req, res) => {
    fs.readFile(autorizaONUExcecaoPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo de autorizaONUExcecao.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar autorizaONUExcecao.txt' });
        }
        res.json({ autorizaONUExcecao: data });
    });
});
const ontDeletePath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/ontDelete.txt');
APP.get('/api/ontDelete', (req, res) => {
    fs.readFile(ontDeletePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Erro ao ler o arquivo de ontDelete.txt:', err);
            return res.status(500).json({ error: 'Erro ao carregar ontDelete.txt' });
        }
        res.json({ ontDelete: data });
    });
});
const ontDeleteExcecaoPath = Path.join(__dirname, 'public/scriptsPy/migraOnus/src/ontDeleteExcecao.txt');
APP.get('/api/ontDeleteExcecao', (req, res) => {
    fs.readFile(ontDeleteExcecaoPath, 'utf8', (err, data) => {
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
APP.use((_request, _response, next) => {
    var e = new Error('Not Found');
    e['status'] = 404;
    next(e);
});
APP.use((e, _req, res, _next) => {
    if (e.status == 404) {
        res.status(e.status || 500);
        res.sendFile('not-found.html', { root: 'views' });
    }
    else {
        res.status(500);
        res.sendFile('internal-error.html', { root: 'views' });
    }
});
const server = APP.listen(8080, '127.0.0.1', function () {
    initializeMarkdownFiles();
    console.log(`Express server listening on localhost:${server.address().port}`);
});
