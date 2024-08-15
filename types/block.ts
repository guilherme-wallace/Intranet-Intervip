import { Group } from "./group";

export type Block = {
    blockId: number,
    group: Group,
    structureId: number,
    name: string,
    typeId: number,
    floors: number,
    units: number,
    initialFloor: number
}
