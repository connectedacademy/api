const mongoose = require('mongoose')

const messageSchema = mongoose.Schema({

  _user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: String,
  class: String,
  segment: Number,
  segmentGroup: Number,
  text: String,
  created: Date,
  destroyed: Date,
  _likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  _replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  _parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }

})

messageSchema.pre('save', function (next) {
  // Set the created date to now if not currently set
  if (!this.created) this.created = new Date()
  next()
})

messageSchema.pre('findOne', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile')
  next()
})

messageSchema.pre('find', function (next) {
  this.where({ destroyed: null })
  this.populate('_user', 'profile')
  this.populate('_replies')
  next()
})

module.exports = mongoose.model('Message', messageSchema)
