'use strict'

const Promise = require('bluebird')
const moment = require('moment')
const _ = require('underscore')
const { Op } = require('sequelize')

function promise_to_group_leaves(leaves) {
  if (!leaves) {
    throw new Error('Did not get "leaves" in promise_to_group_leaves')
  }

  let grouped_leaves = {}

  // Group leaves by years
  leaves.forEach(leave => {
    const year = moment.utc(leave.get_start_leave_day().date).format('YYYY')

    if (!grouped_leaves[year]) {
      grouped_leaves[year] = {
        year,
        leaves: []
      }
    }

    grouped_leaves[year].leaves.push(leave)
  })

  // Sort year groups
  grouped_leaves = _.values(grouped_leaves).sort((a, b) =>
    a.year > b.year ? -1 : a.year < b.year ? 1 : 0
  )

  // Calculate total allowance deduction per group
  grouped_leaves.forEach(group => {
    group.total_deduction = _.reduce(
      group.leaves.map(leave => leave.get_deducted_days_number()),
      (memo, number) => memo + number,
      0
    )
  })

  return Promise.resolve(grouped_leaves)
}

/*
 * Simple function that sorts array of Leave objects in default way.
 *
 * */

function promise_to_sort_leaves(leaves) {
  return Promise.resolve(
    leaves.sort((a, b) =>
      a.date_start > b.date_start ? -1 : a.date_start < b.date_start ? 1 : 0
    )
  )
}

const enrichLeavesWithComments = async ({ leaves, dbModel }) => {
  const comments = await dbModel.Comment.findAll({
    where: {
      entity_id: { [Op.in]: leaves.map(l => l.id) },
      entity_type: dbModel.Comment.getEntityTypeLeave()
    }
  })

  // Map comments by Leave ID
  const commentMap = comments.reduce((acc, c) => {
    acc[c.entity_id] = c
    return acc
  }, {})

  leaves
    .filter(l => commentMap[l.id] !== undefined)
    .forEach(l => (l.comment = commentMap[l.id]))

  return leaves
}

module.exports = function() {
  return {
    enrichLeavesWithComments,
    promise_to_group_leaves,
    promise_to_sort_leaves
  }
}
