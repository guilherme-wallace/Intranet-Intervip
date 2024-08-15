import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import { MySQLResponse } from '../../../types/mysql-response';
import api = require('../../../api/index');
import * as Express from 'express';

const BLOCK = Express.Router();

BLOCK.get('/:id', async (req: Request, res: Response) => {
    try {
        let response: string = await api.v1.GetBlocks(+req.params.id);
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

BLOCK.post('/', async (req: Request, res: Response) => {
    try {
        let response: MySQLResponse = await api.v1.PostBlocks(req.body);
        return res.status(201).json(response);
    }

    catch (error) {
        if (error.code.startsWith('ER_NO_REFERENCED_ROW')) {
            await api.v1.PostGroup(req.body[0].group);
            return res.status(201).json(await api.v1.PostBlocks(req.body));
        }

        else if (error.code == 'ER_BAD_NULL_ERROR') {
            return res.status(400).json({error: 'Invalid object.'});
        }

        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

BLOCK.delete('/:id', async (req: Request, res: Response) => {
    try {
        await api.v1.DeleteBlocks(+req.params.id);
        return res.status(204).json();
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

export default BLOCK;