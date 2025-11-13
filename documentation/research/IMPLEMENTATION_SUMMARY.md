# Article Analysis Pipeline - Implementation Summary

## Quick Overview

**Goal**: Analyze articles, categorize by theme and ideology, generate consensus verdicts with evidence-based answers.

## Key Decisions

### 1. Theme Extraction
- **MVP**: Pre-defined topics (3 from PRD) with keyword matching
- **Future**: LLM-based clustering for auto-discovery

### 2. Question Extraction (Critical)
- **Process**: Analyze articles about a topic together → Extract main question
- **Storage**: Questions live in their own table, linked to Topic
- **MVP**: Pre-defined questions from PRD, validated with LLM
- **Future**: Auto-extract questions from article clusters

### 3. Ideology Classification
- **Approach**: LLM analysis of article content (not just outlet)
- **Fallback**: Outlet ideology if confidence low
- **Dimensions**: Political Left/Center/Right (MVP)

### 4. Stance Classification per Question
- **Critical**: Stance is per-question, not per-article
- **Process**: After extracting question, analyze all articles for that question
- **Approach**: LLM prompt-based per article-question pair
- **Output**: Yes / Leaning Yes / Neutral / Leaning No / No + confidence
- **Storage**: ArticleAnalysis table (article_id, question_id, stance)

### 5. Consensus Calculation per Question
- **Process**: Aggregate all article stances for a question
- **Method**: Weight by outlet credibility, normalize by ideology, calculate support share and variance
- **Output**: Verdict label (Yes/Leaning Yes/Split/etc.) + confidence

### 6. Answer Synthesis
- **Approach**: Multi-document summarization from stance-grouped articles
- **Method**: Extract arguments → Aggregate by ideology → Generate synthesis
- **Output**: Evidence bullets (Why, Dissent, Unknowns)

## Technology Stack

**LLM Provider**: OpenAI GPT-4 Turbo (MVP)
- Stance classification
- Ideology detection
- Answer synthesis
- Embeddings: `text-embedding-3-small`

**Libraries**:
- `openai` - API client
- `sentence-transformers` - Alternative embeddings (optional)
- `scikit-learn` - Clustering (future)
- `pgvector` - Semantic search (already in use)

## Task Sequence (8 Weeks)

### Phase 1: Foundation (Weeks 1-2)
1. Database schema extension (Topic, Question, ArticleAnalysis, Verdict, EvidenceBullet, TopicArticle)
2. LLM integration setup
3. Basic topic assignment (3 pre-defined topics)
4. Question extraction (pre-defined from PRD, validate with LLM)

### Phase 2: Content Analysis (Weeks 3-4)
5. Stance classification per question (article-question pairs)
6. Ideology classification implementation
7. Topic clustering (optional for MVP)

### Phase 3: Verdict Generation (Weeks 5-6)
8. Consensus calculation per question (aggregate all article stances)
9. Evidence extraction (Why/Dissent/Unknowns)
10. Answer synthesis

### Phase 4: Automation (Weeks 7-8)
10. Automated processing pipeline
11. Quality assurance & validation
12. Performance optimization

## Essential Learning Resources

### Must Read/Watch (Start Here)

1. **LLM Prompt Engineering**
   - [DeepLearning.AI Prompt Engineering Course](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/) (1-2 hours)
   - [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

2. **Stance Classification**
   - [Stance Detection Survey Paper](https://arxiv.org/abs/2008.04914) (skim for concepts)
   - [Fine-tuning BERT Tutorial](https://huggingface.co/docs/transformers/training) (for understanding)

3. **Multi-Document Summarization**
   - [Multi-Document Summarization Survey](https://arxiv.org/abs/2004.14784) (skim)
   - [Abstractive vs Extractive Summarization](https://www.analyticsvidhya.com/blog/2019/06/comprehensive-guide-text-summarization-using-deep-learning-python/)

4. **Embeddings & Semantic Search**
   - [Understanding Embeddings (OpenAI)](https://platform.openai.com/docs/guides/embeddings)
   - [pgvector Tutorial](https://supabase.com/docs/guides/ai/vector-columns)

### Practical Implementation

5. **OpenAI API**
   - [OpenAI Cookbook](https://cookbook.openai.com/) - Real examples
   - [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

6. **RAG (Advanced)**
   - [RAG Explained (Video)](https://www.youtube.com/watch?v=T-D1OfcDW1M)
   - [Building RAG Applications](https://www.pinecone.io/learn/retrieval-augmented-generation/)

## Cost Estimate

**Monthly (1000 articles)**:
- OpenAI GPT-4 Turbo: ~$125/month
- Anthropic Claude: ~$90/month
- Open Source (self-hosted): ~$200-500/month (fixed)

**Optimization**: Batch processing, caching, model selection

## Critical Success Factors

1. **Prompt Quality**: Well-crafted prompts = accurate classifications
2. **Validation**: Confidence thresholds, manual review samples
3. **Cost Management**: Batch processing, caching, smart model selection
4. **Bias Mitigation**: Regular audits, diverse training data
5. **Performance**: Async processing, queue system

## Next Immediate Steps

1. **Prototype** (Week 1):
   - Set up OpenAI API
   - Test stance classification on 10 sample articles
   - Measure accuracy

2. **Validate** (Week 2):
   - Test ideology classification
   - Compare with outlet ideology
   - Refine prompts

3. **Database Design** (Week 2):
   - Design schema for Topic, ArticleAnalysis, Verdict
   - Create migration

4. **Iterate** (Week 3+):
   - Build full pipeline
   - Test on real articles
   - Refine algorithms

## Questions to Answer Before Implementation

1. **LLM Provider**: OpenAI vs Anthropic vs Open Source?
2. **Processing Strategy**: Real-time vs Batch?
3. **Cost Budget**: What's acceptable monthly spend?
4. **Accuracy Requirements**: What's minimum acceptable?
5. **Topic Discovery**: Manual vs Automatic?

## Full Research Document

See `documentation/research/article-analysis-pipeline.md` for detailed analysis, approaches, and references.

