export type LaneInput = {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

export type LaneLayout<T extends LaneInput> = T & {
  lane: number;
  lanes: number;
};

export function assignLanes<T extends LaneInput>(events: T[]): LaneLayout<T>[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => {
    const diff = a.startsAt.getTime() - b.startsAt.getTime();
    if (diff !== 0) return diff;
    return a.endsAt.getTime() - b.endsAt.getTime();
  });

  const out: Array<T & { lane: number; lanes: number }> = [];
  let cluster: Array<T & { lane: number; lanes: number }> = [];
  let clusterMaxEnd = 0;
  let activeLanes: number[] = [];

  function closeCluster() {
    const lanes = activeLanes.length || 1;
    for (const e of cluster) e.lanes = lanes;
    cluster = [];
    activeLanes = [];
    clusterMaxEnd = 0;
  }

  for (const event of sorted) {
    const start = event.startsAt.getTime();
    const end = event.endsAt.getTime();

    if (cluster.length > 0 && start >= clusterMaxEnd) {
      closeCluster();
    }

    let lane = activeLanes.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = activeLanes.length;
      activeLanes.push(end);
    } else {
      activeLanes[lane] = end;
    }

    const placed = { ...event, lane, lanes: 1 };
    cluster.push(placed);
    out.push(placed);

    if (end > clusterMaxEnd) clusterMaxEnd = end;
  }

  closeCluster();

  return out;
}
