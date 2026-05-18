"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlans = void 0;
// api/v3/index.ts
const Plans = require("./plan");
const database_1 = require("../database");
function GetPlans(name) {
    return Plans.getPlans(database_1.LOCALHOST, name);
}
exports.GetPlans = GetPlans;
