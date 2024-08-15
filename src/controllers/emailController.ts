import { Request, Response } from 'express';
import * as nodemailer from "nodemailer"
import config from '../configs/configs';

class EmailController {
  async enviarEmail(req: Request, res: Response) {
    const { para, assunto, mensagem } = req.body;

    // Configurar o Nodemailer
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false,
	service: 'gmail',
        auth: {
            user: config.user,
            pass: config.password
        },
        tls: { rejectUnauthorized: false }
    });

    // Configurar o e-mail
    const mailOptions = {
      from: config.user,
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
  }
}

export default new EmailController();
