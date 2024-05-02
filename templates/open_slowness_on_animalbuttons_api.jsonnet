// For documentation on Fiberplane Templates, see: https://docs.fiberplane.com/docs/templates
local fp = import 'fiberplane.libsonnet';
local c = fp.cell;
local fmt = fp.format;

function(
  start,
  end,
  title='SLO Latency violation for animalbuttons API',
)
  fp.notebook
  .new(title)
  .setTimeRangeAbsolute(start, end)
  .addLabels({
    service: 'api',
    environment: 'production',
  })
  .addFrontMatterValues({
    status: 'Open',
  })
  // If the front matter schema comes from a known collection, you can replace the next call with .addFrontMatterCollection('name')
  .addFrontMatterSchema([
    {
      key: 'commander',
      schema: {
        type: 'user',
        displayName: 'commander',
      },
    },
    {
      key: 'status',
      schema: {
        type: 'string',
        displayName: 'Status',
        iconName: 'status',
        options: [
          'Detected',
          'Open',
          'Resolved',
        ],
      },
    },
  ])
  .setDataSourceForProviderType('prometheus', 'animalbuttons-prometheus')
  .addCells([
    c.h2('Alert Trigger'),
    c.text('The SLO for the animalbuttons API has been eating through its latency budget. This is due to a spike in response times.'),
  ])
