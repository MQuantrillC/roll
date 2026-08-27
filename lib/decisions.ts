"use client";

import { createClient } from "@/lib/supabase/client";
import type { DecisionMode, Item, ItemType } from "@/lib/types";

export interface SaveDecisionInput {
  groupId: string;
  type: ItemType;
  mode: DecisionMode;
  winner: Item;
  participantIds: string[];
  /** The pool/candidates the winner was drawn from (capped for storage). */
  candidates: Item[];
  metadata?: Record<string, unknown>;
}

/**
 * Persist a completed decision: the decision row, its participants and
 * the candidate pool. Votes in couch-mode (one shared device) are
 * aggregated into metadata; the votes table is reserved for future
 * multi-device voting.
 */
export async function saveDecision(input: SaveDecisionInput): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: decision, error } = await supabase
    .from("decisions")
    .insert({
      group_id: input.groupId,
      type: input.type,
      mode: input.mode,
      status: "complete",
      winner_item_id: input.winner.id,
      metadata: input.metadata ?? null,
      created_by: user.id,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !decision) {
    console.error("saveDecision failed", error);
    return null;
  }

  const participants = input.participantIds.map((uid) => ({
    decision_id: decision.id,
    user_id: uid,
  }));
  const candidates = input.candidates.slice(0, 60).map((item) => ({
    decision_id: decision.id,
    item_id: item.id,
    round: 1,
  }));

  // Best effort — the decision itself is already saved.
  await Promise.all([
    participants.length
      ? supabase.from("decision_participants").insert(participants)
      : Promise.resolve(),
    candidates.length
      ? supabase.from("decision_candidates").insert(candidates)
      : Promise.resolve(),
  ]);

  return decision.id;
}

export async function deleteDecision(decisionId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("decisions").delete().eq("id", decisionId);
  if (error) throw new Error(error.message);
}
