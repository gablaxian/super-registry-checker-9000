
# Super Registry Checker 9000

## Description

Here we have my horrific attempt at Snyk’s [NPM registry exercise](https://github.com/snyk/jobs/blob/master/exercises/npm-registry.md). It ended up as a mostly prototypical solution that anything robust enough to be useful, due to most of my time being spent mostly learning Node and attempting to get my head around asynchronous recursion. There are _no other_ modules than what comes with Node/Browsers. This is all my own code. There are also no tests&hellip;

## Requirements

This project has been built and tested with:

- Node v9.7.1
- Chrome v65

## Installation

Download and unzip the project into a folder on your machine, e.g. `~/Projects/npm-registry-checker-9000`.

## Usage

Run the app with:

```
cd ~/Projects/npm-registry-checker-9000
node index.js
```

By default the app will listen on port 7001. Point your web browser to http://localhost:7001.
