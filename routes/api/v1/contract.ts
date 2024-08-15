import { Request, Response } from 'express-serve-static-core';
import api = require('../../../api/index');
import * as Express from 'express';

const CONTRACT = Express.Router();

CONTRACT.get('/:id', async (req: Request, res: Response, next) => {
    try {
        let response = await api.v1.GetContracts(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default CONTRACT;