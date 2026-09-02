function "fn_precedent_similarity" {
  input {
    json precedent
    text[] drift_types
    int metric_id
  }

  stack {
    var $same_metric {
      value = $input.precedent.metric_id == $input.metric_id
    }
    var $overlap {
      value = 0
    }
    foreach ($input.drift_types) {
      each as $t {
        conditional {
          if ($input.precedent.applies_to_drift|contains:$t) {
            var $overlap { value = $overlap + 1 }
          }
        }
      }
    }
  }

  response = {
    score : $same_metric ? (($overlap / (($input.drift_types|count)|max:1))|max:0.15) : 0
  }
}
