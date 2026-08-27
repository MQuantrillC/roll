"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DecisionMode, GroupSettings } from "@/lib/types";
import { ShareCode } from "@/components/groups/share-code";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { UserMinus } from "lucide-react";

interface MemberRow {
  memberId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
}

const MODE_OPTIONS: { value: DecisionMode; label: string }[] = [
  { value: "balanced_random", label: "⚖️ Balanced Random" },
  { value: "auto", label: "✨ Just Decide" },
  { value: "pure_random", label: "🎡 Pure Random" },
  { value: "head_to_head", label: "⚔️ Head-to-Head" },
  { value: "mutual_match", label: "❤️ Mutual Match" },
];

export function GroupSettingsForm({
  groupId,
  userId,
  isAdmin,
  name: initialName,
  code,
  settings: initialSettings,
  members: initialMembers,
}: {
  groupId: string;
  userId: string;
  isAdmin: boolean;
  name: string;
  code: string;
  settings: GroupSettings;
  members: MemberRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [settings, setSettings] = useState<GroupSettings>({
    default_mode: initialSettings.default_mode ?? "balanced_random",
    default_picks_per_person: initialSettings.default_picks_per_person ?? 5,
    avoid_recent: initialSettings.avoid_recent ?? true,
    recent_window_days: initialSettings.recent_window_days ?? 7,
  });
  const [members, setMembers] = useState(initialMembers);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveAll() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("groups")
      .update({ name: name.trim(), settings })
      .eq("id", groupId);
    setBusy(false);
    setMsg(error ? "Couldn't save — only the group creator can edit settings." : "Saved ✓");
    if (!error) router.refresh();
  }

  async function removeMember(m: MemberRow) {
    const supabase = createClient();
    setMembers((prev) => prev.filter((x) => x.memberId !== m.memberId));
    const { error } = await supabase.from("group_members").delete().eq("id", m.memberId);
    if (error) setMembers((prev) => [...prev, m]);
  }

  async function leaveGroup() {
    const mine = members.find((m) => m.userId === userId);
    if (!mine) return;
    const supabase = createClient();
    const { error } = await supabase.from("group_members").delete().eq("id", mine.memberId);
    if (!error) router.push("/home");
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">Group settings</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-bold">Group name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={!isAdmin} />
          </div>
          <div>
            <div className="mb-1.5 text-sm font-bold">Group code</div>
            <ShareCode code={code} groupName={name} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <h2 className="font-extrabold">Decision preferences</h2>

          <div>
            <label className="mb-1.5 block text-sm font-bold">Default mode</label>
            <div className="grid grid-cols-1 gap-1.5">
              {MODE_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSettings((s) => ({ ...s, default_mode: m.value }))}
                  disabled={!isAdmin}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-60",
                    settings.default_mode === m.value ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold">
              Default picks per person: {settings.default_picks_per_person}
            </label>
            <input
              type="range"
              min={3}
              max={10}
              value={settings.default_picks_per_person}
              disabled={!isAdmin}
              onChange={(e) =>
                setSettings((s) => ({ ...s, default_picks_per_person: Number(e.target.value) }))
              }
              className="w-full accent-[var(--primary)]"
            />
          </div>

          <button
            onClick={() => isAdmin && setSettings((s) => ({ ...s, avoid_recent: !s.avoid_recent }))}
            className="flex items-center justify-between text-sm font-semibold"
            type="button"
          >
            Avoid recently selected items
            <span
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                settings.avoid_recent ? "bg-primary" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                  settings.avoid_recent ? "left-[22px]" : "left-0.5"
                )}
              />
            </span>
          </button>

          {settings.avoid_recent && (
            <div>
              <label className="mb-1.5 block text-sm font-bold">
                Recent window: {settings.recent_window_days} days
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={settings.recent_window_days}
                disabled={!isAdmin}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, recent_window_days: Number(e.target.value) }))
                }
                className="w-full accent-[var(--primary)]"
              />
            </div>
          )}

          {isAdmin && (
            <Button onClick={saveAll} disabled={busy}>
              {busy ? <Spinner /> : "Save settings"}
            </Button>
          )}
          {msg && <p className="text-sm font-medium text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <h2 className="font-extrabold">Members</h2>
          {members.map((m) => (
            <div key={m.memberId} className="flex items-center gap-3">
              <Avatar name={m.name} src={m.avatarUrl} size="sm" />
              <span className="flex-1 font-semibold">
                {m.name}
                {m.userId === userId && (
                  <span className="ml-1.5 text-xs font-semibold text-primary">you</span>
                )}
              </span>
              {isAdmin && m.userId !== userId && (
                <button
                  onClick={() => removeMember(m)}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-red-500 hover:bg-red-500/10"
                >
                  <UserMinus className="size-4" /> Remove
                </button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={leaveGroup}>
        Leave group
      </Button>
    </main>
  );
}
