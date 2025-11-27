# ACTA – Complete UX/UI Product Design Prompt  
*(Consensus Thermometer removed)*

---

## PRODUCT OVERVIEW

**Name:** Acta  
**Mission:** Help people move from indecision → informed clarity → confident action using data-driven consensus on complex global issues.

**Core Value Proposition:**  
**Understand. Decide. Act.**  
Acta distills global reporting into clear, balanced insights so anyone can rapidly grasp important issues and take meaningful, credible action.

---

# TARGET USERS & PERSONAS

---

## PERSONA 1 — “The Partially Informed Achiever”
**Name:** Clara Martins — 34 — Data Analyst  

Wants to stay informed but lacks time. Reads reputable outlets superficially. Knows she’s in an ideological bubble but can’t maintain balanced consumption. Feels confident until contradicted, then becomes unsure.

### Needs
- Pre-conversation clarity  
- Easily validate whether her view matches global consensus  
- Avoid opening 20 tabs  
- Understand any topic in <2 minutes  

### Quotes
- “Eu queria uma resposta clara, não vinte artigos.”  
- “Será que estou só repetindo a narrativa da minha bolha?”  

---

## PERSONA 2 — “The Silent Curious One”
**Name:** Renata Duarte — 29 — Physiotherapist  

Wants to participate but feels “behind.” Depends on Instagram/TikTok/WhatsApp for news. Afraid of saying something wrong. Wants objective, trustworthy basics.

### Needs
- A safe, neutral way to learn quickly  
- Enough confidence to say one informed sentence  
- Understand the landscape before forming an opinion  

### Quotes
- “Gente, eu realmente não sei… vocês podem explicar?”  
- “Vi um vídeo mas nem sei se era confiável.”  

---

## SECONDARY ARCHETYPES FOR SCENARIOS
- **O Tio Opinado** (fala muito, lê pouco)  
- **O Amigo Cético** (lê bastante, acredita em viés em tudo)  
- **A Prima Ansiosa** (mistura emoções e fatos)

Use them for narrative tests, onboarding scenes, empty states, and communication tone.

---

# PRIMARY USER FLOWS

### 1. Confusion → Clarity → Action
Home → Select Topic → Verdict Card → Debate Card → Action CTA

### 2. Cause Discovery
Home → Pick Your Cause Wizard → 3 Recommendations → External CTA

### 3. Transparency
Any Issue → Transparency Panel → Sources → Methodology

---

# INFORMATION ARCHITECTURE
**Navigation:** Home • Topics • Pick Your Cause • Transparency

---

# KEY SCREENS & MODULES

---

## 1. Homepage

### Hero
**Headline:** *Understand. Decide. Act.*  
Subheadline explaining Acta’s mission.  
Neutral, modern, calm layout.  
**Primary CTA:** Explore Topics.

### Featured Topics (3)
- Gaza/Israel Conflict  
- Drug Policy & Violence  
- AI Regulation  

Each requires a **neutral, abstract illustration** (non-emotional).

### Secondary Section
**Other Humanitarian Crises** — awareness-only module.

### Additional Elements
- “How Acta Works” (simple 1–2–3 structure)  
- Light trust indicators: source transparency, methodology  
- Fully mobile-first

---

## 2. Verdict Card (Core Feature)

This is Acta’s central UX artifact. Prototype all states.

### Structure
- **Question:** Binary yes/no framing  
- **Verdict Badge:**  
  Yes / Leaning Yes / Split / Leaning No / No / No Consensus  
- **Confidence Level:**  
  Very High / High / Medium / Low (0–100% behind the scenes)  
- **Why (3 bullets):** With citations  
- **Main Dissent (1 point):** With citation  
- **Unknowns (1 point):** Missing evidence  
- **Scope Note:** “Based on X global sources, [date range]”  
- **Safety Note (as needed):** Neutral anti-hate reminder

### Design Goals
- Clara gets grounded before a conversation  
- Renata understands the topic in <2 min  
- Tone: neutral, calm, transparent  
- Clean hierarchy, readable on mobile

---

## 3. Debate Card

A complementary, nuance-oriented module.

### Content
- 6–10 line neutral overview  
- **Top 3 Arguments For**  
- **Top 3 Arguments Against**  
- **What’s Still Unclear**  
- All with visible citations

### Goal
Provide clarity without forcing a conclusion; enable users to see the main contours of the debate.

---

## 4. Pick Your Cause Wizard

A short conversational flow (6–8 screens).

### Questions
- Preferred action: Donate / Volunteer / Advocate / Learn  
- Time available  
- Comfort with risk  
- Value alignment  
- Geographic preference  

### Output
Three recommended causes with:  
- Impact level  
- Effort required  
- Risk  
- Short rationale  
- Direct CTAs

---

## 5. Transparency Panel

### Elements
- Outlet list with **ideology tags** (Left / Center / Right)  
- Credibility scoring  
- Explanation of methodology  
- Filters: ideology, credibility, geography  
- Accessible table layout  

### Goal
Build trust through openness and neutrality.

---

## 6. Feedback System
- Quick options: **Useful**, **Biased**, **Inaccurate**  
- Optional text field  
- Friendly micro-confirmation

---

# VISUAL STYLE & BRAND GUIDELINES

---

## Inspiration
- **Typography clarity:** https://linear.app  
- **Modern journalism aesthetic:** https://www.technologyreview.com  
- **Color mood:** https://hai.stanford.edu  

---

## Base Style
- Minimal, clean, quiet  
- Sans-serif fonts (Inter, Manrope)  
- Base palette: greys + sand tones  
- Accent colors: desaturated blue / muted purple / soft orange  
- Flat or ultra-soft shadows  
- Small radii (<12px)  
- Journalistic spacing and hierarchy  

---

## Avoid
- Bright/saturated colors (neon, bright red/green/blue)  
- Strong gradients  
- Emotional photography (protests, destruction, children)  
- Deep shadows / floating cards  
- “Cool” tech-startup grotesque fonts  
- Emojis  
- Activist/influencer visual language  

**Goal:** Calm credibility, neutrality, and modernity.

---

# CONTENT STRATEGY

- Excerpts must be short  
- Always link to original sources  
- Visible, clickable citations  
- Clear disclaimers on sensitive topics  
- Factual, non-advocacy tone  
- WCAG AA accessibility throughout  

---

# TECHNICAL PROTOTYPING NOTES

- Use mock data  
- Include:  
  - Loading states  
  - Error states  
  - Empty states  
  - All verdict badge variations  
  - Low/medium/high confidence states  
- All interactions should be clickable  
- Fully responsive layouts  
- Fast loading (<1.2s p95 ideal)

---

# DESIGN GOAL RECAP

Design a full interactive prototype where users can move from:

**Confusion → Clarity → Neutral Understanding → Action.**

Users should feel:
- informed  
- not overwhelmed  
- not judged  
- confident to speak  

---

# FINAL OUTPUT REQUEST

Produce a **complete UX/UI prototype** containing:  
- All pages  
- All flows  
- All component states  
- Topic illustrations  
- Clean, minimal, trustworthy visuals  
- Full responsiveness  
- Realistic microcopy  

---
