# Future Improvements for Perplexity Ingestion

## LLM-Based Response Parsing

**Status**: Not Implemented - For Future Consideration

### Problem

Perplexity Pro Search often returns natural language responses instead of structured JSON, even when articles are found. The current parsing logic:
- Tries to extract JSON from content
- Falls back to extracting from `search_results` and `citations` arrays
- May miss articles when content is in natural language format

### Proposed Solution

Use an LLM to parse natural language responses into structured JSON:

1. **When to Use**: When initial JSON parsing fails but content contains article information
2. **Approach**: 
   - Extract natural language content from response
   - Use a lightweight LLM (e.g., GPT-4o-mini, Claude Haiku) to parse into JSON
   - Prompt: "Extract article information from this text and return as JSON array with: url, title, publishedDate, sourceDomain, textContent"
3. **Benefits**:
   - Better extraction from natural language responses
   - More articles captured
   - Handles various response formats
4. **Cost Consideration**: Additional LLM calls, but should be minimal (only when JSON parsing fails)

### Implementation Notes

- Keep current extraction from `search_results` and `citations` as primary method
- Use LLM parsing as fallback when:
  - JSON parsing fails
  - Content contains article information in natural language
  - `search_results` extraction yields fewer articles than expected
- Consider caching parsed results to avoid re-parsing same content

### Alternative Approaches

1. **Better Prompt Engineering**: Refine prompts to encourage JSON responses
2. **Response Format Specification**: Use Perplexity's response format options if available
3. **Hybrid Approach**: Combine multiple extraction methods (search_results + citations + LLM parsing)






