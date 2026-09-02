table metrics {
  auth = false
  description = "Canonical metric identity"

  schema {
    int id
    timestamp created_at?=now
    text canonical_id
    text name
    int owner_id
    text approved_source?
    enum health_status?=watch {
      values = ["stable", "watch", "disputed", "critical"]
    }
    enum unit?=percentage {
      values = ["percentage", "usd", "count", "pp"]
    }
    text default_country?
    text default_product?
    int current_definition_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "canonical_id", op: "asc"}]}
  ]
}
