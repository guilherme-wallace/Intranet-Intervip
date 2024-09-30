"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var child_process_1 = require("child_process");
var path = require("path");
var router = (0, express_1.Router)();
router.post('/run-olt-script', function (req, res) {
    var _a = req.body, use_OLT_Antiga = _a.use_OLT_Antiga, use_OLT_Nova = _a.use_OLT_Nova, pon_ANTIGA = _a.pon_ANTIGA, onu_ID = _a.onu_ID, ont_LIN_PROF = _a.ont_LIN_PROF, ont_SRV_PROF = _a.ont_SRV_PROF, ont_native_vlan = _a.ont_native_vlan, ont_vlan_service_port = _a.ont_vlan_service_port, ont_gem_PORT = _a.ont_gem_PORT, ont_user_vlan = _a.ont_user_vlan;
    // Absolute path to the Python script
    var scriptPath = path.resolve(__dirname, '../../public/scriptsPy/migraOnus/main.py');
    // Constructing the command to pass arguments to the Python script
    var pythonCommand = "python ".concat(scriptPath, " ").concat(use_OLT_Antiga, " ").concat(use_OLT_Nova, " ").concat(pon_ANTIGA, " ").concat(onu_ID, " ").concat(ont_LIN_PROF || 'None', " ").concat(ont_SRV_PROF || 'None', " ").concat(ont_native_vlan || 'None', " ").concat(ont_vlan_service_port || 'None', " ").concat(ont_gem_PORT || 'None', " ").concat(ont_user_vlan || 'None');
    // Execute the Python script
    (0, child_process_1.exec)(pythonCommand, function (error, stdout, stderr) {
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
