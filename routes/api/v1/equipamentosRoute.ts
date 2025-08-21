import { MySQLReturnNullError } from '../../../errors/MySQLErrors';
import { Request, Response } from 'express-serve-static-core';
import api = require('../../../api/index');
import * as Express from 'express';

const EQUIPAMENTOS = Express.Router();

// Rota para buscar todos os tipos de equipamento
EQUIPAMENTOS.get('/tipos', async (req: Request, res: Response) => {
    try {
        let response: any = await api.v1.GetTiposEquipamento();
        return res.json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para buscar equipamentos
EQUIPAMENTOS.get('/', async (req: Request, res: Response) => {
    try {
        const searchTerm = req.query.search as string;
        let response: any = await api.v1.GetEquipamentos(searchTerm);
        return res.json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para cadastrar um novo equipamento
EQUIPAMENTOS.post('/', async (req: Request, res: Response) => {
    try {
        const equipamentoData = req.body;
        let response = await api.v1.PostEquipamento(equipamentoData);
        return res.status(201).json(response);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para atualizar um equipamento existente
EQUIPAMENTOS.put('/:id', async (req: Request, res: Response) => {
    try {
        const equipamentoId = +req.params.id;
        const equipamentoData = req.body;
        equipamentoData.id_equipamento = equipamentoId;

        let response = await api.v1.PutEquipamento(equipamentoData);
        if (response.affectedRows > 0) {
            return res.status(200).json({ message: 'Equipamento atualizado com sucesso!' });
        }
        return res.status(404).json({ error: 'Equipamento não encontrado.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

// Rota para deletar um equipamento
EQUIPAMENTOS.delete('/:id', async (req: Request, res: Response) => {
    try {
        await api.v1.DeleteEquipamento(+req.params.id);
        return res.status(204).json();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
});

export default EQUIPAMENTOS;
