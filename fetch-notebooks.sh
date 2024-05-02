# Source .env file, to set workspace and API base url!
source .env

export API_BASE WORKSPACE_ID

echo "Fetching notebooks from $WORKSPACE_ID on $API_BASE..."

# Get all notebook contents
API_BASE=$API_BASE \
WORKSPACE_ID=$WORKSPACE_ID \
  fp notebooks list --output=json | jq -r '.[] | .id' |  xargs -I % sh -c 'fp notebooks get --output=json -n % | node src/notebook-save-local.js'
