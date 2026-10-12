import { describe, expect, it } from '@jest/globals';
import { evaluateSliceAction } from '../pipeline/sliceDecision';
import { parseSliceConfig, SliceConfigurationError } from '../pipeline/sliceConfig';
import { PIPELINE_STAGES } from '../pipeline/sliceStages';

describe('slice configuration', () => {
  const valid = [
    '--max-runtime-minutes=285',
    '--max-new-articles=40',
    '--max-analysis-articles=40',
    '--trigger=scheduled',
  ];

  it('accepts the documented slice flags', () => {
    const config = parseSliceConfig(valid, { DATABASE_URL: 'postgresql://acta:acta@127.0.0.1:55435/acta' });
    expect(config).toEqual({
      maxRuntimeMinutes: 285,
      maxNewArticles: 40,
      maxAnalysisArticles: 40,
      trigger: 'scheduled',
    });
  });

  it('rejects missing database configuration before any work', () => {
    expect(() => parseSliceConfig(valid, {})).toThrow(SliceConfigurationError);
  });

  it('returns a terminal slice result without touching adapters', async () => {
    const { runPipelineSlice } = await import('../pipeline/runSlice');
    const result = await runPipelineSlice({
      argv: ['--max-runtime-minutes=10'],
      env: {},
    });
    expect(result.exitCode).toBe(1);
    expect(result.summary.status).toBe('failed_terminal');
    expect(result.summary.errorCode).toBe('INVALID_CONFIGURATION');
    expect(result.summary.runId).toBeNull();
  });

  it('rejects invalid caps and triggers', () => {
    expect(() => parseSliceConfig(
      ['--max-runtime-minutes=0', '--max-new-articles=40', '--max-analysis-articles=40', '--trigger=scheduled'],
      { DATABASE_URL: 'postgresql://acta@localhost/acta' },
    )).toThrow(/max-runtime-minutes/);
    expect(() => parseSliceConfig(
      ['--max-runtime-minutes=10', '--max-new-articles=40', '--max-analysis-articles=40', '--trigger=cron'],
      { DATABASE_URL: 'postgresql://acta@localhost/acta' },
    )).toThrow(/trigger/);
  });
});

describe('slice orchestration', () => {
  it('selects the specified status and stage order', () => {
    expect(PIPELINE_STAGES[0]).toBe('preflight');
    expect(PIPELINE_STAGES.at(-1)).toBe('finalize');

    expect(evaluateSliceAction({
      configValid: false,
      heartbeatOk: true,
      deadlineStop: false,
    })).toMatchObject({ action: 'reject_config', runStatus: 'failed_terminal' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: false,
      deadlineStop: false,
      currentStage: 'rss_refresh',
    })).toMatchObject({ action: 'fail', runStatus: 'failed_recoverable', errorCode: 'LEASE_LOST' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: true,
      currentStage: 'rss_refresh',
    })).toMatchObject({ action: 'pause', runStatus: 'paused_deadline' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: false,
      currentStage: 'preflight',
      stageOutcome: 'completed',
    })).toMatchObject({ action: 'continue', nextStage: 'tavily_trends', runStatus: 'running' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: false,
      currentStage: 'finalize',
      stageOutcome: 'completed',
    })).toMatchObject({ action: 'complete', runStatus: 'completed' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: false,
      currentStage: 'question_validation',
      stageOutcome: 'blocked_moderation',
    })).toMatchObject({ action: 'pause', runStatus: 'blocked_moderation' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: false,
      currentStage: 'topic_discovery',
      stageOutcome: 'failed_recoverable',
    })).toMatchObject({ action: 'fail', runStatus: 'failed_recoverable' });

    expect(evaluateSliceAction({
      configValid: true,
      heartbeatOk: true,
      deadlineStop: false,
      currentStage: 'preflight',
      stageOutcome: 'failed_terminal',
    })).toMatchObject({ action: 'fail', runStatus: 'failed_terminal' });
  });
});
