/*
 * Mixin that inject to user model object consumer set of methods necessary for
 * dealing with absences.
 *
 * */

'use strict'

const { sorter } = require('../../../util')

const _ = require('underscore')
const Promise = require('bluebird')
const CalendarMonth = require('../../calendar_month')
const LeaveCollectionUtil = require('../../leave_collection')()
const moment = require('moment')

const Sequelize = require('sequelize')
const Op = Sequelize.Op

module.exports = function(sequelize) {
  this._get_calendar_months_to_show = function(args) {
    const self = this
    const year = args.year
    const show_full_year = args.show_full_year

    if (show_full_year) {
      return _.map([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], i =>
        moment.utc(year.format('YYYY') + '-' + String(i).padStart(2, '0') + '-01')
      )
    }

    return _.map([0, 1, 2, 3], delta =>
      self.company
        .get_today()
        .add(delta, 'months')
        .startOf('month')
    )
  }

  this.promise_calendar = function(args) {
    const this_user = this
    const year = args.year || this_user.company.get_today()
    const show_full_year = args.show_full_year || false
    const model = sequelize.models
    // Find out if we need to show multi year calendar
    const is_multi_year = this_user.company.get_today().month() > 8

    const months_to_show = this_user._get_calendar_months_to_show({
      year: year.clone(),
      show_full_year
    })
    console.log('promise_calendar months_to_show:', months_to_show)

    return Promise.join(
      Promise.try(() => this_user.getDepartment()),

      Promise.try(() =>
        this_user.getCompany({
          scope: ['with_bank_holidays', 'with_leave_types']
        })
      ),

      Promise.try(() =>
        this_user.getMy_leaves({
          where: {
            [Op.and]: [
              { status: { [Op.ne]: sequelize.models.Leave.status_rejected() } },
              { status: { [Op.ne]: sequelize.models.Leave.status_canceled() } }
            ],
            [Op.or]: {
              date_start: {
                [Op.between]: [
                  moment
                    .utc(year)
                    .startOf('year')
                    .format('YYYY-MM-DD'),
                  moment
                    .utc(year.clone().add(is_multi_year ? 1 : 0, 'years'))
                    .endOf('year')
                    .format('YYYY-MM-DD 23:59:59')
                ]
              },
              date_end: {
                [Op.between]: [
                  moment
                    .utc(year)
                    .startOf('year')
                    .format('YYYY-MM-DD'),
                  moment
                    .utc(year.clone().add(is_multi_year ? 1 : 0, 'years'))
                    .endOf('year')
                    .format('YYYY-MM-DD 23:59:59')
                ]
              }
            }
          }
        })
      ),

      Promise.try(() => this_user.promise_schedule_I_obey()),

      (department, company, leaves, schedule) => {
        const leave_days = _.flatten(
          _.map(leaves, leave =>
            _.map(leave.get_days(), leave_day => {
              leave_day.leave = leave
              return leave_day
            })
          )
        )

        return Promise.resolve(
          _.map(
            months_to_show,
            month =>
              new CalendarMonth(month, {
                bank_holidays: department.include_public_holidays
                  ? company.bank_holidays
                  : [],
                leave_days,
                schedule,
                today: company.get_today(),
                leave_types: company.leave_types
              })
          )
        )
      }
    ) // End of join
  }

  this.validate_overlapping = function(new_leave_attributes) {
    const this_user = this

    const days_filter = {
      [Op.between]: [
        new_leave_attributes.from_date,
        moment
          .utc(new_leave_attributes.to_date)
          .endOf('day')
          .format('YYYY-MM-DD')
      ]
    }
    console.log('validate_overlapping days_filter:', days_filter)

    return (
      this_user
        .getMy_leaves({
          where: {
            [Op.and]: [
              { status: { [Op.ne]: sequelize.models.Leave.status_rejected() } },
              { status: { [Op.ne]: sequelize.models.Leave.status_canceled() } }
            ],

            [Op.or]: [
              { date_start: days_filter },
              { date_end: days_filter },
              {
                [Op.and]: [
                  { date_start: { [Op.lte]: new_leave_attributes.from_date } },
                  { date_end: { [Op.gte]: new_leave_attributes.to_date } }
                ]
              }
            ]
          }
        })

        // additional logging
        .then(overlapping_leaves => {
          console.log('Found overlapping leaves: ', overlapping_leaves)

          // Check there are overlapping leaves
          if (overlapping_leaves.length === 0) {
            return Promise.resolve(1)
          }

          const overlapping_leave = overlapping_leaves[0]
          console.log('Evaluating overlapping leave: ', overlapping_leave)

          if (overlapping_leave.fit_with_leave_request(new_leave_attributes)) {
            console.log('Overlapping leave fits with the new leave request')
            return Promise.resolve(1)
          }

          // Otherwise it is overlapping!
          const error = new Error('Overlapping booking!')
          error.user_message = 'Overlapping booking!'
          console.error('Overlapping booking detected: ', error)
          throw error
        })
    )
  }

  // Promise all leaves requested by current user, regardless
  // their statuses
  //
  this.promise_my_leaves = function(args) {
    const self = this
    // Time zone does not really matter here, although there could be issues
    // around New Year (but we can tolerate that)
    const year = args && args.year ? args.year : moment.utc().year()

    const where_clause = []

    console.log('promise_my_leaves args:', args)
    if (args && args.filter_status) {
      where_clause.push({ status: args.filter_status })
    }

    if (args && !args.ignore_year) {
      where_clause.push({
        [Op.or]: {
          date_start: {
            [Op.between]: [
              moment
                .utc(year)
                .startOf('year')
                .format('YYYY-MM-DD'),
              moment
                .utc(year)
                .endOf('year')
                .format('YYYY-MM-DD 23:59:59')
            ]
          },
          date_end: {
            [Op.between]: [
              moment
                .utc(year)
                .startOf('year')
                .format('YYYY-MM-DD'),
              moment
                .utc(year)
                .endOf('year')
                .format('YYYY-MM-DD 23:59:59')
            ]
          }
        }
      })
    }
    // Case when there are start and end date defined
    else if (args && args.dateStart && args.dateEnd) {
      const { dateStart, dateEnd } = args

      where_clause.push({
        [Op.or]: [
          {
            date_start: {
              [Op.between]: [
                moment
                  .utc(dateStart)
                  .startOf('day')
                  .format('YYYY-MM-DD'),
                moment
                  .utc(dateEnd)
                  .endOf('day')
                  .format('YYYY-MM-DD 23:59:59')
              ]
            }
          },
          {
            date_end: {
              [Op.between]: [
                moment
                  .utc(dateStart)
                  .startOf('day')
                  .format('YYYY-MM-DD'),
                moment
                  .utc(dateEnd)
                  .endOf('day')
                  .format('YYYY-MM-DD 23:59:59')
              ]
            }
          },
          {
            [Op.and]: [
              {
                date_start: {
                  [Op.lte]: moment
                    .utc(dateStart)
                    .startOf('day')
                    .format('YYYY-MM-DD')
                }
              },
              {
                date_end: {
                  [Op.gte]: moment
                    .utc(dateEnd)
                    .endOf('day')
                    .format('YYYY-MM-DD 23:59:59')
                }
              }
            ]
          }
        ]
      })
    }

    // Handle filter by id if provided
    if (args && args.filter && args.filter.id) {
      where_clause.push({ id: args.filter.id })
    }

    // console.log('promise_my_leaves where_clause:', where_clause.toString())
    const promise_my_leaves = this.getMy_leaves({
      // TODO here is cartesian product between leave types and users,
      // needs to be split
      include: [
        {
          model: sequelize.models.LeaveType,
          as: 'leave_type'
        },
        {
          model: sequelize.models.User,
          as: 'user',
          include: [
            {
              model: sequelize.models.Company,
              as: 'company',
              include: [
                {
                  model: sequelize.models.BankHoliday,
                  as: 'bank_holidays'
                }
              ]
            }
          ]
        }
      ],
      where: { [Op.and]: where_clause }
    })

      // Fetch approvers for each leave in separate query, to avoid cartesian
      // products.
      .then(leaves => {
        leaves.forEach(leave => {
          leave.user.cached_schedule = self.cached_schedule
        })

        return Promise.resolve(leaves).map(
          leave =>
            leave.promise_approver().then(approver => {
              leave.approver = approver
              return Promise.resolve(leave)
            }),
          {
            concurrency: 10
          }
        )
      })

      .then(async leaves => {
        const department = await self.getDepartment()
        leaves.forEach(l => (l.user.department = department))
        return leaves
      })

      .then(leaves => LeaveCollectionUtil.promise_to_sort_leaves(leaves))

    return promise_my_leaves
  }

  // added fault-tolerance and logging
  this.promise_my_active_leaves = function(args) {
    try {
      console.log('Executing promise_my_active_leaves with args:', args)

      // Ensure year is either a properly formatted string or a JS Date object
      const year = args && args.year ? args.year : moment.utc().year()

      return this.promise_my_leaves({
        year,
        filter_status: [
          sequelize.models.Leave.status_approved(),
          sequelize.models.Leave.status_new(),
          sequelize.models.Leave.status_pended_revoke()
        ]
      })
        .then(leaves => {
          console.log(
            `Successfully retrieved and sorted leaves for year: ${year}`
          )
          return LeaveCollectionUtil.promise_to_sort_leaves(leaves)
        })
        .catch(err => {
          console.error('Error in promise_my_leaves:', err)
          throw err // Rethrow the error after logging
        })
    } catch (err) {
      console.error('Unexpected error in promise_my_active_leaves:', err)
      throw err // Rethrow the error to ensure it's not silently ignored
    }
  }

  this.getMyActiveLeavesForDateRange = async function({ dateStart, dateEnd }) {
    console.log('getMyActiveLeavesForDateRange dateStart:', dateStart, dateEnd)
    const self = this

    const rawLeaves = await self.promise_my_leaves({
      ignore_year: true,
      dateStart,
      dateEnd,
      filter_status: [
        sequelize.models.Leave.status_approved(),
        sequelize.models.Leave.status_new(),
        sequelize.models.Leave.status_pended_revoke()
      ]
    })

    const leaves = await LeaveCollectionUtil.promise_to_sort_leaves(rawLeaves)

    return leaves
  }

  // Promises leaves ever booked for current user
  this.promise_my_active_leaves_ever = function() {
    return this.promise_my_leaves({
      ignore_year: true,
      filter_status: [
        sequelize.models.Leave.status_approved(),
        sequelize.models.Leave.status_new(),
        sequelize.models.Leave.status_pended_revoke()
      ]
    }).then(leaves => LeaveCollectionUtil.promise_to_sort_leaves(leaves))
  }

  // Promise leaves that are needed to be Approved/Rejected
  //
  this.promise_leaves_to_be_processed = function() {
    const self = this

    return self
      .promise_supervised_users()
      .then(users =>
        sequelize.models.Leave.findAll({
          include: [
            {
              model: sequelize.models.LeaveType,
              as: 'leave_type'
            },
            {
              model: sequelize.models.User,
              as: 'user',
              include: [
                {
                  model: sequelize.models.Company,
                  as: 'company',
                  include: [
                    {
                      model: sequelize.models.BankHoliday,
                      as: 'bank_holidays'
                    }
                  ]
                },
                {
                  model: sequelize.models.Department,
                  as: 'department'
                }
              ]
            }
          ],
          where: {
            status: [
              sequelize.models.Leave.status_new(),
              sequelize.models.Leave.status_pended_revoke()
            ],
            user_id: users.map(u => u.id)
          }
        })
      )
      .then(leaves =>
        Promise.resolve(leaves)
          .map(leave => leave.user.promise_schedule_I_obey(), {
            concurrency: 10
          })
          .then(() => Promise.resolve(leaves))
          .then(leaves => LeaveCollectionUtil.promise_to_sort_leaves(leaves))
      )
  } // END of promise_leaves_to_be_processed

  this.promise_cancelable_leaves = function() {
    const self = this

    return self
      .promise_my_leaves({
        ignore_year: true,
        filter_status: [sequelize.models.Leave.status_new()]
      })
      .then(leaves =>
        Promise.map(leaves, leave => leave.user.promise_schedule_I_obey(), {
          concurrency: 10
        })
          .then(() => Promise.resolve(leaves))
          .then(leaves => LeaveCollectionUtil.promise_to_sort_leaves(leaves))
      )
  }

  // count approved
  this.calculate_number_of_days_taken_from_allowance = function(args) {
    const leave_type = args ? args.leave_type : null
    let leaves_to_traverse = this.my_leaves || []
    const count_personal_only = args ? args.count_personal : false

    // Set cached_schedule for each leave
    leaves_to_traverse.forEach(leave => {
      if (leave.user) {
        leave.user.cached_schedule = this.cached_schedule
      }
    })

    // Filter leaves based on the conditions
    if (count_personal_only) {
      leaves_to_traverse = leaves_to_traverse.filter(
        leave => leave.leave_type && leave.leave_type.use_personal
      )
    } else if (leave_type) {
      leaves_to_traverse = leaves_to_traverse.filter(leave =>
        leave_type.use_personal
          ? leave.leave_type && leave.leave_type.use_personal
          : leave.leaveTypeId === leave_type.id
      )
    }

    // Calculate the sum of deducted days for approved leaves
    const result =
      leaves_to_traverse.reduce((memo, leave) => {
        if (leave.is_approved_leave()) {
          return memo + leave.get_deducted_days_number(args)
        }
        return memo
      }, 0) || 0

    return result
  }

  // Based on leaves attached to the current user object,
  // the method does not perform any additional queries
  //
  ;(this.get_leave_statistics_by_types = function(args) {
    if (!args) args = {}

    const statistics = {}
    const limit_by_top = args.limit_by_top || false

    this.company.leave_types.forEach(leave_type => {
      const initial_stat = {
        leave_type,
        days_taken: 0
      }
      initial_stat.limit = leave_type.limit ? leave_type.limit : 0
      if (leave_type.use_personal) {
        initial_stat.limit = this.department.personal
      }
      statistics[leave_type.id] = initial_stat
    })

    // Calculate statistics as an object
    _.filter(this.my_leaves, function(leave) {
      return leave.is_approved_leave()
    }).forEach(function(leave) {
      const stat_obj = statistics[leave.leave_type.id]

      stat_obj.days_taken =
        stat_obj.days_taken +
        leave.get_deducted_days_number({
          ignore_allowance: true
        })
    })

    let statistic_arr = _.map(_.pairs(statistics), function(pair) {
      return pair[1]
    })

    statistic_arr = statistic_arr
      .sort((a, b) => sorter(a.days_taken, b.days_taken))
      .reverse()

    if (limit_by_top) {
      statistic_arr = _.first(statistic_arr, 4)
    }

    return statistic_arr.sort((a, b) =>
      sorter(a.leave_type.name, b.leave_type.name)
    )
  }),
    (this.promise_adjustment_and_carry_over_for_year = function(inputYear) {
      const self = this

      inputYear = inputYear || moment.utc()
      inputYear = moment.utc(inputYear).format('YYYY')

      const startYear = moment.utc(self.start_date).format('YYYY');

      // Define a recursive function to look back through previous years
      function findAdjustment(year) {
        if (year < startYear) {
          // If no adjustment is found by the time we reach the start year, assume 0
          return Promise.resolve({
            adjustment: 0,
            carried_over_allowance: 0
          });
        }

        // Try to find an adjustment for the current year
        return self.getAdjustments({ where: { year } }).then(adjustment_records => {
          // If an adjustment is found, stop looking back
          if (adjustment_records.length === 1) {
            return {
              adjustment: adjustment_records[0].adjustment,
              carried_over_allowance: adjustment_records[0].carried_over_allowance
            };
          }

          // If no adjustment is found for the current year, look back to the previous year
          return findAdjustment(year - 1);
        });
      }

      // Start looking back through previous years
      return findAdjustment(inputYear);
    })

  this.promise_adjustment_for_year = function(year) {
    const self = this

    return self
      .promise_adjustment_and_carry_over_for_year(year)
      .then(combined_record => Promise.resolve(combined_record.adjustment))
  }

  this.promise_carried_over_allowance_for_year = function(year) {
    const self = this

    return self
      .promise_adjustment_and_carry_over_for_year(year)
      .then(combined_record =>
        Promise.resolve(combined_record.carried_over_allowance)
      )
  }

  this.promise_to_update_adjustment = function(args) {
    const self = this
    const year = args.year || moment.utc().format('YYYY')
    const adjustment = args.adjustment

    // Update related allowance adjustement record
    return sequelize.models.UserAllowanceAdjustment.findOrCreate({
      where: {
        user_id: self.id,
        year
      },
      defaults: { adjustment }
    }).spread((record, created) => {
      if (created) {
        return Promise.resolve()
      }

      record.set('adjustment', adjustment)

      return record.save()
    })
  }

  this.promise_to_update_carried_over_allowance = function(args) {
    const self = this
    const year = args.year || moment.utc().format('YYYY')
    const carried_over_allowance = args.carried_over_allowance

    // Update related allowance adjustement record
    return sequelize.models.UserAllowanceAdjustment.findOrCreate({
      where: {
        user_id: self.id,
        year
      },
      defaults: { carried_over_allowance }
    }).spread((record, created) => {
      if (created) {
        return Promise.resolve()
      }

      record.set('carried_over_allowance', carried_over_allowance)

      return record.save()
    })
  }

  this.promise_my_leaves_for_calendar = function(args) {
    const year = args.year || this.company.get_today()

    return this.getMy_leaves({
      where: {
        [Op.and]: [
          { status: { [Op.ne]: sequelize.models.Leave.status_rejected() } },
          { status: { [Op.ne]: sequelize.models.Leave.status_canceled() } }
        ],

        [Op.or]: {
          date_start: {
            [Op.between]: [
              moment
                .utc(year)
                .startOf('year')
                .format('YYYY-MM-DD'),
              moment
                .utc(year)
                .endOf('year')
                .format('YYYY-MM-DD 23:59:59')
            ]
          },
          date_end: {
            [Op.between]: [
              moment
                .utc(year)
                .startOf('year')
                .format('YYYY-MM-DD'),
              moment
                .utc(year)
                .endOf('year')
                .format('YYYY-MM-DD 23:59:59')
            ]
          }
        }
      }
    }) // End of MyLeaves
  }

  // For given leave object (not necessary one with corresponding record in DB)
  // check if current user is capable to have it, that is if user's remaining
  // vacation allowance is big enough to accommodate the leave.
  //
  // If validation fails an exceptionis thrown.
  //
  this.validate_leave_fits_into_remaining_allowance = function(args) {
    const self = this
    const leave_type = args.leave_type
    const leave = args.leave
    // Derive year from Leave object
    const year = args.year || moment.utc(leave.date_start)

    // Make sure object contain all necessary data for that check
    return (
      self
        .reload_with_leave_details({
          year: year.clone()
        })
        .then(employee => employee.reload_with_session_details())
        .then(employee =>
          employee.company
            .reload_with_bank_holidays()
            .then(() => Promise.resolve(employee))
        )
        .then(employee =>
          employee
            .promise_allowance({ year })
            .then(allowance_obj =>
              Promise.resolve([
                allowance_obj.number_of_days_available_in_allowance,
                employee
              ])
            )
        )
        .then(args => {
          const days_remaining_in_allowance = args[0]
          const employee = args[1]

          const deducted_days = leave.get_deducted_days_number({
            year: year.format('YYYY'),
            user: employee,
            leave_type
          })

          // Throw an exception when less than zero vacation would remain
          // if we add currently requested absence
          if (days_remaining_in_allowance - deducted_days < 0) {
            const error = new Error(
              'Requested absence is longer than remaining allowance'
            )
            error.user_message = error.toString()
            throw error
          }

          return Promise.resolve(employee)
        })

        // Check that adding new leave of this type will not exceed maximum limit of
        // that type (if it is defined)
        .then(employee => {
          let effectiveLimit = leave_type.limit ? leave_type.limit : 0
          if (leave_type.use_personal) {
            effectiveLimit = employee.department.personal
          }

          if (effectiveLimit && effectiveLimit > 0) {
            const days_taken = employee.calculate_number_of_days_taken_from_allowance(
              {
                year: year.format('YYYY'),
                leave_type,
                ignore_allowance: true
              }
            )
            const days_deducted = leave.get_deducted_days_number({
              year: year.format('YYYY'),
              user: employee,
              leave_type,
              ignore_allowance: true
            })
            const would_be_used = days_taken + days_deducted

            // check if used days are going to be more than limit
            if (would_be_used > effectiveLimit) {
              const error = new Error(
                'Not enough (' + leave_type.name + ') days.'
                // + (would_be_used - effectiveLimit)
              )

              error.user_message = error.toString()
              throw error
            }
          }

          return Promise.resolve()
        })
    )
  }
}
