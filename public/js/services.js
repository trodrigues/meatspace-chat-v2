var $ = require('jquery');
var Waypoint = require('waypoints');
var socket = io();
var moment = require('moment');

var comment = $('#comment');
var messages = $('#messages');
var messagesFiltered = $('#messages-filtered');

var MAX_LIMIT = 20;

exports.sendMessage = function (profile, rtc, next) {
  rtc.recordVideo(function (err, frames) {
    if (!err) {
      if (window.ga) {
        window.ga('send', 'event', 'message', 'send');
      }

      socket.emit('message', JSON.stringify({
        message: comment.val(),
        media: frames,
        ip: profile.ip,
        fingerprint: profile.fingerprint
      }));
    }

    submitting = false;
    comment.val('');
    next(submitting);
  });
};

exports.getMessage = function (data, mutedFP, filteredFP, profile, messages) {
  if (window.ga) {
    window.ga('send', 'event', 'message', 'receive');
  }

  if (!mutedFP[data.fingerprint]) {
    var li = $('<li data-fp="' + data.fingerprint + '"></li>');
    var video = $('<video src="' + data.media + '", autoplay="autoplay", loop></video>');
    var p = $('<p></p>');
    var userControls = '';

    if (data.fingerprint !== profile.md5) {
      userControls = '<button class="mute">mute</button>';

      if (filteredFP[data.fingerprint]) {
        userControls += '<button class="unfilter">unfilter</button>';
      } else {
        userControls += '<button class="filter">filter</button>';
      }
    }
    
    var created = moment(new Date(data.created));
    var time = $('<time datetime="' + created.toISOString() + '" class="timestamp">' + created.format('LT') + '</time>');

    var actions = $('<div class="actions">' + userControls +'</div>');
    p.html(data.message);
    li.append(video).append(p).append(actions);
    messages.append(li);
    p.append(time);

    if (filteredFP[data.fingerprint] || data.fingerprint === profile.md5) {
      var liFiltered = li.clone();
      messagesFiltered.append(liFiltered);

      var childrenFiltered = messagesFiltered.find('li');
       if (childrenFiltered.length > MAX_LIMIT) {
        childrenFiltered.slice(0, childrenFiltered.length - MAX_LIMIT).remove();
      }
    }

    var children = messages.find('li');

    var waypoints = [];

    waypoints.push(new Waypoint({
      element: li[0],
      handler: function (direction) {
        $(this.element).toggleClass('in-view', direction === 'up');
      },
      offset: function () {
        return -$(this.element).outerHeight();
      }
    }));

    waypoints.push(new Waypoint({
      element: li[0],
      handler: function (direction) {
        $(this.element).toggleClass('in-view', direction === 'down');
      },
      offset: '100%'
    }));

    li.data('waypoints', waypoints);

    var last = messages[0].lastChild;
    var bottom = last ? last.getBoundingClientRect().bottom : 0;
    var follow = bottom < 777;

    if (follow) {
      if (children.length > MAX_LIMIT) {
        children.slice(0, children.length - MAX_LIMIT).each(function () {
          $(this).data('waypoints').forEach(function (waypoint) {
            waypoint.destroy();
          });
        }).remove();
      }

      li[0].scrollIntoView();
    }
  }
};
