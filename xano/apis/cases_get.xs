query "cases/{case_id}" verb=GET {
  description = "Assemble one case for the Streamlit hearing: claims, definition, evidence, verdicts."
  input {
    int case_id filters=min:1
  }

  stack {
    db.get cases {
      field_name = "id"
      field_value = $input.case_id
    } as $case

    precondition ($case != null) {
      error = "Case not found"
    }

    db.get metrics {
      field_name = "id"
      field_value = $case.metric_id
    } as $metric

    db.get user {
      field_name = "id"
      field_value = $case.owner_id
    } as $owner

    db.query case_claims {
      where = $db.case_claims.case_id == $case.id
      return = {type: "list"}
    } as $links

    db.query claims {
      where = $db.claims.metric_id == $case.metric_id
      return = {type: "list"}
    } as $metric_claims

    db.query metric_definitions {
      where = $db.metric_definitions.metric_id == $case.metric_id
      sort = {version: "desc"}
      return = {type: "list"}
    } as $definitions

    db.query metric_aliases {
      where = $db.metric_aliases.metric_id == $case.metric_id
      return = {type: "list"}
    } as $aliases

    db.query evidence {
      where = $db.evidence.case_id == $case.id
      return = {type: "list"}
    } as $evidence

    db.query verdicts {
      where = $db.verdicts.case_id == $case.id
      return = {type: "list"}
    } as $verdicts

    db.query precedents {
      where = $db.precedents.metric_id == $case.metric_id
      return = {type: "list"}
    } as $precedents

    db.query cases {
      where = $db.cases.metric_id == $case.metric_id && $db.cases.id != $case.id
      return = {type: "list"}
    } as $related
  }

  response = {
    id: $case.id
    case_number: $case.case_number
    title: $case.title
    status: $case.status
    severity: $case.severity
    severity_score: $case.severity_score
    severity_components: $case.severity_components
    drift_types: $case.drift_types
    suggested_explanation: $case.suggested_explanation
    deadline: $case.deadline
    metric: $metric
    owner: $owner
    definitions: $definitions
    current_definition: $definitions|first
    aliases: $aliases
    claims: $metric_claims
    evidence: $evidence
    verdicts: $verdicts
    precedents: $precedents
    related_cases: $related
  }
}
