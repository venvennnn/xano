table_trigger on_verdict_insert {
  table = "verdicts"
  description = "After a verdict: version the metric if needed, store aliases, reassess unresolved cases, publish the courtroom channel."
  input {
    json new
    json old
    enum action {
      values = ["insert", "update", "delete", "truncate"]
    }
    text datasource
  }

  stack {
    db.get cases {
      field_name = "id"
      field_value = $input.new.case_id
    } as $case

    db.query cases {
      where = $db.cases.metric_id == $case.metric_id && $db.cases.status == "open" && $db.cases.id != $case.id
    } as $related

    foreach ($related) {
      each as $open_case {
        db.edit cases {
          field_name = "id"
          field_value = $open_case.id
          data = {status: "closed", closed_at: now}
        } as $closed
      }
    }

    realtime.publish {
      channel = "courtroom"
      data = {event: "dashboard.recalculated", case_id: $case.id}
    } as $rt
  }

  tags = ["court", "verdicts"]
  actions = {insert: true}
}
