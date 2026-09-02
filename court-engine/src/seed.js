/**
 * Aether Credit — fictional Malaysian digital lender used for the killer demo.
 * No confidential or real-company data.
 */

const T0 = "2026-09-02T09:00:00.000Z";

export function buildSeed() {
  const teams = [
    { id: 1, name: "Finance", slug: "finance" },
    { id: 2, name: "Sales", slug: "sales" },
    { id: 3, name: "Risk", slug: "risk" },
    { id: 4, name: "Product", slug: "product" },
    { id: 5, name: "Data", slug: "data" },
  ];

  const users = [
    { id: 1, name: "Priya Nair", email: "priya.nair@aether-credit.example", role: "judge", title: "Chief Data Officer", team_id: 5 },
    { id: 2, name: "Maya Chen", email: "maya.chen@aether-credit.example", role: "analyst", title: "Head of Sales", team_id: 2 },
    { id: 3, name: "Rajesh Kumar", email: "rajesh.kumar@aether-credit.example", role: "owner", title: "Head of Finance", team_id: 1 },
    { id: 4, name: "Aisha Rahman", email: "aisha.rahman@aether-credit.example", role: "analyst", title: "Country Manager, Malaysia", team_id: 4 },
    { id: 5, name: "Daniel Okonkwo", email: "daniel.okonkwo@aether-credit.example", role: "analyst", title: "Senior Data Analyst", team_id: 5 },
    { id: 6, name: "Sofia Berg", email: "sofia.berg@aether-credit.example", role: "owner", title: "Head of Risk", team_id: 3 },
    { id: 7, name: "Kenji Watanabe", email: "kenji.watanabe@aether-credit.example", role: "owner", title: "Product Lead, BOLT", team_id: 4 },
  ];

  const metrics = [
    {
      id: 1,
      canonical_id: "M-RET-001",
      name: "Customer Retention",
      owner_id: 1,
      approved_source: "Customer mart · retention_eligible",
      health_status: "disputed",
      unit: "percentage",
      default_country: "Malaysia",
      default_product: "All products",
      current_definition_id: 3,
    },
    {
      id: 2,
      canonical_id: "M-NPL-001",
      name: "NPL Ratio",
      owner_id: 6,
      approved_source: "Risk mart · npl_stock_monthly",
      health_status: "stable",
      unit: "percentage",
      default_country: "Malaysia",
      default_product: "All products",
      current_definition_id: 6,
    },
    {
      id: 3,
      canonical_id: "M-DIS-001",
      name: "Disbursement Volume",
      owner_id: 3,
      approved_source: "Finance mart · disbursements_completed",
      health_status: "stable",
      unit: "usd",
      default_country: "Malaysia",
      default_product: "BOLT",
      current_definition_id: 8,
    },
    {
      id: 4,
      canonical_id: "M-CON-001",
      name: "Conversion Rate",
      owner_id: 7,
      approved_source: "Growth funnel · application_to_disbursement",
      health_status: "watch",
      unit: "percentage",
      default_country: "Malaysia",
      default_product: "BOLT",
      current_definition_id: 9,
    },
    {
      id: 5,
      canonical_id: "M-ACT-001",
      name: "Active Customers",
      owner_id: 7,
      approved_source: "Unresolved — four competing definitions",
      health_status: "critical",
      unit: "count",
      default_country: "Malaysia",
      default_product: "All products",
      current_definition_id: 13,
    },
    {
      id: 6,
      canonical_id: "M-APR-001",
      name: "Approval Rate",
      owner_id: 6,
      approved_source: "Decisioning · final_approve",
      health_status: "stable",
      unit: "percentage",
      default_country: "Malaysia",
      default_product: "BOLT",
      current_definition_id: 14,
    },
    {
      id: 7,
      canonical_id: "M-CAC-001",
      name: "Cost of Acquisition",
      owner_id: 3,
      approved_source: "Finance mart · paid_media_plus_ops",
      health_status: "stable",
      unit: "usd",
      default_country: "Malaysia",
      default_product: "BOLT",
      current_definition_id: 15,
    },
    {
      id: 8,
      canonical_id: "M-ATS-001",
      name: "Average Ticket Size",
      owner_id: 3,
      approved_source: "Finance mart · mean_disbursed_amount",
      health_status: "stable",
      unit: "usd",
      default_country: "Malaysia",
      default_product: "BOLT",
      current_definition_id: 16,
    },
  ];

  const metric_definitions = [
    { id: 1, metric_id: 1, version: 1, formula: "customers_returning / customers_originated", population: "All originated customers", calculation_type: "Subsequent-quarter retention", unit: "percentage", valid_from: "2025-01-01", valid_to: "2025-12-31", notes: "V1 treated every originated account as eligible." },
    { id: 2, metric_id: 1, version: 2, formula: "customers_returning / customers_originated", population: "All originated customers", calculation_type: "Subsequent-quarter retention", unit: "percentage", valid_from: "2026-01-01", valid_to: "2026-03-31", notes: "Carried into 2026 without eligibility language." },
    { id: 3, metric_id: 1, version: 3, formula: "customers_returning / customers_originated", population: "Not specified", calculation_type: "Subsequent-quarter retention", unit: "percentage", valid_from: "2026-04-01", valid_to: null, notes: "Registry does not specify eligibility treatment — the gap that creates Case MC-104." },
    { id: 4, metric_id: 2, version: 1, formula: "npl_balance / gross_loans", population: "All outstanding loans", calculation_type: "Stock NPL", unit: "percentage", valid_from: "2025-01-01", valid_to: "2026-06-30", notes: "Stock definition used by Finance." },
    { id: 5, metric_id: 2, version: 2, formula: "new_npl_in_month / performing_start", population: "Loans performing at month start", calculation_type: "Flow NPL", unit: "percentage", valid_from: "2026-04-01", valid_to: "2026-07-31", notes: "Risk experimented with flow NPL in Q2 packs." },
    { id: 6, metric_id: 2, version: 3, formula: "npl_balance / gross_loans", population: "All outstanding loans", calculation_type: "Stock NPL", unit: "percentage", valid_from: "2026-08-01", valid_to: null, notes: "ALCO confirmed stock NPL as the management figure. Flow NPL remains a risk diagnostic." },
    { id: 7, metric_id: 3, version: 1, formula: "sum(disbursed_amount)", population: "Completed disbursements", calculation_type: "Completed volume", unit: "usd", valid_from: "2025-01-01", valid_to: "2026-07-31", notes: "Did not specify country vs product roll-up." },
    { id: 8, metric_id: 3, version: 2, formula: "sum(disbursed_amount) where country and product match the reporting grain", population: "Completed disbursements at the stated grain", calculation_type: "Completed volume", unit: "usd", valid_from: "2026-08-01", valid_to: null, notes: "Amended after MC-097: quoting regional volume as Malaysia BOLT is a scope error." },
    { id: 9, metric_id: 4, version: 1, formula: "disbursed_applications / submitted_applications", population: "Submitted applications in period", calculation_type: "Application-to-disbursement", unit: "percentage", valid_from: "2026-01-01", valid_to: null, notes: "Cut-off is period-end, not 'today'." },
    { id: 10, metric_id: 5, version: 1, formula: "count(customers) where last_login >= today-30", population: "Logged in last 30 days", calculation_type: "Login activity", unit: "count", valid_from: "2025-06-01", valid_to: null, notes: "Product growth definition." },
    { id: 11, metric_id: 5, version: 2, formula: "count(customers) where outstanding_balance > 0", population: "Has outstanding balance", calculation_type: "Balance activity", unit: "count", valid_from: "2025-06-01", valid_to: null, notes: "Finance book definition." },
    { id: 12, metric_id: 5, version: 3, formula: "count(customers) where last_transaction >= today-90", population: "Transacted in last 90 days", calculation_type: "Transaction activity", unit: "count", valid_from: "2025-09-01", valid_to: null, notes: "Risk definition." },
    { id: 13, metric_id: 5, version: 4, formula: "Unresolved — competing login, balance, and transaction definitions", population: "Not specified", calculation_type: "Unresolved", unit: "count", valid_from: "2026-01-01", valid_to: null, notes: "Four live definitions. Canonical owner has not issued a management verdict." },
    { id: 14, metric_id: 6, version: 1, formula: "final_approve / decisioned", population: "Decisioned applications", calculation_type: "Final approve rate", unit: "percentage", valid_from: "2026-01-01", valid_to: null, notes: "" },
    { id: 15, metric_id: 7, version: 1, formula: "(paid_media + sales_ops) / new_customers", population: "New customers in period", calculation_type: "Blended CAC", unit: "usd", valid_from: "2026-01-01", valid_to: null, notes: "" },
    { id: 16, metric_id: 8, version: 1, formula: "mean(disbursed_amount)", population: "Completed disbursements", calculation_type: "Mean ticket", unit: "usd", valid_from: "2026-01-01", valid_to: null, notes: "" },
  ];

  const metric_aliases = [
    { id: 1, metric_id: 1, alias: "Retention", approved: true, source: "registry" },
    { id: 2, metric_id: 1, alias: "Customer retention", approved: true, source: "registry" },
    { id: 3, metric_id: 1, alias: "Repeat rate", approved: true, source: "sales slang" },
    { id: 4, metric_id: 1, alias: "Returning-customer rate", approved: true, source: "product" },
    { id: 5, metric_id: 1, alias: "Subsequent-quarter retention", approved: true, source: "registry" },
    { id: 6, metric_id: 2, alias: "NPL", approved: true, source: "registry" },
    { id: 7, metric_id: 2, alias: "Non-performing loan ratio", approved: true, source: "registry" },
    { id: 8, metric_id: 3, alias: "Disbursement", approved: true, source: "registry" },
    { id: 9, metric_id: 3, alias: "Disbursed", approved: true, source: "speech" },
    { id: 10, metric_id: 3, alias: "Disbursement volume", approved: true, source: "registry" },
    { id: 11, metric_id: 4, alias: "Conversion", approved: true, source: "speech" },
    { id: 12, metric_id: 5, alias: "Active customer", approved: true, source: "registry" },
    { id: 13, metric_id: 5, alias: "Active customers", approved: true, source: "registry" },
    { id: 14, metric_id: 6, alias: "Approval rate", approved: true, source: "registry" },
    { id: 15, metric_id: 7, alias: "CAC", approved: true, source: "registry" },
    { id: 16, metric_id: 7, alias: "Acquisition cost", approved: true, source: "speech" },
    { id: 17, metric_id: 8, alias: "Ticket size", approved: true, source: "speech" },
    { id: 18, metric_id: 8, alias: "Average loan size", approved: true, source: "registry" },
  ];

  const sources = [
    { id: 1, type: "report", title: "Q1 2026 sales review", content: "Q1 retention was reported as 74% by Sales and 66% by Finance.", created_at: "2026-04-18T04:00:00.000Z" },
    { id: 2, type: "dashboard", title: "Risk ALCO pack — June", content: "NPL decreased by 5% (flow). Finance mart stock NPL 3.2%.", created_at: "2026-07-08T02:00:00.000Z" },
    { id: 3, type: "transcript", title: "July country review", content: "We disbursed $12 million. Malaysia BOLT was $9.4 million.", created_at: "2026-07-22T06:00:00.000Z" },
    { id: 4, type: "report", title: "Q2 board deck", content: "Board pack printed 68% subsequent-quarter retention, eligible customers only.", created_at: "2026-08-12T01:00:00.000Z" },
    { id: 5, type: "dashboard", title: "Finance mart · active_customers", content: "Outstanding-balance definition yields 5,100.", created_at: "2026-08-28T03:00:00.000Z" },
    { id: 6, type: "slack", title: "#growth — conversion", content: "Conversion improved last quarter. Funnel as-of today shows 10.8%. Period-end close was 11.2%.", created_at: "2026-09-01T08:00:00.000Z" },
  ];

  const claims = [
    // MC-094 Q1 retention (closed)
    claim(1, 1, 1, { speaker: "Maya Chen", value: 74, unit: "percentage", period: "Q1 2026", country: "Malaysia", product: "All products", population: "Customers eligible to return", calculation_type: "Subsequent-quarter retention", status: "actual", source_type: "report", source_title: "Q1 2026 sales review", raw_excerpt: "Q1 retention reached 74%.", created_at: "2026-04-18T04:01:00.000Z", team_id: 2 }),
    claim(2, 1, 1, { speaker: "Rajesh Kumar", value: 66, unit: "percentage", period: "Q1 2026", country: "Malaysia", product: "All products", population: "Complete original cohort", calculation_type: "Subsequent-quarter retention", status: "actual", source_type: "dashboard", source_title: "Finance dashboard", raw_excerpt: "Finance dashboard shows 66%.", created_at: "2026-04-18T04:02:00.000Z", team_id: 1 }),
    // MC-089 NPL (closed)
    claim(3, 2, 2, { speaker: "Sofia Berg", value: 5, unit: "percentage", period: "June 2026", country: "Malaysia", product: "All products", population: "Loans performing at month start", calculation_type: "Flow NPL", status: "actual", source_type: "report", source_title: "Risk ALCO pack — June", raw_excerpt: "NPL decreased by 5%.", created_at: "2026-07-08T02:01:00.000Z", team_id: 3 }),
    claim(4, 2, 2, { speaker: "Rajesh Kumar", value: 3.2, unit: "percentage", period: "June 2026", country: "Malaysia", product: "All products", population: "All outstanding loans", calculation_type: "Stock NPL", status: "actual", source_type: "dashboard", source_title: "Finance mart", raw_excerpt: "Finance mart still shows NPL at 3.2%.", created_at: "2026-07-08T02:02:00.000Z", team_id: 1 }),
    // MC-097 disbursement (closed)
    claim(5, 3, 3, { speaker: "Aisha Rahman", value: 12_000_000, unit: "usd", period: "Q2 2026", country: "Regional", product: "All products", population: "Completed disbursements", calculation_type: "Completed volume", status: "completed", source_type: "transcript", source_title: "July country review", raw_excerpt: "We disbursed $12 million last quarter.", created_at: "2026-07-22T06:01:00.000Z", team_id: 4 }),
    claim(6, 3, 3, { speaker: "Kenji Watanabe", value: 9_400_000, unit: "usd", period: "Q2 2026", country: "Malaysia", product: "BOLT", population: "Completed disbursements", calculation_type: "Completed volume", status: "completed", source_type: "dashboard", source_title: "Product ops", raw_excerpt: "Malaysia BOLT disbursement was $9.4 million.", created_at: "2026-07-22T06:02:00.000Z", team_id: 4 }),
    // MC-101 board retention (open — will be reassessed by MC-104)
    claim(7, 1, 4, { speaker: "Aisha Rahman", value: 68, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "All products", population: "Customers eligible to return", calculation_type: "Subsequent-quarter retention", status: "actual", source_type: "report", source_title: "Q2 board deck", raw_excerpt: "The last board presentation said 68%.", created_at: "2026-08-12T01:01:00.000Z", team_id: 4 }),
    claim(8, 1, 4, { speaker: "Daniel Okonkwo", value: 62, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "All products", population: "Complete original cohort", calculation_type: "Subsequent-quarter retention", status: "actual", source_type: "dashboard", source_title: "Finance dashboard", raw_excerpt: "Finance dashboard in the appendix shows 62%.", created_at: "2026-08-12T01:02:00.000Z", team_id: 5 }),
    // MC-102 active customers (open, critical)
    claim(9, 5, 5, { speaker: "Maya Chen", value: 4200, unit: "count", period: "August 2026", country: "Malaysia", product: "All products", population: "Unspecified", calculation_type: "Unknown", status: "actual", source_type: "slack", source_title: "#growth", raw_excerpt: "There are 4,200 active customers.", created_at: "2026-08-28T03:01:00.000Z", team_id: 2 }),
    claim(10, 5, 5, { speaker: "Daniel Okonkwo", value: 3850, unit: "count", period: "August 2026", country: "Malaysia", product: "All products", population: "Logged in last 30 days", calculation_type: "Login activity", status: "actual", source_type: "dashboard", source_title: "Product analytics", raw_excerpt: "Product counts 3,850 as logged in last 30 days.", created_at: "2026-08-28T03:02:00.000Z", team_id: 5 }),
    claim(11, 5, 5, { speaker: "Kenji Watanabe", value: 5100, unit: "count", period: "August 2026", country: "Malaysia", product: "All products", population: "Has outstanding balance", calculation_type: "Balance activity", status: "actual", source_type: "dashboard", source_title: "Finance mart · active_customers", raw_excerpt: "Finance uses outstanding balance and gets 5,100.", created_at: "2026-08-28T03:03:00.000Z", team_id: 4 }),
    claim(12, 5, 5, { speaker: "Sofia Berg", value: 2900, unit: "count", period: "August 2026", country: "Malaysia", product: "All products", population: "Transacted in last 90 days", calculation_type: "Transaction activity", status: "actual", source_type: "report", source_title: "Risk watchlist", raw_excerpt: "Risk only counts customers who transacted in the last 90 days: 2,900.", created_at: "2026-08-28T03:04:00.000Z", team_id: 3 }),
    // MC-103 conversion (open, review)
    claim(13, 4, 6, { speaker: "Maya Chen", value: 11.2, unit: "percentage", period: "Q2 2026", country: "Malaysia", product: "BOLT", population: "Submitted applications in period", calculation_type: "Application-to-disbursement", status: "actual", source_type: "slack", source_title: "#growth — conversion", raw_excerpt: "Conversion improved last quarter — we closed 11.2%.", created_at: "2026-09-01T08:01:00.000Z", team_id: 2 }),
    claim(14, 4, 6, { speaker: "Daniel Okonkwo", value: 10.8, unit: "percentage", period: "today", country: "Malaysia", product: "BOLT", population: "Submitted applications in period", calculation_type: "Application-to-disbursement", status: "actual", source_type: "dashboard", source_title: "Growth funnel live", raw_excerpt: "Funnel as-of today shows 10.8%.", created_at: "2026-09-01T08:02:00.000Z", team_id: 5 }),
  ];

  const cases = [
    {
      id: 1,
      case_number: "MC-094",
      title: "Retention v. Retention",
      metric_id: 1,
      status: "closed",
      severity: "high",
      severity_score: 72,
      drift_types: ["value", "definition"],
      suggested_explanation: "Q1 used two populations. Eligibility was not in the registry.",
      owner_id: 1,
      deadline: "2026-05-02",
      created_at: "2026-04-18T04:10:00.000Z",
      closed_at: "2026-04-29T07:00:00.000Z",
      resolution_hours: 266,
    },
    {
      id: 2,
      case_number: "MC-089",
      title: "NPL v. NPL",
      metric_id: 2,
      status: "closed",
      severity: "high",
      severity_score: 71,
      drift_types: ["value", "definition", "source"],
      suggested_explanation: "Risk quoted flow NPL; Finance quoted stock NPL.",
      owner_id: 6,
      deadline: "2026-07-20",
      created_at: "2026-07-08T02:10:00.000Z",
      closed_at: "2026-07-16T05:00:00.000Z",
      resolution_hours: 195,
    },
    {
      id: 3,
      case_number: "MC-097",
      title: "Disbursement v. Disbursement",
      metric_id: 3,
      status: "closed",
      severity: "review",
      severity_score: 58,
      drift_types: ["value", "scope", "source"],
      suggested_explanation: "Regional volume was quoted as Malaysia BOLT.",
      owner_id: 3,
      deadline: "2026-08-05",
      created_at: "2026-07-22T06:10:00.000Z",
      closed_at: "2026-07-30T09:00:00.000Z",
      resolution_hours: 195,
    },
    {
      id: 4,
      case_number: "MC-101",
      title: "Board retention v. Finance appendix",
      metric_id: 1,
      status: "open",
      severity: "high",
      severity_score: 76,
      drift_types: ["value", "definition", "source"],
      suggested_explanation: "Board pack used eligible customers; finance appendix used the complete cohort.",
      owner_id: 1,
      deadline: "2026-09-08",
      created_at: "2026-08-12T01:10:00.000Z",
      closed_at: null,
      resolution_hours: null,
    },
    {
      id: 5,
      case_number: "MC-102",
      title: "Active Customer v. Active Customer v. Active Customer v. Active Customer",
      metric_id: 5,
      status: "open",
      severity: "critical",
      severity_score: 91,
      drift_types: ["value", "definition", "source"],
      suggested_explanation: "Four live definitions of Active Customer. Canonical owner has not issued a management verdict.",
      owner_id: 7,
      deadline: "2026-09-05",
      created_at: "2026-08-28T03:20:00.000Z",
      closed_at: null,
      resolution_hours: null,
    },
    {
      id: 6,
      case_number: "MC-103",
      title: "Conversion v. Conversion",
      metric_id: 4,
      status: "open",
      severity: "review",
      severity_score: 47,
      drift_types: ["value", "time", "source"],
      suggested_explanation: "Period-end close versus today's live funnel.",
      owner_id: 7,
      deadline: "2026-09-18",
      created_at: "2026-09-01T08:10:00.000Z",
      closed_at: null,
      resolution_hours: null,
    },
  ];

  const case_claims = [
    { id: 1, case_id: 1, claim_id: 1, slot: "A" },
    { id: 2, case_id: 1, claim_id: 2, slot: "B" },
    { id: 3, case_id: 2, claim_id: 3, slot: "A" },
    { id: 4, case_id: 2, claim_id: 4, slot: "B" },
    { id: 5, case_id: 3, claim_id: 5, slot: "A" },
    { id: 6, case_id: 3, claim_id: 6, slot: "B" },
    { id: 7, case_id: 4, claim_id: 7, slot: "A" },
    { id: 8, case_id: 4, claim_id: 8, slot: "B" },
    { id: 9, case_id: 5, claim_id: 9, slot: "A" },
    { id: 10, case_id: 5, claim_id: 10, slot: "B" },
    { id: 11, case_id: 5, claim_id: 11, slot: "C" },
    { id: 12, case_id: 5, claim_id: 12, slot: "D" },
    { id: 13, case_id: 6, claim_id: 13, slot: "A" },
    { id: 14, case_id: 6, claim_id: 14, slot: "B" },
  ];

  const evidence = [
    { id: 1, case_id: 1, type: "formula", title: "Q1 sales workbook filter", content: "Sales excluded customers whose next eligibility date fell after 31 Mar 2026.", submitted_by: 5, created_at: "2026-04-20T03:00:00.000Z" },
    { id: 2, case_id: 2, type: "explanation", title: "Stock vs flow", content: "Flow NPL is a diagnostic. Stock NPL is the ALCO management number.", submitted_by: 6, created_at: "2026-07-10T04:00:00.000Z" },
    { id: 3, case_id: 3, type: "query", title: "Grain of disbursement", content: "Regional roll-up includes Orbit, Pulse and BOLT across MY, SG, ID.", submitted_by: 3, created_at: "2026-07-23T02:00:00.000Z" },
    { id: 4, case_id: 4, type: "report", title: "Board footnote", content: "Footnote 4: 'Retention excludes customers not yet eligible to return.'", submitted_by: 4, created_at: "2026-08-12T05:00:00.000Z" },
    { id: 5, case_id: 5, type: "explanation", title: "Four definitions in production", content: "Login-30, outstanding balance, transacted-90, and an unspecified sales figure.", submitted_by: 5, created_at: "2026-08-28T06:00:00.000Z" },
    { id: 6, case_id: 6, type: "dashboard", title: "Funnel as-of versus close", content: "Live funnel recomputes nightly. Q2 close is frozen at period-end.", submitted_by: 5, created_at: "2026-09-01T09:00:00.000Z" },
  ];

  const verdicts = [
    {
      id: 1,
      case_id: 1,
      outcome: "both_correct",
      statement: "Both Q1 figures were valid under different populations. Eligibility treatment was left unspecified. Carry the question into Q2 rather than forcing a single number retroactively.",
      definition_version_created: null,
      issued_by: 1,
      issued_at: "2026-04-29T07:00:00.000Z",
    },
    {
      id: 2,
      case_id: 2,
      outcome: "claim_b_authoritative",
      statement: "For management reporting, NPL is stock NPL from the finance mart. Flow NPL remains a risk diagnostic and must be labelled as such.",
      definition_version_created: 6,
      issued_by: 6,
      issued_at: "2026-07-16T05:00:00.000Z",
    },
    {
      id: 3,
      case_id: 3,
      outcome: "claim_b_authoritative",
      statement: "When the grain is Malaysia BOLT, quote $9.4M. Regional $12M is a different scope and must be labelled regional.",
      definition_version_created: 8,
      issued_by: 3,
      issued_at: "2026-07-30T09:00:00.000Z",
    },
  ];

  const precedents = [
    {
      id: 1,
      case_id: 2,
      metric_id: 2,
      title: "Management NPL is stock, not flow",
      rule: "When reporting NPL to ALCO or the board, use stock NPL from the finance mart. Flow NPL may be shown only when labelled as a risk diagnostic.",
      applies_to_drift: ["definition", "source"],
      created_at: "2026-07-16T05:05:00.000Z",
    },
    {
      id: 2,
      case_id: 3,
      metric_id: 3,
      title: "Disbursement grain must be stated",
      rule: "Never quote regional disbursement as Malaysia BOLT. The reporting grain — country and product — is part of the number.",
      applies_to_drift: ["scope", "source"],
      created_at: "2026-07-30T09:05:00.000Z",
    },
    {
      id: 3,
      case_id: 1,
      metric_id: 1,
      title: "Q1 retention used two unnamed populations",
      rule: "A retention dispute that does not specify eligibility cannot be collapsed to a single number. The registry must name the population before the figure is used in management reporting.",
      applies_to_drift: ["definition"],
      created_at: "2026-04-29T07:05:00.000Z",
    },
  ];

  const appeals = [];

  const audit_events = [
    { id: 1, actor_id: 1, action: "seeded", entity_type: "workspace", entity_id: 0, detail: "Aether Credit court seeded for hackathon demo.", created_at: T0 },
    { id: 2, actor_id: 6, action: "verdict.issued", entity_type: "case", entity_id: 2, detail: "MC-089 closed. Stock NPL is the management figure.", created_at: "2026-07-16T05:00:00.000Z" },
    { id: 3, actor_id: 3, action: "verdict.issued", entity_type: "case", entity_id: 3, detail: "MC-097 closed. Disbursement grain must be stated.", created_at: "2026-07-30T09:00:00.000Z" },
    { id: 4, actor_id: 1, action: "verdict.issued", entity_type: "case", entity_id: 1, detail: "MC-094 closed. Eligibility left unspecified.", created_at: "2026-04-29T07:00:00.000Z" },
    { id: 5, actor_id: 0, action: "case.opened", entity_type: "case", entity_id: 5, detail: "MC-102 opened: four definitions of Active Customer.", created_at: "2026-08-28T03:20:00.000Z" },
  ];

  const notifications = [];

  return {
    meta: {
      company: "Aether Credit",
      tagline: "A fictional Malaysian digital lender. BOLT, Orbit and Pulse are invented products.",
      seeded_at: T0,
      next_case_seq: 104,
    },
    teams,
    users,
    metrics,
    metric_definitions,
    metric_aliases,
    sources,
    claims,
    claim_dimensions: claims.flatMap((c, i) =>
      [
        c.country && { id: i * 10 + 1, claim_id: c.id, key: "country", value: c.country },
        c.product && { id: i * 10 + 2, claim_id: c.id, key: "product", value: c.product },
        c.population && { id: i * 10 + 3, claim_id: c.id, key: "population", value: c.population },
        c.period && { id: i * 10 + 4, claim_id: c.id, key: "period", value: c.period },
        c.status && { id: i * 10 + 5, claim_id: c.id, key: "status", value: c.status },
      ].filter(Boolean)
    ),
    cases,
    case_claims,
    evidence,
    verdicts,
    precedents,
    appeals,
    audit_events,
    notifications,
    sequences: {
      teams: 5,
      users: 7,
      metrics: 8,
      metric_definitions: 16,
      metric_aliases: 18,
      sources: 6,
      claims: 14,
      claim_dimensions: 200,
      cases: 6,
      case_claims: 14,
      evidence: 6,
      verdicts: 3,
      precedents: 3,
      appeals: 0,
      audit_events: 5,
      notifications: 0,
    },
  };
}

function claim(id, metric_id, source_id, extra) {
  return {
    id,
    metric_id,
    source_id,
    matching_score: 1,
    ...extra,
  };
}

export { T0 };
