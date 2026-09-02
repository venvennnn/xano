query "dashboard/drift" verb=GET {
  description = "Drift radar payload: open cases, severity, team definition conflicts, time to verdict."
  input {}

  stack {
    db.query cases {
      where = $db.cases.status != "closed"
      return = {type: "list"}
    } as $open

    db.query cases {
      where = $db.cases.status == "closed"
      return = {type: "list"}
    } as $closed
  }

  response = {
    open_cases: $open|count
    closed_cases: $closed|count
  }
}
