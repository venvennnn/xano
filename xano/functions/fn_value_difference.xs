function "fn_value_difference" {
  input {
    decimal a
    decimal b
    text unit?
  }

  stack {
    var $abs {
      value = ($input.a - $input.b)|abs
    }

    // 9 percentage points → ~0.63 so a 14.3pp gap is a full discrepancy.
    var $v {
      value = ($input.unit == "percentage")
        ? (($abs / 14.3)|min:1)
        : ((($abs / (($input.a|abs)|max:($input.b|abs)|max:0.000000001)) / 0.15)|min:1)
    }
  }

  response = $v
}
