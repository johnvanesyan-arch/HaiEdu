export async function recordRecommendationTelemetry(
  supabase,
  recommendation,
  eventType,
  surface,
) {
  const recommendationInstanceId = recommendation?.instanceId;
  if (!recommendationInstanceId) return { recorded: false, skipped: true };

  try {
    const { data, error } = await supabase.functions.invoke("record-recommendation-event", {
      body: { recommendationInstanceId, eventType, surface },
    });
    if (error) {
      console.warn("recommendation telemetry failed", { eventType, surface, message: error.message });
      return { recorded: false, error };
    }
    return data ?? { recorded: true };
  } catch (error) {
    console.warn("recommendation telemetry failed", { eventType, surface, error });
    return { recorded: false, error };
  }
}
