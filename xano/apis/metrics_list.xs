query "metrics" verb=GET {
  input {}
  stack {
    db.query metrics {
      sort = {name: "asc"}
    } as $metrics
  }
  response = $metrics
}
