'use strict';

var hex = hex || {};

hex.winner = (function dataSimulator(d3, Rx) {
  Rx.Observable.fromEvent(d3.select('#winners').node(), 'click').tap(function() {
    pickWinners();
    stageWinners();
  }).subscribeOnError(hex.ui.errorObserver);

  // Returns a random integer between min included) and max (excluded)
  var getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  };

  var winners = [];

  var isAllowedToWin = function(point) {
    if ( ! (point.sketch && point.sketch.length > 0) ) {
      return false;
    }
    var sketch = point.sketch[point.sketch.length - 1];
    if (!sketch.cuid) {
      console.log('Sketch has no cuid:', sketch);
      return false;
    }
    var alreadyWinner = winners.some(function(winner) {
      var winnerSketch = winner.sketch[winner.sketch.length - 1];
      return 'cuid' in winnerSketch && winnerSketch.cuid === sketch.cuid;
    });
    return ! alreadyWinner;
  };

  var pickWinner = function(index) {
    if (arguments.length === 0) {
      var highlightedHexagon = hex.highlight.getHighlightedHexagon();
      if (!highlightedHexagon) {
        return;
      }
      else index = highlightedHexagon.datum().id;
    }
    if (winners.length >= 10) {
      return;
    }
    if (winners.some(function(point) { return point.id === index })) {
      console.log('Doodle ', index, ' already a winner');
      return;
    }
    console.log('picking winner', index);
    var winner = hex.ui.points[index];
    if (!winner.sketch) {
      return;
    };
    winners.push(winner);
    stageWinner(winner, winners.length - 1);
  };

  var pickWinners = function() {
    var numWinners = 10;
    var candidates = hex.ui.points.filter(function(point) {
      return point.sketch;
    });

    d3.range(numWinners - winners.length).map(function(currentValue, index) {
      if (candidates.length === 0) {
        return;
      };
      var index = getRandomInt(0, candidates.length);
      winners.push(candidates[index]);
      candidates = candidates.filter(function(point) {
        return isAllowedToWin(point);
      });
    });
  };

  var stageSpots = d3.range(10).map(function(spot, index) {
    return {
      x: (Math.floor(index / 5) * 2 - 1) * (hex.ui.honeycomb.dimensions.x / 2 + 50) + hex.ui.content.x/2
    , y: hex.ui.content.y / 2 + 10 * hex.ui.honeycomb.spacing.y / 2 * (index % 5 - 2)
    }
  });

  var winnerSpots = d3.range(10).map(function(spot, index) {
    var c = {x: hex.ui.content.x / 2, y: hex.ui.content.y / 2}
      , delta = {x: hex.ui.honeycomb.dimensions.x/4, y: hex.ui.honeycomb.dimensions.y/3.5}
      , offset = {x: 0, y: 0}  // an adjustment to make room for the names

    if (index <= 2) {
      return {
        x: c.x + (index - 1) * delta.x,
        y: c.y + (Math.floor(index / 3) - 1 + offset.y) * delta.y
      };
    } else if (index <= 6) {
      return {
        x: c.x + (index - 4.5) * delta.x,
        y: c.y + offset.y * delta.y
      };
    } else {
      return {
        x: c.x + (index - 8) * delta.x,
        y: c.y + (Math.floor((index - 1) / 3) - 1 + offset.y) * delta.y
      };
    }
  });

  var stageWinners = function() {
    winners.forEach(function(p, index) {
      if (p) {
        stageWinner(p, index);
      }
    });
  }

  var displayWinners = function() {
    winners.forEach(function(p, index) {
      if (p) {
        displayWinner(p, index);
      }
    });
    logWinners(winners);
  }

  var logWinners = function(winners) {
    var winningSketches = winners.map(function(winner) {
      return winner.sketch[winner.sketch.length - 1];
    })
    var data = JSON.stringify(winningSketches);
    console.log(data);
    var xhr = d3.xhr('/api/winners');
    xhr.header('Content-Type', 'application/json');
    xhr.send('PUT', data, function(err, res) {
      console.log('winningSketches logged');
      console.log(err || res);
    });
  }

  var stageWinner = function(p, index) {
    animateWinner(p, p, stageSpots[index], 1, 2.5, false, function() {
      if (winners.length === 10 && index === 9) {
        hex.ui.dispose();
        hex.controls.dispose();
        hex.highlight.unhighlight();
        displayWinners();
      }
    });
  }

  var displayWinner = function(p, index) {
    animateWinner(p, stageSpots[index], winnerSpots[index], 1, 6.5, false);
    var sketch = p.sketch[p.sketch.length - 1];
    console.log('Winner name:', sketch.name, 'cuid:', sketch.cuid, 'submission:', sketch.submissionId, 'sketch:', sketch.url);
  }

  var animateWinner = function(p, p0, p1, zoom1, zoom2, shownames, cb) {
    var duration = 1000;
    var sketch = p.sketch[p.sketch.length - 1];
    var spaceIndex = sketch.name.indexOf(' ');
    sketch.firstname = sketch.name.substring(0,spaceIndex);
    sketch.lastname = sketch.name.substring(spaceIndex+1);
    var sketchId = hex.ui.createSketchId(p);

    if (!p.group) {
      p.group = hex.ui.svg.insert('g')
        .attr('class', 'winner')
        .attr('transform', function(d) { return 'translate(' + p0.x + ',' + p0.y + ')'; });

      p.group.insert('path')
        .attr('class', 'hexagon')
        .attr('d', 'm' + hex.ui.hexagon(hex.ui.honeycomb.size).join('l') + 'z')
        .attr('fill', 'url(#' + sketchId + ')')
        .attr('transform', 'matrix('+zoom1+', 0, 0, '+zoom1+', 0, 0)');
    }

    if (shownames) {
      var textWidth = hex.ui.honeycomb.size * 3.5
        , textHeight = hex.ui.honeycomb.size * 1.3;
      var textGroup = p.group.insert('g')
        .attr('class', 'text')
        .attr('transform', 'matrix('+1/zoom1+', 0, 0, '+1/zoom1+', 0, '+ hex.ui.honeycomb.size/zoom1 * 1.5 +')')
      textGroup.insert('rect')
        .attr('width', textWidth)
        .attr('height', textHeight)
        .attr('x', -textWidth / 2)
        .attr('y', -hex.ui.honeycomb.size / 2.2)
        .attr('rx', 3)
        .attr('ry', 3);

      textGroup.insert('text')
        .attr('class', 'firstname')
        .attr('text-anchor', 'middle')
        .text(sketch.firstname);

      textGroup.insert('text')
        .attr('class', 'lastname')
        .attr('text-anchor', 'middle')
        .attr('y', hex.ui.honeycomb.size / 1.5)
        .text(sketch.lastname);
    }

    p.group.transition()
      .duration(duration)
      .ease('quad-out')
      .attr('transform', 'matrix('+zoom2+', 0, 0, '+zoom2+', '+ p1.x +', '+ p1.y +')')
      .each('end', function() {
        if (cb) {
          cb();
        }
      });
  }

  return {
    pickWinner: pickWinner
  , isAllowedToWin: isAllowedToWin
  }
})(d3, Rx);
