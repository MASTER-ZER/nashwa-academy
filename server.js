process.argv = [process.execPath, require.resolve('next/dist/bin/next'), 'dev', '-p', '3000', '-H', '0.0.0.0'];
require('next/dist/bin/next');
