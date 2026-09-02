table user {
  auth = true
  description = "Judges, analysts, metric owners and administrators"

  schema {
    int id
    timestamp created_at?=now
    text name filters=trim
    email email filters=trim|lower
    password? password
    text title?
    enum role?=analyst {
      values = ["judge", "analyst", "owner", "admin"]
    }
    int team_id?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "email", op: "asc"}]}
  ]
}
