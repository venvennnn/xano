function "fn_scope_overlap" {
  input {
    json claim_a
    json claim_b
  }

  stack {
    var $diffs {
      value = []
    }

    foreach (["country", "product", "population", "segment"]) {
      each as $field {
        var $av { value = $input.claim_a[$field] }
        var $bv { value = $input.claim_b[$field] }
        conditional {
          if ($av && $bv && $av != $bv && $av != "All products" && $bv != "All products") {
            array.push $diffs {
              value = {field: $field, a: $av, b: $bv}
            }
          }
        }
      }
    }
  }

  response = {
    overlap    : (1 - (($diffs|count) / 4))
    compatible : ($diffs|count) == 0
    diffs      : $diffs
  }
}
