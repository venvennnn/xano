function "fn_metric_matching_score" {
  input {
    text query
    text metric_name
    text[] aliases
  }

  stack {
    var $q {
      value = $input.query|to_lower|trim
    }

    var $names {
      value = $input.aliases|add:$input.metric_name
    }

    var $best {
      value = 0
    }

    foreach ($names) {
      each as $name {
        var $n {
          value = $name|to_lower|trim
        }
        conditional {
          if ($n == $q) {
            var $best { value = 1 }
          }
          elseif (($n|contains:$q) || ($q|contains:$n)) {
            var $best { value = ($best|max:0.86) }
          }
        }
      }
    }
  }

  response = $best
}
