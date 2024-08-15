import * as Contracts from './contract';
import * as Clients from './client';
import * as Radius from './radius';
import * as Groups from './group';

export function GetContracts(clientId: string): Promise<string> {
    return Contracts.getContracts(clientId);
}

export function GetClient(id: string): Promise<string> {
    return Clients.getClient(id);
}

export function GetClientsByGroup(groupId: string): Promise<string> {
    return Clients.getClientsByGroup(groupId);
}

export function GetOnlineClient(id: string): Promise<string> {
    return Radius.getOnlineClient(id);
}

export function GetGroups(query: string): Promise<string> {
    return Groups.getGroups(query);
}
