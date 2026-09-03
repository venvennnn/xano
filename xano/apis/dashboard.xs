query "dashboard" verb=GET {
  description = "Court docket payload for Streamlit: open cases, KPIs, registry, precedents."
  input {}

  stack {
    db.query cases {
      sort = {severity_score: "desc"}
      return = {type: "list"}
    } as $cases

    db.query metrics {
      sort = {name: "asc"}
      return = {type: "list"}
    } as $metrics

    db.query precedents {
      sort = {created_at: "desc"}
      return = {type: "list"}
    } as $precedents

    db.query metric_definitions {
      return = {type: "list"}
    } as $definitions

    db.query metric_aliases {
      return = {type: "list"}
    } as $aliases

    db.query user {
      return = {type: "list"}
    } as $users
  }

  response = {
    headline: "The docket is open."
    company : "Aether Credit"
    cases   : $cases
    metrics : $metrics
    definitions: $definitions
    aliases : $aliases
    users   : $users
    precedents: $precedents
    open_cases: $cases
    kpis: {
      open_cases: $cases|count
    }
  }
}
