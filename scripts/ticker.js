jQuery.fn.ticker = function(options) {
  var options = jQuery.extend({}, jQuery.fn.ticker.defaults, options);

  if ( 'undefined' == typeof options.url ) throw "[!] You must pass a URL to JSON data source"

  return this.each(function() {
    jQuery.fn.ticker.container = $(this)
    jQuery.fn.ticker.container.append( jQuery('<p class="loading">Loading...</p>') )
    jQuery.getJSON(options.url+'?jsoncallback=?')

    jQuery.fn.ticker.container.find('h3 a')
      .mouseover(  function() { if (!jQuery.fn.ticker.container.hasClass('expanded')) jQuery.fn.ticker.all() } )

    var hide_timer = null;
    jQuery.fn.ticker.container
      .mouseenter( function() { clearTimeout(hide_timer) } )
      .mouseleave( function() { if (jQuery.fn.ticker.container.hasClass('expanded')) {
        hide_timer = setTimeout( function() { jQuery.fn.ticker.cycle() }, 250 )
      } } )

    jQuery.fn.ticker.container.__initialize = function() {
      var c = jQuery.fn.ticker.container
        , current = 0
        , items   = c.find("li")
        , size    = c.find("li").length;

      items.hide()
      items.eq(0).delay(options.speed/2).fadeIn(options.speed)

      var tick = function() {
        current = (current < size-1) ? current+1 : 0
        items.eq(current-1).fadeOut(options.speed)
        items.eq(current).delay(options.speed*0.8).fadeIn(options.speed)
        return c;
      };

      clearInterval(jQuery.fn.ticker.interval)
      jQuery.fn.ticker.interval = setInterval( tick, options.interval)
    };

    return this;
  });
};

jQuery.fn.ticker.load = function(data) {
  // console.log('loaded', data)

  var html = data.map( function(item) {
    return '<li><span class="date">'+item.date+'</span> '+item.title+'</li>'
  }).join("\n")

  this.container.find('p.loading').remove()
  this.container.append( jQuery("<ul></ul>").html( html ) )
  this.container.__initialize()
};

jQuery.fn.ticker.all = function(data) {
  clearInterval(jQuery.fn.ticker.interval)
  this.container.find('li').stop(true, true)
  this.container.addClass("expanded")
};

jQuery.fn.ticker.cycle = function(data) {
  this.container.removeClass("expanded")
  this.container.__initialize()
};


jQuery.fn.ticker.defaults = {
  interval: 3000,
  speed:    500
};

jQuery(document).ready( function() { $("#news").ticker( { url: 'http://elasticsearch.com/news.json', interval: 5000 } ) } );
