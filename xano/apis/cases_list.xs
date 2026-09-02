query "cases" verb=GET {
  input {
    text status?
  }
  stack {
    db.query cases {
      where = $input.status ? ($db.cases.status == $input.status) : true
      sort = {created_at: "desc"}
    } as $cases
  }
  response = $cases
}
