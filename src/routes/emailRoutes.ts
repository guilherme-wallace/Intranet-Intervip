import { Router } from 'express';
import EmailController from '../controllers/emailController';

const router = Router();

router.post('/enviar-email', EmailController.enviarEmail);

export default router;