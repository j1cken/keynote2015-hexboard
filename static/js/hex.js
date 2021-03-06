'use strict';

var hex = hex || {};

hex.ui = (function dataSimulator(d3, Rx) {
  var errorObserver = function(error) {
    console.error(error.stack || error);
  };

  var firstImage = true;

  var display = {
    x: Math.max(document.documentElement.clientWidth, window.innerWidth) || 1920
  , y: Math.max(document.documentElement.clientHeight, window.innerHeight) - 4 - 39
  };
  var honeycomb = {
    size: 20
  };
  honeycomb.spacing = {
      x: honeycomb.size * 2 * Math.sin(Math.PI*2/3) + .5
    , y: honeycomb.size * (1 + Math.cos(Math.PI/3)) + .5
  };

  honeycomb.dimensions = {
    x: (38 +1) * honeycomb.spacing.x + 1
  , y: (27 + 1) * honeycomb.spacing.y
  };

  var margin = {
      top: (display.y - honeycomb.dimensions.y) / 2
    , right: (display.x - honeycomb.dimensions.x) / 2
    , bottom: (display.y - honeycomb.dimensions.y) / 2
    , left: (display.x - honeycomb.dimensions.x) / 2
  };

  var content = {
    x: display.x - margin.left - margin.right
  , y: display.y - margin.top - margin.bottom
  };

  var hexAngles = d3.range(0, 2 * Math.PI, Math.PI / 3);

  var hexagon = function(radius) {
    var x0 = 0, y0 = 0;
    return hexAngles.map(function(angle) {
      var x1 = Math.sin(angle) * radius,
          y1 = -Math.cos(angle) * radius,
          dx = x1 - x0,
          dy = y1 - y0;
      x0 = x1, y0 = y1;
      return [dx, dy];
    });
  }

  var hexagonsPerRow = 16;
  var points = d3.range(128).map(function(currentValue, index) {
        var x_i =  (index % hexagonsPerRow) + 1
          , y_i = (Math.floor(index / hexagonsPerRow)) + 1;
        if (y_i % 2 !== 0) {
          x_i = x_i + 0.5
        }
        var x = honeycomb.spacing.x * x_i;
        var y = honeycomb.spacing.y * y_i;
        return {id: index, x: x, y: y, stage: 0, skecthCount: 0};
      });

  console.log(points.length);

  var color = function(point) {
    if (point.stage === 5 && firstImage && hex.shadowman) {
      return 'url(#redhat'+point.id+')';
    }
    return colorScale(point.stage);
  }

  var colorScale = d3.scale.linear()
    .domain([0, 1, 2, 3, 4, 5])  // 5 states
    .range(['#39a5dc', '#0088ce', '#00659c', '#004368', '#002235', '#000000']);

  var svg = d3.select('.map').append('svg')
      .attr('width', content.x + margin.left + margin.right)
      .attr('height', content.y + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
      ;

  var defs = svg.append('defs');

  points.forEach(function(point) {
    var pattern = defs.append('pattern')
      .attr('id', 'redhat' + point.id)
      .attr('class', 'shadowman')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', honeycomb.size*2)
      .attr('height', honeycomb.size*2)
      .attr('x', -honeycomb.size)
      .attr('y', -honeycomb.size);

    pattern.append('rect')
      .attr('width', honeycomb.dimensions.x)
      .attr('height', honeycomb.dimensions.y)
      .attr('x', -point.x + honeycomb.size)
      .attr('y', -point.y + honeycomb.size);

    pattern.append('image')
      .attr('xlink:href', '/img/redhat.svg')
      .attr('width', honeycomb.dimensions.x * 0.4)
      .attr('height', honeycomb.dimensions.y * 0.4)
      .attr('x', -point.x + 2.6 * honeycomb.size )
      .attr('y', -point.y - 1.1 * honeycomb.size );
  });

  svg.append('clipPath')
      .attr('id', 'clip')
    .append('rect')
      .attr('class', 'mesh')
      .attr('width', content.x)
      .attr('height', content.y);

  var hexagons = svg.append('g')
      .attr('clip-path', 'url(#clip)')
    .selectAll('.hexagon').data(points)

  hexagons
    .enter().append('path')
      .attr('class', 'hexagon')
      .attr('d', 'm' + hexagon(honeycomb.size).join('l') + 'z')
      .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; })
      .style('fill', function(d) { return colorScale(0); })
      .append('title').text(function(d) {return d.title})

  function flipAll() {
    var duration = 1000;

    hexagons
      .transition()
      .duration(duration)
      .ease('cubic-in-out')
      .attrTween('transform', function(d, i, a) {
        return function(t) {
          var scale = 1-4*t*(1-t);
          return 'matrix('+scale+', 0, 0, 1, '+ d.x +', '+ d.y +')'
        }
      })
      .styleTween('fill', function(d, i, a) {
        return function(t) {
          return t < 0.5 ? a : color(d);
        };
      });
  }

  function particle(point, pod) {
    var c = {x: content.x / 2, y: content.y / 2};
    var perspective = 1.5
      , duration = 500
      , scale = 0.4
      , opacity = { initial: 0.01, final: 0.9};
    var p0 = {x: perspective * (point.x - c.x) + c.x, y: perspective * (point.y - c.y) + c.y};
    point.stage = pod.stage;
    point.name = pod.name;
    svg.insert('path')
      .attr('class', 'hexagon falling')
      .attr('d', 'm' + hexagon(honeycomb.size).join('l') + 'z')
      .attr('transform', function(d) { return 'matrix('+1/scale+', 0, 0, '+1/scale+', '+ p0.x +', '+ p0.y +')'; })
      .style('fill', function(d) { return color(point); })
      .style('fill-opacity', opacity.initial)
    .transition()
      .duration(duration)
      .ease('quad-out')
      .attr('transform', 'translate(' + point.x + ',' + point.y + ')')
      .style('fill-opacity', opacity.final)
      .remove();
    hexagons.filter(function(d) { return d.x === point.x && d.y === point.y; })
      .transition()
      .duration(duration)
      .ease('linear')
      .styleTween('fill', function(d, i, a) {
        var fill = d.sketch ? a : color(d);
        return function(t) {
          return t < 1 ? a : fill;
        };
      })
      .each('end', function() {
        d3.select(this).select('title').text(point.name)
      })
  };

  var createSketchId = function(point) {
    return 'img' + point.id + '_' + point.currentSketch;
  }

  var createBackground = function(sketch, id) {
    var imgsize = (honeycomb.size * 2);
    var pattern = defs.append('pattern')
      .attr('id', id)
      .attr('class', 'sketch')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr('x', imgsize/2)
      .attr('y', imgsize/2);

    pattern.append('rect')
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr('x', 0)
      .attr('y', 0);

    pattern.append('image')
      .attr('xlink:href', sketch.uiUrl)
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr('x', 0)
      .attr('y', 0);
  }

  var image = function(point, sketch, animate) {
    console.log('Adding sketch:', sketch.submissionId, 'for cuid: ', sketch.cuid);
    var c = {x: content.x / 2, y: content.y / 2};
    var perspective = 0.5
      , duration = animate ? 1000 : 0
      , scale = 0.2
    var p0 = {x: perspective * (point.x - c.x) + c.x, y: perspective * (point.y - c.y) + c.y};

    point.sketch = point.sketch || [];
    point.currentSketch = ++point.skecthCount;
    point.sketch.push(sketch);
    var skecthId = createSketchId(point);
    createBackground(sketch, skecthId);

    if (animate) {
      svg.insert('path')
        .datum(point)
        .attr('class', 'hexagon sketch falling')
        .attr('d', 'm' + hexagon(honeycomb.size).join('l') + 'z')
        .attr('transform', function(d) { return 'matrix('+1/scale+', 0, 0, '+1/scale+', '+ p0.x +', '+ p0.y +')'})
        .style('fill-opacity', 1.0)
        .attr('fill', 'url(#' + skecthId + ')')
      .transition()
        .duration(duration)
        .ease('quad-in')
        .attr('transform', 'translate(' + point.x + ',' + point.y + ')')
        .remove();

      hexagons.filter(function(d) { return d.x === point.x && d.y === point.y; })
        .transition()
        .duration(duration)
        .ease('linear')
        .each('end', function() {
          d3.select(this).attr('class', 'hexagon sketch')
        })
        .attr('transform', function(d) {return 'matrix(1, 0, 0, 1, '+ d.x +', '+ d.y +')'}) // finish off any half-flipped hexagons
        .styleTween('fill', function(d, i, a) {
          return function(t) {
            return t < 1 ? a : 'url(#' + skecthId + ')';
          };
        });
      } else {
        hexagons.filter(function(d) { return d.x === point.x && d.y === point.y; })
          .attr('class', 'hexagon sketch')
          .attr('transform', function(d) {return 'matrix(1, 0, 0, 1, '+ d.x +', '+ d.y +')'}) // finish off any half-flipped hexagons
          .style('fill', function(d) { return 'url(#' + skecthId + ')'; });
      }
  };

  var removeSketch = function(point) {
    hex.inspect.unhighlight();
    point.currentSketch--;
    point.sketch.pop();
    hexagons.filter(function(d) { return d.x === point.x && d.y === point.y; })
      .style('fill', function(d) { return d.sketch.length ? 'url(#' + createSketchId(d) + ')' : color(d)})
      .classed('sketch', function(d) { return d.sketch.length > 0});
  };

  var clear = function(point) {
    point.sketch = [];
    hexagons.filter(function(d) { return d.x === point.x && d.y === point.y; })
      .style('fill', function(d) { return color(d)})
      .classed('sketch', false);
  }

  var openObserver = Rx.Observer.create(
    function(open) {
      var ws = open.target;
      ws.send(JSON.stringify({
        type: 'subscribe'
      , feed: hex.datafeed
      }));
      hex.ping.onNext(open);
    }
  , function (err) {
      hex.ping.onError(err);
    }
  , function() {
      hex.ping.onCompleted();
    }
  );

  var messages = Rx.DOM.fromWebSocket(hex.config.backend.ws + '/thousand', null, openObserver)
  .map(function(messageEvent) {
    return JSON.parse(messageEvent.data);
  }).share();

  var eventStream = messages.filter(function(message) {
    return message.type === 'event';
  })
  .tap(function(message) {
    var event = message.data;
    particle(points[parseInt(event.id)], event);
  });

  var errorStream = messages.filter(function(message) {
    return message.type === 'error';
  })
  .tap(function(message) {
    var error = message.data;
    var errorMessage = 'Error requesting data from OpenShift:\n' + error.code + ': ' + error.message;
    errorMessage += '\n\nUpdate the OAuth token of the UI deployment to see live data';
    console.error(errorMessage);
    alert(errorMessage);
  });

  var sketchStream = messages.filter(function(message) {
    return message.type === 'sketch' && hex.showSketches;
  })
  .tap(function(message) {
    var sketch = message.data;
    var point = points[sketch.containerId];
    if (firstImage) {
      firstImage = false;
      var flipRequired = points.some(function(point) {
        return point.stage === 5;
      });
      if (flipRequired) {
        flipAll();
      }
    }
    image(point, sketch, ! hex.controls.adminEnabled);
  });

  var sketchBundleStream = messages.filter(function(message) {
    return message.type === 'sketch-bundle' && hex.showSketches;
  })
  .flatMap(function(message) {
    return message.data;
  })
  .tap(function(sketch) {
    var point = points[sketch.containerId];
    if (! point.sketch) {
      if (firstImage) {
        firstImage = false;
        if (points.some(function(point) {
          return point.stage === 4;
        }))
        flipAll();
      }
      image(point, sketch, false);
      console.log(point, sketch)
    };
  });

  var removeStream = messages.filter(function(message) {
    return message.type === 'remove';
  })
  .tap(function(message) {
    var point = points.filter(function(point) {
      return point.id === message.data.id;
    });
    if (point.length && point[0].sketch) {
      removeSketch(point[0]);
    };
  });

  var removeBundleStream = messages.filter(function(message) {
    return message.type === 'removeAll';
  })
  .tap(function() {
    hex.inspect.unhighlight();
    hex.highlight.unhighlight();

    points.forEach(function(point) {
      if (point.sketch) {
        clear(point);
      };
    });
  });

  var cover = d3.select('#cover');
  if (cover) {
    cover.style({visibility: 'visible', opacity: '0.6'});
  }

  var subscriptions = {};
  var subscribe = function() {
    if (cover) {
      cover.on('transitionend', function() {
        cover.style({display: 'none'});
      })
      cover.style({visibility: 'visible', opacity: '0.0'});

    }
    subscriptions.sketch = sketchStream.subscribeOnError(errorObserver);
    subscriptions.event = eventStream.subscribeOnError(errorObserver);
    subscriptions.error = errorStream.subscribeOnError(errorObserver);
    subscriptions.sketchBundle = sketchBundleStream.subscribeOnError(errorObserver);
    subscriptions.remove = removeStream.subscribeOnError(errorObserver);
    subscriptions.removeBundle = removeBundleStream.subscribeOnError(errorObserver);
    subscriptions.controls = hex.controls.websocketStream.subscribeOnError(errorObserver);
  }

  var dispose = function() {
    subscriptions.sketch.dispose();
    subscriptions.event.dispose();
    subscriptions.error.dispose();
    subscriptions.sketchBundle.dispose();
    subscriptions.remove.dispose();
    subscriptions.removeBundle.dispose();
    subscriptions.controls.dispose();
  };

  return {
    errorObserver: errorObserver
  , messages: messages
  , honeycomb: honeycomb
  , content: content
  , points: points
  , hexagon: hexagon
  , svg: svg
  , subscribe: subscribe
  , dispose: dispose
  , flipAll: flipAll
  , removeSketch: removeSketch
  , createSketchId: createSketchId
  }

})(d3, Rx);
