import { Contract } from '../../types/contract';
import * as Contracts from './contract';
import * as Groups from './group';

import { ROUTERBOX } from '../database';

export function GetContracts(clientId: number, status?: string): Promise<Contract[]> {
    return status
        ? Contracts.getContracts(ROUTERBOX, clientId, status)
        : Contracts.getContracts(ROUTERBOX, clientId);
}

export function GetPlans(groupId: number): Promise<string> {
    return Groups.getPlans(ROUTERBOX, groupId);
}
