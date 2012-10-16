---
layout: tutorial
title: Deploying ElasticSearch with Chef Solo
cat: tutorials
author: Karel Minarik
nick: karmiq
---

<style>
  #content.tutorials a
    { color: black !important; border-bottom: 1px solid black; -webkit-border-radius: 0px; -moz-border-radius: 0px; border-radius: 0px; }
  #content.tutorials code
    { background-color: #C6E86A; -webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; }
  #content.tutorials img
    { border: 1px solid #ccc; -webkit-border-radius: 10px; -moz-border-radius: 10px; border-radius: 10px; -moz-box-shadow: 5px 5px 20px #647F47; -webkit-box-shadow: 5px 5px 20px #647F47; box-shadow: 5px 5px 20px #647F47; }
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
</style>

<p>ElasticSearch is trivially easy to install and run: you just a download and extract an archive and run a simple script.</p>

It's a long way from there to production, though. You have to customize the configuration. You want to install
some plugins. You'd like to ensure ElasticSearch starts on system boot. You want to monitor that the Java process
is running and does not eat too much resources... and many other things.

And then you have to repeat all the steps for each and every node in your cluster.

It would be cool if you could do this in an automated, mechanized manner, wouldn't it?

As it happens, there's lots of both open source and commercial or vendor-specific infrastructure provisioning tools available,
which make tasks like these a snap.

We'll focus on [_Chef_](http://www.opscode.com/chef/), an open-source framework for infrastructure provisioning and management,
maintained and supported by [_Opscode_](http://www.opscode.com).


## What Is Chef? ##

This article can't be a full introduction into _Chef_. You'll find many learning materials on the
[_Chef_ wiki](http://wiki.opscode.com/display/chef/Home), but for our purposes, we'll manage with some absolute minimum.

The first important thing to understand is that there are actually two different “chefs”:

1. [_Chef Server_](http://wiki.opscode.com/display/chef/Architecture+Introduction), a central repository for all your infrastructure
   information and configuration data, which is used with the [`chef-client`](http://wiki.opscode.com/display/chef/Chef+Client) tool, and
2. [_Chef Solo_](http://wiki.opscode.com/display/chef/Chef+Solo), which uses a standalone `chef-solo` tool, which does not need a _Chef_ server.

In the context of this article, we'll be using _Chef Solo_, which means we can't use certain advanced features,
such as full text search of our server attributes, executing the same command over SSH on multiple servers at once,
or using a web-based GUI, but we'll still be able to automate without breaking a sweat.

The essential concepts of _Chef_ are the same between the “server” and “solo” variants.

The first of these is a **node**. A [_node_](http://wiki.opscode.com/display/chef/Nodes) is simply an abstract configuration for a _server_,
reachable by SSH. You can picture _node_ as a document containing some _attributes_, such as a name, the port number for an Apache server
or the list of software we want to have installed. A “physical representation” of the node is the virtual or physical server itself.
(In _Chef Server_, things are a bit more complicated, but that doesn't concern us right now.)

Every _node_ can have one or multiple associated **roles**. A [_role_](http://wiki.opscode.com/display/chef/Roles) joins together
various configuration options for a certain type of machine: for instance, you can have a “webserver” role which would describe
that you want to install an Apache webserver, a Varnish proxy, etc. A role contains recipes, or other roles.
We won't be using roles in this tutorial, though.

The most important concept is a **cookbook**, containing various **recipes** which describe, in detail, how we like our _node_ to be set up.
A _recipe_ uses a variety of [_resources_](http://wiki.opscode.com/display/chef/Resources) to describe these details, such as setting some
default node properties, creating directories, creating configuration files with specific content, installing packages,
downloading files from the internet, or executing arbitrary scripts and commands. Cookbooks hold together recipes, template files,
_Chef_ extensions, etc.

Have a look at the [**ElasticSearch cookbook**](https://github.com/karmi/cookbook-elasticsearch) we'll be using in this tutorial,
to get a sense of how cookbooks are organized and how do they work. The
[recipe](https://github.com/karmi/cookbook-elasticsearch/blob/master/recipes/default.rb) is written in a simple Ruby-based domain
specific language, and should be pretty understandable. Check out also the
[cookbook templates](https://github.com/karmi/cookbook-elasticsearch/tree/master/templates/default).

A recipe can also load additional data from **data bags**. [_Data bags_](http://wiki.opscode.com/display/chef/Data+Bags) are simple
JSON documents, and can contain arbitrary information, such as user credentials, API tokens and other things not specific to a certain recipe.
We won't be using data bags in this tutorial, because we will store all information directly within the node configuration.


## Our goals ###

OK, now we're familiar with the essential parts of _Chef_. What are our goals, then? How would we like to have our ElasticSearch server to be set up?
In fact, we would like a number of things:

* First of all, install a specific version of ElasticSearch on the node
* Create a `elasticsearch.yml` file with custom configuration
* Create a separate user to run ElasticSearch
* Register a service to start ElasticSearch automatically on server boot
* Increase the open files limit for the _elasticsearch_ user
* Configure the memory limits and other settings for the JVM
* Monitor the ElasticSearch process and cluster health with [_Monit_](http://mmonit.com/monit/)
* Install the [_Nginx_](http://nginx.org/) web server and use it as a proxy for ElasticSearch
* Store user credentials for HTTP authentication with _Nginx_

And optionally:

* Install the [_AWS Cloud_](http://github.com/elasticsearch/elasticsearch-cloud-aws) plugin
* Configure the _AWS Cloud_ plugin with proper credentials to use the
  [EC2 discovery](http://www.elasticsearch.org/guide/reference/modules/discovery/ec2.html) and the
  [S3 gateway](http://www.elasticsearch.org/guide/reference/modules/gateway/s3.html)

As you can see, not a short list of tasks. If we would be doing them manually, we could easily spend whole afternoon with that.
By using _Chef_, we should be done in under five minutes, once we get hold of it.

One important thing to emphasize is that we will use the [_Amazon EC2_](http://aws.amazon.com/ec2/) service to create virtual
servers to deploy ElasticSearch nodes at, and we will use some features in ElasticSearch specific to _Amazon Web Services_ (AWS).

You're not limited to the EC2 platform in any way, though: any virtual or physical server accessible by SSH will be
absolutely perfect for the purposes of this tutorial — you'll just need to configure the node a little bit differently.

<p><small>
Note: for making yourself familiar with running ElasticSearch on EC2, you should read the excellent tutorial by James Cook,
<a href="/tutorials/2011/08/22/elasticsearch-on-ec2.html">“ElasticSearch on EC2”</a>, which explains many important topics
related to sucessfully running ElasticSearch in the AWS ecosystem. You don't have to read it for the purposes of this
tutorial, though.</small></p>


## Preparation ##

Before we really start cooking, we must prepare all the tools and ingredients. Assuming EC2, we need to:

* download and edit the scripts and configuration files used in this tutorial,
* create a dedicated security group in AWS,
* launch an instance which we'll be provisioning via _Chef_,
* download the SSH key used for accessing the instance.

We'll begin by downloading the files need for this tutorial from the following gist: <http://gist.github.com/2050769>.
We might as well do it with one command:

<pre class="prettyprint lang-bash">
curl -# -L -k https://gist.github.com/gists/2050769/download | tar xz --strip 1 -C .
</pre>

Your current directory should now contain 4 files (and a readme). Let's review them briefly:

The `bootstrap.sh` file is a generic Bash script, which we'll use for basic setup of the machine (installing _make_, _Rubygems_, etc.).
The `patches.sh` script is used to fix some problems in community cookbooks (and will hopefully be removed from this tutorial soon).
You don't have to edit these files.

The `node-example.js` file contains an example configuration for the whole “node”: list of _cookbooks_ we want to install,
AWS credentials, username and password for the _Nginx_ HTTP authentication, your e-mail address for _Monit_ notifications.
We'll start with a much smaller configuration, though.

The `solo.rb` file contains configuration for _Chef Solo_. Again, you don't have to touch it.

<div class="infobox">
  <h3>Information for non-AWS environments</h3>
  <p>
    From now on, we will assume that we're working with Amazon Elastic Cloud (EC2), provisioning an Amazon Linux operating system.
    If you'd like to work in a different environment (a VPS on <em>Rackspace</em> or <em>Linode</em>,
    local virtual machine in <em>VirtualBox</em> or custom hardware), and with a different operating system,
    you'll have to tweak couple of things.
  </p>
  <p>
    First, you'll have to make sure you can access the server via SSH and update the <code>SSH_OPTIONS</code>
    environment variable according to your specific credentials.
  </p>
  <p>
    Second, in the tutorial, we assume the server already has a working Ruby and Java installation.
    When it's not the case, they must be installed as part of the bootstrap process.
  </p>
  <p>
    A bootstrap script and instructions for the <em>Ubuntu</em> operating system are available
    in this <a href="https://gist.github.com/2060496">gist</a>.
  </p>
</div>

On Amazon EC2, we'll start by creating a dedicated [security group](https://console.aws.amazon.com/ec2/home?region=us-east-1#s=SecurityGroups)
for our ElasticSearch cluster in the AWS console. We will name the group `elasticsearch-test`.

Make sure the security group allows connections on following ports:

* Port 22 for SSH is open for external access (the default `0.0.0.0/0`)
* Port 8080 for the _Nginx_ proxy is open for external access (the default `0.0.0.0/0`)
* Port 9300 for in-cluster communication is open for access only to servers running
  in the same security group (use the “Group ID” for this group, available
  on the "Details" tab, such as `sg-1a23bcd`)

The form for setting up the security group is pictured below.

![Create Security Group](/tutorials/images/chef-solo/create-security-group.png)

**Important:** Don't forget to click “Apply Rule Changes” so the changes are, in fact, applied.

Now, we'll launch a new [server instance](https://console.aws.amazon.com/ec2/home?region=us-east-1#s=Instances) at EC:

* Use a meaningful name for the instance. We will use `test-elasticsearch-chef-1`.
* Create a new "Key Pair" for the instance, and download it immediately. We will be using a key named `elasticsearch-test`.
* Use the _Amazon Linux AMI_ ([`ami-1b814f72`](https://aws.amazon.com/amis/amazon-linux-ami-ebs-backed-64-bit)).
  Amazon Linux comes with Ruby and Java pre-installed.
* Use the `m1.large` instance type. You may use the _small_ or even the _micro_ instance type,
  but the process would take much longer).
* Use the security group created in the first step (`elasticsearch-test`).

The _quicklaunch_ screen for creating the instance is pictured below:

![Create Server Instance](/tutorials/images/chef-solo/create-server-instance.png)

Dont' forget to download the newly created SSH key!

Don't forget to click the “Edit Details” link on the next screen and set the proper instance type (“m1.large”)
in the “Instance Details” pane, and the proper security group (“elasticsearch-test”) in the “Security Settings” pane.

![Check Instance Details](/tutorials/images/chef-solo/check-instance-details.png)

Now you can click “Launch” to create and start your server.

While the server is being created in EC2, we will copy the SSH key downloaded from AWS console to the `tmp/` directory
of this project and make sure it has proper permissions:

<pre class="prettyprint lang-bash">
mkdir -p ./tmp
cp ~/Downloads/elasticsearch-test.pem ./tmp/
chmod 600 ./tmp/elasticsearch-test.pem
</pre>

Once our server is in the _running_ state, copy its “Public DNS” value in the AWS console
(eg. `ec2-123-40-123-50.compute-1.amazonaws.com`) to clipboard.


## Bootstrapping the Machine ##

We can begin the bootstrap and install process now.

First, we'll setup the connection details for convenient passing into _scp_ and _ssh_ commands:

<pre class="prettyprint lang-bash">
HOST=&lt;REPLACE WITH YOUR PUBLIC DNS&gt;
SSH_OPTIONS="-o User=ec2-user -o IdentityFile=./tmp/elasticsearch-test.pem -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
</pre>

We'll check that we can connect to the machine via secure shell:

<pre class="prettyprint lang-bash">
ssh $SSH_OPTIONS $HOST
</pre>

You should be successfully logged into the machine. (Log out by pressing `Ctrl+D`.)

If you have trouble in this step, double-check that the security group is properly set up, that you're using the correct SSH key, etc.

We will now create a simple configuration JSON file for the machine:

<pre class="prettyprint lang-bash">
echo '
{
  "run_list": [ "recipe[elasticsearch]" ],
  "elasticsearch" : {
    "cluster_name" : "elasticsearch_test_with_chef",
    "mlockall"     : false
  }
}
' > ./node.json
</pre>

As you can see, we're starting with a really simplified configuration: in the `run_list` property, we're saying
we want the ElasticSearch cookbook installed and that our cluster will be named `elasticsearch_test_with_chef`.

Let's copy all these files to the machine via secure copy:

<pre class="prettyprint lang-bash">
scp $SSH_OPTIONS bootstrap.sh patches.sh node.json solo.rb $HOST:/tmp
</pre>

We can now begin to bootstrap the machine: install neccessary packages such as _make_, install _Rubygems_ and the `chef` gem,
download cookbooks from the internet, etc.:

<pre class="prettyprint lang-bash">
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/bootstrap.sh"
</pre>

You'll see lots of lines flying by in your terminal. We're running the [bootstrap script](https://gist.github.com/2050769#file_bootstrap.sh)
remotely over SSH; it should take about 2 minutes.

We're left with running the `patches.sh` script, which will fix some problems from the community cookbooks (create neccessary directories or users, etc.):

<pre class="prettyprint lang-bash">
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/patches.sh"
</pre>


## Installing and Configuring ElasticSearch ##

OK – our server is now ready to be provisioned by _Chef Solo_. We will launch the following command:

<pre class="prettyprint lang-bash">
time ssh -t $SSH_OPTIONS $HOST "sudo chef-solo --node-name elasticsearch-test-1 -j /tmp/node.json"
</pre>

This command will perform all the steps neccessary for a bare bones ElasticSearch installation; it will create the directories at
`/usr/local/var/data/elasticsearch`, create the _elasticsearch_ user, download the ElasticSearch package from _GitHub_ and run it.

Let's have a look around on the server. Is ElasticSearch, in fact, running?

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "curl localhost:9200"
</pre>

We can also use the provided service script to check its status:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "sudo service elasticsearch status -v"
</pre>

You can see that our cluster is named <em>elasticsearch_test_with_chef</em>, and that our node is named _elasticsearch-test-1_,
and that the number of open files is _64000_. In fact, let's have a look at the `elasticsearch.yml` configuration file:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "cat /usr/local/etc/elasticsearch/elasticsearch.yml"
</pre>

That's all well and good – we have automated the ElasticSearch installation process, downloading the package, extracting it,
registering it as a service, and properly configuring it.

But our goals are much more ambitious than that! We want monitoring, and the _Nginx_ proxy, and proper AWS setup with EC2
discovery, and S3 persistence!

Seems like the right time to edit the `node.js` file has come.


## The Full Installation ##

Let's start with overwriting our current `node.js` with the provided example:

<pre class="prettyprint lang-bash">
cp node-example.json node.json
</pre>

We have to edit the file and replace the following properties:

* `elasticsearch.gateway.s3.bucket` with a unique name for your bucket
* `elasticsearch.cloud.aws.access_key` with your AWS Access Key
* `elasticsearch.cloud.aws.secret_key` with your AWS Secret Key
* `monit.notify_email` with your e-mail address

You'll find the access and security keys on the [“Security Credentials”](https://aws-portal.amazon.com/gp/aws/securityCredentials) page,
accessible from the drop-down menu under your name in the top right corner.

All right, let's upload the updated file to the machine:

<pre class="prettyprint lang-bash">
scp $SSH_OPTIONS bootstrap.sh patches.sh node.json solo.rb $HOST:/tmp
</pre>

And let's run the provisioning script again:

<pre class="prettyprint lang-bash">
time ssh -t $SSH_OPTIONS $HOST "sudo chef-solo --node-name elasticsearch-test-1 -j /tmp/node.json"
</pre>

You should see, once again, many lines in your terminal flying by, installing _Monit_ and _Nginx_, downloading the
[“AWS Cloud plugin”](https://github.com/elasticsearch/elasticsearch-cloud-aws) for ElasticSearch, configuring the
_Nginx_ proxy, and finally, restarting ElasticSearch itself.

Let's try the new configuration by accessing the _Nginx_ proxy running on port 8080:

<pre class="prettyprint lang-bash">
curl http://USERNAME:PASSWORD@$HOST:8080
</pre>

Pretty nice, right? Notice how trying to access the “Cluster API” is `403 Forbidden`:

<pre class="prettyprint lang-bash">
curl http://USERNAME:PASSWORD@$HOST:8080/_cluster/health
</pre>

Nevertheless, we can index some documents over the _Nginx_ proxy just fine:

<pre class="prettyprint lang-bash">
curl -X POST "http://USERNAME:PASSWORD@$HOST:8080/test_chef_cookbook/document/1" -d '{"title" : "Test 1"}'
curl -X POST "http://USERNAME:PASSWORD@$HOST:8080/test_chef_cookbook/document/2" -d '{"title" : "Test 2"}'
curl -X POST "http://USERNAME:PASSWORD@$HOST:8080/test_chef_cookbook/document/3" -d '{"title" : "Test 3"}'
curl -X POST "http://USERNAME:PASSWORD@$HOST:8080/test_chef_cookbook/_refresh"
</pre>

Let's try to perform a search:

<pre class="prettyprint lang-bash">
curl "http://USERNAME:PASSWORD@$HOST:8080/_search?pretty&amp;q=*"
</pre>

Perfect. We can also check that ElasticSearch is running smoothly via _Monit_:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "sudo monit reload &amp;&amp; sudo monit status -v"
</pre>

<small>(If the Monit daemon is not running, start it with `sudo service monit start` first. Notice the daemon has a startup delay of 2 minutes by default.)</small>

You can see that the ElasticSearch process is `running` and that the connection to port 9200 is
`online with all services`. But what about the <em>elasticsearch_cluster_health</em> check?
It says `Connection failed`. In fact, that's expected:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "curl localhost:9200/_cluster/health?pretty"
</pre>

Since we're running with the default setting of one replica with only one ElasticSearch node,
the cluster health is _yellow_: there's no other server where the cluster can place the replica on.

Time to create another node in our cluster!


## Adding Another Node ##

We'll launch another node on EC2, using the “Launch More Like This” feature, available under the
“Instance Actions” menu:

![Launch More Like This](/tutorials/images/chef-solo/launch-more-like-this.png)

Name the second node `test-elasticsearch-chef-2` and make sure that it runs under the `elasticsearch-test` security group.

Once the new instance is running, copy its “Public DNS” value. We will again store this value as the `HOST` environment variable:

<pre class="prettyprint lang-bash">
HOST=&lt;REPLACE WITH THE PUBLIC DNS FOR THE NEW SERVER&gt;
</pre>

Now, let's run all the provisioning steps on the machine, making it the `elasticsearch-test-2` node:

<pre class="prettyprint lang-bash">
scp $SSH_OPTIONS bootstrap.sh patches.sh node.json solo.rb $HOST:/tmp
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/bootstrap.sh"
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/patches.sh"
time ssh -t $SSH_OPTIONS $HOST "sudo chef-solo --node-name elasticsearch-test-2 -j /tmp/node.json"
</pre>

The whole process should be finished under five minutes, no less. Not bad, not at all.

Allow ElasticSearch couple of seconds to boot and check the cluster health again:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "curl localhost:9200/_cluster/health?pretty"
</pre>

You may see the number of `relocating_shards` briefly increase, and then the cluster health should be **green**,
and the `number_of_nodes` should be **2**.

Not bad! We now have a fully operational, two-node ElasticSearch cluster, with convenient `service` scripts,
an _Nginx_ proxy for external access, and _Monit_-based supervision.


## Going Further ##

Time to play some tricks with out setup. The first thing we're going to try is to kill the ElasticSearch process
on one of the nodes and see how it's being started again by _Monit_.

First, let's kill the process:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "cat '/usr/local/var/run/elasticsearch/elasticsearch_test_2.pid' | xargs -0 sudo kill -9"
</pre>

If we check the ElasticSearch service status, it should not be running:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "sudo service elasticsearch status"
</pre>

If we check the status in _Monit_ after a while, when the next _Monit_ tick fires off,
it should also report the process not running and complain about all sorts of other problems:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "sudo monit status"
</pre>

If you configured the e-mail adress for _Monit_ properly, you'll also receive a e-mail notification
telling you about the incident (most probably in your _Spam_ folder).
(Provided you've not yet hit limits EC2 imposes on sending e-mail from instances.)

If we now repeatedly check the process status, it will go trough “Does Not Exist” and “Execution Failed” states,
and after two or three minutes (based on the default _Monit_ poll period), you should see the process in the
_running_ state again:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "sudo monit reload &amp;&amp; sudo monit status"
</pre>

So, our monitoring system seems to work quite well!

On EC2, we can try another trick to check out whether the S3 persistence is working.

Terminate both instances in the AWS console and create a new, fresh instance again.

Copy the “Public DNS” setting of the new server, and repeat the whole provisioning process,
which should be now quite transparent to you:

<pre class="prettyprint lang-bash">
HOST=&lt;REPLACE WITH THE PUBLIC DNS VALUE&gt;
scp $SSH_OPTIONS bootstrap.sh patches.sh node.json solo.rb $HOST:/tmp
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/bootstrap.sh"
time ssh -t $SSH_OPTIONS $HOST "sudo bash /tmp/patches.sh"
time ssh -t $SSH_OPTIONS $HOST "sudo chef-solo --node-name elasticsearch-test-1 -j /tmp/node.json"
</pre>

Allow couple of seconds for ElasticSearch to boot and load the data, and perform the search
on the freshly provisioned server:

<pre class="prettyprint lang-bash">
curl "http://USERNAME:PASSWORD@$HOST:8080/_search?pretty&amp;q=*"
</pre>

You should now see the three documents, which we inserted long ago, on the now destroyed servers,
displayed in your terminal: since we have configured our node to persist data into a S3 bucket,
ElasticSearch happily loaded all the data from there.

<p><small>
Note: Again, to fully understand the different ElasticSearch persistence and discovery strategies and options at AWS,
please read the <a href="/tutorials/2011/08/22/elasticsearch-on-ec2.html">“ElasticSearch on EC2”</a> tutorial.
</small></p>


## Conclusions ##

Congratulations! By following this tutorial, you were able to:

* Establish a repeatable and reliable process for setting up an ElasticSearch server
* Bootstrap, install and configure production-ready ElasticSearch cluster without manual intervention
* Summarize the whole server configuration in the `node.json` file

The first thing to take from this exercise is, of course, that **automation beats manual labor every single time**, and by a long shot.
When you're provisioning a ElasticSearch server for the third time, it's so painless you don't even notice it.

When working with a provisioning tool such as _Chef_, resist the urge to tinker with the system manually, editing configuration
files in `vim` and installing software manually — except in clearly determined cases when you're trying something out.

It is of course _faster_ to make a small change directly on the system itself, instead of performing all the provisioning
steps. But the whole point of _Chef_ is to make your system predictable, to summarize everything what's needed for its
operation in one place, and to eradicate manual intervention.

Notice how we added lots of configuration details in the “The Full Installation” chapter, uploaded the updated `node.json` file
to the system, and then just _ran the same command_ as previously. _Chef_ discovered it needs to update the `elasticsearch.yml`
file, did so, and restarted the ElasticSearch process to pick up the new configuration.

The same applies for changes in the cookbook: when the ElasticSearch cookbook is updated at _GitHub_, the `bootstrap` script
will fetch the changes, and the next `chef-solo` run will reflect them on the system.

The second thing to notice is **how powerful is a tool like _Chef_**. We didn't paid too much attention to _Chef_ specifics, but let's
have a look at a small illustration. You should notice the memory settings for the JVM in the `elasticsearch-env.sh` file:

<pre class="prettyprint lang-bash">
ssh -t $SSH_OPTIONS $HOST "cat /usr/local/etc/elasticsearch/elasticsearch-env.sh"
</pre>

Where does the value `Xmx4982m`, or nearly 5 GB, come from? How does _Chef_ know this value? Well,
[this Ruby code in the ElasticSearch cookbook](https://github.com/karmi/cookbook-elasticsearch/blob/f5d7025/attributes/default.rb#L18-25)
did the computation, based on the total available memory on the EC2 large instance type (7.5 GB):

<pre class="prettyprint lang-ruby">
max_mem = "#{(node.memory.total.to_i - (node.memory.total.to_i/3) ) / 1024}m"
default.elasticsearch[:max_mem] = max_mem
</pre>

Thanks to the _Ohai_ tool, _Chef_ knows many of these [“automatic attributes”](http://wiki.opscode.com/display/chef/Automatic+Attributes)
of the node, and can take them into consideration when provisioning the server. The ElasticSearch cookbook we have worked with makes use
of these attribues in other places, for example when setting the `node.name`.

The final conclusion of this experiment is **how open the whole _Chef_ ecosystem is**.

We didn't have to use the hosted _Chef Server_ product to use the other parts of its architecture. The concepts and principles are the same
between _Chef Solo_ and _Chef Server_, and allow you to reuse the most important part: the cookbooks.

Most of the cookbooks are available on the [_Opscode_ community page](http://community.opscode.com/cookbooks) under permissive licenses.
For a complex infrastructure, you're most likely to adapt cookbooks to your needs, adjusting their recipes or templates.
As we have seen, it's trivial to mix “vendor” cookbooks with our own cookbooks:
we have downloaded the “stock” _Monit_ and _Nginx_ cookbooks from the internet to the `/var/chef-solo/site-cookbooks/` directory,
while cloning a custom ElasticSearch cookbook to the `/var/chef-solo/cookbooks` directory.

The _Chef_ domain specific language uses Ruby, a popular and expressive programming language, which makes adjusting and customizing
cookbooks very easy.
We can [fork most cookbooks](https://github.com/opscode-cookbooks/) at _Github_ and participate in the
growing common knowledge of efficient infrastructure provisioning.

Enjoy your cooking!
