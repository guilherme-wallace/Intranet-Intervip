import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import { MySQLResponse } from '../../../types/mysql-response';
import { Group } from '../../../types/group';
import api = require('../../../api/index');
import * as Express from 'express';

const GROUP = Express.Router();

GROUP.get('/', async (req: Request, res: Response, next) => {
    try {
        let response: Group[] = await api.v1.GetGroups(req.query.query?.toString() ?? null);
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

GROUP.get('/:id', async (req: Request, res: Response, next) => {
    try {
        let response: Group = await api.v1.GetGroup(+req.params.id);
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

GROUP.post('/', async (req: Request, res: Response, next) => {
    try {
        let response: MySQLResponse = await api.v1.PostGroup(req.body);
        return res.status(201).json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default GROUP;
