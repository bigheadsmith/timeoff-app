/*
 * For given email fetch user account info using provided driver
 * where an client side JS is used to trigger AJAX request to
 * server. Make sure that drivier has active admin session.
 *
 * */

'use strict'

const bluebird = require('bluebird')

// Function that is executed on the client,
// it relies on presence of jQuery and window.VPP_email
const func_to_inject = function() {
  const callback = arguments[arguments.length - 1]

  $.ajax({
    url: '/users/search/',
    type: 'post',
    data: {
      email: window.VPP_email
    },
    headers: {
      Accept: 'application/json'
    },
    dataType: 'json',
    success: function(data) {
      callback(data)
    }
  })
}

const user_info_func = bluebird.promisify(function(args, callback) {
  const result_callback = callback
  const driver = args.driver
  const email = args.email

  if (!driver) {
    throw "'driver' was not passed into the user_info!"
  }

  if (!email) {
    throw "'email' was not passed into the user_info!"
  }

  return bluebird
    .resolve()

    .then(function(data) {
      // Inject email we are using to identify user into the tested page
      driver.executeScript('window.VPP_email = "' + email + '";')

      let user

      // execute AJAX request on the client that fetchs user info by email
      driver.executeAsyncScript(func_to_inject).then(function(users) {
        user = users.length > 0 ? users[0] : {}
      })

      return driver.call(function() {
        return bluebird.resolve(user)
      })
    })

    .then(function(user) {
      // "export" current driver
      result_callback(null, {
        driver,
        user
      })
    })
})

module.exports = function(args) {
  return args.driver.call(function() {
    return user_info_func(args)
  })
}
