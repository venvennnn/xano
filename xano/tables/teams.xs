table teams {
  auth = false
  description = "Finance, Sales, Risk, Product and Data"

  schema {
    int id
    timestamp created_at?=now
    text name
    text slug
  }

  index = [{type: "primary", field: [{name: "id"}]}]
}
