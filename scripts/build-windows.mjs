import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const uiRoot = path.join(repoRoot, 'ui')
const backendProject = path.join(repoRoot, 'lib', 'src', 'RatchetCompanion.Host', 'RatchetCompanion.Host.csproj')
const buildRoot = path.join(repoRoot, 'build')
const backendOutput = path.join(buildRoot, 'artifacts', 'backend-win-x64')
const isFrameworkDependentBuild = process.argv.includes('--framework-dependent')
const releaseDirectory = isFrameworkDependentBuild
  ? path.join(buildRoot, 'release-win-framework')
  : path.join(buildRoot, 'release-win')

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      stdio: 'inherit',
      env: options.env ?? process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })

    child.on('error', reject)
  })
}

await run('mkdir', ['-p', backendOutput])

await run('dotnet', [
  'publish',
  backendProject,
  '-c',
  'Release',
  '-r',
  'win-x64',
  '--self-contained',
  isFrameworkDependentBuild ? 'false' : 'true',
  '-p:PublishSingleFile=true',
  '-p:DebugSymbols=false',
  '-p:DebugType=None',
  '-o',
  backendOutput,
])

await run('npm', ['--prefix', uiRoot, 'run', 'build'])
await run('npm', ['--prefix', uiRoot, 'run', 'build:electron'])
await run(
  'npx',
  ['electron-builder', '--config', 'electron-builder.windows.json', '--win', `-c.directories.output=${releaseDirectory}`],
  { cwd: uiRoot },
)