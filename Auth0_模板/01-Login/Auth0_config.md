http://localhost:3000/#/welcome

1、In some scenarios, Auth0 will need to redirect to your application’s login page. This URI needs to point to a route in your application that should redirect to your tenant’s /authorizeendpoint. Learn more
配置：空

2、Comma-separated list of allowed callback URLs for redirecting users after login. Unlisted URLs will be rejected. Learn more about application URIs
You can use Organization URL
 parameters in these URLs.
配置：http://localhost:3000/#/welcome

3、Comma-separated list of allowed logout URLs for redirecting users post-logout. You can use wildcards at the subdomain level (*.google.com). Query strings and hash information are not taken into account when validating these URLs. Learn more about logout
配置：http://localhost:3000

4、Comma-separated list of allowed origins for use with Cross-Origin Authentication
, Device Flow
, and web message response mode
, in the form of <scheme>://<host>[:<port>], such as https://login.mydomain.com   or http://localhost:3000. You can use wildcards at the subdomain level (e.g.: https://*.contoso.com). Query strings and hash information are not taken into account when validating these URLs.
配置：http://localhost:3000
