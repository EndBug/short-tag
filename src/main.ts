import * as core from '@actions/core'
import * as github from 'octonode'
import semverRegex from 'semver-regex'
import { readFile } from 'fs'
import { spawn } from 'child_process'

const token = core.getInput('token'),
  push = core.getInput('push'),
  eventFile = process.env.GITHUB_EVENT_PATH || '/github/workflow/event.json'

const client = github.client(token || undefined),
  repo = client.repo(process.env.GITHUB_REPOSITORY);

(async function main() {
  try {
    const eventObj = await readJson(eventFile),
      tag = eventObj.ref

    if (eventObj.ref_type != 'tag') {
      core.info('No tag has been added.')
      return
    }

    core.info(`Sha: ${eventObj.head}\nTag: ${tag}`)

    let match = '',
      major = ''
    if (typeof tag == 'string' && semverRegex().test(tag)) {
      match = (tag.match(semverRegex()) || [''])[0]
      if (match) major = match[0]
    } else return core.info('No tag matching the SemVer regex has been found, no tags have been created.')

    if (major) {
      const tagProcess = spawn('git', `tag --force -a v${major} -m "Link to version ${match}"`.split(' '))
      tagProcess.stdout.on('data', d => core.info('tag: ' + d))
      tagProcess.stdout.on('error', e => core.error('tag: ' + e))
      tagProcess.on('exit', code => {
        if (code != 0) core.setFailed(`The tag process failed with code ${code}. More info is probably written above.`)
        if (!!token && (!push || push == 'true')) {
          const pushProcess = spawn('git', 'push --tags'.split(' '))
          pushProcess.stdout.on('data', d => core.info('push: ' + d))
          pushProcess.stdout.on('error', e => core.error('push: ' + e))
          pushProcess.on('exit', code => {
            if (code != 0) core.setFailed(`The push process failed with code ${code}. More info is probably written above.`)
          })
        } else if (!token) core.setFailed('Although a match has been found, you requested to push the created tags but didn\'t provide a token.')
      })
    }
  } catch (e) {
    core.error(e)
    core.setFailed(e)
  }
})().finally(() => {
  core.setFailed('Fake problem')
})

async function readJson(file: string) {
  const data: string = await new Promise((resolve, reject) =>
    readFile(file, "utf8", (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  )
  return JSON.parse(data)
}

async function getTag(sha: string): Promise<string | undefined> {
  const tags: tagInfo[] = (await repo.tagsAsync())[0]
  for (let tag of tags) {
    if (tag.commit.sha == sha) return tag.name
  }
}
interface tagInfo {
  commit: {
    sha: string
    url: string
  }
  name: string
  node_id: string
  tarball_url: string
  zipball_url: string
}
