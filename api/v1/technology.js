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
exports.getTechnology = exports.getTechnologies = void 0;
const mysql_1 = require("mysql");
function getTechnologies(MySQL) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = 'SELECT * FROM technology';
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response);
            });
        });
    });
}
exports.getTechnologies = getTechnologies;
function getTechnology(MySQL, technologyId) {
    return __awaiter(this, void 0, void 0, function* () {
        const QUERY = `SELECT * FROM technology WHERE technologyId = ${(0, mysql_1.escape)(technologyId)};`;
        return new Promise((resolve, reject) => {
            MySQL.query(QUERY, (error, response) => {
                if (error)
                    return reject(error);
                return resolve(response[0]);
            });
        });
    });
}
exports.getTechnology = getTechnology;
