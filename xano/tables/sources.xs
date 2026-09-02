table sources {
  auth = false
  description = "Transcript, report, dashboard or message"

  schema {
    int id
    timestamp created_at?=now
    enum type?=transcript {
      values = ["transcript", "slack", "csv", "dashboard", "report"]
    }
    text title
    text content
  }

  index = [{type: "primary", field: [{name: "id"}]}]
}
