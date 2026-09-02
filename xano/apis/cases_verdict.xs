query "cases/{case_id}/verdict" verb=POST {
  description = "Issue a human verdict. Version the definition, write precedent, reassess open cases, publish realtime."
  input {
    int case_id filters=min:1
    enum outcome {
      values = ["claim_a_authoritative", "claim_b_authoritative", "both_correct", "neither_supported", "canonical_amended", "more_evidence"]
    }
    text statement
    text population?
    text formula?
    text alias?
    text precedent_title?
    text precedent_rule?
    int issued_by
  }

  stack {
    db.get cases {
      field_name = "id"
      field_value = $input.case_id
    } as $case

    precondition ($case != null) {
      error = "Case not found"
    }

    db.add verdicts {
      data = {
        case_id   : $case.id
        outcome   : $input.outcome
        statement : $input.statement
        issued_by : $input.issued_by
        issued_at : now
      }
    } as $verdict

    conditional {
      if ($input.outcome == "both_correct" || $input.outcome == "canonical_amended") {
        db.query metric_definitions {
          where = $db.metric_definitions.metric_id == $case.metric_id
          sort = {version: "desc"}
          return = {type: "single"}
        } as $current

        db.add metric_definitions {
          data = {
            metric_id: $case.metric_id
            version  : ($current.version + 1)
            formula  : $input.formula
            population: $input.population
            calculation_type: $current.calculation_type
            unit     : $current.unit
            valid_from: now
            notes    : $input.statement
          }
        } as $def

        db.edit metrics {
          field_name = "id"
          field_value = $case.metric_id
          data = {current_definition_id: $def.id, health_status: "stable"}
        } as $metric
      }
    }

    db.add precedents {
      data = {
        case_id: $case.id
        metric_id: $case.metric_id
        title: $input.precedent_title
        rule: $input.precedent_rule
        applies_to_drift: $case.drift_types
      }
    } as $precedent

    db.edit cases {
      field_name = "id"
      field_value = $case.id
      data = {status: "closed", closed_at: now, verdict_id: $verdict.id}
    } as $closed

    db.add audit_events {
      data = {actor_id: $input.issued_by, action: "verdict.issued", entity_type: "case", entity_id: $case.id, detail: $input.statement}
    } as $audit

    realtime.publish {
      channel = "courtroom"
      data = {event: "verdict.issued", case_id: $case.id, verdict_id: $verdict.id}
    } as $rt
  }

  response = {verdict: $verdict, precedent: $precedent}
}
