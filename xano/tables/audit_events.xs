table audit_events {
  auth = false
  description = "Immutable activity history"

  schema {
    int id
    timestamp created_at?=now
    int actor_id
    text action
    text entity_type
    int entity_id
    text detail
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}
