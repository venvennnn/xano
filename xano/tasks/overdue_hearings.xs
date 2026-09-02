task "overdue_hearings" {
  description = "Find overdue hearings and bump severity. Runs hourly."
  stack {
    db.query cases {
      where = ($db.cases.status == "open" || $db.cases.status == "hearing") && $db.cases.deadline < now
    } as $overdue

    foreach ($overdue) {
      each as $case {
        db.edit cases {
          field_name = "id"
          field_value = $case.id
          data = {severity: "critical"}
        } as $bumped

        db.add audit_events {
          data = {actor_id: 0, action: "hearing.overdue", entity_type: "case", entity_id: $case.id, detail: $case.case_number}
        } as $audit
      }
    }
  }
  schedule = [{starts_on: 2026-01-01 06:00:00+0000, freq: 3600}]
}
