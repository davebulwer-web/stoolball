// Builds dist/stoolball-web.zip: just the files the site needs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
execFileSync('zip', ['-r', '-X', 'dist/stoolball-web.zip', 'index.html', 'style.css', 'src', 'assets'], { stdio: 'inherit' });
