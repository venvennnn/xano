table evidence {
  auth = false
  schema {
    int id
    timestamp created_at?=now
    int case_id
    text type
    text title
    text content
    int submitted_by
  }
  index = [{type: "primary", field: [{name: "id"}]}]
}
