"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResearchAnswers = exports.postResearch = exports.getResearch = void 0;
const mysql_1 = require("mysql");
function getResearch(MySQL, researchId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT * FROM saleResearch WHERE researchId = ${(0, mysql_1.escape)(researchId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                if (!response || response.length == 0) {
                    return resolve(null);
                }
                return resolve(response[0]);
            });
        });
    });
}
exports.getResearch = getResearch;
function postResearch(MySQL, research) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `INSERT INTO saleResearch (howMetId, reasonId,
        serviceProviderId, satisfactionId, handout, facebook, instagram)
        VALUES (${(0, mysql_1.escape)(research.howMetId)}, ${(0, mysql_1.escape)(research.reasonId)},
        ${(0, mysql_1.escape)(research.serviceProviderId)}, ${(0, mysql_1.escape)(research.satisfactionId)},
        ${(0, mysql_1.escape)(research.handout)}, ${(0, mysql_1.escape)(research.facebook)}, ${(0, mysql_1.escape)(research.instagram)});`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.postResearch = postResearch;
function getResearchAnswers(MySQL, questionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT * FROM saleResearchAnswer WHERE questionId = ${(0, mysql_1.escape)(questionId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getResearchAnswers = getResearchAnswers;
