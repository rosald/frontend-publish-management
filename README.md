# frontend publish management

a simple (but fully functional) frontend publish management system, with following feature:

- deploy frontend assets via webpage
- can specify the release version
- access different version according to request headers

## why is it

nowadays, we usually deploy frontend assets via cloud service

(in spa pages, we often serve the index html via render service, and the other assets were uploaded to cdn. the whole process may also be done in cloud enviroment, we pull the codebase in the pod, we install dependencies in the pod, we build assets in the pod, we upload to cdn in the pod)

but there is still some situations that , we do not have huge amount of users or traffic, one simple nginx running on one simple server is enough

there is sore point. one is that deploy manually is a little trouble

another is that when we want to test something, there is one version, especially parallel features in development(one solution is merge all feature branch into dev branch , but all the feature are mixed all together, sometimes we just want to test my own feature)

## how to use

1. copy site.config.template.json to site.config.json

2. change "sitea" and "sitea.path" as needed ( "sitea" is just a name, in case you have multiple sites. "sitea.path" is where assets will be uploaded, which will also be configured in nginx root )

3. modify nginx config, add map config at top of http block

```conf
map $http_x_env_version $asset_version {
    default      "current";
    "~^\d\d\d$"  $http_x_env_version;
}
```

4. modify http-server-location-root for example(/home/ubuntu/sitea is also configured in site.config.json, make sure is exists with correct permission):

```
root    /home/ubuntu/sitea/$asset_version;
```

5. start/restart nginx, build frontend, start backend server

6. visit http://localhost:3000

7. click choose site

8. select one tar file and upload

9. click publish/unpublish, then click "publish current"

10. visite the site

11. (optional) upload several versions

12. (optional) enter some env(support a-z) to publish a different version. for example , enter "featurea"

13. (optional) visite the site with request header(you can use chrome extension modheader) x-env-version: featurea

14. wow! you see another version

## how it works

it actually just only do one thing: manage the nginx serve dir, so nginx is required(or something simular)

### backend

the backend is a koa application

it receives a tar archive, extract it to the correct place

it makes symlink to user desired target

it save site config in a simple json file

### frontend

the frontend is just a boring react + vite application

it visualize the site config and let user do some management operations

### nginx

there is only one key point in nginx config

it is the "map" directive, maps http header in a variable

then, use the variable in root directive

## additional notes

here is several function not implemented

- auth and login
- error capturing
- auditing
- use database
- operation lock
- auto crash restart (maybe pm2 is enough)
