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
  acronym: 'SL',
  /**
   * Description for this integration which is displayed in the Polarity integrations user interface
   *
   * @type String
   * @optional
   */
  description:
    'The Sumo Logic Search Job API provides third-party scripts and applications access to your log data through access key/access ID authentication. The API follows Representational State Transfer (REST) patterns and is optimized for ease of use and consistency',
  entityTypes: ['IPv4', 'IPv6', 'domain', 'url', 'SHA256'],
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
    // Relative paths are relative to the UrlScan integration's root directory
    cert: '',
    // Provide the path to your private key. Leave an empty string to ignore this option.
    // Relative paths are relative to the UrlScan integration's root directory
    key: '',
    // Provide the key passphrase if required.  Leave an empty string to ignore this option.
    // Relative paths are relative to the UrlScan integration's root directory
    passphrase: '',
    // Provide the Certificate Authority. Leave an empty string to ignore this option.
    // Relative paths are relative to the UrlScan integration's root directory
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
      description: 'A valid Sumo Logic access id. ',
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
      key: 'query',
      name: 'query',
      description: 'query for messages',
      default: '_sourceName =* and {{entity}}',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'from',
      name: 'Search Start Date',
      description:
        'The ISO 8601 date and time of the time range to start the search. Use the form YYYY-MM-DDTHH:mm:ss, or 2017-07-16T00:00:00.',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'to',
      name: 'Search End Date',
      description:
        'The ISO 8601 date and time of the time range to end the search. Use the form YYYY-MM-DDTHH:mm:ss, or 2017-07-16T00:00:00.',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'timeZone',
      name: 'Time zone for log search parameters',
      description: 'Timezone for logs, e.g. "PST"',
      default: '',
      type: 'text',
      userCanEdit: false,
      adminOnly: false
    },
    {
      key: 'byReceiptTime',
      name: 'Search By Receipt Time',
      description:
        'Define as true to run the search using receipt time. By default, searches do not run by receipt time.',
      default: '',
      type: 'boolean',
      userCanEdit: false,
      adminOnly: false
    }
  ]
};
