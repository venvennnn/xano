table appeals {
  auth = false
  schema {
    int id
    timestamp created_at?=now
    int case_id
    int? verdict_id
    text reason
    enum status?=open { values = ["open", "upheld", "overturned"] }
    int filed_by
  }
  index = [{type: "primary", field: [{name: "id"}]}]
}
