"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlans = exports.GetContracts = void 0;
const Contracts = require("./contract");
const Groups = require("./group");
const database_1 = require("../database");
function GetContracts(clientId, status) {
    return status
        ? Contracts.getContracts(database_1.ROUTERBOX, clientId, status)
        : Contracts.getContracts(database_1.ROUTERBOX, clientId);
}
exports.GetContracts = GetContracts;
function GetPlans(groupId) {
    return Groups.getPlans(database_1.ROUTERBOX, groupId);
}
exports.GetPlans = GetPlans;
