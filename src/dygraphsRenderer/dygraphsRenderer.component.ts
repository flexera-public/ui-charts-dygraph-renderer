import lib from '../lib';
import Charts from '@rightscale/ui-charts';
import _ from 'lodash';
import '../../lib/dygraph';
import 'numeral';

interface MetricGroup {
  format: string;
  range: {
    min: number,
    max: number
  };
  metrics: string[];
}

@lib.component('rsDygraphsRenderer', {
  require: {
    chart: '^rsChart'
  },
  bindings: {
    preset: '<?'
  }
})
@lib.inject(['$element', '$scope'])
export class DygraphsRenderer implements ng.IComponentController {

  preset: string;
  chart: Charts.Chart.ChartComponent;

  private dygraph: Dygraph;

  private colorTable = ['#4FBBCD', '#7355A6', '#C45887', '#F7A626', '#B4CB55', '#D05A5A', '#5DD08B', '#3C8CC7'];

  private defaultOptions: DygraphOptions = {
    connectSeparatedPoints: true,
    customBars: true
  };

  private presets: _.Dictionary<DygraphOptions> = {
    'minimal': {
      drawGrid: false,
      legend: 'never',
      axes: {
        x: {
          drawAxis: false
        },
        y: {
          drawAxis: false
        }
      }
    },
    'full': {
      drawGrid: true,
      legend: 'always',
      gridLineColor: '#d3d8de',
      gridLinePattern: [4, 4],
      labelsDivStyles: { 'textAlign': 'right' },
      axes: {
        x: {
          drawAxis: true,
          axisLineColor: '#c2c8d1'
        },
        y: {
          drawAxis: true,
          axisLineColor: '#c2c8d1'
        }
      }
    }
  };

  private graphData: DygraphData;
  private graphLabels: string[];
  private metricGroups: MetricGroup[];

  constructor(
    private element: JQuery,
    scope: ng.IScope
  ) {
    // TODO: add a callback to the chart for better performance
    scope.$watch(() => this.chart.details, details => {
      if (details) {
        this.updateData(details);
      }
    }, true);

    scope.$watch(() => this.preset, preset => {
      if (this.dygraph && preset) {
        if (!this.presets[preset]) {
          throw `Uknown Dygraphs renderer preset: [${preset}]`;
        }
        this.ensureGraph(true);
      }
    });
  }

  $onDestroy() {
    if (this.dygraph) {
      this.dygraph.destroy();
    }
  }

  private updateData(metricsData: Charts.Chart.MetricDetails[]) {
    let metricGroups = this.groupMetrics(metricsData);
    let refresh = _.isEqual(metricGroups, this.metricGroups);
    this.metricGroups = metricGroups;
    this.convertData(metricsData);
    this.ensureGraph(refresh);
  }

  /**
   * Converts the data received into a format that's accepted by Dygraps. Also extracts
   * the label information.
   *
   * @private
   * @param {Charts.Chart.MetricDetails[]} metricsData
   */
  private convertData(metricsData: Charts.Chart.MetricDetails[]) {
    let temp: _.Dictionary<DygraphPoint> = {};
    let labels = ['time'];
    let seriesCount = metricsData.map(m => _.keys(m.points).length).reduce((t, v) => t + v);
    metricsData.forEach((m) => {
      _.forEach(m.points, (v, k) => {
        labels.push(`${m.providerName} - ${m.name} - ${k}`);
        if (typeof v[0].data !== 'number') {
          v.forEach(p => {
            let dp = temp[p.timestamp] || this.makeArray(p.timestamp, seriesCount);
            dp[labels.length - 1] = (typeof p.data !== 'number') ?
              [p.data.min, p.data.avg, p.data.max] : [p.data, p.data, p.data];
            temp[p.timestamp] = dp;
          });
        }
      });
    });

    this.graphData = _(temp).values<DygraphPoint>().sortBy(v => v[0]).value();
    this.graphLabels = labels;
  }

  /**
   * Organizes the metrics according to their range and format options
   *
   * @private
   * @param {Charts.Chart.MetricDetails[]} metricsData
   * @returns
   */
  private groupMetrics(metricsData: Charts.Chart.MetricDetails[]) {
    let groups: MetricGroup[] = [];

    metricsData.forEach(m => {
      let i = _.findIndex(groups, g => _.isEqual(g.range, m.axisRange) && g.format === m.format);
      if (i < 0) {
        groups.push({
          range: m.axisRange,
          format: m.format,
          metrics: _(m.points).keys().map(k => `${m.providerName} - ${m.name} - ${k}`).value()
        });
      }
      else {
        groups[i].metrics = groups[i].metrics.concat(_.keys(m.points));
      }
    });

    if (groups.length > 2) {
      throw 'Cannot render more than two types of metrics';
    }

    return groups;
  }

  /**
   * Prepares an array of data points for a given time stamp
   *
   * @private
   * @param {number} timestamp
   * @param {number} size
   * @returns
   */
  private makeArray(timestamp: number, size: number) {
    let a: any[] = [new Date(timestamp)];

    for (let i = 0; i < size; i++) {
      a.push(null);
    }

    return a;
  }

  /**
   * Builds a deterministic color table based on the metric ids
   *
   * @private
   * @returns a color table
   */
  private graphColors() {
    return this.chart.options.metricIds.map(id => this.colorTable[id % this.colorTable.length]);
  }

  /**
   * Ensures the graph exists with the correct options
   *
   * @private
   * @param {boolean} [rebuild=false] When true, if the graph already exists it will be replaced instead of updated
   */
  private ensureGraph(rebuild = false) {
    if (!this.graphData || !this.graphData.length) {
      return;
    }

    let options: DygraphOptions = {
      labels: this.graphLabels,
      colors: this.graphColors()
    };

    if (this.dygraph && rebuild) {
      this.dygraph.destroy();
      this.dygraph = null;
    }

    _.merge(options, this.axisOptions(this.metricGroups[0], 'y'));
    if (this.metricGroups.length > 1) {
      _.merge(options, this.axisOptions(this.metricGroups[1], 'y2'));
    }

    _.defaultsDeep(options, this.presets[this.preset], this.defaultOptions);

    if (!this.dygraph) {
      this.dygraph = new Dygraph(this.element[0], this.graphData, options);
    }
    else {
      this.dygraph.updateOptions(_.defaults({ file: this.graphData }, options));
    }
  }

  private axisOptions(group: MetricGroup, axis: string) {
    let options: any = {};

    options.series = {};
    group.metrics.forEach(m => options.series[m] = { axis: axis });

    if (group.format || group.range) {
      options.axes = {};
      options.axes[axis] = {};
    }

    if (group.format) {
      options.axes[axis].valueFormatter = (v: number) => numeral(v).format(group.format);
      options.axes[axis].axisLabelFormatter = (v: number) => numeral(v).format(group.format);
    }

    if (group.range) {
      options.axes[axis].valueRange = [group.range.min, group.range.max];
    }

    return options;
  }
}
