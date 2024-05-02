// For documentation on Fiberplane Templates, see: https://docs.fiberplane.com/docs/templates
local fp = import 'fiberplane.libsonnet';
local c = fp.cell;
local fmt = fp.format;

function(
  start,
  end,
  title='[RESOLVED] Slowness on animalbuttons API',
)
  fp.notebook
  .new(title)
  .setTimeRangeAbsolute(start, end)
  .addLabels({
    service: 'api',
    environment: 'production',
  })
  .addFrontMatterValues({
    commander: { id: 'OLEvyX6NT6StLobyEqmaTg', name: 'Brett Beutell' },
    status: 'Resolved',
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
    c.h2('Investigation'),
    c.text('We start with the graph of all functions included in the SLO.'),
    c.prometheus('histogram_quantile(\n  0.99,\n  sum by (le, function, module, version, service_name) (\n    rate({\n      __name__=~"function_calls_duration(_seconds)?_bucket",\n      objective_name="Animal API SLO for Super Low Latency",\n    }[15m])\n    # Attach the version and commit labels from the build_info metric\n    * on (instance, job) group_left(version) (\n      last_over_time(build_info[5s])\n      or on (instance, job) up\n    )\n  )\n)'),
    c.text(['Here we see a spike in the latency for the ', fmt.code(['snail']), ' function...']),
    c.text("This is the likely culprit of all evil. Let's spin up a PR to fix it."),
    c.h2('Conclusion'),
    c.text(['The snail is being a snail. ', fmt.mention('Brett Beutell', '_BfsfNgkRFKyny_9Icxe2w'), ' will need to address this.']),
  ])
