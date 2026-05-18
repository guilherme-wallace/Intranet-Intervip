"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const path = require("path");
const router = (0, express_1.Router)();
router.get('/run-addCondBD', (req, res) => {
    const scriptPath = path.resolve(__dirname, '../../public/scriptsPy/add-condominiums-to-BD/main.py');
    // Executando o script Python
    (0, child_process_1.exec)(`python ${scriptPath}`, (error, stdout, stderr) => {
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
exports.default = router;
