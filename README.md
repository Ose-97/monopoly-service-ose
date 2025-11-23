## Azure Deployment

My running Monopoly data service is deployed at:

https://ose-monopoly-service4-cdercxafcggeerg6.mexicocentral-01.azurewebsites.net









This is the data service application for the
[CS 262 sample Monopoly project](https://github.com/calvin-cs262-organization/monopoly-project),
 which is deployed here:

- <https://cs262-egbefbd4aae2h0df.canadacentral-01.azurewebsites.net><br>(This URL may vary from year to year.)

Based on this URL, the service implements the following endpoints:

- `/` &mdash; a hello message
- `/players` &mdash; the full list of players
- `/players/:id` &mdash; the single player with the given ID (e.g., `/players/1`)

Also, it gives the following responses:

- `/players/-1` &mdash; all invalid IDs like this one return a not-found error
- `/blob` &mdash; all undefined endpoints like this one return a cannot-get error.

It is based on the [standard Azure App Service tutorial for Node.js](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs?tabs=linux&pivots=development-environment-cli).

The database is relational with the schema specified in the `sql/` sub-directory
and is hosted on [Azure PostgreSQL](https://azure.microsoft.com/en-us/products/postgresql/).
The database server, user and password are stored as Azure application settings so that they
aren&rsquo;t exposed in this (public) repo.

We implement this sample service as a separate repo to simplify Azure integration;
it&rsquo;s easier to auto-deploy a separate repo to Azure. For your team project&rsquo;s
data service, configure your Azure App Service to auto-deploy from the master/main branch
of your service repo. See the settings for this in the &ldquo;Deployment Center&rdquo;
on your Azure service dashboard.
