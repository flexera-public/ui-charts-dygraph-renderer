import app from '../app';
import Charts from '@rightscale/ui-charts';
import _ from 'lodash';

@app.inject(Charts.Data.GraphData).controller
export class DygraphsController {
  // Arbitrary list of time spans
  timeSpans = {
    '5mn': 300000,
    '2mn': 120000,
    '1mn': 60000
  };

  startingPoints = {
    'now': 0,
    '5s ago': 5000,
    '10s ago': 10000
  };

  // Options passed to the Chart component
  chartOptions: Charts.Chart.ChartOptions = {
    span: 60000,
    from: 0,
    metricIds: []
  };

  // Used by the view to render the list of metrics as checkboxes
  availableMetrics: Charts.Data.Metric[];

  rendererPreset = 'minimal';

  constructor(
    graphData: Charts.Data.GraphData
  ) {
    this.availableMetrics = graphData.getMetrics();
  }

  // Adds or removes a metric's id from the list in the chart options
  toggleMetric(metric: Charts.Data.Metric) {
    if (_.includes(this.chartOptions.metricIds, metric.id)) {
      _.remove(this.chartOptions.metricIds, id => id === metric.id);
    }
    else {
      this.chartOptions.metricIds.push(metric.id);
    }
  }

}
