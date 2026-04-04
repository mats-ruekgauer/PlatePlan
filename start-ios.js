const { spawn } = require('child_process');
process.chdir('/Users/mats/Documents/Privat/Projekte/PlatePlan');
const child = spawn(
  '/opt/homebrew/bin/node',
  ['node_modules/expo/bin/cli', 'start', '--ios', '--clear'],
  {
    env: { ...process.env, EXPO_YES: '1', PATH: '/opt/homebrew/bin:' + (process.env.PATH || '') },
    cwd: '/Users/mats/Documents/Privat/Projekte/PlatePlan',
    stdio: 'inherit',
  }
);
child.on('exit', (code) => process.exit(code || 0));
