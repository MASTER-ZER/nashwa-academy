const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.resolve(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', '3000'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});

child.on('error', (err) => {
  console.error('Child error:', err);
});

child.on('exit', (code, signal) => {
  console.log(`Child exited with code ${code} and signal ${signal}`);
});
