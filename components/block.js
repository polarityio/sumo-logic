'use strict';

polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  onDetailsOpened() {
    this.get('block.data.details.messages').forEach((result, index) => {
      Ember.set(result, 'showFields', false);
      Ember.set(result, 'showMessages', true);
    });
  },
  actions: {
    showFields: function (index) {
      this.set('block.data.details.messages.' + index + '.showMessages', false);
      this.set('block.data.details.messages.' + index + '.showFields', true);
    },
    showMessages: function (index) {
      this.set('block.data.details.messages.' + index + '.showMessages', true);
      this.set('block.data.details.messages.' + index + '.showFields', false);
    }
  }
});
