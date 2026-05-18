"use strict";
// routes/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const ROUTER = express.Router();
ROUTER.get('/', (req, res) => {
    var path = req.baseUrl.substring(1);
    res.sendFile(`${path == '' ? 'index' : path}.html`, { root: 'views' });
});
exports.default = ROUTER;
