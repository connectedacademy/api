require('dotenv').config()

const redis = require('redis')
const Twitter = require('twitter')

const TwitterReceiver = require('./utilities/twitter-receiver')

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379
})

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_TOKEN_SECRET
})

function initTwitterReceiver () {

  console.log('Initialising twitter receiver')
  
  let twitterReceiver = new TwitterReceiver({ hashtags: process.env.HASHTAGS }, twitterClient)

  twitterReceiver.on('message', async (message) => {
    console.log('Tweet received', message.id_str)

    // Check if retweet
    if (message.retweeted_status) return

    // Publish tweet
    redisClient.publish('tweet-channel', JSON.stringify(message))
  })

  twitterReceiver.on('delete', (message) => {
    console.log('Tweet for delete', message)
  })

  twitterReceiver.on('scrub_geo', (message) => {
    console.log('Tweet marked for geo scrub', message)
  })
  
  twitterReceiver.on('log', (log) => {
    console.log(log)
  })

  twitterReceiver.on('error', (err) => {
    console.log(err, twitterReceiver.config)
    // process.exit(1);
  })

  twitterReceiver.start()
}

module.exports = async function () {
  console.log('Twitter gateway initialising...')

  initTwitterReceiver()

  setInterval(function () {
    console.log('OK')
  }, 1 * 60 * 60 * 1000) // Every hour
}