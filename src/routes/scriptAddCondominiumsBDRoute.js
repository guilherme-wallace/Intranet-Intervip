"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var child_process_1 = require("child_process");
var path = require("path");
var router = (0, express_1.Router)();
router.get('/run-addCondBD', function (req, res) {
    var scriptPath = path.resolve(__dirname, '../../public/scriptsPy/add-condominiums-to-BD/main.py');
    // Executando o script Python
    (0, child_process_1.exec)("python ".concat(scriptPath), function (error, stdout, stderr) {
        if (error) {
            console.error("Error: ".concat(error.message));
            return res.status(500).send("Error running script: ".concat(error.message));
        }
        if (stderr) {
            console.error("Stderr: ".concat(stderr));
            return res.status(500).send("Script stderr: ".concat(stderr));
        }
        console.log("Script output: ".concat(stdout));
        res.send("Script executed successfully! Output: ".concat(stdout));
    });
});
exports.default = router;
