table precedents {
  auth = false
  description = "Reusable resolution logic"

  schema {
    int id
    timestamp created_at?=now
    int case_id
    int metric_id
    text title
    text rule
    text[] applies_to_drift
  }

  index = [{type: "primary", field: [{name: "id"}]}]
}
