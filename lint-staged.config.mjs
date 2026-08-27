const excluded =
  /(^|[\\/])(node_modules|dist|coverage|test-results|playwright-report|\.git|\.vite|data)([\\/]|$)|\.zip$/i

function commands(command, files) {
  return files
    .filter((file) => !excluded.test(file))
    .map((file) => `${command} "${file.replaceAll('"', '\\"')}"`)
}

export default {
  '**/*.{ts,tsx,js,mjs}': (files) => [
    ...commands('prettier --write', files),
    ...commands('eslint', files),
  ],
  '**/*.{json,css,html,md}': (files) => commands('prettier --write', files),
}
