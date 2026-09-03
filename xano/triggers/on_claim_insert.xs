// Open or join a case when an incompatible claim is inserted.
table_trigger on_claim_insert {
  table = "claims"
  description = "Compare the new claim to peers, run fn_value_difference + fn_case_severity, assign the metric owner, audit, publish realtime."
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
      return = {type: "list"}
    } as $peers

    db.query cases {
      where = $db.cases.metric_id == $input.new.metric_id && $db.cases.status == "open"
      return = {type: "single"}
    } as $existing

    db.get metrics {
      field_name = "id"
      field_value = $input.new.metric_id
    } as $metric

    conditional {
      if ($existing != null) {
        db.add case_claims {
          data = {case_id: $existing.id, claim_id: $input.new.id, slot: "C"}
        } as $link
      }
      elseif ($peers|count > 0) {
        var $peer {
          value = $peers|first
        }

        function.run "fn_value_difference" {
          a    : $input.new.value
          b    : $peer.value
          unit : $input.new.unit
        } as $v

        function.run "fn_period_compatibility" {
          a: $input.new.period
          b: $peer.period
        } as $period

        function.run "fn_scope_overlap" {
          claim_a: $input.new
          claim_b: $peer
        } as $scope

        function.run "fn_case_severity" {
          definition_conflict  : (($input.new.population != $peer.population) ? 1 : 0)
          value_discrepancy    : $v
          scope_incompatibility: (($scope.compatible == false) ? 0.8 : 0)
          audience_impact      : 1
          recurrence           : 0.75
        } as $severity

        db.add cases {
          data = {
            case_number: "MC-" ~ $input.new.id
            title: $metric.name ~ " v. " ~ $metric.name
            metric_id: $metric.id
            status: "open"
            severity: $severity.level
            severity_score: $severity.score
            drift_types: ["value", "definition"]
            suggested_explanation: "Definition mismatch. Neither claim is inherently incorrect until the canonical population and formula are specified."
            owner_id: $metric.owner_id
            created_at: now
          }
        } as $case

        db.add case_claims {
          data = {case_id: $case.id, claim_id: $peer.id, slot: "A"}
        } as $link_a

        db.add case_claims {
          data = {case_id: $case.id, claim_id: $input.new.id, slot: "B"}
        } as $link_b

        db.add audit_events {
          data = {actor_id: 0, action: "case.opened", entity_type: "case", entity_id: $case.id, detail: $case.title}
        } as $audit

        realtime.publish {
          channel = "courtroom"
          data = {event: "case.opened", case_id: $case.id, severity: $severity.score}
        } as $rt
      }
    }
  }

  tags = ["court", "claims"]
  actions = {insert: true}
}
