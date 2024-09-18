"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var emailController_1 = require("../controllers/emailController");
var router = (0, express_1.Router)();
router.post('/enviar-email', emailController_1.default.enviarEmail);
exports.default = router;
