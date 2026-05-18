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
const nodemailer = require("nodemailer");
const configs_1 = require("../configs/configs");
class EmailController {
    enviarEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { para, assunto, mensagem } = req.body;
            // Configurar o Nodemailer
            const transporter = nodemailer.createTransport({
                host: configs_1.default.host,
                port: configs_1.default.port,
                secure: false,
                service: 'gmail',
                auth: {
                    user: configs_1.default.user,
                    pass: configs_1.default.password
                },
                tls: { rejectUnauthorized: false }
            });
            // Configurar o e-mail
            const mailOptions = {
                from: configs_1.default.user,
                to: para,
                subject: assunto,
                html: mensagem
            };
            // Enviar e-mail
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).json({ error: 'Erro ao enviar o e-mail' });
                }
                res.status(200).json({ message: 'E-mail enviado com sucesso', info });
            });
        });
    }
}
exports.default = new EmailController();
