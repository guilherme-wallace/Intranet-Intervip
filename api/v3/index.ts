import * as Plans from './plan';

import { Plan } from '../../types/plan';

import { LOCALHOST } from '../database';

export function GetPlans(name: string): Promise<Plan[]> {
    return Plans.getPlans(LOCALHOST, name);
}