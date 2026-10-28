"use client";

import { useState } from "react";
import type { ActivityBucket } from "@/lib/types";
import { ActivityChart } from "./Charts";
import { Panel, Tabs } from "./Ui";

export function ActivityPanel({ weekday, hour }: { weekday: ActivityBucket[]; hour: ActivityBucket[] }) {
  const [by, setBy] = useState<"weekday" | "hour">("weekday");
  return (
    <Panel
      title="When it is active (UTC)"
      action={
        <Tabs
          value={by}
          onChange={setBy}
          options={[
            { value: "weekday", label: "Day of week" },
            { value: "hour", label: "Hour" },
          ]}
        />
      }
    >
      <ActivityChart data={by === "weekday" ? weekday : hour} unit={by === "weekday" ? "day" : "hour"} />
    </Panel>
  );
}
