"use strict";
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupListeners = void 0;
const config_1 = require("../config");
const supabase_1 = require("../config/supabase");
const sui_utils_1 = require("../sui-utils");
const property_handler_1 = require("./property-handler");
const EVENTS_TO_TRACK = [
    {
        type: `${config_1.CONFIG.PROPERTY_CONTRACT}::property_nft`,
        filter: {
            MoveModule: {
                module: "property_nft",
                package: config_1.CONFIG.PROPERTY_CONTRACT,
            },
        },
        callback: property_handler_1.handleNFTObjects,
        maxRetries: 3,
    },
];
const executeEventJob = async (client, tracker, cursor) => {
    try {
        console.log(`[${tracker.type}] Fetching events with cursor:`, cursor);
        // get the events from the chain.
        // For this implementation, we are going from start to finish.
        // This will also allow filling in a database from scratch!
        const { data, hasNextPage, nextCursor } = await client.queryEvents({
            query: tracker.filter,
            cursor,
            order: "ascending",
        });
        console.log(`[${tracker.type}] Fetched ${data.length} events`);
        // handle the data transformations defined for each event
        await tracker.callback(data, tracker.type);
        // We only update the cursor if we fetched extra data (which means there was a change).
        if (nextCursor && data.length > 0) {
            await saveLatestCursor(tracker, nextCursor);
            console.log(`[${tracker.type}] Updated cursor to:`, nextCursor);
            return {
                cursor: nextCursor,
                hasNextPage,
            };
        }
    }
    catch (e) {
        console.error(`[${tracker.type}] Error processing events:`, e);
        return {
            cursor,
            hasNextPage: false,
            error: e instanceof Error ? e : new Error(String(e)),
        };
    }
    // By default, we return the same cursor as passed in.
    return {
        cursor,
        hasNextPage: false,
    };
};
const runEventJob = async (client, tracker, cursor) => {
    const result = await executeEventJob(client, tracker, cursor);
    if (result.error &&
        (!tracker.retryCount || tracker.retryCount < (tracker.maxRetries || 3))) {
        tracker.retryCount = (tracker.retryCount || 0) + 1;
        console.log(`[${tracker.type}] Retrying (${tracker.retryCount}/${tracker.maxRetries})...`);
        const retryDelay = Math.min(1000 * Math.pow(2, tracker.retryCount), 30000);
        setTimeout(() => {
            runEventJob(client, tracker, cursor);
        }, retryDelay);
        return;
    }
    if (!result.error) {
        tracker.retryCount = 0;
    }
    // Trigger a timeout. Depending on the result, we either wait 0ms or the polling interval.
    setTimeout(() => {
        runEventJob(client, tracker, result.cursor);
    }, result.hasNextPage ? 0 : config_1.CONFIG.POLLING_INTERVAL_MS);
};
/**
 * Gets the latest cursor for an event tracker from Supabase
 */
const getLatestCursor = async (tracker) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from("cursors_nft")
            .select("*")
            .eq("id", tracker.type)
            .single();
        if (error)
            throw error;
        console.log(`[${tracker.type}] Retrieved cursor from DB:`, data);
        return data && data.event_seq && data.tx_digest
            ? {
                eventSeq: data.event_seq,
                txDigest: data.tx_digest,
            }
            : undefined;
    }
    catch (e) {
        console.error(`[${tracker.type}] Error getting cursor from DB:`, e);
        return undefined;
    }
};
/**
 * Saves the latest cursor for an event tracker to Supabase
 */
const saveLatestCursor = async (tracker, cursor) => {
    try {
        const data = {
            id: tracker.type,
            event_seq: cursor.eventSeq,
            tx_digest: cursor.txDigest,
        };
        const { data: result, error } = await supabase_1.supabase
            .from("cursors_nft")
            .upsert(data)
            .select()
            .single();
        if (error)
            throw error;
        console.log(`[${tracker.type}] Saved cursor to DB:`, result);
        return result;
    }
    catch (e) {
        console.error(`[${tracker.type}] Error saving cursor to DB:`, e);
        throw e;
    }
};
/// Sets up all the listeners for the events we want to track.
/// They are polling the RPC endpoint every second.
const setupListeners = async () => {
    console.log("Setting up event listeners...");
    for (const event of EVENTS_TO_TRACK) {
        console.log(`Initializing listener for ${event.type}`);
        runEventJob((0, sui_utils_1.getClient)(config_1.CONFIG.NETWORK), event, await getLatestCursor(event));
    }
    console.log("Event listeners setup completed");
};
exports.setupListeners = setupListeners;
