// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SuiEvent } from "@mysten/sui/client";
import { supabase } from "../config/supabase";

type NFTEvent = NFTMinted | NFTListed | NFTUnlisted | NFTPurchased;

type NFTMinted = {
  nft_id: string;
  owner: string;
  property_info: string;
};

type NFTListed = {
  nft_id: string;
  owner: string;
  price: number;
};

type NFTUnlisted = {
  nft_id: string;
  owner: string;
};

type NFTPurchased = {
  nft_id: string;
  buyer: string;
  seller: string;
  price: number;
};

type NFTUpdate = {
  object_id: string;
  owner?: string;
  listing_price?: number;
  is_listed?: boolean;
};

/**
 * Handles all events emitted by the `lock` module.
 * Data is modelled in a way that allows writing to the db in any order (DESC or ASC) without
 * resulting in data incosistencies.
 * We're constructing the updates to support multiple events involving a single record
 * as part of the same batch of events (but using a single write/record to the DB).
 * */
export const handleNFTObjects = async (events: SuiEvent[], type: string) => {
  const updates: Record<string, NFTUpdate> = {};

  for (const event of events) {
    if (!event.type.startsWith(type))
      throw new Error("Invalid event module origin");
    const data = event.parsedJson as NFTEvent;

    if (!Object.hasOwn(updates, data.nft_id)) {
      updates[data.nft_id] = {
        object_id: data.nft_id,
      };
    }

    // Handle event
    updates[data.nft_id].object_id = data.nft_id;

    if ("property_info" in data) {
      // NFTMinted event
      updates[data.nft_id].owner = data.owner;
      updates[data.nft_id].is_listed = false;
      updates[data.nft_id].listing_price = 0;
    } else if ("price" in data && !("buyer" in data)) {
      // NFTListed event
      updates[data.nft_id].is_listed = true;
      updates[data.nft_id].listing_price = data.price;
    } else if ("owner" in data && !("price" in data)) {
      // NFTUnlisted event
      updates[data.nft_id].is_listed = false;
      updates[data.nft_id].listing_price = 0;
    } else if ("buyer" in data) {
      // NFTPurchased event
      updates[data.nft_id].owner = data.buyer;
      updates[data.nft_id].is_listed = false;
      updates[data.nft_id].listing_price = 0;
    }
  }

  // Update Supabase
  const supabasePromises = Object.values(updates).map(async (update) => {
    try {
      // Kiểm tra xem object_id đã tồn tại chưa trước khi chèn
      const { data: existingRecord, error: selectError } = await supabase
        .from("nft")
        .select("object_id")
        .eq("object_id", update.object_id)
        .limit(1);

      if (selectError) {
        console.error(
          "[NFT] Error checking existence in Supabase:",
          selectError
        );
        throw selectError;
      }

      if (!existingRecord || existingRecord.length === 0) {
        // Insert if no existence
        const { error: insertError } = await supabase.from("nft").insert({
          ...update,
          updated_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error("[NFT] Error inserting to Supabase:", insertError);
          throw insertError;
        }
      } else {
        // Update if exists
        const { error: updateError } = await supabase
          .from("nft")
          .update({
            ...update,
            updated_at: new Date().toISOString(),
          })
          .eq("object_id", update.object_id);

        if (updateError) {
          console.error("[NFT] Error updating in Supabase:", updateError);
          throw updateError;
        }
      }
    } catch (e) {
      console.error("[NFT] Failed operation on Supabase:", e);
      throw e;
    }
  });

  await Promise.all(supabasePromises);
};
