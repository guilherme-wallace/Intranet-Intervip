"use strict";
// routes/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var ROUTER = express.Router();
ROUTER.get('/', function (req, res) {
    var path = req.baseUrl.substring(1);
    res.sendFile("".concat(path == '' ? 'index' : path, ".html"), { root: 'views' });
});
exports.default = ROUTER;
