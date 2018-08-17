const AWS = require('aws-sdk')

const request = require('request-promise')
const math = require('lodash/math')
const fs = require('fs-extra')

const configAWS = require('../../config/aws.js')
const utils = require('../utilities/utils.js')()

const S3_BUCKET = configAWS.s3Bucket
const TRANSCRIPTS_URI = configAWS.transcriptsUri

const awsS3 = new AWS.S3(configAWS)

async function downloadTranscription(uri) {

  return new Promise(function (resolve, reject) {

    var options = {
      uri: uri,
      json: true
    }

    request(options)
      .then(function (data) {
        resolve(data.results.items)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

async function formatTranscription(transcription) {
  console.log('formatTranscription called')

  return new Promise(function (resolve) {
    let theTranscript = {}

    for (const transcript of transcription) {
      const segmentGroup = parseInt(math.divide(math.floor(parseFloat(transcript.start_time) + 5), 5)) - 1
      if (typeof segmentGroup == 'undefined') continue
      let text = transcript.alternatives[0].content
      text = text.replace(/<br \/>/g, ' ')
      theTranscript[segmentGroup] = (theTranscript[segmentGroup]) ? theTranscript[segmentGroup] + ' ' + text : text
    }
    resolve(JSON.stringify(theTranscript))
  })
}

async function storeTranscription(course, theClass, transcription) {
  console.log('storeTranscription called')
  
  try {
    let jsonPath = utils.resolve(course, `classes/${theClass}/transcript.json`)
    let jsonFile = await fs.writeFile(jsonPath, transcription)
    jsonFile = await fs.readFile(jsonPath)

    return JSON.parse(jsonFile)
  } catch (error) {
    console.log('error', error)
    return 'Failed to store transcription'
  }
}

module.exports = function () {
  return {
    uploadFile: async (path, filename, type) => {
      console.log('uploadFile called')

      let file = await fs.readFile(path)
      return new Promise(function (resolve, reject) {
        const key = (type === 'audio') ? `audio/${filename}.mp3` : `media/${filename}.jpg`
        params = { Bucket: S3_BUCKET, Key: key, Body: file, ACL: 'public-read', ContentType: (type === 'audio') ? 'audio/mp3' : 'image/jpeg' }
        awsS3.putObject(params, function (err, data) {
          if (err) {
            console.log(err)
            reject()
          } else {
            console.log('Successfully uploaded', key)
            resolve(key)
          }
        })
      })
    },
    fetchTranscription: async (course, theClass, filename) => {
      
      // Get uri
      const uri = `${TRANSCRIPTS_URI}/${filename}`

      // Download transcription
      const transcription = await downloadTranscription(uri)

      // Format transcription
      const formattedTranscription = await formatTranscription(transcription)

      // Store transcription
      const storedTranscription = await storeTranscription(course, theClass, formattedTranscription)

      // Return transcription
      return storedTranscription
    }
  }
}
