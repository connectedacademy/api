'use strict'
const configMail = require('../../config/mail.js')

const _map = require('lodash/map')
const _forEach = require('lodash/forEach')

const nodemailer = require('nodemailer')
const path = require('path')
var EmailTemplate = require('email-templates').EmailTemplate
var templatesDir = path.resolve(__dirname, '../../templates')

const MAIL_HOST = configMail.host
const MAIL_PORT = configMail.port
const MAIL_USERNAME = configMail.username
const MAIL_PASSWORD = configMail.password
const MAIL_FROM_NAME = configMail.fromName
const MAIL_FROM_ADDRESS = configMail.fromAddress

const User = require('../models/user')

// Create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: MAIL_PORT,
  secure: false,
  auth: {
    user: MAIL_USERNAME,
    pass: MAIL_PASSWORD
  }
})

module.exports = {
  sendMail: function (to, subject, template, data) {
    console.log('Sending mail...')

    var emailTemplate = new EmailTemplate(path.join(templatesDir, template))

    emailTemplate.render(data, function (err, results) {
      if (err) return console.error(err)

      // Setup email data with unicode symbols
      let mailOptions = {
        from: `"${MAIL_FROM_NAME}" <${MAIL_FROM_ADDRESS}>`, // Sender address
        to: to, // list of receivers CSV
        subject: subject,
        html: results.html,
        text: results.text
      }

      // Send mail with defined transport object
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error)
        }
        console.log('Message %s sent: %s', info.messageId, info.response)
      })
    })
  }
}
