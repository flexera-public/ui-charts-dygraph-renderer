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
    preset: '=?'
  },
  templateUrl: 'rs.dygraphsRenderer/dygraphsRenderer/dygraphsRenderer.html'
})
@lib.inject(['$element', '$scope'])
export class DygraphsRenderer {
  private dygraph: Dygraph

  private defaultOptions: DygraphOptions = {
    connectSeparatedPoints: true,
    customBars: true,
    colors: ['#4FBBCD', '#7355A6', '#C45887', '#F7A626', '#B4CB55', '#D05A5A', '#5DD08B', '#3C8CC7']
  }

  private presets: _.Dictionary<DygraphOptions> = {
    'minimal': {
      drawGrid: false,
      legend: 'follow',
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
      labelsDiv: 'chartLegend',
      gridLineColor: '#d3d8de',
      gridLinePattern: [4,4],
      hideOverlayOnMouseOut: false,
      labelsDivWidth: 100,
      labelsSeparateLines: true,
      axes: {
        x: {
          drawAxis: true,
          axisLineColor: '#c2c8d1'
        },
        y: {
          drawAxis: true,
          axisLineColor: '#c2c8d1'
        },
      }
    }
  }

  private graphData: DygraphData
  private graphLabels: string[]

  preset = 'minimal'
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
      console.log('preset: ', preset)
      if (this.dygraph && preset) {
        if (!this.presets[preset]) throw `Uknown Dygraphs renderer preset: [${preset}]`
        this.dygraph = this.buildGraph()
      }
    })
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
    else {
      this.dygraph.updateOptions(_.defaults({ file: this.graphData, labels: labels }, this.presets[this.preset]))
    }
  }

  private makeArray(timestamp: number, size: number) {
    var a: any[] = [new Date(timestamp)]

    for (let i = 0; i < size; i++) {
      a.push(null)
    }

    return a;
  }

  private buildGraph() {
    // console.log(this.element.find('div'))
    return new Dygraph(this.element.find("div")[0], this.graphData, _.defaults({ labels: this.graphLabels }, this.presets[this.preset], this.defaultOptions))
  }
}
