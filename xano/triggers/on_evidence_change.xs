table_trigger on_evidence_change {
  table = "evidence"
  description = "Create an audit event when evidence is added."
  input {
    json new
    json old
    enum action {
      values = ["insert", "update", "delete", "truncate"]
    }
    text datasource
  }

  stack {
    db.add audit_events {
      data = {
        actor_id: $input.new.submitted_by
        action: "evidence.added"
        entity_type: "evidence"
        entity_id: $input.new.id
        detail: $input.new.title
      }
    } as $audit
  }

  actions = {insert: true, update: true}
}
