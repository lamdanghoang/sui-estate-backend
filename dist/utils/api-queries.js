"use strict";
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPaginatedResponse = exports.parseWhereStatement = exports.parsePaginationForQuery = exports.WhereParamTypes = void 0;
const config_1 = require("../config");
var WhereParamTypes;
(function (WhereParamTypes) {
    WhereParamTypes[WhereParamTypes["STRING"] = 0] = "STRING";
    WhereParamTypes[WhereParamTypes["NUMBER"] = 1] = "NUMBER";
    WhereParamTypes[WhereParamTypes["BOOLEAN"] = 2] = "BOOLEAN";
})(WhereParamTypes || (exports.WhereParamTypes = WhereParamTypes = {}));
/**
 * A helper to prepare pagination based on `req.query`.
 */
const parsePaginationForQuery = (body) => {
    const page = Number(body.page) || 1;
    const limit = Number(body.limit) || config_1.CONFIG.DEFAULT_LIMIT;
    if (isNaN(page) || isNaN(limit)) {
        return null;
    }
    return {
        page,
        limit: limit > config_1.CONFIG.DEFAULT_LIMIT ? config_1.CONFIG.DEFAULT_LIMIT : limit,
    };
};
exports.parsePaginationForQuery = parsePaginationForQuery;
/** Parses a where statement based on the query params. */
const parseWhereStatement = (query, acceptedParams) => {
    const params = {};
    for (const key of Object.keys(query)) {
        const whereParam = acceptedParams.find((x) => x.key === key);
        if (!whereParam)
            continue;
        const value = query[key];
        if (whereParam.type === WhereParamTypes.STRING) {
            params[key] = value;
        }
        if (whereParam.type === WhereParamTypes.NUMBER) {
            const number = Number(value);
            if (isNaN(number))
                throw new Error(`Invalid number for ${key}`);
            params[key] = number;
        }
        // Handle boolean expected values.
        if (whereParam.type === WhereParamTypes.BOOLEAN) {
            let boolValue;
            if (value === "true")
                boolValue = true;
            else if (value === "false")
                boolValue = false;
            else
                throw new Error(`Invalid boolean for ${key}`);
            params[key] = boolValue;
        }
    }
    return params;
};
exports.parseWhereStatement = parseWhereStatement;
/**
 * Helper to format a paginated response.
 */
const formatPaginatedResponse = (data) => {
    return {
        data,
        total: data.length,
    };
};
exports.formatPaginatedResponse = formatPaginatedResponse;
