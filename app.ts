import * as Favicon from 'serve-favicon';
import * as Express from 'express';
import { AddressInfo } from 'net';
import * as Path from 'path';

import ROUTES from './routes/index';
import API from './routes/api/index';
import emailRoutes from './src/routes/emailRoutes';
import scriptAddCondominiumsBDRoute from './src/routes/scriptAddCondominiumsBDRoute';

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
APP.use('/api/email', emailRoutes);
APP.use('/clientes-online', ROUTES);
APP.use('/teste-de-lentidao', ROUTES);
APP.use('/problemas-com-VPN', ROUTES);
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
	console.log(`Express server listening on localhost:${(server.address() as AddressInfo).port}`);
});