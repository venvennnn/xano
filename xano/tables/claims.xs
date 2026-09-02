table claims {
  auth = false
  description = "Structured metric statements extracted from a source"

  schema {
    int id
    timestamp created_at?=now
    int metric_id?
    decimal matching_score?
    int source_id?
    text speaker
    text role?
    decimal value
    text unit
    text period?
    text country?
    text product?
    text population?
    text calculation_type?
    enum status?=actual {
      values = ["actual", "forecast", "approved", "completed"]
    }
    text raw_excerpt?
    text source_type?
    text source_title?
    text ambiguity?
    int team_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "metric_id", op: "asc"}, {name: "created_at", op: "desc"}]}
  ]
}
