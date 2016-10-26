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
  axisLabel: string;
  metrics: string[];
  stack: boolean;
}

interface Range {
  from?: number;
  span?: number;
}

@lib.inject('$element', '$scope').component({
  templateUrl: 'rs.dygraphsRenderer/dygraphsRenderer/dygraphsRenderer.html',
  require: {
    chart: '^rsChart'
  },
  bindings: {
    preset: '<?'
  }
})
export class DygraphsRenderer implements ng.IComponentController {

  preset: string;
  chart: Charts.Chart.Chart;

  private dygraph: Dygraph;

  private colorTable = ['#4FBBCD', '#7355A6', '#C45887', '#F7A626', '#B4CB55', '#D05A5A', '#5DD08B', '#3C8CC7'];

  private presets: _.Dictionary<DygraphOptions> = {
    'minimal': {
      connectSeparatedPoints: true,
      customBars: true,
      drawGrid: true,
      gridLineColor: '#d3d8de',
      gridLinePattern: [4, 4],
      legend: 'never',
      axes: {
        x: {
          drawAxis: true,
          axisLineColor: '#c2c8d1',
        },
        y: {
          drawAxis: false,
          includeZero: true
        },
      },
      interactionModel: {}
    },
    'full': {
      connectSeparatedPoints: true,
      customBars: true,
      legend: 'always',
      labelsDivWidth: 350,
      drawGrid: true,
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
          axisLineColor: '#c2c8d1',
          includeZero: true
        }
      }
    }
  };

  private graphData: DygraphData;
  private graphLabels: string[];
  private graphColors: string[];
  private metricGroups: MetricGroup[];

  private updateRange: (from: number, span: number) => void;

  private defaultRange: Range = {};
  private previousRange: Range = {};

  constructor(
    private element: JQuery,
    private scope: ng.IScope
  ) {
    scope.$watch(() => this.chart.lastUpdate, () => this.updateData(this.chart.details));

    scope.$watch(() => this.preset, preset => {
      if (this.dygraph && preset) {
        if (!this.presets[preset]) {
          throw `Uknown Dygraphs renderer preset: [${preset}]`;
        }
        this.ensureGraph(true);
      }
    });

    scope.$watch(() => this.chart.options.from, val => this.defaultRange.from = val);
    scope.$watch(() => this.chart.options.span, val => this.defaultRange.span = val);
    scope.$watch(() => this.defaultRange, val => {
      this.previousRange.from = this.defaultRange.from;
      this.previousRange.span = this.defaultRange.span;
    }, true);

    scope.$watch(() => this.chart.options.paused, paused => {
      if (!paused && this.dygraph && this.dygraph.isZoomed()) {
        // When the chart is unpaused while zoomed in, then zoom out.
        // The timeout is used to ensure we're out of a digest loop because
        // resetZoom() will call onZoom() which runs scope.$apply()
        setTimeout(() => this.dygraph.resetZoom());
      }
    });

    this.updateRange = _.debounce((from: number, span: number) => {
      this.scope.$apply(() => {
        this.chart.options.paused = true;
        this.chart.forceRefresh(from, span);
      });
    }, 500);
  }

  $onDestroy() {
    if (this.dygraph) {
      this.dygraph.destroy();
    }
  }

  zoomOut() {
    // Unpause the chart updates
    this.chart.options.paused = false;

    // Set the original range
    this.chart.options.from = this.defaultRange.from;
    this.chart.options.span = this.defaultRange.span;

    this.previousRange = _.clone(this.defaultRange);
  }

  zoomed() {
    return this.previousRange.from !== this.defaultRange.from;
  }

  private onDraw = (dygraph: Dygraph) => {
    let range = dygraph.xAxisRange();
    let from = Math.floor(range[1]);
    let span = Math.floor(range[1] - range[0]);
    if (from !== _.last<any[]>(<any>this.graphData)[0].valueOf() &&
      (from !== this.previousRange.from || span !== this.previousRange.span)) {
      this.previousRange = {
        from: from,
        span: span
      };

      this.updateRange(from, span);
    }
  }

  private updateData = (metricsData: Charts.Chart.MetricDetails[]) => {
    if (!metricsData) {
      return;
    }
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
    this.graphColors = [];
    let seriesCount = _(metricsData).map(m => _.keys(m.points).length).reduce((t: number, v: number) => t + v);
    _(metricsData).sortBy(m => m.id).forEach(m => {

      if (!this.graphColors.length) {
        // Picks the graph colors using the metric id in order to stay somewhat deterministic
        this.graphColors = this.colorTable.slice(this.hash(m.id) % this.colorTable.length)
          .concat(this.colorTable.slice(0, this.hash(m.id) % this.colorTable.length));
      }

      _(m.points).keys().sort().forEach(k => {
        let v = m.points[k];
        if (!v || !v.length) {
          return;
        }

        labels.push(k);
        if (metricsData.length === 1 && m.stack) {
          v.forEach(p => {
            let dp = temp[p.timestamp] || this.makeArray(p.timestamp, seriesCount);
            dp[labels.length - 1] = (typeof p.data !== 'number') ? p.data.avg : p.data;
            temp[p.timestamp] = dp;
          });
        }
        else {
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
          axisLabel: m.axisLabel,
          stack: m.stack,
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
      colors: this.graphColors
    };

    if (this.dygraph && rebuild) {
      this.dygraph.destroy();
      this.dygraph = null;
    }

    _.merge(options, this.axisOptions(this.metricGroups[0], 'y'));
    if (this.preset === 'full') {
      options.ylabel = this.metricGroups[0].axisLabel;
    }

    if (this.metricGroups.length > 1) {
      _.merge(options, this.axisOptions(this.metricGroups[1], 'y2'));
      if (this.preset === 'full') {
        options.y2label = this.metricGroups[1].axisLabel;
      }
    }

    _.defaultsDeep(options, this.presets[this.preset]);

    options.drawCallback = this.onDraw;

    if (this.metricGroups.length === 1) {
      options.stackedGraph = this.metricGroups[0].stack;
      options.customBars = !this.metricGroups[0].stack;
    }
    else {
      options.stackedGraph = false;
      options.customBars = true;
    }

    if (!this.dygraph) {
      this.dygraph = new Dygraph(this.element.find('graph')[0], this.graphData, options);
    }
    else {
      this.dygraph.updateOptions(_.defaults({ file: this.graphData }, options));
    }
  }

  private axisOptions(group: MetricGroup, axis: string) {
    let options: any = {};

    options.series = {};
    group.metrics.forEach(m => options.series[m] = { axis: axis });

    options.axes = {};
    options.axes[axis] = {
      includeZero: true
    };

    options.axes[axis].valueFormatter = function (
      num: number,
      opts: any,
      seriesName: string,
      dygraph: Dygraph,
      row: number,
      col: number
    ) {
      let format = group.format || '0.00';
      let val: number[] | number = <any>dygraph.getValue(row, col);
      if (typeof val === 'number') {
        return numeral(val).format(format);
      }
      else {
        return `min: ${numeral(val[0]).format(format)}, avg: ${numeral(val[1]).format(format)}, max: ${numeral(val[2]).format(format)}`;
      }
    };

    if (group.format) {
      options.axes[axis].axisLabelFormatter = (v: number) => numeral(v).format(group.format);
    }

    if (group.range) {
      options.axes[axis].valueRange = [group.range.min, group.range.max];
    }

    return options;
  }

  private hash(str: string) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i);
      hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
    }
    return hash;
  }
}
