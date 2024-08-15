import { Salesperson } from "./salesperson";
import { Technology } from "./technology";
import { Contract } from "./contract";
import { Research } from "./research";
import { Address } from "./address";
import { Group } from "./group";

export type Sale = {
    saleId: number,
    contract: Contract,
    clientId: number,
    group: Group,
    address: Address,
    operation: string,
    technology: Technology,
    research: Research | null,
    datetime: string,
    salesperson: Salesperson,
    observation: string | null
}