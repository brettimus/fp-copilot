#!/bin/bash

# Source .env file, to set workspace!
source .env

# Get all notebook contents
fp notebooks list --output=json | jq -r '.[] | .id' |  xargs -I % sh -c 'fp notebooks get --output=json -n % | node save-notebook.js'
