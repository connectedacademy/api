const replayTime = process.env.REPLAY_TIME
const replayCourse = process.env.REPLAY_COURSE
const replayClass = process.env.REPLAY_CLASS

const Moment = require('moment')
const Message = require('../app/models/message')

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const loopMessages = async function (io, lastFakeDate = undefined, passedOffset = undefined) {

  let offset = passedOffset || Moment().diff(replayTime) // ms difference
  
  const fakeStart = Moment(replayTime).toDate()
  let fakeDate = Moment().subtract(offset, 'ms') // Fake date
  fakeDate = fakeDate.toDate()
  
  let messages = await Message.find({ $and: [{"created": {"$gte": lastFakeDate || fakeStart, "$lt": fakeDate}}, { course: replayCourse }, { class: `${replayClass}-demo` }]})

  for (let message of messages) {

    // Move to real class
    let updatedMessage = await Message.update({ _id: message._id }, { class: replayClass })
    updatedMessage = await Message.findOne({ _id: message._id })
    updatedMessage._replies = []

    // Notify users
    io.to('class').emit('message', updatedMessage)
    io.to('class').emit('visualisation', 'Updated')
  }

  await sleep(1000)
  let speed = 50 // replay speed 2x
  offset = offset - ((speed - 1) * 1000)
  loopMessages(io, fakeDate, offset)
}

module.exports = function (io) {
  return {
    start: async () => {
      if (process.env.REPLAY_ENABLED == 'true') {
        console.log('Starting replayer...')
        
        // Put all messages in demo class
        await Message.update({ course: replayCourse, class: replayClass }, { class: `${replayClass}-demo` }, { multi: true })
        await loopMessages(io)
      } else {
        console.log('Replayer not enabled...');
        
      }
    }
  }
}