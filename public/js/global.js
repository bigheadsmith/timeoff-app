/*
 * Book Leave request pop-up window.
 *
 * */
$(document).ready(function() {
  /*
   *  When FROM field in New absense form changes: update TO one if necessary
   */
  $('input.book-leave-from-input').on('change', function(e) {
    e.stopPropagation()

    const from_date = $('input.book-leave-from-input').datepicker('getDate')

    if (!from_date) {
      // no new value for FROM part, do nothing
      console.log('No from date')
      return
    }

    const to_date = $('input.book-leave-to-input').datepicker('getDate')

    if (!to_date || (to_date && to_date.getTime() < from_date.getTime())) {
      $('input.book-leave-to-input').datepicker(
        'setDate',
        $('input.book-leave-from-input').datepicker('getFormattedDate')
      )
    }
  })
})

/*
 * Bootstrap-datepicker
 *
 * */
!(function(a) {
  a.fn.datepicker.dates['en-GB'] = {
    days: [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ],
    monthsShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ],
    today: 'Today',
    monthsTitle: 'Months',
    clear: 'Clear',
    weekStart: 1,
    format: 'dd/mm/yyyy'
  }
})(jQuery)

$(function() {
  $('[data-toggle="tooltip"]').tooltip()
})

$(function() {
  $('[data-toggle="popover"]').popover()
})

/*
 * This is handler for invocation of "add secondary supervisors" modal
 *
 * */

$('#add_secondary_supervisers_modal').on('show.bs.modal', function(event) {
  const button = $(event.relatedTarget)
  const department_name = button.data('department_name')
  const department_id = button.data('department_id')

  const modal = $(this)

  modal.find('.modal-title strong').text(department_name)

  // Make modal window to be no hiegher then window and its content
  // scrollable
  $('.modal .modal-body').css('overflow-y', 'auto')
  $('.modal .modal-body').css('max-height', $(window).height() * 0.7)

  $(this)
    .find('.modal-body')
    // Show "loading" icon while content of modal is loaded
    .html(
      '<p class="text-center"><i class="fa fa-refresh fa-spin fa-3x fa-fw"></i><span class="sr-only">Loading...</span></p>'
    )
    .load('/settings/departments/available-supervisors/' + department_id + '/')
})

/*
 *  Given URL string return its query paramters as object.
 *
 *  If URL is not provided location of current page is used.
 * */

function getUrlVars(url) {
  if (!url) {
    url = window.location.href
  }
  const vars = {}
  let hash
  const hashes = url.slice(url.indexOf('?') + 1).split('&')
  for (let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=')
    vars[hash[0]] = hash[1]
  }
  return vars
}

/*
 * Evend that is fired when user change base date (current month) on Team View page.
 *
 * */

$(document).ready(function() {
  $('#team_view_month_select_btn')
    .datepicker()
    .on('changeDate', function(e) {
      const url = $(e.currentTarget).data('tom')

      const form = document.createElement('form')
      form.method = 'GET'
      form.action = url

      const url_params = getUrlVars(url)
      url_params.date = e.format('yyyy-mm')

      // Move query parameters into the form
      $.each(url_params, function(key, val) {
        const inp = document.createElement('input')
        inp.name = key
        inp.value = val
        inp.type = 'hidden'
        form.appendChild(inp)
      })

      document.body.appendChild(form)

      return form.submit()
    })
})

$(document).ready(function() {
  $('[data-tom-color-picker] a').on('click', function(e) {
    e.stopPropagation()

    // Close dropdown
    $(e.target)
      .closest('.dropdown-menu')
      .dropdown('toggle')

    const new_class_name = $(e.target).data('tom-color-picker-css-class')

    // Ensure newly selected color is on triggering element
    $(e.target)
      .closest('[data-tom-color-picker]')
      .find('button.dropdown-toggle')
      .attr('class', function(idx, c) {
        return c.replace(/leave_type_color_\d+/g, '')
      })
      .addClass(new_class_name)

    // Capture newly picked up color in hidden input for submission
    $(e.target)
      .closest('[data-tom-color-picker]')
      .find('input[type="hidden"]')
      .attr('value', new_class_name)

    return false
  })
})

$(document).ready(function() {
  $('.user-details-summary-trigger').popover({
    title: 'Employee summary',
    html: true,
    trigger: 'hover',
    placement: 'auto',
    delay: { show: 1000, hide: 10 },
    content: function() {
      const divId = 'tmp-id-' + $.now()
      return detailsInPopup($(this).attr('data-user-id'), divId)
    }
  })

  function detailsInPopup(user_id, divId) {
    $.ajax({
      url: '/users/summary/' + user_id + '/',
      success: function(response) {
        $('#' + divId).html(response)
      }
    })

    return '<div id="' + divId + '">Loading...</div>'
  }
})

$(document).ready(function() {
  $('.leave-details-summary-trigger').popover({
    title: 'Leave summary',
    html: true,
    trigger: 'hover',
    placement: 'auto',
    delay: { show: 1000, hide: 10 },
    content: function() {
      const leaveId = $(this).attr('data-leave-id')
      console.log('leave id: ', leaveId)
      const divId = 'tmp-id-' + $.now()
      return detailsInPopup(leaveId, divId)
    }
  })

  function detailsInPopup(leaveId, divId) {
    console.log('Fetching details for Leave ID:', leaveId) // Log the leave ID before making the AJAX request

    $.ajax({
      url: '/calendar/leave-summary/' + leaveId + '/',
      success: function(response) {
        console.log('Received response for Leave ID:', leaveId) // Log the leave ID after receiving the response
        $('#' + divId).html(response)
      }
    })
    return '<div id="' + divId + '">Loading...</div>'
  }
})

$(document).ready(function() {
  const fetchNotifications = () => {
    if (typeof $.ajax === 'function') {
      $.ajax({
        url: '/api/v1/notifications/',
        success: function(args) {
          const error = args.error
          const data = args.data

          if (error) {
            console.log('Failed to fetch notifications')
            return
          }

          const dropDown = $('#header-notification-dropdown ul.dropdown-menu')
          const badge = $('#header-notification-dropdown .notification-badge')

          if (!data || !data.length) {
            badge.addClass('hidden')
            dropDown.empty()
            dropDown.append('<li class="dropdown-header">No notifications</li>')

            document.title = document.title.replace(/\(\d+\)\s*/, '')

            return
          }

          const numberOfNotifications = data
            .map(function(d) {
              return d.numberOfRequests
            })
            .reduce(function(acc, it) {
              return acc + it
            }, 0)

          badge.removeClass('hidden').html(numberOfNotifications)

          if (!document.title.startsWith('(')) {
            document.title = '(' + numberOfNotifications + ') ' + document.title
          } else {
            document.title = document.title.replace(
              /\(\d+\)/,
              '(' + numberOfNotifications + ')'
            )
          }

          dropDown.empty()

          for (let i = 0; i < data.length; i++) {
            const notification = data[i]
            dropDown.append(
              '<li><a href="' +
                notification.link +
                '">' +
                notification.label +
                '</a></li>'
            )
          }
        }
      })
    }

    setTimeout(fetchNotifications, 30 * 1000)
  }

  fetchNotifications()
})

/**
 * Prevent for double submission.
 */
$(document).ready(function() {
  $('.single-click').on('click', function(e) {
    const form = $(e.target).closest('form')

    // Ensure "required" fields are populated
    let formIsValid = true
    $(form)
      .find('[required]')
      .each(function(el) {
        formIsValid = formIsValid && !!el.val()
      })
    if (formIsValid) {
      e.stopPropagation()
    } else {
      return
    }

    $(e.target).prop('disabled', true)

    const submitName = $(e.target).attr('name')
    if (submitName !== undefined) {
      $('<input>')
        .attr({ type: 'hidden', name: submitName, value: '1' })
        .appendTo(form)
    }
    form.submit()

    return false
  })
})
