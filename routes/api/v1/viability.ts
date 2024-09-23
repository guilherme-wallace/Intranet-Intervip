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
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Número de telefone já foi inserido.' });
        }

        console.error(error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});


export default VIABILITY;