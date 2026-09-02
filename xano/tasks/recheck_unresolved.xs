task "recheck_unresolved" {
  description = "Reassess unresolved cases against new precedent."
  stack {
    db.query cases {
      where = $db.cases.status == "open"
    } as $open

    db.query precedents {
      sort = {created_at: "desc"}
    } as $precedents

    foreach ($open) {
      each as $case {
        foreach ($precedents) {
          each as $p {
            function.run "fn_precedent_similarity" {
              precedent = $p
              drift_types = $case.drift_types
              metric_id = $case.metric_id
            } as $sim
          }
        }
      }
    }
  }
  schedule = [{starts_on: 2026-01-01 07:00:00+0000, freq: 21600}]
}
