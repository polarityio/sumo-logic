polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  activeTab: 'displayMessages',
  actions: {
    changeTab: function (tabName) {
      this.set('activeTab', tabName);
    },
    // makeRequest: function () {
    //   const payload = {
    //     type: 'makeRequest', 
    //     action: 'Button Clicked'
    //   }

    //   this.sendIntegrationMessage(payload).then((res) => {
    //     this.set("")
    //   })
    // }
  }
});
