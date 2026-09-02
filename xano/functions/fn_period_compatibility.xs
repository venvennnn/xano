function "fn_period_compatibility" {
  input {
    text a
    text b
  }

  stack {
    var $identical {
      value = $input.a == $input.b
    }
    var $cutoff {
      value = (($input.a == "month-end" && $input.b == "today") || ($input.b == "month-end" && $input.a == "today"))
    }
  }

  response = {
    identical  : $identical
    compatible : $identical || (!$input.a || !$input.b) ? true : !$cutoff
    reason     : $cutoff ? "month-end vs today" : ($identical ? "identical period" : ($input.a ~ " vs " ~ $input.b))
  }
}
