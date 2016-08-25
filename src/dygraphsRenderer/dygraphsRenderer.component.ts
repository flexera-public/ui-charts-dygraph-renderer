import lib from '../lib'
import Charts from '@rightscale/ui-charts'
import _ from 'lodash'
import '../../lib/dygraph'
// import {default as Dygraph, DygraphPoint} from 'dygraphs/src/dygraph.js'

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
  private dygraph: Dygraph

  private colorTable = ['#4FBBCD', '#7355A6', '#C45887', '#F7A626', '#B4CB55', '#D05A5A', '#5DD08B', '#3C8CC7']

  private defaultOptions: DygraphOptions = {
    connectSeparatedPoints: true,
    customBars: true
  }

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
      axes: {
        x: {
          drawAxis: true
        },
        y: {
          drawAxis: true
        }
      }
    }
  }

  private graphData: DygraphData
  private graphLabels: string[]

  preset: string
  chart: Charts.Chart.ChartComponent

  constructor(
    private element: JQuery,
    scope: ng.IScope
  ) {
    //TODO: add a callback to the chart for better performance
    scope.$watch(() => this.chart.details, details => {
      if (details) this.updateData(details)
    }, true)

    scope.$watch(() => this.preset, preset => {
      if (this.dygraph && preset) {
        if (!this.presets[preset]) throw `Uknown Dygraphs renderer preset: [${preset}]`
        this.dygraph = this.buildGraph()
      }
    })
  }

  $onDestroy() {
    this.dygraph.destroy();
  }

  private updateData(metricsData: Charts.Chart.MetricDetails[]) {
    var temp: _.Dictionary<DygraphPoint> = {}
    var labels = ['time']
    var seriesCount = metricsData.map(m => _.keys(m.points).length).reduce((t, v) => t + v);
    metricsData.forEach((m) => {
      _.forEach(m.points, (v, k) => {
        labels.push(`${m.name} - ${k}`)
        if (typeof v[0].data != 'number') {
          v.forEach(p => {
            var dp = temp[p.timestamp] || this.makeArray(p.timestamp, seriesCount)
            dp[labels.length - 1] = (typeof p.data != 'number') ? [p.data.min, p.data.avg, p.data.max] : [p.data, p.data, p.data]
            temp[p.timestamp] = dp
          })
        }
      })
    })

    this.graphData = _(temp).values<DygraphPoint>().sortBy(v => v[0]).value()
    this.graphLabels = labels;

    if (!this.dygraph) {
      this.dygraph = this.buildGraph()
    }
    else if (this.graphData && this.graphData.length) {
      this.dygraph.updateOptions(_.defaults({ file: this.graphData, labels: labels, colors: this.graphColors() }, this.presets[this.preset]))
    }
  }

  private makeArray(timestamp: number, size: number) {
    var a: any[] = [new Date(timestamp)]

    for (let i = 0; i < size; i++) {
      a.push(null)
    }

    return a;
  }

  private graphColors() {
    return this.chart.options.metricIds.map(id => this.colorTable[id % this.colorTable.length]);
  }

  private buildGraph() {
    if (!this.graphData || !this.graphData.length) return
    if (this.dygraph) {
      this.dygraph.destroy();
      this.dygraph = null;
    }
    return new Dygraph(this.element[0], this.graphData, _.defaults({ labels: this.graphLabels, colors: this.graphColors() }, this.presets[this.preset], this.defaultOptions))
  }
}
