table verdicts {
  auth = false
  schema {
    int id
    timestamp created_at?=now
    int case_id
    enum outcome {
      values = ["claim_a_authoritative", "claim_b_authoritative", "both_correct", "neither_supported", "canonical_amended", "more_evidence"]
    }
    text statement
    int? definition_version_created
    int issued_by
    timestamp issued_at?=now
  }
  index = [{type: "primary", field: [{name: "id"}]}]
}
