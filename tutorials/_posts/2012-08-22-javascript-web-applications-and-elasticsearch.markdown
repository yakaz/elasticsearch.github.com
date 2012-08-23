---
layout: tutorial
title: JavaScript Web Applications and elasticsearch
cat: tutorials
author: Karel Minarik
nick: karmiq
---

<style>
  #content.tutorials p
    { line-height: 1.5em; }
  #content.tutorials a
    { color: black !important; border-bottom: 1px solid black; -webkit-border-radius: 0px; -moz-border-radius: 0px; border-radius: 0px; }
  #content.tutorials a.image,
  #content.tutorials a.image:hover
    { border: none !important; background: transparent !important;}
  #content.tutorials code
    { background-color: transparent; -webkit-border-radius: 4px; -moz-border-radius: 4px; border-radius: 4px; }
  #content.tutorials img
    { border: 1px solid rgba(0,0,0,0.1); -webkit-border-radius: 10px; -moz-border-radius: 10px; border-radius: 10px; -moz-box-shadow: 5px 5px 20px #647F47; -webkit-box-shadow: 5px 5px 20px #647F47; box-shadow: 5px 5px 20px #647F47; }
  #content.tutorials small
    { font-size: 90%; color: #11130E; }
  #content.tutorials small code
    { font-size: 90%; color: #11130E; background-color: transparent; }
  #content.tutorials .infobox
    { font-size: 95%; color: #444; background-color: #F1ED81; padding: 1em 1.5em; margin-bottom: 1.5em; -webkit-border-radius: 10px; -moz-border-radius: 10px; border-radius: 10px; -moz-box-shadow: 5px 5px 20px #647F47; -webkit-box-shadow: 5px 5px 20px #647F47; box-shadow: 5px 5px 20px #647F47; }
  #content.tutorials .infobox code
    { background-color: transparent !important; }
  #content.tutorials .infobox pre
    { background-color: transparent !important; margin: 0; padding: 0px; -moz-border-radius: 0px; -webkit-border-radius: 0px; border-radius: 0px; -moz-box-shadow: none; -webkit-box-shadow: none; box-shadow: none; }
  #content.tutorials hr
    { border: 1px solid rgba(255,255,255,0.2); }
</style>

> “At this point, saying ‘single-page application’ is like saying ‘horseless carriage’“
>
> – Jeremy Ashkenas, creator of Backbone.js

In the last couple of years, there's been a surge in popularity and adoption of so-called “single-page applications”: rich, interactive web applications written entirely in JavaScript, HTML and CSS, which eliminate roundtrips to server as much as possible and send and receive data asynchronously via Ajax. Pioneered by GMail, the prominent examples of sophisticated JavaScript applications are the Twitter.com website, the SoundCloud mobile site or the LinkedIn iPad client.

Implementing such applications with scattered jQuery callbacks is something ultimately leading to frustration and maintenance nightmare. Not surprisingly, a new crop of JavaScript frameworks has emerged, providing a much more robust foundation, such as [Backbone.js](http://backbonejs.org), [Ember.js](http://emberjs.com), [Angular.js](http://www.angularjs.org), and many others. (For a thorough comparison, please see the [_Rich JavaScript Applications – the Seven Frameworks_](http://blog.stevensanderson.com/2012/08/01/rich-javascript-applications-the-seven-frameworks-throne-of-js-2012/) article.)

What all these frameworks have in common is a clean separation of application layers and a semi-automatic binding between HTML templates and the application code; the [_TodoMVC_](http://todomvc.com) project aims to provide a comparable implementation of a simple application in all major frameworks.

Breaking out from the usual request &hArr; response lifecycle, commonly found in traditional Ruby On Rails or Django web applications, brings first and foremost more responsive applications: the application is loaded on first request, and all other user interaction is handled asynchronously. Also, [some argue](http://andrzejonsoftware.blogspot.cz/2012/06/from-backend-to-frontend-mental.html) that the cleaner separation between “backend” and “frontend” code is beneficial for many types of applications. We will certainly see more and more adoption of these “single-page applications” in web development, and though it's hard to say if they become a dominant concept, as the quote from Jeremy Ashkenas hints at, the concept is here to stay.

And elasticsearch?
------------------

So, where does elasticsearch fit in? There are at least two features, which make elasticsearch a perfect match for web development in general, and for rich JavaScript applications in particular.

First, by having a rich RESTful HTTP API, it's trivial to query elasticsearch with Ajax. (elasticsearch further supports JavaScript developers with [cross-origin resource sharing](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) by sending an `Access-Control-Allow-Origin` header to browsers.)

Second, since elasticsearch stores schema-free documents serialized as JSON — coming from “JavaScript Object Notation”, so obviously a native entity in JavaScript code —, it can be used not only as a search engine, but also as a persistence engine.

There's a third feature, actually, which makes elasticsearch even more interesting in the context of creating JavaScript applications: the ability to serve static files by elasticsearch itself. Any elasticsearch [plugin](http://www.elasticsearch.org/guide/reference/modules/plugins.html) which contains a `_site` directory — or does not contain any Java files —, is identified as a “site” plugin and the files are being served by elasticsearch acting as a “web server”. (Plugins such as [BigDesk](http://github.com/lukas-vlcek/bigdesk/) or [Paramedic](http://github.com/karmi/elasticsearch-paramedic) make use of exactly this feature.)

Let's install a [simple jQuery/HTML “application”](https://gist.github.com/3381710#file___readme.md):

    plugin -install hello-elasticsearch -url https://raw.github.com/gist/3381710/hello-elasticsearch.zip

Next, load [localhost:9200/_plugin/hello-elasticsearch/index.html](http://localhost:9200/_plugin/hello-elasticsearch/index.html) in your browser and you should see the application running, showing some basic information about your node.

![elasticsearch site plugin](/tutorials/images/elasticsearch-and-ember-js/hello-elasticsearch-app.png)

The concept is reminiscent of [“CouchApps”](http://couchapp.org/page/what-is-couchapp), HTML applications running within the CouchDB database, exploiting its ability to serve static content, execute JavaScript code and provide a stream of database changes. [Futon](http://guide.couchdb.org/draft/tour.html#figure/4), the administration interface for CouchDB, is in fact a CouchApp, and [many](http://couchapp.org/page/list-of-couchapps) other applications have been written, ranging from simple tools to sophisticated applications, such as [“Swinger”](http://swinger.quirkey.com), a presentation software which allows to present _and_ [edit](http://swinger.quirkey.com/#/preso/ruby-interns/edit/4) HTML slideshows.


Ember.js
--------

In this article, we will write a simple task management application in JavaScript, using elasticsearch as a persistence layer. This is how the finished appplication should look like:

<p><a href="https://github.com/karmi/ember-data-elasticsearch/tree/master/example"
      class="image"
      title="https://github.com/karmi/ember-data-elasticsearch/tree/master/example">
      <img src="/tutorials/images/elasticsearch-and-ember-js/tasks-screenshot.png"
           alt="Example Ember.js application with elasticsearch persistence" title="" />
</a></p>


Instead of using plain jQuery and HTML, though, we will use [Ember.js](http://emberjs.com), a self-described “framework for _ambitious_ applications”.

Ember.js provides high level abstractions for creating modern JavaScript applications. Its strengths lie in two-way binding, auto-updating templates and a Rails-inspired “convention over configuration” approach — thus, in eliminating boilerplate code. It sprang out of [SproutCore](http://sproutcore.com), a large-scale framwork [used by Apple](http://www.appleinsider.com/articles/08/06/16/apples_open_secret_sproutcore_is_cocoa_for_the_web.html) to build the iCloud (formerly MobileMe) online suite of services. If you're interested in Ember.js origins, check an [article](http://yehudakatz.com/2011/12/08/announcing-amber-js/) from its creator, Yehuda Katz.

One of the helpful Ember.js abstractions is [Ember Data](http://github.com/emberjs/data), which provides a common interface to persist application data. A concrete storage implementation, an _adapter_, can use storage engines such as the browser's [_localStorage_](http://diveintohtml5.info/storage.html) or emerging web databases such as [_IndexedDB_](http://hacks.mozilla.org/2010/06/beyond-html5-database-apis-and-the-road-to-indexeddb/), but the primary endpoint for Ember Data is a RESTful HTTP service — the bundled `RESTAdapter` connects an Ember.js application with a Ruby On Rails API.


elasticsearch Adapter for Ember Data
------------------------------------

Using elasticsearch as a storage engine for an Ember.js application is just a matter of using a proper adapter, then. We will use the elasticsearch adapter from [github.com/karmi/ember-data-elasticsearch](http://github.com/karmi/ember-data-elasticsearch).

The Ember Data API is very simple, so let's walk through the steps needed to create, read, update and delete some data.

First, we need to set up a `store` instance, passing it the adapter:

<pre class="prettyprint lang-js">
var store = DS.Store.create({
  // Optional elasticsearch URL
  //
  adapter: DS.ElasticSearchAdapter.create({url: 'http://localhost:9200'}),
  // `revision` is an internal Ember compatibility tracking
  //
  revision: 4
});
</pre>

Second, we have to define a _model_ (a “class”, if you want), representing our data, using the Ember Data API to declare its _properties_ — in our case, only the `name` property:

<pre class="prettyprint lang-js">
Person = DS.Model.extend({ name: DS.attr('string') });
</pre>

Also, we have to hook it to a proper elasticsearch index and type, by defining a “static” `url` property:

<pre class="prettyprint lang-js">
Person.reopenClass({ url: 'people/person' });
</pre>

To create new record, we'll use the `createRecord` method of the `Person` “class”:

<pre class="prettyprint lang-js">
Person.createRecord({ id: 1, name: "John" });
</pre>

... and call the store's `commit` method.

<pre class="prettyprint lang-js">
store.commit();
</pre>

To check what we had actually stored, open the [corresponding index](http://localhost:9200/people/_search) in the browser, or use the Ember Data API:

<pre class="prettyprint lang-js">
var people = Person.find();
people.toArray().map( function(person) { return person.get("name") } );
// => ["John"]
</pre>

The store handles model updates transparently, so when we change a property:

<pre class="prettyprint lang-js">
var person = Person.find(1)
person.set("name", "Frank")
</pre>

... the only thing we need to do to save the changes is calling the `commit` method again:

<pre class="prettyprint lang-js">
store.commit()
</pre>

Of course, by using elasticsearch as the database, we can use a full text query to look up records:

<pre class="prettyprint lang-js">
var people = Person.find( {query: { query_string: { query: "frank" } }} );
people.toArray().map( function(person) { return person.get("name") } );
// => ["Frank"]
</pre>


The Example Application
-----------------------

Armed with all this knowledge, we can move on to create the example application. Ember.js applications follow quite closely the standard [MVC pattern](http://emberjs.com/guides/ember_mvc), where models encapsulate application data and logic, views provide the user interface and controllers handle wiring between those two. In fact, it could be described as “real MVC”, because the principal wiring between the components is done via the Observer pattern, where a model notifies the view about its changes (Andrzej Krzywda, [_Rails Is Not MVC_](http://andrzejonsoftware.blogspot.com/2011/09/rails-is-not-mvc.html)).

In Ember.js, changes in views are automatically propagated into models as well, via the [Handlebars](http://handlebarsjs.com) templating system. This two-way binding is automatic, and it's the core strength of Ember.js: you set up bindings, either by naming conventions or declaratively, and the framework takes care of the rest. Check out a [simplified example](http://jsfiddle.net/karmi/LNsEW/), which demonstrates the principle.

Let's review the most important the parts of the application — the [full source code](https://github.com/karmi/ember-data-elasticsearch/tree/master/example) for the application is available at the GitHub repository.

In Ember.js, the first thing we need to do is create a _namespace_ for our application and set it up. In the application `ready` callback, we'll check if the index exists:

<pre class="prettyprint lang-js">
var App = Ember.Application.create({

  // Create namespaces
  //
  Models:      Ember.Object.extend(),
  Views:       Ember.Object.extend(),
  Controllers: Ember.Object.extend(),

  ready: function() {
    var index_url = [App.store.adapter.url, "tasks"].join('/');

    // Let's check if the `tasks` index exists and create it otherwise.
    //
    jQuery.ajax({
      url:   index_url,
      type:  'HEAD',
      error: function() { jQuery.post(index_url, {}, function(data) {}) }
    });
  }
});
</pre>

Next, let's define a store for the application, using the elasticsearch adapter:

<pre class="prettyprint lang-js">
App.store = DS.Store.create({
  adapter: DS.ElasticSearchAdapter.create(),
  revision: 4 // Internal Ember.js compatibility tracking
});
</pre>

We can define the `Task` model, now, using the Ember Data API. We'll define the model _properties_ and a `changed` callback: it will fire whenever the `completed` property for a model instance changes and will update the document in elasticsearch. You can see how well the Observer pattern works here to communicate the intent:

<pre class="prettyprint lang-js">
App.Models.Task = DS.Model.extend({
  // Properties:
  //
  title:      DS.attr('string'),
  completed:  DS.attr('boolean'),
  created_at: DS.attr('string'),

  // Observe changes and persist them in elasticsearch
  //
  changed: function() {
    App.store.commit()
  }.observes('completed')
});
</pre>

Again, we have to hook up the model to a proper elasticsearch index and type via the `url` property:

<pre class="prettyprint lang-js">
App.Models.Task.reopenClass({ url: 'tasks/task' });
</pre>

We'll create a _controller_, which will provide the wiring between models and views: the `content` property will be hooked to a collection of tasks, and the `createTask` and `removeTask` methods will serve as a shared interface. The `remaining` function is Ember.js' “computed property”: an automatically updated collection of uncompleted tasks, which we'll use in the view.

<pre class="prettyprint lang-js">
App.Controllers.tasks = Ember.ArrayController.create({
  // Hold the collection of tasks
  //
  content: App.Models.Task.find(),

  // Create new document
  //
  createTask: function(value) {
    var task = App.Models.Task.createRecord({
      title: value,
      completed: false,
      created_at: (new Date().toJSON())
    });
    App.store.commit();
  },

  // Remove document
  //
  removeTask: function(event) {
    if ( confirm("Delete this task?") ) {
      var task = event.context;

      task.deleteRecord();
      App.store.commit();
    }
  },

  // Computed property: observe the `completed` property of all records
  //
  remaining: function() {
    return this.filterProperty('completed', false);
  }.property('@each.completed').cacheable()
});
</pre>

In fact, this is how we hook up a template to the `remaining` property — whever a task is completed, added or removed, it will be automatically updated:

<pre class="prettyprint lang-html">
&lt;script type=&quot;text/x-handlebars&quot;&gt;
  &lt;small&gt;|
    &#x007B;{App.Controllers.tasks.remaining.length}} remaining
  &lt;/small&gt;
&lt;/script&gt;
</pre>

For the input field we'll create a full-fledged Ember.js _view_, making use of the `insertNewline` callback -- it will fire whenever an <kbd>Enter</kbd> is pressed, calling the controller's `createTask` method:

<pre class="prettyprint lang-js">
App.Views.CreateTask = Ember.TextField.extend({
  insertNewline: function(event) {
    var value = this.get('value');

    if (value) {
      App.Controllers.tasks.createTask(value);
      this.set('value', '');
    }
  }
});
</pre>

We will use this view inside a HTML template like this:

<pre class="prettyprint lang-html">
&lt;script type=&quot;text/x-handlebars&quot;&gt;
  &#x007B;{view App.Views.CreateTask id=&quot;create_task&quot; placeholder=&quot;Add a new task...&quot;}}
&lt;/script&gt;
</pre>

To display a list of tasks, we'll use the [`each`](http://handlebarsjs.com/#iteration) helper, connected to the `content` property of the controller:

<pre class="prettyprint lang-html">
&lt;script type=&quot;text/x-handlebars&quot;&gt;
&lt;ul id=&quot;tasks&quot;&gt;
  &#x007B;{#each App.Controllers.tasks}}
    &lt;li &#x007B;{bindAttr class=&quot;:task completed&quot;}}&gt;
      &#x007B;{view Ember.Checkbox checkedBinding=&quot;completed&quot;}}
      &lt;label&gt;&#x007B;{title}}&lt;/label&gt;
      &lt;a class=&quot;remove-task&quot; title=&quot;[delete]&quot; &#x007B;{action removeTask this target=&quot;App.Controllers.tasks&quot;}}&gt;
        &lt;span class=&quot;icon-remove&quot;&gt;&amp;nbsp;&lt;/span&gt;
      &lt;/a&gt;
    &lt;/li&gt;
  &#x007B;{/each}}
&lt;/ul&gt;
&lt;/script&gt;
</pre>

And that's it! Of course, the easiest way to check out the finished application is to [load it from GitHub](http://karmi.github.com/ember-data-elasticsearch/) or download the [full source](https://github.com/karmi/ember-data-elasticsearch/tree/master/example).

You're probably wondering right now: when the elasticsearch HTTP API is exposed like this, what really prevents anybody from deleting your index or shutting down the whole cluster? And that's a good question.

First of all, as outlined earlier, we can quite easily install the application as an elasticsearch plugin:

    plugin -install karmi/ember-data-elasticsearch

You'll access the application by loading the [localhost:9200/_plugin/ember-data-elasticsearch/example/index.html](http://localhost:9200/_plugin/ember-data-elasticsearch/example/index.html) page in your browser — any restrictions you want can be provided on the network level via firewall rules or virtual private network (VPN) configuration.

Also, because elasticsearch has an HTTP API, we can simply put an HTTP proxy with authentication in front of it (see the Nginx template from the [Chef cookbook](https://github.com/karmi/cookbook-elasticsearch/blob/master/templates/default/elasticsearch_proxy_nginx.conf.erb)), or use the [Jetty Plugin](https://github.com/sonian/elasticsearch-jetty), which provides out-of-the-box HTTP authentication. The application then would use the `window.location` object to get the elasticsearch URL with credentials.

Nevertheless, HTTP Basic Authentication can only get you so far — the password is sent in the clear, Safari displays scary looking warnings, &hellip; A setup like this could be a good fit for internal applications and such, but what if you would want to deploy the application to a wider audience or need a finer grained control? The answer is again an HTTP proxy — it just has to be _way_ smarter. So, let's write one!


A Smart Proxy
-------------

First, load the application at [ember-elasticsearch-notes.herokuapp.com](http://ember-elasticsearch-notes.herokuapp.com), login via Twitter and leave a note for fellow readers of this article.

What you see is an Ember.js application served by a proxy written in Ruby on top of the [Goliath](https://github.com/postrank-labs/goliath) server, running on Heroku. The full source code of the application and the proxy is available at [gist.github.com/3369662](https://gist.github.com/3369662).

The application uses [Twitter @Anywhere](https://dev.twitter.com/docs/anywhere/welcome#login-signup) to authenticate users with their Twitter account — the proxy, subsequently, uses the information in a cookie set by Twitter to authenticate and forward requests to elasticsearch.

Let's review the architecture in a diagram:

<p><img src="/tutorials/images/elasticsearch-and-ember-js/notes-app-architecture.png" alt="Diagram" title="" width="740" /></p>


The [application](https://gist.github.com/3369662#file_index.html) is quite simple, but the [proxy](https://gist.github.com/3369662#file_proxy.rb) is a bit more interesting and does couple of things.

It serves the application on root. The application could be in fact running on a different domain, authorized by Twitter @Anywhere: the proxy just needs to have access to the cookie.

It denies `PUT` and `DELETE` methods to disable destructive requests. Of course, we could have a more fine-grained control here, allowing `DELETE` requests just for the documents the user has created, so she can remove her own notes.

The meat of the proxy is validating the `twitter_anywhere_identity` cookie by comparing its fingerprint with a secret code shared with Twitter, to authenticate legitimate users:

<pre class="prettyprint lang-ruby">
def valid_cookie?(cookie)
  return false unless cookie

  cookie_value = cookie.to_s.gsub(/twitter_anywhere_identity=/, '')
  cookie_user_id, cookie_fingerprint = cookie_value.split(':')

  return cookie_fingerprint == Digest::SHA1.hexdigest( [cookie_user_id, TWITTER_CONSUMER_SECRET].join('') )
end
</pre>

The proxy forwards valid requests to the elasticsearch backend running on a different server — an EC2 `t1.micro` instance —, and returns the response to the client.

This all is possible by leveraging the fact that elasticsearch exposes an HTTP API. By putting a proxy in front of it, we can isolate the authentication and authorization routines into separate components, effectively de-composing the responsibilities in the stack and allowing for better testability of individual parts.

Certainly, many other clever tricks are possible in a setup like this. We can easily load more notes with the “infinite scrolling” pattern (by sending a specific `size` and `from` values to elasticsearch), or guard against malicious users faking their Twitter identity by validating their `screen_name` via the [Twitter API](http://dev.twitter.com/docs/api/1/get/users/show) in the proxy.

Lastly, we could also add, you know... a **search** feature to the application. Implementation-wise, that would just mean to add another `Ember.TextField` to the application and passing a [`text_query`](http://www.elasticsearch.org/guide/reference/query-dsl/text-query.html) to the `App.Person.find()` method.

But, as you may have already realized, elasticsearch — and, by extension, Lucene — is capable of quite a lot more than just returning documents matching a search query. It can be used equally well as a search engine, an analytical engine, or — for certain use cases — as a document oriented “database”.

The real lesson of this article is still different, though: the tricks we were able to play with the Ruby proxy for the “Notes” application are a testament of how flexible and powerful HTTP-based APIs really are.

<p><br><br><hr><br><br></p>
