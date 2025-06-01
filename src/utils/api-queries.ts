// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { CONFIG } from "../config";

export type ApiPagination = {
  page: number;
  limit: number;
};

export enum WhereParamTypes {
  STRING,
  NUMBER,
  BOOLEAN,
}

export type WhereParam = {
  key: string;
  type: WhereParamTypes;
};

/**
 * A helper to prepare pagination based on `req.query`.
 */
export const parsePaginationForQuery = (
  body: Record<string, any>
): ApiPagination | null => {
  const page = Number(body.page) || 1;
  const limit = Number(body.limit) || CONFIG.DEFAULT_LIMIT;

  if (isNaN(page) || isNaN(limit)) {
    return null;
  }

  return {
    page,
    limit: limit > CONFIG.DEFAULT_LIMIT ? CONFIG.DEFAULT_LIMIT : limit,
  };
};

/** Parses a where statement based on the query params. */
export const parseWhereStatement = (
  query: Record<string, any>,
  acceptedParams: WhereParam[]
) => {
  const params: Record<string, any> = {};
  for (const key of Object.keys(query)) {
    const whereParam = acceptedParams.find((x) => x.key === key);
    if (!whereParam) continue;

    const value = query[key];
    if (whereParam.type === WhereParamTypes.STRING) {
      params[key] = value;
    }
    if (whereParam.type === WhereParamTypes.NUMBER) {
      const number = Number(value);
      if (isNaN(number)) throw new Error(`Invalid number for ${key}`);

      params[key] = number;
    }

    // Handle boolean expected values.
    if (whereParam.type === WhereParamTypes.BOOLEAN) {
      let boolValue;
      if (value === "true") boolValue = true;
      else if (value === "false") boolValue = false;
      else throw new Error(`Invalid boolean for ${key}`);

      params[key] = boolValue;
    }
  }
  return params;
};

/**
 * Helper to format a paginated response.
 */
export const formatPaginatedResponse = (data: any[]) => {
  return {
    data,
    total: data.length,
  };
};
