window.TrelloPowerUp.initialize({
  'card-buttons': function (t) {
    return [{
      icon: 'https://trello-subtask-manager.netlify.app/logo.png',
      text: 'Add Subtask',
      callback: function (t) {
        return t.popup({
          title: 'Add Subtask',
          url: 'subtask-picker.html',
          height: 100
        });
      }
    }];
  },

  'card-back-section': function (t) {
    return {
      title: 'Subtasks',
      icon: 'https://trello-subtask-manager.netlify.app/logo.png',
      content: {
        type: 'iframe',
        url: t.signUrl('subtask-section.html'),
        height: 180
      }
    };
  }
});
