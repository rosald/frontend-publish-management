# frontend publish management

a simple (but fully functional) frontend publish management system, with following feature:

- deploy frontend assets via webpage
- can specify the release version
- access different version according to request headers
- zero break time publishing/switching version

## why is it

nowadays, we usually deploy frontend assets via cloud service

(in spa pages, we often serve the index html via render service, and the other assets were uploaded to cdn. the whole process may also be done in cloud enviroment, we pull the codebase in the pod, we install dependencies in the pod, we build assets in the pod, we upload to cdn in the pod)

but there is still some situations that , we do not have huge amount of users or traffic, one simple nginx running on one simple server is enough

there is sore point. one is that deploy manually is a little trouble

another is that when we want to test something, there is one version, especially parallel features in development(one solution is merge all feature branch into dev branch , but all the feature are mixed all together, sometimes we just want to test my own feature)

## how to use

1. move ./server/site.db.template.json to ./site.db.json

2. change "sitea" value as needed ( "sitea" is just a name, in case you have multiple sites. the value is where assets will be uploaded, which will also be configured in nginx root block)

3. modify nginx config, add map config at top of http block

```conf
map $http_x_env_version $asset_env_version {
    default      "current";
    "~^[a-z]+$"  $http_x_env_version;
}
```

4. modify nginx config, http-server-location-root block, for example:

```
root    /home/ubuntu/sitea/$asset_env_version;
```

(/home/ubuntu/sitea is also configured in site.db.json, make sure is exists with correct permission)

5. start/restart nginx, build frontend, start backend server

6. visit http://localhost:3000/frontend-publish-management

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

the site.db.json is the map of site name and site root location

the backend just use data from linux system like mtime and path name

you can modify the backend and add more data in the site.db.json

```json
{
  "sitea": {
    "path": "/home/ubuntu/sitea",
    "nextVersion": "002",
    "versions": {
      "001": 1744768068231
    },
    "links": {
      "current": "001"
    }
  }
}
```

or you can use a database for fully function

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
