task "recurring_drift_digest" {
  description = "Daily digest: recurring-drift summaries and definitions that generate repeated disputes."
  stack {
    db.query cases {
      return = {type: "list"}
    } as $all

    debug.log {
      value = "Metric Court daily digest prepared for " ~ ($all|count) ~ " cases"
    }
  }
  schedule = [{starts_on: 2026-01-01 22:00:00+0000, freq: 86400}]
}
