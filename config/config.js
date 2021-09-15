module.exports = {
  /**
   * Name of the integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @required
   */
  name: 'Sumo Logic',
  /*
   * The acronym that appears in the notification window when information from this integration
   * is displayed.  Note that the acronym is included as part of each "tag" in the summary information
   * for the integration.  As a result, it is best to keep it to 4 or less characters.  The casing used
   * here will be carried forward into the notification window.
   *
   * @type String
   * @required
   */
  acronym: 'SUMO',
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description:
    'The Sumo Logic Search Job API provides third-party scripts and applications access to your log data through access key/access ID authentication.',
  entityTypes: ['IPv4', 'IPv6', 'domain', 'url', 'hash', 'email', 'cve'],
  onDemandOnly: true,
  defaultColor: 'light-gray', //change to light-grey
  /**
   * An array of style files (css or less) that will be included for your integration. Any styles specified in
   * the below files can be used in your custom template.
   *
   * @type Array
   * @optional
   */
  styles: ['./styles/styles.less'],
  /**
   * Provide custom component logic and template for rendering the integration details block.  If you do not
   * provide a custom template and/or component then the integration will display data as a table of key value
   * pairs.
   *
   * @type Object
   * @optional
   */
  block: {
    component: {
      file: './components/block.js'
    },
    template: {
      file: './templates/block.hbs'
    }
  },
  request: {
    // Provide the path to your certFile. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the integration's root directory
    ca: '',
    // An HTTP proxy to be used. Supports proxy Auth with Basic Auth, identical to support for
    // the url parameter (by embedding the auth info in the uri)
    proxy: '',

    rejectUnauthorized: true
  },
  logging: {
    level: 'info' //trace, debug, info, warn, error, fatal
  },
  options: [
    {
      key: 'accessId',
      name: 'Access Id',
      description: 'A valid Sumo Logic access id.',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'accessKey',
      name: 'Access Key',
      description: 'A valid Sumo Logic access key',
      default: '',
      type: 'password',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'apiDeployment',
      name: 'Sumo Logic API Deployment Location',
      description: 'Your Sumo Logic deployment endpoint location.  For more information, please see: https://help.sumologic.com/APIs/General-API-Information/Sumo-Logic-Endpoints-and-Firewall-Security',
      default: {
        value: 'us1',
        display: 'US1'
      },
      type: 'select',
      options: [
        {
          value: 'us1',
          display: 'US1'
        },
        {
          value: 'us2',
          display: 'US2'
        },
        {
          value: 'au',
          display: 'AU'
        },
        {
          value: 'ca',
          display: 'CA'
        },
        {
          value: 'de',
          display: 'DE'
        },
        {
          value: 'eu',
          display: 'EU'
        },
        {
          value: 'fed',
          display: 'FED'
        },
        {
          value: 'in',
          display: 'IN'
        },
        {
          value: 'jp',
          display: 'JP'
        }
      ],
      multiple: false,
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'query',
      name: 'query',
      description:
        'The search expression.',
      default: '_sourceName=* "{{entity}}" | LIMIT 10',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'timeRange',
      name: 'Search Window',
      description: 'The search window for your search.',
      default: {
        value: '-3m',
        display: 'Last 3 Months'
      },
      type: 'select',
      options: [
        {
          value: '-1d',
          display: 'Last Day'
        },
        {
          value: '-1w',
          display: 'Last Week'
        },
        {
          value: '-1m',
          display: 'Last Month'
        },
        {
          value: '-3m',
          display: 'Last 3 Months'
        },
        {
          value: '-6m',
          display: 'Last 6 Months'
        },
        {
          value: '-1y',
          display: 'Last Year'
        },
        {
          value: '-3y',
          display: 'Last 3 Years'
        }
      ],
      multiple: false,
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'timeZone',
      name: 'Time zone for log search parameters',
      description: `The time zone to be used for the search. See this Wikipedia article - https://en.wikipedia.org/wiki/List_of_tz_database_time_zones, for a list of valid time zone codes.`,
      default: 'EST',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'byReceiptTime',
      name: 'Search By Receipt Time',
      description:
        'Define as true to run the search using receipt time which is the order that Collectors received the messages. By default, searches do not run by receipt time.',
      default: false,
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    }
  ]
};
