import { Router } from 'express';
import { exec } from 'child_process';
import * as path from 'path';

const router = Router();

router.get('/run-python', (req, res) => {
    // Construindo o caminho absoluto para o script Python
    const scriptPath = path.resolve(__dirname, '../../public/scriptsPy/add-condominiums-to-BD/main.py');

    // Executando o script Python
    exec(`python3 ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send(`Error running script: ${error.message}`);
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return res.status(500).send(`Script stderr: ${stderr}`);
        }
        console.log(`Script output: ${stdout}`);
        res.send(`Script executed successfully! Output: ${stdout}`);
    });
});

export default router;
