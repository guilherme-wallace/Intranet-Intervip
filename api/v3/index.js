"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPlans = void 0;
var Plans = require("./plan");
var database_1 = require("../database");
function GetPlans(name) {
    return Plans.getPlans(database_1.LOCALHOST, name);
}
exports.GetPlans = GetPlans;
