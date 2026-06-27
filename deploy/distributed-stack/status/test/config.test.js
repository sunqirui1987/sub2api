const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { loadConfig } = require('../src/config')

function withEnv(values, fn) {
  const keys = Object.keys(values)
  const old = {}
  for (const key of keys) {
    old[key] = process.env[key]
    if (values[key] === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = values[key]
    }
  }
  try {
    return fn()
  } finally {
    for (const key of keys) {
      if (old[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = old[key]
      }
    }
  }
}

test('auth json userauthkey is used as status key', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sub2api-status-config-'))
  const authFile = path.join(dir, 'auth.json')
  const targetsFile = path.join(dir, 'targets.json')
  fs.writeFileSync(authFile, JSON.stringify({ userauthkey: 'from-auth-file' }))
  fs.writeFileSync(targetsFile, JSON.stringify([
    {
      id: 'legacy',
      baseUrl: 'http://legacy.example',
      apiKey: 'legacy-api-key'
    }
  ]))

  const config = withEnv({
    STATUS_AUTH_KEY: undefined,
    STATUS_AUTH_JSON: undefined,
    STATUS_AUTH_FILE: authFile,
    STATUS_TARGETS_JSON: undefined,
    STATUS_TARGETS_FILE: targetsFile
  }, () => loadConfig())

  assert.equal(config.authKey, 'from-auth-file')
  assert.equal(config.targets[0].authKey, 'legacy-api-key')
})

test('status auth environment variable overrides auth json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sub2api-status-config-'))
  const authFile = path.join(dir, 'auth.json')
  const targetsFile = path.join(dir, 'targets.json')
  fs.writeFileSync(authFile, JSON.stringify({ userauthkey: 'from-auth-file' }))
  fs.writeFileSync(targetsFile, JSON.stringify([
    {
      id: 'target',
      baseUrl: 'http://target.example',
      authKey: 'target-auth-key'
    }
  ]))

  const config = withEnv({
    STATUS_AUTH_KEY: 'from-env',
    STATUS_AUTH_FILE: authFile,
    STATUS_TARGETS_FILE: targetsFile
  }, () => loadConfig())

  assert.equal(config.authKey, 'from-env')
})
