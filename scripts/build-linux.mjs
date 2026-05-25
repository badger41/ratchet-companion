import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const uiRoot = path.join(repoRoot, 'ui')
const pvarOverlaySource = path.join(uiRoot, 'src', 'data', 'pvar_overlay.json')
const backendProject = path.join(repoRoot, 'lib', 'src', 'RatchetCompanion.Host', 'RatchetCompanion.Host.csproj')
const buildRoot = path.join(repoRoot, 'build')
const backendOutput = path.join(buildRoot, 'artifacts', 'backend-linux-x64')
const isFrameworkDependentBuild = process.argv.includes('--framework-dependent')
const releaseDirectory = isFrameworkDependentBuild
  ? path.join(buildRoot, 'release-linux-framework')
  : path.join(buildRoot, 'release-linux')
const isWindows = process.platform === 'win32'
const buildVersion = process.env.BUILD_VERSION

function getAssemblyVersion(version) {
  const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?/)

  if (!match) {
    return undefined
  }

  const [, major, minor = '0', patch = '0', revision = '0'] = match
  return `${major}.${minor}.${patch}.${revision}`
}

const assemblyVersion = buildVersion ? getAssemblyVersion(buildVersion) : undefined
const versionProperties = buildVersion
  ? [
      `-p:Version=${buildVersion}`,
      ...(assemblyVersion
        ? [`-p:AssemblyVersion=${assemblyVersion}`, `-p:FileVersion=${assemblyVersion}`]
        : []),
    ]
  : []

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      stdio: 'inherit',
      env: options.env ?? process.env,
      shell: isWindows,
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

await fs.mkdir(backendOutput, { recursive: true })

await run('dotnet', [
  'publish',
  backendProject,
  '-c',
  'Release',
  '-r',
  'linux-x64',
  '--self-contained',
  isFrameworkDependentBuild ? 'false' : 'true',
  '-p:PublishSingleFile=true',
  '-p:DebugSymbols=false',
  '-p:DebugType=None',
  ...versionProperties,
  '-o',
  backendOutput,
])

await run('npm', ['--prefix', uiRoot, 'run', 'build'])
await run('npm', ['--prefix', uiRoot, 'run', 'build:electron'])
await run('npx', ['electron-builder', '--config', 'electron-builder.json', '--linux', 'AppImage', `-c.directories.output=${releaseDirectory}`], {
  cwd: uiRoot,
})
await fs.copyFile(pvarOverlaySource, path.join(releaseDirectory, 'pvar_overlay.json'))
