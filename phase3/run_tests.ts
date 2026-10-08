import { runAllPhase3Tests } from './tests/phase3.test';

async function main() {
  console.log('\n===============================================================');
  console.log('       RUNNING PHASE 3 INDEXING & STORAGE TEST SUITE           ');
  console.log('===============================================================\n');

  const startTime = Date.now();
  const results = await runAllPhase3Tests();
  const totalDuration = Date.now() - startTime;

  let passedCount = 0;
  let failedCount = 0;

  for (const res of results) {
    if (res.passed) {
      passedCount++;
      console.log(`\x1b[32m✔ PASS\x1b[0m [${res.durationMs}ms] ${res.name}`);
    } else {
      failedCount++;
      console.log(`\x1b[31m✖ FAIL\x1b[0m [${res.durationMs}ms] ${res.name}`);
      console.log(`   \x1b[31mError:\x1b[0m ${res.error}`);
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log('TEST SUMMARY (PHASE 3 ONLY):');
  console.log(`- Total Tests Run: ${results.length}`);
  console.log(`- Passed:          \x1b[32m${passedCount}\x1b[0m`);
  console.log(`- Failed:          \x1b[${failedCount > 0 ? '31m' : '32m'}${failedCount}\x1b[0m`);
  console.log(`- Total Duration:  ${totalDuration}ms`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main();
