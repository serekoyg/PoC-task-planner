export type PlannerTarget =
  | { kind: 'event'; id: string; date: string }
  | { kind: 'todo'; id: string }
  | { kind: 'study'; id: string }
