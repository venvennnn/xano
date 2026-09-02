table metric_definitions {
  auth = false
  description = "Versioned formula and scope"

  schema {
    int id
    timestamp created_at?=now
    int metric_id
    int version
    text formula
    text population
    text calculation_type
    text unit
    date valid_from
    date? valid_to
    text notes?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "metric_id", op: "asc"}, {name: "version", op: "desc"}]}
  ]
}
