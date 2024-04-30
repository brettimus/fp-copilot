# Source .env file, to set workspace!
source .env

echo "Fetching notebooks from $WORKSPACE_ID"

# Get all notebook contents
WORKSPACE_ID=$WORKSPACE_ID fp notebooks list --output=json | jq -r '.[] | .id' |  xargs -I % sh -c 'fp notebooks get --output=json -n % | node src/notebook-save-local.js'
