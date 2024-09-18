import { Request, Response } from 'express-serve-static-core';
import { Technology } from '../../types/technology';
import { Research } from '../../types/research';
import * as Swagger from 'swagger-ui-express';
import api = require('../../api/index');
import * as Express from 'express';

import PLAN from './v3/plan';
import SALES from './v1/sale';
import BLOCK from './v1/block';
import CONDOMINIO from './v1/condominio';
import RADIUS from './v4/radius';
import CONDOMINIO_V4 from './v4/condominio';
import ADDRESS from './v1/address';
import CLIENT_V1 from './v1/client';
import CLIENT_V4 from './v4/client';
import VIABILITY from './v1/viability';
import CONTRACT_V1 from './v1/contract';
import CONTRACT_V2 from './v2/contract';
import CONTRACT_V4 from './v4/contract';
import SALESPERSON from './v1/salesperson';

const SWAGGER_UI = Swagger;
const ROUTER = Express.Router();
const SWAGGER_DOC = require('../../swagger.json');

ROUTER.use('/', SWAGGER_UI.serve);
ROUTER.get('/', SWAGGER_UI.setup(SWAGGER_DOC));

ROUTER.use('/v3/plan', PLAN);
ROUTER.use('/v1/sale', SALES);
ROUTER.use('/v1/block', BLOCK);
ROUTER.use('/v1/condominio', CONDOMINIO);
ROUTER.use('/v4/radius', RADIUS);
ROUTER.use('/v4/condominio', CONDOMINIO_V4);
ROUTER.use('/v1/address', ADDRESS);
ROUTER.use('/v1/client', CLIENT_V1);
ROUTER.use('/v4/client', CLIENT_V4);
ROUTER.use('/v1/viability', VIABILITY);
ROUTER.use('/v1/contract', CONTRACT_V1);
ROUTER.use('/v2/contract', CONTRACT_V2);
ROUTER.use('/v4/contract', CONTRACT_V4);
ROUTER.use('/v1/salesperson', SALESPERSON);

ROUTER.get('/v1/type', async (_req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetTypes();
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/structures', async (_req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetStructures();
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/address/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetCondominioAddress(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/plan/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetPlans(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v2/plan/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v2.GetPlans(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/research/:id', async (req: Request, res: Response, next) => {
    try {
        let response: Research | null = await api.v1.GetResearch(+req.params.id);

        if (response) {
            return res.json(response);
        }

        return res.status(404).json({error: 'Not found.'});
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/research/answer/:id', async (req: Request, res: Response, next) => {
    try {
        let response: string = await api.v1.GetResearchAnswers(+req.params.id);
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.get('/v1/technology', async (req: Request, res: Response, next) => {
    try {
        let response: Technology[] = await api.v1.GetTechnologies();
        res.json(response);
    }

    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Internal server error."});
    }
});

ROUTER.put('/v1/block/:id', async (req: Request, res: Response, next) => {
    try {
        const blockId = +req.params.id;
        const blockData = req.body;
        blockData.blockId = blockId; // Certifique-se de que o blockId está incluído nos dados

        let response = await api.v1.PutBlock(blockData);

        if (response.affectedRows > 0) {
            return res.status(200).json({ message: 'Bloco atualizado com sucesso!' });
        }

        return res.status(404).json({ error: 'Bloco não encontrado.' });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


export default ROUTER;