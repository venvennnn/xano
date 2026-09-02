query "precedents" verb=GET {
  input {}
  stack {
    db.query precedents {
      sort = {created_at: "desc"}
    } as $rows
  }
  response = $rows
}
