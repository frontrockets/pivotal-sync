_This is part of @datarockets infrastructure_

> A GitHub App built with [Probot](https://github.com/probot/probot) that A Probot app

## What it does

1. It can change status to "delivered" as soon as the PR was merged.

   Once pull request has been merged it tries to find `pivotaltracker.com/story/show/:id` in the body, if there is any we take the first and consider it as related Story on Pivotal. The status is changed to "delivered" after that.

   Merging of following PR will change the status of `#166327547` story to delivered:

   <img src="https://monosnap.com/image/OIzUwKQKSvuIUzp6EbhwRO5liBKEjd"/>

## Setup

```sh
# Install dependencies
yarn install

# Run the bot in dev mode
yarn dev

# Run the bot in production mode
yarn start
```
