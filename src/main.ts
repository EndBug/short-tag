import * as core from '@actions/core'
import * as github from 'octonode'
import * as shell from 'shelljs'
import * as path from 'path'
import semverRegex from 'semver-regex'
import { readFile } from 'fs'

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

    process.env.PARAM_MAJOR = major
    process.env.PARAM_MATCH = match
    process.env.GITHUB_TOKEN = token

    let shouldPush = (!push || push == 'true')
    if (!!token) process.env.PARAM_PUSH = shouldPush ? 'true' : undefined
    else {
      process.env.PARAM_PUSH = undefined
      if (shouldPush) core.warning('You requested to push the tag, but didn\'t provide any token: the tags can\'t be pushed to the repo without one.')
    }

    core.info(`Starting start script with the following parameters: [${major}, ${match}, ${process.env.PARAM_PUSH}]`)
    shell.exec(path.join(__dirname, '../src/tag.sh'))
  } catch (e) {
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
