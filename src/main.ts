import axios from 'axios'
import semverRegex from 'semver-regex';
import * as core from '@actions/core'
import { readFile } from 'fs';
import { spawn } from 'child_process';

const token = core.getInput('token'),
  push = core.getInput('push'),
  eventFile = process.env.GITHUB_EVENT_PATH || '/github/workflow/event.json';

(async function main() {
  const eventObj = await readJson(eventFile),
    tag = (await getTag(eventObj.head)).tag

  let match = '',
    major = ''
  if (typeof tag == 'string' && semverRegex().test(tag)) {
    match = (tag.match(semverRegex()) || [''])[0]
    if (match) major = match[0]
  } else return core.info('No tag matching the SemVer regex has been found, no tags have been created.')

  if (major) {
    const tagProcess = spawn(`git tag --force -a v${major} -m "Link to version ${match}"`)
    tagProcess.stdout.on('data', d => console.log(`tag: ${d}`))
    tagProcess.on('exit', code => {
      if (code != 0) core.setFailed(`The tag process failed with code ${code}. More info is probably written above.`)
      if (!!token && (!push || push == 'true')) {
        const pushProcess = spawn('git push --tags')
        pushProcess.stdout.on('data', d => console.log(`push: ${d}`))
        pushProcess.on('exit', code => {
          if (code != 0) core.setFailed(`The push process failed with code ${code}. More info is probably written above.`)
        })
      } else if (!token) core.setFailed('Although a match has been found, you requested to push the created tags but didn\'t provide a token.')
    })
  }
})()

async function readJson(file: string) {
  const data: string = await new Promise((resolve, reject) =>
    readFile(file, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  );
  return JSON.parse(data);
}

async function getTag(sha: string): Promise<tagInfo> {
  const url = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/tags/${sha}`,
    headers = token ? {
      Authorization: `Bearer ${token}`
    } : undefined

  return (await axios.get(url, { headers }))
}
interface tagInfo {
  tag: string
}
