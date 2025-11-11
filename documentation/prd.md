PRD — Acta [Codename] (Phase 1 MVP)
Mission
Help people move from indecision to informed action.
Modern news feeds overload users with causes, opinions, and moral noise. People want to act but don’t know what’s true, what matters most, or what’s effective.
Actia gives users:
A clear answer — what the global consensus currently says.
The confidence to act — one visible “verdict,” not fifty scattered takes.
A way forward — credible actions that match their time, values, and means.


The MVP tests if a data-driven, transparent “wisdom of crowds” verdict can break indecision and nudge informed civic engagement.

1. MVP Scope
Core Topics (3)
[Ethical / political debate] Gaza / Israel — War and Accountability
 Question: “Is what’s happening in Gaza a genocide?”
 Goal: Produce a clear, evidence-based verdict grounded in diverse, credible journalism without crossing into hate or advocacy.


[Socioeconomic debate] Drug Policy & Violence
 Question: “Do health-led approaches reduce drug-related violence more effectively than repression?”
 Goal: Deliver a verdict that shows which approach the consensus supports and why.


[Technological debate] Artificial Intelligence — Regulation vs. Innovation
 Question: “Should AI be regulated now to protect society without stifling progress?”
 Goal: Offer a directional answer and highlight areas of remaining disagreement.


Secondary Module
Other Humanitarian Crises — automatically lists other undercovered conflicts (e.g., Sudan, Yemen, Congo) using news volume data. Awareness only, no CTAs.
Language and Geography
Global, English-first. No local CTAs or translations in the MVP.

2. Target Users
• Educated adults aged 25–45.
 • Politically aware but time-constrained.
 • Feel overwhelmed by noise and indecision; want concise clarity and practical action.
 • Don’t read long-form journalism regularly but trust structured, data-backed summaries.

3. Value Proposition
See. Decide. Act.
 • See — the distilled global consensus from credible, ideologically balanced media.
 • Decide — one transparent verdict with supporting reasoning and dissent.
 • Act — personalized actions tied to each issue and aligned with user intent.

4. Core Features
F1 – Verdict Card
Purpose: Replace ambiguity with a definitive, data-backed stance.
Displayed Fields
 • Question (e.g., “Is what’s happening in Gaza a genocide?”)
 • Verdict: Yes / Leaning Yes / Split / Leaning No / No
 • Confidence: 0–100% (Very High, High, Medium, Low)
 • Why (3 bullets): short evidence lines with citations from ideologically diverse sources.
 • Main Dissent (1 bullet): key counter-argument with citation.
 • Unknowns (1 bullet): missing facts or pending developments.
 • Scope Note: number of sources and date window.
 • Safety Note (if relevant): anti-hate or neutrality reminder.
Verdict Rules
Each article labeled by stance → outlet stance → weighted consensus.
Outlets weighted by credibility and normalized across ideology buckets (Left / Center / Right).
Verdict computed from aggregate support share S and ideological dispersion:
Yes ≥ 0.67 S, low variance
Leaning Yes 0.55–0.67 or moderate variance
Split 0.45–0.55 or high variance
Leaning No 0.33–0.45
No ≤ 0.33
Confidence = distance from 0.5 × (1 − variance).
The user sees:
Verdict: Leaning Yes (Confidence 72%)
 Most global outlets frame the situation as a humanitarian crisis with indicators of genocidal acts. Dissent focuses on intent and legal definitions.

F2 – Consensus Thermometer
Visualizes how Left / Center / Right buckets distribute their stances.
Weighted bars show proportion of outlets per verdict label.
Clicking reveals outlet name, headline, one-sentence rationale, and link.


F3 – Debate Card
Concise factual synthesis:
 • 6–10 line neutral overview.
 • “Top 3 Arguments For” and “Top 3 Against.”
 • “What’s Still Unclear.”
 • Source citations.
F4 – Pick Your Cause Wizard
Conversational 6–8 question form:
 • Preferences: type of action (donate / volunteer / advocate / learn), available time, comfort with risk.
 • Outputs: 3 recommended causes with Impact / Effort / Risk ratings and direct links.
 • Example: “Join an independent fact-checking initiative” or “Support a humanitarian NGO.”
F5 – Transparency Panel
• Full list of outlets, ideology tags, credibility scores, and scoring method.
 • Public explanation of verdict calculation.
 • Filter to view contributions per ideology.
F6 – Feedback
“Useful / Biased / Inaccurate” buttons + free-text notes for calibration.

5. Source Model
Ideological Balance (~⅓ each)
Left: The Guardian, The Atlantic, Vox, Der Spiegel, Le Monde, Al Jazeera Eng., Haaretz.
Center: BBC, Reuters, Financial Times, Bloomberg, The Economist, Associated Press.
Right: Wall Street Journal, The Telegraph, The Times (UK), The Spectator, National Review, Jerusalem Post, Die Welt, Le Figaro.


Balance may evolve; maintain symmetry and transparency.
Credibility Score (0–1)
External Trust (70%): Ad Fontes reliability, MBFC factual rating, Reuters Institute trust indices.
Transparency (30%): bylines, editorial policy, citation density.
 
If missing data → 0.5 (Provisional).
Normalize so Left, Center, and Right buckets each sum to equal total weight.

6. Data & AI Pipeline
Ingestion – Fetch latest articles via RSS or APIs by topic keyword.
Storage – Article metadata, outlet, date, raw text or snippet.
Processing –
 • Stance Classification: LLM assigns stance label and confidence.
 • Summarization: short neutral summary per issue.
 • Argument Extraction: key pro/con bullets.


Aggregation – Compute verdict metrics (S, variance) → populate Verdict Card.
Refresh Cycle: Daily, 14-day rolling window.
APIs: JSON endpoints for topics, verdicts, consensus data, sources, actions, feedback.



7. UX Flows
Learn → Decide → Act
 Home → Select Issue → Verdict Card → Consensus Thermometer → Debate Card → Act Now.
Pick Your Cause
 Home → Wizard → Recommendations (3) → Select → External CTA.
Transparency
 Any Issue → Source Table → Method and Weighting.

8. Acceptance Criteria
Three live issues with ≥6 sources from ≥2 ideology buckets.
Each issue displays one Verdict Card with:
Verdict label and confidence.
Three “Why” bullets, one dissent, one unknowns.
Consensus Thermometer correctly reflects weighted stances.
Debate Card present with neutral summary and citations.
Wizard outputs 3 valid recommendations.
Transparency and feedback functional.
Page load under 1.2 s (p95), uptime ≥99 %.

9. Non-Functional & Ethical
Neutral, factual tone; no advocacy.
Short excerpts only; always link to originals.
Anonymous analytics; no personal data.
Accessibility (WCAG AA).
GDPR-compliant privacy statement.
For Gaza: explicit disclaimer against antisemitism, Islamophobia, or hate speech.

10. Success Metrics
Metric
Target
Users clicking “Act Now”
≥ 15 %
Average session
≥ 90 s
“Useful : Biased” feedback ratio
≥ 4 : 1
Credibility table visible
Yes


11. Developer Autonomy
The developer defines:
 • Stack, data architecture, and deployment.
 • Implementation sequencing.
 • Monitoring and QA strategy.
Prioritize determinism, transparency, and visible balance.
If users can read one clear verdict, see the evidence behind it, and take a credible next step — the MVP has succeeded.


