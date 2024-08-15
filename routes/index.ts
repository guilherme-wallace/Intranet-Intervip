import { Request, Response } from 'express-serve-static-core';
import express = require('express');

const ROUTER = express.Router();

ROUTER.get('/', (req: Request, res: Response) => {
    var path: string = req.baseUrl.substring(1);
    res.sendFile(`${path == '' ? 'index' : path}.html`, { root: 'views' });
});

export default ROUTER;
