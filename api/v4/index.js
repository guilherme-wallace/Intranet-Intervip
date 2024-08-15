"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetGroups = exports.GetOnlineClient = exports.GetClientsByGroup = exports.GetClient = exports.GetContracts = void 0;
var Contracts = require("./contract");
var Clients = require("./client");
var Radius = require("./radius");
var Groups = require("./group");
function GetContracts(clientId) {
    return Contracts.getContracts(clientId);
}
exports.GetContracts = GetContracts;
function GetClient(id) {
    return Clients.getClient(id);
}
exports.GetClient = GetClient;
function GetClientsByGroup(groupId) {
    return Clients.getClientsByGroup(groupId);
}
exports.GetClientsByGroup = GetClientsByGroup;
function GetOnlineClient(id) {
    return Radius.getOnlineClient(id);
}
exports.GetOnlineClient = GetOnlineClient;
function GetGroups(query) {
    return Groups.getGroups(query);
}
exports.GetGroups = GetGroups;
