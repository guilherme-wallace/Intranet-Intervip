import * as Salespeople from './salesperson';
import * as Technologies from './technology';
import * as Viabilitys from './viability';
import * as Researches from './research';
import * as Contracts from './contract';
import * as Addresses from './address';
import * as Clients from './client';
import * as Blocks from './block';
import * as Groups from './group';
import * as Sails from './sale';

import { Salesperson } from '../../types/salesperson';
import { Technology } from '../../types/technology';
import { Viability } from '../../types/viability';
import { Contract } from '../../types/contract';
import { Research } from '../../types/research';
import { Address } from '../../types/address';
import { Group } from '../../types/group';
import { Block } from '../../types/block';
import { Sale } from '../../types/sale';

import { MySQLResponse } from '../../types/mysql-response';
import { LOCALHOST, ROUTERBOX } from '../database';

export function GetTypes(): Promise<string> {
    return Blocks.getTypes(LOCALHOST);
}

export function GetBlocks(groupId: number): Promise<string> {
    return Blocks.getBlocks(LOCALHOST, groupId);
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

export function GetClients(groupId: number): Promise<string> {
    return Clients.getClients(ROUTERBOX, groupId);
}

export function GetClient(clientId: number): Promise<string> {
    return Clients.getClient(ROUTERBOX, clientId);
}

export function GetClientAuth(clientId: number, username: string): Promise<string> {
    return Clients.getClientAuth(ROUTERBOX, clientId, username);
}

export function GetGroups(query?: string): Promise<Group[]> {
    return Groups.getGroups(ROUTERBOX, query);
}

export function GetGroup(groupId: number): Promise<Group> {
    return Groups.getGroup(LOCALHOST, groupId);
}

export function PostGroup(group: Group): Promise<MySQLResponse> {
    return Groups.postGroup(LOCALHOST, group);
}

export function GetGroupAddress(groupId: number): Promise<string> {
    return Groups.getGroupAddress(ROUTERBOX, groupId);
}

export function GetPlans(groupId: number): Promise<string> {
    return Groups.getPlans(ROUTERBOX, groupId);
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
