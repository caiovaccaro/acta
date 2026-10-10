import path from 'node:path';

export const WEB_DIRECTORY = 'apps/web';
export const VERCEL_BUILD_COMMAND = 'npm run build:vercel';
export const VERCEL_INSTALL_COMMAND = 'npm ci';

function normalizeRepositoryPath(value) {
  return path.posix.normalize(String(value).replaceAll('\\', '/')).replace(/^\.\//, '');
}

export function effectiveNextOutputDirectory(nextConfig = {}) {
  const distDir = nextConfig.distDir ?? '.next';
  return normalizeRepositoryPath(path.posix.join(WEB_DIRECTORY, distDir));
}

export function validateDeploymentConfiguration({
  environment,
  nextConfig,
  rootPackage,
  vercelConfig,
}) {
  const issues = [];
  const actualOutput = normalizeRepositoryPath(vercelConfig?.outputDirectory ?? '');
  const expectedOutput = effectiveNextOutputDirectory(nextConfig);

  if (environment?.NODE_ENV !== 'production') {
    issues.push({
      setting: 'NODE_ENV',
      constraint: 'must equal production',
    });
  }
  if (actualOutput !== expectedOutput) {
    issues.push({
      setting: 'outputDirectory',
      constraint: `must equal the effective Next.js output directory (${expectedOutput})`,
    });
  }
  if (vercelConfig?.installCommand !== VERCEL_INSTALL_COMMAND) {
    issues.push({
      setting: 'installCommand',
      constraint: `must equal "${VERCEL_INSTALL_COMMAND}"`,
    });
  }
  if (vercelConfig?.buildCommand !== VERCEL_BUILD_COMMAND) {
    issues.push({
      setting: 'buildCommand',
      constraint: `must equal "${VERCEL_BUILD_COMMAND}"`,
    });
  }

  const buildScript = rootPackage?.scripts?.['build:vercel'] ?? '';
  const requiredSteps = [
    'npm run config:validate:production',
    'npm run deploy:validate',
    'npm run build --workspace @acta/web',
  ];
  let previousIndex = -1;
  for (const step of requiredSteps) {
    const index = buildScript.indexOf(step);
    if (index === -1 || index <= previousIndex) {
      issues.push({
        setting: 'scripts.build:vercel',
        constraint: `must run "${step}" after the preceding deployment preflight step`,
      });
      break;
    }
    previousIndex = index;
  }

  return {
    success: issues.length === 0,
    issues,
    outputDirectory: expectedOutput,
  };
}

export function formatDeploymentConfigIssues(issues) {
  return [
    'Invalid deployment configuration:',
    ...issues.map(({ setting, constraint }) => `- ${setting}: ${constraint}`),
  ].join('\n');
}
