// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Network } from "./sui-utils";

/**
 * A default configuration
 * You need to call `publish-contracts.ts` before running any functionality
 * depends on it, or update our imports to not use these json files.
 * */
export const CONFIG = {
  /// Look for events every 1s
  POLLING_INTERVAL_MS: 1000,
  DEFAULT_LIMIT: 50,
  NETWORK: (process.env.NETWORK as Network) || "testnet",
  PROPERTY_CONTRACT:
    process.env.CONTRACT_ID ||
    "0x7f10901f1d00d8a3d27de000a97751671f139d8763f6cd6f0a6cd61884564a23",
};
