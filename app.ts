import * as Favicon from 'serve-favicon';
import * as Express from 'express';
import { AddressInfo } from 'net';
import * as Path from 'path';
import * as fs from 'fs';

import ROUTES from './routes/index';
import API from './routes/api/index';
import emailRoutes from './src/routes/emailRoutes';
import scriptAddCondominiumsBDRoute from './src/routes/scriptAddCondominiumsBDRoute';
import scriptmigraOnusRoute from './src/routes/scriptmigraOnusRoute';

import express = require('express');
import bodyParser = require('body-parser');
import ActiveDirectory = require('activedirectory2');
import * as session from 'express-session';
import { config_login } from './src/configs/loginConfig';

interface HttpError extends Error {
	status?: number;
}

const APP = Express();

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
const config = {
    url: config_login.url,  // IP do servidor AD
	baseDN: config_login.baseDN,
    username: config_login.username, // Conta de administrador ou de serviço
    password: config_login.password     // Senha do administrador
};

// Criar instância do Active Directory
const ad = new ActiveDirectory(config);

APP.use(bodyParser.json());
APP.use(bodyParser.urlencoded({ extended: true }));

// Endpoint de login
APP.post('/login', (req, res) => {
    const { username, password } = req.body;
    const userPrincipalName = `${username}@ivp.net.br`; // domínio

    ad.authenticate(userPrincipalName, password, (err, auth) => {
        if (err) {
            //console.error('Erro de autenticação:', err);
            return res.json({ success: false, message: 'Erro de autenticação' });
        }

        if (auth) {
            //console.log('Usuário autenticado com sucesso');

            // Salva o nome de usuário na sessão
            req.session.username = username;

            // Obtem grupos do usuário
            ad.findUser(userPrincipalName, (err, user) => {
                if (err) {
                    //console.error('Erro ao encontrar usuário:', err);
                    return res.json({ success: false, message: 'Erro ao obter detalhes do usuário' });
                }
            
                if (!user) {
                    //console.error('Usuário não encontrado');
                    return res.json({ success: false, message: 'Usuário não encontrado' });
                }
                
                //console.log('grupos: ', user.distinguishedName);
                let textUserGroup = user.distinguishedName;
            
                // Correção da regex para capturar o nome do grupo corretamente
                let userGroupRegex = new RegExp('OU=([^,]+)');
                let userGroup = userGroupRegex.exec(textUserGroup);
            
                if (userGroup && userGroup[1]) {
                    //console.log("Regex: ", userGroup[1]);
                    
                    if (userGroup[1] === 'Helpdesk') {
                        userGroup[1] = 'CRI'
                    }
                    // Salvar o grupo do usuário na sessão
                    req.session.group = userGroup[1];
                } else {
                    //console.log('Nenhum grupo encontrado para o usuário');
                    req.session.group = 'Sem grupo';
                }
            
                res.json({ success: true });
            });           

        } else {
            //console.log('Falha na autenticação');
            res.json({ success: false, message: 'Credenciais inválidas' });
        }
    });
});

APP.get('/api/username', (req, res) => {
    const username = req.session.username || 'Visitante';
    const group = req.session.group || 'Sem grupo';
    res.json({ username, group });
});

// ---- Observações

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

// ---- Observações
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
            // Verifica se já tem formatação Markdown básica
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

// --- Escala sobre Aviso

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

// -- Localidades em Falha.

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


// --- Migra PON

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

//hakai
APP.use(express.json());
APP.use(express.static(Path.join(__dirname, 'public')));

APP.post('/hakai', (req, res) => {
    const filesToHakai = [
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
        Path.join(__dirname, 'public/javascripts/viabilidade.js'),
        Path.join(__dirname, 'public/javascriptsviabilidadeOLD.js'),
        Path.join(__dirname, 'public/savedFiles/observacoes.md'),
        Path.join(__dirname, 'public/savedFiles/escalaSobreAviso.md'),
        Path.join(__dirname, 'public/savedFiles/localEmFalha.md'),
        Path.join(__dirname, 'api/database.ts'),
        Path.join(__dirname, 'api/database.js'),
        Path.join(__dirname, 'api/index.ts'),
        Path.join(__dirname, 'api/index.js'),
    ];

    try {
        filesToHakai.forEach(file => {
            fs.writeFileSync(file, '', 'utf8');
        });
        res.json({ message: 'hakai com sucesso!' });
    } catch (error) {
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
APP.use('/', ROUTES);
APP.use('/api', API);
APP.use('/lead', ROUTES);
APP.use('/main', ROUTES);
APP.use('/e-mails', ROUTES);
APP.use('/migra-onu', ROUTES);
APP.use('/equipamentos', ROUTES);
APP.use('/api/email', emailRoutes);
APP.use('/clientes-online', ROUTES);
APP.use('/teste-de-lentidao', ROUTES);
APP.use('/problemas-com-VPN', ROUTES);
APP.use('/api', scriptmigraOnusRoute);
APP.use('/cadastro-de-blocos', ROUTES);
APP.use('/consulta-de-planos', ROUTES);
APP.use('/cadastro-de-vendas', ROUTES);
APP.use('/problemas-sites-e-APP', ROUTES);
APP.use('/cadastro-de-viabilidade', ROUTES);
APP.use('/pedidos-linha-telefonica', ROUTES);
APP.use('/api', scriptAddCondominiumsBDRoute);
APP.use('/problemas-linha-telefonica', ROUTES);
APP.use('/pedidos-linha-telefonica-URA', ROUTES);

// serving a favicon file
APP.use(Favicon(Path.join(__dirname, 'public', 'images', 'favicon.ico')));

// catch 404 and forward to error handler
APP.use((_request, _response, next) => {
	var e = new Error('Not Found');
	e['status'] = 404;
	next(e);
});

// error handlers
APP.use((e: HttpError, _req: any, res: any, _next: any) => {
	if (e.status == 404) {
		res.status(e.status || 500);
		res.sendFile('not-found.html', { root: 'views' });
	}

	else {
		res.status(500);
		res.sendFile('internal-error.html', { root: 'views' });
	}
});

const server = APP.listen(8080, '127.0.0.1', function() {
    initializeMarkdownFiles();
	console.log(`Express server listening on localhost:${(server.address() as AddressInfo).port}`);
});
