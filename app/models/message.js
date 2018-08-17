const mongoose = require('mongoose')

const messageSchema = mongoose.Schema({

  _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: String,
  class: String,
  segment: Number,
  segmentGroup: Number,
  text: String,
  tweet: mongoose.Schema.Types.Mixed,
  url: String,
  created: Date,
  destroyed: Date,
  _likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  _replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  _parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }

})

messageSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()

  // Format the tweet
  if (this.tweet) {
    let tweetUrl = undefined
    for (const url of this.tweet.entities.urls) {
      if (url.expanded_url.match(process.env.REGEX)) {
        tweetUrl = url.expanded_url
      }
    }

    if (!tweetUrl) return
    
    // this._user
    this.url = tweetUrl.match(process.env.REGEX)[0]
    this.course = tweetUrl.match(process.env.REGEX)[1] || process.env.DEFAULT_INSTANCE
    this.class = tweetUrl.match(process.env.REGEX)[2]
    this.segment = tweetUrl.match(process.env.REGEX)[3]
    this.segmentGroup = tweetUrl.match(process.env.REGEX)[3]
    this.text = this.tweet.text
    this.created = new Date(this.tweet.created_at)
    // this.destroyed
    // this._likes
    // this._replies
    // this._parent
  }
  next()
})

messageSchema.pre('findOne', function (next) {
  this.where({ destroyed: null }) // Ensure has not been destroyed
  this.populate('_user', 'profile') // Get user profile
  this.populate('_replies') // Get replies
  next()
})

messageSchema.pre('find', function (next) {
  this.where({ destroyed: null }) // Ensure has not been destroyed
  this.populate('_user', 'profile') // Get user profile
  this.populate('_replies') // Get replies
  next()
})

module.exports = mongoose.model('Message', messageSchema)
