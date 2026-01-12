import * as dotenv from 'dotenv';
dotenv.config();

import * as Favicon from 'serve-favicon';
import * as Express from 'express';
import { AddressInfo } from 'net';
import * as Path from 'path';
import * as fs from 'fs';
import express = require('express');
import bodyParser = require('body-parser');
import ActiveDirectory = require('activedirectory2');
import * as session from 'express-session';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import ROUTES from './routes/index';
import API from './routes/api/index';
import emailRoutes from './src/routes/emailRoutes';
import scriptAddCondominiumsBDRoute from './src/routes/scriptAddCondominiumsBDRoute';
import scriptmigraOnusRoute from './src/routes/scriptmigraOnusRoute';
import geospatialRoutes from './routes/api/v5/geospatial';
import ixcRoutes from './routes/api/v5/ixc';
import { config_login } from './src/configs/loginConfig';

import socRoutes from './routes/api/v5/soc';

import * as jwt from 'jsonwebtoken';


// =======================================================
// --- INICIALIZAÇÃO E CONFIGURAÇÕES GLOBAIS ---
// =======================================================
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

process.on('uncaughtException', (error) => {
  console.error('--- ERRO NÃO CAPTURADO (Uncaught Exception) ---');
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('--- REJEIÇÃO DE PROMISE NÃO CAPTURADA (Unhandled Rejection) ---');
  console.error('Razão:', reason);
});

interface HttpError extends Error {
	status?: number;
}

const APP = Express();

// =======================================================
// --- CONFIGURAÇÃO DOS MIDDLEWARES DE SEGURANÇA ---
// =======================================================

APP.use(
  helmet({
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
  })
);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
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

const protectApi = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err: any, user: any) => {
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

const protectRoutes = (req: any, res: any, next: any) => {
    const group = req.session.group;
    const requestedUrl = req.originalUrl;

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
const config = {
    url: config_login.url,
	baseDN: config_login.baseDN,
    username: config_login.username,
    password: config_login.password
};
const ad = new ActiveDirectory(config);


APP.post('/login', (req, res) => {
    const { username, password } = req.body;
    const userPrincipalName = `${username}@ivp.net.br`;

    ad.authenticate(userPrincipalName, password, (err, auth) => {
        if (err) {
            return res.json({ success: false, message: 'Erro de autenticação' });
        }
        if (auth) {
            ad.findUser(userPrincipalName, (err, user) => {
                if (err || !user) {
                    return res.json({ success: false, message: 'Erro ao obter detalhes do usuário' });
                }
                let textUserGroup = user.distinguishedName;
                let userGroupRegex = new RegExp('OU=([^,]+)');
                let userGroupMatch = userGroupRegex.exec(textUserGroup);
                let group = 'Sem grupo';
                if (userGroupMatch && userGroupMatch[1]) {
                    group = userGroupMatch[1] === 'Helpdesk' ? 'CRI' : userGroupMatch[1];
                }

                req.session.username = username;
                req.session.group = group;

                let redirectUrl = '/main';
                if (group === 'RedeNeutra') {
                    redirectUrl = '/viabilidade-intervip';
                }

                const payload = { username: username, group: group };
                const token = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    { expiresIn: '8h' }
                );

                res.json({ 
                    success: true, 
                    redirectUrl: redirectUrl,
                    token: token
                });
            });           
        } else {
            res.json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});

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
APP.use('/api/v5/geo', protectApi, geospatialRoutes);
APP.use('/api/v5/ixc', protectApi, ixcRoutes);
APP.use('/api', protectApi, API);
APP.use('/api/email', protectApi, emailRoutes);
APP.use('/api', protectApi, scriptmigraOnusRoute);
APP.use('/api', protectApi, scriptAddCondominiumsBDRoute);
APP.use('/api/v5/soc', protectApi, socRoutes);

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

APP.use('/', ROUTES);
APP.use('/lead', protectRoutes, ROUTES);
APP.use('/main', protectRoutes, ROUTES);
APP.use('/e-mails', protectRoutes, ROUTES);
APP.use('/migra-onu', protectRoutes, ROUTES);
APP.use('/soc-report', protectRoutes, ROUTES);
APP.use('/equipamentos', protectRoutes, ROUTES);
APP.use('/clientes-online', protectRoutes, ROUTES);
APP.use('/teste-de-lentidao', protectRoutes, ROUTES);
APP.use('/problemas-com-VPN', protectRoutes, ROUTES);
APP.use('/cadastro-de-blocos', protectRoutes, ROUTES);
APP.use('/consulta-de-planos', protectRoutes, ROUTES);
APP.use('/viabilidade-intervip', protectRoutes, ROUTES);
APP.use('/cadastro-de-vendas', protectRoutes, ROUTES);
APP.use('/cadastro-bandaLarga', protectRoutes, ROUTES);
APP.use('/cadastro-corporativo', protectRoutes, ROUTES);
APP.use('/cadastro-rede-neutra', protectRoutes, ROUTES);
APP.use('/problemas-sites-e-APP', protectRoutes, ROUTES);
APP.use('/lead-Venda', protectRoutes, ROUTES);
APP.use('/pedidos-linha-telefonica', protectRoutes, ROUTES);
APP.use('/problemas-linha-telefonica', protectRoutes, ROUTES);
APP.use('/pedidos-linha-telefonica-URA', protectRoutes, ROUTES);


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
            } else {
                console.error('Erro ao ler o arquivo de observações:', err);
                return res.status(500).json({ error: 'Erro ao carregar observações' });
            }
        } else {
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
    } else {
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
            } else {
                console.error('Erro ao ler o arquivo de escalaSobreAviso:', err);
                return res.status(500).json({ error: 'Erro ao carregar escalaSobreAviso' });
            }
        } else {
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
    } else {
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
            } else {
                console.error('Erro ao ler o arquivo de localEmFalha:', err);
                return res.status(500).json({ error: 'Erro ao carregar localEmFalha' });
            }
        } else {
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
    } else {
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

APP.use((e: HttpError, _req: any, res: any, _next: any) => {
	if (e.status == 404) {
		res.status(e.status || 500);
		res.sendFile('not-found.html', { root: 'views' });
	} else {
		res.status(500);
		res.sendFile('internal-error.html', { root: 'views' });
	}
});

const server = APP.listen(8080, '127.0.0.1', function() {
    initializeMarkdownFiles();
	console.log(`Express server listening on localhost:${(server.address() as AddressInfo).port}`);
});