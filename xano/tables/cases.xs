table cases {
  auth = false
  description = "Detected metric disagreements"

  schema {
    int id
    timestamp created_at?=now
    text case_number
    text title
    int metric_id
    enum status?=open {
      values = ["open", "hearing", "closed", "appealed"]
    }
    enum severity?=review {
      values = ["informational", "review", "high", "critical"]
    }
    int severity_score
    json severity_components?
    text[] drift_types?
    text suggested_explanation?
    int owner_id
    date deadline?
    timestamp? closed_at
    decimal? resolution_hours
    int related_precedent_id?
    int verdict_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "case_number", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}, {name: "severity_score", op: "desc"}]}
  ]
}
