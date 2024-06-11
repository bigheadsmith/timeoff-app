'use strict'

const Joi = require('joi')
const uuid = require('node-uuid')
const Promise = require('bluebird')
const _ = require('lodash')
const Exception = require('../error')
const Models = require('./db')

const add_user_interface_schema = Joi.object()
  .required()
  .keys({
    email: Joi.string().email(),
    slack_username: Joi.string()
      .optional()
      .default(null)
      .allow(null, ''),
    lastname: Joi.string(),
    name: Joi.string(),
    company_id: Joi.number()
      .integer()
      .positive(),
    department_id: Joi.number()
      .integer()
      .positive(),

    start_date: Joi.string().optional(),
    end_date: Joi.string()
      .default(null)
      .allow(null),
    admin: Joi.boolean().default(false),
    manager: Joi.boolean().default(false),
    auto_approve: Joi.boolean().default(false),
    password: Joi.string().default(() => uuid.v4(), 'Populate default password'),
    work_hours: Joi.string()
      .optional()
      .default(null)
      .allow(null, ''),
    break_times: Joi.string()
      .optional()
      .default(null)
      .allow(null, ''),
    employee_num: Joi.string()
      .optional()
      .default(null)
      .allow(null, ''),
  })

function add_user(args) {
  const validated_args = Joi.validate(args, add_user_interface_schema)

  if (validated_args.error) {
    console.log('An error occured when validating parameters for add_user: ')
    console.dir(validated_args)
    Exception.throw_user_error({
      system_error: 'Failed to add new due to validation errors',
      user_error: 'Failed to add user: ' + validated_args.error
    })
  }

  // Use validated (and expanded) arguments object
  args = validated_args.value

  const attributes = {}
  const slack_username = args.slack_username
    ? '@' + args.slack_username.replace('@', '')
    : null

  attributes.email = args.email.toLowerCase()
  attributes.slack_username = slack_username
  attributes.lastname = args.lastname
  attributes.name = args.name
  attributes.company_id = args.company_id
  attributes.department_id = args.department_id

  attributes.password = Models.User.hashify_password(args.password)
  attributes.admin = args.admin
  attributes.manager = args.manager
  attributes.auto_approve = args.auto_approve
  attributes.end_date = args.end_date
  attributes.work_hours = args.work_hours
  attributes.break_times = args.break_times
  attributes.employee_num = args.employee_num

  // Pass start date inky if it is set, otherwise rely on database to use
  // default value
  if (args.start_date) {
    attributes.start_date = args.start_date
  }

  return (
    Promise.resolve()

      // Ensure given department ID is owned by given company ID
      .then(() =>
        Models.Department.findOne({
          where: { id: args.department_id, company_id: args.company_id }
        }).then(department => {
          if (!department) {
            Exception.throw_user_error({
              system_error:
                'Mismatch in department/company IDs when creating new user ' +
                args.department_id +
                '/' +
                args.company_id,
              user_error: 'Used wrong department'
            })
          }
          return Promise.resolve()
        })
      )

      // Ensure provided email is free to use
      .then(() => validate_email_to_be_free({ email: args.email }))

      // Create new user record
      .then(() => Models.User.create(attributes))
  )
}

async function add_users_in_bulk({ bulk_header, bulk_data, to_company_id }) {
  const company = await Models.Company.scope('with_simple_departments').findOne(
    { where: { id: to_company_id } }
  )
  if (!company) throw new Error(`Company with ID ${to_company_id} not found`)

  // define indexes for vector columns
  const department_vector_index = bulk_header.indexOf('department')
  const email_vector_index = bulk_header.indexOf('email')
  const slack_username_vector_index = bulk_header.indexOf('slack_username')
  const lastname_vector_index = bulk_header.indexOf('lastname')
  const name_vector_index = bulk_header.indexOf('name')

  // lights camera action
  const dep_name_to_id = _.fromPairs(
    company.departments.map(dep => [dep.name, dep.id])
  )
  const with_invalid_departments = bulk_data.filter(
    vector => !dep_name_to_id[vector[department_vector_index]]
  )
  if (with_invalid_departments.length > 0) {
    const unknown_departments = with_invalid_departments
      .map(vector => `"${vector[department_vector_index]}"`)
      .join(', ')
    throw new Error(`Unknown departments: ${unknown_departments}`)
  }

  bulk_data.forEach(vector => {
    vector[department_vector_index] =
      dep_name_to_id[vector[department_vector_index]]
  })

  const users_or_errors = await Promise.map(
    bulk_data,
    async vector => {
      const userData = {
        email: vector[email_vector_index],
        slack_username: vector[slack_username_vector_index],
        lastname: vector[lastname_vector_index],
        name: vector[name_vector_index],
        department_id: vector[department_vector_index],
        company_id: to_company_id
      }

      try {
        return await add_user(userData)
      } catch (error) {
        return { error, email: userData.email }
      }
    },
    { concurrency: 2 }
  )

  const result = { users: [], errors: [] }
  users_or_errors.forEach(item => {
    if (item.hasOwnProperty('error')) {
      result.errors.push(item)
    } else {
      result.users.push(item)
    }
  })

  return result
}

const validate_email_to_be_free_schema = Joi.object()
  .required()
  .keys({
    email: Joi.string()
      .email()
      .required()
  })

function validate_email_to_be_free(args) {
  const validate_args = Joi.validate(args, validate_email_to_be_free_schema)

  if (validate_args.error) {
    Exception.throw_user_error({
      system_error: 'validate_email_to_be_free failed arguments validation',
      user_error: 'Failed to validate email'
    })
  }

  return Models.User.find_by_email(args.email).then(user => {
    if (user) {
      Exception.throw_user_error('Email is already in use')
    }

    return Promise.resolve()
  })
}

module.exports = {
  add_user,
  add_users_in_bulk,
  validate_email_to_be_free
}
