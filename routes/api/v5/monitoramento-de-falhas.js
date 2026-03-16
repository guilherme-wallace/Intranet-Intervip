"use strict";
// routes/api/v5/monitoramento.ts
Object.defineProperty(exports, "__esModule", { value: true });
var Express = require("express");
var database_1 = require("../../../api/database");
var router = Express.Router();
router.post('/webhook/n8n', function (req, res) {
    var _a = req.body, host_zabbix = _a.host_zabbix, tipo_alerta = _a.tipo_alerta, identificador = _a.identificador, nome_identificado = _a.nome_identificado, status = _a.status, data_evento = _a.data_evento, sinal_rx_retorno = _a.sinal_rx_retorno;
    if (status === 'DOWN') {
        var INSERT_ALERTA = "\n            INSERT INTO mon_alertas \n            (host_zabbix, tipo_alerta, identificador, nome_identificado, data_falha, status) \n            VALUES (?, ?, ?, ?, ?, 'DOWN')\n        ";
        database_1.LOCALHOST.query(INSERT_ALERTA, [host_zabbix, tipo_alerta, identificador, nome_identificado, data_evento], function (error, results) {
            if (error) {
                console.error("Erro ao inserir alerta:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, message: 'Alerta DOWN registrado', id_alerta: results.insertId });
        });
    }
    else if (status === 'UP') {
        var UPDATE_ALERTA = "\n            UPDATE mon_alertas \n            SET status = 'UP', data_retorno = ?, sinal_rx_retorno = ? \n            WHERE identificador = ? AND host_zabbix = ? AND status = 'DOWN' \n            ORDER BY data_falha DESC LIMIT 1\n        ";
        database_1.LOCALHOST.query(UPDATE_ALERTA, [data_evento, sinal_rx_retorno, identificador, host_zabbix], function (error, results) {
            if (error) {
                console.error("Erro ao atualizar alerta para UP:", error);
                return res.status(500).json({ error: error.message });
            }
            res.json({ success: true, message: 'Alerta normalizado para UP' });
        });
    }
    else {
        res.status(400).json({ error: 'Status inválido. Use DOWN ou UP.' });
    }
});
router.get('/falhas-ativas', function (req, res) {
    var QUERY = "\n        SELECT * FROM mon_alertas \n        WHERE \n            (status = 'DOWN' AND data_falha <= NOW() - INTERVAL 5 MINUTE)\n            OR \n            (status = 'UP' AND data_retorno >= NOW() - INTERVAL 10 MINUTE)\n        ORDER BY data_falha DESC\n    ";
    database_1.LOCALHOST.query(QUERY, function (error, results) {
        if (error) {
            console.error("Erro ao buscar falhas:", error);
            return res.status(500).json({ error: error.message });
        }
        res.json(results);
    });
});
router.post('/acao-manual/arquivar', function (req, res) {
    var id_alerta = req.body.id_alerta;
    var QUERY = "UPDATE mon_alertas SET status = 'UP', data_retorno = NOW() WHERE id = ?";
    database_1.LOCALHOST.query(QUERY, [id_alerta], function (error) {
        if (error)
            return res.status(500).json({ error: error.message });
        res.json({ success: true, message: 'Alerta arquivado manualmente.' });
    });
});
exports.default = router;
