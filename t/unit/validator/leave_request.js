'use strict'

const expect = require('chai').expect
const _ = require('underscore')
const MockExpressReq = require('../../lib/mock_express_request')
const leave_request_validator = require('../../../lib/route/validator/leave_request')

describe('Check validation for leave request', function() {
  it('No parameters provided', function() {
    const req = new MockExpressReq()

    expect(function() {
      leave_request_validator({ req, params: req.body })
    }).to.throw('Got validation errors')

    expect(req.session.flash.errors.length).to.be.equal(4)
  })

  it('User index is invalid', function() {
    const req = new MockExpressReq({
      params: { user: 'foo' }
    })

    expect(function() {
      leave_request_validator({ req })
    }).to.throw('Got validation errors')

    expect(
      _.findIndex(req.session.flash.errors, function(msg) {
        return msg === 'Incorrect employee'
      })
    ).to.be.greaterThan(-1)

    expect(req.session.flash.errors.length).to.be.equal(5)
  })

  const valid_params = {
    user: '1',
    leave_type: '1',
    from_date: '2015-05-10',
    from_date_part: '1',
    to_date: '2015-05-12',
    to_date_part: '2',
    reason: 'some reason'
  }

  it('Successfull scenario', function() {
    const req = new MockExpressReq({
      params: valid_params
    })

    expect(leave_request_validator({ req }).as_data_object()).to.be.eql(
      valid_params
    )

    expect(req.session).not.to.have.property('flash')
  })

  it('from_date_part has invalid value', function() {
    const params = _.clone(valid_params)
    params.from_date_part = '11'
    const req = new MockExpressReq({ params })
    expect(function() {
      leave_request_validator({ req })
    }).to.throw('Got validation errors')

    expect(
      _.findIndex(req.session.flash.errors, function(msg) {
        return msg === 'Incorrect day part'
      })
    ).to.be.greaterThan(-1)

    expect(req.session.flash.errors.length).to.be.equal(1)
  })

  it('from_date has invalid value', function() {
    const params = _.clone(valid_params)
    params.from_date = 'some horrible date'
    const req = new MockExpressReq({
      params
    })
    expect(function() {
      leave_request_validator({ req })
    }).to.throw('Got validation errors')

    expect(
      _.findIndex(req.session.flash.errors, function(msg) {
        return msg === 'From date should be a date'
      })
    ).to.be.greaterThan(-1)
  })

  it('start dates is greater than end one', function() {
    const params = _.clone(valid_params)
    params.from_date = '2015-04-12'
    params.to_date = '2015-04-02'
    const req = new MockExpressReq({
      params
    })
    expect(function() {
      leave_request_validator({ req })
    }).to.throw('From date should be before To date')

    expect(req.session).not.to.have.property('flash')
  })

  it('inter_year leave request', function() {
    const params = _.clone(valid_params)
    params.from_date = '2014-04-12'
    params.to_date = '2015-04-02'
    const req = new MockExpressReq({ params })
    expect(function() {
      leave_request_validator({ req })
    }).to.throw('Got validation errors')

    expect(
      _.findIndex(req.session.flash.errors, function(msg) {
        return (
          msg ===
          'Current implementation does not allow inter year leaves. Please split your request into two parts'
        )
      })
    ).to.be.greaterThan(-1)

    expect(req.session.flash.errors.length).to.be.equal(1)
  })

  it('Reason is optional', function() {
    const params = _.clone(valid_params)
    delete params.reason
    const vp = _.clone(valid_params)
    vp.reason = ''
    const req = new MockExpressReq({ params })

    expect(leave_request_validator({ req }).as_data_object()).to.be.eql(vp)

    expect(req.session).not.to.have.property('flash')
  })
})
