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
// routes/api/v5/analise-de-risco.ts
const Express = require("express");
const axios_1 = require("axios");
const usuariosConfig_1 = require("../../../src/controllers/usuariosConfig");
const PDFDocument = require("pdfkit");
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const path = require("path");
const fs = require("fs");
const router = Express.Router();
const callIxc = (endpoint, data) => __awaiter(void 0, void 0, void 0, function* () {
    const url = `${process.env.IXC_API_URL}/webservice/v1${endpoint}`;
    const headers = {
        'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
        'Content-Type': 'application/json',
        'ixcsoft': 'listar'
    };
    try {
        const response = yield axios_1.default.post(url, data, { headers });
        return response.data;
    }
    catch (error) {
        throw new Error(`Erro na API IXC (${endpoint}): ${error.message}`);
    }
});
router.get('/minhas-os', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const username = req.query.username;
        if (!username) {
            return res.status(400).json({ error: "Username não informado." });
        }
        const userDb = yield usuariosConfig_1.UsuariosDB.sincronizarIXC(username);
        const idTecnico = userDb.id_funcionario_ixc;
        if (!idTecnico || idTecnico === '0') {
            return res.json([]);
        }
        const payloadOS = {
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
        const osResponse = yield callIxc('/su_oss_chamado', payloadOS);
        if (!osResponse || !osResponse.registros || osResponse.registros.length === 0) {
            return res.json([]);
        }
        const osFormatadas = yield Promise.all(osResponse.registros.map((os) => __awaiter(void 0, void 0, void 0, function* () {
            let nomeCliente = "Cliente não identificado";
            if (os.tipo === 'E' || os.id_cliente === '0') {
                nomeCliente = "Estrutura Própria";
            }
            else {
                try {
                    const clienteResp = yield callIxc('/cliente', {
                        qtype: "cliente.id", query: os.id_cliente, oper: "=", page: "1", rp: "1"
                    });
                    if (clienteResp && clienteResp.registros.length > 0) {
                        nomeCliente = clienteResp.registros[0].razao;
                    }
                }
                catch (e) {
                    console.error("Falha ao buscar nome do cliente ID:", os.id_cliente);
                }
            }
            const resumoAtividade = os.mensagem ? os.mensagem.split('\n')[0].replace('Processo: ', '') : `O.S. Assunto ${os.id_assunto}`;
            return {
                id: os.id,
                id_cliente: os.id_cliente,
                tipo: os.tipo,
                cliente: nomeCliente,
                local: `${os.endereco}${os.numero ? ', ' + os.numero : ''}${os.bairro ? ' - ' + os.bairro : ''}`,
                atividade: resumoAtividade
            };
        })));
        res.json(osFormatadas);
    }
    catch (error) {
        console.error("Erro rota /minhas-os:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.get('/tecnicos-parceiros', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = {
            qtype: "usuarios.status",
            query: "A",
            oper: "=",
            page: "1",
            rp: "1000",
            sortname: "usuarios.nome",
            sortorder: "asc"
        };
        const response = yield callIxc('/usuarios', payload);
        if (!response || !response.registros) {
            return res.json([]);
        }
        const gruposPermitidos = ['22', '31', '32'];
        const tecnicos = response.registros
            .filter((user) => { var _a; return gruposPermitidos.includes((_a = user.id_grupo) === null || _a === void 0 ? void 0 : _a.toString()); })
            .map((user) => ({
            id_tecnico: user.funcionario,
            nome: user.nome
        }));
        res.json(tecnicos);
    }
    catch (error) {
        console.error("Erro rota /tecnicos-parceiros:", error.message);
        res.status(500).json({ error: error.message });
    }
}));
router.post('/salvar-apr', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        const osId = data.os.id;
        const nomeArquivo = `APR_OS_${osId}_${Date.now()}.pdf`;
        const folderId = '1UeO_EL2kbI2348stl9x39-5Bykud80y-';
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const pass = new stream_1.PassThrough();
        doc.pipe(pass);
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const darkBlue = '#0d1b2a';
        const primaryBlue = '#1a365d';
        const logoPath = path.join(__dirname, '../../../public/images/logo.png');
        const zonasPath = path.join(__dirname, '../../../public/images/apr-zonas-risco.png');
        const drawSectionHeader = (title, yPos) => {
            doc.rect(40, yPos, 515, 20).fillAndStroke(primaryBlue, primaryBlue);
            doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text(title.toUpperCase(), 50, yPos + 6);
            return yPos + 25;
        };
        const drawCheckbox = (x, y, text, isChecked) => {
            doc.lineWidth(1).rect(x, y, 10, 10).stroke('#666666');
            if (isChecked) {
                doc.moveTo(x + 2, y + 2).lineTo(x + 8, y + 8).stroke('#000000');
                doc.moveTo(x + 8, y + 2).lineTo(x + 2, y + 8).stroke('#000000');
            }
            doc.fillColor('black').font('Helvetica').fontSize(9).text(text, x + 15, y + 1);
        };
        const drawFooter = () => {
            const footerY = pageHeight - 50;
            doc.rect(0, footerY, pageWidth, 50).fill(darkBlue);
            doc.fillColor('#cccccc').font('Helvetica').fontSize(8).text('Documento emitido, assinado e validado digitalmente através do sistema Intranet Intervip.\n' +
                `Autenticação interna via credenciais em: ${data.data_preenchimento}`, 0, footerY + 15, { align: 'center', width: pageWidth });
        };
        doc.rect(0, 0, pageWidth, 90).fill(darkBlue);
        if (fs.existsSync(logoPath))
            doc.image(logoPath, 45, 20, { width: 120 });
        doc.font('Helvetica-Bold').fontSize(16).fillColor('#ffffff').text('ANÁLISE PRELIMINAR DE RISCO (APR)', 180, 30, { width: 370, align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor('#cccccc').text(`Documento Referência: O.S. ${osId}`, 180, 50, { width: 370, align: 'right' });
        doc.text(`Data: ${data.data_preenchimento}`, 180, 62, { width: 370, align: 'right' });
        doc.fillColor('black');
        doc.font('Helvetica-Bold').fontSize(10).text(`ATIVIDADE: `, 45, 105, { continued: true }).font('Helvetica').text(`${data.os.atividade}`);
        doc.font('Helvetica-Bold').text(`CLIENTE / LOCAL: `, 45, 120, { continued: true }).font('Helvetica').text(`${data.os.cliente} - ${data.os.local}`);
        doc.font('Helvetica-Bold').text(`TÉCNICO RESPONSÁVEL: `, 45, 145, { continued: true }).font('Helvetica').text(`${data.tecnico_responsavel}`);
        let currY = drawSectionHeader('Atividades que requerem APR obrigatoriamente', 165);
        const ativ = data.atividades;
        drawCheckbox(45, currY, "Trabalho em altura", ativ.altura);
        drawCheckbox(45, currY + 15, "Trabalho em ambiente confinado", ativ.confinado);
        drawCheckbox(45, currY + 30, "Trabalho com Redes de Telecomunicação", ativ.telecom);
        drawCheckbox(45, currY + 45, "Trabalho com içamento de cargas", ativ.icamento);
        drawCheckbox(300, currY, "Trabalho com redes elétricas", ativ.eletrica);
        drawCheckbox(300, currY + 15, "Movimentação de escadas / cargas", ativ.movimentacao);
        drawCheckbox(300, currY + 30, "Escavações / Demolição / Fundação", ativ.escavacao);
        drawCheckbox(300, currY + 45, "Ativ. da Norma de Permissão para trabalho", ativ.pt);
        currY = drawSectionHeader('Zonas de Trabalho e Execução', 260);
        doc.rect(45, currY, 210, 130).fillAndStroke(darkBlue, darkBlue);
        if (fs.existsSync(zonasPath)) {
            doc.image(zonasPath, 50, currY + 5, { height: 120 });
        }
        else {
            doc.fillColor('#ffffff').fontSize(9).text('Imagem indisponível', 90, currY + 60);
        }
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#28a745').text('■ Zona Livre:', 280, currY + 20).fillColor('black').font('Helvetica').text(' Área segura e liberada.', 350, currY + 20);
        doc.font('Helvetica-Bold').fillColor('#ffc107').text('■ Zona Controlada:', 280, currY + 45).fillColor('black').font('Helvetica').text(' Acesso restrito a equipe.', 380, currY + 45);
        doc.font('Helvetica-Bold').fillColor('#dc3545').text('■ Zona de Risco:', 280, currY + 70).fillColor('black').font('Helvetica').text(' Ponto de execução (Atenção Máxima).', 370, currY + 70);
        currY = drawSectionHeader('Demandas do Serviço (Permissões Requeridas)', 430);
        drawCheckbox(45, currY, "Trabalho em altura", data.demandas.altura);
        drawCheckbox(45, currY + 15, "Trabalhos em redes energizadas", data.demandas.redes);
        drawCheckbox(45, currY + 30, "Entrada em ambientes confinados", data.demandas.confinado);
        drawCheckbox(300, currY, "Permissão do Cliente", data.demandas.permissao);
        if (data.demandas.permissao && data.cliente_permissao) {
            doc.fontSize(8).fillColor('gray').text(`Resp: ${data.cliente_permissao}`, 315, currY + 12);
        }
        currY = drawSectionHeader('Proteções Necessárias (EPIs Confirmados)', 515);
        data.epis.forEach((epi, index) => {
            const x = index % 2 === 0 ? 45 : 300;
            const yPos = currY + (Math.floor(index / 2) * 15);
            drawCheckbox(x, yPos, epi.nome, epi.checked);
        });
        currY = drawSectionHeader('Outras Proteções e Recomendações Adicionais', 615);
        doc.fillColor('black').font('Helvetica').fontSize(9).text(`Outras Proteções: ${data.textos.outras_protecoes || 'Nenhuma informada.'}`, 45, currY);
        doc.text(`Recomendações: ${data.textos.recomendacoes || 'Nenhuma informada.'}`, 45, currY + 15);
        drawFooter();
        doc.addPage();
        doc.rect(0, 0, pageWidth, 60).fill(darkBlue);
        if (fs.existsSync(logoPath))
            doc.image(logoPath, 45, 15, { width: 100 });
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text(`APR - O.S. ${osId}`, 180, 25, { width: 370, align: 'right' });
        currY = drawSectionHeader('Providências (P) e Verificações (V) antes do Início', 80);
        doc.fillColor('black').fontSize(8).font('Helvetica-Bold')
            .text('AÇÃO NECESSÁRIA', 45, currY)
            .text('( P )', 440, currY)
            .text('( V )', 490, currY);
        doc.moveTo(40, currY + 12).lineTo(555, currY + 12).stroke('#cccccc');
        let rowY = currY + 20;
        data.providencias.forEach((prov) => {
            doc.fillColor('black').font('Helvetica').fontSize(9).text(prov.nome, 45, rowY);
            drawCheckbox(445, rowY - 1, "", prov.p);
            drawCheckbox(495, rowY - 1, "", prov.v);
            doc.moveTo(40, rowY + 14).lineTo(555, rowY + 14).stroke('#eeeeee');
            rowY += 18;
        });
        currY = drawSectionHeader('Riscos Identificados', rowY + 15);
        drawCheckbox(45, currY, "Queda em altura / Mesmo nível", data.riscos.queda_alt);
        drawCheckbox(45, currY + 15, "Proteção de impacto", data.riscos.impacto);
        drawCheckbox(250, currY, "Insetos / Animais Peçonhentos", data.riscos.insetos);
        drawCheckbox(250, currY + 15, "Ergonômico", data.riscos.ergonomico);
        drawCheckbox(420, currY, "Trânsito", data.riscos.transito);
        if (data.riscos.outros) {
            drawCheckbox(420, currY + 15, `Outros: ${data.riscos.outros}`, true);
        }
        else {
            drawCheckbox(420, currY + 15, "Outros:", false);
        }
        currY = drawSectionHeader('Equipe Executora', currY + 45);
        doc.fillColor('black').fontSize(10).font('Helvetica-Bold').text(`Técnico Responsável: `, 45, currY, { continued: true }).font('Helvetica').text(`${data.tecnico_responsavel}`);
        if (data.parceiros && data.parceiros.length > 0) {
            doc.font('Helvetica-Bold').text(`Técnicos Parceiros: `, 45, currY + 15, { continued: true }).font('Helvetica').text(`${data.parceiros.join(', ')}`);
        }
        else {
            doc.font('Helvetica-Bold').text(`Técnicos Parceiros: `, 45, currY + 15, { continued: true }).font('Helvetica').text(`Nenhum adicionado.`);
        }
        drawFooter();
        doc.end();
        const auth = new googleapis_1.google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../../../google-credentials.json'),
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        const responseDrive = yield drive.files.create({
            requestBody: { name: nomeArquivo, parents: [folderId] },
            media: { mimeType: 'application/pdf', body: pass },
            fields: 'id, webViewLink',
            supportsAllDrives: true
        });
        const fileId = responseDrive.data.id;
        let linkPdfDrive = responseDrive.data.webViewLink;
        if (fileId) {
            try {
                yield drive.permissions.create({
                    fileId: fileId,
                    requestBody: { role: 'reader', type: 'anyone' },
                    supportsAllDrives: true
                });
            }
            catch (permError) {
                //console.warn("Aviso de Permissão do Drive (Ignorado):", permError.message);
            }
        }
        //console.log(`\n[DEBUG IXC MSG] Iniciando inserção de trâmite na OS: ${osId}`);
        if (osId !== 'Avulsa') {
            //console.log(`\n[DEBUG IXC MSG] Iniciando inserção de trâmite na OS: ${osId}`);
            const osAtualResp = yield callIxc('/su_oss_chamado', {
                qtype: "su_oss_chamado.id", query: osId, oper: "=", page: "1", rp: "1"
            });
            if (osAtualResp && osAtualResp.registros && osAtualResp.registros.length > 0) {
                const osAtual = osAtualResp.registros[0];
                //console.log(`[DEBUG IXC MSG] OS Encontrada. ID Técnico: '${osAtual.id_tecnico}'`);
                const novaMensagem = `APR PREENCHIDA - ${data.data_preenchimento}\nTécnico: ${data.tecnico_responsavel}\nVisualizar PDF Oficial: ${linkPdfDrive}`;
                const urlPostMensagem = `${process.env.IXC_API_URL}/webservice/v1/su_oss_chamado_mensagem`;
                const headersPostMensagem = {
                    'Authorization': `Basic ${process.env.IXC_API_TOKEN}`,
                    'Content-Type': 'application/json',
                    'ixcsoft': 'incluir'
                };
                const payloadMensagem = {
                    id_chamado: osId,
                    id_tecnico: osAtual.id_tecnico || "",
                    mensagem: novaMensagem,
                    status: osAtual.status || "",
                    id_evento: "0",
                    id_evento_status: "0",
                    tipo_cobranca: "N"
                };
                try {
                    yield axios_1.default.post(urlPostMensagem, payloadMensagem, { headers: headersPostMensagem });
                    //console.log(`[DEBUG IXC MSG] Mensagem salva na OS!`);
                }
                catch (msgError) {
                    console.error(`[DEBUG IXC MSG] FALHA OS:`, msgError.message);
                }
                if (osAtual.id_ticket && osAtual.id_ticket !== "0" && osAtual.id_ticket !== "") {
                    //console.log(`[DEBUG IXC MSG] Iniciando inserção no Atendimento: ${osAtual.id_ticket}`);
                    const urlPostAtendimento = `${process.env.IXC_API_URL}/webservice/v1/su_mensagens`;
                    const payloadAtendimento = {
                        id_cliente: osAtual.id_cliente,
                        mensagem_ticket: novaMensagem,
                        mensagem: novaMensagem,
                        visibilidade_mensagens: "P",
                        su_status: "P",
                        id_ticket: osAtual.id_ticket,
                        existe_pendencia_externa: "E"
                    };
                    try {
                        yield axios_1.default.post(urlPostAtendimento, payloadAtendimento, { headers: headersPostMensagem });
                        //console.log(`[DEBUG IXC MSG] Mensagem salva no Atendimento!`);
                    }
                    catch (atendError) {
                        console.error(`[DEBUG IXC MSG] FALHA Atendimento:`, atendError.message);
                    }
                }
            }
        }
        else {
            //console.log(`[DEBUG IXC MSG] APR Avulsa - Nenhuma integração com IXC necessária.`);
        }
        res.json({ success: true, link: linkPdfDrive });
    }
    catch (error) {
        console.error("Erro rota /salvar-apr:", error);
        res.status(500).json({ error: error.message });
    }
}));
exports.default = router;
