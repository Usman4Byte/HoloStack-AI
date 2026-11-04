export function publicAIStatus<T extends { enabled: boolean; usage: { todayActions: number } }>(status: T) {
  return { enabled: status.enabled, usage: { todayActions: status.usage.todayActions } };
}

export function publicAIResult<T extends { model: string }>(result: T): Omit<T, "model"> {
  return Object.fromEntries(Object.entries(result).filter(([key]) => key !== "model")) as Omit<T, "model">;
}
