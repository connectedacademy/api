
const EventEmitter = require('events')

class TwitterReceiver extends EventEmitter {
  constructor(config, client) {
    super()
    this.config = config
    this.client = client
    this.max_seen_id = 0
  }

  async start() {
    console.log('Starting twitter receiver..')
    console.log('Tracking hashtags', this.config.hashtags);
    
    // Stream feed
    let stream = this.client.stream('statuses/filter', {
      track: this.config.hashtags
    })

    stream.on('data', (event) => {

      // Tweet marked for delete
      if (event.delete) {
        this.emit('delete', event)
        return
      }

      // Tweet marked to have geo data removed
      if (event.scrub_geo) {
        this.emit('scrub_geo', event)
        return
      }

      // A new tweet
      this.emit('message', event);
      // Set the last seen id
      if (event.id > this.max_seen_id) {
        this.max_seen_id = event.id
      }
    })

    stream.on('error', (err) => {
      console.log('Twitter Error', err)
      this.emit('error', err)
    })

    this.emit('log', 'Streaming ' + this.config.hashtags)
  }

  async getSingle(id) {
    var tweet = await this.client.get('statuses/show/', { id: id })
    console.log('getSingle', tweet)
  }

  async backlog() {
    this.emit('log', 'Processing backlog for ' + this.config.hashtags)
    try {
      // Get older tweets for current query
      var tweets = await this.client.get('search/tweets', {
        q: this.config.hashtags,
        count: process.env.BACKLOG_LIMIT,
        max_id: this.max_seen_id
      })

      // Publish each tweet
      for (let tweet of tweets.statuses) {
        if (tweet.id > this.max_seen_id) {
          this.max_seen_id = tweet.id
        }
        this.emit('message', tweet)
      }
    }
    catch (e) {
      this.emit('Error with Twitter backlog', e);
    }
  }
}

module.exports = TwitterReceiver