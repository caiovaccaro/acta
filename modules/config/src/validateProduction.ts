import {
  formatProductionConfigIssues,
  validateProductionEnvironment,
} from './index.js';

const result = validateProductionEnvironment(process.env);

if (!result.success) {
  console.error(formatProductionConfigIssues(result.issues));
  process.exitCode = 1;
} else {
  console.log('Production configuration is valid.');
}
