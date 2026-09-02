table case_claims {
  auth = false
  schema {
    int id
    timestamp created_at?=now
    int case_id
    int claim_id
    text slot
  }
  index = [{type: "primary", field: [{name: "id"}]}]
}
