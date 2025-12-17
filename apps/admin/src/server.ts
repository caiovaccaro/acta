import express from 'express';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  ModerationStatus,
  QuestionValidationStatus,
} from '@acta/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../../../.env') });

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.ADMIN_PORT ? Number(process.env.ADMIN_PORT) : 4300;

function layout(title: string, body: string) {
  const nav = `
    <nav class="nav">
      <div class="nav-brand">Admin</div>
      <div class="nav-links">
        <a href="/admin/topics">Topics</a>
        <a href="/admin/questions">Questions</a>
        <a href="/admin/verdicts">Verdicts</a>
      </div>
    </nav>
  `;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card: #ffffff;
      --muted: #6b7280;
      --border: #e5e7eb;
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --danger: #dc2626;
      --secondary: #4b5563;
    }
    * { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: var(--bg); color: #0f172a; }
    h1 { margin: 0 0 12px 0; font-size: 22px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    th, td { border-top: 1px solid var(--border); padding: 10px 12px; vertical-align: top; }
    th { background: #f1f5f9; text-align: left; font-weight: 600; font-size: 14px; }
    th.actions-col, td.actions-col { width: 30%; }
    tr:first-child th { border-top: none; }
    .card { background: var(--card); padding: 16px; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; flex-wrap: nowrap; align-items: center; }
    .actions form { display: inline-block; margin: 0; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #e5e7eb; color: #111827; }
    .badge.pending { background: #fef3c7; color: #92400e; }
    .badge.approved { background: #dcfce7; color: #166534; }
    .badge.rejected { background: #fee2e2; color: #991b1b; }
    .badge.auto { background: #e0e7ff; color: #312e81; }
    .badge.seeded { background: #dbeafe; color: #1e3a8a; }
    .small { color: var(--muted); font-size: 12px; }
    .muted { color: var(--muted); }
    .btn { padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
    .btn:hover { background: var(--primary-dark); }
    .btn.danger { background: var(--danger); }
    .btn.secondary { background: var(--secondary); }
    input[type=text], textarea, select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; font-size: 14px; }
    form.inline { display: inline-block; }
    .nav { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); margin-bottom: 16px; }
    .nav-brand { font-weight: 700; }
    .nav-links a { margin-right: 12px; text-decoration: none; color: #0f172a; font-weight: 600; }
    .nav-links a:last-child { margin-right: 0; }
    .nav-links a:hover { color: var(--primary); }
  </style>
</head>
<body>
${nav}
<div class="card">
${body}
</div>
</body>
</html>`;
}

app.get('/', (_req, res) => {
  res.redirect('/admin/topics');
});

app.get('/admin/topics', async (req, res) => {
  const status = (req.query.status as ModerationStatus) || 'pending';
  try {
    await connectDatabase();
    const topics = await prisma.topic.findMany({
      where: status === 'all' ? {} : { moderationStatus: status },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: true,
      },
    });

    const body = `
      <h1>Topics Moderation</h1>
      <div style="margin-bottom:12px;">
        <a href="/admin/topics?status=pending">Pending</a> |
        <a href="/admin/topics?status=approved">Approved</a> |
        <a href="/admin/topics?status=rejected">Rejected</a> |
        <a href="/admin/topics?status=all">All</a>
      </div>
      <table>
        <tr>
          <th>Name</th>
          <th>Source</th>
          <th>Status</th>
          <th>Discovered</th>
          <th>Questions</th>
          <th class="actions-col">Actions</th>
        </tr>
        ${topics
          .map((t) => {
            const discoverInfo = t.discoveredAt
              ? `${new Date(t.discoveredAt).toISOString().slice(0, 10)}`
              : '—';
            return `<tr>
              <td><strong>${t.name}</strong><br/><span class="muted small">${t.description || ''}</span></td>
              <td><span class="badge ${t.source === 'auto_discovered' ? 'auto' : 'seeded'}">${t.source}</span></td>
              <td><span class="badge ${t.moderationStatus}">${t.moderationStatus}</span></td>
              <td>${discoverInfo}</td>
              <td><a href="/admin/questions?topicId=${t.id}&status=pending">${t.questions.length}</a></td>
              <td class="actions actions-col">
                <form method="post" action="/admin/topics/${t.id}/approve"><button class="btn" type="submit">Approve</button></form>
                <form method="post" action="/admin/topics/${t.id}/reject"><button class="btn danger" type="submit">Reject</button></form>
                <form method="get" action="/admin/topics/${t.id}/edit"><button class="btn secondary" type="submit">Edit</button></form>
              </td>
            </tr>`;
          })
          .join('')}
      </table>
    `;
    res.send(layout('Topics Moderation', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading topics');
  } finally {
    await disconnectDatabase();
  }
});

app.get('/admin/topics/:id/edit', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    const topic = await prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      res.status(404).send('Topic not found');
      return;
    }
    const body = `
      <h1>Edit Topic</h1>
      <form method="post" action="/admin/topics/${id}/edit">
        <p><label>Name<br/><input type="text" name="name" value="${topic.name}" required /></label></p>
        <p><label>Description<br/><textarea name="description" rows="3">${topic.description || ''}</textarea></label></p>
        <p><label><input type="checkbox" name="safetyNoteRequired" value="true" ${topic.safetyNoteRequired ? 'checked' : ''}/> Safety note required</label></p>
        <p>
          <label>Status
            <select name="moderationStatus">
              <option value="pending" ${topic.moderationStatus === 'pending' ? 'selected' : ''}>pending</option>
              <option value="approved" ${topic.moderationStatus === 'approved' ? 'selected' : ''}>approved</option>
              <option value="rejected" ${topic.moderationStatus === 'rejected' ? 'selected' : ''}>rejected</option>
            </select>
          </label>
        </p>
        <p><button class="btn" type="submit">Save</button> <a href="/admin/topics">Cancel</a></p>
      </form>
    `;
    res.send(layout('Edit Topic', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading topic');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/topics/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { name, description, safetyNoteRequired, moderationStatus } = req.body;
  try {
    await connectDatabase();
    await prisma.topic.update({
      where: { id },
      data: {
        name,
        description: description ?? null,
        safetyNoteRequired: !!safetyNoteRequired,
        moderationStatus: (moderationStatus as ModerationStatus) || 'pending',
      },
    });
    res.redirect('/admin/topics');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving topic');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/topics/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    await prisma.topic.update({
      where: { id },
      data: { moderationStatus: 'approved' },
    });
    res.redirect('/admin/topics?status=pending');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error approving topic');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/topics/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    await prisma.topic.update({
      where: { id },
      data: { moderationStatus: 'rejected' },
    });
    res.redirect('/admin/topics?status=pending');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error rejecting topic');
  } finally {
    await disconnectDatabase();
  }
});

app.get('/admin/questions', async (req, res) => {
  const status = (req.query.status as QuestionValidationStatus) || 'pending';
  const topicId = (req.query.topicId as string) || undefined;
  try {
    await connectDatabase();
    const questions = await prisma.question.findMany({
      where: {
        ...(status === 'all' ? {} : { validationStatus: status }),
        ...(topicId ? { topicId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        topic: true,
      },
    });

    const body = `
      <h1>Questions Moderation</h1>
      <div style="margin-bottom:12px;">
        <a href="/admin/questions?status=pending">Pending</a> |
        <a href="/admin/questions?status=needs_reformulation">Needs Reformulation</a> |
        <a href="/admin/questions?status=validated">Validated</a> |
        <a href="/admin/questions?status=rejected">Rejected</a> |
        <a href="/admin/questions?status=all">All</a>
      </div>
      <table>
        <tr>
          <th>Question</th>
          <th>Topic</th>
          <th>Bar Score</th>
          <th>Source</th>
          <th>Status</th>
          <th>Discovered</th>
          <th class="actions-col">Actions</th>
        </tr>
        ${questions
          .map((q) => {
            const discoverInfo = q.discoveredAt
              ? `${new Date(q.discoveredAt).toISOString().slice(0, 10)}`
              : '—';
            const barScore = (() => {
              const bv = (q as any).validationResults?.barValidation;
              return bv?.barReadinessScore ?? '—';
            })();
            const hasReform = ((q as any).validationResults?.barValidation?.reformulatedQuestion ?? '').trim().length > 0;
            return `<tr>
              <td><strong>${q.questionText}</strong><br/><span class="muted small">Confidence: ${q.confidence ?? '—'} | Suggestions: ${q.suggestions?.length ?? 0}</span></td>
              <td>${q.topic?.name ?? '—'}</td>
              <td>${barScore}</td>
              <td><span class="badge ${q.source === 'auto_discovered' ? 'auto' : 'seeded'}">${q.source}</span></td>
              <td><span class="badge ${q.validationStatus}">${q.validationStatus}</span></td>
              <td>${discoverInfo}</td>
              <td class="actions actions-col">
                <form method="post" action="/admin/questions/${q.id}/approve"><button class="btn" type="submit">Approve</button></form>
                <form method="post" action="/admin/questions/${q.id}/reject"><button class="btn danger" type="submit">Reject</button></form>
                <form method="get" action="/admin/questions/${q.id}/edit"><button class="btn secondary" type="submit">Edit</button></form>
                ${hasReform ? `<a class="btn" style="padding:6px 8px; background:#28a745;" href="/admin/suggestions?questionId=${q.id}">Reformulation</a>` : ''}
              </td>
            </tr>`;
          })
          .join('')}
      </table>
    `;
    res.send(layout('Questions Moderation', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading questions');
  } finally {
    await disconnectDatabase();
  }
});

app.get('/admin/questions/:id/edit', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    const question = await prisma.question.findUnique({
      where: { id },
      include: { topic: true },
    });
    if (!question) {
      res.status(404).send('Question not found');
      return;
    }
    const body = `
      <h1>Edit Question</h1>
      <p class="small">Topic: ${question.topic?.name ?? '—'} | Source: ${question.source}</p>
      <form method="post" action="/admin/questions/${id}/edit">
        <p><label>Question Text<br/><textarea name="questionText" rows="3" required>${question.questionText}</textarea></label></p>
        <p><label>Original Question Text<br/><textarea name="originalQuestionText" rows="3">${question.originalQuestionText || ''}</textarea></label></p>
        <p>
          <label>Status
            <select name="validationStatus">
              <option value="pending" ${question.validationStatus === 'pending' ? 'selected' : ''}>pending</option>
              <option value="needs_reformulation" ${question.validationStatus === 'needs_reformulation' ? 'selected' : ''}>needs_reformulation</option>
              <option value="validated" ${question.validationStatus === 'validated' ? 'selected' : ''}>validated</option>
              <option value="rejected" ${question.validationStatus === 'rejected' ? 'selected' : ''}>rejected</option>
            </select>
          </label>
        </p>
        <p><label><input type="checkbox" name="isActive" value="true" ${question.isActive ? 'checked' : ''}/> Active</label></p>
        <p><button class="btn" type="submit">Save</button> <a href="/admin/questions">Cancel</a></p>
      </form>
    `;
    res.send(layout('Edit Question', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading question');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/questions/:id/edit', async (req, res) => {
  const { id } = req.params;
  const { questionText, originalQuestionText, validationStatus, isActive } = req.body;
  try {
    await connectDatabase();
    await prisma.question.update({
      where: { id },
      data: {
        questionText,
        originalQuestionText: originalQuestionText ?? null,
        validationStatus: (validationStatus as QuestionValidationStatus) || 'pending',
        isActive: !!isActive,
      },
    });
    res.redirect('/admin/questions');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error saving question');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/questions/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    await prisma.question.update({
      where: { id },
      data: {
        validationStatus: 'validated',
        isActive: true,
      },
    });
    res.redirect('/admin/questions?status=pending');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error approving question');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/questions/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    await connectDatabase();
    await prisma.question.update({
      where: { id },
      data: {
        validationStatus: 'rejected',
        isActive: false,
      },
    });
    res.redirect('/admin/questions?status=pending');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error rejecting question');
  } finally {
    await disconnectDatabase();
  }
});

// Suggestions / Reformulations moderation (from bar validation)
app.get('/admin/suggestions', async (req, res) => {
  const questionId = (req.query.questionId as string) || undefined;
  try {
    await connectDatabase();
    const questions = await prisma.question.findMany({
      where: {
        ...(questionId ? { id: questionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { topic: true },
    });

    const entries = questions
      .map((q) => {
        const bv = (q as any).validationResults?.barValidation;
        if (!bv || !bv.reformulatedQuestion) return null;
        return { q, bv };
      })
      .filter(Boolean) as Array<{ q: any; bv: any }>;

    const body = `
      <h1>Reformulation Moderation</h1>
      <div style="margin-bottom:12px;">
        ${questionId ? `<a href="/admin/suggestions">Show all</a>` : ''}
      </div>
      <table>
        <tr>
          <th>Question</th>
          <th>Topic</th>
          <th>Reformulation</th>
        </tr>
        ${entries
          .map(({ q, bv }) => {
            const issues = Array.isArray(bv.issues) ? bv.issues.join(', ') : '—';
            const suggestions = Array.isArray(bv.suggestions) ? bv.suggestions.join('; ') : '';
            return `<tr>
              <td><strong>${q.questionText}</strong><br/>
                  <span class="muted small">Bar score: ${bv.barReadinessScore ?? '—'} | Reformulation score: ${bv.reformulationScore ?? '—'}</span><br/>
                  <span class="muted small">Issues: ${issues}</span><br/>
                  <span class="muted small">Suggestions: ${suggestions}</span>
              </td>
              <td>${q.topic?.name ?? '—'}</td>
              <td>
                <div style="margin-bottom:10px; border:1px solid #eee; padding:8px; border-radius:4px;">
                  <div class="small muted">Suggested reformulation</div>
                  <form method="post" action="/admin/suggestions/apply">
                    <input type="hidden" name="questionId" value="${q.id}" />
                    <textarea name="reformulation" rows="3">${bv.reformulatedQuestion}</textarea>
                    <div style="margin-top:6px;">
                      <button class="btn" type="submit">Apply</button>
                    </div>
                  </form>
                </div>
              </td>
            </tr>`;
          })
          .join('')}
      </table>
    `;
    res.send(layout('Suggestions Moderation', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading suggestions');
  } finally {
    await disconnectDatabase();
  }
});

app.post('/admin/suggestions/apply', async (req, res) => {
  const { questionId, reformulation } = req.body;
  if (!questionId || !reformulation) {
    res.status(400).send('Missing questionId or reformulation');
    return;
  }
  try {
    await connectDatabase();
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      res.status(404).send('Question not found');
      return;
    }

    await prisma.question.update({
      where: { id: questionId },
      data: {
        originalQuestionText: question.originalQuestionText ?? question.questionText,
        questionText: reformulation,
        validationStatus: 'pending',
        isActive: false,
      },
    });

    // Redirect back to suggestions page for this question
    res.redirect(`/admin/suggestions?questionId=${questionId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error applying suggestion');
  } finally {
    await disconnectDatabase();
  }
});

// Verdicts overview
app.get('/admin/verdicts', async (req, res) => {
  const monthParam = (req.query.month as string) || undefined;
  try {
    await connectDatabase();
    const where: any = {};
    if (monthParam) {
      const monthDate = new Date(`${monthParam}-01T00:00:00.000Z`);
      where.month = monthDate;
    }
    const verdicts = await prisma.verdict.findMany({
      where,
      orderBy: { calculatedAt: 'desc' },
      include: {
        question: {
          include: { topic: true },
        },
      },
      take: 200,
    });

    // Fetch stances per verdict to show counts and outlet stances
    const enriched = [];
    for (const v of verdicts) {
      const monthStart = new Date(v.month.getFullYear(), v.month.getMonth(), 1);
      const monthEnd = new Date(v.month.getFullYear(), v.month.getMonth() + 1, 1);
      const stances = await prisma.articleStance.findMany({
        where: {
          questionId: v.questionId,
          articleAnalysisAttempt: {
            month: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
        },
        include: {
          article: {
            include: {
              outlet: {
                select: {
                  name: true,
                  id: true,
                  credibilityScore: true,
                },
              },
            },
          },
          articleAnalysisAttempt: {
            select: {
              stance: true,
              confidence: true,
            },
          },
        },
      });

      // Deduplicate by outlet (one stance per outlet, pick highest confidence)
      const outletMap = new Map<string, {
        outletName: string;
        outletId: string;
        stance: string;
        confidence: number;
      }>();
      for (const s of stances) {
        const outletId = s.article.outlet.id;
        const existing = outletMap.get(outletId);
        if (!existing || s.articleAnalysisAttempt.confidence > existing.confidence) {
          outletMap.set(outletId, {
            outletName: s.article.outlet.name,
            outletId,
            stance: s.articleAnalysisAttempt.stance,
            confidence: s.articleAnalysisAttempt.confidence,
          });
        }
      }
      const outletStances = Array.from(outletMap.values());
      const outletIds = new Set(outletStances.map((o) => o.outletId));

      enriched.push({
        verdict: v,
        totalArticles: stances.length,
        totalOutlets: outletIds.size,
        outletStances,
      });
    }

    const body = `
      <h1>Verdicts</h1>
      <div style="margin-bottom:12px;">
        <form method="get" action="/admin/verdicts">
          <label>Month (YYYY-MM): <input type="text" name="month" value="${monthParam || ''}" /></label>
          <button class="btn secondary" type="submit">Filter</button>
          <a href="/admin/verdicts">Clear</a>
        </form>
      </div>
      <table>
        <tr>
          <th>Question</th>
          <th>Topic</th>
          <th>Month</th>
          <th>Label</th>
          <th>Confidence</th>
          <th>Support</th>
          <th>Variance</th>
          <th>Articles</th>
          <th>Outlets</th>
          <th>Outlet Stances</th>
          <th>Reasoning</th>
        </tr>
        ${enriched
          .map(({ verdict: v, totalArticles, totalOutlets, outletStances }) => {
            const monthStr = v.month.toISOString().slice(0, 7);
            const reasoning = v.reasoning ?? '—';
            const outletList = outletStances
              .map(
                (o) =>
                  `<div class="small muted">${o.outletName}: ${o.stance} (${(o.confidence * 100).toFixed(1)}%)</div>`
              )
              .join('') || '—';
            return `<tr>
              <td>${v.question.questionText}</td>
              <td>${v.question.topic?.name ?? '—'}</td>
              <td>${monthStr}</td>
              <td>${v.verdictLabel}</td>
              <td>${v.confidence.toFixed(1)}%</td>
              <td>${(v.supportShare * 100).toFixed(1)}%</td>
              <td>${(v.variance * 100).toFixed(1)}%</td>
              <td>${totalArticles}</td>
              <td>${totalOutlets}</td>
              <td>${outletList}</td>
              <td>${reasoning}</td>
            </tr>`;
          })
          .join('')}
      </table>
    `;

    res.send(layout('Verdicts', body));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error loading verdicts');
  } finally {
    await disconnectDatabase();
  }
});

app.listen(PORT, () => {
  console.log(`🛠️ Admin UI running at http://localhost:${PORT}`);
});

