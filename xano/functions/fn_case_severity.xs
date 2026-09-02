// Deterministic case-severity. An LLM must not assign this score.
// P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R
function "fn_case_severity" {
  input {
    decimal definition_conflict
    decimal value_discrepancy
    decimal scope_incompatibility
    decimal audience_impact
    decimal recurrence
  }

  stack {
    var $p {
      value = (0.30 * $input.definition_conflict) + (0.25 * $input.value_discrepancy) + (0.15 * $input.scope_incompatibility) + (0.15 * $input.audience_impact) + (0.15 * $input.recurrence)
    }

    var $score {
      value = ($p * 100)|round:0
    }

    var $level {
      value = ($score >= 80) ? "critical" : (($score >= 60) ? "high" : (($score >= 30) ? "review" : "informational"))
    }
  }

  response = {
    score : $score
    level : $level
    formula: "P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R"
  }
}
