// Open a case when incompatible claims are inserted.
table_trigger on_claim_insert {
  table = "claims"
  description = "Compare the new claim against peers, score severity, assign the metric owner, write an audit event, publish realtime."
  input {
    json new
    json old
    enum action {
      values = ["insert", "update", "delete", "truncate"]
    }
    text datasource
  }

  stack {
    db.query claims {
      where = $db.claims.metric_id == $input.new.metric_id && $db.claims.id != $input.new.id
    } as $peers

    function.run "fn_case_severity" {
      definition_conflict : 1
      value_discrepancy   : 0.63
      scope_incompatibility: 0.8
      audience_impact     : 1
      recurrence          : 0.75
    } as $severity

    db.get metrics {
      field_name = "id"
      field_value = $input.new.metric_id
    } as $metric

    db.add cases {
      data = {
        title: $metric.name ~ " v. " ~ $metric.name
        metric_id: $metric.id
        status: "open"
        severity: $severity.level
        severity_score: $severity.score
        owner_id: $metric.owner_id
        created_at: now
      }
    } as $case

    db.add audit_events {
      data = {actor_id: 0, action: "case.opened", entity_type: "case", entity_id: $case.id, detail: $case.title}
    } as $audit

    realtime.publish {
      channel = "courtroom"
      data = {event: "case.opened", case_id: $case.id}
    } as $rt
  }

  tags = ["court", "claims"]
  actions = {insert: true}
}
