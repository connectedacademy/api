const Twitter = require('twitter')

const User = require('../../app/models/user')

module.exports = function () {
  return {
    sendTweet: async (user_id, text) => {
      
      // Get user
      user = await User.findOne(user_id)

      if (!user) {
        console.error('Error finding user')
        return
      }
      
      let client = new Twitter({
        consumer_key: process.env.TWITTER_CLIENT_ID,
        consumer_secret: process.env.TWITTER_CLIENT_SECRET,
        access_token_key: user.twitter.token,
        access_token_secret: user.twitter.tokenSecret
      })

      var params = { status: text }

      client.post('statuses/update', params, function(error, tweet, response) {
        if (!error) {
          console.log(tweet)
        } else {
          console.error(error)
        }
      })
    }
  }
}