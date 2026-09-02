query "sources/analyze" verb=POST {
  description = "Paste a transcript, Slack thread or CSV. Extract claims, match metrics, open cases."
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

    // LLM extraction lives here in production (Xano AI / external model).
    // The model detects mentions and extracts value, period, scope and
    // definition language. It does not issue a verdict.
    api.request {
      url    = "https://api.openai.com/v1/chat/completions"
      method = "POST"
      headers = ["Authorization: Bearer " ~ $env.OPENAI_API_KEY]
      body = {
        model: "gpt-4o-mini"
        response_format: {type: "json_object"}
        messages: [
          {role: "system", content: "Extract structured metric claims. Do not issue a verdict."},
          {role: "user", content: $input.content}
        ]
      }
    } as $llm

    foreach ($llm.claims) {
      each as $raw {
        function.run "fn_metric_matching_score" {
          query = $raw.metric_name
        } as $match

        db.add claims {
          data = {
            metric_id     : $match.metric_id
            matching_score: $match.score
            source_id     : $source.id
            speaker       : $raw.speaker
            value         : $raw.value
            unit          : $raw.unit
            period        : $raw.period
            country       : $raw.country
            product       : $raw.product
            population    : $raw.population
            calculation_type: $raw.calculation_type
            status        : $raw.status
            raw_excerpt   : $raw.raw_excerpt
            created_at    : now
          }
        } as $claim
      }
    }

    db.add audit_events {
      data = {actor_id: 0, action: "source.analyzed", entity_type: "source", entity_id: $source.id, detail: "claims extracted"}
    } as $audit
  }

  response = $source
}
