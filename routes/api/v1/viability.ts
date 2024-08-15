import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { MySQLResponse } from '../../../types/mysql-response';
import { Request, Response } from 'express-serve-static-core';
import api = require('../../../api/index');
import * as Express from 'express';

const VIABILITY = Express.Router();

VIABILITY.post('/', async (req: Request, res: Response) => {
    try {
        let response: MySQLResponse = await api.v1.PostViabilitys(req.body);
        return res.status(201).json(response);
    }

    catch (error) {
       if (error) {
            return res.status(400).json({error: 'Invalid object.'});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default VIABILITY;