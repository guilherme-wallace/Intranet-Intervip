import * as Salespeople from './salesperson';
import * as Technologies from './technology';
import * as Viabilitys from './viability';
import * as Researches from './research';
import * as Contracts from './contract';
import * as Addresses from './address';
import * as Clients from './client';
import * as Blocks from './block';
import * as Condominios from './condominio';
import * as Sails from './sale';
import * as Equipamentos from './equipamentosAPI';

import { Salesperson } from '../../types/salesperson';
import { Technology } from '../../types/technology';
import { Viability } from '../../types/viability';
import { Contract } from '../../types/contract';
import { Research } from '../../types/research';
import { Address } from '../../types/address';
import { Condominio } from '../../types/condominio';
import { Block } from '../../types/block';
import { Sale } from '../../types/sale';
import { Equipamento, TipoEquipamento } from '../../types/equipamentosType';

import { MySQLResponse } from '../../types/mysql-response';
import { LOCALHOST, ROUTERBOX } from '../database';

export function GetTypes(): Promise<string> {
    return Blocks.getTypes(LOCALHOST);
}

export function GetBlocks(condominioId: number): Promise<string> {
    return Blocks.getBlocks(LOCALHOST, condominioId);
}

export function PutBlock(block: Block): Promise<MySQLResponse> {
    return Blocks.putBlock(LOCALHOST, block);
}

export function DeleteBlocks(blockId: number): Promise<string> {
    return Blocks.deleteBlocks(LOCALHOST, blockId);
}

export function PostBlocks(blocks: Block[]): Promise<MySQLResponse> {
    return Blocks.postBlocks(LOCALHOST, blocks);
}

export function PostViabilitys(viabilitys: Viability[]): Promise<MySQLResponse> {
    return Viabilitys.postViabilitys(LOCALHOST, viabilitys);
}

export function GetStructures(): Promise<string> {
    return Blocks.getStructures(LOCALHOST);
}

export function GetClients(condominioId: number): Promise<string> {
    return Clients.getClients(ROUTERBOX, condominioId);
}

export function GetClient(clientId: number): Promise<string> {
    return Clients.getClient(ROUTERBOX, clientId);
}

export function GetClientAuth(clientId: number, username: string): Promise<string> {
    return Clients.getClientAuth(ROUTERBOX, clientId, username);
}

export function GetCondominios(query?: string): Promise<Condominio[]> {
    return Condominios.getCondominios(ROUTERBOX, query);
}

export function GetCondominio(condominioId: number): Promise<Condominio> {
    return Condominios.getCondominio(LOCALHOST, condominioId);
}

export function PostCondominio(condominio: Condominio): Promise<MySQLResponse> {
    return Condominios.postCondominio(LOCALHOST, condominio);
}

export function GetCondominioAddress(condominioId: number): Promise<string> {
    return Condominios.getCondominioAddress(ROUTERBOX, condominioId);
}

export function GetPlans(condominioId: number): Promise<string> {
    return Condominios.getPlans(ROUTERBOX, condominioId);
}

export function GetContracts(clientId: number, status?: string): Promise<string> {
    return status
        ? Contracts.getContracts(ROUTERBOX, clientId, status)
        : Contracts.getContracts(ROUTERBOX, clientId);
}

export function GetSalesByClient(clientId: number): Promise<Sale[]> {
    return Sails.getSalesByClient(LOCALHOST, clientId);
}

export function GetSalesByContract(contractId: string): Promise<Sale[]> {
    return Sails.getSalesByContract(LOCALHOST, contractId);
}

export function GetSalesperson(salespersonId: number): Promise<Salesperson> {
    return Salespeople.getSalesperson(LOCALHOST, salespersonId);
}

export function PostSale(sale: Sale): Promise<MySQLResponse> {
    return Sails.postSale(LOCALHOST, sale);
}

export function GetResearch(researchId: number): Promise<Research | null> {
    return Researches.getResearch(LOCALHOST, researchId);
}

export function GetResearchAnswers(questionId: number): Promise<string> {
    return Researches.getResearchAnswers(LOCALHOST, questionId);
}

export function GetTechnologies(): Promise<Technology[]> {
    return Technologies.getTechnologies(LOCALHOST);
}

export function GetSalespeople(query: string): Promise<Salesperson[]> {
    return Salespeople.getSalespeople(LOCALHOST, query);
}

export function PostAddress(address: Address): Promise<MySQLResponse> {
    return Addresses.postAddress(LOCALHOST, address);
}

export function PostPostalCode(postalCode: string): Promise<MySQLResponse> {
    return Addresses.postPostalCode(LOCALHOST, postalCode);
}

export function PostContract(contract: Contract): Promise<MySQLResponse> {
    return Contracts.postContract(LOCALHOST, contract);
}

export function GetTiposEquipamento(): Promise<TipoEquipamento[]> {
    return Equipamentos.getTiposEquipamento(LOCALHOST);
}

export function GetEquipamentos(searchTerm?: string): Promise<Equipamento[]> {
    return Equipamentos.getEquipamentos(LOCALHOST, searchTerm);
}

export function PostEquipamento(equipamento: Equipamento): Promise<MySQLResponse> {
    return Equipamentos.postEquipamento(LOCALHOST, equipamento);
}

export function PutEquipamento(equipamento: Equipamento): Promise<MySQLResponse> {
    return Equipamentos.putEquipamento(LOCALHOST, equipamento);
}

export function DeleteEquipamento(equipamentoId: number): Promise<string> {
    return Equipamentos.deleteEquipamento(LOCALHOST, equipamentoId);
}
