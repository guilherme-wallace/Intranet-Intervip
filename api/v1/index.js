"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostContract = exports.PostPostalCode = exports.PostAddress = exports.GetSalespeople = exports.GetTechnologies = exports.GetResearchAnswers = exports.GetResearch = exports.PostSale = exports.GetSalesperson = exports.GetSalesByContract = exports.GetSalesByClient = exports.GetContracts = exports.GetPlans = exports.GetGroupAddress = exports.PostGroup = exports.GetGroup = exports.GetGroups = exports.GetClientAuth = exports.GetClient = exports.GetClients = exports.GetStructures = exports.PostViabilitys = exports.PostBlocks = exports.DeleteBlocks = exports.GetBlocks = exports.GetTypes = void 0;
var Salespeople = require("./salesperson");
var Technologies = require("./technology");
var Viabilitys = require("./viability");
var Researches = require("./research");
var Contracts = require("./contract");
var Addresses = require("./address");
var Clients = require("./client");
var Blocks = require("./block");
var Groups = require("./group");
var Sails = require("./sale");
var database_1 = require("../database");
function GetTypes() {
    return Blocks.getTypes(database_1.LOCALHOST);
}
exports.GetTypes = GetTypes;
function GetBlocks(groupId) {
    return Blocks.getBlocks(database_1.LOCALHOST, groupId);
}
exports.GetBlocks = GetBlocks;
function DeleteBlocks(blockId) {
    return Blocks.deleteBlocks(database_1.LOCALHOST, blockId);
}
exports.DeleteBlocks = DeleteBlocks;
function PostBlocks(blocks) {
    return Blocks.postBlocks(database_1.LOCALHOST, blocks);
}
exports.PostBlocks = PostBlocks;
function PostViabilitys(viabilitys) {
    return Viabilitys.postViabilitys(database_1.LOCALHOST, viabilitys);
}
exports.PostViabilitys = PostViabilitys;
function GetStructures() {
    return Blocks.getStructures(database_1.LOCALHOST);
}
exports.GetStructures = GetStructures;
function GetClients(groupId) {
    return Clients.getClients(database_1.ROUTERBOX, groupId);
}
exports.GetClients = GetClients;
function GetClient(clientId) {
    return Clients.getClient(database_1.ROUTERBOX, clientId);
}
exports.GetClient = GetClient;
function GetClientAuth(clientId, username) {
    return Clients.getClientAuth(database_1.ROUTERBOX, clientId, username);
}
exports.GetClientAuth = GetClientAuth;
function GetGroups(query) {
    return Groups.getGroups(database_1.ROUTERBOX, query);
}
exports.GetGroups = GetGroups;
function GetGroup(groupId) {
    return Groups.getGroup(database_1.LOCALHOST, groupId);
}
exports.GetGroup = GetGroup;
function PostGroup(group) {
    return Groups.postGroup(database_1.LOCALHOST, group);
}
exports.PostGroup = PostGroup;
function GetGroupAddress(groupId) {
    return Groups.getGroupAddress(database_1.ROUTERBOX, groupId);
}
exports.GetGroupAddress = GetGroupAddress;
function GetPlans(groupId) {
    return Groups.getPlans(database_1.ROUTERBOX, groupId);
}
exports.GetPlans = GetPlans;
function GetContracts(clientId, status) {
    return status
        ? Contracts.getContracts(database_1.ROUTERBOX, clientId, status)
        : Contracts.getContracts(database_1.ROUTERBOX, clientId);
}
exports.GetContracts = GetContracts;
function GetSalesByClient(clientId) {
    return Sails.getSalesByClient(database_1.LOCALHOST, clientId);
}
exports.GetSalesByClient = GetSalesByClient;
function GetSalesByContract(contractId) {
    return Sails.getSalesByContract(database_1.LOCALHOST, contractId);
}
exports.GetSalesByContract = GetSalesByContract;
function GetSalesperson(salespersonId) {
    return Salespeople.getSalesperson(database_1.LOCALHOST, salespersonId);
}
exports.GetSalesperson = GetSalesperson;
function PostSale(sale) {
    return Sails.postSale(database_1.LOCALHOST, sale);
}
exports.PostSale = PostSale;
function GetResearch(researchId) {
    return Researches.getResearch(database_1.LOCALHOST, researchId);
}
exports.GetResearch = GetResearch;
function GetResearchAnswers(questionId) {
    return Researches.getResearchAnswers(database_1.LOCALHOST, questionId);
}
exports.GetResearchAnswers = GetResearchAnswers;
function GetTechnologies() {
    return Technologies.getTechnologies(database_1.LOCALHOST);
}
exports.GetTechnologies = GetTechnologies;
function GetSalespeople(query) {
    return Salespeople.getSalespeople(database_1.LOCALHOST, query);
}
exports.GetSalespeople = GetSalespeople;
function PostAddress(address) {
    return Addresses.postAddress(database_1.LOCALHOST, address);
}
exports.PostAddress = PostAddress;
function PostPostalCode(postalCode) {
    return Addresses.postPostalCode(database_1.LOCALHOST, postalCode);
}
exports.PostPostalCode = PostPostalCode;
function PostContract(contract) {
    return Contracts.postContract(database_1.LOCALHOST, contract);
}
exports.PostContract = PostContract;
