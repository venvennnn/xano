# Devpost paste pack — Metric Court

Hackathon: [DevNetwork API + Cloud + AI 2026](https://api-cloud-ai-hackathon-2026.devpost.com/)  
Deadline: **Thursday, September 3, 2026, 10:00 AM PST**  
Challenge: **Xano: Rebuild a SaaS Tool You Hate**

Submit at: https://api-cloud-ai-hackathon-2026.devpost.com/  
Click **Enter a Submission** → paste the fields below → select the Xano challenge → **Submit to Hackathon**.

---

## What’s your project called

```
Metric Court
```

## Here’s the elevator pitch

```
When two teams quote different versions of the same metric, Metric Court opens a case, classifies the drift, and records a verdict that becomes precedent.
```

## Created by

Venmani A D (`advenmani@gmail.com`) — add teammates here if anyone else should edit the project.

## Here’s the whole story

```
Companies do not have a data problem. They have a same-metric, different-truth problem.

Sales reports 71% retention. Finance reports 62%. The board deck says 68%. All three can be technically correct. They used different cohorts. Data catalogs and analytics-governance portals document the official definition, then sit still while people keep quoting the unofficial ones.

Metric Court is an organizational truth-resolution system. It watches business conversation — a pasted meeting transcript, Slack-style messages, or a CSV of claims — and turns each statement into a structured claim: metric, value, period, country, product, population, calculation, speaker, source.

It then compares that claim against other claims, the canonical registry, previous verdicts, and approved sources. If a meaningful contradiction exists, it opens a case.

The court metaphor is the product:

• Case — a metric disagreement (Case #MC-104: Retention v. Retention)
• Claimant — the person or document quoting the number
• Witness — transcript, report, dashboard, or query
• Evidence — formula, source, filter, period, calculation
• Judge — the assigned metric steward
• Verdict — the approved number and definition
• Precedent — a reusable rule for the next dispute
• Appeal — a challenge to an existing definition

This is not machine-learning data drift. It is semantic metric drift: value, definition, time, scope, status, and source. Severity is not an LLM guess. Xano (and the local court engine that implements the same functions) scores:

P = 0.30D + 0.25V + 0.15S + 0.15A + 0.15R

0–29 informational · 30–59 review · 60–79 high · 80–100 critical

The model only extracts claims. It does not issue the verdict. Streamlit is the courtroom UI. Xano operates the court: the metric registry, aliases, definition versions, cases, evidence, verdicts, precedents, audit events, deterministic custom functions (severity, matching, period, scope), the on_claim_insert trigger that opens a case, the on_verdict_insert trigger that reassesses related matters, background tasks for overdue hearings, and the API group Streamlit calls.

Killer demo (fictional company Aether Credit — no confidential data):

1. The docket headline: “Your company currently has four definitions of Active Customer.”
2. Paste the Q2 management transcript. Sales: 71%. Finance: 62%. Country manager: 68%.
3. Metric Court opens Case MC-104: Retention v. Retention. Same quarter, same country, different population, different eligibility treatment. Severity 84, Critical.
4. The steward issues the verdict: both figures are valid under different definitions. Management reporting will use customers eligible to return during the measurement window.
5. The court writes Customer Retention definition v4, stores the alias “Eligible-customer retention,” closes related case MC-101, and republishes the docket.

Closing line: Metric Court does not tell your company which number sounds right. It gives every number a definition, every disagreement a hearing, and every resolution a precedent.

Build story (Xano challenge)

What software did we replace?
Passive data catalogs and analytics-governance tools — Collibra-style metric dictionaries that document a definition and then fail to intervene when two teams quote different truths in the same meeting.

Why that one?
Everyone in a real company has lived the 71% vs 62% argument. Catalogs produce documentation. They do not produce a verdict. That is the category people genuinely hate, and it is not another CRM or help desk.

Which AI tools?
Cursor (cloud agent) to design and build the Streamlit courtroom, the deterministic court engine, and the XanoScript backend. The killer demo uses a deterministic parser so judges do not need an API key.

How long did it take?
One focused build: seeded registry, extract → match → drift → case → hearing → verdict → precedent, plus the Streamlit courtroom and XanoScript.

What would have taken longer without AI + Xano?
Hand-writing the relational court model, the severity and matching functions, triggers, and a hosted API/frontend pair. Xano is the workflow, rules engine, audit log, API layer, realtime case manager, and host — not a database that stores the model’s output.

Repo: https://github.com/venvennnn/xano
Run: pip install -r requirements.txt && streamlit run streamlit_app.py
Deploy: Streamlit Community Cloud, main file streamlit_app.py
```

## It’s built with

```
Streamlit
Python
Xano
XanoScript
Cursor
```

## Try it out

Streamlit is the whole app. No Vite, no Express, no extra ports.

```
git clone https://github.com/venvennnn/xano.git
cd xano
python3 -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

Open http://localhost:8501 — Convene → “Killer demo — Retention v. Retention” → Convene Court → Issue Verdict.

Deploy on [Streamlit Community Cloud](https://share.streamlit.io): connect this GitHub repo, set the main file to `streamlit_app.py`, add secrets `XANO_API_BASE` (and optional `XANO_API_KEY`) pointing at your Xano API group, click Deploy.

Until the workspace is live, Streamlit runs a local stand-in of the same Xano functions so the killer demo still works. The XanoScript in `xano/` is the backend judges should review.

Public repo: https://github.com/venvennnn/xano

## Image gallery

Upload these files from `docs/submission/`:

1. `docket_four_definitions_active_customer.webp` — docket headline
2. `convene_retention_claims_mc104.webp` — 71 / 62 / 68 extracted, MC-104 opened
3. `hearing_mc104_verdict_entered.webp` — verdict, definition v4, MC-101 closed
4. `registry_retention_definition_v4.webp` — registry after the verdict
5. `precedent_eligible_customer_retention.webp` — new precedent on file

## Video demo

File: `docs/submission/metric_court_killer_demo.mp4` (about two minutes of courtroom use, plus a short tour).

Upload to YouTube or Vimeo as **unlisted**, then paste the link into Devpost.

Suggested title: `Metric Court — Retention v. Retention`

If you re-record a tighter 2:00 cut, use this script:

```
0:00  “Companies don’t have a data problem. They have a same-metric, different-truth problem.”
0:15  Docket: four definitions of Active Customer.
0:25  Convene → Killer demo → Convene Court.
0:40  71%, 62%, 68% mapped to Customer Retention.
0:55  Case MC-104. Definition drift. Severity 84.
1:15  Issue Verdict: both correct; management uses eligible-customer retention.
1:35  Definition v4. Alias stored. MC-101 closed. Docket updates.
1:50  “Every number a definition. Every disagreement a hearing. Every resolution a precedent.”
```

## Sponsor challenge to select

**Xano: Rebuild a SaaS Tool You Hate**

## Checklist before you click Submit

- [ ] You and every teammate are registered on the hackathon Devpost
- [ ] Project name, pitch, created-by, and whole story pasted
- [ ] Xano challenge checked
- [ ] Built with tags added
- [ ] Five screenshots uploaded
- [ ] Video uploaded (YouTube/Vimeo) and linked
- [ ] Repo URL in Try it out: https://github.com/venvennnn/xano
- [ ] Terms accepted
- [ ] **Submit to Hackathon** before 10:00 AM PST, 3 September 2026
