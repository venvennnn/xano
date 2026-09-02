table metric_aliases {
  auth = false
  description = "Alternative names and approved terminology"

  schema {
    int id
    timestamp created_at?=now
    int metric_id
    text alias
    bool approved?=true
    text source?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "alias", op: "asc"}]}
  ]
}
