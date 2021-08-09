'use strict';

polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  onDetailsOpened() {
    this.get('block.data.details.messages').forEach((result, index) => {
      this._initFields(index);
      Ember.set(result, 'showFields', true);
      Ember.set(result, 'showMessages', false);
    });
  },
  actions: {
    showFields: function (index) {
      this.set('block.data.details.messages.' + index + '.showMessages', false);
      this.set('block.data.details.messages.' + index + '.showFields', true);
      this.set('block.data.details.messages.' + index + '.showJson', false);
    },
    showMessages: function (index) {
      this.set('block.data.details.messages.' + index + '.showMessages', true);
      this.set('block.data.details.messages.' + index + '.showFields', false);
      this.set('block.data.details.messages.' + index + '.showJson', false);
    }
  },
  _initFields(index) {
    const _source = this.get('block.data.details.messages.' + index + '.result');
    const fields = [];
    for (let key in _source) {
      if (!key.startsWith('_')) {
        fields.push({ key: key, value: _source[key] });
      }
    }
    this.set('block.data.details.messages.' + index + '.fields', fields);
  },
  _initSource(index) {
    if (
      typeof this.get('block.data.details.messages.' + index + '.sourceStringified') ===
      'undefined'
    ) {
      const _source = this.get('block.data.details.messages.' + index + '.result');
      const _sourceStringified = {};
      Object.entries(_source).forEach(([key, value]) => {
        if (
          typeof value === 'object' &&
          value !== null &&
          Array.isArray(value) === false
        ) {
          _sourceStringified[key] = JSON.stringify(value, null, 0);
        } else {
          _sourceStringified[key] = value;
        }
      });
      this.set(
        'block.data.details.messages.' + index + '.sourceStringified',
        _sourceStringified
      );
    }
  },
  syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  }
});
