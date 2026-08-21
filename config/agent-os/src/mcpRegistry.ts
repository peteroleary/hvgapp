import type { McpServerSpec } from "./types.ts";

/**
 * Centralized MCP + skill-pack registry for the Agent OS.
 *
 * This is a *declarative* registry: it records endpoints, permissions, tool
 * bindings, and required env for every server the 14 agents bind to. It is
 * deliberately NOT the executable `.mcp.json` at the repo root — that file is
 * read by Claude Code at startup, and registering unprovisioned servers there
 * would break the live MCP session. Entries carry `provisioned: false` until a
 * server is actually reachable; promoting one to `true` is what gates wiring it
 * into `.mcp.json`.
 *
 * Secrets never live here. `requiredEnv` names the variables; values belong in
 * host env / Vercel env vars.
 */
const SERVERS: readonly McpServerSpec[] = [
  // ── Intelligence & Web ────────────────────────────────────────────────
  {
    id: "agent-reach",
    displayName: "Agent Reach",
    category: "intelligence-web",
    kind: "mcp",
    description:
      "Deep multi-platform web recon across X, Reddit, industry forums, and travel communities.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["search_platform", "fetch_thread", "track_trend", "profile_lookup"],
    requiredEnv: ["AGENT_REACH_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "puppeteer-browserbase",
    displayName: "Puppeteer / Browserbase",
    category: "intelligence-web",
    kind: "mcp",
    description:
      "Headless browser automation, end-to-end user flow execution, and paywall auditing.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["open_session", "run_flow", "capture_screenshot", "extract_dom"],
    requiredEnv: ["BROWSERBASE_API_KEY", "BROWSERBASE_PROJECT_ID"],
    scopes: ["hvgapp", "itshvg", "gomarco", "clean"],
    provisioned: false,
  },
  {
    id: "serp-intel",
    displayName: "SERP Intelligence",
    category: "intelligence-web",
    kind: "mcp",
    description:
      "SERP ranking tracking, intent clustering, and backlink profile analysis.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["rank_track", "cluster_intent", "backlink_profile"],
    requiredEnv: ["SERP_INTEL_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "claude-seo",
    displayName: "Claude SEO",
    category: "intelligence-web",
    kind: "mcp",
    description:
      "Automated technical audits, Core Web Vitals analysis, and content gap identification.",
    endpoint: "plugin:claude-seo",
    defaultPermissions: ["read", "execute"],
    tools: ["seo_audit", "seo_technical", "seo_schema", "seo_geo"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: true,
  },
  {
    id: "market-intel",
    displayName: "Market Intelligence",
    category: "strategy-finance",
    kind: "mcp",
    description:
      "Merger/acquisition comps, industry multiples, and exit analysis.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["comp_search", "multiple_lookup", "exit_model"],
    requiredEnv: ["MARKET_INTEL_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },

  // ── Data & Sensor Ingestion ───────────────────────────────────────────
  {
    id: "lidar-spatial-data",
    displayName: "LiDAR Spatial Data",
    category: "data-sensor",
    kind: "mcp",
    description:
      "2D/3D point cloud processing, room mesh segmentation, and coordinate mapping.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: [
      "ingest_pointcloud",
      "segment_mesh",
      "map_coordinates",
      "export_floorplan",
    ],
    requiredEnv: ["LIDAR_PIPELINE_URL", "LIDAR_PIPELINE_TOKEN"],
    scopes: ["clean"],
    provisioned: false,
  },
  {
    id: "webrtc-stream-parser",
    displayName: "WebRTC Stream Parser",
    category: "data-sensor",
    kind: "mcp",
    description:
      "Low-latency audio/video chunking and real-time PCM normalization.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["chunk_stream", "normalize_pcm", "transcribe_segment"],
    requiredEnv: ["WEBRTC_PARSER_URL"],
    scopes: ["gomarco", "clean"],
    provisioned: false,
  },
  {
    id: "plaid-finance",
    displayName: "Plaid Finance",
    category: "data-sensor",
    kind: "mcp",
    description:
      "Bank account verification schema and reward point balance indexing.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["link_account", "verify_account", "index_rewards"],
    requiredEnv: ["PLAID_CLIENT_ID", "PLAID_SECRET", "PLAID_ENV"],
    scopes: ["gomarco", "lhfyc"],
    provisioned: false,
  },
  {
    id: "travel-apis",
    displayName: "Travel APIs",
    category: "data-sensor",
    kind: "mcp",
    description:
      "Duffel, Amadeus, Sabre, and Skyscanner live rate and availability queries.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["search_flights", "search_stays", "price_quote", "availability"],
    requiredEnv: [
      "DUFFEL_API_KEY",
      "AMADEUS_CLIENT_ID",
      "AMADEUS_CLIENT_SECRET",
    ],
    scopes: ["gomarco"],
    provisioned: false,
  },
  {
    id: "data-compression",
    displayName: "Data Compression",
    category: "data-sensor",
    kind: "mcp",
    description:
      "Lossless sensor compression, vector math acceleration, and JSON-to-binary packing.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["compress_sensor", "pack_binary", "accelerate_vector"],
    requiredEnv: [],
    scopes: ["hvgapp", "clean", "gomarco"],
    provisioned: false,
  },

  // ── Commerce & Billing ────────────────────────────────────────────────
  {
    id: "shopify-printful",
    displayName: "Shopify / Printful",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Catalog syncing, print-on-demand fulfillment automation, and product variant setup.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: [
      "sync_catalog",
      "create_variant",
      "submit_order",
      "fulfillment_status",
    ],
    requiredEnv: [
      "SHOPIFY_ADMIN_TOKEN",
      "SHOPIFY_STORE_DOMAIN",
      "PRINTFUL_API_KEY",
    ],
    scopes: ["three", "lhfyc", "clean", "itshvg"],
    provisioned: false,
  },
  {
    id: "stripe-billing",
    displayName: "Stripe Billing",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Tiered subscription modeling, payment dispute management, and fee optimization.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["create_price", "model_tier", "list_disputes", "fee_report"],
    requiredEnv: ["STRIPE_SECRET_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "stripe-treasury",
    displayName: "Stripe Treasury",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Revenue aggregation and multi-entity fund routing, including Connect escrow flows.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: [
      "aggregate_revenue",
      "route_funds",
      "escrow_hold",
      "escrow_release",
    ],
    requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_CONNECT_ACCOUNT_ID"],
    scopes: ["hvgapp", "lhfyc", "three", "clean"],
    provisioned: false,
  },
  {
    id: "supplier-sourcing",
    displayName: "Supplier Sourcing",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Alibaba and domestic blank supplier cost-sheet analysis with lead-time benchmarking.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["search_suppliers", "cost_sheet", "lead_time_benchmark"],
    requiredEnv: ["SUPPLIER_SOURCING_API_KEY"],
    scopes: ["three", "lhfyc", "clean"],
    provisioned: false,
  },
  {
    id: "portfolio-analytics",
    displayName: "Portfolio Analytics",
    category: "strategy-finance",
    kind: "mcp",
    description: "Cross-brand P&L, burn rate, and capital efficiency tracking.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["pnl_rollup", "burn_rate", "capital_efficiency"],
    requiredEnv: ["PORTFOLIO_ANALYTICS_URL", "PORTFOLIO_ANALYTICS_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "cap-table-equity",
    displayName: "Cap Table & Equity",
    category: "strategy-finance",
    kind: "mcp",
    description:
      "Deal structuring, valuation modeling, and cap table governance.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["model_valuation", "structure_deal", "cap_table_snapshot"],
    requiredEnv: ["CAP_TABLE_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },

  // ── Creative & Production ─────────────────────────────────────────────
  {
    id: "midjourney-api",
    displayName: "Midjourney API",
    category: "creative-production",
    kind: "mcp",
    description:
      "Character turnaround sheets, stylistic scene generation, and prompt parameter tuning.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["imagine", "turnaround_sheet", "vary_region", "upscale"],
    requiredEnv: ["MIDJOURNEY_API_KEY"],
    scopes: ["three", "itshvg", "gomarco", "clean"],
    provisioned: false,
  },
  {
    id: "runway-sora-gen",
    displayName: "Runway / Sora Generation",
    category: "creative-production",
    kind: "mcp",
    description:
      "Generative video rendering, keyframe motion control, and animatic sequencing.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["render_clip", "keyframe_motion", "sequence_animatic"],
    requiredEnv: ["RUNWAY_API_KEY", "SORA_API_KEY"],
    scopes: ["three", "itshvg", "gomarco"],
    provisioned: false,
  },
  {
    id: "elevenlabs-voice",
    displayName: "ElevenLabs Voice",
    category: "creative-production",
    kind: "mcp",
    description: "Voice cloning, comedic delivery tuning, and audio mastering.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["synthesize", "clone_voice", "tune_delivery", "master_audio"],
    requiredEnv: ["ELEVENLABS_API_KEY"],
    scopes: ["three", "itshvg", "lhfyc"],
    provisioned: false,
  },
  {
    id: "canva-brand",
    displayName: "Canva Brand",
    category: "creative-production",
    kind: "mcp",
    description:
      "Canva Brand Kit generation, programmatic template autofill, and asset sync.",
    endpoint: "claude_ai_Canva",
    defaultPermissions: ["read", "write"],
    tools: [
      "list-brand-kits",
      "create-brand-template-draft",
      "create-design-from-brand-template",
      "export-design",
    ],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: true,
  },
  {
    id: "figma-tokens",
    displayName: "Figma Tokens",
    category: "creative-production",
    kind: "mcp",
    description:
      "Figma REST API sync, design token extraction, and CSS/Tailwind export.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["sync_file", "extract_tokens", "export_tailwind"],
    requiredEnv: ["FIGMA_ACCESS_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "fable-narrative-engine",
    displayName: "Fable Narrative Engine",
    category: "creative-production",
    kind: "mcp",
    description:
      "Dialogue pacing, comedic timing, and episodic structure support.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["pace_dialogue", "beat_sheet", "episode_outline"],
    requiredEnv: [],
    scopes: ["three", "itshvg", "lhfyc"],
    provisioned: false,
  },
  {
    id: "copywriting-frameworks",
    displayName: "Copywriting Frameworks",
    category: "creative-production",
    kind: "mcp",
    description: "PAS, AIDA, and StoryBrand messaging architectures.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["apply_pas", "apply_aida", "apply_storybrand"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },

  // ── Engineering ───────────────────────────────────────────────────────
  {
    id: "claude-code",
    displayName: "Claude Code",
    category: "engineering",
    kind: "mcp",
    description:
      "Full Claude Code CLI skill pack for terminal execution and system refactors.",
    endpoint: "local:claude-code",
    defaultPermissions: ["read", "write", "execute"],
    tools: ["run_task", "edit_file", "run_tests"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: true,
  },
  {
    id: "docker-k8s-infra",
    displayName: "Docker / Kubernetes Infra",
    category: "engineering",
    kind: "mcp",
    description:
      "Container orchestration, serverless microservices, and edge deployments.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["build_image", "apply_manifest", "scale_service", "rollout_status"],
    requiredEnv: ["KUBECONFIG"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "github-repo-architect",
    displayName: "GitHub Repo Architect",
    category: "engineering",
    kind: "mcp",
    description:
      "Repo scaffolding, monorepo workspace setup, and CI/CD pipeline definition.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["scaffold_repo", "add_workspace", "define_pipeline"],
    requiredEnv: ["GITHUB_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "database-schema",
    displayName: "Database Schema",
    category: "engineering",
    kind: "mcp",
    description:
      "PostgreSQL/Supabase relational schemas and Prisma/Drizzle ORM modeling.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["introspect_schema", "generate_migration", "model_entity"],
    requiredEnv: ["DATABASE_URL"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "codebase-context",
    displayName: "Codebase Context",
    category: "engineering",
    kind: "mcp",
    description:
      "Semantic code indexing and cross-repo dependency graph analysis.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: ["index_repo", "semantic_search", "dependency_graph"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "ast-parser",
    displayName: "AST Parser",
    category: "engineering",
    kind: "mcp",
    description:
      "Abstract Syntax Tree code transformation and automated codemods.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["parse_ast", "apply_codemod", "rewrite_node"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "api-contract",
    displayName: "API Contract",
    category: "engineering",
    kind: "mcp",
    description:
      "OpenAPI/Swagger specs, gRPC protocol buffers, and Zod validation schemas.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: [
      "generate_openapi",
      "generate_proto",
      "generate_zod",
      "validate_contract",
    ],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "playwright-jest-runner",
    displayName: "Playwright / Jest Runner",
    category: "engineering",
    kind: "mcp",
    description:
      "Automated browser E2E test execution and unit test generation.",
    endpoint: "plugin:playwright",
    defaultPermissions: ["execute"],
    tools: ["run_e2e", "generate_unit_tests", "browser_snapshot"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: true,
  },
  {
    id: "git-pr-automation",
    displayName: "Git PR Automation",
    category: "engineering",
    kind: "mcp",
    description:
      "Automated branch isolation, atomic pull requests, and merge conflict resolution.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["create_branch", "open_pr", "resolve_conflict"],
    requiredEnv: ["GITHUB_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "crm-apollo",
    displayName: "Apollo CRM",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Targeted executive outreach, pipeline tracking, and contract negotiation status.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["find_contact", "log_touch", "pipeline_status"],
    requiredEnv: ["APOLLO_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "clean", "three"],
    provisioned: false,
  },
  {
    id: "proposal-contract",
    displayName: "Proposal & Contract",
    category: "commerce-billing",
    kind: "mcp",
    description:
      "Sponsorship term sheets, non-disclosure agreements, and revenue-share frameworks.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["draft_term_sheet", "draft_nda", "model_rev_share"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "clean", "three"],
    provisioned: false,
  },
  {
    id: "jsonld-schema-validator",
    displayName: "JSON-LD Schema Validator",
    category: "intelligence-web",
    kind: "mcp",
    description:
      "Rich snippet validation, entity graph mapping, and Breadcrumb/Product/FAQ schema.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["validate_jsonld", "map_entity_graph", "generate_schema"],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },

  // ── Safety & Platform ─────────────────────────────────────────────────
  {
    id: "crisis-nlp-filter",
    displayName: "Crisis NLP Filter",
    category: "safety-platform",
    kind: "mcp",
    description:
      "Real-time sentiment and crisis keyword detection for immediate human escalation.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: ["score_message", "detect_crisis", "classify_risk"],
    requiredEnv: ["CRISIS_NLP_URL", "CRISIS_NLP_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "human-escalation-webhook",
    displayName: "Human Escalation Webhook",
    category: "safety-platform",
    kind: "mcp",
    description:
      "Instant SMS/call notification dispatcher to Peter for safety emergencies.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["page_human", "escalate_urgent"],
    requiredEnv: ["ESCALATION_WEBHOOK_URL", "ESCALATION_WEBHOOK_SECRET"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "support-triage",
    displayName: "Support Triage",
    category: "safety-platform",
    kind: "mcp",
    description:
      "Zendesk, Discord, Discourse, and customer inbox ticket categorization.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["categorize_ticket", "assign_queue", "draft_reply"],
    requiredEnv: ["ZENDESK_API_TOKEN", "DISCORD_BOT_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "buzz-platform",
    displayName: "Buzz Platform",
    category: "safety-platform",
    kind: "mcp",
    description:
      "Board manipulation, card routing, and custom feed webhooks on hvg.app.",
    endpoint: "local:buzz-cli",
    defaultPermissions: ["read", "write", "execute"],
    tools: [
      "board_list",
      "card_create",
      "card_move",
      "feed_webhook",
      "channels_list",
    ],
    requiredEnv: ["BUZZ_RELAY_URL", "BUZZ_PRIVATE_KEY", "BUZZ_AUTH_TAG"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: true,
  },
  {
    id: "linear-github-sync",
    displayName: "Linear / GitHub Sync",
    category: "safety-platform",
    kind: "mcp",
    description:
      "Bidirectional issue tracking, branch creation, and PR linking.",
    endpoint: null,
    defaultPermissions: ["read", "write"],
    tools: ["sync_issue", "create_branch", "link_pr"],
    requiredEnv: ["LINEAR_API_KEY", "GITHUB_TOKEN"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "notification-dispatcher",
    displayName: "Notification Dispatcher",
    category: "safety-platform",
    kind: "mcp",
    description: "Slack, Discord, and email webhook orchestrations.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: ["dispatch_slack", "dispatch_discord", "dispatch_email"],
    requiredEnv: ["SLACK_WEBHOOK_URL", "DISCORD_WEBHOOK_URL", "RESEND_API_KEY"],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },

  // ── Skill packs (bound to agents, not backed by a server process) ─────
  {
    id: "deep-debugger-skills",
    displayName: "Deep Debugger Skills",
    category: "engineering",
    kind: "skills",
    description:
      "Memory leak profiling, race condition elimination, and async stack trace analysis.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "tailwind-component-gen-skills",
    displayName: "Tailwind Component Gen Skills",
    category: "engineering",
    kind: "skills",
    description: "Rapid JSX/TSX component assembly from design tokens.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "error-boundary-skills",
    displayName: "Error Boundary Skills",
    category: "engineering",
    kind: "skills",
    description: "Component-level error capturing and fallback rendering.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "profiler-benchmark-skills",
    displayName: "Profiler & Benchmark Skills",
    category: "engineering",
    kind: "skills",
    description:
      "V8 CPU profiling, memory allocation auditing, and sub-millisecond execution optimization.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "wcag-accessibility-audit-skills",
    displayName: "WCAG Accessibility Audit Skills",
    category: "creative-production",
    kind: "skills",
    description:
      "Color contrast validation, focus-visible states, and screen reader paths.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "tailwind-theme-gen-skills",
    displayName: "Tailwind Theme Gen Skills",
    category: "creative-production",
    kind: "skills",
    description:
      "Fluid typography curves, CSS variable token sets, and micro-interaction states.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "script-bible-skills",
    displayName: "Script Bible Skills",
    category: "creative-production",
    kind: "skills",
    description:
      "Character voice consistency, theological nuance validation, and satirical balance.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: [],
    requiredEnv: [],
    scopes: ["three", "lhfyc", "itshvg"],
    provisioned: false,
  },
  {
    id: "lexicon-auditor-skills",
    displayName: "Lexicon Auditor Skills",
    category: "creative-production",
    kind: "skills",
    description:
      "Tone and vocabulary enforcement across distinct brand registers.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "landed-cost-calc-skills",
    displayName: "Landed Cost Calculator Skills",
    category: "commerce-billing",
    kind: "skills",
    description:
      "COGS, freight, customs, platform fee, and net margin mathematical modeling.",
    endpoint: null,
    defaultPermissions: ["execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "geo-aio-readiness-skills",
    displayName: "GEO / AI Overviews Readiness Skills",
    category: "intelligence-web",
    kind: "skills",
    description:
      "Generative Engine Optimization and AI Overviews citation-readiness scoring.",
    endpoint: null,
    defaultPermissions: ["read"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
  {
    id: "anti-predator-rules-skills",
    displayName: "Anti-Predator Rules Skills",
    category: "safety-platform",
    kind: "skills",
    description:
      "Automated detection of unverified treatment referrals, predatory financial DMs, and spam.",
    endpoint: null,
    defaultPermissions: ["read", "execute"],
    tools: [],
    requiredEnv: [],
    scopes: ["hvgapp", "itshvg", "gomarco", "lhfyc", "clean", "three"],
    provisioned: false,
  },
];

/** Every registered MCP server and skill pack, in declaration order. */
export const MCP_REGISTRY: readonly McpServerSpec[] = SERVERS;

const BY_ID: ReadonlyMap<string, McpServerSpec> = new Map(
  SERVERS.map((server) => [server.id, server]),
);

/** Look up a server or skill pack by id. */
export function getMcpServer(id: string): McpServerSpec | undefined {
  return BY_ID.get(id);
}

/** Every registered id, for validation. */
export function mcpServerIds(): readonly string[] {
  return SERVERS.map((server) => server.id);
}

/** Servers only (excludes skill packs). */
export function mcpServersOnly(): readonly McpServerSpec[] {
  return SERVERS.filter((server) => server.kind === "mcp");
}

/** Skill packs only. */
export function skillPacksOnly(): readonly McpServerSpec[] {
  return SERVERS.filter((server) => server.kind === "skills");
}
