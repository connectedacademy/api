const _random = require('lodash/random')
const faker = require('faker')
const User = require('../app/models/user')
const Message = require('../app/models/message')
const Homework = require('../app/models/homework')
const HomeworkMessage = require('../app/models/homework-message')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateReply () {
  const replies = [
    'Incredible insight, thank you!',
    'Could you expand on this point?',
    'I couldn\'t agree with you more on this',
    'What do you think about this?',
    'How do I find out more about this topic?',
    'Were you aware of this before the course?',
    'This is an interesting point, can you expand on it?'
  ]
  return replies[_random(0, (replies.length - 1))]
}

const loopMessages = async function (io) {
  let messages = await Message.find({ _parent: { $exists: false } })

  for (let message of messages) {
    if (message._replies.length === 0) {

      const messageUser = await User.findOne({ _id: message._user })
      let userCount = await User.count({ _id: { $ne: messageUser._id }})
      let user = await User.findOne({ _id: { $ne: messageUser._id } }).skip(_random(0, (userCount - 1)))

      const data = {
        _user: user._id,
        _parent: message._id,
        course: 'rocket',
        class: message.class,
        segment: message.segment,
        segmentGroup: message.segmentGroup,
        text: `@${messageUser.twitter.username} ${generateReply()}`
      }
      
      let newMessage = new Message(data)
      newMessage = await newMessage.save()

      let originalMessage = await Message.findOneAndUpdate({ _id: message._id }, { $push: { _replies: newMessage._id } })
      originalMessage = await Message.findOne({ _id: newMessage._id })

      const messageCount = await Message.count({ class: message.class, segment: message.segment })
      originalMessage = originalMessage.toObject()
      originalMessage.total = messageCount

      // Notify users
      io.to('class').emit('message', originalMessage)
      io.to('class').emit('visualisation', 'Updated')
    }
  }
  await sleep(30000)
  return 'Responded'
}

module.exports = function (io) {
  return {
    begin: async () => {
      console.log('Starting responder...')
      while (true) {
        const result = await loopMessages(io)
        console.log('result', result)
      }
    }
  }
}