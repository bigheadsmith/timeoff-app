'use strict'

const models = require('../lib/model/db')

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.describeTable('users').then(function (attributes) {
      let promises = []

      if (!attributes.hasOwnProperty('work_hours')) {
        promises.push(queryInterface.addColumn(
          'users',
          'work_hours',
          models.User.attributes.work_hours
        ))
      }

      if (!attributes.hasOwnProperty('break_times')) {
        promises.push(queryInterface.addColumn(
          'users',
          'break_times',
          models.User.attributes.break_times
        ))
      }

      if (!attributes.hasOwnProperty('employee_num')) {
        promises.push(queryInterface.addColumn(
          'users',
          'employee_num',
          models.User.attributes.employee_num
        ))
      }

      return Promise.all(promises)
    })
  },

  down: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('users', 'work_hours'),
      queryInterface.removeColumn('users', 'break_times'),
      queryInterface.removeColumn('users', 'employee_num')
    ])
  }
}
