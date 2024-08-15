import { Request, Response } from 'express-serve-static-core';
import { Contract } from '../../../types/contract';
import api = require('../../../api/index');
import * as Express from 'express';

const CONTRACT = Express.Router();

CONTRACT.get('/:id', async (req: Request, res: Response) => {
    try {
        let response: Contract[] = await api.v2.GetContracts(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default CONTRACT;