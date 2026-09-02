table claim_dimensions {
  auth = false
  schema {
    int id
    timestamp created_at?=now
    int claim_id
    text key
    text value
  }
  index = [{type: "primary", field: [{name: "id"}]}]
}
