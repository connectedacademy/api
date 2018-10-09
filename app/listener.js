const redis = require('redis')

const Message = require('./models/message')
const User = require('./models/user')

// Create redis client
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379
})

const storeMessage = async function (io, tweet) {
  try {
    // Log tweet
    console.log('tweet', tweet)
    
    // Ensure message has a valid url
    let match = undefined
    for (const url of tweet.entities.urls) {
      if (url.expanded_url.match(process.env.REGEX)) {
        match = url.expanded_url
      }
    }
    if (!match) {
      console.log('No valid URL in tweet')
      return
    }

    // Check if message has already been saved
    let existingMessage = await Message.findOne({ 'tweet.id_str': tweet.id_str })
    if (existingMessage) {
      console.log('This message has already been stored, moving on..')
      return
    }

    // Create the message
    let message = new Message({ tweet: tweet })
    
    // Check for existing user
    let user = await User.findOne({ 'twitter.id': tweet.user.id_str })

    // Add user if not in DB
    if (!user) {
      user = new User({
        profile: {
          avatar: tweet.user.profile_image_url,
          name: tweet.user.name
        },
        twitter: {
          id: tweet.user.id_str,
          username: tweet.user.screen_name,
          displayName: tweet.user.name
        }
      })
      user = await user.save()
    }

    // Set user relationship
    message._user = user

    // Store message
    message = await message.save()

    // Grab message count
    const messageCount = await Message.count({ class: message.class, segment: message.segment })
    message = message.toObject()
    message.total = messageCount

    // Notify users
    io.to('class').emit('message', message)
    io.to('class').emit('visualisation', 'Updated')

  } catch (e) {
    // This error indicates that we receive a message that is not in the json format.
    console.error('Error', e)
  }
}

module.exports = function (io) {
  return {
    start: async () => {
      console.log('Starting listener...')

      // Attach a listener to receive new messages as soon as subscribe to a channel.
      redisClient.on('message', async function (channel, message) {
        console.log('Received tweet on tweet-channel')
        storeMessage(io, JSON.parse(message))
      })

      // Subscribe to a channel and start handling messages
      redisClient.subscribe('tweet-channel')
    }
  }
}