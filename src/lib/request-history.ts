import type { DistributionRequest } from "./types";

export type RequestHistoryGroup = {
  id: string;
  name: string;
  requests: DistributionRequest[];
};

export function groupRequestsBySeason(requests: DistributionRequest[]): RequestHistoryGroup[] {
  const groups = new Map<string, RequestHistoryGroup>();

  requests.forEach((request) => {
    const id = request.seasonId ?? request.seasonName ?? "past-season";
    const group = groups.get(id) ?? {
      id,
      name: request.seasonName ?? "Past season",
      requests: [],
    };

    group.requests.push(request);
    groups.set(id, group);
  });

  return [...groups.values()];
}
