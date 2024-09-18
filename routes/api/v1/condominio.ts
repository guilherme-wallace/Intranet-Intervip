import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import { MySQLResponse } from '../../../types/mysql-response';
import { Condominio } from '../../../types/condominio';
import api = require('../../../api/index');
import * as Express from 'express';

const CONDOMINIO = Express.Router();

CONDOMINIO.get('/', async (req: Request, res: Response, next) => {
    try {
        let response: Condominio[] = await api.v1.GetCondominios(req.query.query?.toString() ?? null);
        return res.json(response);
    }

    catch (error) {
        if (error instanceof MySQLReturnNullError) {
            return res.status(404).json({error: "Not found."});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

CONDOMINIO.get('/:id', async (req: Request, res: Response, next) => {
    try {
        let response: Condominio = await api.v1.GetCondominio(+req.params.id);
	return res.json(response);
    }

    catch (error) {
        if (error instanceof MySQLReturnNullError) {
            return res.status(404).json({error: "Not found."});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

CONDOMINIO.post('/', async (req: Request, res: Response, next) => {
    try {
        let response: MySQLResponse = await api.v1.PostCondominio(req.body);
        return res.status(201).json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default CONDOMINIO;
