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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/api/v5/analise-de-risco.ts
var Express = require("express");
var axios_1 = require("axios");
var usuariosConfig_1 = require("../../../src/controllers/usuariosConfig");
var PDFDocument = require("pdfkit");
var googleapis_1 = require("googleapis");
var stream_1 = require("stream");
var path = require("path");
var fs = require("fs");
var router = Express.Router();
var callIxc = function (endpoint, data) { return __awaiter(void 0, void 0, void 0, function () {
    var url, headers, response, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = "".concat(process.env.IXC_API_URL, "/webservice/v1").concat(endpoint);
                headers = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'Content-Type': 'application/json',
                    'ixcsoft': 'listar'
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, axios_1.default.post(url, data, { headers: headers })];
            case 2:
                response = _a.sent();
                return [2 /*return*/, response.data];
            case 3:
                error_1 = _a.sent();
                throw new Error("Erro na API IXC (".concat(endpoint, "): ").concat(error_1.message));
            case 4: return [2 /*return*/];
        }
    });
}); };
router.get('/minhas-os', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var username, userDb, idTecnico, payloadOS, osResponse, osFormatadas, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                username = req.query.username;
                if (!username) {
                    return [2 /*return*/, res.status(400).json({ error: "Username não informado." })];
                }
                return [4 /*yield*/, usuariosConfig_1.UsuariosDB.sincronizarIXC(username)];
            case 1:
                userDb = _a.sent();
                idTecnico = userDb.id_funcionario_ixc;
                if (!idTecnico || idTecnico === '0') {
                    return [2 /*return*/, res.json([])];
                }
                payloadOS = {
                    qtype: "su_oss_chamado.id_tecnico",
                    query: idTecnico,
                    oper: "=",
                    page: "1",
                    rp: "100",
                    sortname: "su_oss_chamado.data_agenda",
                    sortorder: "asc",
                    grid_param: JSON.stringify([
                        { "TB": "su_oss_chamado.status", "OP": "!=", "P": "F" },
                        { "TB": "su_oss_chamado.status", "OP": "!=", "P": "C" }
                    ])
                };
                return [4 /*yield*/, callIxc('/su_oss_chamado', payloadOS)];
            case 2:
                osResponse = _a.sent();
                if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
                    return [2 /*return*/, res.json([])];
                }
                return [4 /*yield*/, Promise.all(osResponse.registros.map(function (os) { return __awaiter(void 0, void 0, void 0, function () {
                        var nomeCliente, clienteResp, e_1, resumoAtividade;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    nomeCliente = "Cliente não identificado";
                                    if (!(os.tipo === 'E' || os.id_cliente === '0')) return [3 /*break*/, 1];
                                    nomeCliente = "Estrutura Própria";
                                    return [3 /*break*/, 4];
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, callIxc('/cliente', {
                                            qtype: "cliente.id", query: os.id_cliente, oper: "=", page: "1", rp: "1"
                                        })];
                                case 2:
                                    clienteResp = _a.sent();
                                    if (clienteResp && clienteResp.registros.length > 0) {
                                        nomeCliente = clienteResp.registros[0].razao;
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    e_1 = _a.sent();
                                    console.error("Falha ao buscar nome do cliente ID:", os.id_cliente);
                                    return [3 /*break*/, 4];
                                case 4:
                                    resumoAtividade = os.mensagem ? os.mensagem.split('\n')[0].replace('Processo: ', '') : "O.S. Assunto ".concat(os.id_assunto);
                                    return [2 /*return*/, {
                                            id: os.id,
                                            id_cliente: os.id_cliente,
                                            tipo: os.tipo,
                                            cliente: nomeCliente,
                                            local: "".concat(os.endereco).concat(os.numero ? ', ' + os.numero : '').concat(os.bairro ? ' - ' + os.bairro : ''),
                                            atividade: resumoAtividade
                                        }];
                            }
                        });
                    }); }))];
            case 3:
                osFormatadas = _a.sent();
                res.json(osFormatadas);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _a.sent();
                console.error("Erro rota /minhas-os:", error_2.message);
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/tecnicos-parceiros', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payload, response, gruposPermitidos_1, tecnicos, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                payload = {
                    qtype: "usuarios.status",
                    query: "A",
                    oper: "=",
                    page: "1",
                    rp: "1000",
                    sortname: "usuarios.nome",
                    sortorder: "asc"
                };
                return [4 /*yield*/, callIxc('/usuarios', payload)];
            case 1:
                response = _a.sent();
                if (!response || !response.registros) {
                    return [2 /*return*/, res.json([])];
                }
                gruposPermitidos_1 = ['22', '31', '32'];
                tecnicos = response.registros
                    .filter(function (user) { var _a; return gruposPermitidos_1.includes((_a = user.id_grupo) === null || _a === void 0 ? void 0 : _a.toString()); })
                    .map(function (user) { return ({
                    id_tecnico: user.funcionario,
                    nome: user.nome
                }); });
                res.json(tecnicos);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Erro rota /tecnicos-parceiros:", error_3.message);
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/salvar-apr', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data_1, osId, nomeArquivo, folderId, doc_1, pass, pageWidth_1, pageHeight_1, darkBlue_1, primaryBlue_1, logoPath, zonasPath, drawSectionHeader, drawCheckbox_1, drawFooter, currY_1, ativ, rowY_1, auth, drive, responseDrive, fileId, linkPdfDrive, permError_1, osAtualResp, osAtual, novaMensagem, urlPostMensagem, headersPostMensagem, payloadMensagem, respMensagem, msgError_1, urlPostAtendimento, payloadAtendimento, respAtendimento, atendError_1, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 17, , 18]);
                data_1 = req.body;
                osId = data_1.os.id;
                nomeArquivo = "APR_OS_".concat(osId, "_").concat(Date.now(), ".pdf");
                folderId = '1UeO_EL2kbI2348stl9x39-5Bykud80y-';
                doc_1 = new PDFDocument({ margin: 0, size: 'A4' });
                pass = new stream_1.PassThrough();
                doc_1.pipe(pass);
                pageWidth_1 = 595.28;
                pageHeight_1 = 841.89;
                darkBlue_1 = '#0d1b2a';
                primaryBlue_1 = '#1a365d';
                logoPath = path.join(__dirname, '../../../public/images/logo.png');
                zonasPath = path.join(__dirname, '../../../public/images/apr-zonas-risco.png');
                drawSectionHeader = function (title, yPos) {
                    doc_1.rect(40, yPos, 515, 20).fillAndStroke(primaryBlue_1, primaryBlue_1);
                    doc_1.fillColor('white').font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), 50, yPos + 6);
                    return yPos + 25;
                };
                drawCheckbox_1 = function (x, y, text, isChecked) {
                    doc_1.lineWidth(1).rect(x, y, 10, 10).stroke('#666666');
                    if (isChecked) {
                        doc_1.moveTo(x + 2, y + 2).lineTo(x + 8, y + 8).stroke('#000000');
                        doc_1.moveTo(x + 8, y + 2).lineTo(x + 2, y + 8).stroke('#000000');
                    }
                    doc_1.fillColor('black').font('Helvetica').fontSize(9).text(text, x + 15, y + 1);
                };
                drawFooter = function () {
                    var footerY = pageHeight_1 - 50;
                    doc_1.rect(0, footerY, pageWidth_1, 50).fill(darkBlue_1);
                    doc_1.fillColor('#cccccc').font('Helvetica').fontSize(8).text('Documento emitido, assinado e validado digitalmente através do sistema Intranet Intervip.\n' +
                        "Autentica\u00E7\u00E3o interna via credenciais em: ".concat(data_1.data_preenchimento), 0, footerY + 15, { align: 'center', width: pageWidth_1 });
                };
                doc_1.rect(0, 0, pageWidth_1, 90).fill(darkBlue_1);
                if (fs.existsSync(logoPath))
                    doc_1.image(logoPath, 45, 20, { width: 120 });
                doc_1.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('ANÁLISE PRELIMINAR DE RISCO (APR)', 180, 30, { width: 370, align: 'right' });
                doc_1.font('Helvetica').fontSize(9).fillColor('#cccccc').text("Documento Refer\u00EAncia: O.S. ".concat(osId), 180, 50, { width: 370, align: 'right' });
                doc_1.text("Data: ".concat(data_1.data_preenchimento), 180, 62, { width: 370, align: 'right' });
                doc_1.fillColor('black');
                doc_1.font('Helvetica-Bold').fontSize(10).text("ATIVIDADE: ", 45, 105, { continued: true }).font('Helvetica').text("".concat(data_1.os.atividade));
                doc_1.font('Helvetica-Bold').text("CLIENTE / LOCAL: ", 45, 120, { continued: true }).font('Helvetica').text("".concat(data_1.os.cliente, " - ").concat(data_1.os.local));
                doc_1.font('Helvetica-Bold').text("T\u00C9CNICO RESPONS\u00C1VEL: ", 45, 145, { continued: true }).font('Helvetica').text("".concat(data_1.tecnico_responsavel));
                currY_1 = drawSectionHeader('Atividades que requerem APR obrigatoriamente', 165);
                ativ = data_1.atividades;
                drawCheckbox_1(45, currY_1, "Trabalho em altura", ativ.altura);
                drawCheckbox_1(45, currY_1 + 15, "Trabalho em ambiente confinado", ativ.confinado);
                drawCheckbox_1(45, currY_1 + 30, "Trabalho com Redes de Telecomunicação", ativ.telecom);
                drawCheckbox_1(45, currY_1 + 45, "Trabalho com içamento de cargas", ativ.icamento);
                drawCheckbox_1(300, currY_1, "Trabalho com redes elétricas", ativ.eletrica);
                drawCheckbox_1(300, currY_1 + 15, "Movimentação de escadas / cargas", ativ.movimentacao);
                drawCheckbox_1(300, currY_1 + 30, "Escavações / Demolição / Fundação", ativ.escavacao);
                drawCheckbox_1(300, currY_1 + 45, "Ativ. da Norma de Permissão para trabalho", ativ.pt);
                currY_1 = drawSectionHeader('Zonas de Trabalho e Execução', 260);
                doc_1.rect(45, currY_1, 210, 130).fillAndStroke(darkBlue_1, darkBlue_1);
                if (fs.existsSync(zonasPath)) {
                    doc_1.image(zonasPath, 50, currY_1 + 5, { height: 120 });
                }
                else {
                    doc_1.fillColor('#ffffff').fontSize(9).text('Imagem indisponível', 90, currY_1 + 60);
                }
                doc_1.font('Helvetica-Bold').fontSize(10).fillColor('#28a745').text('■ Zona Livre:', 280, currY_1 + 20).fillColor('black').font('Helvetica').text(' Área segura e liberada.', 350, currY_1 + 20);
                doc_1.font('Helvetica-Bold').fillColor('#ffc107').text('■ Zona Controlada:', 280, currY_1 + 45).fillColor('black').font('Helvetica').text(' Acesso restrito a equipe.', 380, currY_1 + 45);
                doc_1.font('Helvetica-Bold').fillColor('#dc3545').text('■ Zona de Risco:', 280, currY_1 + 70).fillColor('black').font('Helvetica').text(' Ponto de execução (Atenção Máxima).', 370, currY_1 + 70);
                currY_1 = drawSectionHeader('Demandas do Serviço (Permissões Requeridas)', 430);
                drawCheckbox_1(45, currY_1, "Trabalho em altura", data_1.demandas.altura);
                drawCheckbox_1(45, currY_1 + 15, "Trabalhos em redes energizadas", data_1.demandas.redes);
                drawCheckbox_1(45, currY_1 + 30, "Entrada em ambientes confinados", data_1.demandas.confinado);
                drawCheckbox_1(300, currY_1, "Permissão do Cliente", data_1.demandas.permissao);
                if (data_1.demandas.permissao && data_1.cliente_permissao) {
                    doc_1.fontSize(8).fillColor('gray').text("Resp: ".concat(data_1.cliente_permissao), 315, currY_1 + 12);
                }
                currY_1 = drawSectionHeader('Proteções Necessárias (EPIs Confirmados)', 515);
                data_1.epis.forEach(function (epi, index) {
                    var x = index % 2 === 0 ? 45 : 300;
                    var yPos = currY_1 + (Math.floor(index / 2) * 15);
                    drawCheckbox_1(x, yPos, epi.nome, epi.checked);
                });
                currY_1 = drawSectionHeader('Outras Proteções e Recomendações Adicionais', 615);
                doc_1.fillColor('black').font('Helvetica').fontSize(9).text("Outras Prote\u00E7\u00F5es: ".concat(data_1.textos.outras_protecoes || 'Nenhuma informada.'), 45, currY_1);
                doc_1.text("Recomenda\u00E7\u00F5es: ".concat(data_1.textos.recomendacoes || 'Nenhuma informada.'), 45, currY_1 + 15);
                drawFooter();
                doc_1.addPage();
                doc_1.rect(0, 0, pageWidth_1, 60).fill(darkBlue_1);
                if (fs.existsSync(logoPath))
                    doc_1.image(logoPath, 45, 15, { width: 100 });
                doc_1.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text("APR - O.S. ".concat(osId), 180, 25, { width: 370, align: 'right' });
                currY_1 = drawSectionHeader('Providências (P) e Verificações (V) antes do Início', 80);
                doc_1.fillColor('black').fontSize(8).font('Helvetica-Bold')
                    .text('AÇÃO NECESSÁRIA', 45, currY_1)
                    .text('( P )', 440, currY_1)
                    .text('( V )', 490, currY_1);
                doc_1.moveTo(40, currY_1 + 12).lineTo(555, currY_1 + 12).stroke('#cccccc');
                rowY_1 = currY_1 + 20;
                data_1.providencias.forEach(function (prov) {
                    doc_1.fillColor('black').font('Helvetica').fontSize(9).text(prov.nome, 45, rowY_1);
                    drawCheckbox_1(445, rowY_1 - 1, "", prov.p);
                    drawCheckbox_1(495, rowY_1 - 1, "", prov.v);
                    doc_1.moveTo(40, rowY_1 + 14).lineTo(555, rowY_1 + 14).stroke('#eeeeee');
                    rowY_1 += 18;
                });
                currY_1 = drawSectionHeader('Riscos Identificados', rowY_1 + 15);
                drawCheckbox_1(45, currY_1, "Queda em altura / Mesmo nível", data_1.riscos.queda_alt);
                drawCheckbox_1(45, currY_1 + 15, "Proteção de impacto", data_1.riscos.impacto);
                drawCheckbox_1(250, currY_1, "Insetos / Animais Peçonhentos", data_1.riscos.insetos);
                drawCheckbox_1(250, currY_1 + 15, "Ergonômico", data_1.riscos.ergonomico);
                drawCheckbox_1(420, currY_1, "Trânsito", data_1.riscos.transito);
                if (data_1.riscos.outros) {
                    drawCheckbox_1(420, currY_1 + 15, "Outros: ".concat(data_1.riscos.outros), true);
                }
                else {
                    drawCheckbox_1(420, currY_1 + 15, "Outros:", false);
                }
                currY_1 = drawSectionHeader('Equipe Executora', currY_1 + 45);
                doc_1.fillColor('black').fontSize(10).font('Helvetica-Bold').text("T\u00E9cnico Respons\u00E1vel: ", 45, currY_1, { continued: true }).font('Helvetica').text("".concat(data_1.tecnico_responsavel));
                if (data_1.parceiros && data_1.parceiros.length > 0) {
                    doc_1.font('Helvetica-Bold').text("T\u00E9cnicos Parceiros: ", 45, currY_1 + 15, { continued: true }).font('Helvetica').text("".concat(data_1.parceiros.join(', ')));
                }
                else {
                    doc_1.font('Helvetica-Bold').text("T\u00E9cnicos Parceiros: ", 45, currY_1 + 15, { continued: true }).font('Helvetica').text("Nenhum adicionado.");
                }
                drawFooter();
                doc_1.end();
                auth = new googleapis_1.google.auth.GoogleAuth({
                    keyFile: path.join(__dirname, '../../../google-credentials.json'),
                    scopes: ['https://www.googleapis.com/auth/drive'],
                });
                drive = googleapis_1.google.drive({ version: 'v3', auth: auth });
                return [4 /*yield*/, drive.files.create({
                        requestBody: { name: nomeArquivo, parents: [folderId] },
                        media: { mimeType: 'application/pdf', body: pass },
                        fields: 'id, webViewLink',
                        supportsAllDrives: true
                    })];
            case 1:
                responseDrive = _a.sent();
                fileId = responseDrive.data.id;
                linkPdfDrive = responseDrive.data.webViewLink;
                if (!fileId) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, drive.permissions.create({
                        fileId: fileId,
                        requestBody: { role: 'reader', type: 'anyone' },
                        supportsAllDrives: true
                    })];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                permError_1 = _a.sent();
                return [3 /*break*/, 5];
            case 5: return [4 /*yield*/, callIxc('/su_oss_chamado', {
                    qtype: "su_oss_chamado.id", query: osId, oper: "=", page: "1", rp: "1"
                })];
            case 6:
                osAtualResp = _a.sent();
                if (!(osAtualResp && osAtualResp.registros && osAtualResp.registros.length > 0)) return [3 /*break*/, 16];
                osAtual = osAtualResp.registros[0];
                novaMensagem = "APR PREENCHIDA - ".concat(data_1.data_preenchimento, "\nT\u00E9cnico: ").concat(data_1.tecnico_responsavel, "\nVisualizar PDF Oficial: ").concat(linkPdfDrive);
                urlPostMensagem = "".concat(process.env.IXC_API_URL, "/webservice/v1/su_oss_chamado_mensagem");
                headersPostMensagem = {
                    'Authorization': "Basic ".concat(process.env.IXC_API_TOKEN),
                    'Content-Type': 'application/json',
                    'ixcsoft': 'incluir'
                };
                payloadMensagem = {
                    id_chamado: osId,
                    id_tecnico: osAtual.id_tecnico || "",
                    mensagem: novaMensagem,
                    status: osAtual.status || "",
                    id_evento: "0",
                    id_evento_status: "0",
                    tipo_cobranca: "N"
                };
                _a.label = 7;
            case 7:
                _a.trys.push([7, 9, , 10]);
                return [4 /*yield*/, axios_1.default.post(urlPostMensagem, payloadMensagem, { headers: headersPostMensagem })];
            case 8:
                respMensagem = _a.sent();
                return [3 /*break*/, 10];
            case 9:
                msgError_1 = _a.sent();
                //console.error(`[DEBUG IXC MSG] FALHA ao inserir mensagem na OS.`);
                if (msgError_1.response) {
                    //console.error(`[DEBUG IXC MSG] Detalhes do Erro do IXC:`, JSON.stringify(msgError.response.data));
                }
                else {
                    //console.error(`[DEBUG IXC MSG] Erro interno:`, msgError.message);
                }
                return [3 /*break*/, 10];
            case 10:
                if (!(osAtual.id_ticket && osAtual.id_ticket !== "0" && osAtual.id_ticket !== "")) return [3 /*break*/, 15];
                urlPostAtendimento = "".concat(process.env.IXC_API_URL, "/webservice/v1/su_mensagens");
                payloadAtendimento = {
                    id_cliente: osAtual.id_cliente,
                    mensagem_ticket: novaMensagem,
                    mensagem: novaMensagem,
                    visibilidade_mensagens: "P",
                    su_status: "P",
                    id_ticket: osAtual.id_ticket,
                    existe_pendencia_externa: "E"
                };
                _a.label = 11;
            case 11:
                _a.trys.push([11, 13, , 14]);
                return [4 /*yield*/, axios_1.default.post(urlPostAtendimento, payloadAtendimento, { headers: headersPostMensagem })];
            case 12:
                respAtendimento = _a.sent();
                return [3 /*break*/, 14];
            case 13:
                atendError_1 = _a.sent();
                //console.error(`[DEBUG IXC MSG] FALHA ao inserir mensagem no Atendimento.`);
                if (atendError_1.response) {
                    //console.error(`[DEBUG IXC MSG] Detalhes do Erro do IXC (Atendimento):`, JSON.stringify(atendError.response.data));
                }
                else {
                    //console.error(`[DEBUG IXC MSG] Erro interno (Atendimento):`, atendError.message);
                }
                return [3 /*break*/, 14];
            case 14: return [3 /*break*/, 15];
            case 15: return [3 /*break*/, 16];
            case 16:
                res.json({ success: true, link: linkPdfDrive });
                return [3 /*break*/, 18];
            case 17:
                error_4 = _a.sent();
                console.error("Erro rota /salvar-apr:", error_4);
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 18];
            case 18: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
