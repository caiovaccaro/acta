# Research: Article Analysis & Verdict Pipeline

## Overview

This document outlines the research and implementation approach for analyzing article content, categorizing by theme and ideology, and generating consensus verdicts with evidence-based answers.

## Core Requirements

Based on PRD and Verdict Card spec:

1. **Theme/Topic Extraction**: Automatically identify themes from articles and group related articles
2. **Question Extraction & Validation**: Analyze articles about a topic and extract the main ideological question, then validate against formulation framework (7 checks: Public Clarity, Alignment with Real Debate, Simplicity Without Bias, Anchoring in Current News, Explicit Objective, Clear Binary Nature, Answerable with Evidence)
3. **Stance Classification per Question**: For each question, determine each article's stance (Yes/No/Neutral)
4. **Consensus Stance Calculation**: Aggregate all article stances for a question to determine overall verdict (using outlet ideology for weighting - backend-only, never exposed in UI)
5. **Answer Synthesis**: Generate evidence-based answers from multiple articles
6. **Consensus Calculation**: Weighted aggregation with ideological balance (outlet ideology used for normalization, not stored per article)

## Implementation Approach

### Phase 1: Content Analysis Foundation

#### 1.1 Theme/Topic Extraction

**Approach Options:**

**Option A: LLM-Based Topic Clustering (Recommended)**
- Use embeddings (OpenAI, Cohere, or open-source like `sentence-transformers`)
- Cluster articles by semantic similarity
- Use LLM to generate topic labels and questions
- **Pros**: Handles nuanced topics, discovers new themes automatically
- **Cons**: Requires API costs, slower than rule-based

**Option B: Hybrid Approach (Best for MVP)**
- Keyword-based initial clustering (from article titles/content)
- LLM refinement: generate topic labels and questions
- Semantic similarity for grouping related articles
- **Pros**: Faster, more cost-effective, still discovers themes
- **Cons**: May miss subtle connections

**Option C: Pre-defined Topics (Simplest)**
- Start with 3 topics from PRD (Gaza, Drug Policy, AI Regulation)
- Use keyword matching to assign articles
- Expand later with clustering
- **Pros**: Fastest to implement, guaranteed coverage
- **Cons**: Doesn't discover new topics automatically

**Recommendation**: Start with **Option C** for MVP, evolve to **Option B** for production.

**Implementation Stack:**
- Embeddings: OpenAI `text-embedding-3-small` or `sentence-transformers/all-MiniLM-L6-v2`
- Clustering: `scikit-learn` KMeans or DBSCAN
- LLM: OpenAI GPT-4 or Claude for topic labeling

#### 1.2 Ideology Handling (Backend-Only)

**Decision**: Ideology is NOT tracked at the article level. Article ideology is inferred from outlet ideology for internal weighting calculations only. Ideology is **NEVER exposed in UI or API responses**.

**Approach:**
- Outlet ideology (from existing `Outlet` model) is used for:
  - Credibility weighting in consensus calculation
  - Normalizing weights across ideology buckets (Left/Center/Right)
  - Internal calculations only
- Article ideology is inferred from `article.outlet.ideology` when needed for consensus calculations
- No ideology field stored in `ArticleAnalysis` table
- Ideology data is backend-only and never displayed to users

**Implementation:**
```python
# Pseudo-code
def calculate_consensus_with_ideology_weighting(article_analyses):
    # Infer article ideology from outlet (not stored)
    for analysis in article_analyses:
        article = analysis.article
        outlet_ideology = article.outlet.ideology  # Left/Center/Right
        # Use outlet ideology for weighting (backend-only)
        # Never expose ideology in API/UI
```

#### 1.4 Stance Classification per Question

**Critical**: Stance is per-question, not per-article. After extracting a question, analyze all articles about that question to determine their stance.

**Process:**
1. Question is extracted from topic articles (e.g., "Is what's happening in Gaza a genocide?")
2. For that question, analyze each article to determine its stance
3. Store stance in `ArticleAnalysis` table (article_id, question_id, stance)
4. Aggregate all stances to determine consensus verdict for the question

**Stance Values:**
- **Yes** (strongly supports)
- **Leaning Yes** (moderately supports)
- **Neutral** (no clear stance)
- **Leaning No** (moderately opposes)
- **No** (strongly opposes)

**Approach:**

1. **LLM-Based Classification** (Recommended)
   - Prompt: "Given this question: [question], what is this article's stance?"
   - Extract stance + confidence score
   - **Pros**: Handles complex questions, context-aware
   - **Cons**: API costs, needs prompt engineering

2. **Fine-tuned Model** (Future)
   - Train on question-article pairs with stance labels
   - **Pros**: Faster, cheaper at scale
   - **Cons**: Requires training data

**Implementation Pattern:**
```python
def classify_article_stance_for_question(article, question):
    """
    Classify a single article's stance on a specific question.
    This is called for each article-question pair.
    """
    prompt = f"""
    Question: {question.question_text}
    
    Article Title: {article.title}
    Article Content: {article.textContent[:2000]}
    
    Classify the article's stance on this question:
    - Yes: Strongly supports the question's premise
    - Leaning Yes: Moderately supports
    - Neutral: No clear stance or doesn't address the question
    - Leaning No: Moderately opposes
    - No: Strongly opposes
    
    Return: stance, confidence (0-1), reasoning
    """
    result = llm.classify(prompt)
    
    # Store in ArticleAnalysis table
    return create_article_analysis(
        article_id=article.id,
        question_id=question.id,
        stance=result.stance,
        confidence=result.confidence,
        reasoning=result.reasoning
    )
```

### Phase 2: Question Extraction & Answer Synthesis

#### 1.3 Question Extraction & Validation (Critical Step)

**Challenge**: Analyze articles about a topic and extract the main ideological question, then validate it against the formulation framework.

**Key Insight**: Questions are NOT per-article. Instead:
1. Group articles by topic/theme (e.g., all articles about "Gaza")
2. Analyze the cluster together to identify what question they're addressing
3. Extract/identify the question (e.g., "Is what's happening in Gaza a genocide?")
4. **Validate question against formulation framework** (7 checks - see `documentation/formulating_questions.md`)
5. If validation fails, LLM reformulates the question to meet framework requirements
6. Store question in its own table, linked to the topic, with validation status
7. Only activated questions (validationStatus = 'validated') are used for article matching
8. Then, for that question, analyze all articles to determine stance

**Question Formulation Framework** (from `documentation/formulating_questions.md`):
1. **Public Clarity**: Understandable by any user without additional explanation
2. **Alignment with Real Debate**: Mirrors the most recognized axis of public debate
3. **Simplicity Without Bias**: Avoids moral judgment, focuses on effectiveness (format: "Is X the most effective way to achieve Y?")
4. **Anchoring in Current News**: Relates to real events happening around the current moment
5. **Explicit Objective**: Has a clearly defined, measurable metric (e.g., reducing violence, preventing deaths)
6. **Clear Binary Nature**: Both sides are plausible, natural Yes/No answer
7. **Answerable with Evidence**: Empirically verifiable using data, studies, policies

**Approach:**

1. **Pre-defined Questions with Framework Validation** (MVP)
   - Pre-defined question templates per topic (from PRD)
   - LLM validates questions against formulation framework (7 checks)
   - If validation fails, LLM generates reformulated versions
   - Editor reviews and approves reformulated question
   - **Pros**: Guaranteed relevance, ensures quality, aligns with PRD
   - **Cons**: Less flexible, may miss emerging questions

2. **LLM Question Extraction with Framework Validation** (Future)
   - Input: Cluster of articles about a topic (e.g., 10-50 articles about Gaza)
   - Analyze common themes, arguments, and debates
   - Extract question using LLM
   - **Automatically validate against formulation framework**
   - If validation fails, LLM reformulates
   - Store for moderation/approval
   - **Pros**: Discovers questions automatically, ensures quality through framework
   - **Cons**: May generate multiple questions, requires moderation

3. **Hybrid** (Best for Production)
   - Start with pre-defined questions for known topics (validated against framework)
   - Use LLM to discover new questions from article clusters
   - **All questions go through framework validation**
   - LLM reformulates if needed
   - Allow multiple questions per topic (e.g., Gaza could have multiple questions)

**Implementation Pattern:**
```python
def extract_and_validate_question(topic, articles, question_text=None):
    """
    Extract question from articles OR validate pre-defined question.
    Then validate against formulation framework.
    """
    # Step 1: Extract or use provided question
    if question_text:
        question = question_text  # Pre-defined from PRD
    else:
        # Extract from article cluster
        article_summaries = [extract_key_points(a) for a in articles]
        question = llm.extract_question_from_cluster(topic, article_summaries)
    
    # Step 2: Validate against formulation framework
    validation_results = validate_question_framework(question)
    
    # Step 3: If validation fails, reformulate
    if not validation_results.all_checks_passed:
        reformulated_versions = llm.reformulate_question(
            question, 
            failed_checks=validation_results.failed_checks
        )
        # Return original + reformulated versions for editor review
        return {
            'original': question,
            'validation_results': validation_results,
            'reformulated_versions': reformulated_versions,
            'status': 'needs_reformulation'
        }
    
    # Step 4: Store validated question
    return create_question(
        topic_id=topic.id,
        question_text=question,
        validation_status='validated',
        validation_results=validation_results,
        is_active=True
    )

def validate_question_framework(question):
    """
    Validate question against 7 framework checks.
    Returns validation results for each check.
    """
    prompt = f"""
    Question: {question}
    
    Validate this question against the formulation framework:
    1. Public Clarity: Is it understandable by any user?
    2. Alignment with Real Debate: Does it mirror the actual public debate?
    3. Simplicity Without Bias: Is it neutral, avoiding moral judgment?
    4. Anchoring in Current News: Is it relevant to current events?
    5. Explicit Objective: Does it have a clear, measurable goal?
    6. Clear Binary Nature: Can it be answered Yes/No naturally?
    7. Answerable with Evidence: Can it be verified with data/studies?
    
    Return: pass/fail for each check with notes.
    """
    return llm.validate_framework(prompt)
```

**Question Storage:**
- Questions live in their own `Question` table
- Linked to `Topic` (many questions per topic possible)
- Has metadata: 
  - `questionText` - The validated question
  - `originalQuestionText` - Original before reformulation (nullable)
  - `validationStatus` - pending/validated/rejected/needs_reformulation
  - `validationResults` - JSON with results of 7 framework checks
  - `isActive` - Only true if validationStatus = 'validated'
  - `extracted_at`, `confidence`, `source_articles_count`

#### 2.2 Consensus Stance Calculation per Question

**Challenge**: Aggregate all article stances for a question to determine overall verdict.

**Process:**
1. Get all `ArticleAnalysis` records for a question
2. Weight by outlet credibility and normalize by ideology
3. Calculate aggregate support share (S)
4. Calculate ideological dispersion (variance)
5. Determine verdict label and confidence
6. Store in `Verdict` table (question_id, verdict_label, confidence, etc.)

**Implementation:**
```python
def calculate_consensus_for_question(question):
    # Get all article analyses for this question
    article_analyses = get_article_analyses_by_question(question.id)
    
    # Get articles with their outlets
    articles = [aa.article for aa in article_analyses]
    outlets = {a.outlet for a in articles}
    
    # Weight outlets by credibility and normalize by ideology
    outlet_weights = normalize_by_ideology(outlets)
    
    # Aggregate stances
    stance_scores = {}
    for analysis in article_analyses:
        article = analysis.article
        outlet = article.outlet
        weight = outlet_weights[outlet.id]
        stance = analysis.stance
        
        # Convert stance to numeric (Yes=1, No=0, etc.)
        score = stance_to_score(stance)
        stance_scores[outlet.ideology] = stance_scores.get(outlet.ideology, 0) + (score * weight)
    
    # Calculate support share (S)
    total_weight = sum(outlet_weights.values())
    support_share = sum(stance_scores.values()) / total_weight
    
    # Calculate variance (ideological dispersion)
    variance = calculate_variance(stance_scores, outlet_weights)
    
    # Determine verdict
    verdict_label = determine_verdict(support_share, variance)
    confidence = calculate_confidence(support_share, variance)
    
    # Store verdict
    return create_verdict(
        question_id=question.id,
        verdict_label=verdict_label,
        confidence=confidence,
        support_share=support_share,
        variance=variance
    )
```

#### 2.3 Answer Synthesis

**Challenge**: Generate evidence-based answers from multiple articles with different stances for a question.

**Approach:**

1. **Multi-Document Summarization**
   - Use LLM to synthesize key arguments from all articles
   - Extract pro/con arguments
   - Identify consensus points
   - **Pros**: Handles multiple perspectives
   - **Cons**: May lose nuance

2. **Argument Extraction + Aggregation**
   - Extract arguments from each article
   - Group by stance (Yes/No)
   - Aggregate by ideology bucket
   - Generate summary from aggregated arguments
   - **Pros**: More transparent, preserves diversity
   - **Cons**: More complex

3. **RAG (Retrieval-Augmented Generation)** (Advanced)
   - Use embeddings to retrieve relevant article sections
   - Generate answer from retrieved context
   - **Pros**: Grounded in source material
   - **Cons**: More infrastructure needed

**Implementation Pattern:**
```python
def synthesize_answer_for_question(question, verdict):
    # Get all article analyses for this question
    article_analyses = get_article_analyses_by_question(question.id)
    
    # Group articles by stance
    yes_articles = [aa.article for aa in article_analyses if aa.stance in ['Yes', 'Leaning Yes']]
    no_articles = [aa.article for aa in article_analyses if aa.stance in ['No', 'Leaning No']]
    
    # Extract key arguments
    yes_arguments = extract_arguments(yes_articles, question)
    no_arguments = extract_arguments(no_articles, question)
    
    # Generate synthesis
    prompt = f"""
    Question: {question.question_text}
    Verdict: {verdict.verdict_label} (Confidence: {verdict.confidence}%)
    
    Arguments For: {yes_arguments}
    Arguments Against: {no_arguments}
    
    Generate:
    1. 3 "Why" bullets supporting the verdict (from diverse ideology sources)
    2. 1 "Main Dissent" bullet (opposing view)
    3. 1 "Unknowns" bullet (what's still unclear)
    """
    return llm.synthesize(prompt)
```

### Phase 3: Data Flow Summary

**Complete Flow:**

1. **Question Creation & Validation** → Editor submits question OR system extracts from articles → Validate against formulation framework → Reformulate if needed → Activate validated question
2. **Articles arrive** → Stored in `Article` table
3. **Topic Assignment** → Articles assigned to `Topic` (e.g., "Gaza")
4. **Question Matching** → Articles matched to validated questions → Only matching articles analyzed
5. **Stance Classification** → For each article-question pair, classify stance → Store in `ArticleAnalysis` table
6. **Consensus Calculation** → Aggregate all stances for a question (using outlet ideology for weighting - backend-only) → Store in `Verdict` table
7. **Answer Synthesis** → Generate evidence bullets → Store in `EvidenceBullet` table

## Task Sequence

### Phase 1: Foundation (Weeks 1-2)

1. **Database Schema Extension**
   - Add `Topic` model (id, name, description, safety_note_required) - The broad theme
   - Add `Question` model (id, topic_id, question_text, extracted_at, confidence, source_articles_count) - The specific question extracted from articles
   - Add `ArticleAnalysis` model (id, article_id, question_id, stance, ideology, confidence, reasoning, analyzed_at) - Per-article stance on a question
   - Add `Verdict` model (id, question_id, verdict_label, confidence, support_share, variance, calculated_at) - Consensus stance on a question
   - Add `EvidenceBullet` model (id, verdict_id, text, article_id, type: 'why'|'dissent'|'unknown') - Evidence supporting the verdict
   - Add indexes for performance (topic_id, question_id, article_id, etc.)

2. **LLM Integration Setup**
   - Choose LLM provider (OpenAI, Anthropic, or open-source)
   - Set up API client with retry logic
   - Create prompt templates
   - Implement rate limiting and cost tracking

3. **Basic Topic Assignment**
   - Start with 3 pre-defined topics from PRD (Gaza, Drug Policy, AI Regulation)
   - Keyword-based article-to-topic assignment
   - Manual topic creation interface (admin)

4. **Question Extraction & Validation**
   - For MVP: Use pre-defined questions from PRD
   - Validate all questions against formulation framework (7 checks)
   - If validation fails, LLM generates reformulated versions
   - Editor reviews and approves reformulated questions
   - Store questions in `Question` table with validation status
   - Only activated questions (validationStatus = 'validated') are used
   - Future: Extract questions from article clusters, then validate

### Phase 2: Content Analysis (Weeks 3-4)

5. **Stance Classification per Question**
   - Implement LLM-based stance classification
   - For each question, analyze all related articles
   - Classify article stance on that specific question
   - Store results in `ArticleAnalysis` (article_id, question_id, stance)

6. **Ideology Classification**
   - Implement LLM-based ideology detection per article
   - Fallback to outlet ideology if confidence low
   - Store in `ArticleAnalysis`

7. **Topic Clustering (Optional for MVP)**
   - Implement embedding-based clustering
   - Auto-discover topics from article clusters
   - Generate topic questions automatically

### Phase 3: Verdict Generation (Weeks 5-6)

8. **Consensus Calculation per Question**
   - Implement weighted consensus algorithm
   - Aggregate all article stances for a question
   - Calculate support share and variance
   - Determine verdict labels and confidence
   - Store in `Verdict` model (linked to Question, not Topic)

9. **Evidence Extraction**
   - Extract "Why" bullets from Yes/Leaning Yes articles (for the question)
   - Extract "Dissent" bullets from No/Leaning No articles
   - Extract "Unknowns" from analysis
   - Ensure ideological diversity in evidence
   - Store in `EvidenceBullet` table

10. **Answer Synthesis**
    - Implement multi-document summarization
    - Generate balanced answers from article clusters for the question
    - Link answers to evidence bullets

### Phase 4: Automation & Refinement (Weeks 7-8)

10. **Automated Processing Pipeline**
    - Trigger analysis when new articles arrive
    - Batch processing for backlog
    - Incremental updates (14-day rolling window)

11. **Quality Assurance**
    - Validation rules for verdicts
    - Confidence thresholds
    - Manual review interface for edge cases

12. **Performance Optimization**
    - Caching for verdict calculations
    - Batch LLM calls
    - Database query optimization

## Technology Stack Recommendations

### LLM Providers

**Option 1: OpenAI (Recommended for MVP)**
- Models: GPT-4 Turbo (analysis), GPT-3.5 Turbo (simple tasks)
- Embeddings: `text-embedding-3-small`
- **Pros**: Best performance, reliable, good documentation
- **Cons**: Higher cost, API rate limits

**Option 2: Anthropic Claude**
- Models: Claude 3 Opus/Sonnet
- **Pros**: Excellent for analysis, longer context
- **Cons**: Higher cost, newer API

**Option 3: Open Source (Future)**
- Models: Llama 2/3, Mistral, Mixtral
- **Pros**: No API costs, full control
- **Cons**: Requires infrastructure, lower quality

### Libraries & Tools

**Python:**
- `openai` / `anthropic` - LLM APIs
- `sentence-transformers` - Embeddings (open-source alternative)
- `scikit-learn` - Clustering
- `numpy` / `pandas` - Data processing
- `langchain` - LLM orchestration (optional, adds complexity)

**Node.js (if staying in JS/TS):**
- `openai` - OpenAI SDK
- `@anthropic-ai/sdk` - Anthropic SDK
- `@xenova/transformers` - On-device embeddings (experimental)

### Database Extensions

- **pgvector** - Already in use, for semantic search
- **Full-text search** - PostgreSQL native for keyword matching

## Learning Resources

### Core Concepts

**1. Topic Modeling & Clustering**
- **Book**: "Introduction to Information Retrieval" (Manning, Raghavan, Schütze) - Chapter 16-17
- **Video**: [Topic Modeling with LDA](https://www.youtube.com/watch?v=3mHy4OSyRf0)
- **Article**: [Topic Modeling: Beyond Bag of Words](https://www.machinelearningplus.com/nlp/topic-modeling-gensim-python/)
- **Practice**: [scikit-learn Clustering Tutorial](https://scikit-learn.org/stable/modules/clustering.html)

**2. Stance Classification & Sentiment Analysis**
- **Paper**: [Stance Detection: A Survey](https://arxiv.org/abs/2008.04914)
- **Tutorial**: [Fine-tuning BERT for Sentiment Analysis](https://huggingface.co/docs/transformers/training)
- **Video**: [Sentiment Analysis with Transformers](https://www.youtube.com/watch?v=5T-iXNNiwIs)

**3. Multi-Document Summarization**
- **Paper**: [Multi-Document Summarization: A Survey](https://arxiv.org/abs/2004.14784)
- **Article**: [Abstractive vs Extractive Summarization](https://www.analyticsvidhya.com/blog/2019/06/comprehensive-guide-text-summarization-using-deep-learning-python/)
- **Tutorial**: [Summarization with Hugging Face](https://huggingface.co/docs/transformers/tasks/summarization)

**4. LLM Prompt Engineering**
- **Course**: [DeepLearning.AI Prompt Engineering](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
- **Book**: "Prompt Engineering for ChatGPT" (Jules White)
- **Guide**: [OpenAI Prompt Engineering Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

**5. RAG (Retrieval-Augmented Generation)**
- **Paper**: [Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401)
- **Tutorial**: [Building RAG Applications](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- **Video**: [RAG Explained](https://www.youtube.com/watch?v=T-D1OfcDW1M)

**6. Embeddings & Semantic Search**
- **Article**: [Understanding Embeddings](https://platform.openai.com/docs/guides/embeddings)
- **Tutorial**: [Building Semantic Search with pgvector](https://supabase.com/docs/guides/ai/vector-columns)
- **Video**: [Word Embeddings Explained](https://www.youtube.com/watch?v=viZrOnJclY0)

### Practical Implementation

**1. OpenAI API Deep Dive**
- **Docs**: [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- **Cookbook**: [OpenAI Cookbook](https://cookbook.openai.com/)
- **Examples**: [OpenAI Examples](https://github.com/openai/openai-cookbook)

**2. LangChain (Optional)**
- **Docs**: [LangChain Documentation](https://python.langchain.com/)
- **Tutorial**: [LangChain Crash Course](https://www.youtube.com/watch?v=lWE7FFHGFoY)
- **Use Case**: Complex LLM workflows, chaining operations

**3. Cost Optimization**
- **Article**: [LLM Cost Optimization Strategies](https://www.anyscale.com/blog/llm-cost-optimization)
- **Tool**: [OpenAI Cost Calculator](https://openai.com/pricing)
- **Strategy**: Batch processing, caching, model selection

### Domain-Specific

**1. Media Bias & Ideology Detection**
- **Paper**: [Media Bias Detection](https://arxiv.org/abs/2109.00004)
- **Dataset**: [AllSides Media Bias Dataset](https://www.allsides.com/media-bias/media-bias-ratings)
- **Article**: [Detecting Political Bias in News](https://towardsdatascience.com/detecting-political-bias-in-news-articles-using-nlp-9c5b5c5c5c5c)

**2. Fact-Checking & Verification**
- **Paper**: [Automated Fact-Checking](https://arxiv.org/abs/1809.06481)
- **Resource**: [PolitiFact API](https://www.politifact.com/api/)
- **Tool**: [Full Fact API](https://fullfact.org/api/)

## Cost Estimation

### LLM API Costs (Monthly, 1000 articles)

**OpenAI:**
- Stance Classification: GPT-4 Turbo @ $0.01/1K tokens = ~$50/month
- Ideology Classification: GPT-4 Turbo = ~$30/month
- Summarization: GPT-4 Turbo = ~$40/month
- Embeddings: text-embedding-3-small @ $0.02/1M tokens = ~$5/month
- **Total: ~$125/month** (scales with article volume)

**Anthropic:**
- Claude 3 Sonnet @ $0.003/1K input tokens = ~$90/month
- **Total: ~$90/month** (slightly cheaper for analysis)

**Open Source (Self-hosted):**
- Infrastructure: GPU server = ~$200-500/month
- **Total: ~$200-500/month** (fixed cost, scales better)

## Risk Mitigation

1. **LLM Inconsistency**: Implement validation rules, confidence thresholds
2. **API Costs**: Batch processing, caching, model selection
3. **Bias in Classification**: Regular audits, manual review samples
4. **Performance**: Async processing, queue system
5. **Data Quality**: Validation at each step, error handling

## Next Steps

1. **Prototype**: Build minimal stance classification for one topic
2. **Validate**: Test on sample articles, measure accuracy
3. **Iterate**: Refine prompts and algorithms
4. **Scale**: Expand to all topics and automate

## References

- PRD: `documentation/prd.md`
- Verdict Card Spec: `.specify/specs/001-verdict-card/spec.md`
- Architecture: `documentation/architecture.md`

