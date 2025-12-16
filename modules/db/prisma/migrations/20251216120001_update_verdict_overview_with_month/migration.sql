-- Update verdict_overview view to include month field
DROP VIEW IF EXISTS "verdict_overview";

CREATE VIEW "verdict_overview" AS
SELECT
  q.id                         AS question_id,
  q."questionText"             AS question_text,
  q."topicId"                  AS topic_id,
  v.id                         AS verdict_id,
  v."month"                    AS verdict_month,
  v."verdictLabel"             AS verdict_label,
  v."confidence"               AS verdict_confidence,
  v."supportShare"             AS support_share,
  v."variance"                 AS variance,
  v."reasoning"                AS verdict_reasoning,
  v."calculatedAt"             AS verdict_calculated_at,
  a.id                         AS article_id,
  a.title                      AS article_title,
  a.url                        AS article_url,
  a."publishedDate"            AS article_published_date,
  o.id                         AS outlet_id,
  o.name                       AS outlet_name,
  o."credibilityScore"         AS outlet_credibility,
  o."ideology"                 AS outlet_ideology,
  aa.stance                    AS article_stance,
  aa."confidence"              AS article_stance_confidence,
  aa."reasoning"               AS article_stance_reasoning
FROM "verdicts" v
JOIN "questions" q ON q.id = v."questionId"
LEFT JOIN "article_stances" s ON s."questionId" = v."questionId"
LEFT JOIN "article_analyses" aa ON aa.id = s."articleAnalysisAttemptId"
LEFT JOIN "articles" a ON a.id = s."articleId"
LEFT JOIN "outlets" o ON o.id = a."outletId";

