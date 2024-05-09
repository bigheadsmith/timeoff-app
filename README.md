# TimeOff.Management

Web application for managing employee absences.

<a href="https://travis-ci.org/timeoff-management/timeoff-management-application"><img align="right" src="https://travis-ci.org/timeoff-management/timeoff-management-application.svg?branch=master" alt="Build status" /></a>

## Features

**Multiple views of staff absences**

Calendar view, Team view, or Just plain list.

**Tune application to fit into your company policy**

Add custom absence types: Sickness, Maternity, Working from home, Birthday etc. Define if each uses vacation allowance.

Optionally limit the amount of days employees can take for each Leave type. E.g. no more than 10 Sick days per year.

Setup public holidays as well as company specific days off.

Group employees by departments: bring your organisational structure, set the supervisor for every department.

Customisable working schedule for company and individuals.

**Third Party Calendar Integration**

Broadcast employee whereabouts into external calendar providers: MS Outlook, Google Calendar, and iCal.

Create calendar feeds for individuals, departments or entire company.

**Three Steps Workflow**

Employee requests time off or revokes existing one.

Supervisor gets email notification and decides about upcoming employee absence.

Absence is accounted. Peers are informed via team view or calendar feeds.

**Access control**

There are following types of users: employees, supervisors, and administrators.

Optional LDAP authentication: configure application to use your LDAP server for user authentication.

**Ability to extract leave data into CSV**

Ability to back up entire company leave data into CSV file. So it could be used in any spreadsheet applications.

**Works on mobile phones**

The most used customer paths are mobile friendly:

- employee is able to request new leave from mobile device

- supervisor is able to record decision from the mobile as well.

**Lots of other little things that would make life easier**

Manually adjust employee allowances
e.g. employee has extra day in lieu.

Upon creation employee receives pro-rated vacation allowance, depending on start date.

Email notification to all involved parties.

Optionally allow employees to see the time off information of entire company regardless of department structure.

## Screenshots

![TimeOff.Management Screenshot](https://raw.githubusercontent.com/timeoff-management/application/master/public/img/readme_screenshot.png)

## Installation

### Cloud hosting

Visit http://timeoff.management/

Create company account and use cloud based version.

### Docker Compose

Clone the repository
```bash
git clone https://github.com/bigheadsmith/timeoff-app.git timeoff-app
cd timeoff-app
```

Edit configuration variables inside .env.example and save as .env - environment variables table below
```bash
cp .env.example .env
```

Edit docker-compose-example.yaml and save as docker-compose.yaml
```bash
cp docker-compose-example.yaml docker-compose.yaml
```

Run the project
```bash
docker compose up --build -d
```

### Environment variables

| Variable                  | Description                                                  | Default value   |
| ------------------------- | ------------------------------------------------------------ | --------------- |
| ** APP SETTINGS **        |                                                              |                 |
| NODE_ENV                  | Environment of NodeJs                                        | development     |
| PORT                      | Port of the application                                      | 3000            |
| LOGIN_DEFAULT             | Display the default login form                               | true            |
| BRANDING_URL              | URL of the application                                       | http://app.timeoff.management/ |
| BRANDING_WEBSITE          | URL of the company's website                                 | http://timeoff.management/ |
| HEADER_TITLE              | App title                                                    | Timeoff.Management |
| CONTACT_EMAIL_ADDRESS     | App contact email address                                    | email@ddre.ss   |
| OPTIONS_REGISTRATION      | Allows creation of company account. Set to false after setup | true            |
| CRYPTO_SECRET             | Secret for password hashing                                  | changeme        |
| API_KEY                   |                                                              |                 |
| FORCE_TO_EXPLICITLY_SELECT_TYPE_WHEN_REQUESTING_NEW_LEAVE |                              | false           |
| LOCALE_CODE_FOR_SORTING   |                                                              | en              |
| GOOGLE_ANALYTICS_TRACKER  | Google Analytics tracker code                                |                 |
| ** DATABASE SETTINGS **   |                                                              |                 |
| DB_DATABASE               | Database name                                                | timeoff-db      |
| DB_USER                   | Database username                                            | timeoff-user    |
| DB_PASSWORD               | Database password                                            | changeme        |
| DB_HOST                   | Database hostname, IP or container ID                        | postgres        |
| DB_DIALECT                | Database dialect (sqlite, mysql, postgres)                   | postgres        |
| DB_PORT                   | For external DB access                                       |                 |
| DB_LOGGING                | Logging of queries                                           | false           |
| DB_POOL_MAX               | Maximum number of connection in pool                         | 5               |
| DB_POOL_MIN               | Minimum number of connection in pool                         | 0               |
| DB_POOL_ACQUIRE           | The maximum time, in milliseconds, that pool will try to get connection before throwing error | 60000           |
| DB_POOL_IDLE              | The maximum time, in milliseconds, that a connection can be idle before being released. | 10000           |
| ** EMAIL SETTINGS **      |                                                              |                 |
| SEND_EMAIL                | False=write to email audit but do not send email             | false           |
| SMTP_FROM                 | Sender email                                                 | email@test.com  |
| SMTP_HOST                 | Host of the smtp server                                      | localhost       |
| SMTP_PORT                 | Port of the smtp server                                      | 25              |
| SMTP_REQUIRE_TLS          | Use STARTTLS                                                 | false           |
| SMTP_AUTH_USER            | Username for the smtp server. Leave blank or comment for no auth |             |
| SMTP_AUTH_PASS            | Password for the smtp server                                 |             |
| ** SESSION STORAGE SETTINGS **    |                                                              |                 |
| SESSIONS_SECRET           | Secret for the sessions                                      |                 |
| SESSIONS_STORE            | Storage for the sessions (`sequelize`,`redis`)               | sequelize       |
| SESSIONS_REDIS_HOST       | Redis hostname                                               | localhost       |
| SESSIONS_REDIS_PORT       | Redis port                                                   | 6379            |
| ** SLACK SETTINGS **      |                                                              |                 |
| SLACK_TOKEN               | If set, the Slack token to send message                      |                 |
| SLACK_BOT_NAME            | Name of the bot on Slack                                     |                 |
| SLACK_ICON_URL            | Icon of the bot on Slack                                     |                 |
| ** GOOGLE LOGIN SETTINGS ** |                                                              |                 |
| LOGIN_GOOGLE              | Enable the authentication with Google                        | false           |
| GOOGLE_AUTH_CLIENTID      | Google Auth client ID                                        |                 |
| GOOGLE_AUTH_CLIENTSECRET  | Google Auth client secret                                    |                 |
| GOOGLE_AUTH_DOMAINS       | Allowed domains                                              |                 |


## Run tests

We have quite a wide test coverage, to make sure that the main user paths work as expected.

Please run them frequently while developing the project.

Make sure you have Chrome driver installed in your path and Chrome browser for your platform.

If you want to see the browser execute the interactions prefix with `SHOW_CHROME=1`

```bash
USE_CHROME=1 npm test
```

(make sure that application with default settings is up and running)

Any bug fixes or enhancements should have good test coverage to get them into "master" branch.

## Updating existing instance with new code

In case one needs to patch existing instance of TimeOff.Managenent application with new version:

```bash
git fetch
git pull origin master
npm install
npm run-script db-update
npm start
```

## How to?

There are some customizations available.

## How to amend or extend colours available for colour picker?
Follow instructions on [this page](docs/extend_colors_for_leave_type.md).

## Customization

There are few options to configure an installation.

### Make sorting sensitive to particular locale

Given the software could be installed for company with employees with non-English names there might be a need to
respect the alphabet while sorting customer entered content.

For that purpose the application config file has `locale_code_for_sorting` entry.
By default the value is `en` (English). One can override it with other locales such as `cs`, `fr`, `de` etc.

### Force employees to pick type each time new leave is booked

Some organizations require employees to explicitly pick the type of leave when booking time off. So employee makes a choice rather than relying on default settings.
That reduce number of "mistaken" leaves, which are cancelled after.

In order to force employee to explicitly pick the leave type of the booked time off, change `is_force_to_explicitly_select_type_when_requesting_new_leave`
flag to be `true` in the `config/app.json` file.

## Use Redis as a sessions storage

Follow instructions on [this page](docs/SessionStoreInRedis.md).

## Feedback

Please report any issues or feedback to <a href="https://twitter.com/FreeTimeOffApp">twitter</a> or Email: pavlo at timeoff.management

