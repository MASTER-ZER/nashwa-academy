const { execSync } = require('child_process');
try {
  const out = execSync('npx.cmd next dev -p 3000', { encoding: 'utf8', timeout: 5000 });
  console.log(out);
} catch (e) {
  console.error('STDERR:', e.stderr);
  console.error('STDOUT:', e.stdout);
  console.error('MESSAGE:', e.message);
}
