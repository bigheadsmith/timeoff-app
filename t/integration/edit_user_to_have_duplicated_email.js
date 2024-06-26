'use strict'

const test = require('selenium-webdriver/testing')
const By = require('selenium-webdriver').By
const expect = require('chai').expect
const _ = require('underscore')
const Promise = require('bluebird')
const register_new_user_func = require('../lib/register_new_user')
const login_user_func = require('../lib/login_with_user')
const open_page_func = require('../lib/open_page')
const submit_form_func = require('../lib/submit_form')
const add_new_user_func = require('../lib/add_new_user')
const config = require('../lib/config')
const application_host = config.get_application_host()

/*
 *  Scenario to check:
 *
 *    * Register new account with email EMAIL
 *    * Add new user with new email
 *    * Edit second user and try to assign email EMAIL to it
 *    * There should be an error
 *
 * */

describe('Edit user to have duplicated email', function() {
  this.timeout(config.get_execution_timeout())

  let email_admin, driver

  it('Create new company', function(done) {
    register_new_user_func({
      application_host
    }).then(function(data) {
      driver = data.driver
      email_admin = data.email
      done()
    })
  })

  it('Create second user', function(done) {
    add_new_user_func({
      application_host,
      driver
    }).then(function() {
      done()
    })
  })

  it("Open 'users' page", function(done) {
    open_page_func({
      url: application_host + 'users/',
      driver
    }).then(function() {
      done()
    })
  })

  it(
    'Make sure that both users are shown ' +
      'and click on latest user (assuming users are sorted alphabetichally and ' +
      'test user names are derived from epoch)',
    function(done) {
      driver
        .findElements(By.css('td.user-link-cell a'))
        .then(function(elements) {
          expect(elements.length).to.be.equal(2)
          // click on second user link
          return elements[1].click()
        })
        .then(function() {
          done()
        })
    }
  )

  it('Try to assign to second user the same email as ADMIN has', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="email_address"]',
          value: email_admin
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /Email is already in use/
    }).then(function() {
      done()
    })
  })

  it('Update email user with unique email address', function(done) {
    submit_form_func({
      driver,
      form_params: [
        {
          selector: 'input[name="email_address"]',
          value: 'foobar' + email_admin
        }
      ],
      submit_button_selector: 'button#save_changes_btn',
      message: /Details for .* were updated/
    }).then(function() {
      done()
    })
  })

  after(function(done) {
    driver.quit().then(function() {
      done()
    })
  })
})
