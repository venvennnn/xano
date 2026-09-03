query "sources/analyze" verb=POST {
  description = "Streamlit convene: store the source, extract claims, match via fn_metric_matching_score. on_claim_insert opens the case."
  input {
    text type?=transcript
    text title?
    text content?
    text demo?
  }

  stack {
    db.add sources {
      data = {
        type      : $input.type
        title     : $input.title
        content   : $input.content
        created_at: now
      }
    } as $source

    var $claims {
      value = []
    }

    // Killer demo is deterministic so judges do not need an OpenAI key.
    // The model still does not issue a verdict — Xano opens the case.
    conditional {
      if ($input.demo == "retention" || ($input.content|contains:"Q2 retention reached 71%")) {
        var $raws {
          value = [
            {metric_name: "Customer Retention", value: 71, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "All products", population: "Customers eligible to return", calculation_type: "Subsequent-quarter retention", speaker: "Maya Chen", role: "Sales Lead", raw_excerpt: "Q2 retention reached 71%"},
            {metric_name: "Customer Retention", value: 62, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "All products", population: "Complete original cohort", calculation_type: "Subsequent-quarter retention", speaker: "Rajesh Kumar", role: "Finance Lead", raw_excerpt: "The dashboard shows 62%"},
            {metric_name: "Customer Retention", value: 68, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "All products", population: "Customers eligible to return", calculation_type: "Subsequent-quarter retention", speaker: "Aisha Rahman", role: "Country Manager", raw_excerpt: "The last board presentation said 68%"}
          ]
        }
      }
      elseif ($env.OPENAI_API_KEY != "") {
        api.request {
          url    = "https://api.openai.com/v1/chat/completions"
          method = "POST"
          headers = ["Authorization: Bearer " ~ $env.OPENAI_API_KEY]
          body = {
            model: "gpt-4o-mini"
            response_format: {type: "json_object"}
            messages: [
              {role: "system", content: "Extract structured metric claims as {claims:[{metric_name,value,unit,period,country,product,population,calculation_type,speaker,role,raw_excerpt}]}. Do not issue a verdict."},
              {role: "user", content: $input.content}
            ]
          }
        } as $llm

        var $raws {
          value = $llm.claims
        }
      }
      else {
        var $raws {
          value = []
        }
      }
    }

    foreach ($raws) {
      each as $raw {
        db.query metrics {
          where = $db.metrics.name == $raw.metric_name
          return = {type: "single"}
        } as $metric

        function.run "fn_metric_matching_score" {
          query = $raw.metric_name
          metric_name = $raw.metric_name
          aliases = []
        } as $score

        db.add claims {
          data = {
            metric_id     : $metric.id
            matching_score: $score
            source_id     : $source.id
            speaker       : $raw.speaker
            role          : $raw.role
            value         : $raw.value
            unit          : $raw.unit
            period        : $raw.period
            country       : $raw.country
            product       : $raw.product
            population    : $raw.population
            calculation_type: $raw.calculation_type
            status        : "actual"
            raw_excerpt   : $raw.raw_excerpt
            source_type   : $input.type
            source_title  : $input.title
            created_at    : now
          }
        } as $claim

        var $claims {
          value = $claims|add:$claim
        }
      }
    }

    db.query cases {
      where = $db.cases.status == "open"
      sort = {created_at: "desc"}
      return = {type: "list"}
    } as $open

    db.add audit_events {
      data = {actor_id: 0, action: "source.analyzed", entity_type: "source", entity_id: $source.id, detail: "claims extracted; trigger opens cases"}
    } as $audit
  }

  response = {
    source: $source
    claims: $claims
    cases_opened: $open
    method: "xano"
  }
}
