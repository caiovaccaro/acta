# Guidelines for Formulating Binary Questions

## Context
Acta relies on a central UX component to deliver value: the question that anchors each “verdict.”  
It is the question that defines:

- the type of evidence that will be collected,
- the consensus calculation,
- what the user receives as an answer,
- the clarity (or confusion) of the experience.

Some points:

- Binary (“Yes/No”) questions work best for the MVP:
  - they are easier to read and understand quickly;
  - they offer clarity for users;
  - they allow for more stable consensus calculations;
  - they favor a consistent experience — “see the verdict.”

But binary questions can introduce bias if not well formulated.

Some formulations assumed prior knowledge (“public health vs repression”) or carried a moral angle (“ending drug trafficking”).

We need a framework to define good binary questions:
A simple set of rules ensuring that every question:
- is clear,
- reflects the actual debate,
- can be answered with evidence,
- does not require specialized knowledge,
- and avoids embedding biases in the wording itself.

The framework will also enable future automation:
The tool will be able to:
- capture questions suggested by editors and/or users,
- validate whether they comply with the framework,
- propose automatic reformulations (e.g., rewrite the question to make it clear, binary, and neutral).

---

## Objective of the Framework
Standardize how binary questions are created so that:
- the product maintains editorial consistency,
- the system can calculate verdicts reliably,
- and the user can quickly understand “what is being decided.”

The framework should apply to:
- topics chosen by editors,
- questions manually entered into the internal tool,
- questions suggested by users (if we add this feature),
- prompts that feed the question-reformulation automation.

---

## General Principles
A good binary question in Acta must:

- Reflect the real debate, not a technical or artificial construction.
- Be understandable to anyone, without requiring expertise.
- Be neutral, without pushing the user toward one side.
- Be answerable based on evidence.
- Allow for a natural “Yes/No” without ambiguity.
- Align with current news, increasing relevance.
- Have a clear and measurable goal (e.g., reducing violence, protecting democracy, preventing deaths).

---

# Framework for Formulating Binary Questions
A framework as a logical checklist for validation and/or automatic generation.

---

## 1. Public Clarity
The question must be understandable by any user without additional explanation.

**Check**
- Does the question use terms that appear in news and everyday conversations?
- Would the persona “Clara” instantly recognize what is being asked?

**Example**
- ✔️ “Is police repression the most effective way to reduce violence linked to drug trafficking?”
- ✖️ “Do public health approaches reduce violence more than repressive solutions?”

---

## 2. Alignment with the Real Debate
The question must mirror the most recognized axis of the public debate.

**Check**
- Do both sides already exist in the news and general culture?
- Are we avoiding invention of a technical trade-off that people don't know exists?

**Example**
- ✔️ Police repression vs alternatives.
- ✖️ Public health vs multilateral regulatory interdictions.

---

## 3. Simplicity Without Bias
The question cannot carry moral judgment (“fight against,” “defend values,” “put an end to”).  
It must focus on effectiveness, not morality.

**Recommended format**  
**“Is X the most effective way to achieve Y?”**

**Check**
- Does the question avoid morally charged verbs?
- Does the phrasing avoid suggesting a preferred answer?

---

## 4. Anchoring in Current News
The topic must relate to real events happening around the current moment.  
This improves understanding and engagement.

**Check**
- If this question appeared in a feed today, would it make sense to the user?

---

## 5. Explicit Objective
The question needs a clearly defined metric.

**Examples of good objectives:**
- reducing violence,
- preventing civilian deaths,
- reducing corruption,
- protecting elections,
- preventing abuses of power.

**Check**
- Is the outcome explicit and measurable?
- Are we avoiding leaving the “objective” implicit?

---

## 6. Clear Binary Nature
Both sides of the question must be plausible.  
Users should be able to answer “yes” or “no” immediately.

**Check**
- Would someone with different ideological leanings still answer naturally?
- Is there not an obvious third option that should be included?

---

## 7. Must Be Answerable with Evidence
The question must be empirically verifiable:
using data, comparative studies, historical public policies, etc.

**Check**
- Is there enough evidence for the tool to produce a reliable verdict?
- Can Acta collect articles from all three ideological spectrums that answer the question?

---

# Applied Example: “Drugs & Violence”
Ideal question following the framework:  
👉 **“Is police repression the most effective way to reduce violence linked to drug trafficking?”**

**Why it fits the framework:**
- Familiar terms (Clarity).
- Mirrors the real debate (repression vs alternatives).
- No embedded bias (Simple and neutral).
- Relevant in the news (Rio, El Salvador, USA, Mexico).
- Clear objective (reducing violence).
- Obvious binary structure.
- Answerable with comparable evidence.

---

# Use in Tool Development

## A. Question Intake (editors or users)
When a question enters the system:
- The backend/LLM must evaluate whether it meets the framework.
- If it does not, generate one or more reformulations that follow the rules above.
- Show the editor the original version vs the proposed versions.

---

## B. Automatic Generation of Suitable Questions
The system must:
- Detect the main axis of the debate in the original question.
- Identify the objective (e.g., reduce violence, prevent deaths, etc.).
- Simplify the language to a general-culture level.
- Produce a clear, neutral, and answerable binary question.

---

## C. Validation
Every final question must pass the checklist:

- Is it clear?
- Does it reflect the real debate?
- Is it neutral?
- Is it anchored in current news?
- Does it define the objective explicitly?
- Does it have a natural binary answer?
- Is it answerable with evidence?

Only if all answers are “Yes” should the question move to the evidence-collection and verdict-generation stage.
