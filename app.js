"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Favicon = require("serve-favicon");
var Express = require("express");
var Path = require("path");
var index_1 = require("./routes/index");
var index_2 = require("./routes/api/index");
var emailRoutes_1 = require("./src/routes/emailRoutes");
var APP = Express();
require('express-file-logger')(APP, {
    basePath: 'logs',
    fileName: 'access.log',
    showOnConsole: false
});
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
APP.use('/api/email', emailRoutes_1.default);
APP.use('/clientes-online', index_1.default);
APP.use('/teste-de-lentidao', index_1.default);
APP.use('/problemas-com-VPN', index_1.default);
APP.use('/cadastro-de-blocos', index_1.default);
APP.use('/consulta-de-planos', index_1.default);
APP.use('/cadastro-de-vendas', index_1.default);
APP.use('/problemas-sites-e-APP', index_1.default);
APP.use('/cadastro-de-viabilidade', index_1.default);
APP.use('/pedidos-linha-telefonica', index_1.default);
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
    console.log("Express server listening on localhost:".concat(server.address().port));
});
