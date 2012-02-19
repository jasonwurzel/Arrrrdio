var Templates = require('templates');

App = {
  Models: {},
  Views: {},
  Types: {
    albums: 'a',
    artists: 'r',
    tracks: 't'
  },

  loggedIn: function() {
    return typeof currentUser != 'undefined';
  }
};

Handlebars.registerHelper('get', function(attr) {
  return this.get(attr);
});

Handlebars.registerHelper('json', function(obj) {
  if(_(obj).isFunction())
    var json = obj.call(this);
  else
    var json = obj;
  return JSON.stringify(json);
});

App.Router = Backbone.Router.extend({
  routes: {
    '': 'root',
    'search/:query': 'search',
    'profile': 'profile',
    'albums/:id': 'album'
  },

  root: function() {
    if(App.loggedIn())
      this._renderUserHeavyRotation();
    else {
      var topCharts = new App.TopCharts();
      topCharts.fetch({
        success: function(resp) {
          new App.Views.TopCharts({
            tracks: resp
          });
        }
      });
    }
  },

  search: function(query) {
    var results = new App.SearchResults([], { query: query });
    results.fetch({
      success: function(resp) {
        new App.Views.SearchResults({
          results: resp
        });
      }
    });
  },

  album: function(id) {
    var album = new App.Album({id: id});
    album.fetch({
      success: function(album, response) {
        new App.Views.Album({
          album: album
        });
      }
    });
  },

  profile: function() {
    new App.Views.Profile({
      user: App.currentUser
    });
  },

  _renderUserHeavyRotation: function() {
    var albums =  new App.UsersHeavyRotation();
    albums.fetch({
      success: function(albums, resp) {
        new App.Views.Albums({
          albums: albums
        });
      }
    });
  }
});

App.Artist = Backbone.Model.extend({});
App.Track = Backbone.Model.extend({});
App.Album = Backbone.Model.extend({
  urlRoot: '/albums',

  initialize: function() {
    this.bind('change', this.onChange);
  },

  onChange: function() {
    this.tracks = this.get('tracks');
  }
});

App.User = Backbone.Model.extend({});

App.SearchResults = Backbone.Collection.extend({
  url: function() {
    return '/search/' + this.options.query;
  },

  parse: function(resp) {
    console.log('hi', resp);
    return resp.results;
  },

  initialize: function(models, options) {
    this.options = options;
    this.on('reset', this.onReset);
  },

  onReset: function() {
    var keys = _(App.Types).keys();
    var values = _(App.Types).values();
    this.each(function(model, i) {
      var category = keys[values.indexOf(model.get('type'))];
      this[category] || (this[category] = []); 
      this[category].push(model);
    }.bind(this));
  }
});

App.TopCharts = Backbone.Collection.extend({
  model: App.Track,
  url: '/top_charts'
});

App.Albums = Backbone.Collection.extend({ model: App.Album });
App.UsersHeavyRotation = App.Albums.extend({
  url: function() {
    return '/users/' + App.currentUser.get('key');
  }
});

App.Views.Application = Backbone.View.extend({
  el: 'body',
  userTemplate: Templates['user.html'],
  userTemplateEl: '#info',

  events: {
    'submit #search_form': 'onSearch',
    'click .play.btn': 'playTrack'
  },

  initialize: function() {
    App.player = new App.Views.Player();
    this.updateUserInfo();
    App.currentUser.bind('change', this.updateUserInfo.bind(this));
  },

  onSearch: function(e) {
    e.preventDefault();
    App.router.navigate('search/' + $(e.target).find('input').val(), true);
  },

  updateUserInfo: function(user) {
    console.log('args', arguments);
    var template = Handlebars.compile(this.userTemplate);
    $(this.userTemplateEl).html(
      template(App.currentUser)
    );
    if(user)
      new App.Views.Notification({
        message: "Your info has been updated!"
      });
  },

  playTrack: function(e) {
    var track = $(e.target).data('track') || $(e.target).parents('a').data('track');
    App.player.play(track);
  }
});

App.Views.Albums = Backbone.View.extend({
  el: '#body',
  template: Templates['albums.html'],
  title: 'You Seem to Like These',
    
  initialize: function() {
    this.albums = this.options.albums.models;
    this.render();
  },

  render: function() {
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this)
    );
  }
});

App.Views.SearchResults = Backbone.View.extend({
  el: '#body',
  template: Templates['search.html'],

  initialize: function() {
    this.results = this.options.results;
    this.render();
  },

  render: function() {
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this)
    );
  }
});

App.Views.TopCharts = Backbone.View.extend({
  el: '#body',
  template: Templates['top_charts.html'],

  events: {
    'click .play[data-track]': 'playTrack'
  },
  
  initialize: function() {
    this.tracks = this.options.tracks.models;
    this.render();
  },

  render: function() {
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this)
    );
  },

  playTrack: function(e) {
    var track = $(e.target).parents('a').data('track');
    App.player.play(track);
  }
});

App.Views.Album = Backbone.View.extend({
  el: '#body',
  template: Templates['album.html'],

  initialize: function() {
    this.album = this.options.album;
    this.render();
  },

  render: function() {
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this)
    );
  }
});

App.Views.Profile = Backbone.View.extend({
  el: '#body',
  template: Templates['profile.html'],

  events: {
    'submit form': 'onSubmit'
  },

  initialize: function() {
    this.user = this.options.user;
    this.render();
  },

  render: function() {
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this)
    );
  },

  onSubmit: function(e) {
    App.currentUser.set($(e.target).serialize(true));
    e.preventDefault();
  }
});

App.Views.Notification = Backbone.View.extend({
  id: 'alert',

  initialize: function() {
    this.render();
  },

  render: function() {
    this.$el.html(this.options.message).appendTo('body');
    _(this.remove).chain().bind(this).delay(5000);
  },

  remove: function() {
    this.$el.slideUp(function() {
      $(this).remove();
    });
  }
});

App.Views.Player = Backbone.View.extend({
  swfUrl: 'http://www.rdio.com/api/swf/',
  el: '#player_container',
  template: Templates['player.html'],

  events: {
    'click #player_ui .stop': 'pause',
    'click #player_ui .play': 'play'
  },

  initialize: function() {
    this.renderedSWF = false;
    this.render();
    this.track = new App.Track();
    this.track.bind('change:name', this.render.bind(this));
    this.track.bind('change:position', this.changedPosition.bind(this));
  },

  play: function(track) {
    console.log('track is', track);
    if(track && track.key) {
      this.track.set(track);
      console.log(this.track);
      this.player.rdio_play(track.key);
    }
    else //resume
      this.player.rdio_play();
  },

  stop: function() {
    console.log('stop');
    this.player.rdio_stop();
  },

  pause: function() {
    console.log('pause');
    this.player.rdio_pause();
  },

  render: function() {
    console.log('RENDERING', this.track);
    if(!this.renderedSWF) {
      console.log('rendering swf');
      swfobject.embedSWF(this.swfUrl, 'player', '1', '1', '9.0.0','', App.Views.Player.flashvars, App.Views.Player.params);
      this.renderedSWF = true;
    }
    var template = Handlebars.compile(this.template);
    this.$el.html(
      template(this) 
    );
  },

  changedPosition: function() {
    this.$el.find('.meter').width(
      (this.track.get('position') / this.track.get('duration')) * 100 + "%"
    );
  },

	ready: function() {
    console.log('readyyyy');
		this.player = document.getElementById("player");
	},

	playStateChanged: function(state) {
    console.log(state);
	},

  playingTrackChanged: function() {
    console.log('changed', arguments);
  },

  positionChanged: function(position) {
    App.player.track.set({position: position});
  }
}, 
{
  flashvars: {
    playbackToken: playbackToken,
    domain: encodeURIComponent(document.domain),
    listener: 'App.Views.Player.prototype'
  },

  params: {
    'allowScriptAccess': 'always'
  }
});

$(function() {
  App.currentUser = new App.User(window.currentUser || {});
  new App.Views.Application({});
  App.router = new App.Router();
  Backbone.history.start();
});

$.fn.serialize = (function(oldSerialize) {
  return function(toHash) {
    var params = {};
    if(toHash)
      return _($(this).serializeArray()).inject(function(acc, obj) {
        acc[obj.name] = obj.value;
        return acc;
      }, {});
    else
      return oldSerialize.apply(this, arguments);
  };
})($.fn.serialize);


Groupon = {};
Groupon.refreshCSS = function() {
  var i,a,s;
  a=document.getElementsByTagName('link');
  for(i=0;i<a.length;i++){
    s=a[i];
    if(s.rel.toLowerCase().indexOf('stylesheet')>=0&&s.href) {
      var h=s.href.replace(/(&|%5C?)forceReload=\d+/,'');
      s.href=h+(h.indexOf('?')>=0?'&':'?')+'forceReload='+(new Date().valueOf());
    }
  }
};
//start sass watch command like this
//sass --watch public/stylesheets/sass:public/stylesheets --load-path public/stylesheets/sass --load-path public/stylesheets/sass/base --load-path --load-path public/stylesheets/sass/base --load-path public/stylesheets/sass/app/shared --debug-info --require ./lib/sass_extensions.rb --require ./lib/asset_fingerprint_cache.rb

$(document).bind('focus', function(e){
 Groupon.refreshCSS();
});
//
$(document).bind('keydown', function(e){
// // mapped to ctrl + R, but feel free to change it if you want
 if(e.keyCode == 82 && e.ctrlKey)
  Groupon.refreshCSS();
});

